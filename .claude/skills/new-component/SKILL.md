---
name: new-component
description: >
  Scaffold a new React component with SCSS module following project conventions.
  Creates a PascalCase component directory with a .tsx file and .module.scss file.
  Optionally adds a test stub. Invoke with /new-component [ComponentName].
disable-model-invocation: true
argument-hint: "[ComponentName]"
allowed-tools: Read Write Glob
metadata:
  author: edens-zac
  version: "1.0"
---

# New Component Skill

Scaffold a new component following edens.zac conventions.

## Instructions

1. Determine the component name from the argument (PascalCase, e.g. `ImageGrid`)
2. Determine the target directory — ask the user or infer from context:
   - General UI: `app/components/ComponentName/`
   - Content rendering: `app/components/Content/ComponentName/` (or same dir if small)
   - Admin: `app/(admin)/collection/manage/[[...slug]]/ComponentName/`
3. Create the `.tsx` file
4. Create the `.module.scss` file
5. If the component has logic worth testing, offer to create a test stub in `tests/`

## Component Template

```tsx
// app/components/ComponentName/ComponentName.tsx
import React from 'react';

import styles from './ComponentName.module.scss';

interface ComponentNameProps {
  // TODO: add props
}

export default function ComponentName({ }: ComponentNameProps) {
  return (
    <div className={styles.root}>
      {/* TODO */}
    </div>
  );
}
```

**Notes:**
- No `'use client'` unless component uses hooks, browser APIs, or event handlers
- Props interface above component, exported only if needed externally
- Use `styles.camelCase` class names — never inline styles
- Import order: React → lib/api → types → components → utils → constants → styles

## SCSS Module Template

```scss
// app/components/ComponentName/ComponentName.module.scss
.root {
  // mobile-first base styles

  @media (width >= 768px) {
    // desktop overrides
  }
}
```

**Notes:**
- camelCase class names
- Mobile-first: base = mobile, `@media (width >= 768px)` for desktop
- Use `gap` for flex spacing, NOT `padding-right/bottom` on children
- Container queries for component-level responsiveness

## Test Stub Template (optional)

```typescript
// tests/components/ComponentName/ComponentName.test.ts
import { ComponentName } from '@/app/components/ComponentName/ComponentName';

describe('ComponentName', () => {
  it('renders without crashing', () => {
    // TODO
  });
});
```

## Checklist

- [ ] `.tsx` created with correct name
- [ ] `.module.scss` created with correct name
- [ ] No `any` types in props
- [ ] No unnecessary `'use client'`
- [ ] Class names are camelCase
- [ ] Mobile-first styles
