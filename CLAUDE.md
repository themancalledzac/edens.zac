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

## Running Tests & Verification (canonical)

> **Single source of truth for all run/verify commands.** `ai_test.md` and `ai_lint.md` point here — do not re-list these commands there.

`npm` and `npx` are not on PATH. Use the Homebrew node binary directly.

### Tests (Jest)

```bash
# All tests
/opt/homebrew/bin/node node_modules/.bin/jest
# Single file
/opt/homebrew/bin/node node_modules/.bin/jest tests/utils/contentLayout.test.ts
# Watch mode
/opt/homebrew/bin/node node_modules/.bin/jest --watch
# With coverage
/opt/homebrew/bin/node node_modules/.bin/jest --coverage
```

### Format / Lint / Type-check

After editing files, run the same pipeline Cursor runs on save — Prettier, then ESLint fix, then type check:

```bash
# Format (matches .prettierrc.json)
/opt/homebrew/bin/node node_modules/.bin/prettier --write <files>
# Lint fix (matches Cursor's source.fixAll.eslint on save)
/opt/homebrew/bin/node node_modules/.bin/eslint --fix <files>
# Lint the whole app, no warnings allowed
/opt/homebrew/bin/node node_modules/.bin/eslint app/ --max-warnings 0
# Type check
/opt/homebrew/bin/node node_modules/.bin/tsc --noEmit
```

For SCSS files, also run Stylelint:

```bash
/opt/homebrew/bin/node node_modules/.bin/stylelint --fix <files>
```

## Common Mistakes to Avoid

See the full checklist in [`ai_guidelines/ai_quick_reference.md`](ai_guidelines/ai_quick_reference.md#common-mistakes-to-avoid) (prefer Server Components, no `any`, SCSS modules per component, URL state over Context, `next/image` with CloudFront URLs, named React imports, etc.).

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
