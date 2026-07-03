# Previous Work — Shipped Feature Log

> Concise record of completed work, mined from design/planning docs before those docs were
> removed (2026-06-01). 1–2 lines per item. For deeper detail, follow the cited commits/PRs in
> git history, or the surviving docs catalogued in [000-summary.md](000-summary.md).

## Since the 2026-06-10 index freeze (→ 2026-07-03)

The wave that landed after the last docs consolidation. One line each; mine git (`git log --since=2026-06-10`) for commit-level detail.

- **Directional prominence (unified layout value model)** — retired the vertical penalty, the `arFactor` cap, and the two competing wide-panorama mechanisms (`isFullWidthHero` / `getComponentValue` AR ramp) in favor of one orientation-agnostic prominence `P` (`contentRatingUtils.ts` → `getProminence`), decomposed into width-cost `Hv = √(P·AR)` and height-demand `Vv = √(P/AR)`; equity metric now targets area ∝ prominence. A 5★ portrait and a 5★ panorama command equal visual area. PR #182 (`0182`). → [005](005-layout.md).
- **Auth foundation + `/login` + passkeys** — cookie-session auth (`ezac_session`) via the BFF proxy, `me()`/`meServer` principal resolution, a `/login` page with password **and** WebAuthn passkey sign-in, and Log in / Log out in the nav menu (`useFetchMe`). PR #194 + surrounding commits.
- **Identity merge** — `User` types (PERSON status, nullable email, merge shapes), `users.ts` `getMergePreview`/`mergeUser`, a `MergeIdentityModal`, and a Merge action surfacing tag-only people in the admin Users panel. PR #191 (`0191-identity-merge`).
- **Save as Collection (tag-views → collection IA)** — synthetic tag "view" rows (`TagViewModel`) render read-only in the collection selector until promoted to a real collection via `POST /api/admin/tags/{id}/save-as-collection`. Part of the collection-IA / tag-view work.
- **Saves & follows + `/user` redesign** — per-user saved images ("selects") and follows (`personal.ts` / `selects.ts`, `/api/read/user/{saves,follows,selects}`), a personal `/user` space (sectioned collapsible: Collections / Images / Saved / Following) with real image tiles, a personal "Me" home tile for signed-in users, and `/user/selects`.
- **User invites** — invite-link onboarding (`/invite/[token]`, `/api/auth/invite/{token}`), a `GenerateInviteButton`, and admin per-collection client-access toggles; `/admin/users/[id]` renders the user's full page.
- **PANEL content type + admin panels** — a new `PANEL` `ContentType` (`panelType: 'users' | 'messages'`) rendered as a rated content block via `AdminPanelRenderer`; the admin hub now renders through the content pipeline (`AdminPanel` shell, `MessagesPanel`, `UserManagementPanel`). PR #197 (`0193-admin-comments-panel`).
- **Collection hard-delete** — a Delete-collection danger zone in the edit Structure tab + `useCollectionEdit` hard-delete action (`deleteCollection` typed `{ success }`). PRs #190/#192.
- **Per-user rating overrides** — server-seeded per-user rating overrides wired through a `RatingControlContext` + `RatingSliderGate` in image overlays (later the per-user rating slider was removed in favor of the seed). Multiple commits on the rating branch.
- **Mobile viewer gestures** — tap-to-fullscreen immersive mode, pinch-to-zoom, tap-to-close, solid-black backdrop, lighter nav arrows. PRs #192/#193.
- **Related = siblings + parents** — the collection "Related" block now includes parent collections, not just siblings. Commit `3460fae`.

## Design System Unification — Chapter 001 (2026-06-01 → 06-03)

The full "many divergent UI standards → one canonical set" epic. Shipped as 9 sequential PRs; see [001 · Design System Unification](001-design-review.md) for the per-phase detail.

