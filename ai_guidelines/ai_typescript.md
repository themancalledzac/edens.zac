# TypeScript Guidelines

## Type Safety Standards

### No `any` Types

- **Never use `any`**: Always use proper TypeScript types
- **Use `unknown`**: When type is truly unknown, use `unknown` and narrow it
- **Type assertions**: Use sparingly and only when necessary
- **Type guards**: Create type guard functions for runtime type checking

```typescript
// ❌ Bad
function processData(data: any) {
  return data.map(item => item.value);
}

// ✅ Good
function processData(data: Array<{ value: string }>) {
  return data.map(item => item.value);
}

// ✅ Good - with type guard
function isString(value: unknown): value is string {
  return typeof value === 'string';
}
```

## Type Definitions

### Use Types from `app/types/`

- Import types from centralized type definitions
- Don't redefine types that already exist
- Keep types in sync with backend models

```typescript
// ✅ Good
import { type Collection, type ContentBlock } from '@/app/types/Collection';

function processCollection(collection: Collection): void {
  // Use the imported type
}
```

### Type Organization

- **Types file**: `app/types/Collection.ts` for Collection-related types
- **Shared types**: Use `app/types/` for shared type definitions
- **Component types**: Define component-specific types near the component

## Type Patterns

### Function Types

```typescript
// Explicit return types
function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// Async functions
async function fetchData(id: string): Promise<Data> {
  const response = await fetch(`/api/data/${id}`);
  return response.json();
}
```

### Component Props Types

```typescript
// Interface for props
interface ComponentProps {
  title: string;
  items: Item[];
  onSelect?: (item: Item) => void;
}

export default function Component({ title, items, onSelect }: ComponentProps) {
  // Component implementation
}
```

### Generic Types

```typescript
// Use generics for reusable functions
function getFirst<T>(array: T[]): T | undefined {
  return array[0];
}

// Constrained generics
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
```

## React 19 Event Types

React 19 deprecated several event types. Always use the non-deprecated replacements:

| Event Handler         | Deprecated  | Correct (React 19)                 |
| --------------------- | ----------- | ---------------------------------- |
| `onSubmit`            | `FormEvent` | `SubmitEvent<HTMLFormElement>`     |
| `onChange` (input)    | —           | `ChangeEvent<HTMLInputElement>`    |
| `onChange` (textarea) | —           | `ChangeEvent<HTMLTextAreaElement>` |

### Import Rules

- **Never** use `import React from 'react'` or `import React, { ... } from 'react'`
- **Always** use named imports: `import { type SubmitEvent, useState } from 'react'`
- Use `type` keyword for type-only imports

```typescript
// ✅ Good - named imports, React 19 types
import { type ChangeEvent, type SubmitEvent, useCallback, useState } from 'react';

const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
  e.preventDefault();
};

const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
  setValue(e.target.value);
};

// ❌ Bad - namespace import
import React from 'react';
const handleSubmit = (e: React.FormEvent) => { ... };

// ❌ Bad - deprecated FormEvent
import { type FormEvent } from 'react';
const handleSubmit = (e: FormEvent) => { ... };
```

## Type Imports

### Type-Only Imports

```typescript
// ✅ Good - type-only import
import { type Collection } from '@/app/types/Collection';

// ✅ Good - mixed import
import { fetchCollection, type Collection } from '@/app/lib/api/collections';

// ❌ Bad - importing type as value
import { Collection } from '@/app/types/Collection';
// Then using Collection as a type (works but not optimal)
```

## Type Guards

### Creating Type Guards

```typescript
// Type guard for ContentBlock
function isImageBlock(block: ContentBlock): block is ImageContentBlock {
  return block.type === 'IMAGE';
}

// Usage
function processBlock(block: ContentBlock) {
  if (isImageBlock(block)) {
    // TypeScript knows block is ImageContentBlock here
    console.log(block.s3Key);
  }
}
```

## Utility Types

### Common Utility Types

```typescript
// Partial - make all properties optional
type PartialCollection = Partial<Collection>;

// Pick - select specific properties
type CollectionSummary = Pick<Collection, 'id' | 'title' | 'slug'>;

// Omit - exclude specific properties
type CollectionWithoutId = Omit<Collection, 'id'>;

// Readonly - make all properties readonly
type ReadonlyCollection = Readonly<Collection>;
```

## Type Assertions

### When to Use

- Only when you're certain about the type
- After runtime checks
- With API responses that you've validated

```typescript
// ✅ Good - after validation
if (isCollection(data)) {
  const collection = data as Collection;
}

// ❌ Bad - unsafe assertion
const collection = data as Collection; // No validation
```

## Strict TypeScript Configuration

### tsconfig.json Settings

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

## Enum Usage

When a type uses an enum (e.g., `CollectionType`), always use the enum value — not a raw string literal:

```typescript
import { CollectionType } from '@/app/types/Collection';

// ✅ Good
const model: CollectionModel = { type: CollectionType.PORTFOLIO, ... };

// ❌ Bad - string literal won't satisfy enum type
const model: CollectionModel = { type: 'PORTFOLIO', ... };
```

## Known Type Issues

### React 18 → 19 Runtime Upgrade (RESOLVED 2026-06-06)

**Status**: ✅ Resolved. The runtime is now React 19; runtime and types are aligned.

The project uses `react`/`react-dom: ^19.2.7` (runtime) with `@types/react: ^19.2.10` and
`@types/react-dom: ^19.2.3` (types). The prior 18-runtime / 19-types mismatch is gone.

The upgrade was transparent: `tsc` clean and the full jest suite green with **no source changes**.
`types-react-codemod preset-19` was run and produced no _necessary_ changes — the codebase was
already authored against the React 19 types, so its only proposals were spurious (`RefObject<T>`
null-widening that reduced precision) or rule-violating (`ReactElement<any>`, which trips
`@typescript-eslint/no-explicit-any`); all were reverted. The migration surface was tiny: one
`forwardRef` (`Tile.tsx`, still valid in 19), two `createContext` (`.Provider` still valid), no
string refs, no bare `useRef()`, no `propTypes`/`defaultProps`, no legacy `ReactDOM` APIs.

`SubmitEvent<HTMLFormElement>` (imported from `react`) works under the React 19 runtime and is
kept as-is — see the **React 19 Event Types** section above.

### Dependency Notes (as of 2026-06)

- `react` / `react-dom: ^19.2.7` - upgraded from `^18.3.1` (2026-06-06).
- `lucide-react: ^1.17.0` - upgraded from `^0.399.0` (a `0.x` → `1.x` major bump; named-icon
  import API is stable, verified via `tsc` + `next build`).
- The former React-19 blockers (`@react-spring/parallax`, `react-zoom-pan-pinch`, MUI) are no
  longer dependencies — they were removed in the chapter-006 dead-dep cleanup, which is what
  unblocked this upgrade.

## Type Safety Checklist

- [ ] No `any` types used
- [ ] All functions have explicit return types
- [ ] Component props are properly typed
- [ ] API responses match TypeScript types
- [ ] Type guards used for runtime type checking
- [ ] Type-only imports used where appropriate
- [ ] Generic types used for reusable functions
- [ ] TypeScript compiles without errors (`tsc --noEmit`)
