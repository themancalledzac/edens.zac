# Previous Work — Shipped Feature Log

> Concise record of completed work, mined from design/planning docs before those docs were
> removed (2026-06-01). 1–2 lines per item. For deeper detail, follow the cited commits/PRs in
> git history, or the surviving docs catalogued in [000-summary.md](000-summary.md).

## 2026-08 Summer Refactor Board (#254–#293)

Forty PRs driven by the cleanup board at [`spikes/2026-summer-refactor.md`](spikes/2026-summer-refactor.md), which #271 renamed and committed (the rest of `docs/spikes/` stays gitignored). Each board item is one small MR with a group letter; the shipped write-ups moved to `spikes/2026-summer-refactor/`, one file per closed group, in #285.

- **Dependency vulnerabilities cleared** ([#254](https://github.com/themancalledzac/edens.zac/pull/254)) — all 27 Dependabot alerts resolved by `npm audit fix` without `--force`, which would have downgraded `next` from 16 to 9.3.3. `next` 16.2.7 → 16.3.1, `sharp` 0.34.5 → 0.35.3, plus postcss, nanoid, immutable, fast-uri, js-yaml, brace-expansion, form-data, `@babel/core` and ws. Only `package-lock.json` changed; `npm audit` reports 0.
- **Group A · dead code** (#255–#263, items A1–A9) — deleted dead files with zero references (`useCollectionData`, `focalLength`, `groupCollections`), the whole `lib/api` write channel (`fetchPutJsonApi`/`fetchPatchJsonApi`/`fetchPostJsonApi`/`fetchFormDataApi` and the `'write'` member of `fetchBase`), 398 lines of pre-`useMetadataState` form helpers in `metadataUtils`, `getSlotWidth` and the last of the V1 slot model, `CollectionListSelector`'s flat mode, stale ESLint config, and 327 lines of dead SCSS + `globals.css` tokens. A5 was a bug, not dead code: the gray tint marking hidden content in the manage grid was never painted.
- **Group D · security** (#265, #266, #270, #272, #273, #274, #276, #277, items D1–D9) — `POST /api/revalidate` and `clearCacheAction` were both anonymously invokable cache purges, now gated on an `ezac_session` cookie and an admin principal; the Origin allowlist moved into `app/utils/originAllowlist.ts` and applies to both; the image optimizer pinned from `*.cloudfront.net` to the one production distribution; the proxy restricted to `api/**` (`/api/proxy/actuator/env` had reached Spring's actuator pre-authenticated) and the dead `/cdn` rule removed; site-wide security headers added with `poweredByHeader: false`; `NEXT_PUBLIC_APP_URL` normalized in the allowlist, where a trailing slash had been 403ing every production admin write. D7 shipped earlier with #253.
- **Group C · bugs** (#264, #279, #281, #282, #283, #291, items C1–C5, C8) — unrelated saves no longer wipe staged people/gallery edits (the re-seed effects depended on array identities that every `setCurrentState` replaced); four dead revalidate tags deleted, `collection-home` kept because `app/page.tsx` really does register it; About's portrait declares its real 4:3 ratio instead of 2:1; the Selects `onChange` notifier moved out of the state updater so StrictMode stops double-firing it; five assorted LOW bugs including a `sizes` attribute rendering `NaNpx`; the `/user` Following chip count now tracks client follow state instead of the stale server render.
- **Group B · test consolidation** (#267, #286–#290, items B1–B4, B7, B8) — merged duplicated suites (`manageUtils.test.ts` into `collectionEditUtils.test.ts`, the `contentLayout` and `rowCombination` characterization copies, the `metadataUtils` association coverage), dropped `useClickOutside` listener-spy tests that pinned an implementation detail the hook does not own, and pinned the Escape-key selection teardown in `useCollectionEdit` — an effect the whole suite passed without, which is how it nearly got deleted during A7.
- **Group E · refactors** ([#269](https://github.com/themancalledzac/edens.zac/pull/269), [#280](https://github.com/themancalledzac/edens.zac/pull/280), items E1, E11) — the four hand-rolled `ContentParallaxImageModel` card builders collapsed into one whose options make each divergence a stated choice (E1, closing the 006 item); and `tests/lib/api/cacheTagDrift.test.ts`, which reads both halves of every cache tag out of the source at run time and asserts the register and revalidate sets agree.
- **Group G · docs** ([#268](https://github.com/themancalledzac/edens.zac/pull/268), item G2) — `CLAUDE.md` now states that why-context belongs in the docblock of the function it explains, not inline, and covers plain function bodies rather than only component bodies.
- **Board bookkeeping** (#271, #275, #278, #284, #285, #292, #293) — the reconcile-and-set-up MRs between sittings. Worth keeping because they carry the audit results: C4 understated itself twice, C3's prescribed mechanism was wrong, and C5 was the first item whose claims survived checking unchanged. #285 split 76KB of shipped write-ups out of the board into the per-group archive; #292 amended the archive rule; #293 filed six user feature requests as Group H.

## 2026-08 Admin Hub, Roles and Sharing (#236–#253)

The wave between the typeless migration and the cleanup board, merged 2026-07-29 → 08-23: the admin hub became a real layout surface, roles and sharing shipped, and the collection filter bar was consolidated.

- **Admin user upgrade** ([#236](https://github.com/themancalledzac/edens.zac/pull/236)) — `UpgradeUserModal` promotes a tag-only PERSON identity in place into an INVITED account, the sibling of the merge flow (which folds a PERSON into a different account and hard-deletes the source). Rode with a typeless doc sweep and dead-code removal. Needed backend #140 for `POST /api/admin/users/{id}/upgrade`.
- **Image metadata display** ([#237](https://github.com/themancalledzac/edens.zac/pull/237)) — `formatLongDate()` renders `October 13th, 2023` via the existing timezone-safe `parseIsoDateParts`, a bare `2200` reads `2200 ISO`, and the collection dirty-state was hardened.
- **Filter bar consolidation** (#238, #240, #250) — capture-day derivation and per-day chips, deep-linked into the URL and gated at 30+ images; the date-sort chip renamed `Order`; the lens-type dimension dropped from collections; dates and lens made single-select at the type source, since two dates only widen and two lenses AND to nothing; lens availability derived from content that ignores the active lens, so picking one lens no longer disables every other chip; a visitor-facing photo-size control; and the toolbar reduced to two direct children, `.controls` and `.trailing`.
- **`/user` on the shared collection stack** ([#239](https://github.com/themancalledzac/edens.zac/pull/239)) — `PersonalContentGrid` and `SectionTabs` deleted; `/user` renders through `CollectionPageClient` with the backend's synthetic `"user"` collection, so header, toolbar, density, save hearts and grid all come from one implementation. The follow pill gates on a new `followCollectionId` prop rather than `contentId`.
- **Cover picker on the cover** ([#241](https://github.com/themancalledzac/edens.zac/pull/241)) — cover selection moved out of the Edit sheet onto the manage grid as a first-class `pick-cover` mode shaped like `pick-date`. It outranks `edit`, so an open sheet steps aside and cancelling returns to it with unsaved field edits intact.
- **Collections-page Order control** ([#242](https://github.com/themancalledzac/edens.zac/pull/242)) — `/collections` had no working Order control at all, for two independent reasons: `isDateable()` returns false for collection cards, and `showDateSort` is image-derived while that page is 100% collection content. Both fixed, plus an admin hide-hidden preview.
- **Component patterns, a11y pass and admin view-as** ([#243](https://github.com/themancalledzac/edens.zac/pull/243)) — the filter bar comes off the landing page, gated on `HOME_SLUG` rather than a new prop, because whether the landing page is filterable is a property of that collection. Also carried the admin view-as work: `UserSpace.tsx` replaces `app/homePage/page.tsx`.
- **Admin user rail** ([#244](https://github.com/themancalledzac/edens.zac/pull/244)) — user editing moved into the space's own header rail, led by the email.
- **Admin roles page** ([#245](https://github.com/themancalledzac/edens.zac/pull/245)) — roles moved onto the hub as a content-sized panel; a role stays addressable after its own route went away.
- **Admin hub shaped blocks and collapsible panels** ([#246](https://github.com/themancalledzac/edens.zac/pull/246), `0246-admin-panel-collapse`) — `Content.minWidth` generalizes to four optional pixel bounds and the sizer's height model becomes `clamp(a·W + b, minHeight, maxHeight)`. The load-bearing case is `minHeight === maxHeight`, read as `a = 0`: a panel reserves the box its content needs instead of stretching to its row's tallest sibling. A photograph declares no bounds and stays on the untouched scalar-AR path, so the portfolio surface is bit-for-bit unchanged. Also `useCachedPanelData`. Phase C (content-measured heights) was implemented and reverted the same day; see [005](005-layout.md) for the open height trade-off.
- **Collaborator tier contract** ([#247](https://github.com/themancalledzac/edens.zac/pull/247)) — a COLLABORATOR sits between CLIENT and admin on a per-collection ladder and outranks CLIENT, so every client capability admits them. `fetchBase`'s closed `'write' | 'admin'` union with its silent two-way ternary became an explicit three-way mapping with no fall-through, plus `fetchEditPostJsonApi`/`fetchEditPatchJsonApi`. Companion to backend #153.
- **Fullscreen cover black-page fix** (#248, #249) — clicking a synthetic cover (`createCoverImageBlock`, id `COVER_IMAGE_CONTENT_ID = -1`) set `body.fullscreen-open` without ever rendering the overlay, so `globals.css` painted the page solid `#000` with the page's own content still drawn on top and no way out but navigating away. Rode with a chip-cluster anchoring fix and a stop to no-op URL writes refetching the page.
- **User share links** ([#251](https://github.com/themancalledzac/edens.zac/pull/251)) — `/s/[token]` landing route, a share card on `/user`, and a recipient view. No new component was needed: `UserSpace` already accepts `me={null}`, which is exactly share-recipient semantics. `loadUserSpace` gains a third mode beside `'self'` and `'admin'`, carrying the raw token only on first landing. Frontend for backend #156.
- **`ListPanel` slot model** ([#252](https://github.com/themancalledzac/edens.zac/pull/252)) — `AdminPanel` generalized into `ListPanel`, the name the 2026-08-10 panel-shape design gave it and never executed. A header and a row are the same shape: three sections, each holding up to two stacked slots. Both resolve against one pair of rails, so header/row button misalignment is structurally impossible rather than a value to tune. Users, Messages and Roles migrated with zero content changes.
- **Collections list panel** ([#253](https://github.com/themancalledzac/edens.zac/pull/253), merged 2026-08-23 out of number order) — the first list built on `ListPanel` rather than migrated onto it. Row height derives to 54px from the declared shape. Backend counterpart #157; until it deploys, cover URLs and dates arrive null and rows render placeholder squares.

## 2026-07 Typeless Collection Migration (#233–#235)

The collection model lost its type. A collection is now a named, slugged, ordered grouping of **any mix** of content — images, GIFs, text, and references to other collections — with exactly **two** stored discriminators, `isClient` and `isBlog` (mutually exclusive; the backend rejects both). Everything else is derived or gone. This is a **breaking model change**, recorded here because the enum still turns up in older docs and in agent memory.

**Where each former enum value went** (canonical source: the header comment on backend `V52__drop_collection_type.sql`):

| Was                                  | Now                                                                                         |
| ------------------------------------ | ------------------------------------------------------------------------------------------- |
| `CLIENT_GALLERY`                     | stored — `collection.is_client`                                                             |
| `BLOG`                               | stored — `collection.is_blog`                                                               |
| `PARENT`                             | **derived** — holds ≥1 collection reference; served as `hasChildren` / `childCollectionIds` |
| `HOME`                               | **derived** — `slug = 'home'` (`HOME_SLUG`, unique per V41)                                 |
| `PORTFOLIO` · `ART_GALLERY` · `MISC` | **gone. No successor concept** — carrying neither flag _is_ the meaning                     |

- **U1 · FE type removal** ([#233](https://github.com/themancalledzac/edens.zac/pull/233)) — deleted `CollectionType`, the `type` field on the create/update requests and `CollectionListModel`, the label/order/assignable constants, `withDerivedKindFlags`, `humanizeConstantCase`, and **`useCollectionRetype` + drag-to-retype** (retyping is meaningless without types). The manage-page selector was re-keyed onto `bucketOf()` — Home (slug) / Client Galleries (`isClient`) / Blogs (`isBlog`) / Collections — and InfoTab now edits kind as two checkboxes. Gallery Access gates on `isClient`.
- **U3 · mixed-content ready** ([#234](https://github.com/themancalledzac/edens.zac/pull/234)) — the consequences of "any collection can hold anything": `orderIndex` honoured verbatim for mixed content, collection cards excluded from `isDateable` / chronological ordering and from fullscreen prev/next, the cover picker unioned over own + child images, and the Presentation / Add-content surfaces un-gated for parents.
- **U6 · derived parent-ness** ([#235](https://github.com/themancalledzac/edens.zac/pull/235)) — `hasChildren` / `childCollectionIds` typed onto `CollectionUpdateResponseDTO` and consumed by `isParentCollection`, replacing a scan of the **page-bounded** `collection.content` (wrong for any collection over the 500-item window). Deleted the last `CollectionType` references and dropped the enum from `ai_guidelines`.
- **BE mirror** — `V50` added `is_client`/`is_blog` with a mutual-exclusion CHECK and backfilled them from `type`; `V51` made `type` nullable, snapshotted every row into **`collection_type_archive`** (the only faithful rollback artifact — five former values collapse onto one flag pair, so the flags cannot reconstruct `type`), and removed V50's transitional Portfolio / Art Gallery label tags per decision D6; `V52` dropped the column. **`V52` is irreversible.**
- **Route** — `app/collectionType/[collectionType]/` was already deleted (2026-05-05); nothing replaced it. Discovery is `/explore` + `/tag/[slug]` + `/location/[slug]`.

The post-`0179` wave: the layout value-model rewrite, auth Phase F, the Person→User identity merge, Collection IA (A1/A3), the admin panel, and a fixes wave. See chapters [004](004-content-discovery.md), [005](005-layout.md), [007](007-security-hardening.md), [008](008-collection-admin.md), [009](009-backend-and-vision.md) for current status.

- **Layout value model** — #182 directional-prominence (orientation-agnostic prominence `P`; retired `isFullWidthHero`, the vertical penalty, `getComponentValue`/PANORAMA caps, `905801f`) · #183 collection-fixes · #184 area-to-value layout (supersedes the 005-layout Issue #4 reachability item) · #185 related-collections row redesign (`563ee08`).
- **Auth Phase F** — #186 auth-foundation FE (sessions, `/login`, `/api/auth/me`) · #187 user-invite onboarding.
- **Identity merge** — #194 Person→User Phase 1 (`43ca1dd`) · #195/#196 Phase 2 + Selects Phase-1 + per-collection client toggle + `/admin/users/[id]` full-page render · the PERSON-merge UI (`d765e8d`..`a8f9420`).
- **User Concept (009 Phase C first slice)** — Selects/user pages shipped via the 2026-06-22 plan; **Rating control shipped then deliberately REMOVED** (`fa5516b`) — noted here so it doesn't get "restored."
- **Collection IA** — #198+#200 A1 unified `/{slug}` tag-view routing + MenuDropdown Home/Me (`a23a43b`, `cd4e455`) + tag chips (`c40b9c6`) · #199 A3 Save-as-Collection + Track C saves/follows + `/user` redesign (`33bc524`).
- **Admin panel** — #197 admin-comments-panel · #202 logout-state fix + admin email-editable · #203 admin-API authz (`is_admin`, `hasRole(ADMIN)` gate on `/api/admin/**`, `AdminBootstrap`; closed the anonymous admin-API hole) · **0204 impersonation removal** ([#204](https://github.com/themancalledzac/edens.zac/pull/204) / BE #114, both merged 2026-07-06) — admin=root-view model via `/admin/users/[id]`.
- **Fixes wave** — #188 (0190 bug fixes) · #190 collection-delete (danger zone) · #189/#191/#192/#193 immersive-viewer gestures (pinch-zoom, tap-to-fullscreen) + misc `claude/*` fixes.
- **Unified filter-visibility gate** (no PR# — commits `d07069b`/`74d4d55`/`cfd3aa1` et al on main) — `canFilter`/`computeFilterVisibility` shipped, 35/35 plan tasks.
- **BE mirror**: same period, the backend shipped auth F1/F2, the identity-merge migrations, invite-invalidation (`5e7036d`), `is_admin` (V42), and removed the impersonation endpoint (0204-BE, merged as BE #114).

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

Four stacked MRs off the P1 refactor wave; see [006 · Code Health](006-code-health.md). _(The 0167 handoff runbook is archived in `_archive/handoffs-shipped-2026-06-10.tar.gz`.)_

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
- **Parent column + type-grouped accordion + drag-to-retype** — manage-page selector gained a Parent toggle column, rows grouped under collapsible `CollectionType` accordion sections, and drag-a-row-onto-a-type-header to optimistically reassign type (`useCollectionRetype`, single-flight). Added `parents` on `CollectionListModel`/`CollectionUpdate` + `COLLECTION_TYPE_ORDER`/`ASSIGNABLE_COLLECTION_TYPES` constants. Also: collection-tags FE Phase 1 (shared `TagsSelector` + `tagUtils`), a `SegmentedControl` primitive, mobile density-filter fix, download empty-selection rejection, and a `100dvh` footer-shift fix. PR #167 (`0165-collections-parent-column`). _Partly **superseded** by the [typeless migration](#2026-07-typeless-collection-migration-233235): the type constants, `useCollectionRetype` and drag-to-retype are deleted; the accordion survives re-keyed on `bucketOf()`._

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
- **SEO & social metadata** — `generateMetadata` (title/desc/OG/Twitter/cover) + `generateStaticParams` on `[slug]` + `collectionType/[collectionType]`, static metadata on home. _(JSON-LD still open. The `collectionType/[collectionType]` route was deleted 2026-05-05 and has no successor; only the `[slug]` half survives.)_
- **API type safety** — killed `null as unknown as T` (core returns `T | null`), `handleApiError`→`throwApiError`, removed `safeJson` + a duplicate admin getter, null guards across 10+ sites.
- **Accessibility (P1–P3, P5)** — menu `<h2>`→`<button>`, labeled icon buttons, `window.location.href`→`router.push()`. _(P4 FullScreenModal nav shipped later.)_
- **Suspense / streaming** — root `app/loading.tsx` + `LoadingSpinner` covering all routes. _(Component-level `<Suspense>` wrappers in pages still deferred.)_
- **Dead dependencies** — removed 9 unused packages (≈873 total: MUI, emotion, react-spring/parallax, nprogress, lodash, aws-amplify, react-zoom-pan-pinch); 4 deps → devDependencies.
- **Parallax tuning** — `OFFSET_MIN` −50 → −75 (symmetric travel). **Mobile spacing** — Phase-3 token/gap reductions (`--space-mobile-border` 12→4px, `.hbox`/`.vbox` gap → 0.4rem). **Batch-metadata** — investigated, no change needed (admin selection is in-memory; no per-image fetch).
