# AGENT-PROMPTS — copy/paste, one task at a time

Always start a session with: **"Read AGENTS.md and PLAN.md first. Then do only the task below. Stop when done and report."**

## P-01 Verify scaffold and tooling (B-01)
The monorepo scaffold already exists (see docs/STRUCTURE.md). Run `scripts/bootstrap.sh` steps (install typescript, vitest, fast-check, @types/node, prettier at root; fflate and zod in @resiliolog/sync). Make `pnpm typecheck` and `pnpm test` pass (tests are `it.todo`). Fix any config issue you find (tsconfig, vitest config, workspace links) without changing public signatures in `src/`. Do not implement any stubbed function. Report installed versions so I can fill docs/TECH-STACK.md §9. Update PLAN.md B-01.

## P-02 Types, Lamport, canonicalize (B-03)
Implement in crdt-core: NodeId/Tag/Lamport/Nat types, `Result`, `ErrorCode`, `compareLamport`, `tagOf`, `tick`, `receive`, `maxLamport`, `canonicalize` (sorted keys, de-duplicated and sorted `removed`). Follow docs/SPEC-CRDT.md §2 and §7 exactly. Add unit tests including total-order properties of compareLamport (fast-check).

## P-03 PN-Counter (B-04)
Implement PN-Counter per SPEC-CRDT §3 as pure functions (`pnEmpty, pnInc, pnDec, pnValue, pnMerge`). Add unit tests plus fast-check laws L1–L3 and L5 (inputs deep-frozen). Report number of runs.

## P-04 OR-Set (B-05)
Implement OR-Set per §4 (`orsEmpty, orsAdd, orsRemove, orsElements, orsMerge`). `orsMerge` must throw if the same tag maps to different elements. Tests: add-wins, laws L1–L3, tag-order of `orsElements`.

## P-05 ResilioState merge + generators (B-06, B-07)
Implement `mergeStates` per §6 (meta conflict rule, touchedAt via maxLamport) and fast-check generators that build reachable states from random operation sequences on 2–3 replicas (docs/TEST-PLAN.md §1). Add laws L1–L5 on ResilioState. Operations beyond PN/OR may be stubbed only if marked `SPEC-GAP`/TODO in PLAN.md.

## P-06 Bounded Counter (B-08)
Implement Bounded Counter per §5 (`bcEmpty, bcIncrement, bcLocalRights, bcGranted, bcRemainingRatio, bcConsume, bcTransfer, bcOverrideConsume, bcValue, bcMerge`). Tests B1–B4 including boundary cases (qty = rights, rights+1) and stale-view scenarios with partitions.

## P-07 Item operations (B-09, B-10)
Implement `createReplica, createItem, receive, issue, transferRights, emergencyIssue, voidLogEntry, resolveTopUp, itemSummary, mergeIntoReplica` per §7. One tick per log entry; top-up enqueue per D-010/D-012 with dedupe. Tests B5, B6, C4. Do not change schema.json; if it blocks you, stop and report `SPEC-GAP`.

## P-08 Sync package (B-11)
In `packages/sync`: Zod schemas mirroring docs/schema/schema.json, `canonicalJson`, `crc32`, `makeDelta`, `applyDelta`, `encodeEnvelope/decodeEnvelope` (JSON → fflate deflate → base64url), `chunkBlob/reassemble` (format in ARCHITECTURE §6). Tests W1–W8, including validating `examples[0]` from schema.json (W7). Print the W8 size report.

## P-09 Integration test (B-13)
Write the two-replica scenario from docs/TEST-PLAN.md §7 as a Vitest test using real encode → chunk → reassemble → decode. Also add C1–C3 convergence tests with delta sync and lost/duplicated/reordered deliveries.

## P-10 API doc for Role C (B-12)
Write `docs/API.md`: exported functions of crdt-core and sync with signatures, error codes, and 3 short usage examples (create item, issue with error handling, export/import delta). Only document what is implemented and tested.

## P-11 Chapter 4 draft (B-15)
Draft English text (≈ 1 page for 4.2 and ≈ 1 page for 4.3) from docs/SPEC-CRDT.md. Cite Shapiro (2011) and Balegas (2015) explicitly in the paragraphs. Use only CLAIMS.md rows with status VERIFIED; mark others as "to be verified". No invented numbers.

## P-12 Claims audit (B-19, B-22)
Compare the proposal/video script text I paste with docs/CLAIMS.md and the code/tests. List every technical statement without VERIFIED evidence and propose corrected wording.

## Review prompt after every task
"Show me the diff summary, the exact commands you ran with pass/fail output, any SPEC-GAP, and what remains unverified."
