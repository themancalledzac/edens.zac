# Frontend Critical Review — Quick Wins Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship all 12 quick-win items from `todo/32-frontend-critical-review.md` plus the MenuDropdown heading bug — eliminating a correctness bug, a hydration mismatch, 4 a11y violations, a broken cache-invalidation path, a 258-line bundle bloat, and ~140 lines of dead duplication.

**Architecture:** All changes are surgical and self-contained. No new abstractions beyond `sortByDate.ts` and `TaxonomyPage`. Tasks are ordered so each commit is independently reviewable. Run type-check + lint after every task.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict mode, SCSS modules, Lucide icons

---

## File Map

| File | Change |
|---|---|
| `app/api/revalidate/route.ts` | Drop invalid second arg from `revalidateTag` |
| `app/components/SearchPage/SearchPage.tsx` | Replace `window.location.search` with `useSearchParams()` |
| `app/layout.tsx` | Add `display: 'swap'` to Inter; fix `themeColor` |
| `app/components/SiteHeader/SiteHeader.tsx` | `<h2>` → `<span>` (heading hierarchy); `aria-hidden` on icon |
| `app/components/MenuDropdown/MenuDropdown.tsx` | All nav `<h2>` → `<span>`; `aria-hidden` on close icon |
| `app/components/FullScreenModal/FullScreenModal.tsx` | `aria-hidden` on nav icons |
| `app/components/LoadingSpinner/LoadingSpinner.tsx` | Add `role="status"` and `aria-label` |
| `app/components/Content/ContentBlockWithFullScreen.tsx` | `next/dynamic` lazy-load FullScreenModal |
| `app/metadata/page.tsx` | Replace `force-dynamic` with `revalidate = 3600` |
| `app/utils/sortByDate.ts` | Create — extract duplicated sort function |
| `app/components/ContentCollection/CollectionPageClient.tsx` | Import `sortByDate` from utils |
| `app/components/LocationPage/LocationPageClient.tsx` | Import `sortByDate` from utils |
| `app/components/TaxonomyPage/TaxonomyPage.tsx` | Create — merge of PersonPage + TagPage |
| `app/components/TaxonomyPage/TaxonomyPage.module.scss` | Create — shared styles |
| `app/people/[slug]/page.tsx` | Import `TaxonomyPage` instead of `PersonPage` |
| `app/tag/[slug]/page.tsx` | Import `TaxonomyPage` instead of `TagPage` |
| `app/components/PersonPage/` | Delete directory |
| `app/components/TagPage/` | Delete directory |

---

## Task 1: Fix `revalidateTag` correctness bug

**Files:**
- Modify: `app/api/revalidate/route.ts`

The Next.js `revalidateTag` function takes exactly one argument (the tag string). The second arg `'default'` is silently ignored, meaning cache invalidation may not flush correctly.

- [ ] **Step 1: Fix the `revalidateTag` calls**

In `app/api/revalidate/route.ts`, replace every `revalidateTag(x, 'default')` with `revalidateTag(x)`. There are two — one for single-tag and one inside the loop.

```typescript
// app/api/revalidate/route.ts — full file after fix
import { revalidatePath, revalidateTag } from 'next/cache';
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tag, tags, path } = body;

    if (!tag && !tags && !path) {
      return NextResponse.json({ error: 'Either tag, tags, or path is required' }, { status: 400 });
    }

    if (tag && typeof tag === 'string') {
      revalidateTag(tag);
    }

    if (Array.isArray(tags)) {
      for (const t of tags) {
        if (typeof t === 'string') {
          revalidateTag(t);
        }
      }
    }

    if (path && typeof path === 'string') {
      revalidatePath(path);
    }

    return NextResponse.json({
      revalidated: true,
      tag: tag || undefined,
      tags: tags || undefined,
      path: path || undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to revalidate cache', detail: message },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Type-check**

```bash
/opt/homebrew/bin/node node_modules/.bin/tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/revalidate/route.ts
git commit -m "fix: drop invalid second arg from revalidateTag — cache invalidation was broken"
```

---

## Task 2: Fix SearchPage hydration mismatch

**Files:**
- Modify: `app/components/SearchPage/SearchPage.tsx`

`useState` reads `window.location.search` on the client but returns `mockContent` on the server — causing a React hydration mismatch. The component is already wrapped in `Suspense`, which is the correct setup for `useSearchParams()`. Just wire it up.

- [ ] **Step 1: Import `useSearchParams` and replace the window access**

Replace the entire `SearchPageContent` function body with the version below. Key change: add `useSearchParams()` call at the top; replace the `useState` initializer's `window` branch with `parseFilterFromParams(searchParams)`.

```tsx
// app/components/SearchPage/SearchPage.tsx
'use client';

