/// <reference types="vitest" />
import { resolve } from 'path';

import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: '../../../node_modules/.vite/apps/api/unit',
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{spec,spec-e2e}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      reportsDirectory: '../../../coverage/apps/api/unit',
      provider: 'v8',
      include: ['src/**/*.{js,ts,jsx,tsx}'],
      exclude: [
        'src/**/*.{spec,spec-e2e}.{js,ts,jsx,tsx}',
        'src/**/index.{js,ts,jsx,tsx}',
        'src/main.{js,ts,jsx,tsx}',
      ],
    },
  },
});
