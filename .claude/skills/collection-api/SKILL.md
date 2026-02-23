---
name: collection-api
description: >
  Collection and content API patterns for this project. Use when working with
  data fetching, API routes, the lib/api layer, Spring Boot integration,
  cache tags, revalidation, or ContentBlock/ContentCollection types.
user-invocable: false
metadata:
  author: edens-zac
  version: "1.0"
---

# Collection API Patterns

## Backend: Spring Boot

- **Read endpoints**: `/api/read/collections/*`
- **Write endpoints**: `/api/write/collections/*` (localhost/dev only)
- **Dev base URL**: `http://localhost:8080`
- **Prod URL**: via `NEXT_PUBLIC_API_URL` env var
- **CORS**: handled by Next.js proxy routes at `app/api/proxy/`

```typescript
// app/utils/environment.ts
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
```

## API Client Location

All API functions live in `app/lib/api/`:
- `collections.ts` — collection CRUD
- `content.ts` — content block operations
- `core.ts` — shared fetch utilities

## Data Fetching Pattern (RSC)

```typescript
// In Server Components (page.tsx, layout.tsx)
export async function fetchCollectionBySlug(slug: string): Promise<Collection> {
  const response = await fetch(`${API_URL}/read/collections/${slug}`, {
    next: { revalidate: 3600, tags: [`collection-${slug}`] }
  });

  if (!response.ok) {
    notFound(); // or throw
  }

  return response.json();
}
```

## Caching Strategy

- **Time-based**: `revalidate: 3600` (1 hour default)
- **Tag-based on-demand**: invalidate specific collections
- **ISR**: for collection pages that change infrequently

```typescript
// Tag fetch
fetch(url, {
  next: { tags: [`collection-${slug}`, 'collections'] }
});

// Revalidate (in API route handler)
await revalidateTag(`collection-${slug}`);
```

## Error Handling

```typescript
interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

async function handleApiError(response: Response): Promise<never> {
  const error: ApiError = await response.json().catch(() => ({
    message: `HTTP ${response.status}: ${response.statusText}`
  }));
  throw new Error(error.message);
}
```

HTTP status conventions:
- **200**: Success
- **404**: `notFound()` in Next.js
- **500**: Show error state
- **401/403**: Auth errors

## Content Domain Types

```typescript
// app/types/Collection.ts
enum CollectionType {
  BLOG = 'BLOG',
  ART_GALLERY = 'ART_GALLERY',
  CLIENT_GALLERY = 'CLIENT_GALLERY',
  PORTFOLIO = 'PORTFOLIO'
}

// app/types/Content.ts
enum ContentBlockType {
  IMAGE = 'IMAGE',
  TEXT = 'TEXT',
  CODE = 'CODE',
  GIF = 'GIF'
}
```

## GET / POST Patterns

```typescript
// GET with query params
const url = new URL(`${API_URL}/read/collections`);
url.searchParams.set('type', 'BLOG');
const data = await fetch(url).then(r => r.json());

// POST JSON body
const response = await fetch(`${API_URL}/write/collections`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(collectionData)
});
```

## Best Practices

1. All API responses must match TypeScript types from `app/types/`
2. Never use `any` for API response types
3. Always implement cache tags for on-demand revalidation
4. Prefer Server Components for data fetching — minimize `'use client'`
5. Use `notFound()` for 404 responses in page routes
6. Write endpoints are localhost/dev only — guard with environment checks
