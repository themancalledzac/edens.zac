# Thin-Component / Co-located Helper Extraction — Phase 1 Audit Report

_Date: 2026-06-03 · Chapter [006 · Code Health](../../006-code-health.md) · Phase 1 of the [thin-component extraction sweep](006-thin-component-extraction.md) · sibling axis to [function decomposition](006-function-decomposition.md)._

> **Scope:** Read-only audit of every `'use client'` component for the "thin component → co-located `*Utils.ts`" refactor pattern (exemplar: commit `7d8bdac`, `Component.tsx` → `componentUtils.ts`). No code was changed. This report is the input to Phase 2.
>
> **Doc-path note:** The task referenced `2026-06-03-thin-component-helper-extraction-sweep.md` (absent on disk). The authoritative recipe/rubric is [`006-thin-component-extraction.md`](006-thin-component-extraction.md); this report is written to the task's requested path. `docs/superpowers/` is gitignored — the commit is local-only by convention.

## Method

1. **Survey regenerated** (not a stale snapshot) — `grep -rl "'use client'" app --include="*.tsx"`, ranked by lines | hooks. **42 files** (see appendix).
2. Each file scored 0–2 on three axes (**total ≥4 = candidate**, 2–3 = optional, 0–1 = skip):
   - **Inline derivation** — 0 none · 1 = 1–2 small · 2 = 3+ derivations or any `useMemo`/`useCallback` body >10 lines / inline transform fn.
   - **Untested pure logic** — extractable logic currently only reachable via render.
   - **Size / mixed concerns** — 0 <120L · 1 = 120–300 · 2 = >300L or many branches.
3. Extractable = depends only on its args (no hooks, no un-passable closures). The `useMemo`/`useCallback` wrapper stays in the component; its body moves to a pure helper.
4. **Project code-quality rule enforced** (MemPalace `ai_main.md`): trivial single-expression logic is **not** extracted — a helper earns its place only with non-trivial logic, 3+ call sites, or a meaningful domain concept.
5. Parallelized across 6 agents by directory (disjoint files, no conflicts).

---

## Candidate ranking (score desc, then risk asc)

