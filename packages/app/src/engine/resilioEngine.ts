/**
 * Swappable Role C fallback adapter mirroring @resiliolog/crdt-core and @resiliolog/sync.
 * Once Role B finishes implementing those packages, imports can be pointed straight to them.
 */
import {
  SCHEMA_VERSION,
  TOP_UP_THRESHOLD,
  ok,
  err,
  type BoundedCounter,
  type CreateItemArgs,
  type DistributionEntry,
  type ItemId,
  type ItemState,
  type ItemSummary,
  type Lamport,
  type NatMap,
  type NodeId,
  type ORSet,
  type OpMeta,
  type PNCounter,
  type Replica,
  type ResilioState,
  type Result,
  type Tag,
  type TopUpRequest,
} from '@resiliolog/crdt-core';
import {
  DEFAULT_CHUNK_SIZE,
  SyncError,
  type ChunkProgress,
  type SyncEnvelopeLike,
} from '@resiliolog/sync';

export { SCHEMA_VERSION, TOP_UP_THRESHOLD, DEFAULT_CHUNK_SIZE };

// ── Lamport & Tag Helpers ─────────────────────────────────────────────────────

export function tick(clock: number): number {
  return clock + 1;
}

export function receive(local: number, remote: number): number {
  return Math.max(local, remote) + 1;
}

export function makeLamport(c: number, n: NodeId): Lamport {
  return { c, n };
}

export function compareLamport(a: Lamport, b: Lamport): number {
  if (a.c !== b.c) return a.c - b.c;
  return a.n < b.n ? -1 : a.n > b.n ? 1 : 0;
}

export function maxLamport(a: Lamport, b: Lamport): Lamport {
  return compareLamport(a, b) >= 0 ? a : b;
}

export function tagOf(l: Lamport): Tag {
  return `${l.n}:${l.c}`;
}

export function parseTag(tag: Tag): Lamport {
  const idx = tag.lastIndexOf(':');
  if (idx <= 0) return { c: 0, n: tag };
  const n = tag.slice(0, idx);
  const c = Number.parseInt(tag.slice(idx + 1), 10);
  return { c: Number.isFinite(c) ? c : 0, n };
}

// ── PN-Counter ────────────────────────────────────────────────────────────────

export function pnEmpty(): PNCounter {
  return { p: {}, n: {} };
}

export function pnInc(counter: PNCounter, node: NodeId, k: number): PNCounter {
  const prev = counter.p[node] ?? 0;
  return {
    p: { ...counter.p, [node]: prev + k },
    n: counter.n,
  };
}

export function pnDec(counter: PNCounter, node: NodeId, k: number): PNCounter {
  const prev = counter.n[node] ?? 0;
  return {
    p: counter.p,
    n: { ...counter.n, [node]: prev + k },
  };
}

function sumNatMap(m: NatMap): number {
  let total = 0;
  for (const val of Object.values(m)) {
    total += val;
  }
  return total;
}

export function pnValue(counter: PNCounter): number {
  return sumNatMap(counter.p) - sumNatMap(counter.n);
}

function mergeNatMaps(a: NatMap, b: NatMap): NatMap {
  const out: Record<NodeId, number> = { ...a };
  for (const [k, v] of Object.entries(b)) {
    const cur = out[k] ?? 0;
    if (v > cur) out[k] = v;
  }
  return out;
}

export function pnMerge(a: PNCounter, b: PNCounter): PNCounter {
  return {
    p: mergeNatMaps(a.p, b.p),
    n: mergeNatMaps(a.n, b.n),
  };
}

// ── OR-Set ────────────────────────────────────────────────────────────────────

export function orsEmpty<T>(): ORSet<T> {
  return { adds: {}, removed: [] };
}

export function orsAdd<T>(s: ORSet<T>, tag: Tag, el: T): ORSet<T> {
  return {
    adds: { ...s.adds, [tag]: el },
    removed: s.removed,
  };
}

export function orsRemove<T>(s: ORSet<T>, tags: readonly Tag[]): ORSet<T> {
  const set = new Set<Tag>(s.removed);
  for (const t of tags) {
    set.add(t);
  }
  return {
    adds: s.adds,
    removed: Array.from(set).sort(),
  };
}

