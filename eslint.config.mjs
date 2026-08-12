import eslint from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import jsdoc from 'eslint-plugin-jsdoc'
import perfectionist from 'eslint-plugin-perfectionist'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import unicorn from 'eslint-plugin-unicorn'
import tseslint from 'typescript-eslint'
import globals from 'globals'

const reactHooksConfig = reactHooks.configs['recommended-latest'] ?? reactHooks.configs.recommended

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'docs/**',
      'node_modules/**',
      'src-tauri/**',
      'src/**/__fixtures__/**',
    ],
  },

  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    extends: [eslint.configs.recommended, eslintConfigPrettier],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    extends: [
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },

  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      perfectionist,
      jsdoc,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    extends: [jsdoc.configs['flat/recommended']],
    rules: {
      ...reactHooksConfig.rules,
      'react-refresh/only-export-components': ['error', { allowConstantExport: true }],
      'react-hooks/exhaustive-deps': 'error',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      'jsdoc/require-jsdoc': 'off',
      'jsdoc/require-returns': 'off',
      'jsdoc/require-param': 'off',
      'perfectionist/sort-imports': 'error',
      'perfectionist/sort-named-imports': 'error',
      'perfectionist/sort-named-exports': 'error',
      'perfectionist/sort-exports': 'off',
      'perfectionist/sort-objects': 'off',
      'perfectionist/sort-object-types': 'off',
      'perfectionist/sort-interfaces': 'off',
      'perfectionist/sort-union-types': 'off',
      'perfectionist/sort-intersection-types': 'off',
      'perfectionist/sort-modules': 'off',
      'perfectionist/sort-jsx-props': 'off',
      'perfectionist/sort-array-includes': 'off',
      'perfectionist/sort-enums': 'off',
      'perfectionist/sort-maps': 'off',
      'perfectionist/sort-sets': 'off',
    },
  },

  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [unicorn.configs.recommended],
    rules: {
      'unicorn/filename-case': 'off',
      'unicorn/name-replacements': 'off',
      'unicorn/consistent-boolean-name': 'off',
      'unicorn/no-null': 'off',
      'unicorn/no-array-reduce': 'off',
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/prefer-iterator-to-array': 'off',
      'unicorn/prefer-iterator-helpers': 'off',
      'unicorn/prefer-global-this': 'off',
      'unicorn/no-declarations-before-early-exit': 'off',
      'unicorn/number-literal-case': 'off',
      'unicorn/max-nested-calls': 'off',
    },
  },

  {
    files: ['vite.config.ts', 'vitest.config.ts', 'scripts/**/*.mjs', '*.config.mjs'],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      'unicorn/no-process-exit': 'off',
      'no-console': 'off',
    },
  },
)
