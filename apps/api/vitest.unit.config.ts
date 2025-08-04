/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: '../../../node_modules/.vite/apps/api/unit',

  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['src/**/*.e2e.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../../coverage/apps/api/unit',
      provider: 'v8',
      include: ['src/**/*.{js,ts,jsx,tsx}'],
      exclude: [
        'src/**/*.test.{js,ts,jsx,tsx}',
        'src/**/*.e2e.{js,ts,jsx,tsx}',
        'src/**/index.{js,ts,jsx,tsx}',
        'src/main.{js,ts,jsx,tsx}',
        'src/**/app.e2e.{js,ts,jsx,tsx}',
      ],
    },
  },
});
