---
description: Frontend Portfolio Repository Rules for AI Agents
globs:
alwaysApply: true
---

# Project Rules

## Critical Rules

- **Context First**: Always ask for more context when it will help make a better decision. Do this before writing code.
- **App Router First**: All new features must use Next.js App Router (`app/` directory). Never modify legacy Pages Router files.
- **Server Components Default**: Minimize `'use client'` usage. Prefer Server Components for data fetching and rendering.
- **Type Safety**: No `any` types. Use strict TypeScript with proper type definitions from `app/types/`.
- **Testing Required**: All new API functions and utility functions must have corresponding tests in `tests/`.

## Running Tests

`npm` and `npx` are not on PATH. Use the Homebrew node binary directly:

```bash
/opt/homebrew/bin/node node_modules/.bin/jest
```

Common flags:

- All tests: `/opt/homebrew/bin/node node_modules/.bin/jest`
- Single file: `/opt/homebrew/bin/node node_modules/.bin/jest tests/utils/contentLayout.test.ts`
- Watch mode: `/opt/homebrew/bin/node node_modules/.bin/jest --watch`

## Formatting & Verification

After editing files, run ESLint fix, then Prettier, then type check. **Order matters**: `eslint --fix`
rewrites import blocks, so Prettier must run last or it will re-wrap them and leave the tree
unformatted. **Scope the commands to the files you actually changed** — running them across the whole
tree rewrites unrelated files and pollutes the diff.

```bash
# Lint fix first (matches Cursor's source.fixAll.eslint on save)
/opt/homebrew/bin/node node_modules/.bin/eslint --fix <files>
# Format last (matches .prettierrc.json)
/opt/homebrew/bin/node node_modules/.bin/prettier --write <files>
# Type check LAST of all — an ESLint autofix can break types (see below)
/opt/homebrew/bin/node node_modules/.bin/tsc --noEmit
```

Always re-run `tsc` **after** `eslint --fix`, never only before. `unicorn/no-useless-undefined`
strips the argument from `jest.fn().mockResolvedValue(undefined)`, and the resulting
`mockResolvedValue()` fails to type-check for a `Promise<void>` mock. Write those as
`jest.fn(() => Promise.resolve())`, which satisfies both tools.

For SCSS files, also run Stylelint:

```bash
/opt/homebrew/bin/node node_modules/.bin/stylelint --fix <files>
```

## Common Mistakes to Avoid

- Writing comments inside React component code (JSX `{/* ... */}` or inline `//` in component bodies) - documentation belongs in docblocks (JSDoc above the file/component/function) only
- Using `'use client'` unnecessarily - prefer Server Components
- Using `any` type - always use proper TypeScript types
- Creating components without corresponding SCSS modules
- Using React Context when URL state would suffice
- Not using `next/image` for images (always use CloudFront URLs)
- Using `import React` namespace - always use named imports from `'react'`

## Modular Guidelines

For detailed guidance on specific topics, refer to the files in `ai_guidelines/`:

| Topic                                       | Reference File                        |
| ------------------------------------------- | ------------------------------------- |
| **Core principles & project context**       | `ai_guidelines/ai_main.md`            |
| **File naming, imports, project structure** | `ai_guidelines/ai_quick_reference.md` |
| **Testing strategy & patterns**             | `ai_guidelines/ai_test.md`            |
| **ESLint & Stylelint config**               | `ai_guidelines/ai_lint.md`            |
| **API patterns & backend integration**      | `ai_guidelines/ai_api.md`             |
| **TypeScript guidelines & known issues**    | `ai_guidelines/ai_typescript.md`      |
| **CSS/SCSS conventions (gap rule)**         | `ai_guidelines/ai_css.md`             |

**Note**: These files are modular and should be referenced when working in the relevant area.
