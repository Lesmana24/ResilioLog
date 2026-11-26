import fc from 'fast-check';
import { bcEmpty } from '../../src/bounded-counter';
import { makeLamport, tagOf, tick } from '../../src/lamport';
import { orsAdd, orsElements, orsRemove } from '../../src/or-set';
import { pnDec, pnEmpty, pnInc } from '../../src/pn-counter';
import { emptyState, mergeStates } from '../../src/state';
import type {
  BoundedCounter,
  Category,
  ItemId,
  ItemState,
  NodeId,
  ResilioState,
} from '../../src/types';

// Fast-check generators that build reachable states from low-level operations on 2-3 replicas.
export const NODE_IDS = ['aaaa1111', 'bbbb2222', 'cccc3333'] as const;

const CATEGORIES: readonly Category[] = [
  'food',
  'water',
  'medicine',
  'shelter',
  'hygiene',
  'other',
];

const ITEM_SEEDS = [
  { slug: 'rice', name: 'Rice', unit: 'kg', category: 'food' as const },
  { slug: 'water', name: 'Water', unit: 'L', category: 'water' as const },
  { slug: 'meds', name: 'First Aid', unit: 'box', category: 'medicine' as const },
];

type LowLevelStep =
  | { kind: 'createItem'; replica: number; seedIdx: number; qty: number }
  | { kind: 'inc'; replica: number; itemPick: number; qty: number }
  | { kind: 'dec'; replica: number; itemPick: number; qty: number; override: boolean }
  | { kind: 'voidLog'; replica: number; pick: number }
  | { kind: 'addTopUp'; replica: number; itemPick: number }
  | { kind: 'resolveTopUp'; replica: number; pick: number }
  | { kind: 'sync'; from: number; to: number };

const arbLowLevelSteps = fc.array(
  fc.oneof(
    fc.record({
      kind: fc.constant('createItem' as const),
      replica: fc.integer({ min: 0, max: 2 }),
      seedIdx: fc.integer({ min: 0, max: ITEM_SEEDS.length - 1 }),
      qty: fc.integer({ min: 1, max: 50 }),
    }),
    fc.record({
      kind: fc.constant('inc' as const),
      replica: fc.integer({ min: 0, max: 2 }),
      itemPick: fc.nat({ max: 10 }),
      qty: fc.integer({ min: 1, max: 50 }),
    }),
    fc.record({
      kind: fc.constant('dec' as const),
      replica: fc.integer({ min: 0, max: 2 }),
      itemPick: fc.nat({ max: 10 }),
      qty: fc.integer({ min: 1, max: 20 }),
      override: fc.boolean(),
    }),
    fc.record({
      kind: fc.constant('voidLog' as const),
      replica: fc.integer({ min: 0, max: 2 }),
      pick: fc.nat({ max: 20 }),
    }),
    fc.record({
      kind: fc.constant('addTopUp' as const),
      replica: fc.integer({ min: 0, max: 2 }),
      itemPick: fc.nat({ max: 10 }),
    }),
    fc.record({
      kind: fc.constant('resolveTopUp' as const),
      replica: fc.integer({ min: 0, max: 2 }),
      pick: fc.nat({ max: 20 }),
    }),
    fc.record({
      kind: fc.constant('sync' as const),
      from: fc.integer({ min: 0, max: 2 }),
      to: fc.integer({ min: 0, max: 2 }),
    }),
  ),
  { minLength: 1, maxLength: 35 },
);

function directIncrementQuota(
  quota: BoundedCounter,
  nodeId: NodeId,
  field: 'R' | 'U' | 'O',
  qty: number,
): BoundedCounter {
  if (field === 'R') {
    const prevRow = quota.R[nodeId] ?? {};
    return {
      ...quota,
      R: { ...quota.R, [nodeId]: { ...prevRow, [nodeId]: (prevRow[nodeId] ?? 0) + qty } },
    };
  }
  if (field === 'U') {
    return {
      ...quota,
      U: { ...quota.U, [nodeId]: (quota.U[nodeId] ?? 0) + qty },
    };
  }
  return {
    ...quota,
    O: { ...quota.O, [nodeId]: (quota.O[nodeId] ?? 0) + qty },
  };
}

