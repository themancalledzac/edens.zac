# Group A — Pure deletions (shipped)

_Archive of shipped work from the [2026 Summer Refactor board](../2026-summer-refactor.md). Nothing here is open work. Sections are verbatim as they were when the item merged._

All nine items merged: PR #255–#263. Everything here was verified zero-reference before deletion; A5 turned out to be a bug fix rather than a deletion. A9's last bullet (a `CLAUDE.md` correction, not a deletion) is still open on the live board.

## Closed rows

| MR  | Scope                                            | Outcome                              |
| --- | ------------------------------------------------ | ------------------------------------ |
| A1  | Dead whole files + their tests                   | −1,261 · #255                        |
| A2  | Dead exports in `lib/api`                        | −283 · #256                          |
| A3  | Dead half of `metadataUtils.ts`                  | −400 src, −500 test · #257           |
| A4  | Dead small utils, constants, type guards         | −652 · #258                          |
| A5  | Gray overlay never paints on manage grid (BUG)   | ±40 · #260                           |
| A6  | `CollectionListSelector` flat mode               | −223 net (−183 src/scss, −40 test) · #261 |
| A7a | `useCollectionEdit` legacy aliases               | −8 · #259                            |
| A7b | `enterSelect`/`enterAdd` inline copies           | −2 src · #262                        |
| A8  | Dead SCSS in live modules + `globals.css` tokens | −327 · #263                          |

---

### ✅ A1 · Dead whole files + their tests — PR #255

- [x] `app/hooks/useCollectionData.tsx` (112) — old manage-page relic, test-only. Delete `tests/hooks/useCollectionData.test.tsx` (319).
- [x] `app/utils/focalLength.ts` (28) — the lens-type filter dimension was removed. Delete `tests/utils/focalLength.test.ts` (105) and `LensType` at [GalleryFilter.ts:13](app/types/GalleryFilter.ts:13). The `focalLength` image _field_ stays — it is live in `FullScreenModal` and metadata.
- [x] `app/utils/groupCollectionsByYear.ts` (69) — test-only. Delete `tests/utils/groupCollectionsByYear.test.ts` (91).
- [x] `app/components/Breadcrumb/` (86 with SCSS) — never mounted; docs 004 already flags "mount or drop", this is the drop. Delete `tests/components/Breadcrumb/` (42).
- [x] `app/components/ErrorBoundary/` (108 with SCSS) — zero refs, no test; route errors use `app/error.tsx`.
- [x] `app/components/Content/index.ts` (9) — barrel with zero importers.
- [x] `app/page.module.scss` (76), `app/styles/forms.module.scss` (63), `app/styles/admin.module.scss` (51), `app/components/Content/Content.module.scss` (40) — four orphaned style files. `page.module.scss` also removes the repo's only third breakpoint system.
- [x] `.junie/` (7 broken symlinks tracked in git, all pointing at a nonexistent `.agents/skills/`), `skills-lock.json` (40, orphaned lockfile), `Scripts/copyFileNamesScript.py` (13, orphaned script).

Not in this MR: `app/user/selects/page.tsx` — still needs the G3 decision.

### ✅ A2 · Dead exports in `lib/api` — PR #256

- [x] `core.ts` write channel — `fetchPutJsonApi`, `fetchPatchJsonApi`, `fetchPostJsonApi`, `fetchFormDataApi`, the `'write'` union member, the `WRITE` const. Verified zero call sites. The 20 generic error-handling and response-handling probes in `core.test.ts` were retargeted onto `fetchAdminPostJsonApi` (same `fetchBase` path, assertions unchanged); only the three `write endpoint functions` channel-routing tests were deleted.
- [x] `content.ts` — `getAllCameras`, `getAllLenses`, `getFilmMetadata`, `createTag`, `createPerson`. The edit UI uses `getMetadata()`; tags and people are created through `updateImages` prev/newValue.
- [x] `selects.ts` — `listSelectIds`, `listAllSelects`. Only the `*Server` variants are used.
- [x] `share.ts` — un-export `getShareSettings` (internal use only).

### ✅ A3 · Dead half of `metadataUtils.ts` — PR #257

About 400 of ~1,000 lines. All of it is a relic of the pre-`useMetadataState` form pattern and is referenced only by tests. Shipped at −995 lines total (−398 src, −570 test, −27 across the three call-site files).

