import eslint from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unicornPlugin from 'eslint-plugin-unicorn';
import tseslint from 'typescript-eslint';

import { noInlineCommentsInFunctions } from './eslint-rules/no-inline-comments-in-functions.js';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,

  /**
   * Files to ignore.
   *
   * The `.next-*` and worktree entries are not cosmetic: every one of these directories is
   * gitignored build output or a checkout copy (.gitignore lines 122, 123, 156, 158, 159), and
   * leaving them in scope made `npm run lint:js` report 68,391 problems instead of the 9 real
   * ones — which is the same as having no lint at all. NEVER "fix" the survivors with
   * `eslint --fix`: unicorn/no-useless-undefined strips required arguments and breaks `tsc` on
   * five files.
   */
  {
    ignores: [
      '**/node_modules/**',
      '.next/**',
      '.next-*/**',
      'out/**',
      'dist/**',
      'build/**',
      'public/**',
      'coverage/**',
      '**/*.d.ts',
      '.worktrees/**',
      '.claude/worktrees/**',
      '.claire/**',
    ],
  },

  /** TypeScript rules. */
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
    },
  },

  /** React and Hooks rules. */
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
      'react/react-in-jsx-scope': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': ['warn', { additionalHooks: '' }],
    },
    settings: {
      react: { version: 'detect' },
    },
  },

  /** Unicorn — common best practices. */
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
      'unicorn/no-hex-escape': 'error',
      'unicorn/no-instanceof-array': 'error',
      'unicorn/no-lonely-if': 'error',
      /**
       * OFF: directly contradicts Prettier 3, which strips the parentheses this rule demands
       * around nested ternaries. With both enabled the two autofixers undo each other on every
       * run, so `prettier --write` and `eslint --fix` could never both be satisfied and the
       * tree drifted a little further each time. Prettier owns formatting; this rule is purely
       * stylistic, so it yields.
       */
      'unicorn/no-nested-ternary': 'off',
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

  /** Next.js core-web-vitals. */
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: { '@next/next': nextPlugin },
    rules: {
      ...nextPlugin.configs['core-web-vitals'].rules,
      '@next/next/no-img-element': 'off',
    },
  },

  /** Import sorting. */
  {
    plugins: { 'simple-import-sort': simpleImportSort },
    rules: {
      'simple-import-sort/exports': 'error',
      'simple-import-sort/imports': 'error',
    },
  },

  /**
   * The inline-comment rule (board item G2a).
   *
   * Both blocks are `warn`, not `error`, and stay that way until the G2b migration merges:
   * 2,892 comments across 247 files in `app/` and `tests/` still sit inside function bodies,
   * and reporting them as errors today would bury every other lint result and fail CI on
   * untouched files. Flip both to `error` once G2b-app and G2b-tests have landed.
   *
   * Scoped to the two source trees rather than `**\/*`, so root config files are out of scope.
   */
  {
    files: ['app/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    plugins: {
      local: { rules: { 'no-inline-comments-in-functions': noInlineCommentsInFunctions } },
    },
    rules: {
      'local/no-inline-comments-in-functions': 'warn',
      'no-restricted-syntax': [
        'warn',
        {
          selector: 'JSXExpressionContainer > JSXEmptyExpression',
          message:
            'No {/* */} comments in JSX. Move the why into the docblock of the component it explains.',
        },
      ],
    },
  }
);
