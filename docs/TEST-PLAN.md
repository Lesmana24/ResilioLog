# TEST-PLAN

Stack: Vitest + fast-check. Default `numRuns`: 1000 locally, 200 in quick mode. Record failing seeds in the test output so failures are reproducible.

## 1. Generators (important)
Do **not** generate arbitrary raw states (they may violate invariants such as same-tag-same-element). Generate **reachable** states by applying random operation sequences from 2–3 replicas:
`createItem`, `receive`, `issue`, `transferRights`, `emergencyIssue`, `voidLogEntry`, `resolveTopUp`, and `sync(i→j)` at random points.
Operations that return `ok:false` are valid outcomes (skip them). Quantities: 1..50. Node ids fixed small set.

## 2. Algebraic laws (P0)
For each of: PN-Counter, OR-Set, Bounded Counter, ResilioState — on reachable states a, b, c (compare via `canonicalize`):
| ID | Property |
|---|---|
| L1 | commutative: `merge(a,b) = merge(b,a)` |
| L2 | associative: `merge(merge(a,b),c) = merge(a,merge(b,c))` |
| L3 | idempotent: `merge(a,a) = a` |
| L4 | inflationary ops: for every op, `merge(s, op(s)) = op(s)` |
| L5 | merge does not mutate inputs (deep-freeze inputs in tests) |

## 3. Convergence (P0)
| ID | Scenario |
|---|---|
| C1 | 3 replicas, random op sequences, random partitions; finally sync all pairs in random order, repeat twice → all canonical states equal |
| C2 | same as C1 but each sync is a **delta** (random cursors, some stale/lost) → equals result of full-state merge |
| C3 | duplicated and reordered deliveries (apply same delta 1–3×, in shuffled order) → no change vs once |
| C4 | no lost update: total of all successful `receive`/`issue` quantities equals ledger totals after convergence |

## 4. Bounded Counter invariants (P0)
| ID | Invariant |
|---|---|
| B1 | without overrides: `localRights(i) ≥ 0` for every node and `value ≥ 0` in every merged state |
| B2 | `issue` rejected with `INSUFFICIENT_RIGHTS` iff `qty > localRights(node)` (boundary tests: qty = rights, rights+1) |
| B3 | `transferRights` conserves total: `Σ granted − Σ transferredOut` consistent; recipient cannot spend before it observes the grant |
| B4 | with overrides: `value ≥ −Σ O` and `deficit` computed correctly; restock clears deficit |
| B5 | I4: `pnValue(ledger) = bcValue(quota)` for every item in every reachable state |
| B6 | top-up trigger: fires exactly once when `remainingRatio` first becomes ≤ 0.15; not duplicated; re-fires only after the previous request is resolved and ratio ≤ 0.15 again |

## 5. OR-Set specifics (P0)
- add/remove concurrent → add wins (use two replicas, partition, add on one, remove observed tag on other, merge).
- same tag with different element → `merge` throws (programmer error test).
- `voidLogEntry` does not change any counter.

## 6. Sync package (P0/P1)
| ID | Test |
|---|---|
| W1 | `decode(encode(env))` equals `env` for random envelopes |
| W2 | corrupt one char → typed error, state untouched |
| W3 | wrong crc32 → `CRC_MISMATCH` |
| W4 | schemaVersion ≠ 1 → `SCHEMA_VERSION_MISMATCH` |
| W5 | chunking: split/reassemble with shuffled order and duplicates → original blob |
| W6 | missing chunk → `INCOMPLETE_CHUNKS`, nothing applied |
| W7 | `schema.json` `examples[0]` validates against Zod and its `crc32` verifies |
| W8 | size report (not a pass/fail): print blob size + chunk count for small/medium/large datasets |

## 7. Integration (P0)
Two-replica end-to-end: create item on A → transfer rights to B → partition → A issues, B issues, B hits quota boundary and top-up enqueues → exchange deltas through encode→chunks→decode → both replicas show identical totals and log. This is the scenario shown in the demo.

## 8. Manual / usability (Role D + C)
- Real devices: two phones, airplane mode, QR exchange; WebRTC over hotspot.
- Volunteers (3–5): task "record issue", "see low-stock request", "sync with another phone". Record time, errors, quotes. Bugs → B-16.

## 9. Coverage and gates
`crdt-core` ≥ 90% lines/branches target; laws L1–L5 and invariants B1–B6 must pass before Feature Freeze. CI command: `pnpm typecheck && pnpm test`.