- **Phase 0 — foundation** — paint `html,body` from tokens (kills the OS-dark-mode invisible-text bug), the ~12-token compatibility alias layer, dead-nav cleanup. PR #152 (`0145`).
- **Button family** — `<Button>`/`<IconButton>`/`<CloseButton>` token-driven primitives + call-site migrations; "omit default props" convention. PR #153 (`0146`).
- **Modal / Filter / Dropdown** — `<Modal>` (portal, scrim, Esc, focus-trap, scroll-lock), `<FilterToolbar>`/`<FilterChip>` (unified the 2 bars + 6 chip impls into one `FilterState`), `<Dropdown<T>>` (promoted from `UnifiedMetadataSelector`); 4 modal shells migrated; scroll-restore fix `ca8e8ad`. PRs #154/#155 (`0147`/`0148`).
- **Nav, Shell & remaining primitives** — `Tile`/`NavLink` (real `<a>`), `PageShell`/`CollectionHeader`, `StatusPage`, `Badge`, `Field` set, `MetadataList<T>`. PR #156 (`0149`).
- **Admin-route gating** — gated `/all-collections` + `/all-images` behind admin auth. PR #157 (`0150`).
- **Information architecture & UX** — public taxonomy front door, deep-linkable fullscreen (`?image` + history, position counter), filter-URL helpers wired in, footer + breadcrumb. PR #158 (`0151`).
- **Color-token collapse & a11y** — one semantic taxonomy + scrim/motion tokens, `--focus-ring`, real `h1`, reduced-motion guard; 12 dead tokens deleted. PR #159 (`0152`). _Carve-outs deferred to 006: `@custom-media` bridge, gap-rule/`rgb()` sweeps._
- **ImageMetadataModal decomposition** — the final consumer migration: 1099 → 203 LoC + 2 hooks + 5 subcomponents on the `ui/` primitives, 4 raw button classes deleted, +75 component tests. PR #160 (`0159`). Follow-ups: camera optimistic-create race fix (PR #162), test de-fragilization (PR #163). _The modal was later renamed `MetadataModal` (#170, see Refactor Wave below)._

## Code Health — Refactor Wave (2026-06-06)

Four stacked MRs off the P1 refactor wave; see [006 · Code Health](006-code-health.md). _(The 0167 handoff runbook was consolidated away in the 2026-06-10 pass; its substance is the bullets below.)_

