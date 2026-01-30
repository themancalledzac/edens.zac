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

## Type Safety Checklist

- [ ] No `any` types used
- [ ] All functions have explicit return types
- [ ] Component props are properly typed
- [ ] API responses match TypeScript types
- [ ] Type guards used for runtime type checking
- [ ] Type-only imports used where appropriate
- [ ] Generic types used for reusable functions
- [ ] TypeScript compiles without errors (`tsc --noEmit`)
