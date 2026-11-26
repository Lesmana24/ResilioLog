import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { canonicalize } from '../src/canonicalize';
import { SCHEMA_VERSION, type ResilioState } from '../src/types';
import { deepFreeze } from './helpers/freeze';
import { NODE_IDS } from './helpers/arbitraries';
import { NUM_RUNS } from './helpers/runs';

const arbNodeId = fc.constantFrom(...NODE_IDS);
const arbLamport = fc.record({ c: fc.nat({ max: 1000 }), n: arbNodeId });
const arbTag = arbLamport.map((l) => `${l.n}:${l.c}`);
const arbNatMap = fc.dictionary(arbNodeId, fc.nat({ max: 500 }));

const arbItemState = fc.record({
  meta: fc.record({
    name: fc.string({ minLength: 1, maxLength: 20 }),
    unit: fc.constantFrom('kg', 'box', 'L'),
    category: fc.constantFrom('food', 'water', 'medicine', 'shelter', 'hygiene', 'other' as const),
    createdBy: arbNodeId,
    createdAt: arbLamport,
  }),
  ledger: fc.record({ p: arbNatMap, n: arbNatMap }),
  quota: fc.record({
    R: fc.dictionary(arbNodeId, arbNatMap),
    U: arbNatMap,
    O: arbNatMap,
  }),
  touchedAt: arbLamport,
});

const arbState: fc.Arbitrary<ResilioState> = fc.record({
  schemaVersion: fc.constant(SCHEMA_VERSION),
  items: fc.dictionary(fc.stringMatching(/^[a-z0-9]{1,8}-[0-9]{1,3}-[a-z0-9]{4,8}$/), arbItemState),
  distributionLog: fc.record({
    adds: fc.dictionary(
      arbTag,
      fc.record({
        kind: fc.constantFrom('receive', 'issue', 'override_issue' as const),
        itemId: fc.constant('rice-1-aaaa1111'),
        qty: fc.integer({ min: 1, max: 50 }),
        by: arbNodeId,
        ts: arbLamport,
      }),
    ),
    removed: fc.array(arbTag, { maxLength: 10 }),
  }),
  topUpQueue: fc.record({
    adds: fc.dictionary(
      arbTag,
      fc.record({
        itemId: fc.constant('rice-1-aaaa1111'),
        requester: arbNodeId,
        ts: arbLamport,
      }),
    ),
    removed: fc.array(arbTag, { maxLength: 10 }),
  }),
});

describe('canonicalize', () => {
  it('sorts object keys, deduplicates and sorts removed arrays, and does not mutate input', () => {
    const raw: ResilioState = deepFreeze({
      topUpQueue: {
        removed: ['bbbb2222:3', 'aaaa1111:1', 'bbbb2222:3'],
        adds: {
          'bbbb2222:2': { ts: { n: 'bbbb2222', c: 2 }, requester: 'bbbb2222', itemId: 'water-1-aaaa1111' },
          'aaaa1111:1': { ts: { n: 'aaaa1111', c: 1 }, requester: 'aaaa1111', itemId: 'rice-1-aaaa1111' },
        },
      },
      distributionLog: {
        removed: ['cccc3333:5', 'aaaa1111:2', 'cccc3333:5'],
        adds: {},
      },
      items: {
        'zeta-1-aaaa1111': {
          touchedAt: { n: 'aaaa1111', c: 1 },
          quota: { O: {}, U: { bbbb2222: 1, aaaa1111: 2 }, R: { bbbb2222: {}, aaaa1111: {} } },
          ledger: { n: { bbbb2222: 1, aaaa1111: 2 }, p: { bbbb2222: 5, aaaa1111: 10 } },
          meta: {
            createdAt: { n: 'aaaa1111', c: 1 },
            createdBy: 'aaaa1111',
            category: 'food',
            unit: 'kg',
            name: 'Zeta',
          },
        },
        'alpha-1-aaaa1111': {
          touchedAt: { n: 'aaaa1111', c: 1 },
          quota: { O: {}, U: {}, R: {} },
          ledger: { n: {}, p: {} },
          meta: {
            createdAt: { n: 'aaaa1111', c: 1 },
            createdBy: 'aaaa1111',
            category: 'water',
            unit: 'L',
            name: 'Alpha',
          },
        },
      },
      schemaVersion: 1,
    });

    const c = canonicalize(raw);
    expect(Object.keys(c)).toEqual(['distributionLog', 'items', 'schemaVersion', 'topUpQueue']);
    expect(Object.keys(c.items)).toEqual(['alpha-1-aaaa1111', 'zeta-1-aaaa1111']);
    expect(Object.keys(c.topUpQueue.adds)).toEqual(['aaaa1111:1', 'bbbb2222:2']);
    expect(c.topUpQueue.removed).toEqual(['aaaa1111:1', 'bbbb2222:3']);
    expect(c.distributionLog.removed).toEqual(['aaaa1111:2', 'cccc3333:5']);
    expect(Object.keys(c.items['zeta-1-aaaa1111']!.ledger.p)).toEqual(['aaaa1111', 'bbbb2222']);
  });

  it('property: canonicalize is idempotent and does not mutate frozen inputs', () => {
    fc.assert(
      fc.property(arbState, (state) => {
        const frozen = deepFreeze(state);
        const once = canonicalize(frozen);
        const twice = canonicalize(once);
        expect(JSON.stringify(twice)).toBe(JSON.stringify(once));
        expect(twice).toEqual(once);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