export function orsElements<T>(s: ORSet<T>): ReadonlyArray<{ tag: Tag; el: T }> {
  const removed = new Set(s.removed);
  const active: Array<{ tag: Tag; el: T }> = [];
  for (const [tag, el] of Object.entries(s.adds)) {
    if (!removed.has(tag)) {
      active.push({ tag, el });
    }
  }
  active.sort((x, y) => compareLamport(parseTag(x.tag), parseTag(y.tag)));
  return active;
}

export function orsMerge<T>(a: ORSet<T>, b: ORSet<T>): ORSet<T> {
  const adds: Record<Tag, T> = { ...a.adds, ...b.adds };
  const removed = Array.from(new Set([...a.removed, ...b.removed])).sort();
  return { adds, removed };
}

// ── Bounded Counter ───────────────────────────────────────────────────────────

export function bcEmpty(): BoundedCounter {
  return { R: {}, U: {}, O: {} };
}

export function bcIncrement(s: BoundedCounter, i: NodeId, k: number): BoundedCounter {
  const row = s.R[i] ?? {};
  const prev = row[i] ?? 0;
  return {
    ...s,
    R: {
      ...s.R,
      [i]: { ...row, [i]: prev + k },
    },
  };
}

export function bcGranted(s: BoundedCounter, i: NodeId): number {
  let total = s.R[i]?.[i] ?? 0;
  for (const [other, row] of Object.entries(s.R)) {
    if (other !== i) {
      total += row[i] ?? 0;
    }
  }
  return total;
}

export function bcLocalRights(s: BoundedCounter, i: NodeId): number {
  const granted = bcGranted(s, i);
  const row = s.R[i] ?? {};
  let transferredOut = 0;
  for (const [target, val] of Object.entries(row)) {
    if (target !== i) transferredOut += val;
  }
  const used = s.U[i] ?? 0;
  return Math.max(0, granted - transferredOut - used);
}

export function bcRemainingRatio(s: BoundedCounter, i: NodeId): number {
  const granted = bcGranted(s, i);
  if (granted <= 0) return 0;
  return bcLocalRights(s, i) / granted;
}

export function bcValue(s: BoundedCounter): number {
  let totalR = 0;
  for (const [from, row] of Object.entries(s.R)) {
    totalR += row[from] ?? 0;
  }
  return totalR - sumNatMap(s.U) - sumNatMap(s.O);
}

export function bcMerge(a: BoundedCounter, b: BoundedCounter): BoundedCounter {
  const mergedR: Record<NodeId, NatMap> = {};
  const keys = new Set([...Object.keys(a.R), ...Object.keys(b.R)]);
  for (const k of keys) {
    mergedR[k] = mergeNatMaps(a.R[k] ?? {}, b.R[k] ?? {});
  }
  return {
    R: mergedR,
    U: mergeNatMaps(a.U, b.U),
    O: mergeNatMaps(a.O, b.O),
  };
}

export function bcConsume(
  s: BoundedCounter,
  i: NodeId,
  n: number,
): Result<BoundedCounter, 'INVALID_QTY' | 'INSUFFICIENT_RIGHTS'> {
  if (!Number.isInteger(n) || n < 1) return err('INVALID_QTY');
  if (bcLocalRights(s, i) < n) return err('INSUFFICIENT_RIGHTS');
  const prev = s.U[i] ?? 0;
  return ok({
    ...s,
    U: { ...s.U, [i]: prev + n },
  });
}

export function bcTransfer(
  s: BoundedCounter,
  i: NodeId,
  j: NodeId,
  m: number,
): Result<BoundedCounter, 'INVALID_QTY' | 'INSUFFICIENT_RIGHTS' | 'SELF_TRANSFER'> {
  if (!Number.isInteger(m) || m < 1) return err('INVALID_QTY');
  if (i === j) return err('SELF_TRANSFER');
  if (bcLocalRights(s, i) < m) return err('INSUFFICIENT_RIGHTS');
  const row = s.R[i] ?? {};
  const prev = row[j] ?? 0;
  return ok({
    ...s,
    R: {
      ...s.R,
      [i]: { ...row, [j]: prev + m },
    },
  });
}

export function bcOverrideConsume(
  s: BoundedCounter,
  i: NodeId,
  n: number,
): Result<BoundedCounter, 'INVALID_QTY'> {
  if (!Number.isInteger(n) || n < 1) return err('INVALID_QTY');
  const prev = s.O[i] ?? 0;
  return ok({
    ...s,
    O: { ...s.O, [i]: prev + n },
  });
}

