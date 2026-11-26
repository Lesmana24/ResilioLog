# DEMO SCRIPT — 2 minutes, 1080p, English narration + subtitles

Rule: show only what runs. Mark Final Day items visually as "Planned". Fill the "Status" column with WORKING / PLANNED after Fri freeze.

| Time | Screen | Narration (draft) | Status |
|---|---|---|---|
| 0:00–0:12 | Title + 1 line problem | "In disasters, connectivity fails exactly when logistics matter most." | — |
| 0:12–0:30 | Device A offline (airplane mode visible): create item, receive 100 | "ResilioLog records stock locally, with zero network." | |
| 0:30–0:45 | A transfers 40 units of quota to B | "A coordinator allocates quota rights to a field device." | |
| 0:45–1:05 | Both offline: A issues 30, B issues 10; B tries 31 → blocked | "Each device can only issue what its local rights allow — no overselling, no server." | |
| 1:05–1:15 | B low quota → top-up request appears | "At 15% remaining quota, a top-up request is queued automatically." | |
| 1:15–1:30 | Emergency override with reason; flagged in log | "Medical emergencies can override quota — always audited." | |
| 1:30–1:50 | Sync A↔B via QR (or WebRTC); totals identical | "Devices exchange compact deltas; the CRDT merge guarantees convergence." | |
| 1:50–2:00 | Tests green + roadmap slide (BLE/Wi-Fi Direct, Final Day: planned) | "Verified by property-based tests. Next: automatic discovery." | |

Production notes: record phone screens at 1080p; burn in subtitles; keep total ≤ 2:00; have a backup recording of the QR sync in case of camera glare.
