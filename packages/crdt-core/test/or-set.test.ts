import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { orsAdd, orsElements, orsEmpty, orsMerge, orsRemove } from '../src/or-set';
import type { ORSet, Tag } from '../src/types';
import { NODE_IDS } from './helpers/arbitraries';
import { deepFreeze } from './helpers/freeze';
import { NUM_RUNS } from './helpers/runs';

type OpStep =
  | { kind: 'add'; replica: number; value: string }
  | { kind: 'remove'; replica: number; pickIdx: number }
  | { kind: 'sync'; from: number; to: number };

const arbSteps = fc.array(
  fc.oneof(
    fc.record({
      kind: fc.constant('add' as const),
      replica: fc.integer({ min: 0, max: 2 }),
      value: fc.constantFrom('rice', 'water', 'meds', 'tent', 'blanket'),
    }),
    fc.record({
      kind: fc.constant('remove' as const),
      replica: fc.integer({ min: 0, max: 2 }),
      pickIdx: fc.nat({ max: 20 }),
    }),
    fc.record({
      kind: fc.constant('sync' as const),
      from: fc.integer({ min: 0, max: 2 }),
      to: fc.integer({ min: 0, max: 2 }),
    }),
  ),
  { minLength: 1, maxLength: 30 },
);

function buildThreeReplicas(steps: readonly OpStep[]): [ORSet<string>, ORSet<string>, ORSet<string>] {
  const sets: [ORSet<string>, ORSet<string>, ORSet<string>] = [orsEmpty(), orsEmpty(), orsEmpty()];
  const clocks = [0, 0, 0];

  for (const step of steps) {
    if (step.kind === 'add') {
      const idx = step.replica;
      const nextC = (clocks[idx] ?? 0) + 1;
      clocks[idx] = nextC;
      const tag: Tag = `${NODE_IDS[idx]}:${nextC}`;
      sets[idx] = orsAdd(sets[idx]!, tag, step.value);
    } else if (step.kind === 'remove') {
      const idx = step.replica;
      const active = orsElements(sets[idx]!);
      if (active.length > 0) {
        const target = active[step.pickIdx % active.length]!;
        sets[idx] = orsRemove(sets[idx]!, [target.tag]);
      }
    } else {
      sets[step.to] = orsMerge(sets[step.to]!, sets[step.from]!);
    }
  }
  return sets;
}

const arbThreeReachableSets = arbSteps.map(buildThreeReplicas);

describe('OR-Set (B-05)', () => {
  it('add wins over concurrent remove across partitioned replicas', () => {
    // Replica A adds item 'rice' with tag aaaa1111:1 and syncs to B
    const a1 = orsAdd(orsEmpty<string>(), 'aaaa1111:1', 'rice');
    const b1 = orsMerge(orsEmpty<string>(), a1);

    // Partition: B removes observed tag aaaa1111:1; A concurrently adds 'rice' with fresh tag aaaa1111:2
    const b2 = orsRemove(b1, ['aaaa1111:1']);
    const a2 = orsAdd(a1, 'aaaa1111:2', 'rice');

    const mergedAB = orsMerge(a2, b2);
    const mergedBA = orsMerge(b2, a2);

    expect(orsElements(mergedAB)).toEqual([{ tag: 'aaaa1111:2', el: 'rice' }]);
    expect(orsElements(mergedBA)).toEqual([{ tag: 'aaaa1111:2', el: 'rice' }]);
  });

  it('hides elements whose tags have been removed', () => {
    const s1 = orsAdd(orsAdd(orsEmpty<string>(), 'aaaa1111:1', 'rice'), 'aaaa1111:2', 'water');
    const s2 = orsRemove(s1, ['aaaa1111:1']);
    expect(orsElements(s2)).toEqual([{ tag: 'aaaa1111:2', el: 'water' }]);
    expect(s2.removed).toEqual(['aaaa1111:1']);
  });

  it('elements sorted by tag Lamport order (by c, then n)', () => {
    let s = orsEmpty<string>();
    s = orsAdd(s, 'bbbb2222:2', 'third');
    s = orsAdd(s, 'aaaa1111:2', 'second');
    s = orsAdd(s, 'cccc3333:1', 'first');

    expect(orsElements(s)).toEqual([
      { tag: 'cccc3333:1', el: 'first' },
      { tag: 'aaaa1111:2', el: 'second' },
      { tag: 'bbbb2222:2', el: 'third' },
    ]);
  });

  it('same tag with different element throws on merge', () => {
    const a = orsAdd(orsEmpty<string>(), 'aaaa1111:1', 'rice');
    const b = orsAdd(orsEmpty<string>(), 'aaaa1111:1', 'water');
    expect(() => orsMerge(a, b)).toThrow();
  });

  it('L1-L3 laws (commutative, associative, idempotent) on reachable 2-3 node sets', () => {
    fc.assert(
      fc.property(arbThreeReachableSets, ([a, b, c]) => {
        // L1: commutative
        expect(orsMerge(a, b)).toEqual(orsMerge(b, a));
        // L2: associative
        expect(orsMerge(orsMerge(a, b), c)).toEqual(orsMerge(a, orsMerge(b, c)));
        // L3: idempotent
        expect(orsMerge(a, a)).toEqual(a);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('L4 inflationary ops: merge(s, op(s)) = op(s)', () => {
    fc.assert(
      fc.property(arbThreeReachableSets, fc.boolean(), fc.nat({ max: 100 }), ([s], doAdd, pick) => {
        const next = doAdd
          ? orsAdd(s, `cccc3333:${Object.keys(s.adds).length + 1000}`, 'extra')
          : orsRemove(
              s,
              orsElements(s).length > 0
                ? [orsElements(s)[pick % orsElements(s).length]!.tag]
                : [],
            );
        expect(orsMerge(s, next)).toEqual(next);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('L5 does not mutate inputs (with deepFreeze)', () => {
    fc.assert(
      fc.property(arbThreeReachableSets, ([a, b]) => {
        const fa = deepFreeze(a);
        const fb = deepFreeze(b);
        const snapA = structuredClone(a);
        const snapB = structuredClone(b);

        orsElements(fa);
        const nextTag: Tag = `cccc3333:${Object.keys(fa.adds).length + 2000}`;
        orsAdd(fa, nextTag, 'rice');
        orsRemove(fa, Object.keys(fa.adds).slice(0, 1));
        const merged = orsMerge(fa, fb);

        expect(merged.removed).toEqual(Array.from(new Set(merged.removed)).sort());
        expect(fa).toEqual(snapA);
        expect(fb).toEqual(snapB);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
