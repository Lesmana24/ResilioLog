# SETUP — development environment

## 1. Prerequisites
- Node ≥ 20 (use `nvm use` → `.nvmrc` = 22), Git, a code editor, an AI coding agent.
- Two real phones (ideally the demo devices) with Chrome/Safari and a camera.
- Windows: use PowerShell or WSL; run `corepack enable` in an elevated shell if needed; keep LF line endings (`.editorconfig`).

## 2. First 15 minutes
```bash
unzip resiliolog-setup.zip && cd resiliolog-setup
git init && git add . && git commit -m "chore: initial setup docs and scaffold"
./scripts/bootstrap.sh            # installs deps, runs typecheck + test
git add pnpm-lock.yaml && git commit -m "chore: lockfile"
```
Expected: typecheck passes; tests report only `todo` entries (no failures). Then record installed versions in `docs/TECH-STACK.md` §9.
(If the script cannot run, do the commands inside it manually, one by one.)

## 3. Daily commands
```bash
pnpm test                                   # all packages
pnpm --filter @resiliolog/crdt-core test:watch
pnpm typecheck
```

## 4. Starting the app (Role C)
Scaffold React + Vite into `packages/app` following its README, then add dev deps listed in `scripts/bootstrap.sh` comments. Enable `vite-plugin-pwa` and `@vitejs/plugin-basic-ssl`; run the dev server with `--host` so phones on the same Wi-Fi can reach it.

## 5. Testing on phones (important)
Camera access and service workers require **HTTPS** (or localhost). Pick one:
1. **Dev HTTPS:** `vite --host` with basic-ssl; open `https://<laptop-ip>:<port>` on the phone and accept the self-signed certificate warning.
2. **Static HTTPS host:** `vite build`, deploy to GitHub Pages / Netlify / Cloudflare Pages, open the URL on both phones. (Preferred for the final demo.)

Offline test procedure (repeat on both phones):
1. Load the app online; "Add to Home Screen" / install.
2. Open once, create an item (confirms storage works).
3. Turn on airplane mode; close and reopen the app → must load and show data.
4. Perform operations offline; verify they persist after killing the app.
5. Exchange state via QR; verify identical totals on both phones.
6. (P1) Put both phones on one hotspot; test WebRTC; if it fails, record the hotspot/OS and fall back to QR.
Record results (device, OS, browser, pass/fail) in a table — they back CLAIMS CL-06/CL-07.

## 6. Working with the agent
Open the repo root in the agent; it reads `AGENTS.md`/`CLAUDE.md`. Use prompts from `AGENT-PROMPTS.md`, one task at a time, and review with: "Show diff summary, exact commands run with pass/fail output, SPEC-GAPs, and what remains unverified."

## 7. Troubleshooting
| Symptom | Likely cause / fix |
|---|---|
| `pnpm: command not found` | `corepack enable && corepack prepare pnpm@latest --activate` |
| `Cannot find module 'vitest'` | dependencies not installed → run `pnpm install` / bootstrap |
| Camera permission never prompts on phone | page is not HTTPS → see §5 |
| App not available offline | service worker not registered or never loaded online once |
| Phones can't reach dev server | different Wi-Fi, AP client isolation, laptop firewall |
| WebRTC connects on laptop but not phones | hotspot client isolation or ICE/mDNS issue → use QR path |
| Data vanished after clearing browser data | expected (new nodeId); never demo after clearing data |
