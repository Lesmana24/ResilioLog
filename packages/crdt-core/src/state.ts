import { bcMerge } from './bounded-counter';
import { compareLamport, maxLamport, receive } from './lamport';
import { orsEmpty, orsMerge } from './or-set';
import { pnMerge } from './pn-counter';
import {
  SCHEMA_VERSION,
  type ItemId,
  type ItemState,
  type Replica,
  type ResilioState,
} from './types';

export function emptyState(): ResilioState {
  return {
    schemaVersion: SCHEMA_VERSION,
    items: {},
    distributionLog: orsEmpty(),
    topUpQueue: orsEmpty(),
  };
}

function mergeItemStates(a: ItemState, b: ItemState): ItemState {
  const meta =
    compareLamport(a.meta.createdAt, b.meta.createdAt) <= 0 ? a.meta : b.meta;
  return {
    meta,
    ledger: pnMerge(a.ledger, b.ledger),
    quota: bcMerge(a.quota, b.quota),
    touchedAt: maxLamport(a.touchedAt, b.touchedAt),
  };
}

export function mergeStates(a: ResilioState, b: ResilioState): ResilioState {
  if (a.schemaVersion !== b.schemaVersion) {
    throw new Error(
      `SCHEMA_MISMATCH: cannot merge schemaVersion ${a.schemaVersion} with ${b.schemaVersion}`,
    );
  }

  const items: Record<ItemId, ItemState> = {};
  for (const id of Object.keys(a.items)) {
    const item = a.items[id];
    if (item !== undefined) {
      items[id] = item;
    }
  }
  for (const id of Object.keys(b.items)) {
    const bItem = b.items[id];
    if (bItem !== undefined) {
      const aItem = items[id];
      items[id] = aItem !== undefined ? mergeItemStates(aItem, bItem) : bItem;
    }
  }

  return {
    schemaVersion: a.schemaVersion,
    items,
    distributionLog: orsMerge(a.distributionLog, b.distributionLog),
    topUpQueue: orsMerge(a.topUpQueue, b.topUpQueue),
  };
}

/** clock = receive(local.clock, remoteClock) */
export function mergeIntoReplica(
  r: Replica,
  remote: ResilioState,
  remoteClock: number,
): Replica {
  return {
    nodeId: r.nodeId,
    clock: receive(r.clock, remoteClock),
    state: mergeStates(r.state, remote),
  };
}