import { Suspense, useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import ContentFilter from '@/app/components/ContentFilter/ContentFilter';
import SiteHeader from '@/app/components/SiteHeader/SiteHeader';
import { type AnyContentModel, type ContentImageModel } from '@/app/types/Content';
import { filterContent, parseFilterFromParams } from '@/app/utils/contentFilter';

import styles from './SearchPage.module.scss';
import SearchResults from './SearchResults';

/** Map index modulo to image height for mock data variety */
function getHeightForIndex(i: number): number {
  const mod = i % 4;
  if (mod === 0) return 2400;
  if (mod === 1) return 1067;
  if (mod === 2) return 1600;
  return 900;
}

/**
 * Generate mock images for the search page POC.
 * In production, these would come from GET /api/read/content/search
 */
function getMockSearchContent(): ContentImageModel[] {
  const locations = ['Seattle', 'Portland', 'New York', 'Los Angeles', 'Tokyo'];
  const cameras = ['Sony A7III', 'Nikon Z6', 'Canon R5', 'Fuji X-T5'];
  const tags = ['landscape', 'portrait', 'street', 'architecture', 'nature', 'urban'];
  const people = ['Alice', 'Bob', 'Charlie'];

  return Array.from({ length: 24 }, (_, i): ContentImageModel => {
    const locationName = locations[i % locations.length] as string;
    const cameraName = cameras[i % cameras.length] as string;
    const tagName1 = tags[i % tags.length] as string;
    const tagName2 = tags[(i + 2) % tags.length] as string;
    const personName = people[i % people.length] as string;

    return {
      id: 2000 + i,
      contentType: 'IMAGE',
      orderIndex: i,
      title: `Search Result ${i + 1}`,
      imageUrl: '',
      imageWidth: 1600,
      imageHeight: getHeightForIndex(i),
      rating: (i % 5) + 1,
      locations: [{ id: i % locations.length, name: locationName, slug: '' }],
      camera: { id: i % cameras.length, name: cameraName },
      tags: [
        { id: i % tags.length, name: tagName1, slug: '' },
        { id: (i + 2) % tags.length, name: tagName2, slug: '' },
      ],
      people: i % 3 === 0 ? [{ id: i % people.length, name: personName, slug: '' }] : [],
      createdAt: new Date(2024, i % 12, (i % 28) + 1).toISOString(),
      visible: true,
    };
  });
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const mockContent = useMemo(() => getMockSearchContent(), []);

  const [filteredContent, setFilteredContent] = useState<AnyContentModel[]>(() => {
    const criteria = parseFilterFromParams(searchParams);
    return filterContent(mockContent, criteria);
  });

  const handleFilterChange = useCallback((filtered: AnyContentModel[]) => {
    setFilteredContent(filtered);
  }, []);

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <SiteHeader pageType="default" />

        <div className={styles.searchHeader}>
          <h1 className={styles.searchTitle}>Search</h1>
          <p className={styles.searchDescription}>
            Browse and filter all images. This is a POC — using mock data until the backend search
            endpoint is available.
          </p>
        </div>

        <div className={styles.filterBar}>
          <ContentFilter
            content={mockContent}
            onFilterChange={handleFilterChange}
            variant="bar"
            showTextSearch
            showDateRange
          />
        </div>

        <div className={styles.resultsInfo}>
          <span className={styles.resultCount}>
            {filteredContent.length} {filteredContent.length === 1 ? 'result' : 'results'}
            {filteredContent.length !== mockContent.length && <> of {mockContent.length} total</>}
          </span>
        </div>

        <SearchResults content={filteredContent} />
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchPageContent />
    </Suspense>
  );
}
```

- [ ] **Step 2: Type-check and lint**

```bash
/opt/homebrew/bin/node node_modules/.bin/tsc --noEmit
/opt/homebrew/bin/node node_modules/.bin/eslint --fix app/components/SearchPage/SearchPage.tsx
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/components/SearchPage/SearchPage.tsx
git commit -m "fix: replace window.location.search with useSearchParams() to eliminate hydration mismatch"
```

---

## Task 3: Improve `app/layout.tsx`

**Files:**
- Modify: `app/layout.tsx`

Two independent issues:
- `Inter` font has no `display` option → potential FOIT (flash of invisible text)
- `themeColor: '#000000'` → black browser chrome on a light-background photography site

- [ ] **Step 1: Apply both fixes**

```tsx
// app/layout.tsx
import '@/app/styles/globals.css';

