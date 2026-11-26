# STRUCTURE — repository layout

```
resiliolog/
├─ AGENTS.md                  rules for AI agents (read first)
├─ CLAUDE.md                  imports AGENTS.md
├─ README.md                  overview + doc index
├─ PLAN.md                    day-by-day task board (update after every task)
├─ package.json               workspace scripts: test, typecheck, build, lint
├─ pnpm-workspace.yaml        packages/*
├─ tsconfig.base.json         strict TS settings shared by all packages
├─ .nvmrc  .editorconfig  .prettierrc.json  .gitignore
├─ .github/workflows/ci.yml   typecheck + test on push/PR
├─ scripts/
│  └─ bootstrap.sh            installs dependencies (current versions), runs typecheck+test
├─ docs/
│  ├─ PRD.md                  product scope and acceptance criteria
│  ├─ TECH-STACK.md           stack, rationale, platform constraints, versions
│  ├─ STRUCTURE.md            this file
│  ├─ SETUP.md                dev environment, phone/HTTPS testing, troubleshooting
│  ├─ ARCHITECTURE.md         layers, persistence, delta/wire/QR/WebRTC protocol
│  ├─ SPEC-CRDT.md            formal data-type spec + API (source of truth)
│  ├─ UI-CONTRACT.md          screens ↔ engine calls ↔ errors (for Role C)
│  ├─ TEST-PLAN.md            properties, scenarios, gates
│  ├─ EMERGENCY-OVERRIDE.md   override rules + claim wording
│  ├─ WORKFLOW.md             git, review, handoff, freeze rules
│  ├─ RISKS.md                risk register + fallbacks
│  ├─ DECISIONS.md            ADR-lite decision log
│  ├─ GLOSSARY.md             shared vocabulary
│  ├─ CLAIMS.md               claims allowed in PDF/video + evidence + citations
│  ├─ DEMO-SCRIPT.md          2-minute video skeleton
│  ├─ AGENT-PROMPTS.md        copy/paste prompts per task
│  └─ schema/
│     ├─ schema.json          LOCKED wire/state contract (JSON Schema 2020-12)
│     └─ example-envelope.json
└─ packages/
   ├─ crdt-core/              Role B — pure engine, zero runtime deps
   │  ├─ package.json  tsconfig.json  vitest.config.ts  README.md
   │  ├─ src/
   │  │  ├─ index.ts          public exports
   │  │  ├─ types.ts          all types + constants (implemented)
   │  │  ├─ errors.ts         ok/err/notImplemented (implemented)
   │  │  ├─ lamport.ts        B-03
   │  │  ├─ canonicalize.ts   B-03
   │  │  ├─ pn-counter.ts     B-04
   │  │  ├─ or-set.ts         B-05
   │  │  ├─ bounded-counter.ts B-08
   │  │  ├─ state.ts          B-06 (mergeStates, mergeIntoReplica)
   │  │  ├─ ops.ts            B-09/B-10 (replica + item operations)
   │  │  └─ queries.ts        B-09 (itemSummary)
   │  └─ test/
   │     ├─ helpers/{arbitraries.ts, freeze.ts}
   │     └─ pn-counter | or-set | bounded-counter | state | ops | convergence .test.ts
   ├─ sync/                   Role B (+C) — wire layer
   │  ├─ package.json  tsconfig.json  vitest.config.ts  README.md
   │  ├─ src/
   │  │  ├─ index.ts  errors.ts (implemented)
   │  │  ├─ schemas.ts        Zod mirror of schema.json
   │  │  ├─ canonical-json.ts  crc32.ts
   │  │  ├─ delta.ts          makeDelta / applyDelta
   │  │  ├─ envelope.ts       build / encode / decode
   │  │  └─ chunks.ts         chunkBlob / ChunkCollector
   │  └─ test/  envelope | chunks | delta | schema-example | size-report .test.ts
   └─ app/                    Role C — PWA (React + Vite); layout in its README
```

## Rules
- **Where code goes:** merge/ops logic only in `crdt-core`; encoding/validation only in `sync`; UI, storage, camera, WebRTC only in `app`.
- **Imports:** `crdt-core` ← `sync` ← `app`. Never the reverse (AGENTS.md §4).
- **Naming:** files kebab-case; types PascalCase; functions camelCase; error codes SCREAMING_SNAKE_CASE; tests mirror source file names.
- **Tests:** unit and property tests in each package's `test/`; no tests next to source.
- **Status of the scaffold:** `types.ts`, `errors.ts` and the config files are real; all other source files are typed stubs that throw `NOT_IMPLEMENTED(<task>)`; tests are `it.todo` named after TEST-PLAN IDs. Typecheck of the stubs passes; `pnpm install` is needed for Vitest.
- **When a file is implemented:** remove its `notImplemented` calls, add tests, tick the PLAN.md task.
