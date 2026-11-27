# ResilioLog Public API (`@resiliolog/crdt-core` & `@resiliolog/sync`)

Public contract for Role C (`packages/app`). All functions listed below are implemented and verified by unit/property tests.

> **Language / Runtime:** TypeScript (strict, ESM). `@resiliolog/crdt-core` has zero runtime dependencies and is 100% pure (no I/O, no `Date.now()`, no `Math.random()`, no `crypto.*`).

---

## 1. Replica Lifecycle

1. **Create:** On first app launch, generate an 8-char `[a-z0-9]` `nodeId` (in `app`, persisted in Dexie `kv`) and initialize `createReplica(nodeId)`.
2. **Operation:** Run a pure `crdt-core` operation (`createItem`, `receiveGoods`, `issue`, `transferRights`, `emergencyIssue`, `voidLogEntry`, `resolveTopUp`) on the current `Replica`. Check `res.ok`.
3. **Persist together:** On `res.ok === true`, persist `replica.state` and `replica.clock` in **one atomic Dexie transaction**. Never persist `state` without `clock` (losing `clock` risks tag reuse).
4. **Merge:** On receiving a remote envelope, call `applyDelta(replica, payload, envelope.until)` (which calls `mergeIntoReplica`), then persist the updated `state`, `clock`, and peer `cursor = envelope.until`.

---

## 2. Sync Flow (QR / Blob)

```text
cursor (last `until` sent/acked for peer, 0 if new peer)
  -> buildEnvelope(replica, cursor, type, peerNodeId?)
  -> encodeEnvelope(envelope)
  -> chunkBlob(blob, envelope.msgId)
  -> [QR display / camera scan]
  -> ChunkCollector.add(chunk) ... until progress.complete === true
  -> collector.assemble()
  -> decodeEnvelope(blob)
  -> applyDelta(localReplica, envelope.payload, envelope.until)
  -> store cursor = envelope.until (in sender/peer tracking) & persist localReplica
```

*Note: WebRTC DataChannel transport and `SignalEnvelope` QR signaling are **planned** in `packages/app` (P1).*

---

## 3. `@resiliolog/crdt-core` API

### Replica & Item Operations (`ops.ts`)

| Function | Signature | Preconditions | Error Codes | Semantics |
|---|---|---|---|---|
| `createReplica` | `(nodeId: NodeId) => Replica` | `nodeId` matches `/^[a-z0-9]{4,16}$/` | throws `Error` | Creates an empty replica at clock `0` for the given `nodeId`. |
| `createItem` | `(r: Replica, args: CreateItemArgs) => Result<{ replica: Replica; itemId: ItemId }>` | `initialQty` is a safe integer $\ge 0$ | `'INVALID_QTY'` | Creates a new item with a unique `<slug>-<c>-<nodeId>` ID and logs an initial `'receive'` entry when `initialQty > 0`. |
| `receiveGoods` | `(r: Replica, itemId: ItemId, qty: number, meta?: OpMeta) => Result<Replica>` | `itemId` exists; `qty` safe integer $\ge 1$ | `'UNKNOWN_ITEM'`, `'INVALID_QTY'` | Records inbound stock by incrementing both `ledger` and `quota` and appending a `'receive'` log entry. |
| `issue` | `(r: Replica, itemId: ItemId, qty: number, meta?: OpMeta) => Result<Replica>` | `itemId` exists; `qty` safe integer $\ge 1$; `localRights >= qty` | `'UNKNOWN_ITEM'`, `'INVALID_QTY'`, `'INSUFFICIENT_RIGHTS'` | Issues stock if local quota suffices, decrements `ledger`, logs `'issue'`, and enqueues a deduplicated `TopUpRequest` if `remainingRatio <= 0.15`. |
| `transferRights` | `(r: Replica, itemId: ItemId, to: NodeId, qty: number) => Result<Replica>` | `itemId` exists; `to !== r.nodeId`; `qty >= 1`; `localRights >= qty` | `'UNKNOWN_ITEM'`, `'SELF_TRANSFER'`, `'INVALID_QTY'`, `'INSUFFICIENT_RIGHTS'` | Transfers spendable quota rights from the local node to `to` and advances `touchedAt`. |
| `emergencyIssue` | `(r: Replica, itemId: ItemId, qty: number, meta: OpMeta & { reason: string }) => Result<Replica>` | `itemId` exists; `reason.trim().length` in `3..200`; `qty >= 1` | `'UNKNOWN_ITEM'`, `'REASON_REQUIRED'`, `'INVALID_QTY'` | Issues stock bypassing quota checks, records the override in `O[node]`, and logs an `'override_issue'` audit entry. |
| `voidLogEntry` | `(r: Replica, tag: Tag) => Result<Replica>` | `tag` is a valid `Tag` string | — | Marks a distribution log entry as voided (display-only) without modifying any counters. |
| `resolveTopUp` | `(r: Replica, tag: Tag) => Result<Replica>` | `tag` is a valid `Tag` string | — | Marks an open top-up request as resolved/dismissed in `topUpQueue`. |

