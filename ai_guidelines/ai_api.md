# API Patterns & Backend Integration

## Spring Boot API Patterns

### Endpoint Structure
- **Read endpoints**: `/api/read/collections/*`
- **Write endpoints**: `/api/write/collections/*` (localhost/dev only)
- **Current system**: ContentCollection with ContentBlock entities
- **Legacy system**: Catalog/Image entities (maintain compatibility)

### API Base URL
- **Development**: `http://localhost:8080`
- **Production**: Configure via environment variables
- **Proxy**: Use Next.js API routes (`app/api/proxy/`) for CORS handling

## Data Fetching Patterns

### App Router RSC Data Fetching
```typescript
async function fetchData(slug: string) {
  const response = await fetch(`${API_URL}/collections/${slug}`, {
    next: { revalidate: 3600, tags: [`collection-${slug}`] }
  });
  
  if (!response.ok) {
    notFound();
  }
  
  return response.json();
}
```

### API Client Functions
```typescript
// app/lib/api/collections.ts
export async function fetchCollectionBySlug(slug: string): Promise<Collection> {
  const response = await fetch(`${API_URL}/read/collections/${slug}`, {
    next: { revalidate: 3600, tags: [`collection-${slug}`] }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch collection: ${slug}`);
  }
  
  return response.json();
}
```

### Error Handling
```typescript
// Use custom error types and early returns
try {
  const data = await fetchData();
  if (!data) {
    return <NotFound />;
  }
} catch (error) {
  console.error('Error:', error);
  return <ErrorState message={error.message} />;
}
```

## Caching Strategy

### Next.js Cache Options
- **Time-based revalidation**: `revalidate: 3600` (1 hour)
- **On-demand revalidation**: Use cache tags
- **Static generation**: For collection pages that don't change often
- **ISR**: Incremental Static Regeneration for dynamic content

### Cache Tags
```typescript
// Tag collections for on-demand revalidation
fetch(url, {
  next: { tags: [`collection-${slug}`, 'collections'] }
});

// Revalidate via API route
await revalidateTag(`collection-${slug}`);
```

## API Error Handling

### HTTP Status Codes
- **200**: Success
- **404**: Not found - use `notFound()` in Next.js
- **500**: Server error - show error state
- **401/403**: Authentication/authorization errors

### Error Response Pattern
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

## Content System Architecture

### ContentCollection Types
```typescript
enum CollectionType {
  BLOG = 'BLOG',           // Daily moments, mixed content
  ART_GALLERY = 'ART_GALLERY',  // Curated artistic collections  
  CLIENT_GALLERY = 'CLIENT_GALLERY',  // Private client deliveries
  PORTFOLIO = 'PORTFOLIO'   // Professional showcases
}
```

### ContentBlock Types
```typescript
enum ContentBlockType {
  IMAGE = 'IMAGE',    // S3 stored images
  TEXT = 'TEXT',      // Database stored text
  CODE = 'CODE',      // Database stored code with syntax highlighting
  GIF = 'GIF'         // S3 stored GIFs
}
```

## API Request Patterns

### GET Requests
```typescript
// Simple GET
const data = await fetch(`${API_URL}/read/collections`).then(r => r.json());

// GET with query parameters
const url = new URL(`${API_URL}/read/collections`);
url.searchParams.set('type', 'BLOG');
const data = await fetch(url).then(r => r.json());
```

### POST/PUT Requests
```typescript
// POST with JSON body
const response = await fetch(`${API_URL}/write/collections`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(collectionData)
});
```

## Backend Integration Best Practices

1. **Assume familiarity** with Spring Boot backend structure
2. **Use proper error handling** with try/catch and status checks
3. **Implement caching** with Next.js cache tags and revalidation
4. **Follow RESTful patterns** consistent with existing endpoints
5. **Handle loading states** in UI components
6. **Validate responses** match TypeScript types from `app/types/`
7. **Use TypeScript types** for all API responses

## Environment Configuration

```typescript
// app/utils/environment.ts
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
```
