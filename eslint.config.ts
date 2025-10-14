import markdown from '@eslint/markdown';
import nx from '@nx/eslint-plugin';
import { globalIgnores } from 'eslint/config';
import importPlugin from 'eslint-plugin-import';
import oxlint from 'eslint-plugin-oxlint';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  ...markdown.configs.recommended,
  globalIgnores(['dist', 'node_modules', '.github/instructions/nx.instructions.md']),
  {
    files: ['**/*.ts', '**/*.js'],
    rules: {
      ...oxlint.configs.recommended.rules,
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            {
              sourceTag: '*',
              onlyDependOnLibsWithTags: ['*'],
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.ts', '**/*.cts', '**/*.mts', '**/*.js', '**/*.cjs', '**/*.mjs'],
    plugins: {
      import: importPlugin,
    },
    // Override or add rules here
    rules: {
      'import/order': [
        'error',
        {
          groups: [
            'builtin', // Node.js built-in modules
            'external', // npm packages
            'internal', // local packages (workspace packages)
            [
              'parent', // relative imports from parent directories
              'sibling', // relative imports from same directory
              'index', // index file imports
            ],
          ],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
          pathGroups: [
            {
              pattern: '@ynab-investments-sync/**',
              group: 'internal',
              position: 'before',
            },
            {
              pattern: '@/**',
              group: 'parent',
              position: 'before',
            },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
        },
      ],
    },
  },
  ...oxlint.configs['flat/recommended'],
  ...oxlint.configs['flat/correctness'],
  ...oxlint.configs['flat/perf'],
];
