/// <reference types="vitest" />
import { resolve } from 'path';

import swc from 'unplugin-swc';
import { defineConfig } from 'vite';

export default defineConfig({
  cacheDir: '../../node_modules/.vite/apps/api',

  // Build configuration for Node.js
  build: {
    target: 'node18',
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, 'src/main.ts'),
      formats: ['cjs'],
      fileName: 'main',
    },
    rollupOptions: {
      external: [
        // Node.js built-ins
        'fs',
        'path',
        'crypto',
        'os',
        'util',
        'events',
        'stream',
        'http',
        'https',
        'url',
        'querystring',
        // All dependencies should be external for Node.js apps
        /^@nestjs/,
        /^rxjs/,
        /^typeorm/,
        /^pg/,
        /^class-transformer/,
        /^class-validator/,
        /^reflect-metadata/,
        /^dotenv/,
      ],
      output: {
        banner: '#!/usr/bin/env node',
        dir: 'dist/apps/api',
      },
    },
    minify: false,
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },

  plugins: [
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        target: 'esnext',
        parser: {
          syntax: 'typescript',
          decorators: true,
        },
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true,
          optimizer: {
            simplify: true,
          },
        },
      },
    }),
  ],

  // Test configuration (reusing existing vitest config)
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{spec,spec-e2e}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      reportsDirectory: '../../coverage/apps/api/unit',
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
