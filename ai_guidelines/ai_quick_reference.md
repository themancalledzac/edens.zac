# Quick Reference Guide

## File Naming Conventions

- **Components**: PascalCase (`About.tsx`, `ContentComponent.tsx`)
- **Utilities**: camelCase (`contentLayout.ts`, `rowStructureAlgorithm.ts`)
- **SCSS Modules**: Component name + `.module.scss` (`About.module.scss`, `ContentComponent.module.scss`)
- **Hooks**: camelCase with `use` prefix (`useViewport.ts`, `useCollectionData.tsx`)
- **Types**: PascalCase (`Collection.ts`, `Content.ts`)
- **API Functions**: camelCase (`collections.ts`, `content.ts`)
- **Directories**: lowercase with dashes for route groups (`(admin)`, `all-collections`)

## Import Organization

Import order (strict):

1. React/Next.js imports
2. Internal API/lib imports (`@/app/lib/api/*`)
3. Type imports (`@/app/types/*`)
4. Component imports (`@/app/components/*`)
5. Utility imports (`@/app/utils/*`)
6. Constants (`@/app/constants`)
7. Styles (SCSS modules)
8. Relative imports (same directory)

### Example
```typescript
// 1. React/Next.js imports
import { useState } from 'react';
import { useRouter } from 'next/navigation';

// 2. Internal API/lib imports
import { fetchCollectionBySlug } from '@/app/lib/api/collections';

// 3. Type imports
import { type ContentCollectionModel } from '@/app/types/Collection';

// 4. Component imports
import SiteHeader from '@/app/components/SiteHeader/SiteHeader';

// 5. Utility imports
import { processContentLayout } from '@/app/utils/contentLayout';

// 6. Constants
import { PARALLAX_CONFIG } from '@/app/constants/parallax';

// 7. Styles
import styles from './Component.module.scss';

// 8. Relative imports
import { helperFunction } from './helpers';
```

## Project Structure

```
Root:
├── CLAUDE.md # Detailed development guidelines
├── ai_guidelines/ # Modular AI guideline files
├── amplify/ # AWS Amplify configuration
├── tests/ # Test files mirror app/ structure
└── public/ # Static assets

app/
├── layout.tsx, page.tsx, error.tsx, not-found.tsx # Root App Router files
├── (admin)/ # Route group for admin pages
│   └── collection/manage/[[...slug]]/ # Collection management
├── [slug]/page.tsx # Dynamic collection route
├── collectionType/[collectionType]/page.tsx # Collection type filter
├── api/ # Next.js API routes (proxy, revalidate)
├── components/ # React components (PascalCase directories)
│   ├── Content/ # Core content rendering components
│   ├── ContentCollection/ # Collection page components
│   ├── ImageMetadata/ # Image metadata editing
│   └── SiteHeader/, FullScreenModal/, etc.
├── hooks/ # Custom React hooks (useCollectionData, useParallax, etc.)
├── lib/
│   ├── api/ # API client (collections.ts, content.ts, core.ts)
│   ├── components/ # Shared components
│   └── storage/ # Local storage utilities
├── types/ # TypeScript definitions (Collection, Content, ContentRenderer, etc.)
├── utils/ # Utility functions (contentLayout, rowStructureAlgorithm, etc.)
├── constants/ # App constants
└── styles/ # Global styles (globals.css, module SCSS files)
```

## Data Flow

1. **Server Components**: Fetch data in `page.tsx` using async functions
2. **API Layer**: Use `app/lib/api/*` functions for backend communication
3. **Type Safety**: All API responses should match types in `app/types/`
4. **State Management**: Prefer URL state and Server Component props over React Context
5. **Caching**: Use Next.js cache tags and revalidation for API responses
6. **Content Processing**: Use utilities in `app/utils/contentLayout.ts` for content transformation

## Common Mistakes to Avoid

- ❌ Using `'use client'` unnecessarily - prefer Server Components
- ❌ Importing from `pages/` or legacy directories
- ❌ Using `any` type - always use proper TypeScript types
- ❌ Creating components without corresponding SCSS modules
- ❌ Mixing camelCase and PascalCase for similar file types
- ❌ Forgetting to add tests for new utility functions
- ❌ Using React Context when URL state would suffice
- ❌ Not using `next/image` for images (always use CloudFront URLs)
