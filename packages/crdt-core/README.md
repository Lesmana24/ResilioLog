# @resiliolog/crdt-core (Role B)

Pure, dependency-free CRDT engine. Spec: `../../docs/SPEC-CRDT.md`. Rules: `../../AGENTS.md` section 5.

| File | Responsibility | Task |
|---|---|---|
| `src/types.ts` | all shared types + constants (done) | - |
| `src/errors.ts` | `ok`/`err` helpers, `notImplemented` (done) | - |
| `src/lamport.ts` | compare/tag/tick/receive/max | B-03 |
| `src/canonicalize.ts` | canonical form for equality | B-03 |
| `src/pn-counter.ts` | PN-Counter | B-04 |
| `src/or-set.ts` | OR-Set | B-05 |
| `src/bounded-counter.ts` | Bounded Counter | B-08 |
| `src/state.ts` | `mergeStates`, `mergeIntoReplica` | B-06 |
| `src/ops.ts` | replica + item operations | B-09/B-10 |
| `src/queries.ts` | `itemSummary` | B-09 |

Stubs throw `NOT_IMPLEMENTED(<task>)` until implemented. Tests are `it.todo` entries named after TEST-PLAN IDs.
