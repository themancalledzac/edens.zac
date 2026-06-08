# 0167 · Refactor-Wave Kickoff — Agent Handoff

> ✅ **DONE 2026-06-06 — all 4 items merged to `main` as stacked PRs:**
> [#169](https://github.com/themancalledzac/edens.zac/pull/169) test-fix (base `main`) →
> [#170](https://github.com/themancalledzac/edens.zac/pull/170) metadata rename →
> [#171](https://github.com/themancalledzac/edens.zac/pull/171) logger migration →
> [#172](https://github.com/themancalledzac/edens.zac/pull/172) inline-JSX config.
> Each verified: `tsc` clean · full `jest` green (1728→1729). #172 also carries a `chore(format)` commit. On merge: update [previous-work.md](previous-work.md) + the 006 plan statuses.

> **Created 2026-06-06.** Self-contained handoff for the next agent. Covers a **4-item batch** off the P1 "refactor wave" in [000-summary.md](000-summary.md). Each item ships as its **own MR** (stacked — see _Execution order_). No backend changes in any of them.
>
> **Predecessor context:** `0165-collections-parent-column` ([PR #167](https://github.com/themancalledzac/edens.zac/pull/167)) merged a large mixed branch (collection tags, parent column, retype DnD, `SegmentedControl`, mobile density, etc.). The current branch is `0166-footer-spacing` (footer polish). This handoff is the _next_ work after that. See [previous-work.md](previous-work.md) for the shipped log.

---

## ⚠️ The one constraint that shapes everything

**`app/(admin)/collection/manage/[[...slug]]/ManageClient.tsx` is touched by items 2, 3, and 4.** They therefore **cannot** be developed as independent branches off `main` in parallel — they will conflict. They must be **sequenced/stacked**. Only **item 1 (test fix) is fully independent** and can merge anytime.

**Naming cleanup (item 2) goes first** so logger + inline-config land on stable names — this dependency is documented in [006-inline-jsx-config-cross-file.md:10](superpowers/plans/006-inline-jsx-config-cross-file.md).

---

## Tooling (this repo — `npm`/`npx` are NOT on PATH)

```bash
cd /Users/themancalledzac/Code/edens.zac
NODE=/opt/homebrew/bin/node
$NODE node_modules/.bin/prettier --write <files>     # format (matches .prettierrc.json)
$NODE node_modules/.bin/eslint --fix <files>         # lint fix (matches Cursor save)
$NODE node_modules/.bin/tsc --noEmit                 # type check — must be clean
$NODE node_modules/.bin/jest                          # full suite — must be green
$NODE node_modules/.bin/jest <path>                   # single file
$NODE node_modules/.bin/stylelint --fix <scss>        # SCSS only
```

Commit trailer: end every commit with the repo's `Co-Authored-By:` trailer (use HEREDOC for the body).

**MemPalace (per global protocol):** before each new batch of code search, run `mempalace_search` on the topic; announce `mempalace_user_write` calls inline; the User Wing for this repo is `edens-zac`. The post-0165 batch decision is already filed under `decisions` / topic `edens-zac refactor wave kickoff`.

**Rule references:** `ai_guidelines/ai_quick_reference.md` (naming, imports, Inline JSX Config Rule), `ai_guidelines/ai_test.md`, `ai_guidelines/ai_lint.md`. No `any`; named React imports only; Server Components by default.

---

## Execution order & branching

Recommend a **stack** so all four can be in review simultaneously:

```
main ─┬─ 0167-test-core-fail-fix        (item 1 — independent; merge first/anytime)
      └─ 0168-metadata-rename           (item 2 — base: main)
            └─ 0169-logger-migration    (item 3 — base: 0168-metadata-rename)
                  └─ 0170-inline-jsx-config (item 4 — base: 0169-logger-migration)
```

Each branch: implement → format/lint/tsc/jest green → open MR with the prior branch as its base. If you prefer sequential-on-`main` instead, merge in the same order and rebase each onto `main` after the previous lands. (Branch numbers are suggestions — `0166` is taken; pick the next free ones.)

---

## Item 1 — Test hygiene: kill `fail()` in `core.test.ts`

**MR:** `0167-test-core-fail-fix` · independent · ~5-min change.
**Chapter:** [006 · test coverage gaps](superpowers/plans/006-test-coverage-gaps.md).

`fail()` is **not** a Jest 29 global — these three calls only "work" by throwing a ReferenceError that the surrounding `catch` swallows, so the tests don't actually assert the throw. Fix all three in `tests/lib/api/core.test.ts` (lines **91, 108, 131**).

**Preferred fix** — delete the `try/catch`+`fail` and use `.rejects` matchers (robust, no manual counting):

```ts
// Test 1 (was lines 80–96): "should preserve status code in ApiError"
await expect(fetchPostJsonApi('/test', {})).rejects.toBeInstanceOf(ApiError);
await expect(fetchPostJsonApi('/test', {})).rejects.toHaveProperty('status', 403);

// Test 2 (was lines 100–113): "...status 500"  — keep the existing two .rejects lines, then:
await expect(fetchPostJsonApi('/test', {})).rejects.toHaveProperty('status', 500);

// Test 3 (was lines 123–136): "should handle unknown error types" — keep the two .rejects lines, then:
await expect(fetchPostJsonApi('/test', {})).rejects.toHaveProperty('status', 500);
```

**Fallback** (if you prefer minimal diff): keep the `try/catch`, delete the `fail('Should have thrown')` line, and add `expect.assertions(N)` at the top of each test — `N` = number of `expect()` calls that run in the throw path (Test 1 → 2, Test 2 → 4, Test 3 → 4).

**Verify:** `$NODE node_modules/.bin/jest tests/lib/api/core.test.ts` (green), then full `tsc --noEmit`.
**Commit:** `test(api): replace non-existent fail() with .rejects matchers in core.test.ts`

---

## Item 2 — Naming cleanup: drop the "Image" prefix (wholesale)

**MR:** `0168-metadata-rename` · base `main` · **do before items 3 & 4** · large but mechanical.
**Chapter:** folds into [006 · cleanup & refactor](superpowers/plans/006-cleanup-and-refactor.md).
**Why:** the modal now edits content metadata generally (GIFs are first-class), so the UI-layer `Image*` names are misleading.

### Rename map (UI / orchestration layer ONLY)

| From                                                      | To                                       | Kind              |
| --------------------------------------------------------- | ---------------------------------------- | ----------------- |
| `app/components/ImageMetadata/`                           | `app/components/Metadata/`               | folder (`git mv`) |
| `ImageMetadataModal.tsx` / `.module.scss`                 | `MetadataModal.tsx` / `.module.scss`     | files             |
| `imageMetadataUtils.ts`                                   | `metadataUtils.ts`                       | file              |
| `app/components/Metadata/hooks/useImageMetadataState.ts`  | `useMetadataState.ts`                    | file              |
| `app/components/Metadata/hooks/useImageMetadataSubmit.ts` | `useMetadataSubmit.ts`                   | file              |
| `app/hooks/useImageMetadataEditor.tsx`                    | `useMetadataEditor.tsx`                  | file              |
| `ImageMetadataModal` (symbol, 28 refs)                    | `MetadataModal`                          | identifier        |
| `useImageMetadataEditor` (6 refs)                         | `useMetadataEditor`                      | identifier        |
| `useImageMetadataState` / `useImageMetadataSubmit`        | `useMetadataState` / `useMetadataSubmit` | identifiers       |
| `selectedImageIds` (~107 refs)                            | `selectedIds`                            | identifier        |
| `setSelectedImageIds` (18 refs)                           | `setSelectedIds`                         | identifier        |

Mirror **every** rename in the `tests/components/ImageMetadata/**` tree → `tests/components/Metadata/**` (11 test files; `git mv` the dirs/files too).

### DO NOT rename (backend-contract / genuine image types)

`ContentImageModel`, `ContentImageUpdateRequest`, `ContentImageUpdateResponse`, `FilmFormatDTO`, the `buildImageUpdateForSingleEdit` / `buildImageUpdatesForBulkEdit` util fns, and `selectedImages: ContentImageModel[]` (resolved image objects). These map to real backend DTOs / actual image entities — leave them. (Result: `selectedIds` + `selectedImages` coexist; that's intended — ID list vs resolved objects.)

### Method (preserve git history, catch stragglers via the compiler)

1. `git mv` the folder + files first (see map). Update the SCSS-module import inside the renamed modal.
2. Global identifier replace across `app/` + `tests/` (whole-word). Order matters — do the longest first so substrings don't get mangled:
   `setSelectedImageIds`→`setSelectedIds`, then `selectedImageIds`→`selectedIds`, then `useImageMetadataEditor`→`useMetadataEditor`, `useImageMetadataState`→`useMetadataState`, `useImageMetadataSubmit`→`useMetadataSubmit`, `ImageMetadataModal`→`MetadataModal`, and all `@/app/components/ImageMetadata/…` import paths → `…/Metadata/…`.
3. `$NODE node_modules/.bin/tsc --noEmit` — fix every unresolved reference it flags (this is your completeness check).
4. Grep guard: `grep -rn "ImageMetadataModal\|useImageMetadataEditor\|selectedImageIds\|components/ImageMetadata" app/ tests/` must return **nothing**.

**Scope numbers (baseline to confirm you got them all):** `selectedImageIds` ~125 textual hits (incl. the 18 `setSelectedImageIds`), `ImageMetadataModal` 28, `useImageMetadataEditor` 6, across these source files + 11 test files: `ManageClient.tsx`, `app/hooks/useImageMetadataEditor.tsx`, the whole `ImageMetadata/` tree (modal, `imageMetadataUtils.ts`, `types.ts`, `hooks/`, `sections/`), plus `selectedImageIds` consumers in `app/types/ContentRenderer.ts`, `ClientGalleryDownload/`, `Content/` (`BoxRenderer`, `ContentBlockWithFullScreen`, `CollectionContentRenderer`, `Component`), `ContentCollection/` (`CollectionPageClient`, `ClientGalleryDownloadContext`).

**Verify:** `tsc --noEmit` clean → full `jest` green → `prettier`/`eslint --fix` on touched files.
**Commits (suggested):** `refactor(metadata): rename ImageMetadata folder/files → Metadata` · `refactor(metadata): drop Image prefix on modal/hook/selectedIds identifiers`

---

## Item 3 — Finish the logger migration

**MR:** `0169-logger-migration` · base `0168-metadata-rename`.
**Chapter:** [006 · error boundaries & logging](superpowers/plans/006-error-boundaries-and-logging.md) (the old "21 occurrences" figure is **stale** — recounted below).

Replace raw `console.error` / `console.warn` with the structured `logger` from `app/utils/logger.ts` (signature: `logger.error(module, message, error?, context?)`, `logger.warn(module, message, context?)`). **Leave `app/utils/logger.ts` itself alone** — its internal `console.*` is the intended sink.

**Recounted targets — 22 calls across 7 files** (file paths reflect the post-item-2 rename):

| File                                                         | count |
| ------------------------------------------------------------ | ----- |
| `app/lib/storage/collectionStorage.ts`                       | 9     |
| `app/(admin)/collection/manage/[[...slug]]/ManageClient.tsx` | 5     |
| `app/(admin)/collection/manage/[[...slug]]/manageUtils.ts`   | 3     |
| `app/utils/contentRendererUtils.ts`                          | 2     |
| `app/components/Metadata/sections/CameraSettingsSection.tsx` | 1     |
| `app/lib/api/content.ts`                                     | 1     |
| `app/lib/api/core.ts`                                        | 1     |

None of these currently import `logger` — add the import. Pick a stable `module` tag per file (e.g. `'collectionStorage'`, `'ManageClient'`, `'apiCore'`). After migrating, leave the `// Future: reportToService()` placeholder note in `logger.ts` as the external-tracking follow-up (Sentry/CloudWatch — out of scope here).

**Verify:** `grep -rn "console\.\(error\|warn\)" app/ --include=*.ts --include=*.tsx | grep -v "utils/logger.ts"` returns nothing → `tsc` clean → `jest` green.
**Commit:** `refactor(logging): migrate remaining console.error/warn to logger (22 calls, 7 files)`

---

## Item 4 — Inline JSX config (cross-file)

**MR:** `0170-inline-jsx-config` · base `0169-logger-migration`.
**Plan:** [006-inline-jsx-config-cross-file.md](superpowers/plans/006-inline-jsx-config-cross-file.md) — **already fully spec'd; follow it directly.** Quick digest:

- **Win #1 — `COLLECTION_TYPE_LABELS`**: add `COLLECTION_TYPE_LABELS: Record<CollectionType, string>` to `app/types/Collection.ts` next to the enum (it sits at line 13; `COLLECTION_TYPE_ORDER` at 24, `ASSIGNABLE_COLLECTION_TYPES` at 39 — put it alongside). Mirror the existing `COLLECTION_VISIBILITY_LABELS` pattern in `app/types/CollectionVisibility.ts`. Replace the hardcoded `<option>` ladder in `ManageClient.tsx` (~lines 1196–1211) with `Object.entries(COLLECTION_TYPE_LABELS).map(...)`. Add a tiny test asserting an entry per enum member.
- **Win #2 — shared `commonAddNewFields.ts`**: create `app/components/ui/Dropdown/commonAddNewFields.ts` exporting `LOCATION_ADD_NEW_FIELDS` / `PERSON_ADD_NEW_FIELDS` (and `TAG_*` only if placeholders match — run the plan's preflight grep first). Adopt in `EssentialInfoSection.tsx`, `TagsPeopleSection.tsx`, and `ManageClient.tsx` (3 call sites). Fixes the verbatim-duplicated `{label:'Location Name', placeholder:'e.g., Seattle, WA'}` drift risk.
- **Win #3 (optional)** — `TEXT_FORMAT_OPTIONS`/`TEXT_ALIGN_OPTIONS` lift in `TextBlockCreateModal.tsx`. Bundle only if convenient.

> **Note:** the plan's file paths say `app/components/ImageMetadata/sections/…` — after item 2 these are `app/components/Metadata/sections/…`. Adjust as you go.

**Verify:** plan's verification block (`tsc` + full `jest`, +1 new label test).
**Commits:** `feat(types): add COLLECTION_TYPE_LABELS; adopt in ManageClient` · `refactor(ui): shared commonAddNewFields for Location + Person`

---

## Out of scope for this wave (don't scope-creep)

- **Entity-edit DRY wins** (`buildAssociationDiff`, shared `toggleRelation`, `useToggleTriple`) — its own later MR ([006-entity-edit-dry-wins.md](superpowers/plans/006-entity-edit-dry-wins.md)); the 2026-06-02 investigation **rejected** unifying the state shapes.
- **Thin-component extraction sweep** — separate two-phase effort ([006-thin-component-extraction.md](superpowers/plans/006-thin-component-extraction.md)).
- **React 18→19 type alignment** (P0, unblocked) — independent track; can run truly parallel since it touches deps/types, not `ManageClient`. Decide 1-hr type-align vs full upgrade first ([006-dependency-upgrade.md](superpowers/plans/006-dependency-upgrade.md)).
- **`force-dynamic` removal** — ⛔ blocked on backend `blocks_per_page`.
- External error tracking (Sentry/CloudWatch) — follow-up to item 3.

## Definition of done (whole wave)

All four MRs: `tsc --noEmit` clean · full `jest` suite green · `prettier`+`eslint --fix` applied · no new `any` · post-merge grep guards (items 2 & 3) return nothing. Then update [000-summary.md](000-summary.md) "Recently shipped" + the relevant 006 plan statuses.

---

_↑ [Back to the book](000-summary.md)._
