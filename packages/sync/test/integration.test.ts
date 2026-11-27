import {
  canonicalize,
  createItem,
  createReplica,
  emergencyIssue,
  issue,
  itemSummary,
  orsElements,
  receiveGoods,
  resolveTopUp,
  transferRights,
  voidLogEntry,
  type Replica,
  type ResilioState,
} from '@resiliolog/crdt-core';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  applyDelta,
  buildEnvelope,
  chunkBlob,
  ChunkCollector,
  decodeEnvelope,
  encodeEnvelope,
} from '../src';

const envRuns = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env?.FC_RUNS;
const NUM_RUNS = Number(envRuns ?? 1000);
const NODE_IDS = ['aaaa1111', 'bbbb2222', 'cccc3333'] as const;

function syncViaWire(
  from: Replica,
  since: number,
  to: Replica,
  withShuffledDuplicateChunks = false,
): { replica: Replica; until: number } {
  const type = since === 0 ? 'full' : 'delta';
  const env = buildEnvelope(from, since, type, to.nodeId);
  const blob = encodeEnvelope(env);

  let assembledBlob = blob;
  if (withShuffledDuplicateChunks) {
    const chunks = chunkBlob(blob, env.msgId);
    const delivered = [...chunks.slice().reverse(), ...chunks];
    const collector = new ChunkCollector();
    for (const chunk of delivered) {
      collector.add(chunk);
    }
    assembledBlob = collector.assemble();
  }

  const decoded = decodeEnvelope(assembledBlob);
  const updated = applyDelta(to, decoded.payload as ResilioState, decoded.until);
  return { replica: updated, until: decoded.until };
}

type OpStep =
  | { kind: 'createItem'; replica: number; qty: number }
  | { kind: 'receiveGoods'; replica: number; itemPick: number; qty: number }
  | { kind: 'issue'; replica: number; itemPick: number; qty: number }
  | { kind: 'transferRights'; from: number; to: number; itemPick: number; qty: number }
  | { kind: 'emergencyIssue'; replica: number; itemPick: number; qty: number }
  | { kind: 'voidLogEntry'; replica: number; pick: number }
  | { kind: 'resolveTopUp'; replica: number; pick: number }
  | { kind: 'sync'; from: number; to: number };

const arbSteps = fc.array(
  fc.oneof(
    fc.record({
      kind: fc.constant('createItem' as const),
      replica: fc.integer({ min: 0, max: 2 }),
      qty: fc.integer({ min: 1, max: 50 }),
    }),
    fc.record({
      kind: fc.constant('receiveGoods' as const),
      replica: fc.integer({ min: 0, max: 2 }),
      itemPick: fc.nat({ max: 5 }),
      qty: fc.integer({ min: 1, max: 30 }),
    }),
    fc.record({
      kind: fc.constant('issue' as const),
      replica: fc.integer({ min: 0, max: 2 }),
      itemPick: fc.nat({ max: 5 }),
      qty: fc.integer({ min: 1, max: 30 }),
    }),
    fc.record({
      kind: fc.constant('transferRights' as const),
      from: fc.integer({ min: 0, max: 2 }),
      to: fc.integer({ min: 0, max: 2 }),
      itemPick: fc.nat({ max: 5 }),
      qty: fc.integer({ min: 1, max: 25 }),
    }),
    fc.record({
      kind: fc.constant('emergencyIssue' as const),
      replica: fc.integer({ min: 0, max: 2 }),
      itemPick: fc.nat({ max: 5 }),
      qty: fc.integer({ min: 1, max: 20 }),
    }),
    fc.record({
      kind: fc.constant('voidLogEntry' as const),
      replica: fc.integer({ min: 0, max: 2 }),
      pick: fc.nat({ max: 10 }),
    }),
    fc.record({
      kind: fc.constant('resolveTopUp' as const),
      replica: fc.integer({ min: 0, max: 2 }),
      pick: fc.nat({ max: 10 }),
    }),
    fc.record({
      kind: fc.constant('sync' as const),
      from: fc.integer({ min: 0, max: 2 }),
      to: fc.integer({ min: 0, max: 2 }),
    }),
  ),
  { minLength: 1, maxLength: 20 },
);