- [x] Delete the entire "Display Helper Functions" section. **Except `computeCameraSelectionUpdate`** — it lives in that section but has 3 live call sites in [CameraSettingsSection.tsx:135](app/components/Metadata/sections/CameraSettingsSection.tsx:135). Only the section banner was removed, so it now sits under "Pure Helper Functions" — which is what its own docblock calls it. The other 8 display helpers are gone.
- [x] Delete the entire "Generic Dropdown Change Handler" section. Took the two private helpers (`handleMultiSelectChange`, `handleSingleSelectChange`) with it.
- [x] Delete `applyPartialUpdate` and `getFormValue`.
- [x] `buildImageUpdateForSingleEdit` is a pass-through — retarget its 2 callers and delete it. It was 1 call site + 1 import, both in `useMetadataSubmit.ts`, which already imported `buildImageUpdateDiff`. Its 4 tests were pass-through duplicates of cases `buildImageUpdateDiff` already covers.
- [x] `mergeNewMetadata`'s `_currentState` param is unused — drop it. The `useCollectionEdit` call site no longer reads `prev`, so the functional `setState` form collapsed to a direct set. 10 test call sites and 4 now-unused fixtures updated.
- [x] Delete the matching test blocks in `tests/components/Metadata/metadataUtils.test.ts`. 11 top-level describes removed; test count 3895 → 3836.

Lesson for the remaining A-items: the review's "delete the entire X section" claims are section-level, not symbol-level. Re-grep each export inside a section before cutting it — `computeCameraSelectionUpdate` would have broken the build.

### ✅ A4 · Dead small utils, constants, type guards — PR #258

- [x] [contentTypeGuards.ts:184-226](app/utils/contentTypeGuards.ts:184) — `getSlotWidth` and `getRatedContentItem`, the real V1-era survivors. Their docblock still documents the retired vertical penalty. (`rowCombination.ts` itself is clean — no `arFactor`/`verticalPenalty`/`isFullWidthHero` hits anywhere.)
- [x] `useDebounce` — after removal `debounce.ts` holds only `useThrottle`; move it to `app/hooks/useThrottle.ts`.
- [x] `createTagsUpdate`, `createLocationsUpdate`, `formatDisplayDateRange`, `isFullscreenSupported`, `isProduction`, `COLLECTION_VISIBILITY_DESCRIPTIONS`.
- [x] `CollectionPageDTO` — a ~40-line unconsumed DTO mirror.
- [x] `logger.ts`'s `_logLevelCheck`.
- [x] `useMetadataEditor`'s deprecated `editingImage` alias and unused `isOpen`.
- [x] `constants/index.ts` — `Z_INDEX` (whole object, zero refs, values contradict its own comments), `patternWindowSize`, `patternMaxMovement`, `minChunkSize`, `apiMockDelay`, `debounceResize`, `gridWidth`, `gridHeightCatalog`, `gridHeightBlog`, `intersectionMargin`, `adminManageMax`. Fix the stale slot-model comment above `defaultChunkSize`.
- [x] Each of the above takes its test block with it.

Shipped at −652 (13 insertions). Two of the listed symbols were NOT dead and stayed:
`useThrottle` (live in [useViewport.ts:50](app/hooks/useViewport.ts:50) — `debounce.ts` moved to
`app/hooks/useThrottle.ts` rather than being deleted) and `defaultChunkSize` (10 source + 14 test
refs — comment fix only). The CSS `--z-*` tokens are live; only the unused TS `Z_INDEX` object went.
Deleting `_logLevelCheck` orphaned the `LogLevel` type, and deleting `isFullscreenSupported`
orphaned `docEl` in its test — both went too.

**A4 broke an open branch, and nothing in git said so.** `formatDisplayDateRange` was genuinely
zero-reference _on main_ — but PR #253 (`0251-collections-panel`, open since 2026-08-15) imported it.
The two touch disjoint files, so GitHub reported the PR `MERGEABLE`/`CLEAN` throughout and
`git merge origin/main` applied with no conflict. The break surfaced only at `tsc`. Fixed on that
branch by repointing at `formatLongDate`.

**This applies to every remaining Group A and B item.** The spike's dead-code method is "grep call
sites", which is correct for main and blind to open branches — and Groups A+B are ~5,000 deleted
lines. Before merging a deletion item, sweep the symbol across remote branches:

