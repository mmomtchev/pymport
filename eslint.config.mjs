import preferArrow from 'eslint-plugin-prefer-arrow';
import globals from 'globals';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import mocha from 'eslint-plugin-mocha';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
});

export default [
  ...compat.extends('eslint:recommended'),
  {
    plugins: {
      'prefer-arrow': preferArrow,
    },

    languageOptions: {
      globals: {
        ...globals.mocha,
        ...globals.node,
        BigInt64Array: 'readonly',
        BigUint64Array: 'readonly',
      },

      ecmaVersion: 2019,
      sourceType: 'commonjs',
    },

    rules: {
      'max-len': [1, {
        code: 120,
        tabWidth: 2,
        ignoreUrls: true,
      }],

      semi: [2, 'always'],

      quotes: ['error', 'single', {
        avoidEscape: true,
        allowTemplateLiterals: true,
      }],

      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  ...compat.extends(
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
  ).map(config => ({
    ...config,
    files: ['test/*.ts', 'lib/*.d.ts'],
  })),
  {
    files: ['test/*.ts', 'lib/*.d.ts'],

    plugins: {
      '@typescript-eslint': typescriptEslint,
      mocha,
      'prefer-arrow': preferArrow,
    },

    rules: {
      'mocha/no-exclusive-tests': 'error',
      'mocha/no-identical-title': 'error',
      'mocha/no-nested-tests': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['**/*.mjs'],

    languageOptions: {
      ecmaVersion: 5,
      sourceType: 'module',
    },
  },
];
