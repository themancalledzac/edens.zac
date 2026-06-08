# 📚 docs/ — The Book

> **Updated 2026-06-06.** The master index of every planning doc, organized as **chapters → sections**.
>
> **Structure:** this book (`000`) → **chapter files** (`001`–`009`, at `docs/` root — each an overview + links) → **sections** (the MR-level plans/specs under `superpowers/plans/`, `superpowers/specs/`, `spikes/`). Each chapter is one coherent body of work; each section is a separate MR. **All go-forward plans live in `superpowers/plans/`.**
>
> A 2026-06-01 audit collapsed the old 36-item flat list into these 9 chapters: ~half were duplicate/overlapping views of the same work (the perf trio, the gallery-auth pair, the 315-finding catch-all), now merged. Shipped history lives in [previous-work.md](previous-work.md).

**Legend:** 🟢 active plan · 🟡 partial · ⛔ blocked (backend) · 📘 reference/living spec · 🔭 future vision (not approved) · 🗒️ idea

---

## 🧭 Start here

| File                                   | What it is                                                                               |
| -------------------------------------- | ---------------------------------------------------------------------------------------- |
| [previous-work.md](previous-work.md)   | Concise shipped-feature log — "what got built and when."                                 |
| The 9 chapters below                   | Each is an epic; open the chapter file for its deduped remaining-work list + sections.   |
| [../ai_guidelines/](../ai_guidelines/) | Canonical project conventions (API, CSS, lint, TS, testing) — referenced by `CLAUDE.md`. |

---

## 📖 Chapters

### [001 · Design System Unification](001-design-review.md) ✅ **fully shipped to `main`**

