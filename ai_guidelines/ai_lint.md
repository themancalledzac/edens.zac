# ESLint & Code Quality Standards

## ESLint Configuration

- **Config file**: `eslint.config.mjs`
- **Fix proactively**: Unused imports, `any` types, formatting issues
- **Import sorting**: Use simple-import-sort for consistent imports (see `ai_quick_reference.md` for order)

## Post-Change Commands

`npm` and `npx` are not on PATH. Use the Homebrew node binary directly:

```bash
# Run ESLint
/opt/homebrew/bin/node node_modules/.bin/eslint app/ --max-warnings 0

# Fix auto-fixable issues
/opt/homebrew/bin/node node_modules/.bin/eslint app/ --fix

# Run TypeScript type checking
/opt/homebrew/bin/node node_modules/.bin/tsc --noEmit
```

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
