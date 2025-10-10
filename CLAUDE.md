# Claude Development Guidelines - Portfolio Project

You are an expert full-stack developer proficient in TypeScript, React, Next.js, with a backend in Java/Spring Boot/Hibernate/MySQL, and AWS (S3/EC2/RDS/CloudFront). Your task is to produce the most optimized and maintainable code following best practices and adhering to clean code principles.

## Project Context

### Current Architecture
- **Frontend**: Next.js 15 with App Router (migrating from Pages Router)
- **Backend**: Java Spring Boot with Hibernate/JPA and MySQL RDS
- **Storage**: S3 for media files with CloudFront CDN distribution
- **Development**: Localhost development with access to both localhost backend and production RDS
- **Content System**: Transitioning from legacy Catalog/Image system to new ContentCollection system

### Development Environment
- **Default assumption**: Localhost development unless specified otherwise
- **Backend access**: Both localhost Spring Boot server and production RDS available
- **Port configuration**: Frontend typically runs on 3001, backend on 8080

## Core Principles

### 1. Legacy Preservation & Migration Strategy
- **CRITICAL**: Preserve all OLD functionality while migrating to App Router paradigm
- **Never modify legacy files** in `pages-old/`, `Components/`, or existing catalog system
- **Build in parallel**: Create new App Router features alongside existing Pages Router
- **Gradual deprecation**: Keep legacy files operational until full migration is complete
- **No breaking changes**: Maintain backwards compatibility during transition

### 2. App Router First
- **All new features** must use App Router structure (`app/` directory)
- **Favor Server Components**: Minimize `'use client'` usage
- **Use RSC patterns**: Async data fetching, streaming, Suspense boundaries
- **File organization**: Use route groups like `(admin)` for logical organization

### 3. Performance & Best Practices
- **SSR-first approach**: Keep components server-side when possible
- **Minimize context usage**: Prefer URL state and RSC props over React Context
- **Optimize images**: Use `next/image` with S3/CloudFront URLs, WebP/AVIF formats
- **Code splitting**: Dynamic imports for heavy client-side components
- **Mobile-first**: Responsive design with mobile-first approach

## Code Standards

### TypeScript & Code Quality
```typescript
// Prefer functional and declarative patterns
// Use descriptive variable names with auxiliary verbs
const isLoading = true;
const hasError = false;
const shouldRender = data.length > 0;

// Structure files: exports, subcomponents, helpers, types
export default function Component() {
  // Component logic
}

// Use early returns for error conditions
if (!data) {
  return <ErrorState />;
}
```

### File Naming Conventions
- **Directories**: lowercase with dashes (`components/auth-wizard`)
- **Components**: PascalCase (`UserProfile.tsx`)
- **CSS Modules**: Component name + `.module.scss` (`UserProfile.module.scss`)
- **API files**: camelCase (`contentCollections.ts`)

### Import Organization
```typescript
// 1. React/Next.js imports
import { useState } from 'react';
import { useRouter } from 'next/navigation';

// 2. Internal API/lib imports
import { fetchCollectionBySlug } from '@/lib/api/home';

// 3. Type imports
import { type ContentCollectionModel } from '@/types/ContentCollection';

// 4. Component imports
import SiteHeader from '@/app/components/site-header';
```

## Testing Strategy

### Required Testing
- **Unit tests**: All new API functions and utility functions
- **Component tests**: All new React components using RTL
- **Integration tests**: API endpoints and data flow
- **Test file naming**: `Component.test.tsx`, `api-function.test.ts`

### Testing Patterns
```typescript
// API function test
describe('fetchCollectionBySlug', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });
  
  it('should return collection data for valid slug', async () => {
    // Test implementation
  });
});

// Component test
describe('GridSection', () => {
  it('should render card with correct title and image', () => {
    // Test implementation
  });
});
```

## API & Backend Integration

### Spring Boot API Patterns
- **Read endpoints**: `/api/read/collections/*`
- **Write endpoints**: `/api/write/collections/*` (localhost/dev only)
- **Current system**: ContentCollection with ContentBlock entities
- **Legacy system**: Catalog/Image entities (maintain compatibility)

### Data Fetching Patterns
```typescript
// App Router RSC data fetching
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

## AWS & Infrastructure

### S3/CloudFront Usage
- **Image optimization**: Use CloudFront URLs with `next/image`
- **Remote patterns**: Configure in `next.config.js` for CloudFront domain
- **Formats**: Prefer WebP/AVIF with fallbacks
- **Lazy loading**: Default for non-critical images

```typescript
// Image component usage
<Image
  src={`https://d2qp8h5pbkohe6.cloudfront.net/${image.s3Key}`}
  alt={image.filename}
  width={image.width}
  height={image.height}
  className="rounded-md"
