# 006 · Code Health

_Keeping the codebase honest: dependencies current, errors observable, duplication collapsed, big functions split, and the test net wide enough to refactor without fear._

## Overview

This chapter collects the cross-cutting hygiene work that keeps the frontend maintainable — the
debt that doesn't ship a user-facing feature but makes every future feature cheaper and safer to
build. None of it is architectural rework; the codebase is structurally sound (lean dependencies,
correct RSC boundaries, a mathematically-sound BoxTree). These are the concentrated cleanups a
staff reviewer would expect before signing off: align the React types with the runtime, finish the
logger migration, collapse the five known duplications, decompose the god-functions, and grow the
test suite to cover the layout invariants and the untested hooks/components.

The five-agent **frontend critical-review audit** (~315 findings) seeded much of this work; most of
its strategic initiatives are now owned by dedicated chapter plans (see the audit index below for the
full findings → chapter map). The audit's residual, unowned findings — unsafe API casts, the per-file
a11y inventory, `100dvh`/safe-area, `exactOptionalPropertyTypes` — are parked in that index until
claimed.

## ✅ Recently shipped

- **Camera optimistic-create race + silent failure** — [PR #162](https://github.com/themancalledzac/edens.zac/pull/162) (`0161-camera-create-race`). Guarded the optimistic `{id:0}` swap (`replaceOptimisticCamera` — only swaps when `prev.camera?.id===0 && name matches`) and surfaced `createCamera` failures with an inline `role="alert"` revert. Closes [006 · camera optimistic-create race](superpowers/plans/006-camera-optimistic-create-race.md).
- **Test-quality cleanup** — [PR #163](https://github.com/themancalledzac/edens.zac/pull/163) (`0161-test-quality-cleanup`). De-fragilized + trimmed the 0159 component tests: cut consumer-side CSS-class assertions that re-test what the `ui/` primitives' own tests already own, merged redundant cases, DRY'd `useImageMetadataSubmit` boilerplate, and added the only net-new coverage (`handleCancel`). _Note: a `data-state` source contract was trialed for `CollectionListSelector` then reverted (`90387dc`) — state assertions stay class-based for now._
- **Refactor-wave kickoff (4 stacked PRs, ✅ merged to `main` 2026-06-06)** — [#169](https://github.com/themancalledzac/edens.zac/pull/169) `fail()`→`.rejects` in `core.test.ts` · [#170](https://github.com/themancalledzac/edens.zac/pull/170) dropped the "Image" prefix wholesale (`app/components/ImageMetadata/`→`Metadata/`, `useImageMetadataEditor`→`useMetadataEditor`, `selectedImageIds`→`selectedIds`; 44 files, git-tracked renames) · [#171](https://github.com/themancalledzac/edens.zac/pull/171) migrated the last 22 `console.error/warn`→`logger` (7 files + 3 test spy fixes) · [#172](https://github.com/themancalledzac/edens.zac/pull/172) `COLLECTION_TYPE_LABELS` + shared `commonAddNewFields.ts` (inline-JSX Wins #1/#2). Each `tsc` clean + `jest` green (1728→1729). Record: [0167-refactor-wave-handoff.md](0167-refactor-wave-handoff.md).

## Remaining work

- **001 design-system carve-outs (inherited)** 🟢 — two intentionally-deferred CSS sweeps routed here from [001](001-design-review.md): (a) the **`@custom-media` breakpoint bridge** (bridge `--breakpoint-*` tokens so the ~100 hardcoded `768px` queries become token-driven — deferred for a postcss/Next 16 conflict), and (b) the **gap-rule + `rgb()`-slash syntax sweeps** (Phase 4 Tasks 6d/6e). Mechanical, low-risk.
- **Dependencies** ✅ **(merged to `main`, 2026-06-06)** — the **full React 18 → 19 runtime upgrade** is done in [#176](https://github.com/themancalledzac/edens.zac/pull/176) (`react`/`react-dom` `^18.3.1`→`^19.2.7`, `lucide-react` `0.399`→`1.17`). Transparent: `tsc` + `jest` + `next build` + live smoke all green, **zero source changes required**. Optional React 19 idiom modernizations (ref-as-prop, `<Context>` provider) in [#177](https://github.com/themancalledzac/edens.zac/pull/177). A full [upgrade-guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide) audit found no further required changes. New-capability follow-ups (React Compiler, Form Actions) are critically assessed — and all deferred — in [React 19 Follow-ups](superpowers/plans/006-react19-followups.md). _No dependency work remains._
- **Observability** 🟡 — ✅ the `console.error`/`console.warn` → `logger` migration is **done**
  ([#171](https://github.com/themancalledzac/edens.zac/pull/171), merged): the final 22 calls
  across 7 files migrated, zero remain outside `logger.ts`. **Remaining:** add external error tracking
  (Sentry or CloudWatch) where the logger currently has only a `// Future: reportToService()` placeholder.
- **DRY (5 merges)** 🟢 — Escape-key handler → `useClickOutside`; NaN-fallback dedup; merge the two
  parallax converters; `imageWidth ?? width` → `getContentDimensions`; BoxRenderer gap values → CSS
  custom properties.
- **Cleanup (Wave B)** 🟢 — `bffPaths.ts` (kill hardcoded BFF prefixes), shared `<StatusBanner>`,
  `useApiSubmit` hook, extract `<GalleryAccessSection>` from `ManageClient`, `contactApi` `ApiError`
  standardization, shared test factories.
- **Function decomposition** 🟢 — split `buildRows` / `CollectionContentRenderer` / `ManageClient` /
  `MetadataModal` (and the medium/low candidates); consolidate `fetchReadApi`/`fetchAdminGetApi`
  into a `fetchBase`; plus the dead-code removals carried in from the old `todo-random.md`
  (`getAllCollectionsAdmin`, the `_chunkSize`/`_hasSlug`/`_currentState`/`_deletedIds`/`_onBack`
  unused params, the `getContentDimensions` DEBUG `console.error`).
- **Thin-component extraction** 🟢 — a two-phase sweep (audit → behavior-preserving refactor) that
  pulls inline _derivation logic_ out of every `'use client'` component into co-located, unit-tested
  `<Component>Utils.ts` helpers, so each reads `hooks → helper calls → JSX` — generalizing the
  shipped `Component.tsx` refactor (`7d8bdac`). This is the **logic-extraction** counterpart to
  _function decomposition_'s **sub-component split**; the two overlap on `CollectionContentRenderer`,
  `ContentBlockWithFullScreen`, and `ManageClient`, so coordinate (extract logic here, split
  sub-components there). `ManageClient` (1719 lines) spins out to its own
  `006-manageclient-decomposition.md` rather than being attempted in the sweep. Inline-`style`/dead-
  param finds are flagged but fixed under [Inline JSX Config](superpowers/plans/006-inline-jsx-config-cross-file.md).
- **Tests** 🟡 — layout property tests (fold in the image-reorder scenario fixtures from
  [005 · Layout](spikes/005-image-reorder-audit.md)); hooks and component render tests
  (`useFullScreenImage`, `useMetadataEditor`, `BoxRenderer`, `CollectionContentRenderer`,
  `FullScreenModal`). _The three `fail()` calls in `core.test.ts` are ✅ fixed
  ([#169](https://github.com/themancalledzac/edens.zac/pull/169))._

### Stragglers routed to other chapters

The old `todo-random.md` held a few hygiene items that belong to neighbouring chapters rather than
to Code Health — folded out as one-line pointers (their substance is not duplicated here):

- **Layout tuning** (arFactor panorama cap, desktop standalone-skip dead code, moderate-overfill
  ceiling 1.35 → 1.20, the unresolved vertical-penalty-vs-AR question, automatic density by
  collection size) → [005 · Layout](005-layout.md).
- **Perf micro** (CloudFront `<link rel="preconnect">` in `app/layout.tsx`; `generateMetadata`
  cover-image `size=500` → `size=1`) → [002 · Performance](002-performance.md).
- **a11y batch** (modal focus-trap, `<label>` linkage, `aria-live` toasts, skip link,
  `window.confirm` replacement, `prefers-reduced-motion`, `transition: all` audit, ReorderOverlay
  `title=` → `aria-label`) → [001 · Design System](001-design-review.md) (token-collapse-and-a11y).
- **`CollectionModel.tags` still `string[]`** and the backend `Collection` record missing
  `tags`/`people`/`locations` (filter chips on `/all-collections` are inert) →
  [004 · Content Discovery](004-content-discovery.md) + [009 · Backend & Vision](009-backend-and-vision.md).

## Sections

| #   | Section                                                                                 | What it covers                                                                                                                                       | Status                                                           |
| --- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 006 | [Dependency Upgrade](superpowers/plans/006-dependency-upgrade.md)                       | Full React 18 → 19 runtime upgrade + lucide-react 1.x                                                                                                | ✅ [#176](https://github.com/themancalledzac/edens.zac/pull/176) |
| 006 | [React 19 Follow-ups](superpowers/plans/006-react19-followups.md)                       | Critical review of React Compiler / Form Actions / `useOptimistic` (all deferred)                                                                    | 🗒️ future                                                        |
| 006 | [Error Boundaries & Logging](superpowers/plans/006-error-boundaries-and-logging.md)     | Logger migration ✅ [#171](https://github.com/themancalledzac/edens.zac/pull/171); external error tracking remains                                   | 🟡                                                               |
| 006 | [DRY Consolidation](superpowers/plans/006-dry-consolidation.md)                         | The five scoped de-duplication merges                                                                                                                | 🟢                                                               |
| 006 | [Cleanup & Refactor](superpowers/plans/006-cleanup-and-refactor.md)                     | Wave A frontend handoff + Wave B follow-ups                                                                                                          | 🟢                                                               |
| 006 | [Function Decomposition](superpowers/plans/006-function-decomposition.md)               | Split god-functions; `fetchBase`; dead-code removals                                                                                                 | 🟢                                                               |
| 006 | [Thin-Component Extraction](superpowers/plans/006-thin-component-extraction.md)         | Audit + extract inline component derivation logic into co-located `*Utils.ts` (logic-extraction sibling to function decomposition)                   | 🟢                                                               |
| 006 | [Property-Based Tests](superpowers/plans/006-property-based-tests.md)                   | Layout-pipeline invariants for `buildRows`/`compose`                                                                                                 | 🟢                                                               |
| 006 | [Test Coverage Gaps](superpowers/plans/006-test-coverage-gaps.md)                       | `fail()` fix ✅ [#169](https://github.com/themancalledzac/edens.zac/pull/169); complex-hook + component render tests remain                          | 🟡                                                               |
| 006 | [Camera Optimistic-Create Race](superpowers/plans/006-camera-optimistic-create-race.md) | Guard the `{id:0}` swap + surface `createCamera` failure                                                                                             | ✅ #162                                                          |
| 006 | [Entity-Edit DRY Wins](superpowers/plans/006-entity-edit-dry-wins.md)                   | `buildAssociationDiff`, shared `toggleRelation`, `useToggleTriple`                                                                                   | ✅ [#174](https://github.com/themancalledzac/edens.zac/pull/174) |
| 006 | [Inline JSX Config (cross-file)](superpowers/plans/006-inline-jsx-config-cross-file.md) | Wins #1/#2 ✅ [#172](https://github.com/themancalledzac/edens.zac/pull/172); Win #3 ✅ [#175](https://github.com/themancalledzac/edens.zac/pull/175) | ✅                                                               |
| 006 | [Frontend Critical-Review Audit](superpowers/specs/006-frontend-audit.md)               | Slim index of the ~315-finding staff audit → owning chapters                                                                                         | 📘                                                               |

---

_↑ [Back to the book](000-summary.md)._
