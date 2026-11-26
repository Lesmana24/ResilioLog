#!/usr/bin/env bash
# One-shot dependency install. Resolves the CURRENT versions at run time (no versions are guessed in this repo).
# After it finishes: commit pnpm-lock.yaml and record installed versions in docs/TECH-STACK.md (section 9).
set -euo pipefail
corepack enable
corepack prepare pnpm@latest --activate

pnpm add -Dw typescript vitest fast-check @types/node prettier
pnpm --filter @resiliolog/sync add fflate zod
# packages/app is created by Role C (React + Vite). When it exists:
#   pnpm --filter @resiliolog/app add react react-dom dexie qrcode qr-scanner
#   pnpm --filter @resiliolog/app add -D vite @vitejs/plugin-react vite-plugin-pwa @vitejs/plugin-basic-ssl @types/react @types/react-dom @types/qrcode

pnpm install
pnpm typecheck
pnpm test
echo "Bootstrap OK. Next: commit pnpm-lock.yaml and start PLAN.md B-02."
