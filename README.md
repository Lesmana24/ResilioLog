# ResilioLog

Offline-first PWA for disaster-relief logistics. Devices record stock/distribution offline and converge conflict-free via state-based CRDTs (PN-Counter, OR-Set) with a Bounded Counter to prevent overselling. V1 sync: QR + JSON delta, and local WebRTC over a hotspot.

> STACK 2026 (GDGoC ITB) · Semifinal · Team LET MI TING

## Repo map
See `docs/STRUCTURE.md` for the full tree. Summary:
| Path | Purpose | Owner |
|---|---|---|
| `packages/crdt-core` | CRDT types, merge, item ops (pure) | Role B |
| `packages/sync` | delta, envelope, compression, QR chunking | Role B (+C) |
| `packages/app` | PWA UI, Dexie, QR scan, WebRTC | Role C |
| `docs/` | PRD, stack, specs, schema, plan, claims | all |
| `PLAN.md` | day-by-day task board | all |
| `AGENTS.md` | rules for AI coding agents | Role B |

## Bootstrap (first 15 minutes)
```bash
git init && git add . && git commit -m "chore: initial setup"
./scripts/bootstrap.sh     # installs current dependency versions, runs typecheck + tests
```
Details, phone/HTTPS testing and troubleshooting: `docs/SETUP.md`.

## How to work with the AI agent
1. Open the repo root in your agent (it will read `AGENTS.md` / `CLAUDE.md`).
2. Paste a prompt from `docs/AGENT-PROMPTS.md` (one task at a time).
3. After each task: run `pnpm test`, review the diff, check `PLAN.md` got updated, commit.

## Documentation index
- `docs/PRD.md` — what we build and what we do not
- `docs/TECH-STACK.md` — stack, rationale, platform constraints, version table
- `docs/STRUCTURE.md` — repository layout and conventions
- `docs/SETUP.md` — environment, phone/HTTPS testing, troubleshooting
- `docs/ARCHITECTURE.md` — layers, persistence, sync protocol, QR chunking
- `docs/SPEC-CRDT.md` — formal CRDT definitions and API
- `docs/schema/schema.json` — wire/state contract (locked)
- `docs/UI-CONTRACT.md` — screens, engine calls, error messages (Role C)
- `docs/TEST-PLAN.md` — properties and scenarios
- `docs/EMERGENCY-OVERRIDE.md` — medical override and audit rules
- `docs/WORKFLOW.md` — git, review, handoff, freeze
- `docs/RISKS.md` — risk register
- `docs/DECISIONS.md` — decision log
- `docs/GLOSSARY.md` — shared vocabulary
- `docs/DEMO-SCRIPT.md` — 2-minute video script skeleton
- `docs/CLAIMS.md` — claims allowed in PDF/video, evidence, citations
- `docs/AGENT-PROMPTS.md` — ready-to-use prompts
