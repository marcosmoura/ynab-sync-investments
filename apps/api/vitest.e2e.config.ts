/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  cacheDir: '../../../node_modules/.vite/apps/api/e2e',
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.e2e.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../../coverage/apps/api/e2e',
      provider: 'v8',
    },
    globalSetup: ['./tests/e2e/global-setup.ts'],
    setupFiles: ['./tests/e2e/test-setup.ts'],
  },
});
