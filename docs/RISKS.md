# RISKS — register and fallbacks

| ID | Risk | Likelihood | Impact | Mitigation | Fallback / trigger |
|---|---|---|---|---|---|
| R1 | Over-engineering within 48 h | High | High | Lock V1 to P0 items; PLAN cut order | If B-08 not done by Fri 14:00 → drop P2/P1 work, finish P0 only |
| R2 | JSON schema friction with Role C | Med | High | schema.json locked; Zod test of examples | Any change goes through DECISIONS protocol |
| R3 | QR capacity exceeded | Med | Med | deflate + chunking; measure (W8) | Offer file/copy-paste JSON import as fallback |
| R4 | WebRTC fails on demo hotspot | High | Med | Test on real devices Fri; QR as guaranteed path | Demo uses QR only; WebRTC labelled planned |
| R5 | Camera/service worker blocked (no HTTPS) | Med | High | Dev HTTPS or static HTTPS host from Day 1 (SETUP §5) | Deploy to static host |
| R6 | App not available offline on demo phones | Med | High | Install + airplane-mode test Fri and again Sun | Keep a screen recording as backup |
| R7 | Lamport clock lost → tag reuse | Low | High | Persist state+clock in one transaction | Reset node identity (new nodeId) |
| R8 | Override abuse undermines "no overselling" claim | Med | Med | Reason required, audit, deficit display; claim wording in EMERGENCY-OVERRIDE | State caveat explicitly in proposal |
| R9 | Claims in PDF/video exceed verified reality | Med | High | CLAIMS.md gate; Mon verification (B-22) | Remove/relabel as planned |
| R10 | Bug flood from volunteer tests after freeze | Med | Med | Reserve Sat for fixes; no new features | Prioritise data-loss/convergence bugs |
| R11 | Team members don't understand CvRDT | Med | Med | B-20 training; glossary; worked example | Q&A drill Sun |
| R12 | Upload failure near deadline | Low | High | 6-hour buffer rule; target 12:00; test access logged-out | Upload early draft Sun night |
| R13 | IndexedDB eviction / cleared data | Low | High | `storage.persist()`; avoid clearing data before demo | Re-sync from peer |
| R14 | Tombstone growth | Low | Low | Documented limitation | Roadmap: GC |
| R15 | Citation details wrong | Med | Med | Verify against real papers (CLAIMS) | Cite only verified items |