function buildThreeStates(
  steps: readonly LowLevelStep[],
): [ResilioState, ResilioState, ResilioState] {
  const states: [ResilioState, ResilioState, ResilioState] = [
    emptyState(),
    emptyState(),
    emptyState(),
  ];
  const clocks = [0, 0, 0];

  for (const step of steps) {
    if (step.kind === 'sync') {
      states[step.to] = mergeStates(states[step.to]!, states[step.from]!);
      continue;
    }

    const rIdx = step.replica;
    const nodeId = NODE_IDS[rIdx]!;
    const state = states[rIdx]!;

    if (step.kind === 'createItem') {
      const c = tick(clocks[rIdx]!);
      clocks[rIdx] = c;
      const ts = makeLamport(c, nodeId);
      const seed = ITEM_SEEDS[step.seedIdx]!;
      const itemId: ItemId = `${seed.slug}-${c}-${nodeId}`;
      const newItem: ItemState = {
        meta: {
          name: seed.name,
          unit: seed.unit,
          category: CATEGORIES[step.seedIdx % CATEGORIES.length]!,
          createdBy: nodeId,
          createdAt: ts,
        },
        ledger: pnInc(pnEmpty(), nodeId, step.qty),
        quota: directIncrementQuota(bcEmpty(), nodeId, 'R', step.qty),
        touchedAt: ts,
      };
      states[rIdx] = {
        ...state,
        items: { ...state.items, [itemId]: newItem },
        distributionLog: orsAdd(state.distributionLog, tagOf(ts), {
          kind: 'receive',
          itemId,
          qty: step.qty,
          by: nodeId,
          ts,
        }),
      };
      continue;
    }

    const itemIds = Object.keys(state.items);
    if (step.kind === 'inc' && itemIds.length > 0) {
      const itemId = itemIds[step.itemPick % itemIds.length]!;
      const item = state.items[itemId]!;
      const c = tick(clocks[rIdx]!);
      clocks[rIdx] = c;
      const ts = makeLamport(c, nodeId);
      states[rIdx] = {
        ...state,
        items: {
          ...state.items,
          [itemId]: {
            ...item,
            ledger: pnInc(item.ledger, nodeId, step.qty),
            quota: directIncrementQuota(item.quota, nodeId, 'R', step.qty),
            touchedAt: ts,
          },
        },
        distributionLog: orsAdd(state.distributionLog, tagOf(ts), {
          kind: 'receive',
          itemId,
          qty: step.qty,
          by: nodeId,
          ts,
        }),
      };
    } else if (step.kind === 'dec' && itemIds.length > 0) {
      const itemId = itemIds[step.itemPick % itemIds.length]!;
      const item = state.items[itemId]!;
      const c = tick(clocks[rIdx]!);
      clocks[rIdx] = c;
      const ts = makeLamport(c, nodeId);
      states[rIdx] = {
        ...state,
        items: {
          ...state.items,
          [itemId]: {
            ...item,
            ledger: pnDec(item.ledger, nodeId, step.qty),
            quota: directIncrementQuota(item.quota, nodeId, step.override ? 'O' : 'U', step.qty),
            touchedAt: ts,
          },
        },
        distributionLog: orsAdd(state.distributionLog, tagOf(ts), {
          kind: step.override ? 'override_issue' : 'issue',
          itemId,
          qty: step.qty,
          by: nodeId,
          ts,
          ...(step.override ? { reason: 'emergency test' } : {}),
        }),
      };
    } else if (step.kind === 'voidLog') {
      const active = orsElements(state.distributionLog);
      if (active.length > 0) {
        const target = active[step.pick % active.length]!;
        states[rIdx] = {
          ...state,
          distributionLog: orsRemove(state.distributionLog, [target.tag]),
        };
      }
    } else if (step.kind === 'addTopUp' && itemIds.length > 0) {
      const itemId = itemIds[step.itemPick % itemIds.length]!;
      const c = tick(clocks[rIdx]!);
      clocks[rIdx] = c;
      const ts = makeLamport(c, nodeId);
      states[rIdx] = {
        ...state,
        topUpQueue: orsAdd(state.topUpQueue, tagOf(ts), {
          itemId,
          requester: nodeId,
          ts,
        }),
      };
    } else if (step.kind === 'resolveTopUp') {
      const active = orsElements(state.topUpQueue);
      if (active.length > 0) {
        const target = active[step.pick % active.length]!;
        states[rIdx] = {
          ...state,
          topUpQueue: orsRemove(state.topUpQueue, [target.tag]),
        };
      }
    }
  }

  return states;
}

export const arbReachableStates: fc.Arbitrary<[ResilioState, ResilioState, ResilioState]> =
  arbLowLevelSteps.map(buildThreeStates);
