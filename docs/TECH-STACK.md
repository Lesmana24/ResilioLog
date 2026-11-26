# TECH-STACK — ResilioLog V1 (5-day build)

Selection principles: **one language (TypeScript) in every layer**, **no mandatory server**, **only mature libraries**, **smallest dependency set that works**. The engine must be directly consumable by Role C's UI with no translation layer, and small enough that every team member can explain it (competition rule: "Penguasaan Merata").

## 1. Stack table
| Layer | Choice | Package(s) | Why | Fallback |
|---|---|---|---|---|
| Language | TypeScript, strict | `typescript` | One language for engine, UI, tests; types lock the Role B↔C contract | — |
| Runtime (dev) | Node ≥ 20 (repo pins 22 in `.nvmrc`) | — | Vitest/Vite tooling | — |
| Package manager | pnpm workspaces | `pnpm` (via corepack) | Fast, strict, monorepo-native | npm workspaces |
| Frontend | React + Vite | `react`, `react-dom`, `vite`, `@vitejs/plugin-react` | Quick to scaffold, mature PWA ecosystem | Svelte (engine unaffected) |
| PWA / offline shell | Service worker via Workbox | `vite-plugin-pwa` | Precaches app shell → loads with no network | hand-written SW |
| Local storage | IndexedDB via Dexie | `dexie` | Simple API, works on all target browsers | raw IndexedDB |
| CRDT engine | **Own implementation**, pure TS | `@resiliolog/crdt-core` (0 runtime deps) | Bounded Counter not offered by Automerge/Yjs; algebra must be explainable in Ch. 4 | — |
| Wire validation | Zod | `zod` | Single source of truth for envelope validation | manual validators |
| Compression | deflate | `fflate` | Small, fast, pure JS | native `CompressionStream` (support varies) |
| QR generate | `qrcode` | `qrcode` | Light, browser-ready | `qrcode-generator` |
| QR scan | `qr-scanner` (or `jsQR`) | `qr-scanner` | Camera scanning, worker-based | `jsQR` + own camera loop |
| Local P2P | WebRTC DataChannel, manual signaling | browser API | No server; LAN/hotspot only | QR-only path |
| Tests | Vitest + fast-check | `vitest`, `fast-check` | Property-based tests prove merge laws | — |
| Formatting | Prettier + EditorConfig | `prettier` | Consistent diffs for agent-written code | — |
| CI | GitHub Actions | `.github/workflows/ci.yml` | typecheck + test on push | local-only |
| Dev HTTPS (phones) | self-signed cert plugin | `@vitejs/plugin-basic-ssl` | Camera + service worker need a secure context on LAN IPs | static HTTPS host |

## 2. Why the CRDT engine is hand-written
- Required types: **PN-Counter, OR-Set, Bounded Counter, Lamport timestamps**. General libraries (Automerge, Yjs) do not provide a Bounded Counter and hide the merge algebra that Chapter 4.2/4.3 must explain.
- Size: roughly 200–400 lines of TypeScript for the core types; trivial to test exhaustively and to teach.
- Design as **pure functions** (`merge(a, b) → state`, no I/O, no clock/random) → the three laws are directly testable.

## 3. Verification strategy (summary of TEST-PLAN.md)
fast-check generates reachable states from random operation sequences and checks commutativity, associativity, idempotence, inflationary operations, convergence under partition/duplication/reordering, and Bounded Counter invariants. Results become the "verified" claims in the proposal (CLAIMS.md).

## 4. Package structure and dependency rule
```
packages/crdt-core  (Role B)   imports: nothing
packages/sync       (B + C)    imports: crdt-core, zod, fflate
packages/app        (Role C)   imports: crdt-core, sync, react, dexie, qrcode, qr-scanner
```
No upward imports. Details: `STRUCTURE.md`.

## 5. Data design that drives the stack
- **Node ID**: 8-char `[a-z0-9]`, generated once per install in the app layer, persisted in IndexedDB.
- **PN-Counter**: per item, maps `nodeId → count` for P and N.
- **OR-Set**: distribution log and top-up queue, tags `(nodeId, lamport)`.
- **Bounded Counter**: rights matrix + consumed + override counters; 15% remaining-quota threshold queues a top-up request.
- **Delta**: only items/entries changed since the last sync with that peer (item-granular), same merge function as full state.

## 6. QR capacity — plan, don't assume
A single QR scanned by a phone camera reliably carries on the order of 1–2 KB; the real number depends on error correction, screen size and lighting (**measure on the demo phones**). Therefore:
1. Compress (deflate) then base64url-encode.
2. Chunk into numbered QR frames (`RL1|msgId|i/n|slice`, default 800 chars, ECC M); scanner accepts any order and duplicates.
3. In the proposal claim only "compact delta" and measured chunk counts (test W8) — never "the whole state fits one QR".

## 7. Platform constraints you must design for
| Constraint | Consequence |
|---|---|
| `getUserMedia` (camera) and service workers need a **secure context** (HTTPS or `localhost`) | Testing on phones via `http://192.168.x.x` will NOT work. Use dev HTTPS (basic-ssl) or deploy to a static HTTPS host (GitHub Pages / Netlify / Cloudflare Pages) |
| PWA must be loaded (and installed) **once while online** | Demo prep: open and "Add to Home Screen" on both phones beforehand, then test in airplane mode |
| Browsers can evict site storage under pressure | Call `navigator.storage.persist()` in the app and show a "storage not persistent" warning if refused |
| iOS Safari/PWA behaviors differ from Android Chrome | Test on the actual demo devices early (Day 2), not on Day 5 |
| WebRTC on LAN may fail on hotspots with client isolation or restricted multicast (ICE candidates can be mDNS-obfuscated) | Keep QR as the guaranteed path; WebRTC is P1 and must have a fallback |
| BLE / Wi-Fi Direct are not reliably available to PWAs | Roadmap only (D-004) |

## 8. Hosting for the demo
No backend needed. Build the PWA (`vite build`) and host the static output on any HTTPS static host so phones can load and cache it once; afterwards everything runs offline. Keep a local fallback (`vite preview --host` with HTTPS) for the venue.

## 9. Versions (fill after first install)
This repo intentionally does **not** guess version numbers. `scripts/bootstrap.sh` installs current releases; commit `pnpm-lock.yaml` and record them here.
| Package | Version installed | Date |
|---|---|---|
| typescript | | |
| vitest | | |
| fast-check | | |
| zod | | |
| fflate | | |
| react / vite (Role C) | | |
| dexie (Role C) | | |
| qrcode / qr-scanner (Role C) | | |
| vite-plugin-pwa (Role C) | | |

## 10. Dependency budget
Runtime: `fflate`, `zod`, `react`, `react-dom`, `dexie`, `qrcode`, `qr-scanner`. Anything else needs a DECISIONS.md entry and human approval.

## 11. Deliberately excluded
Backend/BaaS (Firebase/Supabase) for primary sync · SQLite-WASM (OPFS complexity in 5 days) · Protobuf/MessagePack (JSON+deflate suffices) · BLE/Wi-Fi Direct · Automerge/Yjs for the core types.

## 12. Open decisions with Role C
1. React vs Svelte (depends on Role C's skill; engine unaffected)
2. QR chunk format and `schemaVersion` — **defaults in schema.json / ARCHITECTURE.md; confirm**
3. WebRTC signaling — manual (QR/copy-paste) recommended
4. Hosting target for the demo build (GitHub Pages / Netlify / Cloudflare Pages)
