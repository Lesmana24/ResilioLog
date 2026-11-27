import {
  canonicalize,
  createItem,
  createReplica,
  issue,
  mergeStates,
  orsElements,
  receiveGoods,
  transferRights,
  voidLogEntry,
  type Replica,
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
  makeDelta,
} from '../src';
import type { ResilioState } from '@resiliolog/crdt-core';

describe('sync/delta (B-11, B-13)', () => {
  it('C2 delta sync equals full merge and stale cursors remain safe', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 20, max: 100 }),
        fc.integer({ min: 1, max: 15 }),
        fc.integer({ min: 1, max: 15 }),
        fc.nat({ max: 20 }),
        (initQty, issueA, issueB, staleOffset) => {
          let a = createReplica('aaaa1111');
          let b = createReplica('bbbb2222');

          const created = createItem(a, {
            name: 'Rice',
            unit: 'kg',
            category: 'food',
            initialQty: initQty,
          });
          if (!created.ok) throw new Error(created.error);
          a = created.value.replica;
          const itemId = created.value.itemId;

          const xfer = transferRights(a, itemId, 'bbbb2222', Math.floor(initQty / 2));
          if (xfer.ok) a = xfer.value;

          // Initial sync A -> B
          const env0 = buildEnvelope(a, 0, 'full', 'bbbb2222');
          b = applyDelta(b, env0.payload as ResilioState, env0.until);

          const cursorAForB = a.clock;
          const cursorBForA = b.clock;

          // Partition: divergent ops on A and B (including voiding an older entry on A)
          const issA = issue(a, itemId, issueA);
          if (issA.ok) a = issA.value;
          const recA = receiveGoods(a, itemId, 5);
          if (recA.ok) a = recA.value;
          const firstTag = orsElements(a.state.distributionLog)[0]?.tag;
          if (firstTag) {
            const v = voidLogEntry(a, firstTag);
            if (v.ok) a = v.value;
          }

          const issB = issue(b, itemId, issueB);
          if (issB.ok) b = issB.value;

          // Use potentially stale (smaller) cursors
          const staleA = Math.max(0, cursorAForB - staleOffset);
          const staleB = Math.max(0, cursorBForA - staleOffset);

          const deltaFromA = makeDelta(a, staleA);
          const deltaFromB = makeDelta(b, staleB);

          const aAfter = applyDelta(a, deltaFromB, b.clock);
          const bAfter = applyDelta(b, deltaFromA, a.clock);
          const fullMerged = canonicalize(mergeStates(a.state, b.state));

          expect(canonicalize(aAfter.state)).toEqual(fullMerged);
          expect(canonicalize(bAfter.state)).toEqual(fullMerged);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('two-replica end-to-end integration via encode -> chunks -> collector -> decode -> applyDelta', () => {
    let a: Replica = createReplica('aaaa1111');
    let b: Replica = createReplica('bbbb2222');

    // A creates item with 100, transfers 40 to B, syncs to B
    const created = createItem(a, {
      name: 'Water',
      unit: 'L',
      category: 'water',
      initialQty: 100,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    a = created.value.replica;
    const itemId = created.value.itemId;

    const xfer = transferRights(a, itemId, 'bbbb2222', 40);
    expect(xfer.ok).toBe(true);
    if (!xfer.ok) return;
    a = xfer.value;

    const initEnv = buildEnvelope(a, 0, 'full', 'bbbb2222');
    const initDecoded = decodeEnvelope(encodeEnvelope(initEnv));
    b = applyDelta(b, initDecoded.payload as ResilioState, initDecoded.until);

    const aCursor = a.clock;
    const bCursor = b.clock;

    // Partition: A issues 10; B issues 35 (leaves 5/40 = 12.5% <= 0.15 -> triggers top-up)
    const issA = issue(a, itemId, 10);
    expect(issA.ok).toBe(true);
    if (!issA.ok) return;
    a = issA.value;

    const issB = issue(b, itemId, 35);
    expect(issB.ok).toBe(true);
    if (!issB.ok) return;
    b = issB.value;
    expect(orsElements(b.state.topUpQueue)).toHaveLength(1);

    // Exchange deltas both ways over QR chunks
    const transferViaQr = (from: Replica, since: number, to: Replica): Replica => {
      const env = buildEnvelope(from, since, 'delta', to.nodeId);
      const blob = encodeEnvelope(env);
      const chunks = chunkBlob(blob, env.msgId);
      const collector = new ChunkCollector();
      for (const ch of [...chunks].reverse()) {
        collector.add(ch);
      }
      const decoded = decodeEnvelope(collector.assemble());
      return applyDelta(to, decoded.payload as ResilioState, decoded.until);
    };

    const bSynced = transferViaQr(a, aCursor, b);
    const aSynced = transferViaQr(b, bCursor, a);

    expect(canonicalize(aSynced.state)).toEqual(canonicalize(bSynced.state));
    expect(orsElements(aSynced.state.topUpQueue)).toHaveLength(1);
  });
});
