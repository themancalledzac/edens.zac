# ESLint & Code Quality Standards

## ESLint Configuration

- **Config file**: `eslint.config.mjs`
- **Fix proactively**: Unused imports, `any` types, formatting issues
- **Import sorting**: Use simple-import-sort for consistent imports (see `ai_quick_reference.md` for order)

## Post-Change Commands

After editing files, run ESLint fix, then Prettier, then type check. **Order matters**: `eslint --fix`
rewrites import blocks, so Prettier must run last or it will re-wrap them and leave the tree
unformatted. **Scope the commands to the files you actually changed** — running them across the whole
tree rewrites unrelated files and pollutes the diff.

```bash
# Lint fix first (matches Cursor's source.fixAll.eslint on save)
npx eslint --fix <files>
# Format last (matches .prettierrc.json)
npx prettier --write <files>
# Type check LAST of all — an ESLint autofix can break types (see below)
npx tsc --noEmit
```

Always re-run `tsc` **after** `eslint --fix`, never only before. `unicorn/no-useless-undefined`
strips the argument from `jest.fn().mockResolvedValue(undefined)`, and the resulting
`mockResolvedValue()` fails to type-check for a `Promise<void>` mock. Write those as
`jest.fn(() => Promise.resolve())`, which satisfies both tools.

For SCSS files, also run Stylelint:

```bash
npx stylelint --fix <files>
```

Full-tree check before a commit (not while editing): `npx eslint app/ --max-warnings 0`.

## Common ESLint Issues & Fixes

### Unused Imports

```typescript
// Bad - useEffect is unused
import { useState, useEffect } from 'react';

// Good
import { useState } from 'react';
```

### Import Order

```typescript
// Bad
import styles from './Component.module.scss';
import { useState } from 'react';
import { fetchData } from '@/app/lib/api/collections';

// Good
import { useState } from 'react';
import { fetchData } from '@/app/lib/api/collections';
import styles from './Component.module.scss';
```

## Stylelint Configuration

- **Config files**: `.stylelintrc`, `.stylelintrc.cjs`
- **Ignore file**: `.stylelintignore`
- **SCSS modules**: Follow BEM-like naming conventions
- **Consistent spacing**: Use consistent spacing in SCSS

## Code Formatting

- **Prettier**: Use `.prettierrc.json` configuration
- **Consistent indentation**: 2 spaces
- **Trailing commas**: Use in multi-line objects/arrays

## Pre-commit Checks

Before committing:

1. Run ESLint and fix all issues
2. Run type checking (`tsc --noEmit`)
3. Run tests
4. Verify no console errors in browser

## Code Review Checklist

- [ ] All imports are used and properly ordered
- [ ] ESLint passes with no warnings
- [ ] TypeScript compiles without errors
- [ ] Code follows project naming conventions
- [ ] Tests pass and coverage is maintained
- [ ] No console.log statements in production code

**Note**: For TypeScript type safety rules (no `any`, type guards, type imports, React 19 types), see `ai_typescript.md`.
