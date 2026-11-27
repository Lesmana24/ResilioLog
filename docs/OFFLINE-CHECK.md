# OFFLINE-CHECK — Airplane Mode & PWA Verification

## 1. Prerequisites (HTTPS)

Camera access (`getUserMedia`) and service workers require **HTTPS** (or `localhost`). Pick one option from `docs/SETUP.md` §5:

1. **Dev HTTPS:** run `vite --host` with `@vitejs/plugin-basic-ssl`; open `https://<laptop-ip>:<port>` on the phone and accept the self-signed certificate warning.
2. **Static HTTPS host (preferred for final demo):** run `vite build`, deploy `packages/app/dist` to GitHub Pages / Netlify / Cloudflare Pages, and open the URL on both phones.

## 2. Offline & Update Guarantees (Build-Verified)

- **App shell precaching:** `vite-plugin-pwa` (`generateSW`) precaches `index.html`, `manifest.webmanifest`, `registerSW.js`, JS bundles, `qr-scanner` worker, and SVG icons, with `navigateFallback: '/index.html'`.
- **Storage persistence:** `ReplicaProvider` calls `navigator.storage.persist()` on startup (`src/storage/db.ts`); if denied (`storagePersistent === false`), a visible warning banner is shown in `App.tsx`.
- **Non-destructive updates:** `registerType: 'autoUpdate'` + `cleanupOutdatedCaches: true` updates only the Workbox static asset cache; IndexedDB (`ResilioDatabase` tables `kv`, `state`, `cursors`) is never cleared on service worker updates.

## 3. Airplane Mode Test Procedure (`docs/SETUP.md` §5)

Repeat on both phones:

1. Load the app online; **"Add to Home Screen" / install**.
2. Open once, create an item (confirms storage works).
3. Turn on **airplane mode**; close and reopen the app $\rightarrow$ must load and show data.
4. Perform operations offline; verify they persist after killing the app.
5. Exchange state via **QR**; verify identical totals on both phones.
6. *(P1)* Put both phones on one hotspot; test **WebRTC**; if it fails, record the hotspot/OS and fall back to QR.

## 4. Device Test Results

> **Note:** Only record `PASS` / `FAIL` after physically running the procedure above on the actual device.

| Device | OS | Browser | Pass/Fail | Notes |
|---|---|---|---|---|
| *(pending physical test)* | | | `NOT TESTED` | |
| *(pending physical test)* | | | `NOT TESTED` | |