| # | Component | Score | Effort / Risk | New utils file | 006 overlap |
|---|---|---|---|---|---|
| 1 | `ContentCollection/CollectionPageClient.tsx` | **6/6** | L / med | consolidate into `app/utils/contentFilter.ts` | no |
| 2 | `ui/Dropdown/Dropdown.tsx` | **6/6** | L / med | `dropdownUtils.ts` | no |
| 3 | `Content/CollectionContentRenderer.tsx` | **5/6** | M / med | `collectionContentRendererUtils.ts` | yes (#3 — `resolveNaNDimensions`) |
| 4 | `Content/BoxRenderer.tsx` | **4/6** | S / low | `boxRendererUtils.ts` | no |
| 5 | `ImageMetadata/sections/EssentialInfoSection.tsx` | **4/6** | S / low | `essentialInfoUtils.ts` | no |
| 6 | `ui/FilterToolbar/FilterToolbar.tsx` | **4/6** | S / low | `filterToolbarUtils.ts` / `GalleryFilter.ts` | no |
| 7 | `FullScreenModal/FullScreenModal.tsx` | **4/6** | S / low | `fullScreenModalUtils.ts` | no |
| 8 | `LocationPage/LocationPageClient.tsx` | **4/6** | M / med | consolidate into `app/utils/contentFilter.ts` | no |

**Optional (score 2–3)** — do only if cheap or alongside a neighbor: `ContentBlockWithFullScreen` (3/6, **defer to 006 #9** — it's a hook, not a pure util), `CollectionListSelector` (3/6), `ClientGalleryGate` (3/6), `CommentsList` (2/6, marginal — logic already module-scoped; lean skip).

**Own plan:** `ManageClient.tsx` (1719L) — spun out, do not attempt in this sweep.

**Highest-value first pass (recommended):** #1 CollectionPageClient + #2 Dropdown carry the most untested derivation; both have strong existing test guards (Dropdown) or a tested neighbor util (CollectionPageClient → `contentFilter.test.ts`). #4–#7 are quick low-risk wins.

---

## Candidates & optional — full blocks

### CollectionPageClient.tsx — score 6/6 — L effort / med risk
Extract → consolidate into `app/utils/contentFilter.ts` (do NOT fork a new `CollectionPageClientUtils.ts` — the filter domain already lives there and is tested):
- `extractCollectionFilterOptions(images, collectionRefs?) -> CollectionDimensions` — already a file-local top-level fn (lines 44–74), untested; move to `contentFilter.ts` and unit-test the lens-type-threshold + `filterable` logic (pure)
- `buildCollectionCriteria(filterState) -> ContentFilterCriteria` — the `criteria` memo body at lines 156–176, **duplicated** in `handleFilterChange` at lines 272–284 (3 call sites incl. URL sync). Single source of truth kills the "mirror the criteria mapping above" drift comment. (pure)
- `hasAnyActiveFilter(filterState) -> boolean` — `hasActiveFilters` body, lines 178–188 (pure)
- `applyCollectionFilters(allContent, allImages, criteria, selectedLensTypes) -> AnyContentModel[]` — the `filteredContent` memo body at lines 191–207 (lens-type post-filter + image-id reattach); pairs with `filterContent` already in the util (pure)
- `hasValueVariance(images, selector) -> boolean` — `hasRatingVariance` (213–217) and `hasDateVariance` (312–315) are the same Set-size>1 shape, 2 call sites; one helper covers both (pure)
- `mergeDateSortedImages(processed, direction) -> AnyContentModel[]` — the `contentBlocks` date-sort merge at lines 253–261 (non-trivial index-walk re-interleave) (pure)
- `hasFilterableOptions(baseOptions, showHighlyRated, hasDateVariance) -> boolean` — `hasOptions` body, lines 317–328 (pure)

Note: `isCollectionDominant` (136) is a single comparison — leave inline per the no-trivial-extraction rule.
Existing behavior guard: `tests/utils/contentFilter.test.ts` (covers `filterContent`/`extractFilterOptions`/`computeFilterCounts`) + `tests/hooks/useFilterUrlState.test.tsx`. No test exercises the component's derivations directly → add unit tests for each new helper as extracted; the moved `extractCollectionFilterOptions` and the criteria-builder are the highest-value coverage gaps.
Browser smoke: load a collection page with a filter bar, toggle Highly Rated + a tag + lens-type chip, confirm grid filters and URL serializes (`?rating=4&tag=...`); load a collection-dominant page (`/all-collections`) and confirm image-only chips (cameras/lenses/lensTypes) stay suppressed.
006 overlap: no
Flags (don't fix): module-scope `EMPTY_STRING_DIM`/`EMPTY_LENSTYPE_DIM` consts (76–77) are fine; the "Mirror the `criteria` mapping above" comment (269–271) flags the live duplication the `buildCollectionCriteria` extraction resolves; `selectedLenses` exists in `criteria`/`hasActiveFilters` but has no URL key by design (documented 269–272) — carry forward, not dead.

### Dropdown.tsx — score 6/6 — L effort / med risk
Extract → `app/components/ui/Dropdown/dropdownUtils.ts` (helpers generic over `T extends MetadataItem`):
- `getItemDisplayName(item: T | null | undefined, getDisplayName?: (item: T) => string) -> string` — moves the display-name resolution at lines 120–128 (pure; needs `getDisplayName` threaded)
- `getKey(item: T, getItemKey?: (item: T) => string | number) -> string | number` — moves the key fallback at lines 131–134 (pure; needs `getItemKey` threaded)
- `itemExistsInDatabase(item: T | null | undefined) -> boolean` — moves the id>0 check at lines 137–140 (pure)
- `isItemSelected(item: T, selectedValue, selectedValues: T[], multiSelect: boolean, getDisplayName?) -> boolean` — moves the id-or-name match at lines 142–152 (pure; needs `getDisplayName` threaded)
- `removeFromSelection(selectedValues: T[], item: T, getDisplayName?) -> T[]` — moves the dedup `.filter` shared by lines 179–182 and 199–202 (pure; 2 call sites; needs `getDisplayName` threaded)
- `toggleMultiSelection(selectedValues: T[], item: T, getDisplayName?) -> T[]` — moves the multi-select add/remove branch at lines 176–189 (pure; reuses `removeFromSelection`)
- `isFieldVisible(field: AddNewField, formData: AddNewFieldFormData) -> boolean` — moves the `showWhen` predicate at lines 206–207 (pure; 3+ sites: validate + process + render)
- `findMissingRequiredFields(fields: AddNewField[], formData) -> AddNewField[]` — moves the required-field validation filter at lines 211–217 (pure)
- `processAddNewFormData(fields: AddNewField[], formData) -> Record<string, string | number | boolean | null>` — moves the type-coercion loop at lines 220–236 (pure; non-trivial checkbox/number/string branches + hidden-field drop)
- `isAddNewFormValid(fields: AddNewField[], formData) -> boolean` — moves the every-required-valid check at lines 246–260 (pure; non-trivial number/NaN branch)

Existing behavior guard: `tests/components/ui/Dropdown.test.tsx` (select / multi-select chip / add-new validate+process / Escape / keyboard-open / simple variant — strong contract guard; add direct unit tests per new helper)
Browser smoke: ImageMetadataModal Camera/Lens/Film/Tags dropdowns (single-select, multi-select chip remove, "+" add-new with film-format `showWhen`); admin ManageClient lists (`variant="simple"`)
006 overlap: no
Flags (don't fix): `getItemDisplayName` defensively coerces a non-string `getDisplayName` result to `''` (lines 122–125) — carry that branch into the helper. Static inline content string `🔴 Will be added` at line 300 (content, not a style).

### CollectionContentRenderer.tsx — score 5/6 — M effort / med risk
Extract → `app/components/Content/collectionContentRendererUtils.ts`:
- `toCollectionDimensions(filterOptions) -> Partial<Record<ArrayFilterKey, ToolbarDimension>>` — moves the filter-options→toolbar-dimensions mapping at lines 46–80 (pure; already a module-scope function, just relocate + test)
- `resolveValidDimensions({width, height, imageWidth, imageHeight}) -> {width, height}` — moves the NaN-recovery branch ladder at lines 531–556 (pure; the `logger.error` side-effect at 517–529 stays in the component). **This IS 006 #3's `resolveNaNDimensions()`** — do not duplicate; if 006 lands first, consume its helper.
- `getClickEligibility({contentType, isReorderMode, hasSlug, onImageClick, enableFullScreenView, onFullScreenImageClick}) -> {hasClickHandler, isSlugNav}` — moves the duplicated guard derivation at lines 138–149 + the early-return guards inside `handleClick` (152–154). Pure; names a real domain concept, appears at 3 sites.
Existing behavior guard: `tests/components/Content/CollectionContentRenderer.test.tsx` (TEXT/Related branch only — thin). Add characterization coverage for the GIF/placeholder/image branches before touching click-eligibility.
Browser smoke: load a client-gallery collection page (`/collection/<slug>`) — verify image click opens fullscreen, COLLECTION tiles navigate via href, filter toolbar dropdowns populate, reorder overlay arrows on the admin manage page.
006 overlap: **yes** — `resolveValidDimensions` IS 006 #3's `resolveNaNDimensions`. The TextContentBlock/GifContentBlock/ImagePlaceholder/ImageContent **sub-component split** belongs to 006; logic extraction (the 3 helpers above) is THIS plan. Don't duplicate. **Coordinate / serialize with 006 (Task D).**
Flags (don't fix): underused param `_hasSlug` is read as a boolean (`!!_hasSlug`) AND as a route segment (`/${_hasSlug}` at line 585) — the leading-underscore name signals "unused" but it's load-bearing; misleading. Inline `style={{ width, height }}` objects recomputed per-render at lines 238–241, 356–360, 425–429, 450–453, 571–577 (→ inline-style plan). Inline `onKeyDown` arrow at 415–423.

### BoxRenderer.tsx — score 4/6 — S effort / low risk
Extract → `app/components/Content/boxRendererUtils.ts`:
- `computeReorderFlags(contentId, { isReorderMode, pickedUpImageId, reorderMoves, reorderDisplayOrder }) -> { isPickedUp, hasMoved, isFirstInOrder, isLastInOrder }` — moves the reorder-flag derivation at lines 92–96 (pure). Names a real domain concept, currently untested, the only non-trivial logic in this otherwise pass-through recursive component.
Existing behavior guard: none → write the unit test for `computeReorderFlags` as the extraction's TDD anchor (covers `indexOf === -1` → isFirst false / isLast edge when id absent from `reorderDisplayOrder`).
Browser smoke: admin manage page (`/collection/manage/<slug>`) in reorder mode — pick up an image, confirm left/right arrows disable correctly at first/last positions and picked-up state highlights.
006 overlap: no
Flags (don't fix): the leaf-vs-combined branch otherwise threads ~22 props through `fullProps`/`childProps` spreads — pure plumbing, not extractable. `isFirstInOrder`/`isLastInOrder` are computed even when not in reorder mode (minor, harmless).

### EssentialInfoSection.tsx — score 4/6 — S effort / low risk
Extract → `app/components/ImageMetadata/sections/essentialInfoUtils.ts`:
- `toggleCollectionVisibility(collections, currentCollectionId, checked, availableCollections) -> CollectionJunction[]` — moves the append-vs-update junction-array logic at lines 53–86 (pure; thread `availableCollections` for the name lookup at line 73). Real branch: update-in-place when the junction exists vs. append a new one with `orderIndex: currentCollections.length`.
- `isCurrentCollectionVisible(collections, currentCollectionId) -> boolean` — moves the `visible !== false` default-visible derivation at lines 48–49 (pure). Borderline alone, but it's the read-side mirror of the toggle's domain rule and pairs naturally in the same util + test.
Existing behavior guard: `tests/components/ImageMetadata/sections/EssentialInfoSection.test.tsx` exists but only asserts the checkbox *renders* (lines 68–75) — never exercises the append-vs-update branching or the default. Treat as **no real guard → write characterization tests for both branches first**, then extract.
Browser smoke: open the metadata modal on an image inside a collection, toggle "Collection Visibility" off then on, save, and confirm round-trip for both an image already in the collection and one being added.
006 overlap: no
Flags (don't fix): none.

### FilterToolbar.tsx — score 4/6 — S effort / low risk
Extract → `app/components/ui/FilterToolbar/filterToolbarUtils.ts` (or co-locate the film helper in `app/types/GalleryFilter.ts` next to `cycleDateSort`):
- `cycleFilmFilter(current: FilmFilter) -> FilmFilter` — moves the tri-state map+lookup at lines 96–99 (pure; mirrors existing `cycleDateSort` — preferred home is `GalleryFilter.ts`)
- `computeHasActiveFilters(filterState, arrayKeys: readonly ArrayFilterKey[]) -> boolean` — moves the multi-clause active-filter check at lines 103–107 (pure; non-trivial OR over date/rated/film + array-key `.some`)
- `isOptionAvailable(filteredAvailable, key: ArrayFilterKey, value: string) -> boolean` — moves the 3-state availability lookup at lines 90–94 (pure)
Existing behavior guard: `tests/components/ui/FilterToolbar.test.tsx` (date/rated/film cycle, dropdown toggle, unavailable greying, reset visibility, density slider — covers all three targets behaviorally; add direct unit tests per helper)
Browser smoke: client gallery / collection filter bar — open a dimension dropdown, toggle film chip off→film→digital→off, confirm reset (×) appears only with an active filter
006 overlap: no
Flags (don't fix): `ARRAY_KEYS` const (lines 52–59) duplicates the array-key list implied by `INITIAL_FILTER_STATE` in `GalleryFilter.ts` — single-source it when extracting `computeHasActiveFilters` (which already takes `arrayKeys` as an arg). Trivial `filmCount` (101) and `toggleOpen` (88) — do NOT extract.

### FullScreenModal.tsx — score 4/6 — S effort / low risk
Extract → `app/components/FullScreenModal/fullScreenModalUtils.ts`:
- `resolveDisplayLocations(currentImage, collectionData, isGif) -> LocationModel[]` — moves the image-vs-collection location fallback at lines 100–103 (pure; GIFs have no locations so fall through to collection)
- `resolveDisplayDate(currentImage, collectionData, isGif) -> string | null` — moves the captureDate→collectionDate fallback at lines 105–109 (pure)
- `isGifBlock(block) -> block is ContentGifModel` — already a module-level pure type guard at lines 27–29; co-locate with the two resolvers (meaningful domain concept, 3 call sites: 96, 100, 107)
- Do NOT extract `hasPrevious`/`hasNext` (112–113) or inline `key`/`alt` strings — trivial.
Existing behavior guard: `tests/components/FullScreenModal/FullScreenModal.counter.test.tsx` (covers only the position counter, NOT date/location resolution) → write characterization tests for the two resolvers first
Browser smoke: open any client-gallery image fullscreen, toggle metadata (↖ button), confirm date/location line renders with image fields and a GIF block falls back to collection date
006 overlap: no
Flags (don't fix): inline `e.preventDefault()/stopPropagation()` nav handlers are wiring; `IMAGE.defaultWidth/Height` fallbacks fine; none material.

### LocationPageClient.tsx — score 4/6 — M effort / med risk
Extract → consolidate into `app/utils/contentFilter.ts` (same domain as CollectionPageClient; share helpers, don't fork):
- `buildLocationCriteria(filterState) -> ContentFilterCriteria` — the `criteria` memo body at lines 49–58, **duplicated** in `handleFilterChange` at lines 98–104 (3 call sites). Differs from the collection variant (adds `isFilm`, no match-mode/locations) — extract as its own helper or parameterize. (pure)
- `filmFilterFromIsFilm(isFilm) -> FilterState['filmFilter']` — already a file-local top-level fn (lines 30–34), single call site, untested. Trivial 3-branch map — extract only when co-locating the criteria builder (it's the inverse of the `isFilm` branch), else leave inline.
- The `computeFilterCounts` try/catch fallback (70–87) wraps an already-tested util with a static empty literal — leave inline (error boundary, not derivation).
Existing behavior guard: `tests/utils/contentFilter.test.ts` covers `filterContent`/`computeFilterCounts`/`extractFilterOptions`; no component-level test → add unit tests for `buildLocationCriteria` (+`filmFilterFromIsFilm` if extracted).
Browser smoke: load a location page, toggle Highly Rated + Film/Digital + a tag, confirm grid + counts update and URL serializes (`?rating=4&isFilm=true&tag=...`); confirm Back restores filtered state.
006 overlap: no
Flags (don't fix): duplicated criteria mapping between the memo and `handleFilterChange` (the extraction resolves it); `dateSortDirection`/lens dims intentionally have no URL key (documented 95–97) — carry forward.

### ContentBlockWithFullScreen.tsx — score 3/6 — S effort / low risk — OPTIONAL (defer to 006 #9)
Extract → (defer to 006 — see overlap):
- `usePagination(contentLength, initialCount, incrementAmount) -> { visibleCount, hasMore, showButton, sentinelRef, handleLoadMore }` — wraps the pagination state + IntersectionObserver at lines 138–176. This is a **hook**, not a pure util — it is **006 #9**, not this logic-extraction plan.
- The only pure-util candidate, the `viewableBlocks` filter predicate (106–111), is a single-expression `IMAGE || GIF` type guard — too trivial per the code-quality rule. Skip.
Existing behavior guard: none → if `usePagination` is pulled out under 006, write a `renderHook` test for load-more increment + clamp-to-length first.
Browser smoke: load a collection with >initialPageSize images — scroll to sentinel, confirm "Load More" appears and increments "Showing N of M"; deep-link `?image=<id>` reload restores the viewer.
006 overlap: **yes** — pagination is 006 #9's `usePagination` hook. No separate pure-logic extraction for THIS plan. Don't duplicate.
Flags (don't fix): none.

### CollectionListSelector.tsx — score 3/6 — S effort / low risk — OPTIONAL
Extract → `app/components/CollectionListSelector/collectionListSelectorUtils.ts`:
- `getCheckboxState(collectionId, savedIds, pendingAddIds, pendingRemoveIds) -> CheckboxState` — already a module-level pure function at lines 37–47; move + add a unit test (4-branch priority logic, meaningful domain concept, called from both columns)
- `orderCollections(collections, excludeCollectionId, pinnedCollectionId) -> CollectionListModel[]` — moves the exclude-filter + pin-to-top derivation at lines 73–85 (pure; consolidates two derived arrays into one tested helper)
- Do NOT extract `siblingMode` (70–71, trivial) or `renderCheckbox`/`handleRowClick` (closures over hover setState — not pure).
Existing behavior guard: `tests/components/CollectionListSelector.test.tsx` (verify it exercises checkbox-state + pin/exclude ordering before moving; if not, add cases)
Browser smoke: open the image-metadata editor's collection picker; confirm pinned gallery sits at top and pending-add/remove/saved checkbox colors are unchanged
006 overlap: no
Flags (don't fix): none

### ClientGalleryGate.tsx — score 3/6 — S effort / med risk — OPTIONAL
Extract → `app/components/ClientGalleryGate/clientGalleryGateUtils.ts`:
- `getGateErrorMessage(error) -> string` — moves the `ApiError` status→message mapping in the catch block at lines 80–97 (pure; maps 429/404/403/other/non-ApiError to user-facing strings — non-trivial branch logic, the one genuinely testable transform here)
- Do NOT extract `handleSubmit` (async, closes over setState/router/import) or the `password.trim()` empty-check (trivial).
Existing behavior guard: `tests/components/ClientGalleryGate.test.tsx` (verify it asserts the specific 429/404/403 messages; if only happy-path, write characterization tests for `getGateErrorMessage` first — hence med risk)
Browser smoke: locked client gallery — submit wrong password (expect "Incorrect password"), simulate a 429 (expect the rate-limit message)
006 overlap: no
Flags (don't fix): the MemPalace index for this file is stale (shows an older sessionStorage-probe variant) — current source is the `submitState` + `UNLOCKING_FAILSAFE_MS` version; audit done against current source.

### CommentsList.tsx — score 2/6 — S effort / low risk — OPTIONAL (marginal, lean skip)
Extract → `app/(admin)/comments/commentsListUtils.ts`:
- `relativeTime(iso, now?) -> string` — moves the `relative()` UTC-normalize + `Intl.RelativeTimeFormat` bucketing at lines 22–31 (pure; thread `now` so it's deterministically testable instead of reading `Date.now()` inline)
- `gmailReplyUrl(email) -> string` — moves the `URLSearchParams` compose at lines 33–41 (pure)
Existing behavior guard: `tests/components/CommentsList.test.tsx` — render-level only; nothing asserts `gmailReplyUrl` or the hour/day boundary buckets. If extracted, add direct unit tests for bucket boundaries (59m vs 60m, 23h vs 24h) and `Z`-suffix normalization.
Browser smoke: `/admin/comments` — verify timestamps read "x minutes/hours/days ago" and "Reply in Gmail" opens a compose window prefilled `to=`.
006 overlap: no
Flags (don't fix): both helpers are **already module-scoped** (not inline in JSX), and `gmailReplyUrl` is a single-expression builder at 1 call site → per the no-trivial-helper rule it does NOT earn extraction; only `relativeTime` has non-trivial branching worth a unit test. Marginal candidate — the "thin component" win is small since logic is already out of the JSX. **Lean skip / optional.**

---

## Spun to its own plan

### ManageClient.tsx — spin to its own incremental plan
1719L; already has `manageUtils.ts` + `useImageClickHandler` — too large for one pass. Recommend a dedicated `006-manageclient-decomposition.md` (per 006 #5): incremental, multi-commit, test-guarded extraction of the remaining state machine (form state, location derivation, collection toggling, upload, text-block create, bulk-edit, cover selection, reorder). **Not audited in this sweep.**

---

## Skips (not candidates)

**Already done (exemplar pattern applied):**
- `Content/Component.tsx` — logic in `componentUtils.ts`, tested in `tests/components/Content/componentUtils.test.ts`.
- `ClientGalleryDownload/ClientGalleryDownload.tsx` — co-located utils already extracted.

**Presentational / primitives (props → markup, no derivation):**
- `Content/ReorderOverlay.tsx` — booleans/callbacks consumed directly in JSX.
- `Content/BoxRenderer.tsx` — _candidate, see above (one helper); the rest is prop plumbing._
- `LocationPage/LocationCollections.tsx` — card grid + `useParallax`; only an `Array.isArray`/length guard.
- `ui/IconButton.tsx`, `ui/Button.tsx`, `ui/Tile.tsx` — only trivial className joins / a `spinnerColor` ternary.
- `MetadataPage/MetadataPageClient.tsx` — pure JSX composition; only trivial `getHref` slug builders.
- `RatingStars.tsx` — trivial toggle one-liner + presentational star map.
- `SiteHeader.tsx` — open/close state + two one-line toggles, then markup.

**Context providers (createContext + Provider + useContext, no logic):**
- `ContentCollection/CollectionFilterContext.tsx`, `ContentCollection/ClientGalleryDownloadContext.tsx`.

**Error boundaries (lifecycle only):**
- `ErrorBoundary/ErrorBoundary.tsx`, `app/error.tsx`, `app/(admin)/error.tsx`.

**Logic already extracted / already thin:**
- `ImageMetadata/sections/CameraSettingsSection.tsx` — its real transform `computeCameraSelectionUpdate` already lives in `imageMetadataUtils.ts` (tested); rest is form JSX + impure eager-create flow.
- `ImageMetadata/ImageMetadataModal.tsx` — already a thin orchestrator (~203L; 872L→203L). **006 #4's section/hook split is already complete** (5 section components + `useImageMetadataState`/`useImageMetadataSubmit`). Nothing left to decompose here.

**Form-only / async-I/O / hooks-bound (no extractable pure derivation):**
- `ImageMetadata/sections/MediaPreview.tsx` (a JSX-returning render helper, not a data transform — has tests), `ImageMetadata/sections/TagsPeopleSection.tsx` (trivial spread one-liners), `ui/MetadataList.tsx` (async I/O + `window.confirm`), `ui/Modal.tsx` (focus-trap/scroll-lock hooks over DOM refs), `MenuDropdown.tsx` (router/toggle/click-outside wiring), `TextBlockCreateModal.tsx` (controlled inputs + async submit), `ClientGalleryDownload/FullScreenDownloadButton.tsx` (blob-download via fetch + timers), `ContactForm.tsx` (controlled inputs; submit delegates to `contactApi.ts`), `Admin/AllImagesClient.tsx` (two thin sub-10-line memos; IO-sentinel bridge is hooks-bound — well-tested).

**Hooks — not components (out-of-scope "stretch set" per plan):**
- `hooks/useFullScreenImage.tsx` — confirms 006 #11 (`useSwipeGesture` for the touch-handler trio at 262–306; pure URL builders already module-scoped at 33–46).
- `hooks/useCollectionData.tsx`, `hooks/useImageMetadataEditor.tsx`.

---

## Cross-cutting flags (defer to their own plans — do NOT fix here)

- **Stale 006 dead-code entry:** `006-function-decomposition.md:165` lists `_onBack` as a dead prop in `ContactForm.tsx`, but `_onBack` no longer exists anywhere in `app/` or `tests/` (grep = 0 hits). Current props are `{ onSubmit }` only. → Update/remove that 006 line.
- **Stale MemPalace index:** the `edens-zac` drawer for `ClientGalleryGate.tsx` reflects an older sessionStorage-probe variant; current source uses `submitState` + `UNLOCKING_FAILSAFE_MS`. → Re-sync the wing.
- **`_hasSlug` misleading name** (`CollectionContentRenderer.tsx`) — leading-underscore signals "unused" but it's read as both a boolean (`!!_hasSlug`) and a route segment (line 585). → Rename (its own cleanup).
- **Inline `style={{...}}` recomputed per render** in `CollectionContentRenderer.tsx` (lines 238–241, 356–360, 425–429, 450–453, 571–577) and an inline `onKeyDown` arrow (415–423). → Belong to `006-inline-jsx-config-cross-file.md` / the inline-style→SCSS rule, NOT this plan.
- **Magic string** `/_DSC0145.jpg` About-image preload in `MenuDropdown.tsx:152` — known TODO (should be a constant / DB-driven). → Its own follow-up.

---

## Appendix — regenerated survey (42 `'use client'` files, lines | hooks)

```
 1719 | hooks:53  | (admin)/collection/manage/[[...slug]]/ManageClient.tsx
  641 | hooks:4   | components/Content/CollectionContentRenderer.tsx
  485 | hooks:6   | components/ui/Dropdown/Dropdown.tsx
  370 | hooks:25  | components/ContentCollection/CollectionPageClient.tsx
  342 | hooks:2   | components/ImageMetadata/sections/CameraSettingsSection.tsx
  340 | hooks:24  | hooks/useFullScreenImage.tsx
  340 | hooks:2   | components/FullScreenModal/FullScreenModal.tsx
  290 | hooks:8   | components/MenuDropdown/MenuDropdown.tsx
  241 | hooks:10  | components/Content/ContentBlockWithFullScreen.tsx
  237 | hooks:4   | components/CollectionListSelector/CollectionListSelector.tsx
  219 | hooks:4   | components/ui/FilterToolbar/FilterToolbar.tsx
  215 | hooks:12  | components/ClientGalleryDownload/ClientGalleryDownload.tsx
  212 | hooks:0   | components/ImageMetadata/sections/EssentialInfoSection.tsx
  203 | hooks:0   | components/ImageMetadata/ImageMetadataModal.tsx
  200 | hooks:4   | components/Content/Component.tsx
  161 | hooks:8   | components/LocationPage/LocationPageClient.tsx
  160 | hooks:0   | components/Content/BoxRenderer.tsx
  154 | hooks:6   | components/ClientGalleryGate/ClientGalleryGate.tsx
  154 | hooks:5   | components/ui/MetadataList/MetadataList.tsx
  147 | hooks:6   | components/TextBlockCreateModal/TextBlockCreateModal.tsx
  137 | hooks:9   | components/ClientGalleryDownload/FullScreenDownloadButton.tsx
  126 | hooks:0   | components/ImageMetadata/sections/MediaPreview.tsx
  122 | hooks:6   | (admin)/comments/CommentsList.tsx
  112 | hooks:5   | hooks/useCollectionData.tsx
  111 | hooks:5   | components/ui/Modal/Modal.tsx
  102 | hooks:5   | components/ContactForm/ContactForm.tsx
  100 | hooks:0   | components/Content/ReorderOverlay.tsx
   97 | hooks:5   | components/Admin/AllImagesClient.tsx
   89 | hooks:0   | components/ImageMetadata/sections/TagsPeopleSection.tsx
   67 | hooks:0   | components/ErrorBoundary/ErrorBoundary.tsx
   65 | hooks:5   | hooks/useImageMetadataEditor.tsx
   61 | hooks:0   | components/ContentCollection/CollectionFilterContext.tsx
   60 | hooks:2   | components/SiteHeader/SiteHeader.tsx
   57 | hooks:0   | components/ui/IconButton/IconButton.tsx
   57 | hooks:0   | components/LocationPage/LocationCollections.tsx
   53 | hooks:0   | components/ui/Button/Button.tsx
   46 | hooks:3   | components/RatingStars/RatingStars.tsx
   44 | hooks:0   | components/ContentCollection/ClientGalleryDownloadContext.tsx
   40 | hooks:0   | components/MetadataPage/MetadataPageClient.tsx
   33 | hooks:0   | components/ui/Tile/Tile.tsx
   27 | hooks:2   | error.tsx
   27 | hooks:2   | (admin)/error.tsx
```

**Coverage:** 42/42 files audited — 8 candidates, 4 optional, 29 skips, 1 spun to its own plan.