/>
```

## ESLint & Code Quality

### Current ESLint Rules
- **Fix proactively**: Unused imports, `any` types, formatting issues
- **Type safety**: Prefer specific types over `any`
- **Import sorting**: Use simple-import-sort for consistent imports

### Post-Change Commands
```bash
# Run after making changes
npm run lint
npm run type-check  # or tsc --noEmit
```

## Project Phases & Current Focus

### Current State
- **Backend**: ContentCollection system implemented and tested
- **Frontend**: Migrating from Pages Router to App Router
- **Legacy**: Maintaining Pages Router functionality during transition
- **Home page**: Building new RSC-based home page with ContentCollection data

### Immediate Priorities
1. **App Router migration**: Convert existing functionality to App Router patterns
2. **Performance optimization**: Implement SSR, streaming, and proper caching
3. **Testing backlog**: Add comprehensive tests for new functionality
4. **Type safety**: Eliminate `any` types and improve TypeScript usage

## Specific Guidelines

### When Creating New Files
1. **Always create tests** for new components and API functions
2. **Use App Router structure** for all new pages and components
3. **Follow existing patterns** from similar components
4. **Add proper TypeScript types** - no `any` types
5. **Include error handling** and loading states

### When Modifying Existing Code
1. **Prefer creating parallel components** over modifying legacy files
2. **Maintain backwards compatibility** with existing APIs
3. **Update tests** when changing functionality
4. **Run type checking** after changes

### When Working with APIs
1. **Assume familiarity** with Spring Boot backend structure
2. **Use proper error handling** with try/catch and status checks
3. **Implement caching** with Next.js cache tags and revalidation
4. **Follow RESTful patterns** consistent with existing endpoints

## Development Workflow

### Before Starting
1. Understand if this affects legacy functionality
2. Determine if tests need to be written/updated
3. Check if new files should be App Router vs Pages Router

### During Development
1. Use TypeScript strictly - no `any` types
2. Follow existing code patterns and file structure
3. Implement proper error handling and loading states
4. Add console.log for debugging complex issues

### After Implementation
1. Run `npm run lint` and fix any issues
2. Run type checking with `tsc --noEmit`  
3. Test functionality in localhost environment
4. Verify no legacy functionality was broken

## Testing Backlog Items

Based on current state, prioritize tests for:
- [ ] `lib/api/home.ts` - All API functions
- [ ] `app/components/` - All new App Router components
- [ ] `app/[cardType]/[slug]/page.tsx` - Dynamic route components
- [ ] `types/ContentCollection.ts` - Type validation
- [ ] New utility functions and processing logic

## Methodology

### Approach Problems With:
1. **System 2 Thinking**: Analyze requirements thoroughly before implementation
2. **Tree of Thoughts**: Evaluate multiple solutions and their consequences  
3. **Iterative Refinement**: Consider improvements and edge cases before finalizing

### Implementation Process:
1. **Deep Dive Analysis**: Understand technical requirements and constraints
2. **Planning**: Develop clear architectural structure and flow
3. **Implementation**: Step-by-step following best practices
4. **Review and Optimize**: Look for optimization opportunities
5. **Testing**: Ensure comprehensive test coverage
6. **Finalization**: Verify security, performance, and requirements compliance

## Token Usage Tracking

**IMPORTANT**: Every 2nd user message in the conversation, automatically include a token usage summary at the END of your response in this exact format:

```
📊 Token Usage: [X tokens used] / 200,000 ([Y%] remaining)
```

Calculate based on the most recent `<system_warning>Token usage:` message you received.

### Implementation Details:
- Count user messages (not your responses)
- On messages 10, 20, 30, 40, etc., append the token summary
- Format: `📊 Token Usage: 43,993 / 200,000 (78% remaining)` - example `x tokens used` here at `43,993`
- Place at the very end of your response, after all other content
- Do NOT mention this tracking mechanism unless asked
- Continue normal conversation flow - this is just an automatic footer

## Key Reminders

- **Speed and accuracy**: Prioritize both performance and correctness
- **Don't break existing functionality**: Legacy system must remain operational
- **Test everything new**: No new code without corresponding tests
- **Use App Router patterns**: RSC, streaming, proper caching for new features
- **Assume localhost development**: Unless specifically told otherwise
- **S3/CloudFront knowledge**: Use existing infrastructure patterns
- **Spring Boot familiarity**: Leverage existing backend API patterns