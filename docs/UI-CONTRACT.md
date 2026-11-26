# UI-CONTRACT — what the app (Role C) needs from the engine

The UI never implements merge or quota logic. It calls `@resiliolog/crdt-core` operations, persists the returned Replica, and renders from `replica.state`.

## 1. App-level responsibilities
| Topic | Rule |
|---|---|
| Node identity | On first launch generate `nodeId` (8 chars `[a-z0-9]`, e.g. from `crypto.getRandomValues`), store in Dexie `kv`. Never regenerate. |
| Persistence | After every op and every merge: write `state` **and** `clock` in ONE Dexie transaction. |
| Error handling | Ops return `Result`; branch on `ok`. Never throw to the user. |
| Time | `wallTime` = `new Date().toISOString()` passed in by the app (informational). |
| Storage | Call `navigator.storage.persist()`; warn if not granted. |

## 2. Screens ↔ engine calls
| Screen | Actions | Engine call | Notes |
|---|---|---|---|
| Item list | list items with totals | `itemSummary(state, id)` | show value, deficit badge |
| Create item (coordinator) | name, unit, category, initial qty | `createItem` | initial qty creates a `receive` entry |
| Receive goods | qty, counterparty, note | `receiveGoods` | |
| Issue goods | qty, recipient, note | `issue` | on `INSUFFICIENT_RIGHTS` show rights + "Request top-up" + "Emergency override" |
| Emergency override | qty, **reason (required)** | `emergencyIssue` | red, confirm dialog; `REASON_REQUIRED` if empty |
| Allocate quota (coordinator) | target node, qty | `transferRights` | list known nodes from `quota.R` |
| Top-up queue | list, resolve | read `orsElements(state.topUpQueue)`, `resolveTopUp` | open requests per item/node |
| Distribution log | list, filter by kind, void | `orsElements(state.distributionLog)`, `voidLogEntry` | override entries highlighted; void = hide only |
| Command Center overview | per-item merged totals, per-node rights, overrides count, deficit | `itemSummary` + log filter | |
| Sync (QR export) | choose peer/new peer → show QR sequence | `makeDelta`/`buildEnvelope`/`encodeEnvelope`/`chunkBlob` | `since` = stored cursor for that peer, else 0 + type `full` |
| Sync (QR import) | scan frames → progress "k of n" | `ChunkCollector.add` → `assemble` → `decodeEnvelope` → `applyDelta` | then store cursor = `envelope.until` |
| Sync (WebRTC, P1) | offer/answer via QR, then auto exchange | same envelopes over DataChannel | fallback to QR |

## 3. Error → message map
| Code | User message (English) |
|---|---|
| `INVALID_QTY` | "Enter a whole number of at least 1." |
| `INSUFFICIENT_RIGHTS` | "Not enough local quota for this item. Request a top-up or use emergency override." |
| `UNKNOWN_ITEM` | "This item is not known on this device yet. Sync first." |
| `SELF_TRANSFER` | "Choose a different device." |
| `REASON_REQUIRED` | "A reason is required for emergency override." |
| `SCHEMA_MISMATCH` | "This data comes from an incompatible app version." |
| sync `BAD_ENCODING` / `BAD_COMPRESSION` / `BAD_JSON` / `SCHEMA_INVALID` / `CRC_MISMATCH` | "The scanned data is damaged. Try again." |
| `SCHEMA_VERSION_MISMATCH` | "Update the app on both devices." |
| `INCOMPLETE_CHUNKS` | "Some QR frames are missing. Keep scanning." |

## 4. UX requirements derived from PRD
- Every field action must work with no network and finish instantly (local write).
- Show last-sync time per peer and "unsynced changes" indicator.
- Overrides and deficits are never hidden in default views of the Command Center.
- Language of UI text: English (demo video requirement); Indonesian can be added post-V1.

## 5. Handoff timeline
Engine API for B-09 documented by **Fri 12:00** (`docs/API.md`, prompt P-10); UI wires to it Friday afternoon; Feature Freeze 18:00.