```bash
git grep <symbol> $(git for-each-ref --format='%(refname)' refs/remotes/origin)
```

Also verified while there: A4/A5/A8 moved **no** admin-hub pixel math. The hub fixtures are computed
in Node from `listPanelShape.ts` and the packer, so A8's SCSS deletions cannot reach them.

### ✅ A5 · Gray overlay never paints on the manage grid — this is a BUG — PR #260

**The open question in the original review is now answered: the overlay IS wanted. Do not delete it.**

[CollectionContentRenderer.tsx:646](app/components/Content/CollectionContentRenderer.tsx:646) computes
`isNotVisible` by calling `checkImageVisibility` on a synthesized object with `visible: true,
collections: []` hardcoded, so it can never return true and hidden images render with no gray tint.

Three things prove the manage grid deliberately renders non-visible content, which is what makes this a
regression rather than dead code:

- `filterVisibleBlocks` in `contentLayout.ts` only drops invisible blocks when `filterVisible` is true —
  that is the public path. Manage passes false.
- `sortNonVisibleToBottom` keeps invisible blocks and sorts them to the end.
- [componentUtils.ts:148](app/components/Content/componentUtils.ts:148) derives a divider row index from
  `hasNonVisible`, i.e. the grid draws a separator marking where non-visible content begins.

Root cause: the renderer destructures primitives (`contentId`, `imageUrl`, `contentType`) and never
receives the real block, which is why someone stubbed one in.

- [x] Threaded a precomputed `notVisible` boolean down from `BoxRenderer`, the last point in the
      chain that still holds the real block. Gated on `currentCollectionId != null` — the same
      manage-view test `isPublicView` and `computeFirstNonVisibleRowIndex` already use.
- [x] Deleted `checkImageVisibility`; `BoxRenderer` calls `!isContentVisibleInCollection(...)`. This
      retires half of E4's "one IMAGE guard" item.
- [x] `tests/components/Content/BoxRenderer.visibility.test.tsx` — renders `BoxRenderer` with the
      REAL `CollectionContentRenderer`, not the module mock, because the bug lived in the seam
      between them. Confirmed the two positive cases fail against the old behavior.

### ✅ A6 · `CollectionListSelector` flat mode — PR #261

The deletion premise is verified: the only two callers are
[StructureTab.tsx:133](app/components/ContentCollection/edit/sections/StructureTab.tsx:133) (passes
sibling + parent props) and [MetadataModal.tsx:214](app/components/Metadata/MetadataModal.tsx:214)
(passes `grouped`). Neither passes `pinnedCollectionId` or `excludeCollectionId`.

**The −85 estimate is wrong — this is not a one-sitting deletion.** It counts source only:

- All 23 `defaultProps` renders in the 864-line `tests/components/CollectionListSelector.test.tsx`
  exercise FLAT mode. Zero tests pass `grouped`.
- `Disclosure` renders `{open && children}`, so collapsed accordion rows are absent from the DOM
  entirely. Every `getByText` on a collection row breaks unless the test first expands its bucket.
- Once `accordionMode` is unconditional the `grouped` prop becomes a no-op and must go too, along with
  `MetadataModal`'s use of it.

