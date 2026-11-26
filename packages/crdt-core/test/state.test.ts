import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { bcEmpty } from '../src/bounded-counter';
import { canonicalize } from '../src/canonicalize';
import { makeLamport } from '../src/lamport';
import { pnEmpty } from '../src/pn-counter';
import { emptyState, mergeIntoReplica, mergeStates } from '../src/state';
import type { ItemState, Replica, ResilioState } from '../src/types';
import { arbReachableStates } from './helpers/arbitraries';
import { deepFreeze } from './helpers/freeze';
import { NUM_RUNS } from './helpers/runs';

function makeItemState(name: string, createdAtC: number, createdAtN: string, touchedC: number): ItemState {
  return {
    meta: {
      name,
      unit: 'kg',
      category: 'food',
      createdBy: createdAtN,
      createdAt: makeLamport(createdAtC, createdAtN),
    },
    ledger: pnEmpty(),
    quota: bcEmpty(),
    touchedAt: makeLamport(touchedC, createdAtN),
  };
}

describe('ResilioState merge (B-06, B-07)', () => {
  it('L1-L3 laws (commutative, associative, idempotent) on reachable states', () => {
    fc.assert(
      fc.property(arbReachableStates, ([a, b, c]) => {
        // L1: commutative
        expect(canonicalize(mergeStates(a, b))).toEqual(canonicalize(mergeStates(b, a)));
        // L2: associative
        expect(canonicalize(mergeStates(mergeStates(a, b), c))).toEqual(
          canonicalize(mergeStates(a, mergeStates(b, c))),
        );
        // L3: idempotent
        expect(canonicalize(mergeStates(a, a))).toEqual(canonicalize(a));
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('L4 inflationary: merge(s, merge(s, other)) = merge(s, other)', () => {
    fc.assert(
      fc.property(arbReachableStates, ([a, b]) => {
        const next = mergeStates(a, b);
        expect(canonicalize(mergeStates(a, next))).toEqual(canonicalize(next));
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('L5 does not mutate inputs (with deepFreeze)', () => {
    fc.assert(
      fc.property(arbReachableStates, ([a, b]) => {
        const fa = deepFreeze(a);
        const fb = deepFreeze(b);
        const snapA = structuredClone(a);
        const snapB = structuredClone(b);

        mergeStates(fa, fb);
        const replica: Replica = deepFreeze({ nodeId: 'aaaa1111', clock: 3, state: fa });
        mergeIntoReplica(replica, fb, 10);

        expect(fa).toEqual(snapA);
        expect(fb).toEqual(snapB);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('meta conflict rule keeps smaller createdAt deterministically', () => {
    const id = 'rice-1-aaaa1111';
    const earlier = makeItemState('Rice Earlier', 2, 'aaaa1111', 2);
    const later = makeItemState('Rice Later', 5, 'bbbb2222', 5);

    const sA: ResilioState = { ...emptyState(), items: { [id]: earlier } };
    const sB: ResilioState = { ...emptyState(), items: { [id]: later } };

    expect(mergeStates(sA, sB).items[id]?.meta.name).toBe('Rice Earlier');
    expect(mergeStates(sB, sA).items[id]?.meta.name).toBe('Rice Earlier');
  });

  it('touchedAt is max-merged via maxLamport', () => {
    const id = 'rice-1-aaaa1111';
    const sA: ResilioState = {
      ...emptyState(),
      items: { [id]: makeItemState('Rice', 1, 'aaaa1111', 4) },
    };
    const sB: ResilioState = {
      ...emptyState(),
      items: { [id]: makeItemState('Rice', 1, 'aaaa1111', 9) },
    };

    expect(mergeStates(sA, sB).items[id]?.touchedAt).toEqual(makeLamport(9, 'aaaa1111'));
    expect(mergeStates(sB, sA).items[id]?.touchedAt).toEqual(makeLamport(9, 'aaaa1111'));
  });

  it('throws when schemaVersion differs', () => {
    const a = emptyState();
    const b = { ...emptyState(), schemaVersion: 2 } as unknown as ResilioState;
    expect(() => mergeStates(a, b)).toThrow(/SCHEMA_MISMATCH/);
  });

  it('mergeIntoReplica advances clock via receive(local, remoteClock)', () => {
    const r: Replica = { nodeId: 'aaaa1111', clock: 4, state: emptyState() };
    const remote = emptyState();
    const next = mergeIntoReplica(r, remote, 12);
    expect(next.clock).toBe(13);
    expect(next.nodeId).toBe('aaaa1111');
  });
});
