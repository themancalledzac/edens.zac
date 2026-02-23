---
name: scss-conventions
description: >
  SCSS module conventions for this project. Use when writing or reviewing styles,
  creating SCSS modules, working with container queries, flexbox layout, CSS custom
  properties, or component-level styling patterns.
user-invocable: false
metadata:
  author: edens-zac
  version: "1.0"
---

# SCSS Conventions

## File Naming

- One SCSS module per component: `ComponentName.module.scss`
- Import in component: `import styles from './ComponentName.module.scss'`
- Class names: **camelCase** (e.g., `.imageWrapper`, `.contentRow`, `.mainTitle`)

## Mobile-First Breakpoints

Always write base styles for mobile first, then layer on desktop:

```scss
.container {
  padding: 0.5rem;                  // mobile default

  @media (width >= 768px) {
    padding: 1rem;                  // desktop override
  }
}
```

Use `width >=` syntax (modern range syntax), not `min-width:`.

## Container Queries

Prefer container queries over media queries for component-level responsiveness:

```scss
.wrapper {
  container-type: inline-size;
  container-name: content-wrapper;
}

.inner {
  font-size: 0.875rem;

  @container content-wrapper (width >= 480px) {
    font-size: 1rem;
  }
}
```

## CSS Custom Properties

Use CSS custom properties for values shared across components or that need JS access:

```scss
.row {
  --row-gap: 0.8rem;
  --slot-width: 5;
  gap: var(--row-gap);
}
```

## Flexbox: Use `gap`, NOT `padding`

**Critical rule** — `gap` sits BETWEEN boxes; `padding` reduces content area INSIDE boxes.

```scss
// ✅ CORRECT
.hbox {
  display: flex;
  gap: 0.8rem;   // LAYOUT.gridGap = 12.8px = 0.8rem
}

// ❌ WRONG - breaks width calculations
.hbox > *:not(:last-child) {
  padding-right: 0.8rem;
}
```

Why it matters: Layout sizes are pre-calculated by subtracting gaps from available width.
Padding eats into the content area after calculation, causing items to be narrower than expected.

## Grid Gap Constant

```typescript
// app/constants/index.ts
LAYOUT.gridGap = 12.8  // 0.8rem at 16px base
```

CSS: `gap: 0.8rem` — keep in sync with `LAYOUT.gridGap`.

## Key SCSS Files

| File | Purpose |
|------|---------|
| `app/components/Content/BoxRenderer.module.scss` | Generic box renderer — all layout patterns |
| `app/styles/globals.css` | Global resets and custom properties |

## Import Pattern

```tsx
import styles from './MyComponent.module.scss';

// Usage
<div className={styles.container}>
  <div className={styles.imageWrapper}>...</div>
</div>
```

## Class Naming Conventions

- Component root: `.root` or descriptive name (`.container`, `.wrapper`)
- State variants: `.isActive`, `.isVisible`, `.hasError`
- Modifiers via composition, not BEM: `className={`${styles.card} ${isSelected ? styles.isSelected : ''}`}`
