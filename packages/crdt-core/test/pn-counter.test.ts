import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { pnDec, pnEmpty, pnInc, pnMerge, pnValue } from '../src/pn-counter';
import type { PNCounter } from '../src/types';
import { NODE_IDS } from './helpers/arbitraries';
import { deepFreeze } from './helpers/freeze';
import { NUM_RUNS } from './helpers/runs';

const arbNodeId = fc.constantFrom(...NODE_IDS);
const arbNatMap = fc.dictionary(arbNodeId, fc.nat({ max: 1000 }));
const arbPNCounter: fc.Arbitrary<PNCounter> = fc.record({
  p: arbNatMap,
  n: arbNatMap,
});
const arbQty = fc.integer({ min: 1, max: 100 });

describe('PN-Counter (B-04)', () => {
  it('value = sum(p) - sum(n)', () => {
    let s = pnEmpty();
    expect(pnValue(s)).toBe(0);

    s = pnInc(s, 'aaaa1111', 100);
    s = pnInc(s, 'bbbb2222', 25);
    s = pnDec(s, 'aaaa1111', 30);
    s = pnDec(s, 'cccc3333', 10);
    expect(pnValue(s)).toBe(85);

    const negative = pnDec(pnEmpty(), 'aaaa1111', 7);
    expect(pnValue(negative)).toBe(-7);
  });

  it('rejects k < 1 or non-integer k with a programmer error', () => {
    const s = pnEmpty();
    for (const bad of [0, -1, -100, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => pnInc(s, 'aaaa1111', bad)).toThrow();
      expect(() => pnDec(s, 'aaaa1111', bad)).toThrow();
    }
  });

  it('merges disjoint and overlapping nodes using pointwise max', () => {
    const a = pnDec(pnInc(pnEmpty(), 'aaaa1111', 50), 'aaaa1111', 10);
    const b = pnDec(pnInc(pnInc(pnEmpty(), 'aaaa1111', 30), 'bbbb2222', 20), 'bbbb2222', 5);
    const merged = pnMerge(a, b);
    expect(merged).toEqual({
      p: { aaaa1111: 50, bbbb2222: 20 },
      n: { aaaa1111: 10, bbbb2222: 5 },
    });
    expect(pnValue(merged)).toBe(55);
  });

  it('L1 commutative merge', () => {
    fc.assert(
      fc.property(arbPNCounter, arbPNCounter, (a, b) => {
        expect(pnMerge(a, b)).toEqual(pnMerge(b, a));
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('L2 associative merge', () => {
    fc.assert(
      fc.property(arbPNCounter, arbPNCounter, arbPNCounter, (a, b, c) => {
        expect(pnMerge(pnMerge(a, b), c)).toEqual(pnMerge(a, pnMerge(b, c)));
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('L3 idempotent merge', () => {
    fc.assert(
      fc.property(arbPNCounter, (a) => {
        expect(pnMerge(a, a)).toEqual(a);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('L4 inflationary ops: merge(s, op(s)) = op(s)', () => {
    fc.assert(
      fc.property(arbPNCounter, arbNodeId, arbQty, fc.boolean(), (s, node, k, isInc) => {
        const next = isInc ? pnInc(s, node, k) : pnDec(s, node, k);
        expect(pnMerge(s, next)).toEqual(next);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('L5 does not mutate inputs', () => {
    fc.assert(
      fc.property(arbPNCounter, arbPNCounter, arbNodeId, arbQty, (a, b, node, k) => {
        const fa = deepFreeze(a);
        const fb = deepFreeze(b);
        const snapA = structuredClone(a);
        const snapB = structuredClone(b);

        pnValue(fa);
        pnInc(fa, node, k);
        pnDec(fa, node, k);
        pnMerge(fa, fb);

        expect(fa).toEqual(snapA);
        expect(fb).toEqual(snapB);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
