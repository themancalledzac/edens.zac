# Quick Reference Guide

## File Naming Conventions

- **Components**: PascalCase (`About.tsx`, `ContentComponent.tsx`)
- **Utilities**: camelCase (`contentLayout.ts`, `rowStructureAlgorithm.ts`)
- **SCSS Modules**: Component name + `.module.scss` (`About.module.scss`, `ContentComponent.module.scss`)
- **Hooks**: camelCase with `use` prefix (`useViewport.ts`, `useFullScreenImage.tsx`)
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
// 1. React/Next.js imports (named imports only — never `import React`)
import { type SubmitEvent, useState } from 'react';
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
├── CLAUDE.md # Development guidelines (always-loaded hub)
├── ai_guidelines/ # Modular AI guideline files
├── docs/ # Feature specs, spikes, handoffs
├── tests/ # Test files mirror app/ structure
└── public/ # Static assets

app/
├── layout.tsx, page.tsx, error.tsx, not-found.tsx # Root App Router files
├── (admin)/ # Route group for admin pages
│   ├── admin/ # Local-only admin hub (+ users/[id])
│   ├── all-collections/, all-images/ # Collection list + image browser
│   ├── collection/manage/[[...slug]]/ # Legacy manage route (edit now in-place)
│   ├── comments/ # Contact-message reader
│   └── metadata/ # Global metadata management
├── [slug]/page.tsx # Dynamic collection route (in-place edit via ?manage=1)
├── all-client-galleries/ # Signed-in client's gallery index
├── explore/ # Public discovery front door
├── invite/[token]/ # Invite-link onboarding
├── location/[slug]/ # Location-filtered image view
├── login/ # Password + passkey sign-in
├── tag/[slug]/ # Tag-filtered view
├── user/, user/selects/ # Personal space (saves + follows)
├── homePage/ # Home management surface
├── api/proxy/[...path]/ # BFF proxy to Spring Boot (+ revalidate route)
├── components/ # React components (PascalCase directories)
│   ├── Content/ # Core content rendering components
│   ├── ContentCollection/ # Collection page components (incl. edit/ layer)
│   ├── Metadata/ # Image/GIF metadata editing
│   └── SiteHeader/, FullScreenModal/, etc.
├── hooks/ # Custom React hooks (useViewport, useParallax, useFetchMe, useFullScreenImage, etc.)
├── lib/
│   ├── api/ # API client (~11 modules: core, collections, content, auth, ...)
│   ├── components/ # Shared components
│   └── storage/ # Local storage utilities
├── types/ # TypeScript definitions (Collection, Content, Auth, Metadata, etc.)
├── utils/ # Utility functions (contentLayout, rowCombination, contentRatingUtils, etc.)
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

## Inline JSX Config Rule

A literal `Array` or `Object` passed as a prop in JSX **must be lifted out of the render function** when **both** of the following hold:

1. It spans **more than 5 lines** (Prettier-formatted), AND
2. **None** of its values reference a component-scope identifier (props, state, closure variables, hook return values, or values computed earlier in the function body).

**Lift to** (in order of preference):

- **Module-scope `const` above the function** — the default. Keeps the data co-located with its single consumer.
- **A typed const next to the relevant type/enum** in `app/types/` — when the data is a label/description for a domain enum (mirror the existing `COLLECTION_VISIBILITY_LABELS` pattern in `app/types/CollectionVisibility.ts`).
- **A sibling `<feature>.config.ts`** — only when the literal is consumed by **2+ files** OR exceeds **~80 LoC** of pure config. Crossing a file boundary is indirection cost; pay it only when there's a real DRY or test-reuse win.

If a literal is _mostly_ static but contains one props-derived field (e.g. an `addNewFields` array where one field's `options` comes from a prop): **extract a `buildXxx(deps)` helper at module scope** that takes the dependencies and returns the array.

**Do NOT lift:**

- 1-line literals (button labels, single placeholders, trivial display-name arrow functions like `getDisplayName={lens => lens.name}`).
- Literals whose surrounding markup conditionally renders them or whose handler shapes differ — forcing them into a uniform array-of-configs driving a `.map()` makes the file harder to read.
- One-line closure-bound event handlers — extracting to `useCallback` adds ceremony without measurable benefit absent profiler evidence.

**Auditable by greppability:** anywhere `addNewFields={[`, `options={[`, or 3+ consecutive `<option value=` lines appear inside a render function and reference only string/number literals, the rule has likely been violated. Reference example: `app/components/ImageMetadata/sections/CameraSettingsSection.tsx` lifts `LENS_ADD_NEW_FIELDS` / `FILM_STOCK_ADD_NEW_FIELDS` / `buildCameraAddNewFields(...)` to module scope.

## Common Mistakes to Avoid

- ❌ Using `'use client'` unnecessarily - prefer Server Components
- ❌ Using `any` type - always use proper TypeScript types
- ❌ Creating components without corresponding SCSS modules
- ❌ Mixing camelCase and PascalCase for similar file types
- ❌ Forgetting to add tests for new utility functions
- ❌ Using React Context when URL state would suffice
- ❌ Not using `next/image` for images (always use CloudFront URLs)
- ❌ Using `import React` namespace — always use named imports from `'react'`
- ❌ Using deprecated `FormEvent` — use `SubmitEvent<HTMLFormElement>` instead
- ❌ Inline static config (>5 LoC array/object literal with no component-scope refs) in JSX — see "Inline JSX Config Rule" above
