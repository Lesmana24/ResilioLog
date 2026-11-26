# @resiliolog/app (Role C)

Placeholder. Role C scaffolds React + Vite here and keeps this layout:

```
src/
├─ main.tsx              entry, registers service worker
├─ App.tsx               shell (field view, Command Center view)
├─ ui/                   screens + components (see docs/UI-CONTRACT.md)
├─ storage/db.ts         Dexie tables kv/state/cursors; persist state+clock in ONE transaction
├─ state/useReplica.ts   React binding around crdt-core ops
├─ transport/
│  ├─ qr-export.ts       chunks -> QR sequence rendering (qrcode)
│  ├─ qr-scan.ts         camera scan -> ChunkCollector (qr-scanner)
│  └─ webrtc.ts          manual-signaling DataChannel sync (P1)
└─ pwa/                  manifest, icons, vite-plugin-pwa config
```
Engine contract: `docs/UI-CONTRACT.md`. Never re-implement merge logic in the UI.