// ── State Merge ───────────────────────────────────────────────────────────────

export function emptyState(): ResilioState {
  return {
    schemaVersion: SCHEMA_VERSION,
    items: {},
    distributionLog: orsEmpty<DistributionEntry>(),
    topUpQueue: orsEmpty<TopUpRequest>(),
  };
}

export function createReplica(nodeId: NodeId): Replica {
  return {
    nodeId,
    clock: 0,
    state: emptyState(),
  };
}

function mergeItemState(a: ItemState, b: ItemState): ItemState {
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
  const itemIds = new Set([...Object.keys(a.items), ...Object.keys(b.items)]);
  const items: Record<ItemId, ItemState> = {};
  for (const id of itemIds) {
    const ia = a.items[id];
    const ib = b.items[id];
    if (ia && ib) items[id] = mergeItemState(ia, ib);
    else if (ia) items[id] = ia;
    else if (ib) items[id] = ib;
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    items,
    distributionLog: orsMerge(a.distributionLog, b.distributionLog),
    topUpQueue: orsMerge(a.topUpQueue, b.topUpQueue),
  };
}

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

// ── Item Operations (B-09 / B-10 contract) ───────────────────────────────────

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24) || 'item'
  );
}

function hasOpenTopUp(state: ResilioState, itemId: ItemId, requester: NodeId): boolean {
  return orsElements(state.topUpQueue).some(
    ({ el }) => el.itemId === itemId && el.requester === requester,
  );
}

export function createItem(
  r: Replica,
  args: CreateItemArgs,
): Result<{ replica: Replica; itemId: ItemId }> {
  if (!Number.isInteger(args.initialQty) || args.initialQty < 0) {
    return err('INVALID_QTY');
  }
  const c = tick(r.clock);
  const ts = makeLamport(c, r.nodeId);
  const itemId = `${slugify(args.name)}-${c}-${r.nodeId}`;

  let ledger = pnEmpty();
  let quota = bcEmpty();
  let log = r.state.distributionLog;

  if (args.initialQty > 0) {
    ledger = pnInc(ledger, r.nodeId, args.initialQty);
    quota = bcIncrement(quota, r.nodeId, args.initialQty);
    const entry: DistributionEntry = {
      kind: 'receive',
      itemId,
      qty: args.initialQty,
      by: r.nodeId,
      ts,
      ...(args.wallTime !== undefined ? { wallTime: args.wallTime } : {}),
    };
    log = orsAdd(log, tagOf(ts), entry);
  }

  const item: ItemState = {
    meta: {
      name: args.name.trim() || itemId,
      unit: args.unit.trim() || 'Unit',
      category: args.category,
      createdBy: r.nodeId,
      createdAt: ts,
    },
    ledger,
    quota,
    touchedAt: ts,
  };

  return ok({
    itemId,
    replica: {
      nodeId: r.nodeId,
      clock: c,
      state: {
        ...r.state,
        items: { ...r.state.items, [itemId]: item },
        distributionLog: log,
      },
    },
  });
}

export function receiveGoods(
  r: Replica,
  itemId: ItemId,
  qty: number,
  meta?: OpMeta,
): Result<Replica> {
  if (!Number.isInteger(qty) || qty < 1) return err('INVALID_QTY');
  const existing = r.state.items[itemId];
  if (!existing) return err('UNKNOWN_ITEM');

  const c = tick(r.clock);
  const ts = makeLamport(c, r.nodeId);
  const entry: DistributionEntry = {
    kind: 'receive',
    itemId,
    qty,
    by: r.nodeId,
    ts,
    ...(meta?.wallTime !== undefined ? { wallTime: meta.wallTime } : {}),
    ...(meta?.counterparty !== undefined ? { counterparty: meta.counterparty } : {}),
    ...(meta?.note !== undefined ? { note: meta.note } : {}),
  };

  const updatedItem: ItemState = {
    ...existing,
    ledger: pnInc(existing.ledger, r.nodeId, qty),
    quota: bcIncrement(existing.quota, r.nodeId, qty),
    touchedAt: ts,
  };

  return ok({
    nodeId: r.nodeId,
    clock: c,
    state: {
      ...r.state,
      items: { ...r.state.items, [itemId]: updatedItem },
      distributionLog: orsAdd(r.state.distributionLog, tagOf(ts), entry),
    },
  });
}

