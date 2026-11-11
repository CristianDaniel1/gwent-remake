import js from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { oneComponentPerFile } from './eslint/one-component-per-file.js';

const el = (type) => ({ element: { type } });
const policy = (from, to) => ({ from: el(from), allow: to.map((t) => ({ to: el(t) })) });

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      'apps/web/public/**',
      'apps/server/src/generated/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node } },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },

  // Package boundaries: web/server -> shared -> engine; the engine depends on nothing.
  {
    files: ['apps/**/*.{ts,tsx}', 'packages/**/*.ts'],
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'engine', pattern: 'packages/engine' },
        { type: 'shared', pattern: 'packages/shared' },
        { type: 'web', pattern: 'apps/web' },
        { type: 'server', pattern: 'apps/server' },
      ],
      'import/resolver': { typescript: true, node: true },
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            policy('engine', ['engine']),
            policy('shared', ['shared', 'engine']),
            policy('web', ['web', 'shared', 'engine']),
            policy('server', ['server', 'shared', 'engine']),
          ],
        },
      ],
    },
  },
  // Packages are only consumed through their public API (index.ts).
  {
    files: ['apps/**/*.{ts,tsx}', 'packages/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@gwent/*/*'], message: "Import only from the package's public API." },
          ],
        },
      ],
    },
  },
  // The engine is pure: no DOM, no React.
  {
    files: ['packages/engine/**/*.ts'],
    languageOptions: { globals: {} },
    rules: {
      'no-restricted-globals': ['error', 'window', 'document', 'localStorage', 'fetch'],
    },
  },
  // Nest: classes injected in the constructor must be imported as values (decorator
  // metadata). With these options typescript-eslint understands that and does not ask for `import type`.
  {
    files: ['apps/server/**/*.ts'],
    languageOptions: {
      parserOptions: { emitDecoratorMetadata: true, experimentalDecorators: true },
    },
  },
  // CommonJS config files
  {
    files: ['**/*.config.js', '**/rspack.config.js'],
    languageOptions: { sourceType: 'commonjs', globals: { ...globals.node } },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  // React
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      local: { rules: { 'one-component-per-file': oneComponentPerFile } },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Components and helpers as arrow functions; object shapes as interfaces
      'func-style': ['error', 'expression'],
      'prefer-arrow-callback': 'error',
      'arrow-body-style': ['error', 'as-needed'],
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      // Arrow functions are not hoisted: using one before its line can fail at load time
      '@typescript-eslint/no-use-before-define': ['error', { ignoreTypeReferences: true }],
    },
  },
  {
    files: ['apps/web/**/*.tsx'],
    rules: { 'local/one-component-per-file': 'error' },
  },
  prettier,
);