describe('sync/integration (B-13)', () => {
  it('demo scenario: create -> transfer -> partition -> issue/quota/top-up/override -> two-way QR chunk sync', () => {
    // 1. Replica A creates an item with 100 units
    let a = createReplica('aaaa1111');
    let b = createReplica('bbbb2222');

    const created = createItem(a, {
      name: 'Insulin',
      unit: 'vial',
      category: 'medicine',
      initialQty: 100,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    a = created.value.replica;
    const { itemId } = created.value;

    // 2. A transfers 40 rights to B and syncs initial state to B
    const xfer = transferRights(a, itemId, 'bbbb2222', 40);
    expect(xfer.ok).toBe(true);
    if (!xfer.ok) return;
    a = xfer.value;

    const initSync = syncViaWire(a, 0, b, true);
    b = initSync.replica;
    const cursorAtoB = initSync.until;
    const cursorBtoA = b.clock;

    // 3. A and B go offline (partitioned)
    // 4. A issues 30 units
    const aIss = issue(a, itemId, 30, { counterparty: 'Clinic North' });
    expect(aIss.ok).toBe(true);
    if (!aIss.ok) return;
    a = aIss.value;

    // 5. B issues 10 units (30/40 rights left)
    const bIss1 = issue(b, itemId, 10, { counterparty: 'Shelter 1' });
    expect(bIss1.ok).toBe(true);
    if (!bIss1.ok) return;
    b = bIss1.value;

    // 6. B tries to issue 31 units -> must be rejected with INSUFFICIENT_RIGHTS
    expect(issue(b, itemId, 31)).toEqual({ ok: false, error: 'INSUFFICIENT_RIGHTS' });

    // 7. B issues 25 more units (5/40 = 12.5% <= 15%) -> top-up request enqueued
    const bIss2 = issue(b, itemId, 25, { counterparty: 'Shelter 2' });
    expect(bIss2.ok).toBe(true);
    if (!bIss2.ok) return;
    b = bIss2.value;
    expect(orsElements(b.state.topUpQueue)).toHaveLength(1);

    // 8. B performs emergency override with reason (40 units -> total out 105, deficit 5)
    const bOv = emergencyIssue(b, itemId, 40, {
      reason: 'Critical diabetic patients',
      counterparty: 'Med Tent',
    });
    expect(bOv.ok).toBe(true);
    if (!bOv.ok) return;
    b = bOv.value;

    // 9. Both replicas exchange deltas two ways via encode -> chunk -> shuffle/duplicate -> reassemble -> decode
    const syncB = syncViaWire(a, cursorAtoB, b, true);
    const syncA = syncViaWire(b, cursorBtoA, a, true);
    b = syncB.replica;
    a = syncA.replica;

    // Verify convergence & all invariants
    expect(canonicalize(a.state)).toEqual(canonicalize(b.state));

    const summary = itemSummary(a.state, itemId);
    expect(summary).toEqual({
      value: -5,
      deficit: 5,
      ledgerIn: 100,
      ledgerOut: 105,
      rights: {
        aaaa1111: 30,
        bbbb2222: 5,
      },
    });

    const overrides = orsElements(a.state.distributionLog).filter(
      (e) => e.el.kind === 'override_issue',
    );
    expect(overrides).toHaveLength(1);
    expect(overrides[0]!.el.reason).toBe('Critical diabetic patients');

    const topUps = orsElements(a.state.topUpQueue);
    expect(topUps).toHaveLength(1);
    expect(topUps[0]!.el).toMatchObject({ itemId, requester: 'bbbb2222' });
  });

  it(
    'C1 3 replicas, random partitions, all-pairs sync twice via wire format -> identical canonical state',
    () => {
      fc.assert(
        fc.property(arbSteps, (steps) => {
          const replicas: [Replica, Replica, Replica] = [
            createReplica(NODE_IDS[0]),
            createReplica(NODE_IDS[1]),
            createReplica(NODE_IDS[2]),
          ];
          const cursors: number[][] = [
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
          ];

          for (const step of steps) {
            if (step.kind === 'sync') {
              if (step.from === step.to) continue;
              const since = cursors[step.from]![step.to]!;
              const res = syncViaWire(replicas[step.from]!, since, replicas[step.to]!);
              replicas[step.to] = res.replica;
              cursors[step.from]![step.to] = res.until;
              continue;
            }

            if (step.kind === 'createItem') {
              const res = createItem(replicas[step.replica]!, {
                name: 'Rice',
                unit: 'kg',
                category: 'food',
                initialQty: step.qty,
              });
              if (res.ok) replicas[step.replica] = res.value.replica;
              continue;
            }

            if (step.kind === 'transferRights') {
              const r = replicas[step.from]!;
              const itemIds = Object.keys(r.state.items);
              if (itemIds.length === 0) continue;
              const res = transferRights(
                r,
                itemIds[step.itemPick % itemIds.length]!,
                NODE_IDS[step.to]!,
                step.qty,
              );
              if (res.ok) replicas[step.from] = res.value;
              continue;
            }

            const r = replicas[step.replica]!;
            if (step.kind === 'voidLogEntry') {
              const active = orsElements(r.state.distributionLog);
              if (active.length === 0) continue;
              const res = voidLogEntry(r, active[step.pick % active.length]!.tag);
              if (res.ok) replicas[step.replica] = res.value;
              continue;
            }
            if (step.kind === 'resolveTopUp') {
              const active = orsElements(r.state.topUpQueue);
              if (active.length === 0) continue;
              const res = resolveTopUp(r, active[step.pick % active.length]!.tag);
              if (res.ok) replicas[step.replica] = res.value;
              continue;
            }

            const itemIds = Object.keys(r.state.items);
            if (itemIds.length === 0) continue;
            const itemId = itemIds[step.itemPick % itemIds.length]!;
            if (step.kind === 'receiveGoods') {
              const res = receiveGoods(r, itemId, step.qty);
              if (res.ok) replicas[step.replica] = res.value;
            } else if (step.kind === 'issue') {
              const res = issue(r, itemId, step.qty);
              if (res.ok) replicas[step.replica] = res.value;
            } else if (step.kind === 'emergencyIssue') {
              const res = emergencyIssue(r, itemId, step.qty, { reason: 'Emergency' });
              if (res.ok) replicas[step.replica] = res.value;
            }
          }

          // Final all-pairs sync twice via wire format
          const pairs: ReadonlyArray<readonly [number, number]> = [
            [0, 1],
            [0, 2],
            [1, 0],
            [1, 2],
            [2, 0],
            [2, 1],
          ];
          for (let round = 0; round < 2; round++) {
            for (const [from, to] of pairs) {
              const res = syncViaWire(replicas[from]!, cursors[from]![to]!, replicas[to]!);
              replicas[to] = res.replica;
              cursors[from]![to] = res.until;
            }
          }

          const c0 = canonicalize(replicas[0].state);
          expect(canonicalize(replicas[1].state)).toEqual(c0);
          expect(canonicalize(replicas[2].state)).toEqual(c0);
        }),
        { numRuns: NUM_RUNS },
      );
    },
    30_000,
  );
});