### Queries & State Merge (`queries.ts`, `state.ts`, `canonicalize.ts`)

| Function | Signature | Preconditions | Error Codes | Semantics |
|---|---|---|---|---|
| `itemSummary` | `(state: ResilioState, itemId: ItemId) => ItemSummary \| undefined` | None | — | Returns `{ value, deficit, ledgerIn, ledgerOut, rights }` for `itemId`, or `undefined` if missing. |
| `emptyState` | `() => ResilioState` | None | — | Returns an empty `ResilioState` with `schemaVersion: 1`. |
| `mergeStates` | `(a: ResilioState, b: ResilioState) => ResilioState` | `a.schemaVersion === b.schemaVersion`; no OR-Set tag conflicts | throws `Error` (`SCHEMA_MISMATCH` / tag conflict) | Computes the join-semilattice least upper bound of two `ResilioState` objects. |
| `mergeIntoReplica` | `(r: Replica, remote: ResilioState, remoteClock: number) => Replica` | Same as `mergeStates`; valid non-negative `remoteClock` | throws `Error` | Merges `remote` state into `r.state` and advances `r.clock` via `receive(r.clock, remoteClock)`. |
| `canonicalize` | `(state: ResilioState) => ResilioState` | None | — | Returns a deep copy of `state` with sorted object keys and sorted, deduplicated `removed` arrays. |

### CRDT Primitives (`lamport.ts`, `pn-counter.ts`, `or-set.ts`, `bounded-counter.ts`)

