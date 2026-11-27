import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@resiliolog/crdt-core': path.resolve(__dirname, '../crdt-core/src/index.ts'),
      '@resiliolog/sync': path.resolve(__dirname, '../sync/src/index.ts'),
    },
  },
  test: {
    include: ['test/**/*.test.ts'],
  },
});
