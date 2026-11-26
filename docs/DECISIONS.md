# DECISIONS (ADR-lite)

Format: ID · date · status (proposed/accepted/superseded) · decision · why · consequences.

**D-001 · 26 Nov · accepted — TypeScript everywhere.** One language across engine/UI/tests; types enforce the Role B↔C contract.
**D-002 · 26 Nov · accepted — Implement CRDTs ourselves (no Automerge/Yjs).** Bounded Counter is not provided by them; the algebra must be explainable in Chapter 4; small surface (~300 lines).
**D-003 · 26 Nov · accepted — State-based CvRDT with delta-states.** Idempotent re-delivery suits QR/manual transfer where duplicates and loss are normal.
**D-004 · 26 Nov · accepted — V1 transport = QR chunks + WebRTC local (manual signaling).** BLE/Wi-Fi Direct moved to roadmap (PWA radio limits). WebRTC is P1; QR is the guaranteed path.
**D-005 · 26 Nov · accepted — Dexie/IndexedDB, not SQLite-WASM.** Less setup risk in 5 days.
**D-006 · 26 Nov · accepted — Ledger (PN-Counter) + Quota (Bounded Counter) per item, invariant I4.** Ledger gives simple in/out reporting; quota enforces outbound. All ops update both.
**D-007 · 26 Nov · accepted — Bounded Counter uses Balegas-style rights matrix R plus U (consumed) and O (override).** Override is a separate grow-only counter so it never corrupts rights accounting.
**D-008 · 26 Nov · proposed — Override allowed to push value below zero ("deficit"), always audited.** Claim wording fixed in EMERGENCY-OVERRIDE.md. *Needs team/coordinator confirmation.*
**D-009 · 26 Nov · accepted — OR-Set `remove` on distribution log = void (display-only).** Counters are corrected by compensating ops, not by deleting history.
**D-010 · 26 Nov · accepted — Top-up trigger automatic at remainingRatio ≤ 0.15; fulfilment manual in V1.** Auto fulfilment = planned.
**D-011 · 26 Nov · accepted — Item-granular delta selection with local per-peer cursors.** Simple; over-sending is safe.
**D-012 · 26 Nov · accepted — `remainingRatio = localRights / granted`.** Defined per node; "15% of quota" means 15% of rights ever granted to that node.
**D-013 · 26 Nov · accepted — Zod lives in `packages/sync`; `crdt-core` is dependency-free.**
**D-014 · 26 Nov · accepted — No GC of tombstones in V1.** Documented limitation.
