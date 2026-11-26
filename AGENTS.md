# AGENTS.md — ResilioLog

Instructions for any AI coding agent working in this repository. Read this file fully before every session.

## 0. Read order (every session)
1. `PLAN.md` — what to do now, what NOT to do
2. `docs/PRD.md` — product scope (V1 vs Final Day vs roadmap)
3. `docs/TECH-STACK.md` and `docs/STRUCTURE.md` — locked stack and where code lives
4. `docs/SPEC-CRDT.md` — formal spec of the data types (source of truth for `crdt-core`)
5. `docs/schema/schema.json` — wire/state contract (LOCKED, see §6)
6. `docs/ARCHITECTURE.md` — layers, persistence, sync protocol
7. `docs/UI-CONTRACT.md` — what the app expects from the engine
8. `docs/DECISIONS.md`, `docs/RISKS.md` — why things are the way they are, known risks

Scaffold note: `types.ts` and `errors.ts` are implemented; other source files are stubs that throw `NOT_IMPLEMENTED(<task>)`. Replace stubs task by task; keep exported signatures unless the spec says otherwise.

## 1. Project context
ResilioLog is an offline-first PWA for disaster-relief logistics. Volunteers record stock and distribution on their own devices with no connectivity; devices later exchange state and **must converge with zero lost updates and zero version conflicts**. Overselling of scarce stock must be prevented without a central server.

Competition: STACK 2026 (GDGoC ITB), Semifinal, team LET MI TING. Hard dates:
- **Feature Freeze V1: Fri 27 Nov 2026, 18:00 WIB**
- Submission: Mon 30 Nov 2026, before 18:00 WIB (aim to finish by 12:00)

## 2. Who you are working for
The human is **Role B — Lead Backend & CRDT Engine Developer**. Default scope: `packages/crdt-core` and `packages/sync`, plus Chapter 4 technical text. Touch `packages/app` (Role C's area) only when explicitly asked, and keep such changes minimal.

## 3. Locked stack (do not add dependencies without asking)
- TypeScript (strict), ESM, Node ≥ 20, pnpm workspaces
- Tests: Vitest + fast-check (property-based)
- Validation: Zod (must mirror `docs/schema/schema.json`)
- Compression: fflate. QR: `qrcode` (generate), `qr-scanner` or `jsQR` (scan)
- Local storage: Dexie (IndexedDB) — app package only
- UI (Role C): React + Vite + vite-plugin-pwa
- crdt-core has **zero runtime dependencies**

## 4. Layout and dependency rule
```
packages/crdt-core   pure data types + merge. No I/O. No imports from other packages.
packages/sync        delta, envelope, compression, QR chunking. Imports crdt-core only.
packages/app         PWA UI, Dexie, QR scan, WebRTC. Imports crdt-core and sync.
docs/                specs and contracts
```
Never import "upwards" (crdt-core must not import sync/app; sync must not import app).

## 5. Hard rules for `crdt-core`
- All operations and `merge*` functions are **pure**: no mutation of inputs, no I/O.
- No `Date.now()`, `Math.random()`, `crypto.*`, or `new Date()` inside crdt-core. Ordering uses Lamport clocks; unique tags are derived from `(nodeId, lamportCounter)`. Wall-clock time is stored only as informational metadata passed in by the caller.
- `merge` must be **commutative, associative, idempotent** for every type. Every change to a merge function requires the law tests to pass.
- Counters are grow-only maps merged by pointwise `max`. Never decrement a stored number; "decrease" means incrementing the N side.
- Use `Result<T, ErrorCode>` for expected failures (insufficient rights, invalid quantity). Throw only for programmer errors.
- Keep functions small and typed; no `any`.

## 6. Schema lock
`docs/schema/schema.json` is a contract with Role C. It is locked after kickoff.
- Do NOT change field names, types, or semantics silently.
- If a change is truly needed: stop, explain why, propose the diff, add an entry to `docs/DECISIONS.md`, bump `schemaVersion` only if the change is breaking, and wait for human approval.
- Zod schemas in code must stay in sync with schema.json (add a test that validates the examples in schema.json).

## 7. Definition of done (per task)
- [ ] Implementation matches `docs/SPEC-CRDT.md` (if the spec is wrong or ambiguous, say so instead of guessing)
- [ ] Property-based tests exist for the relevant laws/invariants (`docs/TEST-PLAN.md`)
- [ ] `pnpm typecheck` and `pnpm test` pass
- [ ] `PLAN.md` status updated (todo → doing → done) with a one-line note
- [ ] Anything half-finished is marked `planned`, never `done`

## 8. Scope guardrails (V1)
In scope: PN-Counter, OR-Set, Bounded Counter, Lamport clock, ResilioState merge, item operations, emergency override with audit, top-up queue trigger (≤15%), delta export/import, JSON+deflate+base64url encoding, QR chunking, 2-node sync.
**Out of scope — do not build:** BLE, Wi-Fi Direct, background P2P discovery, any backend server, user accounts/auth, CRDT garbage collection, text/rich-text CRDTs, Final Day features before V1 is frozen. If asked, remind the human of this list first.

## 9. Workflow loop
1. Read `PLAN.md`; pick the first unchecked task in the current day (or the one the human names).
2. State a short plan (files to touch, tests to write) before coding.
3. Write tests first or alongside. Run them.
4. Update `PLAN.md`. Summarize: what changed, what was tested, what is still open.
5. Stop. Do not start the next task unless asked.

## 10. Honesty rules
- Never claim a test passes unless you ran it in this session and saw it pass.
- Never claim a feature works end-to-end if only unit tests exist; say exactly what was verified.
- Project claims go into `docs/CLAIMS.md` with evidence (test name / command). The proposal and video may only state claims that are VERIFIED there.
- Separate "working now" from "planned for Final Day" everywhere.

## 11. Conventions
- All code, comments, docs, commit messages: **English** (proposal and video must be fully English).
- Files: kebab-case. Types: PascalCase. Functions/vars: camelCase. Error codes: SCREAMING_SNAKE_CASE.
- Conventional commits: `feat(crdt-core): ...`, `test(sync): ...`, `docs: ...`.
- Prefer small commits per task ID: `feat(crdt-core): B-04 pn-counter`.

## 12. Commands
```
pnpm install
pnpm test                       # all packages
pnpm --filter @resiliolog/crdt-core test
pnpm typecheck
pnpm build
```

## 13. When unsure
Ask. Do not invent requirements, library choices, or schema fields. Flag spec gaps explicitly with `SPEC-GAP:` in your reply.