Collapse the fractured UI surface into ~12 token-driven primitives in `app/components/ui/` on one painted, dark-safe surface — plus the IA/UX + a11y gaps that ride along. **All phases shipped & merged (PRs [#152](https://github.com/themancalledzac/edens.zac/pull/152) → [#160](https://github.com/themancalledzac/edens.zac/pull/160)):** Phase 0 foundation (#152) → buttons (#153) → modal/filter/dropdown (#154/#155) → nav & shell (#156) → admin-route gating (#157) → IA & UX (#158) → token collapse & a11y (#159) → ImageMetadataModal decomposition (#160, 1099→203 LoC). The full primitive set is live on `main`. **Only carve-outs remain, both intentionally deferred into [006](006-code-health.md):** `@custom-media` breakpoint bridge (Next 16 postcss conflict) + gap-rule/`rgb()` syntax sweeps. 12 dead color tokens deleted post-ship.
**Sections:** [master plan](superpowers/plans/001-design-system-unification.md) ✅ · [filter toolbar & chip](superpowers/plans/001-filter-toolbar-and-chip.md) ✅ · [modal](superpowers/plans/001-modal-primitive.md) ✅ · [dropdown](superpowers/plans/001-dropdown-primitive.md) ✅ · [nav & shell](superpowers/plans/001-nav-and-shell.md) ✅ · [IA & UX](superpowers/plans/001-ia-and-ux.md) ✅ · [token collapse & a11y](superpowers/plans/001-token-collapse-and-a11y.md) ✅ · [**image-metadata-modal decomposition (0159)**](superpowers/plans/001-image-metadata-modal-decomposition.md) ✅
_Original product gates (light-vs-dark, persistent-nav-vs-hamburger) resolved in practice during Phase 3: light theme kept, persistent footer added without replacing the hamburger menu._

### [002 · Performance & LCP](002-performance.md) 🟢 / ⛔

One merged performance epic (~9 ordered tasks: baseline → image bytes → SSR hero → narrow priority → blur placeholder → GIF poster → `will-change` scoping → AVIF/WebP verify → render micro-opts). **Partial ship ([#161](https://github.com/themancalledzac/edens.zac/pull/161), `0160`):** the BoxTree is now SSR'd with UA-derived viewport defaults + layout pinned across hydration + a 100dvh measuring skeleton — this eliminates the blank-on-load CLS void (covers the §3 SSR-hero §1b path and the §5 blank-on-load gap). Remaining: hero-byte cuts, narrow priority, blur placeholder, GIF poster, `will-change` scoping, render micro-opts.
**Sections:** [LCP critical review](superpowers/specs/002-lcp-critical-review.md) 📘 · [LCP & Lighthouse](superpowers/plans/002-lcp-and-lighthouse.md) · [re-render perf](superpowers/plans/002-performance-rerender.md) · [cache & revalidation](superpowers/plans/002-cache-and-revalidation.md) ⛔

### [003 · Client Gallery Security](003-client-gallery-security.md) 🟡

Cookie gate + admin password input shipped (code-verified). What's left is hardening: fix the **plaintext password** (→ BCrypt, backend), new-recipient-only send, Set-Cookie test, cookie-timing race, Download-All UX.
**Sections:** [security handoff](superpowers/plans/003-client-gallery-handoff.md) 📘 · [password logic](superpowers/plans/003-client-gallery-password.md) · [recipient send](superpowers/plans/003-gallery-recipient-send.md)

### [004 · Content Discovery & Filtering](004-content-discovery.md) 🟢 / ⛔

One reusable filter-bar/chip across Search/Location/Person/Tag/Collection; the `/search` route; collection tags. **Collection-tags frontend Phase 1 merged** ([PR #167](https://github.com/themancalledzac/edens.zac/pull/167)): a shared `TagsSelector` (lifted from the image editor, reused on the manage page) + `tagUtils` + `buildUpdatePayload` wiring; auto-tag + public-page display remain.
**Sections:** [public search page](superpowers/plans/004-public-search-page.md) ⛔ · [location filter bar](superpowers/plans/004-location-filter-bar.md) 🟡 · [collection tags](superpowers/plans/004-collection-tags.md) 🟡

### [005 · Layout](005-layout.md) 📘 / 🟢

The V3 row-composition engine shipped — most sections are durable reference. The one real open item: **reconcile the duplicate lone-last-row designs** (gap-box vs redesign §13 FILLER atom).
**Sections:** [redesign spec](superpowers/specs/005-row-composition-redesign.md) 📘 · [flowcharts](superpowers/specs/005-row-composition-flowcharts.md) 📘 · [retrospective](spikes/005-row-composition-retrospective.md) 📘 · [reorder audit](spikes/005-image-reorder-audit.md) 📘 · [end-row gap](superpowers/plans/005-end-row-gap.md) 🟢 · [mobile text overlay](superpowers/plans/005-mobile-text-overlay.md) 🗒️ · [pattern-tree](spikes/005-pattern-tree-exploration.md) 🗒️ · [WFC mosaic](spikes/005-wfc-mosaic-exploration.md) 🗒️

### [006 · Code Health](006-code-health.md) 🟢 / 🟡

Refactor + tests + observability + deps. Absorbs the old DRY/cleanup/decomposition grab-bags and the 315-finding frontend audit (now a slim index). _The ImageMetadataModal decomposition is filed under 001 (it's the design-system tail), not here. The follow-up **rename** of `ImageMetadataModal`/`useImageMetadataEditor`/`selectedImageIds` to drop the "Image" prefix lives here as a 006 cleanup item._
**Sections:** [dependency upgrade](superpowers/plans/006-dependency-upgrade.md) · [error boundaries & logging](superpowers/plans/006-error-boundaries-and-logging.md) 🟡 · [DRY consolidation](superpowers/plans/006-dry-consolidation.md) · [cleanup & refactor (Wave B)](superpowers/plans/006-cleanup-and-refactor.md) · [function decomposition](superpowers/plans/006-function-decomposition.md) · [thin-component extraction](superpowers/plans/006-thin-component-extraction.md) · [property-based tests](superpowers/plans/006-property-based-tests.md) · [test coverage gaps](superpowers/plans/006-test-coverage-gaps.md) 🟡 · [frontend audit (index)](superpowers/specs/006-frontend-audit.md) 📘

### [007 · Security Hardening](007-security-hardening.md) 🟢

Cross-cutting hardening surfaced by the (shipped) contact form: **gate the unguarded admin routes in `proxy.ts`** + the CloudFlare Phase 2 migration.
**Sections:** [contact messages](superpowers/plans/007-contact-messages.md) 📘 · [admin route gating](superpowers/plans/007-proxy-route-gating.md) · [CloudFlare Phase 2](superpowers/plans/007-cloudflare-phase2.md)

### [008 · Collection / Admin](008-collection-admin.md) 🟢

The `STAGING` system collection — auto-parent invisible collections (mirrors `HOME`). Backend-heavy.
**Sections:** [staging collection](superpowers/plans/008-staging-collection.md)

### [009 · Backend Contract & Auth Vision](009-backend-and-vision.md) 📘 / 🔭

The API-contract reference (still-missing endpoints that block frontend work) + the long-horizon ABAC access-control vision.
**Sections:** [backend handoff](superpowers/specs/009-backend-handoff.md) 📘 · [ABAC access control](superpowers/specs/009-abac-access-control.md) 🔭

---

## 🎯 Priority lens (folded in from the old `todo/TODO.md`)

The structural view is the chapters above; this is the "what to grab first" view. `/todoist-done <desc>` marks items complete in Todoist.

> **MR sequencing decision (2026-06-02):** perf/LCP work is **deferred to the END of the refactoring phases** — optimization rides on top of clean structure, not the other way around. Code-health refactors (P1/P2) and the design-system tail clean up first; LCP comes after.

**P0 — blocking** _(cleared)_

- ✅ React 18→19 — **full React 19 runtime upgrade done** ([#176](https://github.com/themancalledzac/edens.zac/pull/176), branch `0171`): `react`/`react-dom`→`^19.2.7` + `lucide-react`→`1.17`, transparent (tsc + jest + `next build` + live smoke all green, zero source changes). Optional React 19 idiom modernizations (ref-as-prop, `<Context>` provider) in [#177](https://github.com/themancalledzac/edens.zac/pull/177). A full [upgrade-guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide) audit found no further required changes; new-capability follow-ups (React Compiler, Form Actions, `useOptimistic`) are critically reviewed and **all deferred** in [006 · React 19 Follow-ups](superpowers/plans/006-react19-followups.md). _Nothing blocks._

**✅ Recently shipped (since this index's prior snapshot)**

- **ImageMetadataModal decomposition** — [#160](https://github.com/themancalledzac/edens.zac/pull/160) (`0159`): 1099 → 203 LoC orchestrator + 2 hooks + 5 subcomponents; deleted the 4 raw button classes PR #158 missed. The 001 chapter's final consumer migration — **001 now fully shipped.**
- **SSR BoxTree / blank-load CLS fix** — [#161](https://github.com/themancalledzac/edens.zac/pull/161) (`0160`). → reflected in [002](002-performance.md) / [005](005-layout.md).
- **Camera optimistic-create race + silent-failure fix** — [#162](https://github.com/themancalledzac/edens.zac/pull/162) (`0161-camera-create-race`). → closes [006 · camera optimistic-create race](superpowers/plans/006-camera-optimistic-create-race.md).
- **Test-quality cleanup** — [#163](https://github.com/themancalledzac/edens.zac/pull/163) (`0161-test-quality-cleanup`): de-fragilized + trimmed the 0159 component tests (cut CSS-class assertions that belong to the primitives' own tests). _The `data-state` source contract trialed here was reverted (`90387dc`) — keep state assertions class-based for now._
- **`0165-collections-parent-column` — [PR #167](https://github.com/themancalledzac/edens.zac/pull/167) (merged, `1e0946d`)** — a large mixed branch (20 commits, +2854/−341) spanning several chapters:
  - **Collection tags — frontend Phase 1** (`675033e`/`2fbee2a`/`d26689e`): shared `TagsSelector` extracted from the image editor's `TagsPeopleSection` and reused on the manage page, `tagUtils` (`convertTagsToModels`/`createTagsUpdate`, mirroring `locationUtils`), and `buildUpdatePayload` `tags` wiring. → [004 · collection tags](superpowers/plans/004-collection-tags.md). Remaining: Phase 2 auto-tag endpoint + public-page tag display.
  - **Collections parent column + type-grouped accordion** (the branch namesake): `parents` field on `CollectionListModel`/`CollectionUpdate`, `COLLECTION_TYPE_ORDER` + `ASSIGNABLE_COLLECTION_TYPES` constants next to the enum, grouped collapsible accordion rows in `CollectionListSelector` (+545 LoC). → [008](008-collection-admin.md) ([plan](superpowers/plans/2026-06-02-collections-parent-column-and-grouped-rows.md)).
  - **Collection-type drag-and-drop retype** (`01ce07d`/`4d667a6`/`ad359d8`): drag a row onto a different type's section header to optimistically reassign its type via the colocated `useCollectionRetype` hook (single-flight; reverts on failure). → [008](008-collection-admin.md) ([plan](superpowers/plans/2026-06-03-collection-type-drag-and-drop-retype.md)).
  - **`SegmentedControl` UI primitive** (`3a44fbc`/`34d970c`): new `app/components/ui/SegmentedControl/` with `radiogroup` keyboard nav — a new design-system primitive on top of the (shipped) [001](001-design-review.md) set.
  - **Manage-page design pass** (`ad33940`) + a11y (visible focus rings, larger checkbox hit target, accent-bar current-row treatment).
  - **Mobile density filter fix** (`3b8cf2c`): the density filter now works and is confined to 1–5 on mobile (`mobileDensity` tests). → [005](005-layout.md).
  - **Download empty-selection rejection** (`2e27c8a`): rejects an empty selection instead of firing an ambiguous ZIP request — partial progress on the [003](003-client-gallery-security.md) Download-All UX item.
  - **100dvh page-container fix** (`a5bc4f4`): unify height on `100dvh` to stop the footer shift — continued on the current `0166-footer-spacing` branch (`d7c7022`: mirror SiteHeader spacing, drop the divider line).
  - **Tag/location removal persistence fix** (`6e5406c`) on the manage page.
- **Refactor-wave kickoff — 4 stacked PRs (✅ merged to `main` 2026-06-06)** — [#169](https://github.com/themancalledzac/edens.zac/pull/169) → [#170](https://github.com/themancalledzac/edens.zac/pull/170) → [#171](https://github.com/themancalledzac/edens.zac/pull/171) → [#172](https://github.com/themancalledzac/edens.zac/pull/172) (branches `0167`–`0170`): (1) `fail()`→`.rejects` in `core.test.ts`; (2) dropped the "Image" prefix wholesale (`app/components/ImageMetadata/`→`Metadata/`, `selectedImageIds`→`selectedIds`, `app/types/ImageMetadata.ts`→`Metadata.ts`; 44 files, git-tracked renames); (3) migrated the last 22 `console.error/warn`→`logger` (7 files + 3 test spy fixes); (4) `COLLECTION_TYPE_LABELS` (rendered via `ASSIGNABLE_COLLECTION_TYPES.map`) + shared `ui/Dropdown/commonAddNewFields.ts`. #172 also carries a `chore(format)` commit (repo-wide on-save prettier noise). Each verified `tsc` clean + `jest` green (1728→1729). Record: [0167-refactor-wave-handoff.md](0167-refactor-wave-handoff.md). → clears 4 P1 items; see [006](006-code-health.md).

**P1 — next up (refactor wave)** _✅ The **0171 Next-Batch wave fully shipped to `main` (2026-06-06)**: React 19 upgrade ([#176](https://github.com/themancalledzac/edens.zac/pull/176)/[#177](https://github.com/themancalledzac/edens.zac/pull/177)) · entity-edit DRY ([#174](https://github.com/themancalledzac/edens.zac/pull/174)) · inline-JSX Win #3 ([#175](https://github.com/themancalledzac/edens.zac/pull/175)) · mobile tile-width ([#178](https://github.com/themancalledzac/edens.zac/pull/178)). The earlier four wave items shipped as stacked PRs [#169](https://github.com/themancalledzac/edens.zac/pull/169)→[#172](https://github.com/themancalledzac/edens.zac/pull/172) (the `Image`-prefix rename, logger migration, inline-JSX Wins #1/#2, `fail()` fix). Handoff records: [0167](0167-refactor-wave-handoff.md) · [0171](0171-next-batch-handoff.md). What remains:_

- ✅ Entity-edit DRY wins ([#174](https://github.com/themancalledzac/edens.zac/pull/174), branch `0172`): `buildAssociationDiff` for tags/people, shared `toggleRelation` engine (`app/utils/collectionToggle.ts`), `useToggleTriple` hook adopted at 4 sites (investigation 2026-06-02 explicitly **rejected** unifying the state shapes). tsc + jest green (93/1740, +11). → [006 · entity-edit DRY wins](superpowers/plans/006-entity-edit-dry-wins.md)
- Thin-component extraction sweep: audit every `'use client'` component, then lift inline derivation logic into co-located, unit-tested `<Component>Utils.ts` helpers so each reads `hooks → helpers → JSX` (the logic-extraction sibling to function decomposition; `Component.tsx`/`ClientGalleryDownload.tsx` already done). Two phases (audit → behavior-preserving refactor), file-parallel by directory — a strong `/agent-teams` fit. → [006 · thin-component extraction](superpowers/plans/006-thin-component-extraction.md)
- ✅ Inline JSX config — **Win #3** ([#175](https://github.com/themancalledzac/edens.zac/pull/175), branch `0173`): lifted `TEXT_FORMAT_OPTIONS`/`TEXT_ALIGN_OPTIONS` to `app/types/Content.ts` (unions derived from the consts). Wins #1/#2 (`COLLECTION_TYPE_LABELS` + `commonAddNewFields`) shipped in [#172](https://github.com/themancalledzac/edens.zac/pull/172). **Chapter complete.** → [006 · inline JSX config (cross-file)](superpowers/plans/006-inline-jsx-config-cross-file.md)
- Remove `force-dynamic` from `app/page.tsx` (⛔ backend `blocks_per_page`). → [002 · cache](superpowers/plans/002-cache-and-revalidation.md)

**P2 — DRY & refactor** → [006 · DRY](superpowers/plans/006-dry-consolidation.md) (5 merges) + [002 · re-render](superpowers/plans/002-performance-rerender.md) (memoization). _(lucide update ✅ done in [#176](https://github.com/themancalledzac/edens.zac/pull/176).)_

**P3 — testing** → [006 · test coverage](superpowers/plans/006-test-coverage-gaps.md) (`admin.ts` security tests, complex-hook + component render tests) + [006 · property-based](superpowers/plans/006-property-based-tests.md). _(apiUtils + contentTypeGuards tests already shipped.)_

**P4 — perf (after the refactor wave settles)** _Deferred per the sequencing decision above. The token foundation + ImageMetadataModal decomposition + force-dynamic removal all make the perf work safer to land on top of._

- `will-change` scoping · GIF `thumbnailUrl` poster · `blur` placeholder. → [002 · LCP & Lighthouse](superpowers/plans/002-lcp-and-lighthouse.md)
- `ContentBlockWithFullScreen` → shared IntersectionObserver · `generateMetadata` `size=500`→`size=1`. → [002 · performance](002-performance.md)
- **React Compiler** (React 19 unlocks it) — auto-memoization that could retire much manual `useMemo`/`useCallback`; **verify Turbopack compatibility first.** Critically reviewed (high payoff, deferred here) → [006 · React 19 Follow-ups](superpowers/plans/006-react19-followups.md).

**Infra / DevOps**

- Cloudflare CDN/edge → [007 · CloudFlare Phase 2](superpowers/plans/007-cloudflare-phase2.md) · Todoist `6XQm4Ccw7Ghq2f4G`
- Backend startup messages · Todoist `6g8xfM6Xv7XRc3gq`
- OAuth investigation (Amplify Cognito stub) → [009 · ABAC](superpowers/specs/009-abac-access-control.md) · Todoist `6XjcFJH6W6JhVCgp`

**Content / docs**

- Update GitHub main-page README · Todoist `6g8xcP35w3Jmj7WH` · Update backend README · `6g8xcR63JjC9X62q` _(frontend README done, PR #111)_

---

## 🧩 Backend blockers (see [009](009-backend-and-vision.md))

Keystone **`GET /api/read/content/images/search`** (unblocks [004 search](superpowers/plans/004-public-search-page.md)) · public `locations` · public `lenses` · collection-download ZIP · secure content-gating for password-protected galleries · `POST /collections/{id}/auto-tag`.

---

## 🗄️ Archive & history

- [previous-work.md](previous-work.md) — shipped-feature log.
- The `todo/archived/` + `todo/refactor/archived/` logs and `just_done.md` were **mined into [previous-work.md](previous-work.md)** (see the _Early Layout Refactor_ + _Cleanup Sprint_ sections) and **removed 2026-06-01** — backed up in `_archive/todo-archive-2026-06-01.tar.gz`. Their open items were migrated into the active chapter plans (e.g. collection-tags → 004, force-dynamic → 002, logger/error-boundaries + property-tests → 006, frontend-audit pending → specs/006).
- `_archive/shipped-docs-2026-06-01.tar.gz` — the 25 docs removed in the first consolidation pass; safe to delete once [previous-work.md](previous-work.md) is confirmed complete.

> **Dangling lineage refs:** a few reference docs cite predecessor docs (prominence-layout, guest-auth-spike, the date-prefixed frontend plans) that were removed in earlier passes. Those pointers dangle by design — substance lives in [previous-work.md](previous-work.md) and git history.