export function issue(
  r: Replica,
  itemId: ItemId,
  qty: number,
  meta?: OpMeta,
): Result<Replica> {
  if (!Number.isInteger(qty) || qty < 1) return err('INVALID_QTY');
  const existing = r.state.items[itemId];
  if (!existing) return err('UNKNOWN_ITEM');

  const consumed = bcConsume(existing.quota, r.nodeId, qty);
  if (!consumed.ok) return consumed;

  const c = tick(r.clock);
  const ts = makeLamport(c, r.nodeId);
  const entry: DistributionEntry = {
    kind: 'issue',
    itemId,
    qty,
    by: r.nodeId,
    ts,
    ...(meta?.wallTime !== undefined ? { wallTime: meta.wallTime } : {}),
    ...(meta?.counterparty !== undefined ? { counterparty: meta.counterparty } : {}),
    ...(meta?.note !== undefined ? { note: meta.note } : {}),
  };

  const updatedItem: ItemState = {
    ...existing,
    ledger: pnDec(existing.ledger, r.nodeId, qty),
    quota: consumed.value,
    touchedAt: ts,
  };

  let nextQueue = r.state.topUpQueue;
  if (
    bcRemainingRatio(updatedItem.quota, r.nodeId) <= TOP_UP_THRESHOLD &&
    !hasOpenTopUp(r.state, itemId, r.nodeId)
  ) {
    const reqTs = makeLamport(c, r.nodeId);
    nextQueue = orsAdd(nextQueue, `${r.nodeId}:${c}:topup`, {
      itemId,
      requester: r.nodeId,
      ts: reqTs,
    });
  }

  return ok({
    nodeId: r.nodeId,
    clock: c,
    state: {
      ...r.state,
      items: { ...r.state.items, [itemId]: updatedItem },
      distributionLog: orsAdd(r.state.distributionLog, tagOf(ts), entry),
      topUpQueue: nextQueue,
    },
  });
}

export function requestTopUpManual(r: Replica, itemId: ItemId): Result<Replica> {
  const existing = r.state.items[itemId];
  if (!existing) return err('UNKNOWN_ITEM');
  if (hasOpenTopUp(r.state, itemId, r.nodeId)) {
    return ok(r);
  }
  const c = tick(r.clock);
  const ts = makeLamport(c, r.nodeId);
  const nextQueue = orsAdd(r.state.topUpQueue, tagOf(ts), {
    itemId,
    requester: r.nodeId,
    ts,
  });
  return ok({
    nodeId: r.nodeId,
    clock: c,
    state: {
      ...r.state,
      topUpQueue: nextQueue,
    },
  });
}

export function transferRights(
  r: Replica,
  itemId: ItemId,
  to: NodeId,
  qty: number,
  from: NodeId = r.nodeId,
): Result<Replica> {
  if (!Number.isInteger(qty) || qty < 1) return err('INVALID_QTY');
  if (from === to) return err('SELF_TRANSFER');
  const existing = r.state.items[itemId];
  if (!existing) return err('UNKNOWN_ITEM');

  const transferred = bcTransfer(existing.quota, from, to, qty);
  if (!transferred.ok) return transferred;

  const c = tick(r.clock);
  const ts = makeLamport(c, r.nodeId);
  const updatedItem: ItemState = {
    ...existing,
    quota: transferred.value,
    touchedAt: ts,
  };

  return ok({
    nodeId: r.nodeId,
    clock: c,
    state: {
      ...r.state,
      items: { ...r.state.items, [itemId]: updatedItem },
    },
  });
}

export function emergencyIssue(
  r: Replica,
  itemId: ItemId,
  qty: number,
  meta: OpMeta & { readonly reason: string },
): Result<Replica> {
  if (!Number.isInteger(qty) || qty < 1) return err('INVALID_QTY');
  if (meta.reason.trim().length === 0) return err('REASON_REQUIRED');
  const existing = r.state.items[itemId];
  if (!existing) return err('UNKNOWN_ITEM');

  const over = bcOverrideConsume(existing.quota, r.nodeId, qty);
  if (!over.ok) return over;

  const c = tick(r.clock);
  const ts = makeLamport(c, r.nodeId);
  const entry: DistributionEntry = {
    kind: 'override_issue',
    itemId,
    qty,
    by: r.nodeId,
    ts,
    reason: meta.reason.trim(),
    ...(meta.wallTime !== undefined ? { wallTime: meta.wallTime } : {}),
    ...(meta.counterparty !== undefined ? { counterparty: meta.counterparty } : {}),
    ...(meta.note !== undefined ? { note: meta.note } : {}),
  };

  const updatedItem: ItemState = {
    ...existing,
    ledger: pnDec(existing.ledger, r.nodeId, qty),
    quota: over.value,
    touchedAt: ts,
  };

  return ok({
    nodeId: r.nodeId,
    clock: c,
    state: {
      ...r.state,
      items: { ...r.state.items, [itemId]: updatedItem },
      distributionLog: orsAdd(r.state.distributionLog, tagOf(ts), entry),
    },
  });
}