| Function | Signature | Preconditions | Error Codes | Semantics |
|---|---|---|---|---|
| `compareLamport` | `(a: Lamport, b: Lamport) => number` | Valid `Lamport` objects | — | Orders timestamps by `c` ascending, then `n` lexicographically. |
| `tagOf` | `(l: Lamport) => Tag` | Valid `Lamport` | — | Formats a `Lamport` timestamp as `${l.n}:${l.c}`. |
| `parseTag` | `(t: Tag) => Lamport` | Valid `${nodeId}:${counter}` format | throws `Error` / `RangeError` | Parses a `Tag` string back into `{ c, n }`. |
| `tick` | `(clock: number) => number` | Non-negative safe integer | throws `RangeError` | Increments a Lamport clock by `1`. |
| `receive` | `(local: number, remote: number) => number` | Non-negative safe integers | throws `RangeError` | Advances local clock to `max(local, remote) + 1`. |
| `maxLamport` | `(a: Lamport, b: Lamport) => Lamport` | Valid `Lamport` objects | — | Returns the larger `Lamport` timestamp under `compareLamport`. |
| `makeLamport` | `(c: number, n: NodeId) => Lamport` | `c >= 0` safe integer; valid `NodeId` | throws `Error` / `RangeError` | Constructs a validated `Lamport` timestamp. |
| `pnEmpty` | `() => PNCounter` | None | — | Returns an empty PN-Counter `{ p: {}, n: {} }`. |
| `pnInc` | `(s: PNCounter, node: NodeId, k: number) => PNCounter` | `k >= 1` safe integer | throws `RangeError` | Increments the positive counter map `p[node]` by `k`. |
| `pnDec` | `(s: PNCounter, node: NodeId, k: number) => PNCounter` | `k >= 1` safe integer | throws `RangeError` | Increments the negative counter map `n[node]` by `k`. |
| `pnValue` | `(s: PNCounter) => number` | None | — | Computes `sum(p) - sum(n)`. |
| `pnMerge` | `(a: PNCounter, b: PNCounter) => PNCounter` | None | — | Merges two PN-Counters by pointwise `max` on `p` and `n`. |
| `orsEmpty` | `<T>() => ORSet<T>` | None | — | Returns an empty OR-Set `{ adds: {}, removed: [] }`. |
| `orsAdd` | `<T>(s: ORSet<T>, tag: Tag, el: T) => ORSet<T>` | `tag` is valid and not already in `s.adds` | throws `Error` | Adds `(tag, el)` to the OR-Set. |
| `orsRemove` | `<T>(s: ORSet<T>, tags: readonly Tag[]) => ORSet<T>` | None | — | Marks observed `tags` as removed in canonical sorted/deduplicated form. |
| `orsElements` | `<T>(s: ORSet<T>) => ReadonlyArray<{ tag: Tag; el: T }>` | Valid tags in `s.adds` | — | Returns active (non-removed) elements sorted by Lamport tag order. |
| `orsMerge` | `<T>(a: ORSet<T>, b: ORSet<T>) => ORSet<T>` | Identical tags map to equal elements | throws `Error` | Joins two OR-Sets by taking the union of `adds` and `removed`. |
| `bcEmpty` | `() => BoundedCounter` | None | — | Returns an empty Bounded Counter `{ R: {}, U: {}, O: {} }`. |
| `bcIncrement` | `(s: BoundedCounter, i: NodeId, k: number) => BoundedCounter` | `k >= 1` safe integer | throws `RangeError` | Adds `k` units of stock and local rights to node `i` (`R[i][i] += k`). |
| `bcGranted` | `(s: BoundedCounter, i: NodeId) => number` | None | — | Computes total rights ever granted to node `i`. |
| `bcLocalRights` | `(s: BoundedCounter, i: NodeId) => number` | None | — | Computes remaining rights node `i` may spend locally. |
| `bcRemainingRatio` | `(s: BoundedCounter, i: NodeId) => number` | None | — | Computes `localRights(i) / granted(i)` (or `0` if `granted(i) === 0`). |
| `bcConsume` | `(s: BoundedCounter, i: NodeId, n: number) => Result<BoundedCounter, 'INVALID_QTY' \| 'INSUFFICIENT_RIGHTS'>` | `n >= 1` safe integer; `localRights(i) >= n` | `'INVALID_QTY'`, `'INSUFFICIENT_RIGHTS'` | Consumes `n` units of node `i`'s local rights. |
| `bcTransfer` | `(s: BoundedCounter, i: NodeId, j: NodeId, m: number) => Result<BoundedCounter, 'INVALID_QTY' \| 'INSUFFICIENT_RIGHTS' \| 'SELF_TRANSFER'>` | `i !== j`; `m >= 1`; `localRights(i) >= m` | `'SELF_TRANSFER'`, `'INVALID_QTY'`, `'INSUFFICIENT_RIGHTS'` | Transfers `m` rights from node `i` to node `j`. |
| `bcOverrideConsume` | `(s: BoundedCounter, i: NodeId, n: number) => Result<BoundedCounter, 'INVALID_QTY'>` | `n >= 1` safe integer | `'INVALID_QTY'` | Records `n` override units in `O[i]` without checking local rights. |
| `bcValue` | `(s: BoundedCounter) => number` | None | — | Computes global net value `sum_i R[i][i] - sum(U) - sum(O)`. |
| `bcMerge` | `(a: BoundedCounter, b: BoundedCounter) => BoundedCounter` | None | — | Merges two Bounded Counters by pointwise `max` on `R`, `U`, and `O`. |

---

## 4. `@resiliolog/sync` API

