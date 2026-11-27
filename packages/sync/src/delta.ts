import {
  mergeIntoReplica,
  parseTag,
  type ItemId,
  type ItemState,
  type ORSet,
  type Replica,
  type ResilioState,
  type Tag,
} from '@resiliolog/crdt-core';

function filterORSetSince<T>(set: ORSet<T>, since: number): ORSet<T> {
  const adds: Record<Tag, T> = {};
  for (const tag of Object.keys(set.adds)) {
    const { c } = parseTag(tag);
    if (c > since) {
      const el = set.adds[tag];
      if (el !== undefined) {
        adds[tag] = el;
      }
    }
  }
  // Include all removed tags so void/resolve operations on older entries still propagate safely.
  return {
    adds,
    removed: [...set.removed],
  };
}

/** Item-granular delta: items with touchedAt.c > since, log/queue entries with tag counter > since. */
export function makeDelta(replica: Replica, since: number): ResilioState {
  const items: Record<ItemId, ItemState> = {};
  for (const itemId of Object.keys(replica.state.items)) {
    const item = replica.state.items[itemId];
    if (item !== undefined && item.touchedAt.c > since) {
      items[itemId] = item;
    }
  }

  return {
    schemaVersion: replica.state.schemaVersion,
    items,
    distributionLog: filterORSetSince(replica.state.distributionLog, since),
    topUpQueue: filterORSetSince(replica.state.topUpQueue, since),
  };
}

export function applyDelta(replica: Replica, delta: ResilioState, remoteClock: number): Replica {
  return mergeIntoReplica(replica, delta, remoteClock);
}