- [x] Deleted flat mode, `pinnedCollectionId`, `excludeCollectionId`, and the now-inert `grouped`
      prop (and `MetadataModal`'s use of it). `filteredCollections`/`orderedCollections` collapsed to
      `allCollections`. `handleRowClick` and the row-click / Enter-Space handlers went with the flat
      row. Also removed `.type` and `.navigable` from the SCSS module — orphaned by this change, so
      not left for A8.
- [x] Rewrote the test file against accordion mode. Every row assertion now opens its bucket first.
      Dropped: row-click toggle, Enter/Space on a row, the per-row bucket chip, `pinnedCollectionId`
      ordering, `excludeCollectionId` filtering. Added: bucket grouping + counts, default-collapsed
      sections, the pinned home row, and a check that a bare row click is inert.

### ✅ A7 · `useCollectionEdit` dead exports — aliases in PR #259, inline copies in PR #262

- [x] Returned `originalCollectionIds`/`handleCollectionToggle` legacy aliases — `StructureTab` uses
      `childIds.saved`/`handleChildToggle`. Done in PR #259. The `Metadata` surface has its own
      identically-named values from `useMetadataState`; different hook, untouched.
- [x] `enterSelect`/`enterAdd` exports — the bottom bar rebuilt them inline. The cells now point at
      the named callbacks, which joined the `bottomBarCells` deps array. The exports stayed: 10+ test
      call sites in `useCollectionEdit.{test,handlers.test,bulkRemove.test}.tsx` drive them directly.
      Done in PR #262. **`enterEdit` has the identical inline copy three lines below in the same
      array** — left in place because A7b was scoped to the two named callbacks. One-line follow-up.
- [x] The `selectedIds`-clearing effect (now `:431-435`). **DECIDED: keep it. It is load-bearing.**
      The reason given here was wrong — the effect does not earn its keep on the exit-select-mode
      path, because every path that flips `isMultiSelectMode` false already clears `selectedIds`
      itself (`resetToBrowse`, `startCaptureDatePick`, `onExitMultiSelect`, the three save-success
      handlers). The real trigger is the editor closing. `useMetadataEditor` binds
      `useEscapeKey(closeEditor, !!editingContent)` to its OWN internal `closeEditor`, which only
      does `setEditingContent(null)` — the `useCollectionEdit` wrapper that clears `selectedIds`
      never runs on that path. So: single-click an image (`useImageClickHandler` sets
      `selectedIds=[id]`, multi-select off, opens the editor), press Escape, and this effect is the
      only thing that drops the selection. Removing it leaves a phantom selection: the next tap on
      Select shows an image the user never picked, with Remove and Edit enabled against it.
      [EditModeLayer.tsx:261](app/components/ContentCollection/edit/EditModeLayer.tsx:261) masks the
      stale value (`isMultiSelectMode ? selectedIds : []`) until select mode is entered, which is why
      it reads as harmless. Proven both ways with a throwaway probe. **All 3767 tests pass with the
      effect deleted — zero coverage.** ✅ No longer true: covered by PR #267 (B8 first slice),
      `useCollectionEdit.escapeSelection.test.tsx`. The effect is now at `:432-436`.

### ✅ A8 · Dead SCSS in live modules + `globals.css` tokens — PR #263

Shipped at −327 across 10 files. The executor warning below was correct and held: `dragContainer`,
`parallaxContainer`, `overlayContainer`, `mobile`, `clickable`, `default`, `selected` are LIVE via
`buildWrapperClassName(styles)` in [contentRendererUtils.ts:427](app/utils/contentRendererUtils.ts:427).

- [x] `ContentComponent.module.scss` — `blockInner`, `blockInnerLeft`, `blockInnerLeftWithBadge`,
      `imageContentWrapper`, `contentWrapper`, the `textItem` family (`textItem`, `textItem-text`,
      `textItemLabel`, `textContentWrapper`), and the nested `&.dragging` / `&.notClickable`
      modifiers. −104.
- [x] Pre-ListPanel leftovers in `MessagesPanel.module.scss` and `Comments.module.scss` — rows render
      through `ListPanel`/`ListRow` now. −120 combined.
- [x] 12 dead `globals.css` tokens, including the three `--breakpoint-*` ones (structurally unusable
      in media preludes — all 113 `@media` rules hardcode 768px). Count was exactly right.
- [x] `.skipLink` duplicate in `PageShell.module.scss`, `.contentPadding`/`.gridContainer`,
      `.placeholderImage` (ParallaxImageRenderer), `.gateContainer`, `.overlayContainer` (About), the
      `--calendar-icon-filter` no-op — the token is referenced but never defined, so
      `filter: var(--calendar-icon-filter, none)` always resolved to `none`.

**Two more traps found, beyond the documented one.** Any future dead-CSS pass must handle both:

1. `.image` and `.overlay` have zero property-access hits and look dead, but are `@extend` bases for
   `.imageLeft/Right/Middle/Single` and `.visibilityOverlay`/`.coverImageOverlay`. Deleting them
   breaks the build. Grep `@extend` before cutting anything.
2. `.selected` exists ONLY nested under `.imageContentWrapper`, which is never applied — so
   `buildWrapperClassName`'s `isSelected` branch already emits a class that styles nothing (selection
   renders via `.selectedIndicator`). Deleting the rule is safe because `.filter(Boolean)` drops the
   resulting `undefined` and the tests pass their own stub styles object. **Carried forward to E-group:
   the `isSelected` option on `buildWrapperClassName`/`buildParallaxWrapperClassName` is now fully
   inert and should go with E8.**