export function voidLogEntry(r: Replica, tag: Tag): Result<Replica> {
  const c = tick(r.clock);
  return ok({
    nodeId: r.nodeId,
    clock: c,
    state: {
      ...r.state,
      distributionLog: orsRemove(r.state.distributionLog, [tag]),
    },
  });
}

export function resolveTopUp(r: Replica, tag: Tag): Result<Replica> {
  const c = tick(r.clock);
  return ok({
    nodeId: r.nodeId,
    clock: c,
    state: {
      ...r.state,
      topUpQueue: orsRemove(r.state.topUpQueue, [tag]),
    },
  });
}

export function itemSummary(state: ResilioState, itemId: ItemId): ItemSummary | undefined {
  const item = state.items[itemId];
  if (!item) return undefined;

  const ledgerIn = sumNatMap(item.ledger.p);
  const ledgerOut = sumNatMap(item.ledger.n);
  const value = ledgerIn - ledgerOut;
  const deficit = value < 0 ? Math.abs(value) : 0;

  const nodes = new Set<NodeId>();
  for (const [k, row] of Object.entries(item.quota.R)) {
    nodes.add(k);
    for (const target of Object.keys(row)) {
      nodes.add(target);
    }
  }
  for (const k of Object.keys(item.quota.U)) {
    nodes.add(k);
  }

  const rights: Record<NodeId, number> = {};
  for (const node of nodes) {
    rights[node] = bcLocalRights(item.quota, node);
  }

  return {
    value,
    deficit,
    ledgerIn,
    ledgerOut,
    rights,
  };
}