| Function / Class | Signature | Preconditions | Error Codes | Semantics |
|---|---|---|---|---|
| `canonicalJson` | `(value: unknown) => string` | JSON-serializable `value` | — | Serializes `value` to UTF-8 JSON with sorted object keys and no whitespace. |
| `crc32Hex` | `(bytes: Uint8Array) => string` | None | — | Computes the IEEE 802.3 CRC-32 checksum as 8 lowercase hex characters. |
| `makeDelta` | `(replica: Replica, since: number) => ResilioState` | Non-negative `since` | — | Extracts items with `touchedAt.c > since` and log/queue entries with `tag.c > since` (plus `removed`). |
| `applyDelta` | `(replica: Replica, delta: ResilioState, remoteClock: number) => Replica` | Validated `delta` | throws `Error` | Merges a decoded `ResilioState` delta into `replica` using `mergeIntoReplica`. |
| `buildEnvelope` | `(replica: Replica, since: number, type: 'delta' \| 'full', to?: string) => SyncEnvelopeLike` | Valid `replica` | — | Builds a `SyncEnvelope` (`v: 1`) with `crc32` over `canonicalJson(payload)`. |
| `encodeEnvelope` | `(env: SyncEnvelopeLike) => string` | Valid envelope | — | Compresses `JSON(env)` with deflate (level 9) and encodes it as base64url. |
| `decodeEnvelope` | `(blob: string) => SyncEnvelopeLike` | Non-empty base64url string | `SyncError`: `'BAD_ENCODING'`, `'BAD_COMPRESSION'`, `'BAD_JSON'`, `'SCHEMA_VERSION_MISMATCH'`, `'SCHEMA_INVALID'`, `'CRC_MISMATCH'` | Decodes, inflates, parses, Zod-validates, and CRC-verifies an encoded envelope. |
| `chunkBlob` | `(blob: string, msgId: string, size?: number) => string[]` | `msgId` matches `/^[a-z0-9]{6}$/`; `blob` non-empty; `total <= 999` | `SyncError('BAD_ENCODING')` / `RangeError` | Splits a base64url blob into `RL1\|<msgId>\|<i>/<n>\|<slice>` QR frames (default `800` chars). |
| `ChunkCollector.add` | `(chunk: string) => ChunkProgress` | Valid `RL1\|...` chunk format | `SyncError('BAD_ENCODING')` | Collects out-of-order/duplicate chunks for the active `msgId` and returns `{ msgId, received, total, complete }`. |
| `ChunkCollector.assemble` | `() => string` | `complete === true` | `SyncError('INCOMPLETE_CHUNKS')` | Reassembles all collected chunk slices in order into the original blob. |

*Zod schemas exported from `@resiliolog/sync`:* `NodeIdSchema`, `ItemIdSchema`, `TagSchema`, `NatSchema`, `QtySchema`, `LamportSchema`, `NatMapSchema`, `PNCounterSchema`, `BoundedCounterSchema`, `CategorySchema`, `ItemMetaSchema`, `ItemStateSchema`, `DistributionEntrySchema`, `TopUpRequestSchema`, `DistributionLogSchema`, `TopUpQueueSchema`, `ResilioStateSchema`, `SyncEnvelopeSchema`, `SignalEnvelopeSchema`, `QrChunkSchema`, `EnvelopeSchema`.

---

## 5. Planned (Not Yet Implemented)

- WebRTC DataChannel peer transport and `SignalEnvelope` QR signaling helper (`packages/app`, P1).
- Automatic top-up fulfilment suggestions, Command Center aggregation view, sync history view (Final Day roadmap).

---

## 6. Usage Examples

### Example 1: Create an item and issue with error handling

```ts
import { createItem, createReplica, issue, itemSummary } from '@resiliolog/crdt-core';

let replica = createReplica('aaaa1111');
const created = createItem(replica, {
  name: 'Rice',
  unit: 'kg',
  category: 'food',
  initialQty: 50,
});
if (!created.ok) {
  throw new Error(`Failed to create item: ${created.error}`);
}

replica = created.value.replica;
const { itemId } = created.value;

const issued = issue(replica, itemId, 60, { counterparty: 'Shelter 1' });
if (!issued.ok) {
  if (issued.error === 'INSUFFICIENT_RIGHTS') {
    const rights = itemSummary(replica.state, itemId)?.rights[replica.nodeId] ?? 0;
    console.warn(`Not enough local quota (available: ${rights})`);
  }
} else {
  replica = issued.value;
}
```

### Example 2: Export a delta into QR chunks

```ts
import type { Replica } from '@resiliolog/crdt-core';
import { buildEnvelope, chunkBlob, encodeEnvelope } from '@resiliolog/sync';

export function exportQrChunks(replica: Replica, peerCursor: number, peerNodeId: string): string[] {
  const type = peerCursor === 0 ? 'full' : 'delta';
  const envelope = buildEnvelope(replica, peerCursor, type, peerNodeId);
  const blob = encodeEnvelope(envelope);
  return chunkBlob(blob, envelope.msgId);
}
```

### Example 3: Import QR chunks into a local replica

```ts
import type { Replica, ResilioState } from '@resiliolog/crdt-core';
import { applyDelta, ChunkCollector, decodeEnvelope } from '@resiliolog/sync';

export function importQrChunks(
  localReplica: Replica,
  scannedChunks: readonly string[],
): { replica: Replica; nextCursor: number } {
  const collector = new ChunkCollector();
  for (const chunk of scannedChunks) {
    const progress = collector.add(chunk);
    if (progress.complete) break;
  }

  const blob = collector.assemble();
  const envelope = decodeEnvelope(blob);
  const updated = applyDelta(localReplica, envelope.payload as ResilioState, envelope.until);
  return { replica: updated, nextCursor: envelope.until };
}
```
