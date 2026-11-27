import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const NGROK_HOSTS = ['.ngrok-free.dev', '.ngrok-free.app', '.ngrok.io'];

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: NGROK_HOSTS,
  },
  preview: {
    allowedHosts: NGROK_HOSTS,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@resiliolog/crdt-core': path.resolve(__dirname, '../crdt-core/src/index.ts'),
      '@resiliolog/sync': path.resolve(__dirname, '../sync/src/index.ts'),
    },
  },
});