// ── Sync Wire Helpers (mirrors @resiliolog/sync) ──────────────────────────────

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalJson(v)).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(',')}}`;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

export function crc32Hex(bytes: Uint8Array): string {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i] ?? 0;
    const entry = CRC_TABLE[(crc ^ b) & 0xff] ?? 0;
    crc = entry ^ (crc >>> 8);
  }
  return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0');
}

export function makeDelta(replica: Replica, since: number): ResilioState {
  if (since <= 0) return replica.state;

  const items: Record<ItemId, ItemState> = {};
  for (const [id, item] of Object.entries(replica.state.items)) {
    if (item.touchedAt.c > since) {
      items[id] = item;
    }
  }

  const logAdds: Record<Tag, DistributionEntry> = {};
  for (const [tag, entry] of Object.entries(replica.state.distributionLog.adds)) {
    if (parseTag(tag).c > since) logAdds[tag] = entry;
  }

  const queueAdds: Record<Tag, TopUpRequest> = {};
  for (const [tag, req] of Object.entries(replica.state.topUpQueue.adds)) {
    if (parseTag(tag).c > since) queueAdds[tag] = req;
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    items,
    distributionLog: {
      adds: logAdds,
      removed: replica.state.distributionLog.removed,
    },
    topUpQueue: {
      adds: queueAdds,
      removed: replica.state.topUpQueue.removed,
    },
  };
}

export function applyDelta(
  replica: Replica,
  delta: ResilioState,
  remoteClock: number,
): Replica {
  return mergeIntoReplica(replica, delta, remoteClock);
}

export function buildEnvelope(
  replica: Replica,
  since: number,
  type: 'delta' | 'full',
  to?: string,
): SyncEnvelopeLike {
  const payload = type === 'full' ? replica.state : makeDelta(replica, since);
  const payloadBytes = new TextEncoder().encode(canonicalJson(payload));
  const msgId = `${replica.nodeId}-${replica.clock}`;
  return {
    v: 1,
    type,
    msgId,
    from: replica.nodeId,
    ...(to !== undefined ? { to } : {}),
    since,
    until: replica.clock,
    crc32: crc32Hex(payloadBytes),
    payload,
  };
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i] ?? 0);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(b64: string): Uint8Array {
  if (!/^[A-Za-z0-9\-_]+$/.test(b64)) {
    throw new SyncError('BAD_ENCODING');
  }
  const padded = b64.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function encodeEnvelope(env: SyncEnvelopeLike): string {
  const bytes = new TextEncoder().encode(canonicalJson(env));
  return bytesToBase64Url(bytes);
}

export function decodeEnvelope(blob: string): SyncEnvelopeLike {
  let decodedText: string;
  try {
    const bytes = base64UrlToBytes(blob.trim());
    decodedText = new TextDecoder().decode(bytes);
  } catch (e) {
    if (e instanceof SyncError) throw e;
    throw new SyncError('BAD_ENCODING');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(decodedText);
  } catch {
    throw new SyncError('BAD_JSON');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new SyncError('SCHEMA_INVALID');
  }

  const rec = parsed as Record<string, unknown>;
  if (rec['v'] !== 1) {
    throw new SyncError('SCHEMA_VERSION_MISMATCH');
  }
  if (
    (rec['type'] !== 'delta' && rec['type'] !== 'full') ||
    typeof rec['msgId'] !== 'string' ||
    typeof rec['from'] !== 'string' ||
    typeof rec['since'] !== 'number' ||
    typeof rec['until'] !== 'number' ||
    typeof rec['crc32'] !== 'string' ||
    !rec['payload']
  ) {
    throw new SyncError('SCHEMA_INVALID');
  }

  const computedCrc = crc32Hex(new TextEncoder().encode(canonicalJson(rec['payload'])));
  if (computedCrc !== rec['crc32']) {
    throw new SyncError('CRC_MISMATCH');
  }

  const toVal = rec['to'];
  return {
    v: 1,
    type: rec['type'],
    msgId: rec['msgId'],
    from: rec['from'],
    ...(typeof toVal === 'string' ? { to: toVal } : {}),
    since: rec['since'],
    until: rec['until'],
    crc32: rec['crc32'],
    payload: rec['payload'],
  };
}

export function chunkBlob(
  blob: string,
  msgId: string,
  size: number = DEFAULT_CHUNK_SIZE,
): string[] {
  const safeSize = Math.max(64, size);
  const slices: string[] = [];
  for (let i = 0; i < blob.length; i += safeSize) {
    slices.push(blob.slice(i, i + safeSize));
  }
  if (slices.length === 0) slices.push('');
  const total = slices.length;
  return slices.map((slice, idx) => `RL1|${msgId}|${idx + 1}/${total}|${slice}`);
}

export class ChunkCollector {
  private msgId: string | null = null;
  private total = 0;
  private parts = new Map<number, string>();

  add(chunk: string): ChunkProgress {
    const trimmed = chunk.trim();
    const parts = trimmed.split('|');
    if (parts.length < 4 || parts[0] !== 'RL1') {
      throw new SyncError('BAD_ENCODING');
    }
    const msgId = parts[1] ?? '';
    const idxSpec = parts[2] ?? '';
    const slice = parts.slice(3).join('|');

    const slash = idxSpec.indexOf('/');
    if (!msgId || slash <= 0) throw new SyncError('BAD_ENCODING');

    const idx = Number.parseInt(idxSpec.slice(0, slash), 10);
    const total = Number.parseInt(idxSpec.slice(slash + 1), 10);
    if (!Number.isInteger(idx) || !Number.isInteger(total) || idx < 1 || idx > total) {
      throw new SyncError('SCHEMA_INVALID');
    }

    if (this.msgId !== null && this.msgId !== msgId) {
      // Start fresh if a new message stream begins
      this.parts.clear();
    }
    this.msgId = msgId;
    this.total = total;
    this.parts.set(idx, slice);

    return {
      msgId,
      received: this.parts.size,
      total,
      complete: this.parts.size === total,
    };
  }

  assemble(): string {
    if (this.msgId === null || this.total <= 0 || this.parts.size < this.total) {
      throw new SyncError('INCOMPLETE_CHUNKS');
    }
    let out = '';
    for (let i = 1; i <= this.total; i++) {
      const part = this.parts.get(i);
      if (part === undefined) {
        throw new SyncError('INCOMPLETE_CHUNKS');
      }
      out += part;
    }
    return out;
  }

  reset(): void {
    this.msgId = null;
    this.total = 0;
    this.parts.clear();
  }
}
