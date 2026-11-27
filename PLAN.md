# PLAN.md — ResilioLog Semifinal (26–30 Nov 2026)

Status legend: `[ ]` todo · `[~]` doing · `[x]` done · `[!]` blocked · `planned` = not part of V1.
Owner defaults to Role B unless stated. Agents: update status + one-line note after each task.

## Hard deadlines
| When | What |
|---|---|
| Thu 26 Nov | Schema contract with Role C confirmed (re-verify today) |
| **Fri 27 Nov 18:00 WIB** | **Feature Freeze V1** (two-node delta sync works) |
| Sat 28 Nov 18:00 WIB | Hand off §4.4 (Hybrid Sync V1) text/inputs to Role C |
| Mon 30 Nov 18:00 WIB | Final submission. **Target: uploaded by 12:00** (6h buffer rule) |

## Priority tiers (for cutting scope)
- **P0 (must):** PN-Counter, OR-Set, ResilioState merge + law tests, Bounded Counter, delta over QR/JSON, 2-node convergence test
- **P1 (should):** emergency override + audit, top-up queue trigger (≤15%), QR chunking, WebRTC local sync
- **P2 (nice):** auto-suggest top-up fulfilment, sync stats, extra UI polish

**Cut order if behind:** P2 → WebRTC → chunked QR (fall back to file/copy-paste JSON) → top-up trigger. Never cut law tests or Bounded Counter.

---

## Day 1 — Thu 26 Nov: Foundation (Role B)
- [x] **B-01** Install deps and verify scaffold: run `scripts/bootstrap.sh`, commit lockfile, record versions in `docs/TECH-STACK.md` §9 (scaffold already provided) — see prompt P-01 *(done: fixed `packages/sync/package.json` name/scripts, installed deps via pnpm 10.34.9, `typecheck` & `test` pass)*
- [ ] **B-02** Re-confirm `schema.json` with Role C; write Zod mirror + test validating `examples` in schema.json
- [x] **B-03** Core types, `Result`, Lamport (`compareLamport`, `tagOf`, `tick`, `receive`), `canonicalize` *(done: implemented `lamport.ts`, `canonicalize.ts`, and 7 unit/property tests at 1000 runs)*
- [x] **B-04** PN-Counter + unit tests *(done: implemented `pn-counter.ts` and 8 unit/property tests L1–L5 at 1000 runs)*
- [x] **B-05** OR-Set (tag-based, tombstone set) + unit tests *(done: implemented `or-set.ts` and 7 unit/property tests including add-wins, tag conflict, Lamport sort, and L1–L5 at 1000 runs)*
- [x] **B-06** `mergeStates` for ResilioState (items, log, queue) *(done: implemented `state.ts` + minimal `bcEmpty`/`bcMerge` in `bounded-counter.ts`)*
- [x] **B-07** fast-check generators (random op sequences over 2–3 replicas) + law tests (commutative/associative/idempotent) for PN, OR-Set, ResilioState *(done: low-level `arbReachableStates` in `arbitraries.ts` + 7 tests in `state.test.ts` at 1000 runs)*
- Exit criteria: `pnpm test` green; three laws pass ≥ 1000 runs on all implemented types.

## Day 2 — Fri 27 Nov: Bounded Counter + Sync (Role B) → FREEZE 18:00
- [x] **B-08** Bounded Counter (R matrix, U, O) + invariant tests (rights ≥ 0, value ≥ 0 without override) *(done: implemented all `bc*` functions in `bounded-counter.ts` + 5 tests B1–B4 & L1–L5 at 1000 runs)*
- [x] **B-09** Item operations: `createItem`, `receive`, `issue`, `transferRights`, `emergencyIssue` (ledger + quota + log updated atomically) *(done: implemented `ops.ts` + `queries.ts` (`itemSummary`) + 5 tests including B5, override, void, error codes)*
- [x] **B-10** Top-up trigger: after `issue`, if remainingRatio ≤ 0.15 → enqueue request (deduped) *(done: integrated in `issue` + `resolveTopUp` + B6 test)*
- [ ] **B-11** `packages/sync`: `makeDelta`, `applyDelta`, envelope, crc32, deflate+base64url, QR chunk/reassemble
- [ ] **B-12** Public API doc for Role C (`packages/*/README.md` or `docs/API.md`) — **by 12:00** so C can wire UI
- [ ] **B-13** Integration test: 2 replicas, partition → divergent ops → exchange deltas both ways → identical canonical state
- [ ] **B-14** FREEZE checklist: all P0 done, tests green, tag `v1-freeze`, update `docs/CLAIMS.md`
- Role C dependency: UI forms call B-09 API; Dexie persistence per ARCHITECTURE §4.

## Day 3 — Sat 28 Nov: Chapter 4 + bug fixes (Role B)
- [ ] **B-15** Draft Chapter 4 (English, ≈2.5 pages): 4.2 CvRDT model (cite Shapiro 2011), 4.3 Bounded Counter (cite Balegas 2015); co-write 4.1 and 4.4 with Role C
- [ ] **B-16** Fix bugs reported from Role D's volunteer usability tests (log each in `docs/CLAIMS.md` notes or an issue list)
- [ ] **B-17** Hand off §4.4 inputs to Role C by 18:00
- No new features. Freeze is in force; only bug fixes.

## Day 4 — Sun 29 Nov: Audit + knowledge transfer (Role B)
- [ ] **B-18** Repo audit: tidy structure, README run instructions verified on a clean clone
- [ ] **B-19** Technical accuracy pass on PDF + video script against `docs/CLAIMS.md`
- [ ] **B-20** 20-minute CvRDT / Bounded Counter walkthrough for the whole team (rule: every member must understand)
- [ ] **B-21** Anticipate judge questions: write 5 Q&A (e.g., "what if override is abused?", "how big can a delta get?")

## Day 5 — Mon 30 Nov: Verification + submission
- [ ] **B-22** Final claim verification on PDF and video (every technical statement ↔ VERIFIED row)
- [ ] **B-23** Support Role A with upload; confirm file access from a logged-out browser
- [ ] **B-24** Submit before 18:00 WIB (target 12:00); save proof

---

## Dependencies on other roles (track, don't build)
| Need | From | Needed by |
|---|---|---|
| Interview data (3–5 volunteers) for Chapter 2 | Role D | Thu/Fri |
| UI forms + Dexie persistence calling B-09 API | Role C | Fri |
| Architecture diagram for §4.1 | Role C | Fri |
| Final Day task list (2–3 tasks) | Role A | Sat |
| Usability test results/bugs | Role D | Sat |

## Open items
- [ ] Final Day tasks undefined (Role A) — candidates: auto top-up fulfilment, Command Center aggregation view, sync history. Decide Sat.
- [ ] Confirm bibliographic details of the three citations (see `docs/CLAIMS.md`).
