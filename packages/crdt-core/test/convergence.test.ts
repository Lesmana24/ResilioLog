import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { bcLocalRights, bcValue } from '../src/bounded-counter';
import { canonicalize } from '../src/canonicalize';
import { pnValue } from '../src/pn-counter';
import { itemSummary } from '../src/queries';
import { mergeIntoReplica, mergeStates } from '../src/state';
import {
  arbNoOverrideScenario,
  arbReachableScenario,
  NODE_IDS,
} from './helpers/arbitraries';
import { NUM_RUNS } from './helpers/runs';

const PAIRS: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [0, 2],
  [1, 0],
  [1, 2],
  [2, 0],
  [2, 1],
];

describe('Convergence (B-07, B-13)', () => {
  it('C1 random partitions then pairwise sync -> identical canonical state', () => {
    fc.assert(
      fc.property(
        arbReachableScenario,
        fc.shuffledSubarray([...PAIRS], { minLength: PAIRS.length, maxLength: PAIRS.length }),
        ({ replicas }, order) => {
          const r = [...replicas] as [typeof replicas[0], typeof replicas[1], typeof replicas[2]];
          // Sync all pairs in random order twice
          for (let round = 0; round < 2; round++) {
            for (const [from, to] of order) {
              r[to] = mergeIntoReplica(r[to]!, r[from]!.state, r[from]!.clock);
            }
          }

          const c0 = canonicalize(r[0].state);
          const c1 = canonicalize(r[1].state);
          const c2 = canonicalize(r[2].state);
          expect(c1).toEqual(c0);
          expect(c2).toEqual(c0);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it('C3 duplicated and reordered delivery -> no change', () => {
    fc.assert(
      fc.property(
        arbReachableScenario,
        fc.array(fc.integer({ min: 0, max: 2 }), { minLength: 3, maxLength: 9 }),
        ({ replicas }, deliveryIndices) => {
          const [r0, r1, r2] = replicas;
          const once = canonicalize(mergeStates(mergeStates(r0.state, r1.state), r2.state));

          let reordered = r0.state;
          // Ensure every replica is included at least once, plus duplicates in arbitrary order
          const allIndices = [...deliveryIndices, 0, 1, 2];
          for (const idx of allIndices) {
            reordered = mergeStates(reordered, replicas[idx]!.state);
          }

          expect(canonicalize(reordered)).toEqual(once);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it('C4 no lost update: successful receive/issue totals equal ledger totals after convergence', () => {
    fc.assert(
      fc.property(arbReachableScenario, ({ replicas, expectedIn, expectedOut }) => {
        const converged = mergeStates(
          mergeStates(replicas[0].state, replicas[1].state),
          replicas[2].state,
        );

        const itemIds = Object.keys(expectedIn);
        expect(Object.keys(converged.items).sort()).toEqual(itemIds.sort());

        for (const itemId of itemIds) {
          const summary = itemSummary(converged, itemId);
          expect(summary).toBeDefined();
          expect(summary!.ledgerIn).toBe(expectedIn[itemId]);
          expect(summary!.ledgerOut).toBe(expectedOut[itemId]);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('B1 on reachable states without override: localRights >= 0 and value >= 0', () => {
    fc.assert(
      fc.property(arbNoOverrideScenario, ({ replicas }) => {
        const merged = mergeStates(
          mergeStates(replicas[0].state, replicas[1].state),
          replicas[2].state,
        );
        for (const state of [replicas[0].state, replicas[1].state, replicas[2].state, merged]) {
          for (const item of Object.values(state.items)) {
            expect(bcValue(item.quota)).toBeGreaterThanOrEqual(0);
            for (const nodeId of NODE_IDS) {
              expect(bcLocalRights(item.quota, nodeId)).toBeGreaterThanOrEqual(0);
            }
          }
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('B5 on reachable states: pnValue(ledger) === bcValue(quota) for every item', () => {
    fc.assert(
      fc.property(arbReachableScenario, ({ replicas }) => {
        const merged = mergeStates(
          mergeStates(replicas[0].state, replicas[1].state),
          replicas[2].state,
        );
        for (const state of [replicas[0].state, replicas[1].state, replicas[2].state, merged]) {
          for (const item of Object.values(state.items)) {
            expect(pnValue(item.ledger)).toBe(bcValue(item.quota));
          }
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
