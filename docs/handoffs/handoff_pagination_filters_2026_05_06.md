# Handoff: Admin Hub + Pagination + Collection-Render Fixes (FE)

**Branch:** `0135-admin-page`
**Session date:** 2026-05-05 → 2026-05-06
**Companion BE branch:** `0085-admin-hub` (`edens.zac.backend`)

This handoff covers everything committed to the FE branch since the previous handoff at commit `1cb23a5` (`docs(handoff): admin hub + collections overhaul session summary`).

---

## Commits added this session (chronological, latest first)

```
4cbdfb6  feat(all-images): paginated lazy-load with sentinel prefetch
3a30e20  fix(collections): synthetic PARENT layout, no-image clickability, row key collisions
cbd3358  feat(admin): local-only admin hub landing + AdminActionBox + create-collection scaffolding
1cb23a5  ← previous handoff baseline
```

The three commits group the work cleanly. Each is independently shippable.

---

## 1) `cbd3358` — Admin hub local-only landing

Pre-existing WIP that had been accumulating in the working tree. Makes the dev console the natural local landing surface.

**Behavior changes (`proxy.ts`):**
- Non-local requests to `/admin*` and `/homePage` redirect to `/`. They are not discoverable in prod.
- On localhost, `/` redirects to `/admin` so the dev console is what you see when you open the browser.
- The real public home page is reachable at `/homePage` locally.

**New files:**
- `app/(admin)/admin/AdminActionBox.{tsx,module.scss}` — clear-cache control with success/error status feedback. Uses `useTransition` and a server action (`./actions.ts`, already tracked).
- `app/(admin)/admin/page.module.scss` — styling for the admin landing.
- `app/(admin)/collection/create/page.tsx` — entry point for creating a new collection.
- `app/homePage/page.tsx` — escape route to the real home from the dev console.
- `app/lib/api/adminHome.ts` — typed admin-tiles API client.

**Test polyfill** (`jest.setup.ts`): `TextEncoder`/`TextDecoder` from `node:util` are exposed on `globalThis` because `next/cache`-touching modules reference them at import time and jsdom doesn't provide them.

**Tests added:** `tests/(admin)/admin/{AdminActionBox,AdminHubGrid,adminTiles,page}.test.{ts,tsx}`, `tests/homePage/page.test.tsx`, `tests/lib/api/adminHome.test.ts`, `tests/proxy.test.ts`.

**Known follow-up — pre-existing failures:**
- `tests/(admin)/admin/AdminHubGrid.test.tsx`, `tests/(admin)/admin/adminTiles.test.ts`, `tests/(admin)/admin/page.test.tsx` reference a `disabled` field that was removed in commit `412167d` ("drop /collectionType; admin tiles use synthetic /all-* slugs"). These 6 failing tests are committed as-is (the intent is captured in the test names) and need to be updated to match the new `adminTiles` shape.

---

## 2) `3a30e20` — Collection rendering fixes

Surfaced and fixed three layout bugs that affected `/all-collections`, `/all-blogs`, `/all-portfolios`, `/all-client-galleries`, `/all-art-galleries`, `/all-misc` — all the synthetic PARENT collections returned by `SyntheticCollectionResolver` on the BE.

### Bug 1 — "all collections" pill mid-grid

`CollectionPageClient` had a `needsHeaderText` branch that prepended a synthetic TEXT content block to `allContent` when `collection.type === PARENT && coverImage == null`. The TEXT block then went through `processContentBlocks` and into the BoxTree layout algorithm, where it was treated as a 1×1 AR item and got packed alongside the first 2–3 collection tiles in row 1.

**Fix:** Drop the special-case entirely. PARENT collections now render exactly like `/adventure` and every other collection. The page title is already rendered by `SiteHeader pageType="collection"`.

### Bug 2 — 3 tiles per row, overflowing the viewport

The dev tools showed all three "Seattle on Film", "Tyler_Abby", "2020 Protests" tiles rendering at exactly 344px wide each — totalling 1057.59px on a 985px viewport. Root cause: `BoxRenderer` looks up sizes via `sizes.get(tree.content.id)`, but the synthetic items had `id=null` (BE constructed `ContentModels.Collection` with a null content-table ID). All three null-ID entries collided on the same Map key, so all three items got the SAME size — the last inserted one.

**Fix (FE side, `convertCollectionContentToParallax`):** fall back to `col.referencedCollectionId` when `col.id` is null:
```ts
id: col.id ?? col.referencedCollectionId,
```
This makes every parallax card uniquely identifiable downstream regardless of what the BE returns.

**Fix (BE side, `SyntheticCollectionResolver`):** also pass `c.getId()` instead of `null` for the content-table ID so the data is correct at the source. Belt-and-suspenders.

### Bug 3 — Row key collisions

`Component.tsx` built React row keys as `row-${items.map(i => '${i.content.contentType}-${i.content.id}').join('-')}`. With null IDs, every row keyed as `row-IMAGE-null-IMAGE-null-IMAGE-null` and React threw duplicate-key warnings.

