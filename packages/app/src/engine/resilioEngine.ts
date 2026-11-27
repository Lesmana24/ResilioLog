/**
 * Role C engine bridge wired directly to the real @resiliolog/crdt-core and @resiliolog/sync packages.
 */
import {
  bcTransfer,
  err,
  makeLamport,
  ok,
  orsAdd,
  orsElements,
  tagOf,
  tick,
  type ItemId,
  type NodeId,
  type Replica,
  type Result,
} from '@resiliolog/crdt-core';

export {
  SCHEMA_VERSION,
  TOP_UP_THRESHOLD,
  ok,
  err,
  createReplica,
  createItem,
  receiveGoods,
  issue,
  transferRights,
  emergencyIssue,
  voidLogEntry,
  resolveTopUp,
  itemSummary,
  emptyState,
  mergeStates,
  mergeIntoReplica,
  orsEmpty,
  orsAdd,
  orsRemove,
  orsElements,
  orsMerge,
  pnEmpty,
  pnInc,
  pnDec,
  pnValue,
  pnMerge,
  bcEmpty,
  bcIncrement,
  bcGranted,
  bcLocalRights,
  bcRemainingRatio,
  bcConsume,
  bcTransfer,
  bcOverrideConsume,
  bcValue,
  bcMerge,
  compareLamport,
  tagOf,
  parseTag,
  tick,
  receive,
  maxLamport,
  makeLamport,
  canonicalize,
} from '@resiliolog/crdt-core';

export {
  DEFAULT_CHUNK_SIZE,
  SyncError,
  makeDelta,
  applyDelta,
  buildEnvelope,
  encodeEnvelope,
  decodeEnvelope,
  encodeSignalEnvelope,
  decodeSignalEnvelope,
  chunkBlob,
  ChunkCollector,
  canonicalJson,
  crc32Hex,
} from '@resiliolog/sync';

/** Enqueue a manual deduped TopUpRequest using real crdt-core OR-Set & Lamport primitives. */
export function requestTopUpManual(r: Replica, itemId: ItemId): Result<Replica> {
  const existing = r.state.items[itemId];
  if (!existing) return err('UNKNOWN_ITEM');

  const alreadyOpen = orsElements(r.state.topUpQueue).some(
    ({ el }) => el.itemId === itemId && el.requester === r.nodeId,
  );
  if (alreadyOpen) return ok(r);

  const c = tick(r.clock);
  const ts = makeLamport(c, r.nodeId);
  return ok({
    nodeId: r.nodeId,
    clock: c,
    state: {
      ...r.state,
      topUpQueue: orsAdd(r.state.topUpQueue, tagOf(ts), {
        itemId,
        requester: r.nodeId,
        ts,
      }),
    },
  });
}

/** Coordinator helper to transfer Bounded Counter rights from a surplus donor node (e.g. poskob07). */
export function transferRightsFromDonor(
  r: Replica,
  itemId: ItemId,
  from: NodeId,
  to: NodeId,
  qty: number,
): Result<Replica> {
  if (!Number.isSafeInteger(qty) || qty < 1) return err('INVALID_QTY');
  if (from === to) return err('SELF_TRANSFER');
  const existing = r.state.items[itemId];
  if (!existing) return err('UNKNOWN_ITEM');

  const transferred = bcTransfer(existing.quota, from, to, qty);
  if (!transferred.ok) return transferred;

  const c = tick(r.clock);
  const ts = makeLamport(c, r.nodeId);
  return ok({
    nodeId: r.nodeId,
    clock: c,
    state: {
      ...r.state,
      items: {
        ...r.state.items,
        [itemId]: {
          ...existing,
          quota: transferred.value,
          touchedAt: ts,
        },
      },
    },
  });
}
