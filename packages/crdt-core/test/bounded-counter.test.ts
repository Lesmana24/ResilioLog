import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  bcConsume,
  bcEmpty,
  bcGranted,
  bcIncrement,
  bcLocalRights,
  bcMerge,
  bcOverrideConsume,
  bcRemainingRatio,
  bcTransfer,
  bcValue,
} from '../src/bounded-counter';
import type { BoundedCounter } from '../src/types';
import { NODE_IDS } from './helpers/arbitraries';
import { deepFreeze } from './helpers/freeze';
import { NUM_RUNS } from './helpers/runs';

type BcStep =
  | { kind: 'inc'; replica: number; qty: number }
  | { kind: 'consume'; replica: number; qty: number }
  | { kind: 'transfer'; from: number; to: number; qty: number }
  | { kind: 'sync'; from: number; to: number };

type BcStepWithOverride =
  | BcStep
  | { kind: 'override'; replica: number; qty: number };

const arbBcSteps = (allowOverride: boolean) =>
  fc.array(
    fc.oneof(
      fc.record({
        kind: fc.constant('inc' as const),
        replica: fc.integer({ min: 0, max: 2 }),
        qty: fc.integer({ min: 1, max: 50 }),
      }),
      fc.record({
        kind: fc.constant('consume' as const),
        replica: fc.integer({ min: 0, max: 2 }),
        qty: fc.integer({ min: 1, max: 50 }),
      }),
      fc.record({
        kind: fc.constant('transfer' as const),
        from: fc.integer({ min: 0, max: 2 }),
        to: fc.integer({ min: 0, max: 2 }),
        qty: fc.integer({ min: 1, max: 50 }),
      }),
      fc.record({
        kind: fc.constant('sync' as const),
        from: fc.integer({ min: 0, max: 2 }),
        to: fc.integer({ min: 0, max: 2 }),
      }),
      ...(allowOverride
        ? [
            fc.record({
              kind: fc.constant('override' as const),
              replica: fc.integer({ min: 0, max: 2 }),
              qty: fc.integer({ min: 1, max: 30 }),
            }),
          ]
        : []),
    ),
    { minLength: 1, maxLength: 40 },
  );

function runBcSteps(steps: readonly BcStepWithOverride[]): [BoundedCounter, BoundedCounter, BoundedCounter] {
  const states: [BoundedCounter, BoundedCounter, BoundedCounter] = [
    bcEmpty(),
    bcEmpty(),
    bcEmpty(),
  ];

  for (const step of steps) {
    if (step.kind === 'sync') {
      states[step.to] = bcMerge(states[step.to]!, states[step.from]!);
      continue;
    }
    if (step.kind === 'inc') {
      const node = NODE_IDS[step.replica]!;
      states[step.replica] = bcIncrement(states[step.replica]!, node, step.qty);
    } else if (step.kind === 'consume') {
      const node = NODE_IDS[step.replica]!;
      const res = bcConsume(states[step.replica]!, node, step.qty);
      if (res.ok) {
        states[step.replica] = res.value;
      }
    } else if (step.kind === 'transfer') {
      const fromNode = NODE_IDS[step.from]!;
      const toNode = NODE_IDS[step.to]!;
      const res = bcTransfer(states[step.from]!, fromNode, toNode, step.qty);
      if (res.ok) {
        states[step.from] = res.value;
      }
    } else if (step.kind === 'override') {
      const node = NODE_IDS[step.replica]!;
      const res = bcOverrideConsume(states[step.replica]!, node, step.qty);
      if (res.ok) {
        states[step.replica] = res.value;
      }
    }
  }
  return states;
}

const arbNoOverrideCounters = arbBcSteps(false).map(runBcSteps);
const arbWithOverrideCounters = arbBcSteps(true).map(runBcSteps);

