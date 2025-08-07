/// <reference types="vitest" />
import { resolve } from 'path';

import swc from 'unplugin-swc';
import { defineConfig } from 'vite';

export default defineConfig({
  cacheDir: '../../node_modules/.vite/apps/api-playground',

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
        'child_process',
        // All dependencies should be external for Node.js apps
        /^@nestjs/,
        /^rxjs/,
        /^pg/,
        /^class-transformer/,
        /^class-validator/,
        /^reflect-metadata/,
        /^dotenv/,
      ],
      output: {
        banner: '#!/usr/bin/env node',
        dir: 'dist/apps/api-playground',
      },
    },
    minify: false,
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
});