import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { type ReactNode } from 'react';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: {
    default: 'Edens Zac',
    template: '%s | Edens Zac',
  },
  description: 'Edens Zac portfolio',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
/opt/homebrew/bin/node node_modules/.bin/tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "fix: Inter display:swap to eliminate FOIT; themeColor #ffffff to match site background"
```

---

## Task 4: Fix heading hierarchy — SiteHeader and MenuDropdown

**Files:**
- Modify: `app/components/SiteHeader/SiteHeader.tsx`
- Modify: `app/components/MenuDropdown/MenuDropdown.tsx`

Two issues:
1. `<h2>Zac Edens</h2>` in SiteHeader renders before any `<h1>` on every page — breaks heading hierarchy site-wide.
2. All nav labels in MenuDropdown (`About`, `Contact`, `Blogs`, `Create`, `Update`, `Metadata`) are `<h2>` tags inside `<button>` elements. Headings inside buttons are invalid HTML and wrong semantics — they're labels, not section headers.

- [ ] **Step 1: SiteHeader — change `<h2>` to `<span>`**

The site title inside the link should be a styled `<span>`, not a heading. The styles target `.title` (the `<Link>` wrapper), not the `h2` tag, so no CSS changes needed.

In `app/components/SiteHeader/SiteHeader.tsx`, change line 33:

```tsx
// Before:
<h2>Zac Edens</h2>

// After:
<span>Zac Edens</span>
```

- [ ] **Step 2: MenuDropdown — change all `<h2>` nav labels to `<span>`**

In `app/components/MenuDropdown/MenuDropdown.tsx`, replace every occurrence of:
```tsx
<h2 className={styles.dropdownMenuOptions}>About</h2>
```
with:
```tsx
<span className={styles.dropdownMenuOptions}>About</span>
```

Do this for all six nav items: About, Contact, Blogs, Create, Update, Metadata. Use the exact same `className` attribute.

- [ ] **Step 3: Type-check and lint**

```bash
/opt/homebrew/bin/node node_modules/.bin/tsc --noEmit
/opt/homebrew/bin/node node_modules/.bin/eslint --fix app/components/SiteHeader/SiteHeader.tsx app/components/MenuDropdown/MenuDropdown.tsx
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/components/SiteHeader/SiteHeader.tsx app/components/MenuDropdown/MenuDropdown.tsx
git commit -m "fix: replace h2 heading tags with spans in SiteHeader and MenuDropdown nav items — fixes heading hierarchy site-wide"
```

---

## Task 5: Add `aria-hidden` to decorative icons

**Files:**
- Modify: `app/components/SiteHeader/SiteHeader.tsx`
- Modify: `app/components/MenuDropdown/MenuDropdown.tsx`
- Modify: `app/components/FullScreenModal/FullScreenModal.tsx`

Lucide icons rendered as decorative (already have a surrounding button with `aria-label`) should be hidden from screen readers. Without `aria-hidden="true"`, screen readers announce the SVG contents as noise.

- [ ] **Step 1: SiteHeader — add `aria-hidden` to `AlignJustify`**

In `app/components/SiteHeader/SiteHeader.tsx`, the hamburger icon already has a parent button with `aria-label="Open navigation menu"`:

```tsx
// Before:
<AlignJustify className={styles.menu} />