Also corrected: `barCell` and `main` appear only in comment text in that file, not as selectors.

### ◐ A9 · Dead config — PR #259

_Shipped and swept bullets only. The one open bullet (the `CLAUDE.md:22` PATH correction) stays on
the live board — see A9 in [the board](../2026-summer-refactor.md)._

**Swept for the first time on 2026-08-28. Two of the three then-open bullets described states that
no longer existed — including the `layoutpreview` delete this board carried for FIVE sessions and
repeatedly re-attempted. The user cleared it outside git. Nobody checked; the board just kept
re-filing it.** That is the cost of an item stamped UNSTAMPED: not a wrong line number, five
sessions of re-deriving a dead task.

- [x] ~~`.claude/worktrees/` still holds the 6 orphaned `agent-*` directories (Mar 16, unregistered —
      re-checked 2026-08-22). Check each for uncommitted work before deleting — that is the only
      reason they were left in place. The `cleanup` worktree was removed by the review session (its
      D6 branch merged, tree clean).~~ **DONE — verified 2026-08-28.** `ls -a .claude/worktrees/`
      shows an empty directory (mtime Aug 24, i.e. cleared after the 08-22 re-check), and
      `git worktree list` returns exactly one entry: the main checkout. Zero orphans.
- [x] **DONE — the directory is GONE. Verified 2026-08-28: `ls "app/(admin)/admin/layoutpreview/"`
      returns "No such file or directory" and `find app -iname "*layoutpreview*"` returns nothing.**
      The user cleared it outside git (it was never tracked —
      `git log --all -- "app/(admin)/admin/layoutpreview"` is empty), and `git grep` across every
      remote branch finds `layoutpreview` only in this board file. Nothing is live anywhere.
      **This bullet was carried for five sessions and re-attempted at least twice.** The board's own
      advice — "stop re-attempting the delete, put the command in the handoff prompt" — was right,
      worked, and then nobody checked whether it had worked. **The lesson is not about permissions:
      an item that hands work to the USER needs a verification step on the next run, or it becomes
      immortal.** Stamp such bullets with what to check, not just what to ask for.
      **The `.next-verify` consequence is also DONE — verified 2026-08-29.** The board called the
      stale generated type at `.next-verify/dev/types/validator.ts` "expected noise" for three
      sessions; `.next-verify/` no longer exists and `tsc --noEmit` exits 0. Sessions should expect
      a CLEAN type check.
      _Original text follows._
      ~~`app/(admin)/admin/layoutpreview/` — the untracked screenshot harness for PR #253's
      four-panel question. Read and confirmed purposeless 2026-08-23: its own first line says
      "TEMPORARY … Delete this directory when the screenshots are captured", and #253 merged at
      79fbca5. Carried forward from the 08-23 log entry's "delete on sight", which did not stick
      because it was a log line and not a tracked bullet — now it is one. **The D4 session's
      `rm -rf` was denied by the permission gate, so this is a user action, not an agent one.**
      Deleting it also removes the 3 comment lines G2's `.tsx` baseline has to exclude by hand.
      **Re-attempted and re-denied 2026-08-24 — this is now confirmed reproducible, not a one-off
      of the D4 session.** The permission gate denies `rm -rf` on this path even with bypass
      permissions active, so no agent session can clear it. Fifth session carrying it. Stop
      re-attempting the delete; put the command in the handoff prompt instead and let the user run
      it. Re-read before deleting if you want: it is one file, `page.tsx`, whose first line still
      reads "TEMPORARY — screenshot harness for the PR #253 four-panel layout question.~~

- [x] `eslint.config.mjs` — ignores for nonexistent `Components/**` and `old/**`; the `pages/**` override disabling a rule that is itself commented out.
- [x] `tsconfig.json` / `jest.config.mjs` — excludes for nonexistent `old/tests/**` and `**/__tests__/**`.
- [x] `next.config.js` — the no-op `webpack: config => config` beside the active `turbopack` block.
- [x] `package.json` — unused `eslint-config-next` devDep; name is still `"my-app"`; add the missing `"analyze"` script for the already-wired bundle analyzer.
- [x] `.gitignore` — duplicated entries from two concatenated templates.
- [x] `.cursor/rules/cursor_rules.mdc` — literally titled "Databricks Project Rules". Its frontmatter
      description was already correct for this repo, so this was a heading fix, not a regeneration.
