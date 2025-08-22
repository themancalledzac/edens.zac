// eslint.config.mjs
import eslint from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unicornPlugin from 'eslint-plugin-unicorn';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Base configurations
  eslint.configs.recommended,
  ...tseslint.configs.recommended,

  // Files to ignore
  {
    ignores: [
      '**/node_modules/**',
      '.next/**',
      'out/**',
      'dist/**',
      'build/**',
      'public/**',
      'coverage/**',
      '**/*.d.ts',
    ],
  },

  // TypeScript specific rules
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports', fixStyle: 'inline-type-imports' }],
    },
  },

  // React & Hooks specific rules
  {
    files: ['**/*.{jsx,tsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      'react/jsx-boolean-value': ['error', 'never'],
      'react/jsx-curly-brace-presence': ['error', { props: 'never', children: 'never' }],
      'react/jsx-fragments': ['error', 'syntax'],
      'react/jsx-no-useless-fragment': 'error',
      'react/no-array-index-key': 'error',
      'react/self-closing-comp': 'error',
      'react/react-in-jsx-scope': 'off', // Not needed in Next.js
      // Hooks
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': ['warn', { additionalHooks: '' }],
      // Disallow default exports in component files
      // 'no-restricted-syntax': [
      //   'warn',
      //   {
      //     selector: 'ExportDefaultDeclaration',
      //     message: 'Default exports are discouraged for React components. Use named exports.',
      //   },
      // ],
    },
    settings: {
      react: { version: 'detect' },
    },
  },

  // Unicorn plugin (common best practices)
  {
    plugins: { unicorn: unicornPlugin },
    rules: {
      'unicorn/better-regex': 'error',
      'unicorn/catch-error-name': 'error',
      'unicorn/consistent-destructuring': 'error',
      'unicorn/error-message': 'error',
      'unicorn/escape-case': 'error',
      'unicorn/explicit-length-check': 'error',
      'unicorn/new-for-builtins': 'error',
      'unicorn/no-abusive-eslint-disable': 'error',
      'unicorn/no-array-for-each': 'error',
      'unicorn/no-array-push-push': 'error',
      'unicorn/no-console-spaces': 'error',
      'unicorn/no-empty-file': 'error',
      'unicorn/no-hex-escape': 'error',
      'unicorn/no-instanceof-array': 'error',
      'unicorn/no-lonely-if': 'error',
      'unicorn/no-nested-ternary': 'error',
      'unicorn/no-new-array': 'error',
      'unicorn/no-null': 'off',
      'unicorn/no-object-as-default-parameter': 'error',
      'unicorn/no-useless-undefined': 'error',
      'unicorn/prefer-add-event-listener': 'error',
      'unicorn/prefer-array-find': 'error',
      'unicorn/prefer-array-flat': 'error',
      'unicorn/prefer-array-flat-map': 'error',
      'unicorn/prefer-array-index-of': 'error',
      'unicorn/prefer-array-some': 'error',
      'unicorn/prefer-date-now': 'error',
      'unicorn/prefer-default-parameters': 'error',
      'unicorn/prefer-includes': 'error',
      'unicorn/prefer-number-properties': 'error',
      'unicorn/prefer-optional-catch-binding': 'error',
      'unicorn/prefer-string-slice': 'error',
      'unicorn/prefer-string-starts-ends-with': 'error',
      'unicorn/prefer-string-trim-start-end': 'error',
      'unicorn/prefer-ternary': 'error',
    },
  },

  // Allow default export for Next.js pages and API route files
  {
    files: ['pages/**/*.{js,jsx,ts,tsx}'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },

  // Next.js plugin (core-web-vitals)
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: { '@next/next': nextPlugin },
    rules: {
      ...nextPlugin.configs['core-web-vitals'].rules,
      '@next/next/no-img-element': 'off', // allow <img> if needed, prefer next/image
    },
  },

  // Import sorting
  {
    plugins: { 'simple-import-sort': simpleImportSort },
    rules: {
      'simple-import-sort/exports': 'error',
      'simple-import-sort/imports': 'error',
    },
  },
);