- **`fail()` → `.rejects` in `core.test.ts`** — the 3 non-asserting `fail()` calls (not a Jest 29 global) replaced with `.rejects.toBeInstanceOf`/`.toHaveProperty`. PR #169 (`0167`).
- **Drop the "Image" prefix** — `app/components/ImageMetadata/`→`Metadata/`, `ImageMetadataModal`→`MetadataModal`, `useImageMetadataEditor/State/Submit`→`useMetadata*`, `imageMetadataUtils`→`metadataUtils`, `app/types/ImageMetadata.ts`→`Metadata.ts`, `selectedImageIds`→`selectedIds`; 44 files, git-tracked renames. Kept `ContentImage*`/`selectedImages`/`buildImage*`/gallery `*ImageIds` (real images). PR #170 (`0168`).
- **Logger migration complete** — the final 22 `console.error/warn` across 7 files → structured `logger`; 3 test spy-fixes; zero remain outside `logger.ts`. PR #171 (`0169`).
- **Inline-JSX config (Wins #1/#2)** — `COLLECTION_TYPE_LABELS` (rendered via `ASSIGNABLE_COLLECTION_TYPES.map` in both manage `<select>` ladders) + shared `ui/Dropdown/commonAddNewFields.ts`. PR #172 (`0170`); also carried a `chore(format)` repo-wide prettier commit. _Win #3 (TextBlockCreateModal lift) remains._

## Code Health — React 19 Wave (2026-06-06)

The 0171 Next-Batch refactor wave: the React 18 → 19 runtime jump plus the DRY/config follow-ups that rode with it. Five PRs, all merged 2026-06-06; see [006 · Code Health](006-code-health.md).

- **React 18 → 19 runtime upgrade** — `react`/`react-dom` `^18.3.1` → `^19.2.7` + `lucide-react` `0.399` → `1.17`. Transparent: `tsc` + `jest` + `next build` + live smoke all green, zero source changes required; the full upgrade-guide audit found no further required changes. Also justified the lone `useFullScreenImage` exhaustive-deps disable. PR #176 (`0171`). New-capability follow-ups (React Compiler, Form Actions, `useOptimistic`) critically reviewed and deferred → [006 · React 19 Follow-ups](superpowers/plans/006-react19-followups.md).
- **React 19 idiom modernization** — `Tile` `forwardRef` → ref-as-prop; two contexts `.Provider` → `<Context>` provider syntax. PR #177 (`0174`).
- **Entity-edit DRY wins** — generic `buildAssociationDiff` for tags/people, shared `toggleRelation` engine (`app/utils/collectionToggle.ts`), `useToggleTriple` hook adopted at 4 sites. State-shape unification intentionally rejected. PR #174 (`0172`).
- **Inline-JSX config (Win #3)** — `TEXT_FORMAT_OPTIONS`/`TEXT_ALIGN_OPTIONS` lifted to `app/types/Content.ts` (unions derived from the consts); completes the inline-JSX cross-file chapter (Wins #1/#2 shipped in #172). PR #175 (`0173`).
- **Mobile tile width** — adopt the measured width on mobile so tiles fill the viewport. PR #178 (`0175`).

## Performance / Layout

- **SSR the BoxTree (blank-load CLS fix)** — the collection layout is now server-rendered with `userAgent()`-derived viewport defaults + layout pinned across hydration + a 100dvh measuring skeleton, eliminating the blank-on-load void. The layout utils were confirmed pure (RSC-safe). PR #161 (`0160`: `ce23436`, `0d40093`, `0d4dc65`, `ce3b7a1`).

## Layout System

- **Prominence / weight-budget layout (Phase 1)** — replaced `cv = rowWidth/itemsPerRow` with a fixed AR-aware `BASE_WEIGHT` formula; desktop `rowWidth` 5→8; added `numericAR`. PR #120 (`2d7edbb`→`49e1d26`).
- **Row composition V2 (bottom-up merge)** — landed behind a `?layout=v2` A/B toggle. PR #144. _(Transient stepping stone; superseded by V3.)_
- **Row composition V3 promotion** — V3 folded into `rowCombination.ts` as the sole `compose()` / `buildAtomic`; deleted V1 template engine, V2, `rowOptimizer`, `layoutTrace`, and the `?layout` toggle; density slider made permanent. PR #145 (`acb9220`→`797183b`).

## Fullscreen Viewer

- **iOS landscape white-strip fix** — `100lvh` backdrop + `100dvh` overlay container, `inset:0`, mobile no-matte; removed the temporary FsDebug diagnostic. PR #150 (`d79aa61`, `1a40a68`, `586542d`).
- **Mobile/landscape sizing** — earlier `dvh`-based viewer sizing and overlay-inset fixes. PRs #142–#147.

## Collections

- **Collections overhaul** — 3-state visibility (LISTED/UNLISTED/HIDDEN), per-collection rating, synthetic `/all-*` slugs, PARENT password trickle-down, `collection_people`. PR #138 (backend V20–V22).
- **Related sibling collections** — `collection_sibling` join table (V26), two-column Sibling | Child selector grid, `Related:` links in the metadata block. PR #148 + column-alignment fix PR #150.
- **Parent column + type-grouped accordion + drag-to-retype** — manage-page selector gained a Parent toggle column, rows grouped under collapsible `CollectionType` accordion sections, and drag-a-row-onto-a-type-header to optimistically reassign type (`useCollectionRetype`, single-flight). Added `parents` on `CollectionListModel`/`CollectionUpdate` + `COLLECTION_TYPE_ORDER`/`ASSIGNABLE_COLLECTION_TYPES` constants. Also: collection-tags FE Phase 1 (shared `TagsSelector` + `tagUtils`), a `SegmentedControl` primitive, mobile density-filter fix, download empty-selection rejection, and a `100dvh` footer-shift fix. PR #167 (`0165-collections-parent-column`).

## Navigation / Routing

- **Slug-based routing** — consume backend `slug` fields for location/tag/people pages; slug-first resolution with name fallback. PR #117 (`8e064ff`).
- **Location page redesign** — thumbnail header, `LocationCollections` parallax cards, always-visible film filter. PR #117.
- **TaxonomyPage merge** — unified the Person and Tag pages, removing ~140 lines of duplication. `de912b2`.

## Filters / Metadata

- **Camera → film auto-toggle** — `is_film` / `default_film_format` on cameras; click-to-open selector; inline new-camera popup. PR #142 (`5e25f61`, `babe090`).
- **Paginated `/all-images`** — sentinel-prefetch infinite scroll; synthetic PARENT layout fixes. PR #138.

## Admin

- **Admin hub** — local-only `/admin` page, `AdminHubGrid` + `adminTiles`, proxy redirect rules, Clear Cache action (consolidated into `MenuDropdown`). PR #135 (backend V19).

## Contact Messages

- **DB-backed contact form** — replaced `mailto:` with `contactApi.ts` + a ContactForm rewrite and status banners; admin Comments page; proxy hardening + rate limiting. PRs #129/#130 (`f680d1f`→`ac4b892`).

## Auth / Security

- **Client-gallery password gating (Phase 1)** — httpOnly cookie flow, `ClientGalleryGate`, admin "Set Password & Send" UI, image/collection download buttons, OG suppression on locked pages. PRs #131–#137.

## Build / Deploy (Amplify)

- **Build-failure fixes** — proxy body `Uint8Array` wrap, `getServerCookieHeader` build-phase skip, `instanceof ApiError` → duck-type fix, and `force-dynamic` on tag/people/location/metadata/`[slug]` pages. PRs #133–#136.

## GIF / Video

- **GIF/MP4 web variant** — optional `gifUrlWeb` field, in-row renderer routes to the web variant with fallback, `preload="auto"` on all three video sites. PR #145.

## Frontend Quality / A11y (polish sprints)

- **Quick-wins + P1/P2 polish** — `revalidateTag` fix, `useSearchParams` hydration fix, Inter `display:swap` + themeColor, heading hierarchy, `aria-hidden`/`aria-pressed`, LoadingSpinner a11y, lazy `FullScreenModal`, metadata ISR, `sortByDate` extraction, Escape-to-close + `BREAKPOINTS.mobile`, `scrollbar-gutter:stable`, logger migration, `useCallback` memoization, Tailwind color-token cleanup. PRs #122–#129. _(This was the 2026-04-18 frontend-critical-review sprint — 21/315 findings on `0123-critical-review`; the live audit index is [006 · frontend audit](superpowers/specs/006-frontend-audit.md).)_

## Early Layout Refactor (Feb–Mar 2026 · `0107-row-refactor`)

The foundation that preceded the prominence / V2 / V3 work above. Mined from the now-removed `todo/refactor/archived/` (2026-06-01); the engine it built was later superseded by V3.

- **Row-layout architecture (Phases 1–3c)** — replaced `PATTERN_TABLE` with a 20-entry template map + recursive `compose()` dispatcher + AR-aware `buildRows` fill in `rowCombination.ts`; `rowOptimizer.ts` boundary/within-row reordering; `AR_FLOOR_MULTIPLIER=0.7`, `MAX_ROW_IMAGES=8` (2026-02-22 → 03-13). BoxTree content-tree rendering migration (2026-02-06).
- **Display modes, reorder UX & content toolbar** — three-value `DisplayMode` (Default/Chronological/Fixed), reorder utilities (`replayMoves`/`applyArrowMove`/`applyPickAndPlace`/`cancelImageMoves`), `ReorderOverlay`, sticky `.contentToolbar`; +35 reorder tests.
- **Image reorder → click-to-place** — replaced drag with click-to-pick-up / click-to-place + arrow nudges, single-batch "Save Order"; blue (picked-up) / green (`.moved`) overlay states (`useContentReordering.ts`, `manageUtils.ts`) (2026-03-14).
- **Branch-review fixes** (`0107-row-refactor-pt-4`) — cleared all C1–C5 / H1–H6 / M1–M12 issues + test gaps T1–T7: layout error boundary, timer-leak cleanups, `compose()` depth guard (`MAX_COMPOSE_DEPTH=10`), native-`img`→`next/image`; 804 tests / 16 suites (2026-03-14).
- **ManageClient hook extraction** — pulled `useContentReordering` / `useCoverImageSelection` / `useImageClickHandler` out of the god component; 1,362 → 1,172 lines.
- **CSS/SCSS variable cleanup** — semantic color/overlay/radius CSS vars in `globals.css`; replaced 160+ hardcoded colors + `4/8px` radii across the modals, fullscreen, and ManageClient.
- **Mobile layout fixes** — `mobileSlotWidth=2` chunking, split cover/text header rows, AR-floor disabled on mobile (`arFloor = rowWidth <= 2 ? 0 : targetAR*0.7`).

## Cleanup Sprint (PR #111 · `0111-todos-part-01`, 2026-03-15)

91 files changed; tests 808 → 885 / 20 suites. Mined from the now-removed `todo/archived/` (2026-06-01).

- **Image optimization** — removed global `unoptimized:true`, `remotePatterns: *.cloudfront.net`, AVIF/WebP `formats`, `sizes` on grid images; About → Server Component.
- **SEO & social metadata** — `generateMetadata` (title/desc/OG/Twitter/cover) + `generateStaticParams` on `[slug]` + `collectionType/[collectionType]`, static metadata on home. _(JSON-LD still open.)_
- **API type safety** — killed `null as unknown as T` (core returns `T | null`), `handleApiError`→`throwApiError`, removed `safeJson` + a duplicate admin getter, null guards across 10+ sites.
- **Accessibility (P1–P3, P5)** — menu `<h2>`→`<button>`, labeled icon buttons, `window.location.href`→`router.push()`. _(P4 FullScreenModal nav shipped later.)_
- **Suspense / streaming** — root `app/loading.tsx` + `LoadingSpinner` covering all routes. _(Component-level `<Suspense>` wrappers in pages still deferred.)_
- **Dead dependencies** — removed 9 unused packages (≈873 total: MUI, emotion, react-spring/parallax, nprogress, lodash, aws-amplify, react-zoom-pan-pinch); 4 deps → devDependencies.
- **Parallax tuning** — `OFFSET_MIN` −50 → −75 (symmetric travel). **Mobile spacing** — Phase-3 token/gap reductions (`--space-mobile-border` 12→4px, `.hbox`/`.vbox` gap → 0.4rem). **Batch-metadata** — investigated, no change needed (admin selection is in-memory; no per-image fetch).