**Fix:** Include `rowIndex` and fall back to `orderIndex` when id is null:
```ts
const rowKey = `row-${rowIndex}-${items.map(i => `${i.content.contentType}-${i.content.id ?? i.content.orderIndex}`).join('-')}`;
```

### Bug 4 — "No Image" placeholder is not clickable

`CollectionContentRenderer` early-returned a bare `<div>` for the no-image branch with `hasClickHandler: false` hardcoded. Collection cards (which have a `slug`) couldn't be navigated when their cover image was missing.

**Fix:** Use the same `hasClickHandler` flag and `handleClick` callback as the regular tile path, plus `role="button"`, `tabIndex={0}`, and Enter/Space keyboard handling. Show `overlayText || 'No Image'` instead of always "No Image" — the collection title is now displayed.

### Bug 5 — No-image cards distort the BoxTree layout

`extractCollectionDimensions` returned `{ undefined, undefined }` when a coverImage was missing. Downstream, `getContentDimensions` fell back to `{ width: 1300, height: 867 }` (AR 1.5), making no-image cards behave like landscape photos and causing the BoxTree algorithm to pack them inconsistently.

**Fix:** `convertCollectionContentToParallax` (only that one call site) defaults missing dimensions to `1000×1000`. `extractCollectionDimensions` itself is unchanged so `createHeaderRow` can still return null when a cover image truly has no dimensions (placeholder-cover headers were not desired).

### Tests updated
`tests/utils/contentLayout.test.ts` — six cases now assert the new 1:1 default for `convertCollectionContentToParallax` and the unchanged `undefined` behavior for `convertCollectionContentToImage`.

---

## 3) `4cbdfb6` — Paginated `/all-images` with sentinel prefetch

Replaces the previous "fetch all 10,000 images at once" implementation with proper pagination. Sized for libraries that will outgrow 10k.

### Architecture
- **SSR page 0**: `app/(admin)/all-images/page.tsx` is a Server Component (`force-dynamic`) that fetches the first 50 images via `getAllImages({ page: 0, size: 50 })` and hands them to `<AllImagesClient initial={page0} />`. Fast initial paint, auth cookies forwarded server-side.
- **Client takes over for subsequent pages**: `useImageBrowser(initial)` owns the growing `pages[]` state. After mount, page 1 is auto-prefetched so it's cached before the user scrolls. A sentinel `<div>` placed after the grid is observed via `useInViewport` with `rootMargin: '100% 0px'` (one viewport ahead). When visible AND not loading AND not done, `loadNext()` fires.
- **Same layout as every other collection page**: `AllImagesClient` synthesizes a `CollectionModel` (slug `'all-images'`, type `MISC`, `displayMode: 'CHRONOLOGICAL'`) and feeds it through the standard `<CollectionPage>` pipeline. SiteHeader, filter bar, grid layout — all consistent with `/adventure`, `/film`, etc.
- **Render cap bypass**: the synthetic collection's `contentPerPage` is set to `Number.MAX_SAFE_INTEGER` so `ContentBlockWithFullScreen`'s built-in client-side render cap never engages — every loaded item renders immediately, since pagination is already handled at the data layer here.

### API change — `app/lib/api/content.ts`

Old:
```ts
getAllImages(size = 10_000): Promise<ContentImageModel[]>
```

New:
```ts
interface GetAllImagesParams {
  page?: number;
  size?: number;
  locationId?: number;
  tagIds?: number[];
  personIds?: number[];
  cameraId?: number;
  lensId?: number;
  minRating?: number;          // returns images with rating >= minRating
  isFilm?: boolean;
  blackAndWhite?: boolean;
  captureStartDate?: string;   // ISO YYYY-MM-DD
  captureEndDate?: string;
}

interface PagedImages {
  items: ContentImageModel[];
  page: number;
  totalPages: number;
  totalElements: number;
  isLast: boolean;
}

getAllImages(params: GetAllImagesParams = {}): Promise<PagedImages>
```

Builds the BE query string from `params`, unwraps the Spring `Page<>` envelope, tolerates a bare-array fallback (synthesized into a single-page envelope).

### Hook — `app/hooks/useImageBrowser.ts`

```ts
useImageBrowser(initial: PagedImages): {
  items: ContentImageModel[];
  filters: GetAllImagesParams;
  setFilters: (next: Partial<GetAllImagesParams>) => void;
  loadNext: () => void;
  isLoading: boolean;
  isDone: boolean;
  error: Error | null;
}
```

- `pages: PagedImages[]` — append-only; `items` derived as `pages.flatMap(p => p.items)`.
- `isDone = pages.at(-1)?.isLast ?? false`.
- `fetchingRef` boolean lock prevents duplicate concurrent fetches (pages are sequential, queue is overkill).
- `requestIdRef` discards stale in-flight responses after a `setFilters`.
- Mount-only auto-prefetch via stable refs (`fetchPageRef`, `filtersRef`) — fires page 1 exactly once.

