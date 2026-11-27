# ResilioLog

Offline-first PWA for disaster-relief logistics. Field devices record stock receipts, distributions, and emergency overrides completely offline in IndexedDB and converge conflict-free using state-based CvRDTs (PN-Counter, OR-Set) paired with a **Bounded Counter** (Balegas et al., 2015) to prevent quota overselling.

> STACK 2026 (GDGoC ITB) · Semifinal · Team LET MI TING

---

## Capabilities (V1 vs Roadmap)

- **Offline-First Local Persistence (V1):** React 19 + Vite 8 + Tailwind CSS v4 PWA backed by Dexie (IndexedDB), atomic `state` + `clock` transactions, interactive `navigator.storage.persist()` elevation, and a Service Worker (`public/sw.js`) for offline reload (`Ctrl+R`).
- **Conflict-Free Replication & Quota Safety (V1):** Pure TypeScript CvRDT engine (`@resiliolog/crdt-core`) enforcing `localRights >= qty` on outgoing distributions, automatic top-up queue triggers at `<= 15%` remaining local quota, and audited `Emergency Quota Override` logging (`reason` required, never hidden in Command Center views).
- **Zero-Server Sync (V1):** Compressed (`fflate` deflate level 9) + `base64url` + Zod-validated + IEEE CRC-32 envelopes (`@resiliolog/sync`) chunked into `RL1|<msgId>|<i>/<n>|<slice>` QR frames (`ChunkCollector` accepts out-of-order and duplicate scans), plus `BroadcastChannel('resiliolog-mesh')` for multi-tab local mesh demos.
- **Roadmap (Post-V1):** Native BLE / Wi-Fi Direct transport (excluded from PWA V1 per `docs/DECISIONS.md` D-004).

---

## Repository Structure

| Path | Purpose | Package |
|---|---|---|
| `packages/crdt-core` | Pure CvRDT engine: Lamport, PN-Counter, OR-Set, Bounded Counter, `mergeStates`, item ops | `@resiliolog/crdt-core` |
| `packages/sync` | Wire layer: Zod schemas (`schema.json`), canonical JSON, CRC-32, `fflate` deflate, QR chunking | `@resiliolog/sync` |
| `packages/app` | Offline-first PWA UI (`Inventaris`, `P2P Sync`, `Command Center`), Dexie storage, Service Worker | `@resiliolog/app` |
| `docs/` | PRD, architecture, CRDT spec, API reference, locked JSON schema, test plan, claims | — |
| `PLAN.md` | Task board and milestone tracking | — |

---

## Quick Start

**Prerequisites:** Node.js `>= 20` (pinned to `22` in `.nvmrc`) and `pnpm`.

```bash
# 1. Install workspace dependencies
pnpm install

# 2. Typecheck all packages
pnpm typecheck

# 3. Run all unit, property-based CRDT law, and integration tests
pnpm test

# 4. Start the PWA development server
pnpm --filter @resiliolog/app dev

# 5. Build production bundle (outputs dist/ with manifest.webmanifest & sw.js)
pnpm --filter @resiliolog/app build
```

---

## Interactive Multi-Tab Local Demo

1. Start the dev server with `pnpm --filter @resiliolog/app dev`.
2. Open two browser tabs with isolated IndexedDB stores:
   - Tab 1 (Forward Post): `http://localhost:5173/?node=posko-a04`
   - Tab 2 (Field Peer): `http://localhost:5173/?node=relawan-b`
3. **Inventaris:** Toggle `+ Receive` / `- Issue`, record stock movements offline, test `Scan Crate` / `Input Code`, trigger `Emergency Quota Override` when local quota is insufficient, or click `+ Request Quota` at `<= 15%`.
4. **P2P Sync:** Click **Nearby P2P Sync** to broadcast a `fflate`-compressed, Zod-validated delta envelope to Tab 2 via `BroadcastChannel`, or inspect/import `RL1` QR frames.
5. **Command Center:** Switch to **Command Center** in the top demo bar to inspect interactive map pins (`Posko A-04`, `Posko C-02`, `Posko B-07`), search logs, run `Approve Reroute (+100 Quota)`, and ratify audited emergency overrides.

---

## Verified Test & Wire-Size Evidence

All checks below ran on the integrated `dev` branch (`pnpm typecheck && pnpm test && pnpm --filter @resiliolog/app build`):

| Package | Command | Result |
|---|---|---|
| `@resiliolog/crdt-core` | `pnpm test` | **8 test files, 44 tests passed** (L1–L3 laws, Bounded Counter invariants, C1 convergence) |
| `@resiliolog/sync` | `pnpm test` | **6 test files, 15 tests passed** (`schema.json` validation, CRC-32, deflate, QR chunks, 3-replica wire integration) |
| `@resiliolog/app` | `pnpm test` | **1 test file, 6 integration tests passed** (seeded wire round-trip, quota guard, override, reroute, 2-node convergence) |

Measured QR wire sizes (`test/size-report.test.ts` — W8):
- Small dataset (3 items, 10 ops): `698` chars → `1` QR chunk
- Medium dataset (10 items, 60 ops): `1611` chars → `3` QR chunks
- Large dataset (20 items, 200 ops): `3414` chars → `5` QR chunks

---

## Documentation Index

- `docs/PRD.md` — product scope and acceptance criteria
- `docs/TECH-STACK.md` — stack, platform constraints, dependency budget
- `docs/STRUCTURE.md` — repository layout and dependency direction (`crdt-core` ← `sync` ← `app`)
- `docs/SETUP.md` — environment, phone/HTTPS testing, troubleshooting
- `docs/ARCHITECTURE.md` — layers, persistence, sync protocol, QR chunking
- `docs/SPEC-CRDT.md` — formal CRDT definitions and API
- `docs/API.md` — public API reference
- `docs/schema/schema.json` — locked wire/state contract (JSON Schema 2020-12)
- `docs/UI-CONTRACT.md` — screens, engine calls, error-to-message mapping
- `docs/TEST-PLAN.md` — properties, scenarios, quality gates
- `docs/EMERGENCY-OVERRIDE.md` — medical override and audit rules
- `docs/OFFLINE-CHECK.md` — offline PWA verification checklist
- `docs/CLAIMS.md` — evidence-backed claims and citations
- `docs/DECISIONS.md` — architecture decision log
- `docs/RISKS.md` — risk register