describe('Bounded Counter (B-08)', () => {
  it('B1 without override: localRights >= 0 and value >= 0 in every merged state', () => {
    fc.assert(
      fc.property(arbNoOverrideCounters, ([a, b, c]) => {
        const mergedAB = bcMerge(a, b);
        const mergedAll = bcMerge(mergedAB, c);
        for (const s of [a, b, c, mergedAB, mergedAll]) {
          expect(bcValue(s)).toBeGreaterThanOrEqual(0);
          for (const node of NODE_IDS) {
            expect(bcLocalRights(s, node)).toBeGreaterThanOrEqual(0);
          }
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('B2 consume rejected iff qty > localRights (boundaries: rights, rights+1)', () => {
    let s = bcIncrement(bcEmpty(), 'aaaa1111', 40);
    expect(bcLocalRights(s, 'aaaa1111')).toBe(40);
    expect(bcRemainingRatio(s, 'aaaa1111')).toBe(1);

    // Boundary: rights + 1 fails with INSUFFICIENT_RIGHTS
    expect(bcConsume(s, 'aaaa1111', 41)).toEqual({ ok: false, error: 'INSUFFICIENT_RIGHTS' });

    // Boundary: qty === localRights succeeds
    const exact = bcConsume(s, 'aaaa1111', 40);
    expect(exact.ok).toBe(true);
    if (exact.ok) {
      s = exact.value;
      expect(bcLocalRights(s, 'aaaa1111')).toBe(0);
      expect(bcRemainingRatio(s, 'aaaa1111')).toBe(0);
      expect(bcValue(s)).toBe(0);
    }

    // Invalid quantities and self-transfer
    expect(bcConsume(s, 'aaaa1111', 0)).toEqual({ ok: false, error: 'INVALID_QTY' });
    expect(bcConsume(s, 'aaaa1111', -3)).toEqual({ ok: false, error: 'INVALID_QTY' });
    expect(bcConsume(s, 'aaaa1111', 1.5)).toEqual({ ok: false, error: 'INVALID_QTY' });
    expect(bcTransfer(s, 'aaaa1111', 'aaaa1111', 1)).toEqual({ ok: false, error: 'SELF_TRANSFER' });
    expect(bcTransfer(s, 'aaaa1111', 'bbbb2222', 0)).toEqual({ ok: false, error: 'INVALID_QTY' });
    expect(bcOverrideConsume(s, 'aaaa1111', 0)).toEqual({ ok: false, error: 'INVALID_QTY' });
    expect(() => bcIncrement(s, 'aaaa1111', 0)).toThrow();
  });

  it('B3 transfer: recipient cannot spend before observing the grant (stale view)', () => {
    const a1 = bcIncrement(bcEmpty(), 'aaaa1111', 100);
    const tRes = bcTransfer(a1, 'aaaa1111', 'bbbb2222', 40);
    expect(tRes.ok).toBe(true);
    if (!tRes.ok) return;
    const a2 = tRes.value;

    // Partitioned: B has stale view (has not merged a2 yet) -> cannot spend transferred rights
    const bStale = bcEmpty();
    expect(bcLocalRights(bStale, 'bbbb2222')).toBe(0);
    expect(bcConsume(bStale, 'bbbb2222', 10)).toEqual({
      ok: false,
      error: 'INSUFFICIENT_RIGHTS',
    });

    // After B observes the grant via merge, B can spend up to 40
    const bSynced = bcMerge(bStale, a2);
    expect(bcGranted(bSynced, 'bbbb2222')).toBe(40);
    expect(bcLocalRights(bSynced, 'bbbb2222')).toBe(40);
    expect(bcLocalRights(bSynced, 'aaaa1111')).toBe(60);

    const bAfterSpend = bcConsume(bSynced, 'bbbb2222', 10);
    expect(bAfterSpend.ok).toBe(true);
    if (bAfterSpend.ok) {
      expect(bcLocalRights(bAfterSpend.value, 'bbbb2222')).toBe(30);
      expect(bcValue(bAfterSpend.value)).toBe(90);
    }
  });

  it('B4 with override: value >= -sum(O); restock clears deficit', () => {
    fc.assert(
      fc.property(arbWithOverrideCounters, ([a, b, c]) => {
        const merged = bcMerge(bcMerge(a, b), c);
        const sumO = Object.values(merged.O).reduce((acc, v) => acc + v, 0);
        expect(bcValue(merged)).toBeGreaterThanOrEqual(-sumO);
      }),
      { numRuns: NUM_RUNS },
    );

    // Concrete deficit & restock clearance
    let s = bcIncrement(bcEmpty(), 'aaaa1111', 10);
    const oRes = bcOverrideConsume(s, 'aaaa1111', 25);
    expect(oRes.ok).toBe(true);
    if (!oRes.ok) return;
    s = oRes.value;

    expect(bcValue(s)).toBe(-15);
    expect(Math.max(0, -bcValue(s))).toBe(15);

    // Restock 15 clears deficit to 0
    s = bcIncrement(s, 'aaaa1111', 15);
    expect(bcValue(s)).toBe(0);
    expect(Math.max(0, -bcValue(s))).toBe(0);
  });

  it('L1-L5 laws (commutative, associative, idempotent, inflationary, no mutation)', () => {
    fc.assert(
      fc.property(arbWithOverrideCounters, ([a, b, c]) => {
        const fa = deepFreeze(a);
        const fb = deepFreeze(b);
        const fcFrozen = deepFreeze(c);
        const snapA = structuredClone(a);
        const snapB = structuredClone(b);

        // L1 commutative
        expect(bcMerge(fa, fb)).toEqual(bcMerge(fb, fa));
        // L2 associative
        expect(bcMerge(bcMerge(fa, fb), fcFrozen)).toEqual(bcMerge(fa, bcMerge(fb, fcFrozen)));
        // L3 idempotent
        expect(bcMerge(fa, fa)).toEqual(fa);

        // L4 inflationary
        const incNext = bcIncrement(fa, 'aaaa1111', 5);
        expect(bcMerge(fa, incNext)).toEqual(incNext);
        const consNext = bcConsume(fa, 'aaaa1111', 1);
        if (consNext.ok) {
          expect(bcMerge(fa, consNext.value)).toEqual(consNext.value);
        }
        const ovNext = bcOverrideConsume(fa, 'aaaa1111', 2);
        if (ovNext.ok) {
          expect(bcMerge(fa, ovNext.value)).toEqual(ovNext.value);
        }

        // L5 no mutation
        expect(fa).toEqual(snapA);
        expect(fb).toEqual(snapB);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