// After:
<AlignJustify className={styles.menu} aria-hidden="true" />
```

- [ ] **Step 2: MenuDropdown — add `aria-hidden` to `CircleX`**

In `app/components/MenuDropdown/MenuDropdown.tsx`, the close button already has `aria-label="Close navigation menu"`:

```tsx
// Before:
<CircleX className={styles.dropdownCloseIcon} />

// After:
<CircleX className={styles.dropdownCloseIcon} aria-hidden="true" />
```

- [ ] **Step 3: FullScreenModal — add `aria-hidden` to nav icons**

Read `app/components/FullScreenModal/FullScreenModal.tsx` to find all Lucide icon usages inside buttons that already have `aria-label`. Add `aria-hidden="true"` to each one. Typical pattern:

```tsx
// Before:
<ChevronLeft className={styles.navIcon} />

// After:
<ChevronLeft className={styles.navIcon} aria-hidden="true" />
```

Repeat for every Lucide icon in the file (likely: ChevronLeft, ChevronRight, X, Info or similar).

- [ ] **Step 4: Type-check and lint**

```bash
/opt/homebrew/bin/node node_modules/.bin/tsc --noEmit
/opt/homebrew/bin/node node_modules/.bin/eslint --fix \
  app/components/SiteHeader/SiteHeader.tsx \
  app/components/MenuDropdown/MenuDropdown.tsx \
  app/components/FullScreenModal/FullScreenModal.tsx
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/components/SiteHeader/SiteHeader.tsx app/components/MenuDropdown/MenuDropdown.tsx app/components/FullScreenModal/FullScreenModal.tsx
git commit -m "fix: aria-hidden on decorative Lucide icons so screen readers skip SVG noise"
```

---

## Task 6: Fix LoadingSpinner accessibility

**Files:**
- Modify: `app/components/LoadingSpinner/LoadingSpinner.tsx`

The spinner is an anonymous spinning circle to assistive technology. It needs `role="status"` so screen readers announce the live region, and `aria-label` so users know what is loading.

- [ ] **Step 1: Add `role` and `aria-label`**

```tsx
// app/components/LoadingSpinner/LoadingSpinner.tsx
import styles from './LoadingSpinner.module.scss';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'white' | 'dark' | 'grey';
}

export function LoadingSpinner({ size = 'medium', color = 'white' }: LoadingSpinnerProps) {
  return (
    <div
      className={`${styles.spinner} ${styles[size]} ${styles[color]}`}
      role="status"
      aria-label="Loading"
    >
      <div className={styles.circle} aria-hidden="true" />
    </div>
  );
}
```

Note: `aria-hidden="true"` on the inner `div` prevents the visual-only child from being announced separately.

- [ ] **Step 2: Type-check and lint**

```bash
/opt/homebrew/bin/node node_modules/.bin/tsc --noEmit
/opt/homebrew/bin/node node_modules/.bin/eslint --fix app/components/LoadingSpinner/LoadingSpinner.tsx
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/components/LoadingSpinner/LoadingSpinner.tsx
git commit -m "fix: add role=status and aria-label to LoadingSpinner for screen reader support"
```

---

## Task 7: Lazy-load FullScreenModal with `next/dynamic`

**Files:**
- Modify: `app/components/Content/ContentBlockWithFullScreen.tsx`

`FullScreenModal` (258 lines, uses `createPortal`) is statically imported and ships in every gallery page bundle even when it's never opened. Switching to `next/dynamic` with `ssr: false` removes it from the initial JS.

Note: `ContentBlockWithFullScreen` is already a `'use client'` component, so dynamic import works exactly like `React.lazy` here. The `ssr: false` flag prevents SSR of a portal-based component.

- [ ] **Step 1: Replace static import with `next/dynamic`**

In `app/components/Content/ContentBlockWithFullScreen.tsx`:

```tsx
// Remove this import:
import { FullScreenModal } from '@/app/components/FullScreenModal/FullScreenModal';