### Filter bar status
The filter bar comes from `CollectionPageClient`'s standard implementation — same UI as every other collection page. Filtering is **client-side, on currently-loaded items**.

`useImageBrowser.setFilters` is wired and ready for server-side filtering, but currently unused. To upgrade later: render a UI that calls `setFilters({ minRating: 4, locationId: 8, ... })` and the hook will reset to page 0 of the new filtered universe via the BE.

### Concrete request sequence

```
Initial:
  SSR  GET /api/admin/content/images?page=0&size=50           → 50 oldest
  hydrate
  client GET ?page=1&size=50  (auto-prefetch on mount)        → next 50

Scroll-triggered:
  client GET ?page=2&size=50  (sentinel within 1 viewport)    → next 50
  ...

End:
  isLast=true → sentinel stays mounted but no further requests fire.
```

### Tests added
- `tests/lib/api/content.test.ts` — 3 cases for `getAllImages` (envelope, filter params, bare-array fallback).
- `tests/hooks/useImageBrowser.test.ts` — 5 cases (SSR seed + auto-prefetch, no-prefetch when last, loadNext + isDone, setFilters reset, stale-response discard).
- `tests/(admin)/all-images/AllImagesClient.test.tsx` — 6 integration cases (sentinel triggers loadNext, guards against isLoading/isDone, error retry, clean stop on isDone).

---

## Verification status at handoff

- TypeScript: clean (`tsc --noEmit` produces no errors except pre-existing stale `.next/types/validator.ts` references to deleted `collectionType/[collectionType]/page` and `disabled`-field test errors — both unchanged from before this session).
- ESLint + Stylelint: clean on every file modified or added in this session.
- Jest: **1355 passing**, 6 failing. The 6 failures are all in `tests/(admin)/admin/{AdminHubGrid,adminTiles,page}.test.tsx` and reference the removed `disabled` admin-tile field — pre-existing, flagged in commit 1's message as a follow-up.

## BE coupling

This work depends on `0085-admin-hub` having merged its companion changes. Specifically:
- `/api/admin/content/images` now accepts filter params (`locationId`, `tagIds`, `minRating`, etc.) in addition to `page`/`size`. The FE only uses `page`/`size` today, but the API surface is wired.
- `ContentRepository.searchImages` orders results `capture_date ASC, created_at ASC` — matches the FE's CHRONOLOGICAL displayMode and prevents cross-page layout shifts.
- `LocationRepository.findLocationsWithVisibleContent` is no longer broken by the V20 `collection.visible` column drop.
- `SyntheticCollectionResolver` no longer emits null content-table IDs.

The BE branch `0085-admin-hub` should be deployed first or together with this FE branch.

## Follow-up work (suggested order)

1. Fix the 6 pre-existing `disabled`-field test failures (low effort — the field is gone, tests should assert the new `adminTiles` shape).
2. Surface `useImageBrowser.setFilters` in a UI on `/all-images` so admins can filter the entire database (currently only filters loaded items via the standard CollectionPageClient filter bar).
3. URL-persisted filter state (`?minRating=4&locationId=8`) so refresh preserves what the admin was looking at.
4. Cross-page image cache (the user's earlier idea — pre-populate `/all-images` from images already loaded on other pages). Phase 2.

## Files in this branch (this session, summary)

```
app/(admin)/admin/AdminActionBox.{tsx,module.scss}            (new)
app/(admin)/admin/page.module.scss                             (new)
app/(admin)/all-images/page.tsx                                (refactored)
app/(admin)/collection/create/page.tsx                         (new)
app/components/Admin/AllImagesClient.{tsx,module.scss}         (new)
app/components/Content/CollectionContentRenderer.tsx           (modified)
app/components/Content/Component.tsx                           (modified)
app/components/ContentCollection/CollectionPageClient.tsx      (modified)
app/homePage/page.tsx                                          (new)
app/hooks/useImageBrowser.ts                                   (new)
app/lib/api/adminHome.ts                                       (new)
app/lib/api/content.ts                                         (modified)
app/utils/contentLayout.ts                                     (modified)
docs/handoffs/handoff_build_simplification.md                  (new)
docs/handoffs/handoff_pagination_filters_2026_05_06.md         (new — this file)
docs/superpowers/specs/2026-05-02-admin-hub-design.md          (new)
jest.setup.ts                                                  (modified)
proxy.ts                                                       (modified)
tests/(admin)/admin/{4 files}                                  (new)
tests/(admin)/all-images/AllImagesClient.test.tsx              (new)
tests/homePage/page.test.tsx                                   (new)
tests/hooks/useImageBrowser.test.ts                            (new)
tests/lib/api/{content,adminHome}.test.ts                      (modified, new)
tests/proxy.test.ts                                            (new)
tests/utils/contentLayout.test.ts                              (modified)
```
