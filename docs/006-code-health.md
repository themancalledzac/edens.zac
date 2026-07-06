# 006 · Code Health

_Keeping the codebase honest: dependencies current, errors observable, duplication collapsed, big functions split, and the test net wide enough to refactor without fear._

## Overview

This chapter collects the cross-cutting hygiene work that keeps the frontend maintainable — the
debt that doesn't ship a user-facing feature but makes every future feature cheaper and safer to
build. None of it is architectural rework; the codebase is structurally sound (lean dependencies,
correct RSC boundaries, a mathematically-sound BoxTree). These are the concentrated cleanups a
staff reviewer would expect: finish the observability story, collapse the remaining duplications,
decompose the god-functions, and grow the test suite to cover the layout invariants and the
untested hooks/components.

The five-agent **frontend critical-review audit** (~315 findings) seeded much of this work; most
of its strategic initiatives are now owned by dedicated chapter plans (see the [audit
index](superpowers/specs/006-frontend-audit.md) for the full findings → chapter map). The audit's
residual, unowned findings — unsafe API casts, the per-file a11y inventory, `100dvh`/safe-area,
`exactOptionalPropertyTypes` — are parked in that index until claimed.

## ✅ Shipped (archived → [previous-work.md](previous-work.md))

The **React 18 → 19 runtime upgrade** ([#176](https://github.com/themancalledzac/edens.zac/pull/176)) + idiom modernization ([#177](https://github.com/themancalledzac/edens.zac/pull/177)), the **logger migration** ([#171](https://github.com/themancalledzac/edens.zac/pull/171)), **DRY consolidation** (5 merges, [#180](https://github.com/themancalledzac/edens.zac/pull/180)), **thin-component extraction** ([#179](https://github.com/themancalledzac/edens.zac/pull/179)), **entity-edit DRY wins** ([#174](https://github.com/themancalledzac/edens.zac/pull/174)), **inline-JSX config** (#172/#175), the **`Image`-prefix rename** ([#170](https://github.com/themancalledzac/edens.zac/pull/170)), the **`fail()`→`.rejects`** test fix ([#169](https://github.com/themancalledzac/edens.zac/pull/169)), and the **camera optimistic-create race** fix ([#162](https://github.com/themancalledzac/edens.zac/pull/162)) all merged. Detail + commit refs in [previous-work.md](previous-work.md) ("Refactor Wave" + "React 19 Wave"); the detailed plans are in `_archive/shipped-plans-2026-06-10.tar.gz`.

## Remaining work

- **001 design-system carve-outs (inherited)** 🟢 — two intentionally-deferred CSS sweeps routed here from [001](001-design-review.md): (a) the **`@custom-media` breakpoint bridge** (bridge `--breakpoint-*` tokens so the ~100 hardcoded `768px` queries become token-driven — deferred for a postcss/Next 16 conflict), and (b) the **gap-rule + `rgb()`-slash syntax sweeps** (Phase 4 Tasks 6d/6e). Mechanical, low-risk.
- **Observability** 🟡 — the `console.error`/`console.warn` → `logger` migration is **done** (#171, zero remain outside `logger.ts`). **Remaining:** add external error tracking (Sentry or CloudWatch) where the logger currently has only a `// Future: reportToService()` placeholder. _Needs a service decision before scoping._
- **Cleanup (Wave B)** 🟢 — `bffPaths.ts` (kill hardcoded BFF prefixes), shared `<StatusBanner>`,
  `useApiSubmit` hook, `contactApi` `ApiError` standardization, shared test factories. _(The
  `<GalleryAccessSection>` extraction is moot — `ManageClient` was deleted in the `0179` overhaul,
  [008](008-collection-admin.md).)_
- **Function decomposition** 🟢 — split `buildRows` / `CollectionContentRenderer` /
  `MetadataModal` (and the medium/low candidates); consolidate `fetchReadApi`/`fetchAdminGetApi`
  into a `fetchBase`; plus the dead-code removals carried in from the old `todo-random.md`
  (`getAllCollectionsAdmin`, the `_chunkSize`/`_currentState`/`_deletedIds` unused params, the
  `getContentDimensions` DEBUG `console.error`). _`ManageClient` is no longer a target — deleted in
  `0179`._
- **Tests** 🟡 — layout property tests (fold in the image-reorder scenario fixtures from
  [005 · reorder audit](spikes/005-image-reorder-audit.md)); hooks and component render tests
  (`useFullScreenImage`, `useMetadataEditor`, `BoxRenderer`, `CollectionContentRenderer`,
  `FullScreenModal`). _The three `fail()` calls in `core.test.ts` are ✅ fixed (#169)._

### Stragglers routed to other chapters

The old `todo-random.md` held a few hygiene items that belong to neighbouring chapters rather than
to Code Health — folded out as one-line pointers (their substance is not duplicated here):

- ~~**Layout tuning**~~ — the arFactor panorama cap and the vertical-penalty mechanisms this
  pointed at were **deleted** by the directional-prominence refactor (`905801f`); nothing left to
  tune. Automatic density by collection size remains open, tracked directly in
  [005 · Layout](005-layout.md).
- **Perf micro** (CloudFront `<link rel="preconnect">` in `app/layout.tsx`; `generateMetadata`
  cover-image `size=500` → `size=1`) → [002 · Performance](002-performance.md).
- **a11y batch** (modal focus-trap, `<label>` linkage, `aria-live` toasts, skip link,
  `window.confirm` replacement, `prefers-reduced-motion`, `transition: all` audit, ReorderOverlay
  `title=` → `aria-label`) → mostly shipped with the [001](001-design-review.md) token-collapse work.
- **`CollectionModel.tags` still `string[]`** and the backend `Collection` record missing
  `tags`/`people`/`locations` (filter chips on `/all-collections` are inert) →
  [004 · Content Discovery](004-content-discovery.md) + [009 · Backend & Vision](009-backend-and-vision.md).

## Sections (active)

| Section                                                                                 | What it covers                                                                          | Status     |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------- |
| [Error Boundaries & Logging](superpowers/plans/006-error-boundaries-and-logging.md)     | Logger migration ✅ (#171); external error tracking remains                             | 🟡         |
| [Cleanup & Refactor](superpowers/plans/006-cleanup-and-refactor.md)                     | Wave A frontend handoff + Wave B follow-ups                                             | 🟢         |
| [Function Decomposition](superpowers/plans/006-function-decomposition.md)               | Split god-functions; `fetchBase`; dead-code removals                                    | 🟢         |
| [Property-Based Tests](superpowers/plans/006-property-based-tests.md)                    | Layout-pipeline invariants for `buildRows`/`compose`                                    | 🟢         |
| [Test Coverage Gaps](superpowers/plans/006-test-coverage-gaps.md)                       | Complex-hook + component render tests (`fail()` fix ✅ #169)                             | 🟡         |
| [React 19 Follow-ups](superpowers/plans/006-react19-followups.md)                       | Critical review of React Compiler / Form Actions / `useOptimistic` (all deferred)       | 🗒️ future  |
| [Frontend Critical-Review Audit](superpowers/specs/006-frontend-audit.md)               | Slim index of the ~315-finding staff audit → owning chapters                            | 📘         |

> **Shipped sections** (dependency-upgrade, dry-consolidation, thin-component-extraction/audit/review, entity-edit-dry-wins, inline-jsx-config, camera-optimistic-create-race) are archived in `_archive/shipped-plans-2026-06-10.tar.gz` — recorded in [previous-work.md](previous-work.md).

---

_↑ [Back to the book](000-summary.md)._
