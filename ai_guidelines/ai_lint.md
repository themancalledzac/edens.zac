# ESLint & Code Quality Standards

## ESLint Configuration

- **Config file**: `eslint.config.mjs`
- **Fix proactively**: Unused imports, `any` types, formatting issues
- **Type safety**: Prefer specific types over `any`
- **Import sorting**: Use simple-import-sort for consistent imports

## Code Quality Rules

### TypeScript Standards
- **No `any` types**: Always use proper TypeScript types
- **Strict mode**: Enable strict TypeScript checking
- **Type imports**: Use `import type` for type-only imports
- **Explicit return types**: Use explicit return types for functions

### Import Organization
- Follow the import order defined in `ai_quick_reference.md`
- Remove unused imports automatically
- Group imports logically (external, internal, types, components, utils)

### Code Formatting
- **Prettier**: Use `.prettierrc.json` configuration
- **Format on save**: Enabled in editor
- **Consistent indentation**: 2 spaces
- **Trailing commas**: Use in multi-line objects/arrays

## Post-Change Commands

After making code changes, always run:

```bash
# Run ESLint
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix

# Run TypeScript type checking
npm run type-check  # or tsc --noEmit
```

## Common ESLint Issues & Fixes

### Unused Imports
```typescript
// ❌ Bad
import { useState, useEffect } from 'react';
// useEffect is unused

// ✅ Good
import { useState } from 'react';
```

### Any Types
```typescript
// ❌ Bad
function processData(data: any) {
  return data.map(item => item.value);
}

// ✅ Good
function processData(data: Array<{ value: string }>) {
  return data.map(item => item.value);
}
```

### Import Order
```typescript
// ❌ Bad
import styles from './Component.module.scss';
import { useState } from 'react';
import { fetchData } from '@/app/lib/api/collections';

// ✅ Good
import { useState } from 'react';
import { fetchData } from '@/app/lib/api/collections';
import styles from './Component.module.scss';
```

## Stylelint Configuration

- **Config files**: `.stylelintrc`, `.stylelintrc.cjs`
- **Ignore file**: `.stylelintignore`
- **SCSS modules**: Follow BEM-like naming conventions
- **Consistent spacing**: Use consistent spacing in SCSS

## Pre-commit Checks

Before committing:
1. Run `npm run lint` and fix all issues
2. Run `npm run type-check` to ensure no type errors
3. Run tests: `npm test`
4. Verify no console errors in browser

## Code Review Checklist

- [ ] No `any` types used
- [ ] All imports are used and properly ordered
- [ ] TypeScript compiles without errors
- [ ] ESLint passes with no warnings
- [ ] Code follows project naming conventions
- [ ] Tests pass and coverage is maintained
- [ ] No console.log statements in production code