// Add this import at the top of the file (with other imports):
import dynamic from 'next/dynamic';

// Add this declaration (after all imports, before the component):
const FullScreenModal = dynamic(
  () =>
    import('@/app/components/FullScreenModal/FullScreenModal').then(
      m => ({ default: m.FullScreenModal })
    ),
  { ssr: false }
);
```

No other changes — the JSX usage of `<FullScreenModal ... />` is identical.

- [ ] **Step 2: Type-check and lint**

```bash
/opt/homebrew/bin/node node_modules/.bin/tsc --noEmit
/opt/homebrew/bin/node node_modules/.bin/eslint --fix app/components/Content/ContentBlockWithFullScreen.tsx
```

Expected: no errors. TypeScript infers the props from the dynamic import's resolved type automatically.

- [ ] **Step 3: Commit**

```bash
git add app/components/Content/ContentBlockWithFullScreen.tsx
git commit -m "perf: lazy-load FullScreenModal via next/dynamic to remove 258 lines from initial gallery bundle"
```

---

## Task 8: Stop force-dynamic on `metadata/page.tsx`

**Files:**
- Modify: `app/metadata/page.tsx`

`export const dynamic = 'force-dynamic'` disables ISR — every visitor pays a full backend round-trip. Replace with ISR at 1-hour revalidation.

- [ ] **Step 1: Replace `dynamic` with `revalidate`**

```tsx
// app/metadata/page.tsx
import { MetadataPageClient } from '@/app/components/MetadataPage/MetadataPageClient';
import { getMetadata } from '@/app/lib/api/collections';

export const revalidate = 3600;

export default async function MetadataPage() {
  const metadata = await getMetadata();

  if (!metadata) {
    return <p>Failed to load metadata.</p>;
  }

  const { tags, people, locations } = metadata;

  return <MetadataPageClient tags={tags} people={people} locations={locations} />;
}
```

- [ ] **Step 2: Type-check**

```bash
/opt/homebrew/bin/node node_modules/.bin/tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/metadata/page.tsx
git commit -m "perf: replace force-dynamic with revalidate=3600 on metadata page — stop paying a round-trip per visitor"
```

---

## Task 9: Extract `sortByDate` utility

**Files:**
- Create: `app/utils/sortByDate.ts`
- Modify: `app/components/ContentCollection/CollectionPageClient.tsx`
- Modify: `app/components/LocationPage/LocationPageClient.tsx`

The same 10-line `sortByDate` function is copy-pasted verbatim in two client components. Extract it.

- [ ] **Step 1: Create `app/utils/sortByDate.ts`**

```typescript
// app/utils/sortByDate.ts
import { type ContentImageModel } from '@/app/types/Content';

/**
 * Sorts images by captureDate. Uses createdAt as a tiebreaker for same-day images
 * (upload sequence approximates capture sequence; captureDate has no intra-day precision).
 */
