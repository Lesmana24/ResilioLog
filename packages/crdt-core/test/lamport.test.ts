import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  compareLamport,
  makeLamport,
  maxLamport,
  parseTag,
  receive,
  tagOf,
  tick,
} from '../src/lamport';
import { NODE_IDS } from './helpers/arbitraries';
import { NUM_RUNS } from './helpers/runs';

const arbNodeId = fc.constantFrom(...NODE_IDS);
const arbCounter = fc.nat({ max: 1_000_000 });
const arbLamport = fc.record({ c: arbCounter, n: arbNodeId });

describe('lamport', () => {
  it('orders by c first, then n lexicographically', () => {
    expect(compareLamport({ c: 1, n: 'bbbb2222' }, { c: 2, n: 'aaaa1111' })).toBeLessThan(0);
    expect(compareLamport({ c: 2, n: 'aaaa1111' }, { c: 1, n: 'bbbb2222' })).toBeGreaterThan(0);
    expect(compareLamport({ c: 2, n: 'aaaa1111' }, { c: 2, n: 'bbbb2222' })).toBeLessThan(0);
    expect(compareLamport({ c: 2, n: 'aaaa1111' }, { c: 2, n: 'aaaa1111' })).toBe(0);
  });

  it('tick, receive, maxLamport, and makeLamport work as specified', () => {
    expect(tick(0)).toBe(1);
    expect(tick(41)).toBe(42);
    expect(receive(3, 10)).toBe(11);
    expect(receive(10, 3)).toBe(11);
    expect(receive(5, 5)).toBe(6);

    const a = makeLamport(5, 'aaaa1111');
    const b = makeLamport(5, 'bbbb2222');
    expect(maxLamport(a, b)).toEqual(b);
    expect(maxLamport(b, a)).toEqual(b);
  });

  it('throws on invalid tag or clock inputs', () => {
    expect(() => parseTag('invalid')).toThrow();
    expect(() => parseTag('a:1')).toThrow(); // nodeId too short
    expect(() => parseTag('aaaa1111:abc')).toThrow();
    expect(() => parseTag('aaaa1111:1:2')).toThrow();
    expect(() => tick(-1)).toThrow();
    expect(() => receive(-1, 0)).toThrow();
    expect(() => receive(0, -1)).toThrow();
    expect(() => makeLamport(-1, 'aaaa1111')).toThrow();
    expect(() => makeLamport(1, 'BAD!')).toThrow();
  });

  it('property: compareLamport is a total order (antisymmetry, transitivity, totality)', () => {
    fc.assert(
      fc.property(arbLamport, arbLamport, arbLamport, (a, b, c) => {
        const ab = compareLamport(a, b);
        const ba = compareLamport(b, a);
        const bc = compareLamport(b, c);
        const ac = compareLamport(a, c);

        // totality & antisymmetry
        expect(ab).toBe(ba === 0 ? 0 : -ba);
        if (ab === 0) {
          expect(a).toEqual(b);
        } else {
          expect(ab === -1 || ab === 1).toBe(true);
        }

        // transitivity
        if (ab <= 0 && bc <= 0) {
          expect(ac).toBeLessThanOrEqual(0);
        }
        if (ab >= 0 && bc >= 0) {
          expect(ac).toBeGreaterThanOrEqual(0);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('property: tagOf and parseTag round-trip', () => {
    fc.assert(
      fc.property(arbLamport, (l) => {
        const tag = tagOf(l);
        expect(parseTag(tag)).toEqual(l);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
