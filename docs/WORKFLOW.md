# WORKFLOW

## 1. Git
- `main` is always green (`pnpm typecheck && pnpm test`). Work on branches `feat/B-04-pn-counter`, `fix/<topic>`, `docs/<topic>`.
- Conventional commits with the task id: `feat(crdt-core): B-04 pn-counter`.
- Small PRs (one PLAN task each). Another team member reviews at least the diff summary before merge; agent output is never merged unreviewed.
- Tag `v1-freeze` at Fri 18:00 WIB. After the tag only `fix/*` branches (bugs from volunteer testing).

## 2. Session loop with the AI agent
1. Start: "Read AGENTS.md and PLAN.md first. Do only task <ID>."
2. Agent plans (files + tests), implements, runs `pnpm typecheck && pnpm test`.
3. You review: diff summary, command output, SPEC-GAPs, unverified items.
4. Commit; confirm PLAN.md updated; next task.
Do not let the agent start several tasks in one session.

## 3. Spec-change protocol
Spec or schema change needed → stop → write proposal in DECISIONS.md (status proposed) → Role B + Role C agree → update SPEC-CRDT / schema.json / Zod / tests in one commit → mark accepted. Never edit schema.json casually.

## 4. Handoffs
| From → To | What | When |
|---|---|---|
| B → C | `docs/API.md` + working `crdt-core` ops | Fri 12:00 |
| C → B | diagram for §4.1, storage layout confirmation | Fri |
| B → C | §4.4 text inputs | Sat 18:00 |
| D → B | volunteer-test bug list | Sat |
| B → A | verified technical claims (CLAIMS.md) | Sun/Mon |

## 5. Definition of ready / done
- Ready: task in PLAN.md, spec section exists, dependencies listed.
- Done: AGENTS.md §7 checklist.

## 6. Communication rhythm (suggested)
Short sync at start and end of each day: blockers, what froze, what moved. End-of-day: update PLAN.md statuses and CLAIMS.md.