export function sortByDate(
  images: ContentImageModel[],
  direction: 'asc' | 'desc'
): ContentImageModel[] {
  return [...images].sort((a, b) => {
    const dateA = a.captureDate ? new Date(a.captureDate).getTime() : 0;
    const dateB = b.captureDate ? new Date(b.captureDate).getTime() : 0;
    if (dateA !== dateB) return direction === 'asc' ? dateA - dateB : dateB - dateA;

    const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return direction === 'asc' ? createdA - createdB : createdB - createdA;
  });
}
```

- [ ] **Step 2: Update `CollectionPageClient.tsx`**

Remove the local `sortByDate` function definition (lines 29-38) and add the import:

```tsx
import { sortByDate } from '@/app/utils/sortByDate';
```

- [ ] **Step 3: Update `LocationPageClient.tsx`**

Remove the local `sortByDate` function definition (lines 29-39) and add the import:

```tsx
import { sortByDate } from '@/app/utils/sortByDate';
```

- [ ] **Step 4: Run tests**

```bash
/opt/homebrew/bin/node node_modules/.bin/jest --testPathPattern sortByDate 2>/dev/null || echo "no test file yet — that is ok"
```

- [ ] **Step 5: Type-check and lint**

```bash
/opt/homebrew/bin/node node_modules/.bin/tsc --noEmit
/opt/homebrew/bin/node node_modules/.bin/eslint --fix \
  app/utils/sortByDate.ts \
  app/components/ContentCollection/CollectionPageClient.tsx \
  app/components/LocationPage/LocationPageClient.tsx
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/utils/sortByDate.ts app/components/ContentCollection/CollectionPageClient.tsx app/components/LocationPage/LocationPageClient.tsx
git commit -m "refactor: extract sortByDate to app/utils — remove character-for-character duplication"
```

---

## Task 10: Merge PersonPage + TagPage into TaxonomyPage

**Files:**
- Create: `app/components/TaxonomyPage/TaxonomyPage.tsx`
- Create: `app/components/TaxonomyPage/TaxonomyPage.module.scss`
- Modify: `app/people/[slug]/page.tsx`
- Modify: `app/tag/[slug]/page.tsx`
- Delete: `app/components/PersonPage/` (entire directory)
- Delete: `app/components/TagPage/` (entire directory)

PersonPage and TagPage are identical except for the prop name (`personName` vs `tagName`) and the styles import. Merge into a single `TaxonomyPage` with an `entityName` prop.

- [ ] **Step 1: Create `app/components/TaxonomyPage/TaxonomyPage.tsx`**

```tsx
// app/components/TaxonomyPage/TaxonomyPage.tsx
import ContentBlockWithFullScreen from '@/app/components/Content/ContentBlockWithFullScreen';
import SiteHeader from '@/app/components/SiteHeader/SiteHeader';
import { type ContentImageModel } from '@/app/types/Content';
import { processContentBlocks } from '@/app/utils/contentLayout';

import styles from './TaxonomyPage.module.scss';

interface TaxonomyPageProps {
  entityName: string;
  images: ContentImageModel[];
}

