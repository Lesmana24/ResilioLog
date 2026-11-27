import fc from 'fast-check';
import {
  createItem,
  createReplica,
  emergencyIssue,
  issue,
  receiveGoods,
  resolveTopUp,
  transferRights,
  voidLogEntry,
} from '../../src/ops';
import { orsElements } from '../../src/or-set';
import { mergeIntoReplica } from '../../src/state';
import type { Category, ItemId, Replica, ResilioState } from '../../src/types';

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
  { name: 'Rice', unit: 'kg', category: 'food' as const },
  { name: 'Water', unit: 'L', category: 'water' as const },
  { name: 'First Aid', unit: 'box', category: 'medicine' as const },
];

export type RealOpStep =
  | { kind: 'createItem'; replica: number; seedIdx: number; initialQty: number }
  | { kind: 'receiveGoods'; replica: number; itemPick: number; qty: number }
  | { kind: 'issue'; replica: number; itemPick: number; qty: number }
  | { kind: 'transferRights'; from: number; to: number; itemPick: number; qty: number }
  | { kind: 'emergencyIssue'; replica: number; itemPick: number; qty: number }
  | { kind: 'voidLogEntry'; replica: number; pick: number }
  | { kind: 'resolveTopUp'; replica: number; pick: number }
  | { kind: 'sync'; from: number; to: number };

export interface ScenarioResult {
  readonly replicas: readonly [Replica, Replica, Replica];
  readonly expectedIn: Readonly<Record<ItemId, number>>;
  readonly expectedOut: Readonly<Record<ItemId, number>>;
}

export function arbRealOpSteps(allowOverride: boolean): fc.Arbitrary<readonly RealOpStep[]> {
  return fc.array(
    fc.oneof(
      fc.record({
        kind: fc.constant('createItem' as const),
        replica: fc.integer({ min: 0, max: 2 }),
        seedIdx: fc.integer({ min: 0, max: ITEM_SEEDS.length - 1 }),
        initialQty: fc.integer({ min: 0, max: 50 }),
      }),
      fc.record({
        kind: fc.constant('receiveGoods' as const),
        replica: fc.integer({ min: 0, max: 2 }),
        itemPick: fc.nat({ max: 10 }),
        qty: fc.integer({ min: 1, max: 50 }),
      }),
      fc.record({
        kind: fc.constant('issue' as const),
        replica: fc.integer({ min: 0, max: 2 }),
        itemPick: fc.nat({ max: 10 }),
        qty: fc.integer({ min: 1, max: 50 }),
      }),
      fc.record({
        kind: fc.constant('transferRights' as const),
        from: fc.integer({ min: 0, max: 2 }),
        to: fc.integer({ min: 0, max: 2 }),
        itemPick: fc.nat({ max: 10 }),
        qty: fc.integer({ min: 1, max: 50 }),
      }),
      ...(allowOverride
        ? [
            fc.record({
              kind: fc.constant('emergencyIssue' as const),
              replica: fc.integer({ min: 0, max: 2 }),
              itemPick: fc.nat({ max: 10 }),
              qty: fc.integer({ min: 1, max: 30 }),
            }),
          ]
        : []),
      fc.record({
        kind: fc.constant('voidLogEntry' as const),
        replica: fc.integer({ min: 0, max: 2 }),
        pick: fc.nat({ max: 20 }),
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
}

export function runScenario(steps: readonly RealOpStep[]): ScenarioResult {
  const replicas: [Replica, Replica, Replica] = [
    createReplica(NODE_IDS[0]),
    createReplica(NODE_IDS[1]),
    createReplica(NODE_IDS[2]),
  ];
  const expectedIn: Record<ItemId, number> = {};
  const expectedOut: Record<ItemId, number> = {};

  for (const step of steps) {
    if (step.kind === 'sync') {
      const source = replicas[step.from]!;
      const target = replicas[step.to]!;
      replicas[step.to] = mergeIntoReplica(target, source.state, source.clock);
      continue;
    }

    if (step.kind === 'createItem') {
      const r = replicas[step.replica]!;
      const seed = ITEM_SEEDS[step.seedIdx]!;
      const res = createItem(r, {
        name: seed.name,
        unit: seed.unit,
        category: CATEGORIES[step.seedIdx % CATEGORIES.length]!,
        initialQty: step.initialQty,
      });
      if (res.ok) {
        replicas[step.replica] = res.value.replica;
        expectedIn[res.value.itemId] = (expectedIn[res.value.itemId] ?? 0) + step.initialQty;
        expectedOut[res.value.itemId] = expectedOut[res.value.itemId] ?? 0;
      }
      continue;
    }

    if (step.kind === 'transferRights') {
      const r = replicas[step.from]!;
      const itemIds = Object.keys(r.state.items);
      if (itemIds.length === 0) continue;
      const itemId = itemIds[step.itemPick % itemIds.length]!;
      const res = transferRights(r, itemId, NODE_IDS[step.to]!, step.qty);
      if (res.ok) {
        replicas[step.from] = res.value;
      }
      continue;
    }

    const r = replicas[step.replica]!;
    if (step.kind === 'voidLogEntry') {
      const active = orsElements(r.state.distributionLog);
      if (active.length === 0) continue;
      const target = active[step.pick % active.length]!;
      const res = voidLogEntry(r, target.tag);
      if (res.ok) {
        replicas[step.replica] = res.value;
      }
      continue;
    }

    if (step.kind === 'resolveTopUp') {
      const active = orsElements(r.state.topUpQueue);
      if (active.length === 0) continue;
      const target = active[step.pick % active.length]!;
      const res = resolveTopUp(r, target.tag);
      if (res.ok) {
        replicas[step.replica] = res.value;
      }
      continue;
    }

    const itemIds = Object.keys(r.state.items);
    if (itemIds.length === 0) continue;
    const itemId = itemIds[step.itemPick % itemIds.length]!;

    if (step.kind === 'receiveGoods') {
      const res = receiveGoods(r, itemId, step.qty);
      if (res.ok) {
        replicas[step.replica] = res.value;
        expectedIn[itemId] = (expectedIn[itemId] ?? 0) + step.qty;
      }
    } else if (step.kind === 'issue') {
      const res = issue(r, itemId, step.qty);
      if (res.ok) {
        replicas[step.replica] = res.value;
        expectedOut[itemId] = (expectedOut[itemId] ?? 0) + step.qty;
      }
    } else if (step.kind === 'emergencyIssue') {
      const res = emergencyIssue(r, itemId, step.qty, { reason: 'Emergency triage' });
      if (res.ok) {
        replicas[step.replica] = res.value;
        expectedOut[itemId] = (expectedOut[itemId] ?? 0) + step.qty;
      }
    }
  }

  return { replicas, expectedIn, expectedOut };
}

export const arbReachableScenario: fc.Arbitrary<ScenarioResult> =
  arbRealOpSteps(true).map(runScenario);

export const arbNoOverrideScenario: fc.Arbitrary<ScenarioResult> =
  arbRealOpSteps(false).map(runScenario);

export const arbReachableStates: fc.Arbitrary<[ResilioState, ResilioState, ResilioState]> =
  arbReachableScenario.map((s) => [s.replicas[0].state, s.replicas[1].state, s.replicas[2].state]);
