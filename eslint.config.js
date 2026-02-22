import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Transitional warnings while the architecture migration is in progress.
      'no-restricted-imports': [
        'warn',
        {
          patterns: [
            {
              group: [
                '../store/**',
                '../../store/**',
                '../../../store/**',
                '../../../../store/**',
                '../db/**',
                '../../db/**',
                '../../../db/**',
                '../../../../db/**',
                '../data/**',
                '../../data/**',
                '../../../data/**',
                '../../../../data/**',
                '../routes/**',
                '../../routes/**',
                '../../../routes/**',
                '../../../../routes/**',
                '../game/**',
                '../../game/**',
                '../../../game/**',
                '../../../../game/**',
              ],
              message: 'Avoid legacy wrapper paths in new code; prefer @state/@platform/@domain/@app/@features aliases.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/domain/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'warn',
        {
          patterns: [
            {
              group: ['@features/*', '**/features/**'],
              message: 'Domain layer should not depend on feature layer modules.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/platform/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'warn',
        {
          patterns: [
            {
              group: ['@app/*', '@features/*', '@state/*', '**/app/**', '**/features/**', '**/state/**'],
              message: 'Platform adapters should stay independent from app/feature/state UI orchestration.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'warn',
        {
          patterns: [
            {
              group: ['@app/*', '@features/*', '@state/*', '@platform/*', '**/app/**', '**/features/**', '**/state/**', '**/platform/**'],
              message: 'Shared modules should not depend on higher-level layers.',
            },
          ],
        },
      ],
    },
  },
])