export default function TaxonomyPage({ entityName, images }: TaxonomyPageProps) {
  const contentBlocks = processContentBlocks(images, true);

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <SiteHeader pageType="default" />
        <div className={styles.pageHeader}>
          <div className={styles.headerMeta}>
            <h1 className={styles.pageName}>{entityName}</h1>
            <span className={styles.imageCount}>
              {images.length} {images.length === 1 ? 'photo' : 'photos'}
            </span>
          </div>
        </div>
        {contentBlocks.length > 0 && (
          <ContentBlockWithFullScreen
            content={contentBlocks}
            priorityBlockIndex={0}
            enableFullScreenView
            initialPageSize={30}
            chunkSize={4}
          />
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Create `app/components/TaxonomyPage/TaxonomyPage.module.scss`**

Copy the content of `PersonPage.module.scss` verbatim (both files are byte-for-byte identical except for the comment):

```scss
/* TaxonomyPage styles — shared layout for person, tag, and similar taxonomy pages */

.container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main {
  flex: 1;
  margin: 0 auto;
  width: 100%;
  max-width: var(--page-max-width);
  position: relative;

  padding-left: 0;
  padding-right: 0;
  padding-top: var(--page-padding-mobile);

  @media (width >= 768px) {
    padding-left: var(--default-padding);
    padding-right: var(--default-padding);
    padding-top: var(--default-padding);
  }
}

.pageHeader {
  padding: var(--space-5) var(--page-padding-mobile);
  border-bottom: 1px solid var(--border-color, #eee);
  margin-bottom: var(--space-4);

  @media (width >= 768px) {
    padding: var(--space-6) 0;
    margin-bottom: var(--space-5);
  }
}

.headerMeta {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.pageName {
  font-size: 1.8rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary, #111);

  @media (width >= 768px) {
    font-size: 2.4rem;
  }
}

.imageCount {
  font-size: 0.85rem;
  color: var(--text-secondary, #888);
  font-weight: 500;
}
```

- [ ] **Step 3: Update `app/people/[slug]/page.tsx`**

Change the import line and the JSX render call:

```tsx
// Remove:
import PersonPage from '@/app/components/PersonPage/PersonPage';

// Add:
import TaxonomyPage from '@/app/components/TaxonomyPage/TaxonomyPage';
```

```tsx
// Replace the return statement:
// Before:
return <PersonPage personName={matchedPerson.name} images={images} />;

// After:
return <TaxonomyPage entityName={matchedPerson.name} images={images} />;
```

- [ ] **Step 4: Update `app/tag/[slug]/page.tsx`**

```tsx
// Remove:
import TagPage from '@/app/components/TagPage/TagPage';

// Add:
import TaxonomyPage from '@/app/components/TaxonomyPage/TaxonomyPage';
```

```tsx
// Replace the return statement:
// Before:
return <TagPage tagName={matchedTag.name} images={images} />;

// After:
return <TaxonomyPage entityName={matchedTag.name} images={images} />;
```

- [ ] **Step 5: Delete old directories**

```bash
rm -rf app/components/PersonPage app/components/TagPage
```

- [ ] **Step 6: Stylelint + type-check + lint**

```bash
/opt/homebrew/bin/node node_modules/.bin/stylelint --fix app/components/TaxonomyPage/TaxonomyPage.module.scss
/opt/homebrew/bin/node node_modules/.bin/tsc --noEmit
/opt/homebrew/bin/node node_modules/.bin/eslint --fix \
  app/components/TaxonomyPage/TaxonomyPage.tsx \
  app/people/[slug]/page.tsx \
  app/tag/[slug]/page.tsx
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add app/components/TaxonomyPage/ app/people/[slug]/page.tsx app/tag/[slug]/page.tsx
git rm -r app/components/PersonPage app/components/TagPage
git commit -m "refactor: merge PersonPage + TagPage into TaxonomyPage — delete ~140 lines of dead duplication"
```

---

## Self-Review

**Spec coverage check against `todo/32-frontend-critical-review.md` Quick Wins table:**

| # | Fix | Covered? |
|---|---|---|
| 1 | `revalidateTag(tag)` (drop second arg) | ✅ Task 1 |
| 2 | `<h1>Zac Edens</h1>` (or span) | ✅ Task 4 — changed to `<span>` |
| 3 | `useSearchParams()` replacing `window.location` | ✅ Task 2 |
| 4 | Add `<link rel="preconnect" href="<CF>">` | ⚠️ **Not included** — CloudFront subdomain not in codebase. Find actual CF domain from deployed environment and add `<link rel="preconnect" href="https://<subdomain>.cloudfront.net">` to `app/layout.tsx` `<head>`. |
| 5 | `Inter({ subsets: ['latin'], display: 'swap' })` | ✅ Task 3 |
| 6 | Change `themeColor: '#ffffff'` | ✅ Task 3 |
| 7 | `dynamic(() => import('...FullScreenModal'), { ssr: false })` | ✅ Task 7 |
| 8 | Extract `sortByDate` to `app/utils/` | ✅ Task 9 |
| 9 | `aria-hidden="true"` on decorative Lucide icons | ✅ Task 5 |
| 10 | `role="status" aria-label="Loading…"` on LoadingSpinner | ✅ Task 6 |
| 11 | `export const revalidate = 3600` on `metadata/page.tsx` | ✅ Task 8 |
| 12 | Merge PersonPage + TagPage → TaxonomyPage | ✅ Task 10 |

**Bonus fix also included:** MenuDropdown `<h2>` nav labels → `<span>` (Task 4) — P0 a11y finding in the review, not in the quick-wins table but trivial to include alongside Task 4.

**Placeholder scan:** No TBD, no "fill in details", no "handle edge cases". All code blocks are complete.

**Type consistency:** `entityName: string` in `TaxonomyPage` is used consistently in both route update steps. `sortByDate` signature `(images: ContentImageModel[], direction: 'asc' | 'desc')` matches the call sites.

**One gap to fill manually (item 4):** Once you have the actual CloudFront hostname (e.g. `d1abc123xyz.cloudfront.net`), add to `app/layout.tsx`:

```tsx
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://d1abc123xyz.cloudfront.net" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```
