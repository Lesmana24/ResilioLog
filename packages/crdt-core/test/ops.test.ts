import { describe, expect, it } from 'vitest';
import { bcValue } from '../src/bounded-counter';
import {
  createItem,
  createReplica,
  emergencyIssue,
  issue,
  receiveGoods,
  resolveTopUp,
  transferRights,
  voidLogEntry,
} from '../src/ops';
import { orsElements } from '../src/or-set';
import { pnValue } from '../src/pn-counter';
import { itemSummary } from '../src/queries';
import { mergeIntoReplica } from '../src/state';

describe('Item operations (B-09, B-10)', () => {
  it('B5 ledger value equals quota value across createItem, receiveGoods, issue, transferRights, emergencyIssue', () => {
    const r0 = createReplica('aaaa1111');
    const created = createItem(r0, {
      name: 'Rice Bag 5kg',
      unit: 'kg',
      category: 'food',
      initialQty: 100,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const { itemId } = created.value;
    expect(itemId).toBe('rice-bag-5kg-1-aaaa1111');
    let r = created.value.replica;
    expect(r.clock).toBe(2); // tick 1 for createdAt, tick 2 for initial receive log

    const assertI4 = (state: typeof r.state) => {
      const item = state.items[itemId]!;
      expect(pnValue(item.ledger)).toBe(bcValue(item.quota));
    };
    assertI4(r.state);

    const rec = receiveGoods(r, itemId, 20, { counterparty: 'Warehouse' });
    expect(rec.ok).toBe(true);
    if (!rec.ok) return;
    r = rec.value;
    assertI4(r.state);

    const iss = issue(r, itemId, 30, { counterparty: 'Shelter A' });
    expect(iss.ok).toBe(true);
    if (!iss.ok) return;
    r = iss.value;
    assertI4(r.state);

    const xfer = transferRights(r, itemId, 'bbbb2222', 40);
    expect(xfer.ok).toBe(true);
    if (!xfer.ok) return;
    r = xfer.value;
    assertI4(r.state);

    const ov = emergencyIssue(r, itemId, 100, { reason: 'Urgent medical triage' });
    expect(ov.ok).toBe(true);
    if (!ov.ok) return;
    r = ov.value;
    assertI4(r.state);

    const summary = itemSummary(r.state, itemId);
    expect(summary).toEqual({
      value: -10,
      deficit: 10,
      ledgerIn: 120,
      ledgerOut: 130,
      rights: {
        aaaa1111: 50,
        bbbb2222: 40,
      },
    });
  });

  it('B6 top-up fires once at remainingRatio <= 0.15, dedupes, re-fires after resolve', () => {
    const r0 = createReplica('aaaa1111');
    const created = createItem(r0, {
      name: 'Water',
      unit: 'L',
      category: 'water',
      initialQty: 100,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const { itemId } = created.value;
    let r = created.value.replica;

    // Issue 80 -> remaining 20% (> 15%) -> no top-up
    const i1 = issue(r, itemId, 80);
    expect(i1.ok).toBe(true);
    if (!i1.ok) return;
    r = i1.value;
    expect(orsElements(r.state.topUpQueue)).toHaveLength(0);

    // Issue 5 -> remaining 15% (<= 0.15) -> triggers 1 top-up (uses 1 extra tick)
    const clockBefore = r.clock;
    const i2 = issue(r, itemId, 5);
    expect(i2.ok).toBe(true);
    if (!i2.ok) return;
    r = i2.value;
    expect(r.clock).toBe(clockBefore + 2);
    const reqs1 = orsElements(r.state.topUpQueue);
    expect(reqs1).toHaveLength(1);
    expect(reqs1[0]!.el.itemId).toBe(itemId);
    expect(reqs1[0]!.el.requester).toBe('aaaa1111');

    // Issue 5 more -> remaining 10% (<= 0.15) -> deduped, still 1 open request, only 1 tick
    const clockBefore2 = r.clock;
    const i3 = issue(r, itemId, 5);
    expect(i3.ok).toBe(true);
    if (!i3.ok) return;
    r = i3.value;
    expect(r.clock).toBe(clockBefore2 + 1);
    expect(orsElements(r.state.topUpQueue)).toHaveLength(1);

    // Resolve the open request
    const resolved = resolveTopUp(r, reqs1[0]!.tag);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    r = resolved.value;
    expect(orsElements(r.state.topUpQueue)).toHaveLength(0);

    // Issue 5 more -> remaining 5% (<= 0.15) -> re-fires now that previous was resolved
    const i4 = issue(r, itemId, 5);
    expect(i4.ok).toBe(true);
    if (!i4.ok) return;
    r = i4.value;
    expect(orsElements(r.state.topUpQueue)).toHaveLength(1);
  });

  it('emergencyIssue requires reason (REASON_REQUIRED) and logs override_issue', () => {
    const r0 = createReplica('aaaa1111');
    const created = createItem(r0, {
      name: 'Insulin',
      unit: 'vial',
      category: 'medicine',
      initialQty: 5,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const { itemId } = created.value;
    const r1 = created.value.replica;

    expect(emergencyIssue(r1, itemId, 2, { reason: 'no' })).toEqual({
      ok: false,
      error: 'REASON_REQUIRED',
    });
    expect(emergencyIssue(r1, itemId, 2, { reason: '  a  ' })).toEqual({
      ok: false,
      error: 'REASON_REQUIRED',
    });
    expect(emergencyIssue(r1, itemId, 2, { reason: 'x'.repeat(201) })).toEqual({
      ok: false,
      error: 'REASON_REQUIRED',
    });

    const ov = emergencyIssue(r1, itemId, 10, { reason: 'Critical patient' });
    expect(ov.ok).toBe(true);
    if (!ov.ok) return;

    const entries = orsElements(ov.value.state.distributionLog);
    const last = entries[entries.length - 1]!.el;
    expect(last.kind).toBe('override_issue');
    expect(last.reason).toBe('Critical patient');
    expect(itemSummary(ov.value.state, itemId)?.deficit).toBe(5);

    // Syncing with another replica preserves override and deficit
    const b = mergeIntoReplica(createReplica('bbbb2222'), ov.value.state, ov.value.clock);
    expect(itemSummary(b.state, itemId)?.deficit).toBe(5);
  });

  it('voidLogEntry hides entry from active log without changing counters', () => {
    const r0 = createReplica('aaaa1111');
    const created = createItem(r0, {
      name: 'Blankets',
      unit: 'pcs',
      category: 'shelter',
      initialQty: 20,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const { itemId } = created.value;
    const before = created.value.replica;
    const summaryBefore = itemSummary(before.state, itemId);
    const logTag = orsElements(before.state.distributionLog)[0]!.tag;

    const voided = voidLogEntry(before, logTag);
    expect(voided.ok).toBe(true);
    if (!voided.ok) return;

    expect(orsElements(voided.value.state.distributionLog)).toHaveLength(0);
    expect(itemSummary(voided.value.state, itemId)).toEqual(summaryBefore);
  });

  it('returns UNKNOWN_ITEM, INVALID_QTY, and SELF_TRANSFER errors appropriately', () => {
    const r0 = createReplica('aaaa1111');
    expect(receiveGoods(r0, 'missing-1-aaaa1111', 5)).toEqual({ ok: false, error: 'UNKNOWN_ITEM' });
    expect(issue(r0, 'missing-1-aaaa1111', 5)).toEqual({ ok: false, error: 'UNKNOWN_ITEM' });
    expect(transferRights(r0, 'missing-1-aaaa1111', 'bbbb2222', 5)).toEqual({
      ok: false,
      error: 'UNKNOWN_ITEM',
    });
    expect(emergencyIssue(r0, 'missing-1-aaaa1111', 5, { reason: 'Emergency' })).toEqual({
      ok: false,
      error: 'UNKNOWN_ITEM',
    });
    expect(itemSummary(r0.state, 'missing-1-aaaa1111')).toBeUndefined();

    expect(
      createItem(r0, { name: 'Rice', unit: 'kg', category: 'food', initialQty: -1 }),
    ).toEqual({ ok: false, error: 'INVALID_QTY' });

    const created = createItem(r0, {
      name: 'Rice',
      unit: 'kg',
      category: 'food',
      initialQty: 10,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const { replica, itemId } = created.value;

    expect(receiveGoods(replica, itemId, 0)).toEqual({ ok: false, error: 'INVALID_QTY' });
    expect(issue(replica, itemId, 0)).toEqual({ ok: false, error: 'INVALID_QTY' });
    expect(emergencyIssue(replica, itemId, 0, { reason: 'Emergency' })).toEqual({
      ok: false,
      error: 'INVALID_QTY',
    });
    expect(transferRights(replica, itemId, 'aaaa1111', 5)).toEqual({
      ok: false,
      error: 'SELF_TRANSFER',
    });
  });
});
