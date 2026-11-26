# SPEC-CRDT — Formal specification (`packages/crdt-core`)

This file is the source of truth for the engine. It is also the raw material for Proposal Chapter 4.2 and 4.3.
References: Shapiro et al. (2011) for state-based CRDTs / join-semilattices; Balegas et al. (2015) for Bounded Counters. (Verify citation details before submission — see CLAIMS.md.)

## 1. Model
A **state-based CRDT (CvRDT)** has a state set S with a partial order ≤ such that (S, ⊔) is a join-semilattice: `⊔` (merge) is the least upper bound. Replicas apply local operations that move state upward in ≤, and exchange full or partial states. If `⊔` is
- commutative: `a ⊔ b = b ⊔ a`
- associative: `(a ⊔ b) ⊔ c = a ⊔ (b ⊔ c)`
- idempotent: `a ⊔ a = a`

and every local operation is inflationary (`s ≤ op(s)`), replicas that have received the same updates are in the same state (strong eventual consistency), regardless of order, duplication, or delay.

**Delta-state:** a *delta* is itself a (partial) state of the same shape, merged with the same `⊔`. Over-sending or re-sending is therefore harmless.

## 2. Primitives
```ts
type NodeId = string;                 // /^[a-z0-9]{4,16}$/
type Tag = string;                    // `${nodeId}:${counter}`
interface Lamport { c: number; n: NodeId }   // c: non-negative integer
type Nat = number;                    // non-negative safe integer

compareLamport(a, b): number          // by c, then n (lexicographic) — total order
tagOf(l: Lamport): Tag                // `${l.n}:${l.c}`
tick(clock: number): number           // clock + 1
receive(local: number, remote: number): number   // max(local, remote) + 1
maxLamport(a, b): Lamport
```
Every local event takes exactly one `tick`. Tags are unique because `(nodeId, counter)` never repeats on a node (counter is persisted).

## 3. PN-Counter
State: `{ p: Record<NodeId, Nat>, n: Record<NodeId, Nat> }`
- `value(s) = Σ p[i] − Σ n[i]`
- `inc(s, i, k)`: `p[i] += k` (k ≥ 1) · `dec(s, i, k)`: `n[i] += k`
- `merge(a, b)`: for each side and each key, pointwise `max` (missing = 0)
- Order: `a ≤ b` iff every entry of a ≤ the same entry of b.

## 4. OR-Set (observed-remove, tag-based)
State: `{ adds: Record<Tag, T>, removed: Tag[] }` (removed is a set; canonical form sorted & de-duplicated)
- `add(s, tag, el)`: `adds[tag] = el` (tag must be fresh; elements are immutable per tag)
- `remove(s, tags)`: `removed ∪= tags` — a caller passes the tags it has **observed** for an element
- `elements(s) = { (tag, el) | tag ∈ adds ∧ tag ∉ removed }`, sorted by Lamport order of the tag
- `merge(a, b)`: `adds = a.adds ∪ b.adds`, `removed = a.removed ∪ b.removed`
- Concurrent add/remove of the "same" element: the add carries a new tag the remove never observed → **add wins**.
- Invariant: the same tag always maps to the same element (else merge is not well-defined; `merge` throws on violation).
- Known limitation (V1, documented): `removed` grows monotonically (no GC).

Uses in ResilioLog:
- `distributionLog`: elements are `DistributionEntry`. `remove` = **void** an entry (hidden by default). Voiding does **not** change counters; corrections are made with compensating operations.
- `topUpQueue`: elements are `TopUpRequest`. `remove` = request fulfilled/dismissed.

## 5. Bounded Counter (rights-based, lower bound 0)
Following Balegas et al. (2015): the invariant `value ≥ 0` is preserved without coordination by giving each node a local share of *rights* to decrement.

State:
```
R: Record<NodeId, Record<NodeId, Nat>>   // R[i][i] = units added at i (increments)
                                         // R[i][j], i≠j = rights transferred from i to j
U: Record<NodeId, Nat>                   // units consumed (issued) at i
O: Record<NodeId, Nat>                   // units issued at i via emergency override (no rights check)
```
Derived:
```
granted(i)      = R[i][i] + Σ_{k≠i} R[k][i]                    // rights ever held by i
localRights(i)  = granted(i) − Σ_{k≠i} R[i][k] − U[i]          // rights i may still spend
value           = Σ_i R[i][i] − Σ_i U[i] − Σ_i O[i]
remainingRatio(i) = granted(i) = 0 ? 0 : localRights(i) / granted(i)
deficit         = max(0, −value)
```
Operations at node `i`:
| Op | Precondition | Effect |
|---|---|---|
| `increment(i, k)` | k ≥ 1 | `R[i][i] += k` |
| `consume(i, n)` | n ≥ 1 ∧ `localRights(i) ≥ n` | `U[i] += n` |
| `transfer(i, j, m)` | i ≠ j ∧ m ≥ 1 ∧ `localRights(i) ≥ m` | `R[i][j] += m` |
| `overrideConsume(i, n)` | n ≥ 1 (+ audit entry in the log) | `O[i] += n` |

`merge(a, b)`: pointwise `max` on every entry of R (both indices), U, O.

**Why safe:** every quantity is grow-only. A node's `localRights` can only be *under*-estimated by stale knowledge of incoming grants (grants from others arrive later) and is exactly accounted for outgoing transfers and consumption (its own writes). So a node never spends rights it does not hold ⇒ `value ≥ 0` in any merged state, when `O = 0`.
**With override:** `value ≥ −Σ O`. Overrides are explicit, flagged, and counted; restocking (`increment`) reduces `deficit`.

**Top-up trigger:** after a successful `consume(i, ·)` on item x, if `remainingRatio(i) ≤ 0.15` and there is no open `TopUpRequest` for `(x, i)` in `topUpQueue` → add one. Threshold constant: `TOP_UP_THRESHOLD = 0.15`.
Fulfilment in V1 is a manual `transfer` by a node holding surplus rights (Command Center); automation is `planned`.

## 6. ResilioState (composition)
```
ResilioState = {
  schemaVersion: 1,
  items: Record<ItemId, ItemState>,
  distributionLog: ORSet<DistributionEntry>,
  topUpQueue: ORSet<TopUpRequest>
}
ItemState = { meta: ItemMeta, ledger: PNCounter, quota: BoundedCounter, touchedAt: Lamport }
```
- `ItemId = "<slug>-<c>-<nodeId>"` (generated on creation → globally unique, no create/create conflicts).
- `meta` is immutable. If two states disagree on `meta` for the same id (should not happen), keep the one with the smaller `createdAt` (deterministic) and report via a returned warning list.
- `ledger` (PN) records inbound/outbound for reporting; `quota` (Bounded) enforces outbound. **Invariant I4:** `pnValue(ledger) = bcValue(quota)` for every reachable state (all ops update both).
- `touchedAt` = max Lamport of any local or merged change to that item (used for delta selection).
- `mergeStates(a, b)`: union of item ids; per item `meta` rule above, `ledger = pnMerge`, `quota = bcMerge`, `touchedAt = maxLamport`; `distributionLog`/`topUpQueue` via `orsMerge`. Requires equal `schemaVersion`.

## 7. Replica and operations API
```ts
interface Replica { nodeId: NodeId; clock: number; state: ResilioState }
type Result<T, E extends string> = { ok: true; value: T } | { ok: false; error: E };
type ErrorCode = 'INVALID_QTY' | 'INSUFFICIENT_RIGHTS' | 'UNKNOWN_ITEM' | 'SELF_TRANSFER'
               | 'REASON_REQUIRED' | 'SCHEMA_MISMATCH';

createReplica(nodeId): Replica
createItem(r, { name, unit, category, initialQty, wallTime? }): Result<{ replica: Replica; itemId: string }, ErrorCode>
receive(r, itemId, qty, { counterparty?, note?, wallTime? }): Result<Replica, ErrorCode>
issue(r, itemId, qty, { counterparty?, note?, wallTime? }): Result<Replica, ErrorCode>   // enforces quota; may enqueue top-up
transferRights(r, itemId, toNode, qty): Result<Replica, ErrorCode>
emergencyIssue(r, itemId, qty, { reason, counterparty?, note?, wallTime? }): Result<Replica, ErrorCode>
voidLogEntry(r, tag): Result<Replica, ErrorCode>          // display-only; counters unchanged
resolveTopUp(r, tag): Result<Replica, ErrorCode>

mergeStates(a: ResilioState, b: ResilioState): ResilioState
mergeIntoReplica(r, remote: ResilioState, remoteClock: number): Replica   // clock = receive(local, remoteClock)

// queries
itemSummary(state, itemId): { value; deficit; ledgerIn; ledgerOut; rights: Record<NodeId, number> }
canonicalize(state): ResilioState   // sorted keys, de-duplicated sets — used for equality in tests
```
`issue` does, in one logical step (one `tick` per log entry): `bcConsume` → `pnDec(ledger)` → add `DistributionEntry{kind:'issue'}` → maybe enqueue top-up (one more tick).
`receive`/`createItem(initialQty>0)`: `bcIncrement` → `pnInc(ledger)` → log entry `kind:'receive'`.
`emergencyIssue`: `bcOverrideConsume` → `pnDec(ledger)` → log entry `kind:'override_issue'` with `reason`.
All operations are inflationary; none removes data from counters.

## 8. Worked example
Node A creates "rice" with 100 units; A transfers 40 rights to B (offline later). Offline, B issues 10, A issues 30.
- `granted(A)=100`, `localRights(A)=100−40−30=30`; `granted(B)=40`, `localRights(B)=40−10=30`
- After merge: `value = 100 − 10 − 30 = 60`; `ledger = 100 − 40 = 60` ✔ (I4); B cannot issue more than 30 without override.
