# 2026 Summer Refactor — Living Checklist

_Formerly `docs/spikes/2026-08-22-frontend-cleanup-spike.md`; renamed 2026-08-23 as the standing
per-session tracker (a pointer stub remains at the old path for stale references)._

_Origin: full critical review of `main` on 2026-08-22, produced by 8 parallel review agents (API, security, utils/hooks, admin surface, public surface, tests, styles, organization/roadmap). Every dead-code claim was verified by grepping call sites; the parent session re-verified every high-severity claim against current code. Full-board re-review 2026-08-22/23 by 7 more agents — see the stamp below._

**This file is a running to-do list, not a one-shot report.** Work is split into numbered MRs sized to land in a single sitting. Check the box when the MR merges, and put the PR number next to it. Keep the `file:line` references — they let any MR be picked up cold.

> **Tracked as of 2026-08-23** (branch `0271-summer-refactor-tracker`): `docs/spikes/*` stays
> gitignored except this file, so the board and its decisions now have history and survive the
> machine. Trade-off accepted deliberately 2026-08-23: the repo is public and this file documents
> unfixed security items (D3, D5, D8) — the backend repo's tracker set the precedent, and those
> three are the next scheduled sittings. Additional durable copies: the review artifact (stamp
> below) and MemPalace (`mempalace_user_search(query="frontend cleanup spike review")`).
>
> **CONFIRMED 2026-08-23: PR #271 merged, the file is tracked** (`git ls-files docs/spikes/` lists
> it; `.gitignore` pairs `docs/spikes/*` with `!docs/spikes/2026-summer-refactor.md`).
> **Trap this creates, hit on the very next run:** a session whose local `main` predates #271 sees
> this file as untracked, and `git check-ignore -v` reports it plainly IGNORED — the pre-negation
> `.gitignore` is what's checked out. Do not conclude the tracking never happened; `git fetch` and
> compare against `origin/main` first. Syncing also needs the local untracked copy removed before
> the fast-forward, because git refuses to create a tracked file over an untracked one even when
> the bytes are identical. Diff them first (`git show origin/main:<path>`), then delete and merge.

> **Full-board review, 2026-08-22/23 (7 parallel agents).** Every open item re-verified and stamped
> COLD or ⛔ in the board. 27 `file:line` refs checked: 22 correct, 4 drifted, 1 gone — corrected in
> place below. Estimates recalibrated per item (the source-only pattern held: several "negative"
> E-items go net-positive once required tests are counted). The merged security gates (D1/D2/D6)
> passed an adversarial review with no high/medium finding (one new trivial item, D8). A correctness
> spot-review of A5/A6/C1/E1/D2 found ZERO regressions on main. PR #253 re-reviewed: technically
> merge-ready, blocked only on the four-panel design decision. D3 and D4 were UNBLOCKED against
> production (`curl -sI https://www.zacedens.com/`): Amplify injects no security headers, and the
> distribution is `d2qp8h5pbkohe6.cloudfront.net`. C5's token-leak bullet was disproven and reframed.
> Durable copy of the review: https://claude.ai/code/artifact/2bac2495-6d76-40e7-bcad-56b3ddf1d4fe
> **PR #253 MERGED 2026-08-23 (79fbca5)** — that closed D7 outright and unblocked E10.

## How to use this doc

- One MR per numbered item (`A1`, `B3`, …). Do not bundle across items.
- Every MR ends with the standard verification: scoped `eslint --fix` → `prettier --write` → `tsc --noEmit` → full `jest`.
- **Prove every regression test fails without its fix.** Stash the source change, re-run the new
  test, confirm it goes red, restore. A green test proves nothing until you have watched it fail.
  This caught two would-be-worthless tests already: C1's first draft passed against the buggy source
  because the fixture left the relevant fields `undefined`, and it is the only reason D1's gate
  coverage is known to be real. Cheap, and it is the difference between a test and a decoration.
- **The same rule applies to anything you verify by observation, not just to tests.** "No errors in
  the console", "no violations reported", "nothing in the logs" — a silent result is only evidence
  if you have shown the channel can speak. Include a case that SHOULD trigger the thing, in the same
  run. D3 is the worked example: the CSP report-only console was clean, but the backend was down so
  no image ever loaded and `img-src` was never exercised at all. Injecting an off-policy image
  alongside the real ones is what turned "no reports" from unfalsifiable into a result.
- **When an item specifies the mechanism of a fix, verify the mechanism before you implement it.**
  The board line is a reviewer's shorthand and can name a check that does not work. D5 is the worked
  example: "the reject is one prefix check" reads as `startsWith('api/')` on the joined path, and
  that check is walked past by `api/../actuator/env`, because `fetch` resolves dot segments while
  parsing the URL. One `new URL(...).pathname` in node, before writing any code, is what caught it.
  Implementing a spec'd check without confirming it does what the item claims ships a decoration —
  and it passes review, because the diff matches the item.
- **An item's claims about test coverage are claims, not facts — check them the same way.** The
  rule above covers a spec'd *mechanism*; this one covers a spec'd *fact*. D9 is the worked example:
  the entry asserted "no test would catch it if the redundancy reasoning were wrong", and that was
  false. Deleting the redundant literals and then simulating the feared change turned an existing
  test red at once. The entry had mistaken tests that pass *because the reasoning is right* for
  tests that cannot tell the difference. Cost of checking: one sed, one jest run. **Refs on this
  board have been drift-checked every session; claims never had been.** Both need it.
- **An audit's METHOD is a claim too — state what its pattern cannot match.** The rule above covers
  a spec'd fact; this one covers how the fact was gathered. C4 is the worked example: its
  register-vs-revalidate table was built by grepping literal tag strings, every ref in it was
  correct, and it still reported a live tag (`collection-home`) as dead — because that tag is
  assembled from a template, `collection-${slug}`, and no grep for the literal can see it. A
  pattern-match audit should name the set its pattern is blind to and walk that set by hand. Here
  the blind set was the three template tags, and `HOME_SLUG = 'home'` settled it in one look.
- **Work in the primary checkout.** PR #253 merged 2026-08-23, so the two-branches-at-once case is
  over: branch off `main` in `/Users/themancalledzac/Code/edens.zac` directly, no worktree. If a
  second concurrent branch ever becomes necessary again, the worktree traps are: `git worktree add`
  under `.claude/` needs the sandbox disabled; worktrees have no `node_modules`, clone with `cp -Rc`
  and never symlink; branching MR N+1 off MR N carries its commit, so
  `git rebase --onto origin/main <prev-branch> <this-branch>` before opening the PR. Never
  `git reset --hard` in the primary checkout.
- Group B is pure subtraction and can run in any order. Group A is NOT — `A5` turned out to be a bug
  fix, not a deletion. Group E has one item (`E1`) that is a real correctness risk — do it before the
  rest of E.
- Before sizing a sitting around an item, grep its symbols for test call sites. The estimates were
  produced from source only and have been wrong in both directions. **The grep also tells you which
  way it will miss:** a zero-hit grep means the source-only number is trustworthy (D4 estimated ±1
  and shipped ±1, the first estimate on this board to hold); any hits mean budget for test churn on
  top, which is how A4, A6, D2 and D6 all came in over.
- **When an item pins a value read off the outside world, re-read it from more than one sample.**
  D4's distribution was captured from the production homepage alone; a `remotePatterns` pin that
  misses a second distribution breaks every image on some other page, silently, in production.
  Seven pages took under a minute to check. The same applies to D3's header claims and to anything
  that hardcodes a host, ID, or endpoint the repo does not own.
- When an item is done, mark it `[x]` and append `— PR #NNN`. Leave the detail text in place; it is the record of what changed.
- **Where a written plan exists, the plan's scope beats this board's one-liner.** The board line was
  written by a reviewer skimming; the plan by someone who read the code. E1 is the worked example:
  the board called it a correctness fix ("one copy carries the password-cover strip"), the plan
  scoped it as a provable no-op and put that fix explicitly out of scope. The plan was right, and
  the divergence became C6 — which then turned out to be backend-blocked entirely. Read the plan
  before believing the board about WHY an item matters.
- **Before filing a frontend fix for a "missing" field check, grep the type.** C6 looked like a
  frontend oversight for a day. `ContentCollectionModel` simply has no `isPasswordProtected` to
  check, which is why the strip was never there. Confirm the data exists before scoping the work.

## MR board

| MR | Scope | Risk | Est. diff | Status |
| --- | --- | --- | --- | --- |
| A1 | Dead whole files + their tests | Minimal | −1,261 | ✅ PR #255 |
| A2 | Dead exports in `lib/api` | Minimal | −283 | ✅ PR #256 |
| A3 | Dead half of `metadataUtils.ts` | Minimal | −400 src, −500 test | ✅ PR #257 |
| A4 | Dead small utils, constants, type guards | Minimal | −652 | ✅ PR #258 |
| A5 | Gray overlay never paints on the manage grid (BUG) | Low | ±40 | ✅ PR #260 |
| A6 | `CollectionListSelector` flat mode | Medium | −223 net (−183 src/scss, −40 test) | ✅ PR #261 |
| A7a | `useCollectionEdit` legacy aliases | Minimal | −8 | ✅ PR #259 |
| A7b | `enterSelect`/`enterAdd` inline copies | Low | −2 src | ✅ PR #262 |
| A8 | Dead SCSS in live modules + `globals.css` tokens | Low | −327 | ✅ PR #263 |
| A9 | Dead config | Minimal | −35 | ◐ PR #259; 2 follow-ups open |
| B1 | Merge `manageUtils.test.ts` | Low | −450 | ☐ |
| B2 | `rowCombination` characterization dedup | Low | −250 | ☐ |
| B3 | `metadataUtils.test.ts` dedup | Low | −200 to −300 | ☐ |
| B4 | `contentLayout.test.ts` merge | Low | −150 to −250 | ☐ |
| B5 | `useCollectionEdit` fixture consolidation | Low | −350 | ☐ |
| B6 | Fold in `CollectionContentRenderer` characterization | Low | −150 | ☐ |
| B7 | `useClickOutside` spy tests | Low | −90 | ☐ |
| B8 | Fill the required-coverage gaps | Low | +1,100–1,650 for the 4 open bullets (est. +600 for all 6) | ◐ 2 of 6 — PR #266 (clearCache), PR #267 (Escape) |
| C1 | Unsaved people/gallery-access wipe (HIGH) | Low | +73 −11 | ✅ PR #264 |
| C2 | About portrait aspect ratio | Trivial | ±1 src, +75 test | ✅ PR #281 |
| C3 | `SelectsContext.toggle` purity | Low | ±20 | ☐ |
| C4 | Cache tags that never connect | Low | ±66 (4 dead tags + tests) | ✅ PR #279 |
| C5 | Assorted LOW bugs | Low | ±55 src, +100–200 test | ☐ |
| C6 | Password cover strip missing on the public card path | Low-medium | ±30 | ⛔ BACKEND-BLOCKED (split out of E1) |
| D1 | Gate `POST /api/revalidate` (HIGH) | Low | +175 | ✅ PR #265 |
| D2 | Gate `clearCacheAction` | Low | +212 (est. +15) | ✅ PR #266 |
| D3 | Security headers | Low-medium | +60 src, +0–40 test | ✅ PR #274 |
| D4 | Pin the CloudFront host | Low | ±1 (actual ±1) | ✅ PR #272 |
| D5 | Proxy path reject + `/cdn` matcher removal | Low | ~+30 net (−27 src, +6 reject, +40–60 test) | ✅ PR #273 |
| D6 | Shared Origin allowlist (CSRF on `/api/revalidate`) | Low-medium | +75 src, +230 test (est. ±60) | ✅ PR #270 |
| D7 | Wrong danger token on error text (a11y) | Trivial | 0 (rode #253) | ✅ via PR #253 |
| D8 | Normalize `NEXT_PUBLIC_APP_URL` in the Origin allowlist | Trivial | +30 src, +52 test (est. ±5 src, +2 test) | ✅ PR #276 |
| D9 | Decide: redundant localhost literals in the Origin allowlist | Trivial | −5 src, +20 docblock, +7 test | ✅ PR #277 — deleted |
| E1 | Parallax-card builder consolidation | Medium | +98 src, +659 test (est. −120) | ✅ PR #269 |
| E2 | `core.ts` fetch skeleton + `clientFetch` | Medium | ~0 net (−180 src, +150–200 test) | ☐ |
| E3 | `collectionStorage.ts` generics | Low | +50–150 net (characterize first) | ☐ |
| E4 | Entity-diff generics + one IMAGE guard | Medium | −80 (A5 landed the guard half) | ☐ |
| E5 | Filter/sort/date duplication | Low | −50 src, +30–60 test (2 bullets struck) | ☐ |
| E6 | `useCollectionEdit` refresh helpers | Medium | −90 src, ±100 test churn | ☐ |
| E7 | `useFilteredContentBlocks` hook | Medium | +100–200 net (new hook suite) | ☐ |
| E8 | Renderer + `MenuDropdown` dedup | Medium | −120 src, +0–50 test | ☐ |
| E9 | Download icon/hook, auth-card SCSS, `.srOnly` | Low | −100 src, +80–150 test | ☐ (srOnly bullet: user call) |
| E10 | Admin panel dedup (`LoadError`, `.viewAll`, literals, comparator) | Low | −60 src, +120 new | ☐ (unblocked — #253 merged) |
| E11 | Make cache-tag register/revalidate drift detectable | Low-medium | +205 test, 0 src | ✅ PR #280 |
| F1 | Decompose `useCollectionEdit.tsx` | Medium-high | ~neutral | ☐ |
| F2 | `RendererContext` for the BoxRenderer tree | Medium | −100 | ☐ |
| F3 | File moves and renames | Medium | ~neutral | ☐ |
| F4 | `TaxonomyPage` ← `LocationPageClient` | Medium | −150 | ⛔ USER DECISION |
| F5 | `FullScreenModal` link + resolver cleanup | Low | −30 | ☐ |
| G1 | Docs corrections | Trivial | ±50 | ☐ |
| G2 | Inline-comment enforcement + migration (decided: keep the rule) | Low | ~neutral (relocation + splits) | ◐ wording PR #268; G2a COLD, G2b ⛔ scope call, G2c ⛔ rides refactors |
| G3 | `/user/selects` decision | — | — | ⛔ USER DECISION |

Groups A and B together are ~5,000 lines removed at near-zero regression risk.

**Estimates recalibrated 2026-08-22 to count test coupling** (the original source-only numbers were
wrong 4-for-4: D2 +15→+212, E1 −120→+757 total, A4 and A6 the same way). Where a range appears, the
top end assumes the repo's prove-it-fails discipline, which is not optional.

**Board maintenance (recommendation, 2026-08-22).** Three drift classes recurred within 48 hours:
sections without board rows (E10, D7), items filed under the wrong group heading (D6, then D7
again), and rows whose status contradicts their section (A1 vs G3, A9 ✅ with two open bullets).
Every stale line traced to fallout from a previously shipped item — the board decays fastest
exactly where work lands. Keep the board, but stop maintaining status in two places by hand:
(1) rule — a new finding gets its board row and its section in the SAME edit, under the right
heading; (2) optional — a ~40-line script that regenerates this table from the `### <status> <id> ·`
headings, run after each edit. The bigger call is the user's: this file is still gitignored; track
it (or move it to a tracked `docs/cleanup/`) so its decisions survive the machine.

---

## Group A — Pure deletions

Everything here is verified zero-reference. No behavior change.

### ✅ A1 · Dead whole files + their tests — PR #255

- [x] `app/hooks/useCollectionData.tsx` (112) — old manage-page relic, test-only. Delete `tests/hooks/useCollectionData.test.tsx` (319).
- [x] `app/utils/focalLength.ts` (28) — the lens-type filter dimension was removed. Delete `tests/utils/focalLength.test.ts` (105) and `LensType` at [GalleryFilter.ts:13](app/types/GalleryFilter.ts:13). The `focalLength` image *field* stays — it is live in `FullScreenModal` and metadata.
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
zero-reference *on main* — but PR #253 (`0251-collections-panel`, open since 2026-08-15) imported it.
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

### ✅ A9 · Dead config — PR #259

- [x] `eslint.config.mjs` — ignores for nonexistent `Components/**` and `old/**`; the `pages/**` override disabling a rule that is itself commented out.
- [x] `tsconfig.json` / `jest.config.mjs` — excludes for nonexistent `old/tests/**` and `**/__tests__/**`.
- [x] `next.config.js` — the no-op `webpack: config => config` beside the active `turbopack` block.
- [x] `package.json` — unused `eslint-config-next` devDep; name is still `"my-app"`; add the missing `"analyze"` script for the already-wired bundle analyzer.
- [x] `.gitignore` — duplicated entries from two concatenated templates.
- [x] `.cursor/rules/cursor_rules.mdc` — literally titled "Databricks Project Rules". Its frontmatter
      description was already correct for this repo, so this was a heading fix, not a regeneration.
- [ ] `.claude/agents/` — NOT done, and the premise looks wrong: `npm`, `npx`, and `node` all resolve
      on PATH (`/opt/homebrew/bin`). Re-confirmed 2026-08-22 from the review session's shell — same
      result, so the "npm is not on PATH" line in CLAUDE.md may itself be stale. Re-diagnose against
      an actual agent run before editing 7 allowlists.
- [ ] `.claude/worktrees/` still holds the 6 orphaned `agent-*` directories (Mar 16, unregistered —
      re-checked 2026-08-22). Check each for uncommitted work before deleting — that is the only
      reason they were left in place. The `cleanup` worktree was removed by the review session (its
      D6 branch merged, tree clean).
- [ ] `app/(admin)/admin/layoutpreview/` — the untracked screenshot harness for PR #253's
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
      reads "TEMPORARY — screenshot harness for the PR #253 four-panel layout question.

```bash
rm -rf "app/(admin)/admin/layoutpreview"
```

---

## Group B — Test-suite reductions

The suite is 51,446 lines against 37,211 source lines. Hygiene is otherwise excellent: zero skips, zero `.only`, zero snapshots, zero stale TODOs, no tautologies. Every item below is zero coverage loss.

### ☐ B1 · Merge `manageUtils.test.ts`

- [ ] `manageUtils.test.ts` (1,930 lines) tests `collectionEditUtils.ts` under a stale name at a stale route-shaped path. Merge into `tests/components/ContentCollection/edit/collectionEditUtils.test.ts`.
- [ ] Drop its duplicate `handleApiError` suite — a strict subset of `apiUtils.test.ts`'s.
- [ ] Drop the position-permutation padding on one-line delegates.

### ☐ B2 · `rowCombination` characterization dedup

- [ ] `rowCombination.characterization.test.ts:481-714` — the "architecture types" half duplicates `rowCombination.test.ts`'s own describes. Both files kept a copy after an unfinished handoff. Keep the numbered scenario pins; they are still valuable while the layout engine is under active work.
- [ ] `heroAcceptance.test.ts` is a strict subset of the unit file — delete it.

### ☐ B3 · `metadataUtils.test.ts` dedup

- [ ] 1,893 lines (was 2,461 — A3/PR #257 already removed the seven `getDisplay*` delegate suites).
      Still duplicated: `buildAssociationDiff` via Tags (:332) and People (:442), and the
      camera/lens/filmType triplet (:169/:207/:245). Keep one full suite per shared builder plus one
      wiring test per field, or convert to `it.each`. Est −200 to −300, not −500.

### ☐ B4 · `contentLayout.test.ts` merge

- [ ] Two merged generations left duplicate `createHeaderRow` and `processContentForDisplay` describes. Merge them, keeping the stronger assertions.

### ☐ B5 · `useCollectionEdit` fixture consolidation

- [ ] SIX files (PR #267 added `escapeSelection.test.tsx` with the same hand-rolled preamble) each
      open with a 122–169-line preamble hand-rolling `makeCollection`/`makeMetadata` — now defined
      6× each and drifted — that `tests/fixtures/collectionEditFixtures.ts` already exists to
      provide (886 preamble lines total). Consolidate the setup. The describe topics are
      complementary; keep them. C1's lesson is a hard constraint: the shared builders must return
      FRESH objects per call so per-DTO array identities survive — a shared constant re-introduces
      the exact fixture trap C1's tests document.
- [ ] **B5 is bigger than six files.** The separate hand-rolled `GeneralMetadataDTO` literal (eight
      empty arrays) appears in all six `useCollectionEdit.*` tests plus `tests/explore/page.test.tsx`
      — seven sites, and `collectionEditFixtures.ts` does NOT currently export a builder for it
      (`makeState()` returns `CollectionUpdateResponseDTO`, a different type). One `makeMetadata()`
      export covers all of them. Est −350 to −450 net.

### ☐ B6 · Fold in `CollectionContentRenderer` characterization

- [ ] `CollectionContentRenderer.characterization.test.tsx`'s stated purpose (pin behavior before the `getClickEligibility` extraction) is complete. Fold the ~6 unique wiring tests into the main file and delete the rest.

### ☐ B7 · `useClickOutside` spy tests

- [ ] Drop the four listener-attachment-spy tests. They pin an implementation detail; the behavior tests already pin the outcomes.

### ☐ B8 · Fill the required-coverage gaps

The project rule requires tests for these and they have none.

- [x] **First slice — the A7 Escape-path regression test — PR #267.**
      `tests/components/ContentCollection/useCollectionEdit.escapeSelection.test.tsx`, 4 tests,
      test-only. The effect is now at `useCollectionEdit.tsx:432-436` (drifted +1 when C1 landed).
      Verified against two separate mutations, not one: deleting the effect fails the two
      Escape-teardown tests, and dropping its `!isMultiSelectMode` guard fails the multi-select
      preservation test. The reasoning is out of the scratchpad and into the repo.

      **Test-design trap, cost one rewrite.** The multi-select preservation test must open the
      editor through the bottom bar's `edit` cell, NOT through `handleImageClick`. In multi-select
      mode a click only toggles the id and never opens the editor, so `editingContent` stays null,
      `useEscapeKey` (enabled on `!!editingContent`) never attaches, and the effect never re-runs.
      The first draft did exactly that and passed against BOTH mutants — a decoration. Note also
      that `handleBulkEdit` is not on the hook's public API (`:1617` is a deps array, not the
      return), so the bottom bar cell is the only route to it.
- [ ] `lib/api/share.ts` — 217 lines, 9 function exports + 4 type exports, only ever mocked.
      Est +350–500 (calibrated against the sibling API suites: selects 152, personal 282, users 544).
- [ ] `lib/api/messages.ts` — 25 lines. Est +80–150.
- [ ] `lib/storage/collectionStorage.ts` — 286 lines. Est +250–400. **Sequence: write these BEFORE
      E3** — they become E3's characterization safety net.
- [x] `lib/actions/clearCache.ts` — shipped with D2, PR #266. `tests/lib/actions/clearCache.test.ts`.
- [ ] If being thorough: `sharedObserver` (116), `useParallax` (161), `useContentReordering` (198).
      Est +400–600. `collectionToggle` came OFF this list 2026-08-22: `collectionEditUtils.ts:28`
      re-exports `toggleRelation` and `manageUtils.test.ts:1859` tests it — that bullet is a
      retarget when B1 moves the file, not new coverage.

---

## Group C — Bug fixes

### ✅ C1 · HIGH — Unsaved people/gallery-access edits are wiped by any unrelated save — PR #264

[useCollectionEdit.tsx:478](app/components/ContentCollection/edit/useCollectionEdit.tsx:478) and [:531](app/components/ContentCollection/edit/useCollectionEdit.tsx:531). Both re-seed effects depend on array identities (`collection.people`, `collection.galleryPassword`, `collection.recipientEmails`) that change on every DTO refresh. Every save path — inline title commit, cover pick, reorder save, upload, metadata save — calls `setCurrentState(fresh DTO)`, which delivers new array identities, fires the effects, and discards staged-but-unsaved People and gallery-access edits.

Repro: add a person without saving, then commit an inline title edit. The person selection reverts.

- [x] The two effects collapsed into one, gated by its own `seededStagedFieldsIdRef` /
      `seededStagedFieldsFromAdminRef` pair — the same discipline the update buffer uses. It needs
      its OWN refs, not the buffer's: the buffer effect mutates `seededCollectionIdRef` mid-run, so
      a shared ref would let whichever effect ran first starve the other.
- [x] The gate clears when `enabled` flips false, which preserves the old re-seed-on-entering-edit-mode
      behavior. Without that, staged people/gallery would have survived an edit-mode exit while the
      update buffer is explicitly discarded by `resetToBrowse` — an asymmetry the fix has no business
      introducing.
- [x] Three regression tests in `useCollectionEdit.buffer.test.tsx`, alongside the buffer's own
      background-refresh test.

**Test trap — a regression test here passes against the buggy code unless you avoid it.** The bare
`makeCollection()` fixture never sets `people`/`recipientEmails`, so the old deps compared
`undefined === undefined`, the effect never re-fired, and the bug did not reproduce. Each DTO must
carry its own arrays — `mockImplementation(async () => makeResponse({ people: [], recipientEmails: [] }))`,
not `mockResolvedValue`, which hands back one object with one array identity. The first draft of
these tests passed against the unfixed source; only stashing the fix and re-running caught it.

Related: `useCollectionEdit.handlers.test.tsx` carries a comment instructing authors to drive
password/email through the setters "so the seed effect can't wipe them" — the bug was being worked
around in tests rather than fixed. That comment is now stale but harmless; the workaround it
describes still passes.

### ✅ C2 · About portrait declares the wrong aspect ratio — PR #281

- [x] [About.tsx:15](app/components/About/About.tsx:15) declared `width={1000} height={500}` (2:1)
      for `public/_DSC0145.jpg`, which is 3893x2920 (4:3). Both halves re-read rather than trusted:
      the file's dimensions come from its JPEG SOF segment, and the CSS is
      `.profileImage { width: 100%; height: auto }`, which is what makes the declared pair the
      aspect-ratio box the browser reserves before the file arrives. So a 2:1 declaration reserved
      the wrong shape and reflowed to 4:3 on every open. Fixed to `height={750}`
      — 1000 x 2920/3893 = 750.06. About is live code, rendered at `MenuDropdown.tsx:334`.
- [x] **Scope note: the item said ±1 and the source change is ±1, but a test went in on top.** This
      bug is invisible in code review and in a screenshot — it exists only in the moment between
      reserving the box and loading the file, which is exactly the silent class the D3 and C4 lessons
      are about. `tests/components/About/aboutImageDimensions.test.tsx` renders About and compares
      the declared ratio against the real file, reading the dimensions out of the JPEG rather than
      hardcoding them, so re-cropping or replacing the image fails the test instead of quietly
      restoring the shift. Confirmed red against `height={500}` (delta 0.667), and confirmed red a
      second time after `eslint --fix` reordered the imports and `tsc` forced a change to the file.
- [x] Not browser-verified, and it would not have proved anything: `:3000` was not running, and the
      defect is a pre-load reflow that a static screenshot cannot show. The declared attribute is the
      whole fix, and the test asserts it against the file.

### ☐ C3 · `SelectsContext.toggle` runs side effects inside a state updater

- [ ] [SelectsContext.tsx:54](app/components/ContentCollection/SelectsContext.tsx:54) and `:68` call `onChange?.([...next])` inside `setSelectedIds(prev => …)`. Updaters must be pure — StrictMode double-invokes them, so dev `onChange` fires twice per toggle. Compute `next` outside, then call the setter and the callback sequentially.

### ✅ C4 · Cache tags that never connect — PR #279

**Shipped: four dead revalidate targets, not five.** The fifth, `collection-home`, was not dead —
the audit below was wrong about it, and the fix was to keep it and write down why. The
`collections-location-${slug}` half was left alone as scoped; the report on it is at the end.

- [x] FOUR dead tags removed from `revalidateMetadataCache` ([collectionEditUtils.ts:220](app/components/ContentCollection/edit/collectionEditUtils.ts:220)).
      `content-people` was never registered, and A2 (PR #256) deleted the fetches that registered
      `content-cameras`, `content-lenses`, `content-film-metadata`. Deleting them is safe, not just
      tidy: the only surviving metadata read is `getMetadata` ([collections.ts:329](app/lib/api/collections.ts:329))
      and it is `cache: 'no-store'`, so no cached data sits behind those tags waiting to go stale.
      `content-tags`, `content-locations` and `search-images` stay.
- [x] **`collection-home` is NOT a dead tag. The table below was wrong.** `HOME_SLUG = 'home'` and
      `app/page.tsx` renders `CollectionPageWrapper slug="home"`, so `getCollectionBySlug('home')`
      registers `collection-${slug}` as exactly the string `collection-home`
      ([collections.ts:108](app/lib/api/collections.ts:108)). The audit missed it because it grepped
      for literal tag strings and this registration is a template — the precise blind spot E11 was
      filed to describe. Two independent checks before keeping it, both run rather than reasoned:
      deleting the revalidate call turns two existing cases in `manageUtils.test.ts` red, and both
      `app/page.tsx` and `app/[slug]/page.tsx` carry `force-dynamic` as an explicitly TEMPORARY
      workaround with a written restore plan (`revalidate = 3600; dynamic = 'error'`), so removing
      the tag would have planted a bug that only appears when that `@todo` is cleared. A docblock on
      `revalidateCollectionCache` now says this, because the next person to grep for the literal will
      reach the same wrong conclusion.
- [x] Regression tests added for `revalidateMetadataCache`, which had none — nothing asserted its
      POST body at all. Both new cases were confirmed red against the unfixed source before the fix
      went in.
- [ ] `collections-location-${slug}` — untouched, as scoped. Report below.

**Corrected register-vs-revalidate audit.** Re-grepped 2026-08-25. The line numbers in the previous
version of this table were off by one on every `revalidateMetadataCache` row.

| Tag | Registered | Revalidated | State |
| --- | --- | --- | --- |
| `collections-index` | `collections.ts:84` | `collectionEditUtils.ts:209` | connected |
| `collection-${slug}` | `collections.ts:108` | `collectionEditUtils.ts:208` | connected |
| `collection-home` | `collections.ts:108`, as `collection-${slug}` with slug = `home` | `collectionEditUtils.ts:210` | **connected — was misfiled as dead** |
| `content-tags` | `content.ts:42` | `collectionEditUtils.ts:227` | connected |
| `content-locations` | `content.ts:58` | `collectionEditUtils.ts:230` | connected |
| `search-images` | `content.ts:104` | `collectionEditUtils.ts:233` | connected |
| `collections-location-${slug}` | `collections.ts:151` | — | **orphan registration — left alone** |
| `content-people` | — | — | **deleted by this MR** |
| `content-cameras` | — | — | **deleted by this MR** |
| `content-lenses` | — | — | **deleted by this MR** |
| `content-film-metadata` | — | — | **deleted by this MR** |

**Report — what wiring up `collections-location-${slug}` would actually take.**

The guardrail written when C4 was set up said the collection's locations and its previous locations
are "neither plumbed through today". That is not right, and the real obstacle is elsewhere. Both
halves of the data are already in `useCollectionEdit`: `collection.locations` gives the pre-edit set
(there is already an `originalLocations` memo built from it), and the save path already reads
`response.collection.locations` into a `resolvedLocations` local. `CollectionModel.locations` is a
`LocationModel[]` and `LocationModel` carries `slug`. What actually blocks it:

1. **The helper's signature, and its call sites.** `revalidateCollectionCache(slug)` takes one
   collection slug and is called from eight places, including `CreateCollectionForm` and
   `useCaptureDateSelection`, which have no location data in scope. Either the helper grows a second
   argument most callers cannot fill, or location revalidation moves out of it and into the save
   paths in `useCollectionEdit` that do know about locations. The second is the honest shape, and it
   means location freshness depends on which code path did the edit — which needs saying out loud.
2. **New locations have no slug until the backend assigns one.** A location added during an edit is
   `{ id: 0, name, slug: '' }` on the frontend. Revalidating from `updateData` would build
   `collections-location-` and hit nothing. It has to come from the post-save
   `response.collection.locations`, so it can only run after the save resolves, not optimistically
   alongside the other three.
3. **Removals need the union, not the new set.** Moving a collection from Seattle to Portland has to
   revalidate both location pages. Revalidating only the post-save locations leaves the Seattle page
   listing a collection that is no longer there for up to `TIMING.revalidateCache`. So the call needs
   previous ∪ next, which is why the pre-edit set matters and why this is not a one-liner.
4. **Unverified: whether the backend keys that endpoint off collection locations alone.**
   `/collections/location/{slug}` is a backend query. Whether an IMAGE-level location change can move
   a collection in or out of that list is not knowable from this repo, and it decides whether image
   edits need to trigger this too. Worth one question to the backend before building.

Sizing: small if it lands as a `revalidateLocationCaches(previous, next)` helper called from the
`useCollectionEdit` save paths — roughly +30 source, +60 test. Do it after E11, not before: E11
decides how a template-keyed tag gets registered and revalidated through one place, and this is the
second template-keyed tag that would use it.

### ☐ C5 · Assorted LOW bugs

- [ ] `sizes` can render `"…, NaNpx"`: `imageProps` is built at [CollectionContentRenderer.tsx:646](app/components/Content/CollectionContentRenderer.tsx:646)
      (the `sizes` template is `:651`) before the NaN guard at `:678`. Move `resolveValidDimensions`
      (`:692`) above it and use `validWidth`. (Refs re-verified 2026-08-22 — A5 reshaped this
      function; the old `:661` now lands inside an unrelated ternary.)
- [ ] Upload and text-block success can fabricate a truncated DTO via `{...prev!}` when the initial admin fetch failed ([useCollectionEdit.tsx:891](app/components/ContentCollection/edit/useCollectionEdit.tsx:891), `:934` — drifted +18 when C1 landed). Use `response` outright.
- [ ] `useFullScreenImage.tsx:293-307` — the cached-image fallback queries `img[src="<raw CloudFront URL>"]`, but Next's optimizer rewrites `src`, so it never matches in production. React 18 `onLoad` covers cached images. Delete the ~20-line fallback — but spare the GIF-marking branch at the top of the same `checkImageLoaded` effect.
- [ ] `fullscreen-image.module.scss` uses `width > 768px` in 12 blocks against the repo-wide `width >= 768px` (~84 uses). At exactly 768px the wrapper is mobile while image sizing is desktop. Normalize to `>=`.
- [ ] Log hygiene only — the token-leak premise was DISPROVEN 2026-08-22. The proxy 502 path
      ([route.ts:140](app/api/proxy/[...path]/route.ts:140)) does log the raw error object, but no
      token can reach it on current main: share/invite tokens ride the URL *path*, the handler never
      logs `targetUrl`, and a Node fetch-failure `cause` chain carries only `host:port` (verified
      empirically on the repo's Node at inspect depth 6). Logs go to platform server logs only.
      Harden to `error.message`/`error.code` as defense-in-depth against future error shapes — a
      nice-to-have, not a security item. Do NOT promote to Group D.

### ☐ C6 · Password cover strip is missing on the public collection-card path

Split out of E1, which deliberately left it alone to stay a provable no-op.

- [ ] `collectionToContentModel` ([CollectionPage.tsx](app/components/ContentCollection/CollectionPage.tsx))
      strips `coverImage` for `isPasswordProtected` collections unless `showProtectedCovers` is set.
      `convertCollectionContentToParallax` ([contentLayout.ts](app/utils/contentLayout.ts)) does NOT
      — it passes `col.coverImage` through unconditionally. Both feed the same parallax card.
**VERIFIED 2026-08-23: this is a BACKEND item, not a frontend one.** `ContentCollectionModel` has
zero `isPasswordProtected` — grep the interface in `app/types/Content.ts` and confirm. Only
`CollectionModel` carries it ([Collection.ts:241](app/types/Collection.ts:241)). So the public card
path has nothing to key the strip on; it is not an oversight that can be fixed in the frontend. That
is almost certainly WHY the strip only ever existed on `collectionToContentModel`.

- [ ] Backend first: decide whether `ContentModels.Collection` should serialize
      `isPasswordProtected`. The strip is defense-in-depth against a stale cache re-exposing a cover
      the backend (BE-H5) already strips, so the real question is whether the content-block path can
      carry a stale protected cover at all. If the backend already guarantees it cannot, close this
      as won't-fix and record that here.
- [ ] Only if the field lands: post-E1 the frontend side is a two-line change — pass a stripped
      `coverImage` into `buildParallaxCard`, exactly as `collectionToContentModel` now does.
- [ ] Do NOT open this as a frontend MR before the field exists. There is nothing to write.

---

## Group D — Security

**Fixed and confirmed, do not re-investigate:** X-Forwarded-For / spoofed-IP handling in the BFF proxy. `forwardHeaders` strips all client-controllable IP headers and re-derives `X-Real-IP` from trusted hops, pinned by `tests/api/proxy/route.test.ts:441-463`. Also verified clean: no `dangerouslySetInnerHTML` or `eval`, no secret leakage into `NEXT_PUBLIC_*`, no committed `.env`, no open redirects, CSRF origin-allowlist on writes, SSRF-safe URL building, size caps with post-buffer recheck, correct `Set-Cookie` forwarding, careful share/invite/gallery-gate flows.

### ✅ D1 · HIGH — `POST /api/revalidate` is unauthenticated in production — PR #265

- [x] [route.ts:13](app/api/revalidate/route.ts:13) had no session check, no Origin allowlist, and the `proxy.ts` matcher does not cover `/api/*`. Anyone could loop `{path: "/"}` or `{tags: [...]}` and permanently bust the ISR cache. Its only callers are the admin edit UI ([collectionEditUtils.ts:200](app/components/ContentCollection/edit/collectionEditUtils.ts:200)), which already sits behind the cookie and sends it on same-origin fetches — so the gate broke nothing, as predicted.
- [x] Gated on `!isLocalEnvironment() && !req.cookies.get('ezac_session')?.value`, before the body is
      parsed. Uses `isLocalEnvironment()` rather than a bare `NODE_ENV` check, matching `proxy.ts`
      and the standing "localhost admin needs no login" rule.
- [x] New `tests/api/revalidate/route.test.ts` — the route had zero tests. Covers the gate and,
      while there, the previously untested payload handling (empty-body 400, `tags` iteration
      skipping non-strings, tag+path together, unparseable-JSON 500). The four rejection tests were
      confirmed to fail against the ungated handler.

**Scope note: this closed the anonymous path, not CSRF.** (CSRF closed by D6, below.) The finding also named the missing Origin
allowlist, which is NOT fixed here — an authenticated admin visiting a hostile page can still be made
to fire the route. Deliberately deferred rather than bundled: the proxy's allowlist is a local
`const` inside its `handle()` function, not a shared helper, so reusing it means refactoring the
security-critical file whose tests are the pinned CSRF/IP-spoofing suite. Split out as D6 below.

### ✅ D2 · `clearCacheAction` allows anonymous global route-cache purge — PR #266

Last of the anonymous-cache-purge family.

- [x] [clearCache.ts:16](app/lib/actions/clearCache.ts:16) is a `'use client'`-imported Server Action, so its action ID ships in the public bundle and anyone can invoke it with a `Next-Action` POST. The backend leg fails for anonymous callers, but `revalidatePath('/', 'layout')` runs in its own `try` regardless — anonymous cache purge in a loop is a cost and DoS amplifier. Resolve `meServer()` at the top and return early unless `principal?.isAdmin || isLocalEnvironment()`.
- [x] Ship a test with it. `lib/actions/clearCache.ts` is also a B8 coverage gap, so D2 retires that
      bullet.

Shipped as a non-exported `isAuthorizedToClearCache()` helper rather than an inline block — a
`'use server'` module makes every export a callable action, so the gate must stay unexported. Local
returns authorized WITHOUT resolving a principal (matches `requireAdmin()`; the point of the
localhost rule is that it must not even ask). `meServer()` throws on any non-401 error, so the
resolve is wrapped and fails closed. Rejection returns `{ ok: false }` rather than `redirect()`ing:
`MenuDropdown` already branches on the result, and a redirect from a Server Action would navigate a
signed-out user mid-click.

**The +15 estimate was off by 14×** (actual +212, of which ~155 is the new test file). Same lesson as
A4/A6: the estimates count source only. A "+15" security item that also retires a coverage-gap
bullet is a full sitting, not a one-liner.

Four gate tests confirmed red against the ungated source; the other five pass both ways because they
pin pre-existing behavior. The assertion carrying the security claim on every rejection path is
`expect(mockRevalidatePath).not.toHaveBeenCalled()` — the purge is the leg that runs regardless of
the backend call.

**Do NOT unify D2's check with D1's.** They are deliberately asymmetric and the difference is the
point: a route handler can only observe a session, so `/api/revalidate` checks `ezac_session`
presence; a Server Action can resolve one, so this checks `principal?.isAdmin`. Collapsing them into
a shared helper either weakens D2 to a presence check or demands something of D1 it cannot do. If a
future MR wants them unified, it needs to say what it is doing about that asymmetry first.

### ✅ D3 · No security headers anywhere — PR #274

- [x] `next.config.js` has no `headers()` block, the middleware adds none, and no Amplify `customHttp.yml` is committed. No CSP, no `X-Frame-Options` (login and admin pages are frameable), no `nosniff`, no site-wide `Referrer-Policy`, no HSTS. Add a `headers()` block and start CSP report-only.
- [x] ~~Verify the Amplify console is not already injecting these~~ **ANSWERED 2026-08-23:
      `curl -sI https://www.zacedens.com/` — Amplify injects nothing.** No CSP, no XFO, no nosniff,
      no Referrer-Policy, no HSTS in the production response. The item is unblocked and startable.
- [x] Also found in that response: `x-powered-by: Next.js` is emitted — add `poweredByHeader: false`
      to the same MR.

**Shipped: five headers plus `poweredByHeader: false`, and the CSP is report-only.** Verified
against a running server, not just the config object — `curl -sI http://localhost:3002/` on the
"Verify Preview" config returns all five and no `x-powered-by`. Unit tests: 13 new in
`tests/next.config.test.ts`; full suite 4,079/4,079 across 224 files.

**The CSP was checked against a live browser, including the case the page could not exercise.**
Three page loads produced zero violation reports, but the Spring backend was down, so every route
hit its error boundary and no image or video ever rendered — `img-src` and `media-src` were
untested by that. Closed it by injecting a CloudFront `<img>` and `<video>` into the loaded page and
re-reading the console: no violation. The control is what makes that result mean something — an
`<img>` from `example.org` injected alongside them did report, with the browser naming the exact
directive and confirming "The policy is report-only". So the reporting path works and CloudFront
passes both directives.

**A clean report-only console is not evidence the policy can be enforced yet.** What was measured is
three routes in dev, all of them error boundaries, plus two injected elements. Before flipping the
header name to `Content-Security-Policy`, walk the real pages with the backend up — collection
pages, `/explore`, `/about`, a client gallery, the admin surfaces — and confirm the console stays
quiet. The dev build also relaxes three directives (`'unsafe-eval'`, `ws:`/`wss:`,
`http://localhost:*`) that production does not get, so dev cannot prove production is quiet either.
Tests pin that those three never reach a production build.

**`'unsafe-inline'` is in both `script-src` and `style-src` and cannot simply be deleted.** Next
inlines the hydration payload and its style tags. Removing it needs per-request nonces, which means
the CSP has to move out of `next.config.js` and into `proxy.ts` — a separate item, not a tightening
of this one.

**HSTS ships without `includeSubDomains` and without `preload`, deliberately.** `preload` is
removed by petitioning the browser vendors' list, so it is close to one-way, and neither was in the
item. `max-age=63072000` is the reversible part. A test pins the absence so a later session does not
add them without meaning to.

**One consolidation rode along, and it is the reason to look at this file when D4's host changes.**
`CLOUDFRONT_HOST` is now a single const feeding both `images.remotePatterns` and the CSP's
`img-src`/`media-src`. Two literals for the same host drift; a test asserts the optimizer allowlist
and the CSP still name the same one.

**Not included: `Permissions-Policy`.** It is free and would fit, but the item named five headers
and this board's repeated lesson is that un-asked additions are how MRs grow. Worth a one-line
follow-up item.

### ✅ D4 · Image optimizer accepts any `*.cloudfront.net` host — PR #272

- [x] [next.config.js:28](next.config.js:28) (`hostname: '*.cloudfront.net'` — the `:26` ref was the
      pattern's opening line) — third parties can serve their images through this site's optimizer:
      CloudFront is multi-tenant, so any `dXXXX.cloudfront.net` matches the wildcard, at this site's
      Lambda cost and 24h optimizer cache. **Fully specified 2026-08-23:** the production
      distribution is `d2qp8h5pbkohe6.cloudfront.net` (read off the live homepage). Replace the
      wildcard with it. The only other `*.cloudfront.net` literal in the repo is the fake
      `d123.cloudfront.net` fixture in `CollectionsPanel.test.tsx` (on main since #253 merged) —
      unaffected, it never hits the optimizer. Cheapest item on the board; adversarial review
      confirmed the abuse vector is real.

_The board row and this heading were marked ✅ in the same commit as the one-line fix, so the record
reaches `main` only when the MR does. If you are reading this on the `0272-` branch, it is still
open._

**Shipped exactly as specified — one line, `±1` estimated and `±1` actual.** Both board claims held
under re-verification: the `d123.cloudfront.net` fixture is unaffected (`CollectionsPanel.test.tsx`
passes unchanged, 12/12) and those two are still the only `cloudfront` literals in the repo.

**The homepage was not enough evidence, and checking more was cheap.** The 08-23 capture read the
distribution off `/` only, which cannot rule out a second distribution serving some other surface —
and a `remotePatterns` pin that misses one silently breaks every image on that page in production.
Swept `/` plus six collection pages (`/adventure`, `/event`, `/film`, `/gorge-climbing`,
`/hidden-lake`, `/travel`): all seven serve images exclusively from `d2qp8h5pbkohe6.cloudfront.net`,
79 references on the homepage alone. `/explore` and `/about` return no CloudFront host in their
initial HTML at all. For any future item that pins an external host, sweep more than one page —
`curl -s <url> | grep -oE '[a-z0-9-]+\.cloudfront\.net' | sort -u` per page is seconds of work.

**First estimate on the board to hold, and it holds for a legible reason.** The recalibration note
says the estimates count source only and were wrong 4-for-4 (A4, A6, D2, D6). D4 is the control case:
grepping its symbols found ZERO test call sites, so there was no test coupling to be blind to. The
existing "grep its symbols for test call sites before sizing a sitting" rule is what predicts which
way an estimate will miss — a zero-hit grep means the source-only number is trustworthy.

**Not in this MR: `poweredByHeader: false`.** It is D3's bullet, and D3 also edits `next.config.js`,
so bundling was the tempting move. Held to one MR per item. Re-confirmed against production today:
`curl -sI https://www.zacedens.com/` still emits `x-powered-by: Next.js` and still injects no CSP,
XFO, nosniff, Referrer-Policy or HSTS — D3's premises are current as of 2026-08-23.

### ✅ D5 · Proxy path reject + `/cdn` matcher removal — PR #273

- [x] The catch-all proxy forwards non-`/api` backend paths: `/api/proxy/actuator/env` reaches the backend carrying `X-Internal-Secret` (re-verified 2026-08-22 — `route.ts:14-19` builds the URL with no `api/` requirement; the only pre-forward reject is the prod admin/edit check). Reject when the resolved path does not start with `api/`, with new reject tests proven red against the unpatched handler (~+40–60 test in the pinned suite, add-only per the D6 precedent).
- [x] `/cdn` is dead in FOUR places, not two (list completed 2026-08-22): the `proxy.ts` docblock
      line `:15`, the branch `:27-33`, the matcher comment `:85`, and the matcher entry `:94` — plus
      `tests/proxy.test.ts` (docblock line 6 and the whole "/cdn rule (regression)" describe,
      `:79-93`), which dies with the branch. No such route exists. (`proxy.ts` IS the live Next 16
      middleware; the old "unwired" note in the docs was stale and has been corrected.)

**All six refs re-verified 2026-08-23, zero drift** — `proxy.ts:15`, `:27-33` (the branch is exactly
those seven lines), `:85`, `:94` (`'/cdn/:path*'`), `tests/proxy.test.ts:6` and the `:79-93`
describe, and `route.ts:14-19` (`buildTargetUrl`, still no `api/` requirement). Note the matcher
comment at `:85` reads "plus the legacy `/catalog` and `/cdn` rules" — it needs editing down to
`/catalog`, not deleting.

**Guardrail — remove the four `/cdn` references and NOTHING else from the matcher array.** That
array is the list deciding which routes get the session gate, so an entry removed or added by hand
silently un-gates or login-walls a route, and the failure is invisible until production. This has
already happened once here: `proxy.ts:86-89` carries two warnings written by the cleanup, `/explore`
is deliberately public and "0203 F4 did and login-walled it in prod", and `/all-collections` is
public because the backend permission-scopes the list. The `/cdn` removal puts a fresh session
inside exactly that array with a tidying mindset. If any other entry looks wrong, report what
changing it would do and let the user decide — do not edit it in the same MR.

**Second guardrail: the path reject is `api/` only.** `buildTargetUrl` joins whatever segments
arrive, so the reject is one prefix check. Do not also start allowlisting specific backend paths,
rewriting the URL builder, or folding the new reject into the existing prod admin/edit check — that
check answers a different question (who is asking) than the reject (what are they asking for), and
merging them makes both harder to test. New reject tests are add-only in the pinned suite, per the
D6 precedent: `tests/api/proxy/route.test.ts` must pass unchanged.

**Shipped, both parts. The pinned suite passed unchanged (23/23) and the file now runs 35/35;
`tests/proxy.test.ts` runs 46/46; full suite 4,080/4,080 across 223 files.** Source came in at
`+23/−16` and tests at `+141/−8`, against a `~+30 net` estimate — close, because the test coupling
was already listed in the item.

**The `api/` prefix check does not work as a raw-string check, and that is the one thing to carry
forward from this MR.** `fetch` resolves dot segments while it parses the URL, so
`buildTargetUrl(['api', '..', 'actuator', 'env'])` produces
`http://backend.test/api/../actuator/env` and requests `http://backend.test/actuator/env`. A
`resolvedPath.startsWith('api/')` check passes that string and forwards it, carrying
`X-Internal-Secret`. The reject would have shipped as decoration. Verified before writing the fix:
`new URL('http://h/api/../actuator/env').pathname` is `/actuator/env`.

**So the check runs on the normalized path** — `isProxyableApiPath` in
[route.ts:23](app/api/proxy/[...path]/route.ts:23) resolves the path against a sentinel origin and
asks whether the result starts with `/api/`. This is still one check, and it is still the item's
prefix check; the only change is which string it reads. It does not allowlist backend paths, does
not rewrite `buildTargetUrl`, and does not touch the prod admin/edit check — the three things the
guardrail named. Reading the guardrail as "must be `startsWith` on the raw join" would have meant
shipping a bypassable gate.

Normalizing catches three spellings a string check misses, and correctly declines to over-block a
fourth. `api/%2e%2e/actuator` → `/actuator`, blocked. `api\..\actuator` → `/actuator`, blocked
(backslashes are path separators for special schemes). `api/a/../../actuator` → `/actuator`,
blocked. But `api/..%2Fread` stays `/api/..%2Fread`, so it forwards — an encoded slash is a literal
segment, not a climb. All four are pinned as tests.

**Matcher: only `'/cdn/:path*'` was removed. Nothing else was touched.** The other entries, and what
changing them would do:

| Entry | What removing it would do |
| --- | --- |
| `/admin`, `/admin/:path*` | Un-gates the admin hub and `/admin/users/[id]` at the edge. Prod would serve them to anonymous traffic until the (admin) layout's `requireAdmin()` ran. Not a full breach — the backend is authoritative — but it moves the reject later and leaks the pages' existence. |
| `/collection/manage`, `/collection/manage/:path*` | Same, for the manage surface. |
| `/comments`, `/comments/:path*` | Same, for `/comments`. |
| `/metadata`, `/metadata/:path*` | Same, for `/metadata`. |
| `/all-images`, `/all-images/:path*` | Same, for `/all-images`. |
| `/catalog/:slug*` | Kills the legacy `/catalog/:slug` → `/collection/:slug` 308. Old links and any indexed catalog URLs would 404 instead of redirecting. The redirect is already behind `COLLECTION_REDIRECTS_ENABLED`, so it is dormant unless that flag is set. |

And the additions that look tempting and are not: `/explore` and `/all-collections` are deliberately
absent (both public — see the warnings in the matcher comment), and `/` is absent on purpose so the
hottest route pays no middleware cost. `/cdn` was safe to remove only because `app/` has no `cdn`
directory at all — checked, not assumed — so the rule redirected prod traffic that could only ever
404. The four-place list in the item was exact; there were no other `/cdn` references in the repo
(the remaining `cdn` grep hits are all `https://cdn.example.com` test fixtures).

**Reject status is 404, not 403.** The proxy has no such route to offer. 404 also tells a prober
nothing about whether the backend has an actuator.

### ✅ D6 · Shared Origin allowlist — CSRF on `/api/revalidate` — PR #270

Split out of D1, which gated the route on session presence but left it CSRF-open. Next because the
D1/D2 context is still warm and it is the last open piece of the thread those two started.

_(Moved here 2026-08-23. This section had been filed under the "Group E — Consolidations" heading,
so a session navigating to Group D could not find it.)_

- [x] The Origin allowlist lives as a local `const ALLOWED_ORIGINS` inside `handle()` in
      [route.ts:98](app/api/proxy/[...path]/route.ts:98) (line ref re-verified 2026-08-23),
      together with the RFC1918/mDNS dev-LAN regex. Extract both into a shared helper and apply it
      to `/api/revalidate`'s POST.
- [x] `tests/api/proxy/route.test.ts`'s "write-method origin allowance" describe
      ([:185](tests/api/proxy/route.test.ts:185), re-verified 2026-08-23) is the pinned suite for
      this logic — it must pass unchanged after the extraction. That is the whole safety argument
      for the refactor; do not touch those assertions to make the extraction fit.
- [x] Note `revalidateCollectionCache` sends `Content-Type: application/json`, which forces a CORS
      preflight — but an attacker can send `text/plain` and `req.json()` still parses it, so the
      preflight is not a defense.

**Guardrail — do NOT also gate `/api/revalidate` on `principal.isAdmin` while you are in there.**
That is the tempting adjacent change, because D2 does exactly that and it looks like the obvious
tidy-up. It is a different decision with a real cost, and D2's section below spells it out: three
extra `/api/auth/me` round trips per collection save, and a loud failure turned quiet. D6 is the
Origin check only. If you think the session check should change too, report what it would cost and
let the user decide.

**Second guardrail: do not bundle D5.** It also edits `proxy.ts`. One MR per item.

**Shipped as `app/utils/originAllowlist.ts` — one export, `isAllowedWriteOrigin(origin)`.** Both
the `NEXT_PUBLIC_APP_URL` + dev-ports Set and the RFC1918/mDNS regex moved into it. Three decisions
worth keeping:

- **Env is read on every call, not captured at module load.** The proxy rebuilt its Set per request
  and both route suites flip `NODE_ENV` / `NEXT_PUBLIC_APP_URL` between cases. Hoisting the Set to
  module scope would have passed a first run and then broken as soon as a suite reordered.
- **On `/api/revalidate` the session check runs FIRST, the Origin check second.** An anonymous
  caller still gets 401, not a 403 that would point at the wrong thing. Pinned by a new test.
- **The Origin check applies in every environment, local included.** It does not need a local
  exemption: the allowlist already carries `localhost:3000/3001` and the LAN regex in development,
  so "localhost admin needs no login" survives untouched while local stops being exempt from CSRF.
  There is a test for exactly that — a hostile origin is 403 in development too.

**The safety argument held.** `tests/api/proxy/route.test.ts` passes unchanged, 22/22, assertions
untouched — including all six pinned origin cases. Full suite 222 suites / 3871 tests green.

**Every `/api/revalidate` caller is a browser `fetch()` with a relative URL** (`revalidateCollectionCache`
and `revalidateMetadataCache` in `collectionEditUtils.ts`, grep-verified as the only two). Browsers set
`Origin` on every POST regardless of same-origin, so no caller starts 403ing. There is no server-side
caller — that was the one way this change could have broken production silently.

New `tests/utils/originAllowlist.test.ts` (19 cases) pins the rule itself, including the look-alike
suffix `https://example.com.evil.example`, the 172.16–31 range boundaries, and the http-only and
dev-port-only edges. The six new rejection tests on `/api/revalidate` were confirmed red against the
un-gated handler; the three "allows" cases pass both ways, as they should. Mutating the helper's
`NODE_ENV === 'development'` guard turned three helper tests red, so they bite too.

#### What gating `/api/revalidate` on `principal.isAdmin` would cost — reported, not done

Asked for alongside D6. The recommendation is **don't**, but the call is the user's.

- **Three to four extra `/api/auth/me` round trips per collection save.** `revalidateCollectionCache`
  fires three parallel POSTs (`collection-<slug>`+path, `collections-index`, `collection-home`) and
  `revalidateMetadataCache` fires a fourth. `meServer()` is wrapped in React `cache()`, but that
  dedupes within one request scope — these are four separate HTTP requests, so each pays its own
  Lambda→EC2 call with `cache: 'no-store'`. The cookie check costs zero network.
- **It adds a failure mode the cookie check does not have.** `meServer()` throws on any non-401, so a
  D2-style gate fails closed when the auth backend is slow or down. Combined with the next point,
  an auth blip becomes silently stale pages.
- **The failure is already invisible at the call site.** `fetch()` does not throw on 4xx, and
  `revalidateCollectionCache`'s `catch` only fires on network errors — and only logs when
  `isLocalEnvironment()`. A 403 today produces no console line, no toast, nothing: the admin sees a
  successful save over a cache that never busted. Adding a gate that can 403 for reasons other than
  "you are signed out" makes that silence worse. Fixing the silence is its own item, not part of D6.
- **What it would actually buy is narrow.** After D6, a caller must already hold a real `ezac_session`
  AND come from our own origin. `isAdmin` would additionally stop a signed-in **non-admin** from
  busting the cache via our own site. Per `docs/009-backend-and-vision.md` the client-user surface
  shipped dormant with no client users yet, so that gap is currently unreachable — it becomes real
  when Phase C lands.

**Recommendation: revisit when Phase C ships client users**, and pair it with making the revalidate
failure visible at the call site. Until then the cookie + Origin pair is the better trade.

_Adversarial re-review 2026-08-22: the D1/D2/D6 gates are sound — no high/medium finding. Ordering
(session → Origin → body parse) holds; missing/`null` Origin fails closed; the RFC1918 regex is
anchored; NODE_ENV values other than exactly `development` collapse to the strictest state;
`clearCache.ts` ships exactly one callable action and fails closed. Two of `originAllowlist.test.ts`'s
cases (null/empty origin) are belt-and-suspenders that cannot detect deletion of the `if (!origin)`
guard — harmless, noted for honesty. The one real finding became D8._

### ✅ D7 · Wrong danger token on error text (a11y) — CLOSED by PR #253's merge (2026-08-23)

_(Moved here 2026-08-22 from under the Group E heading — the same misfiling D6 had. Given a board
row at the same time; it had neither.)_

- [x] Both halves rode #253 (fixed there by f994655, merged 79fbca5): `RolesPanel.module.scss:16`
      and `CollectionsPanel.module.scss:116` both read `--color-danger-text` on main now.
      [globals.css:132](app/styles/globals.css:132) documents `--color-danger` as fills-and-borders
      only; `MessagesPanel.module.scss:18` and `UserManagementPanel.module.scss:15` were already
      right — all four panels now agree.
- [ ] Residual, deliberately out of scope: `RolesPanel.module.scss:72` still uses `--color-danger`
      for a button hover (visible design change; needs its own call). Not worth its own MR — fold
      into E10 if it happens.

### ✅ D8 · Normalize `NEXT_PUBLIC_APP_URL` when building the Origin allowlist — PR #276

Found by the adversarial review of D6. `allowedOrigins()`
([originAllowlist.ts:21](app/utils/originAllowlist.ts:21)) puts `process.env.NEXT_PUBLIC_APP_URL`
into the Set verbatim. Browser `Origin` headers are always bare `scheme://host[:port]`, so a
trailing slash or path in the env var (`https://zacedens.com/`) makes every production admin write
403 — silently, because revalidate failures produce no console line (see C5's note and the D6
cost write-up). Fails closed, never open: an availability trap, not a bypass.

- [x] Normalized in a new `configuredAppOrigin()` helper with `new URL(raw).origin`, guarding the
      throw on a malformed value (fail closed). `allowedOrigins()` now calls it instead of reading
      the env var directly.
- [x] Five tests, not two — the extra three are below. Both board-specified cases went red first
      against the unnormalized helper, as required.

**The board's spec had a hole, and guarding only the throw would have opened a bypass.**
`new URL(raw).origin` does not throw on every bad value. A non-special scheme parses fine and
returns the *string* `"null"`: `new URL('data:text/plain,hi').origin === 'null'`, same for `file:`
and any unknown scheme. `"null"` is also exactly what a browser sends as `Origin` from a sandboxed
iframe or an opaque redirect. So a `try/catch` alone would have put `"null"` into the allowlist Set
and admitted those callers — a fail-*open* introduced by the fix meant to prevent a fail-closed
outage. The helper drops it explicitly (`origin === 'null' ? null : origin`) and the docblock says
why, so it does not read as defensive noise. Verified against Node across twelve env-value shapes
before writing the guard, not assumed.

The three tests beyond the board's two: the env value *as written* (`https://example.com/`) is
rejected once normalized away; an env value with a path normalizes to the bare origin; a `"null"`
origin is denied when the env value has an opaque scheme. That last one is the only new test that
passes on the *unfixed* code — it guards against the naive version of this fix, so it is green
before and after by design.

**Both guardrails held.** The incoming `origin` argument is untouched and still compared exactly;
`isAllowedWriteOrigin()`'s docblock now records why the asymmetry with the env var is deliberate.
The two `localhost` literals are untouched — see the D9 report below.

Verification: 24/24 in `tests/utils/originAllowlist.test.ts`, both consuming route suites green
(56/56 across `tests/api/proxy/route.test.ts` and `tests/api/revalidate/route.test.ts`), and the
full suite at 4098/4098 across 224 files. `tsc --noEmit` clean, ESLint and Prettier no-ops on the
two changed source files.

**Ref re-verified 2026-08-23 after D3/D4/D5 landed: zero drift.**
[originAllowlist.ts:21](app/utils/originAllowlist.ts:21) is still
`process.env.NEXT_PUBLIC_APP_URL,` inside `allowedOrigins()` (which starts at `:18`). None of the
three merged MRs touched this file.

**Next because it is the last open Group D item and the smallest thing on the board.** D6 built this
helper, D5 and D3 kept the session inside the same security surface, and it is `±5` source lines.
Finishing it closes Group D entirely except for the D9 decision below.

**Guardrail — normalize the env value only. Do NOT normalize the incoming `origin` argument.**
The tempting symmetry is `new URL(origin).origin` on both sides. That one is a widening, not a
cleanup: browsers always send a bare `scheme://host[:port]`, so the only callers that send anything
else are not browsers, and normalizing their input before an exact-match lookup would make
`https://zacedens.com/anything` compare equal to the allowed origin. The env var is trusted config
and needs normalizing; the `origin` header is attacker-influenced input and must stay an exact
match. Same function, two opposite trust levels.

**Second guardrail — leave the two `localhost` literals alone; that is D9, and it is a decision, not
a cleanup.** They sit three lines below the one you are editing and look obviously redundant. Report
what changing them would do, do not change them in D8's MR.

### ✅ D9 · Redundant `localhost` literals in the Origin allowlist — DELETED, PR #277

Found while setting up D8. `allowedOrigins()`
([originAllowlist.ts:22-23](app/utils/originAllowlist.ts:22)) adds `http://localhost:3000` and
`http://localhost:3001` to the Set when `NODE_ENV === 'development'`. `DEV_LAN_ORIGIN`
([:33](app/utils/originAllowlist.ts:33)) already matches both, and its branch is gated on the same
`NODE_ENV === 'development'`. Verified, not assumed: the regex returns `true` for
`http://localhost:3000` and `http://localhost:3001`. The two literals are redundant today.

**Deleting them is invisible to the test suite, which is the reason to be careful rather than the
reason it is safe.** `tests/utils/originAllowlist.test.ts` asserts localhost is allowed in
development (`:80-81`) and denied outside it (`:57-58`, `:136`). Every one of those still passes
with the literals gone, because the regex covers the same cases. No test would catch it if the
redundancy reasoning were wrong.

**The redundancy is arguably the point.** They are two independent expressions of the same intent.
If a later MR tightened `DEV_LAN_ORIGIN` — dropping bare `localhost` to require an IP, say — the Set
literals are what would keep the dev server working. That makes this defense in depth, not dead
code, and the honest resolutions are "delete and note why in the docblock" or "keep and note why in
the docblock". Either way the next reader needs the reasoning written down, because the redundancy
reads as an oversight.

**Report from D8's session (2026-08-23) — asked for, and the literals were left alone as
instructed.** Re-verified the redundancy independently rather than trusting the board's claim, by
running `DEV_LAN_ORIGIN` against the two strings: both `http://localhost:3000` and
`http://localhost:3001` return `true`.

What deleting them would do, precisely: **nothing observable today.** The Set is consulted first and
the regex second, but the literals are added only under `NODE_ENV === 'development'` and the regex
branch is gated on the same condition — so every request the literals answer, the regex also
answers, under identical gating. Outside development neither path is reachable. All 24 tests in
`tests/utils/originAllowlist.test.ts` and all 56 in the two route suites would still pass with the
literals removed, which is the same blind spot the entry above already names.

One asymmetry the board had not recorded, found while checking: the two are **not** equivalent in
strictness. `DEV_LAN_ORIGIN` carries the `/i` flag, so it matches `http://LOCALHOST:3000`; the Set
does an exact, case-sensitive match and does not. The literals are therefore a strict subset of the
regex, not an overlapping alternative. That cuts against the "two independent expressions of the
same intent" framing above — as written they are the *narrower* of the two, and would only become
load-bearing if a future MR tightened the regex specifically. Worth weighing in the decision; not a
decision in itself.

**Decision: delete.** Reasoning is in the `allowedOrigins()` docblock, as required, in enough
detail that a reader who thinks the literals were dropped by accident is answered on the spot.

Three things carried it. The literals were verified redundant with `DEV_LAN_ORIGIN` under identical
`NODE_ENV` gating. They were the *narrower* of the two, so "independent expressions of the same
intent" was never accurate. And the failure that keeping them would cover is loud, not silent — a
tightened regex breaks the dev server on the next admin write and turns tests red in the same
second. Defense in depth is worth its cost against failures that pass unnoticed; this one cannot.
Kept as a footnote in the docblock: had the tightening ever been deliberate, the literals would have
silently defeated it.

**Correction to this entry's own premise — the claim below that no test would catch a wrong
redundancy argument is false, and it was checked rather than reasoned about.** Deleting the literals
and then simulating the exact future the "keep" case feared (dropping bare `localhost` from
`DEV_LAN_ORIGIN`) turns `allows both local dev ports` (`:80-81`) red immediately. Those cases pass
either way only because the reasoning happens to be right — that is the test confirming the premise,
not a blind spot. The entry read the passing tests as absence of coverage when they were the
coverage.

Two mixed-case cases were still added (`http://LOCALHOST:3000`), one in each `NODE_ENV`. They pin
which mechanism answers for the dev ports: a Set lookup is case-sensitive and the regex is not, so
they can only pass while the regex is the thing responding. Before this MR nothing in the file could
tell the two mechanisms apart.

- [x] Decided delete; reasoning recorded in the `allowedOrigins()` docblock so this is not
      re-litigated a third time.

---

## Group E — Consolidations

Behavior-preserving refactors. Lean on the existing tests.

### ✅ E1 · Parallax-card builder consolidation — PR #269

- [x] The builder exists in four places. Plan executed as written:
      `docs/superpowers/plans/2026-08-04-parallax-card-builder-consolidation.md`. New
      `app/utils/parallaxCard.ts` owns `buildParallaxCard`; the four call sites are thin adapters.

**The board's framing was wrong and the plan's was right.** E1 is NOT the fix for the password-strip
divergence — the plan explicitly puts that out of scope so the refactor stays a provable no-op. The
divergence is real and is now **C6**, split out. E1 delivered consolidation, not the correctness fix.

**The plan's divergence table was incomplete in three ways**, all found by writing the
characterization tests first:

1. `convertCollectionContentToParallax` reads dimensions via `pickImageDimensions`
   (`imageWidth ?? width`), so it also accepts the layout `width`/`height` fields; the other three
   read `imageWidth`/`imageHeight` only. `Content` carries `width`/`height`, so this is reachable in
   principle. Preserved as the opt-in `allowLayoutDimensions`, NOT silently unified.
2. It also carries `rating`, `createdAt` and `updatedAt`, none of which the table listed.
3. `collectionToContentModel`'s visibility mapping has an `undefined -> true` special case the table
   flattened to `visibility === LISTED`.

**Estimate was −120 source; actual is +98 source, +659 test.** The builder's docblocks carry the
option rationale that used to be nowhere, and the plan mandates a characterization suite. A
consolidation that documents its own divergences does not shrink the tree — do not expect E-group
items with written plans to come in negative.

- [x] `clampParallaxDimensions` + `extractCollectionDimensions` moved into `parallaxCard.ts` to break
      the import cycle (`contentLayout` would otherwise import the builder that imports it back).
      `contentLayout` re-exports `clampParallaxDimensions`, so `adminHubContent.ts` and
      `contentLayout.test.ts`'s existing describe are untouched.
- [x] `collectionToContentModel` was module-private; exported so it could be characterized directly
      rather than through a rendered page.
- [x] 26 characterization tests (committed BEFORE any migration) + 22 builder unit tests. The
      characterization file passes unmodified through the migration apart from one fixture line
      adding a required `slug` to a tag — no assertion changed.

**Not done: the plan's Task 6 browser spot-check.** :3000 serves the primary checkout, which another
agent held on `0251-collections-panel`; a second dev server would have meant editing their
`launch.json`. Characterization-unmodified is the substitute evidence, but no DOM diff against `main`
was run. Worth doing before merge if the parallax grid matters.

### ☐ E2 · `core.ts` fetch skeleton + `clientFetch`

- [ ] `throwFromResponse` exists six times — `auth.ts`, `personal.ts`, `selects.ts`, `share.ts`, plus inline in `collections.ts` and `users.ts`. Keep one copy in `core.ts`.
- [ ] The surrounding raw client-fetch wrapper repeats in ~14 functions; a single `clientFetch(url, init)` collapses another ~60 lines.
- [ ] Three copies of the fetch skeleton inside `core.ts` — `fetchAdminGetApi` is `fetchReadApi` with a different channel constant. Fold `'read'` into `fetchBase`.
- [ ] Drop the pointless `Content-Type` on GETs, the double-`throwApiError` try/catch shape, and the identity `ENDPOINT_TYPE_TO_CHANNEL` map.

### ☐ E3 · `collectionStorage.ts` generics

- [ ] `update`/`updateFull` are literal aliases of `set`/`setFull`. The `get`/`set`/`clear` pairs differ only in key prefix and type — one generic pair halves the file (~100 lines).
- [ ] The `cached.slug !== slug` checks can never fire. Remove them.

### ☐ E4 · Entity-diff generics + one IMAGE guard

- [ ] `isImageContent` ([contentFilter.ts:68](app/utils/contentFilter.ts:68)) vs `isContentImage`
      ([contentTypeGuards.ts:23](app/utils/contentTypeGuards.ts:23)) — two exported IMAGE guards, and
      no import cycle justifies the copy. Consolidate on `isContentImage`. (The other half of this
      item — `checkImageVisibility` — already landed via A5/PR #260; the −150 estimate predates that
      and is now −80. Keep thin public wrappers on the twins so both existing suites pass unchanged.)
- [ ] `tagUtils.ts` and `locationUtils.ts` are line-for-line twins — generic `convertToModels<T>` / `buildEntityDiff<T>`.

### ☐ E5 · Filter/sort/date duplication

- [ ] `FILTER_PARAM_KEYS` in `useFilterUrlState.ts` hand-mirrors `serializeFilterToParams`; the "MUST mirror" comment is a drift warning. Export the key list from `contentFilter.ts`.
- [x] ~~`sortContent.ts` / `sortByDate.ts` mirror `contentFilter`'s merge/sort pair~~ — STRUCK
      2026-08-22: false. `sortContent.ts` *imports* `isDateable`/`mergeDateSortedImages` from
      `contentFilter` and `sortByDate` from `sortByDate.ts`; its own docblock documents the
      placement as an import-cycle necessity. There is no duplicate.
- [ ] `collectionDates.ts`'s `MONTH_NAMES` duplicates `formatDateRange.ts`'s `MONTHS_LONG` (`:34`).
      (`formatDateRange` has no `MONTH_NAMES`; its short list is distinct. Corrected 2026-08-22.)
- [ ] `createMetadataTextBlock` / `createTextOnlyHeaderRow` are near-identical literals.
- [x] ~~`rowCombination` re-derives AR formulas that `affineHeight.ts` already exports~~ — STRUCK
      2026-08-22: already done. `rowCombination.ts:37` imports them, its `:1342` comment says both
      are adapters onto the shared core, and `affineHeight.mirror.test.ts` pins it.
- [ ] The `ImageBlock` alias is declared twice.
- [ ] `searchImages` and `getAllImages` should share a `buildImageFilterParams` for the query string (~30 lines). The endpoints stay separate by design.
- [ ] `contentLayout.ts`'s `ProcessContentOptions.displayMode` is accepted and advertised but silently ignored — honor it or remove it.

### ☐ E6 · `useCollectionEdit` refresh helpers

- [ ] Three copies of "refetch → adopt → storage-write → revalidate → clear selection" (`handleMetadataSaveSuccess`, `handleGifSaveSuccess`, `handleDeleteSuccess`) → one `refreshAfterContentMutation`.
- [ ] `handleUpdate` and `enterReorder` duplicate the save-adoption block → `adoptSaveResponse`.
- [ ] `handleBulkRemove` duplicates `useMetadataSubmit.handleRemoveFromCollection` → shared builder.
- [ ] Sequencing (added 2026-08-22): E6 is a slice of F1's decomposition — do E6 first or fold it
      into F1, not both independently. And `useCollectionEdit.handlers.test.tsx` asserts on
      `collectionStorage.update`/`updateFull` CALL ORDER — a consolidated helper that reorders those
      calls moves assertions (budget ±100 test churn across the six suites).

### ☐ E7 · `useFilteredContentBlocks` hook

- [ ] `CollectionPageClient` and `EditModeLayer` both run the full filter → process → sort pipeline, so it runs twice per filter change while editing. Extract one hook.

### ☐ E8 · Renderer + `MenuDropdown` dedup

- [ ] `CollectionContentRenderer` — `ReorderOverlay` JSX is duplicated verbatim in the GIF and image branches; the two placeholder blocks share construction; `isSelected` is recomputed inline twice; seven no-op `key={contentId}` on root returns.
- [ ] `MenuDropdown` — eight copies of the menu-item block → one config array (~60 lines). The `pageType` union has two values that decide nothing.

### ☐ E10 · Admin panel dedup — found reviewing PR #253, 2026-08-22 — UNBLOCKED (#253 merged)

All four panels are on main as of 79fbca5, so every bullet below is now startable — the former
branch-only refs (CollectionsPanel) are main refs. Verified byte-identical by `diff` (re-hashed
2026-08-22), not by eye. COLD.

- [ ] `.loadError` is byte-identical in `CollectionsPanel`, `RolesPanel` and `UserManagementPanel`;
      `.error` is byte-identical in `CollectionsPanel` and `RolesPanel`. The 6-line retry block
      (`<div role="alert">` + `<p>` + Retry `<Button>`) is identical in all four .tsx files.
      Extract `<LoadError message onRetry />` into `app/components/ui/StatusText/`. It completes a
      family that already cross-references itself — `EmptyState.tsx:15-22` explicitly says failed
      reads get their own branch, and the failed-read branch is the only member never written.
- [ ] `.viewAll` in `CollectionsPanel.module.scss:14-23` is byte-identical to
      `MessagesPanel.module.scss:4-13`, hover block included. The JSX is the same five lines too.
- [ ] **Do NOT extract a `<PanelBody>` owning the whole load/error/empty ladder.** Checked: it needs
      ~10 props, three of them pure escape hatches — `footer` for the Messages/Roles delete errors,
      and `visible` for the Roles/Users `view.mode === 'list'` gate. `LoadingText` must stay mounted
      OUTSIDE that gate ([LoadingText.tsx:24-28](app/components/ui/StatusText/LoadingText.tsx:24)),
      so the component would have to render one child unconditionally and the rest conditionally —
      an invariant its name does not imply and nothing would enforce.
- [ ] The four `ContentPanelModel` literals in `buildAdminHubContent` are four copies of the same
      14-line object differing in `panelType`, `title`, and `id`/`orderIndex` that are just
      `1001+n`/`100+n`. A `PANEL_ORDER.map(...)` replaces ~60 lines with ~20.
      **`width: 600` and `height: 1100` are NOT dead** — perturbing them to 137/999 moved 15 hub
      tests. They feed the layout solve. Do not "clean them up".
- [ ] `newestFirst` in `CollectionsPanel.tsx:58` is the same algorithm as `sortGroup`'s BLOG branch
      at [CollectionListSelector.tsx:63](app/components/CollectionListSelector/CollectionListSelector.tsx:63),
      over the same `CollectionListModel` from the same `getMetadata()`. Only difference is
      `compareNames` vs a raw `localeCompare` (a real base-sensitivity difference in name
      tie-breaks, not just style — pick one deliberately).
- [ ] Added by the 2026-08-22 review of #253: the `TALLER_THAN_OPEN_TODAY` skip lists
      (`page.collapseStates.test.ts:395`, `page.collapsedLayout.test.ts:331`) are one-directional on
      their own — each excepted state is held bidirectional only by a companion exact pin, and
      nothing asserts the two name the same states. Convert to the whole-list compare pattern the
      width sweep uses, or add that assertion.

### ☐ E9 · Download icon/hook, auth-card SCSS, `.srOnly`

- [ ] `ClientGalleryDownload` and `FullScreenDownloadButton` share an identical SVG and an identical download-navigate/reset-timer pattern → `DownloadIcon` plus a small hook.
- [ ] The login and invite `page.module.scss` files are byte-identical (29 lines) → one shared auth-card style.
- [ ] `.srOnly` is copy-pasted in 6 modules (was 7 — one copy fell to A8's sweep). This is documented policy, but an SCSS `%placeholder` honors the no-global-utility rule and collapses ~50 lines. ⛔ Needs the G2-style USER decision, not a violation report. (Bullets 1–2 of this item are COLD and don't wait on it.)

---

### ✅ E11 · Make cache-tag register/revalidate drift detectable — PR #280

**Shipped as a test and nothing else: `tests/lib/api/cacheTagDrift.test.ts`, ~205 lines, zero source
change.** It reads both halves out of the source at run time — the `next: { tags: [...] }` options in
`lib/api`, and the tags named inside the two revalidate helpers — and asserts the sets agree, with an
allowlist for tags that are one-sided on purpose.

- [x] What a constants module cannot do, established before designing anything: three of the six
      registered tags are template strings, so no compile-time check can pair a registration with a
      revalidation. The goal is detectable drift, not impossible drift, and the shipped test says so
      in its own docblock.
- [x] **The answer to "does the constants module earn anything on top of the test": no.** It was the
      instinct this item was filed to slow down, and slowing it down was right. A constants module
      moves the six tag strings into one file, but the template tags still get assembled at the call
      site, so the two halves can still drift and the same test is still the only thing that notices.
      It would add a layer of indirection and leave the actual check exactly where it is. If a
      seventh tag ever arrives that is a plain literal used in three places, revisit — until then the
      module is motion, not progress.
- [x] Template tags handled as the central case rather than an exception. `isRegistered` matches a
      literal against template prefixes, which is what pairs `collection-home` with
      `collection-${slug}`. There is a dedicated test pinning that pair.
- [x] Fails loudly. Every assertion is a set-difference rendered as a list of sentences, so the
      failure output names the tag, the file, what is wrong, and both ways out. No bare
      `expect(a).toEqual(b)` diffs.
- [x] **Guarded against passing vacuously.** A text scanner that quietly stops matching would make
      every other assertion trivially true, which is worse than no test at all. One case asserts the
      scan floors — at least six registrations, at least four revalidations, at least one template.

**All five assertions were confirmed red before this shipped.** A drift test that has never been
seen to fail is a decoration, and this one is aimed squarely at a silent failure mode.

| Simulated drift | Assertion that caught it |
| --- | --- |
| Registration regex stops matching | vacuity floors |
| `content-people` re-added to `revalidateMetadataCache` | revalidated-but-unregistered |
| Allowlist entry for `collections-location-${slug}` deleted | registered-but-unrevalidated |
| Allowlist entry added for a tag that is actually connected | stale-allowlist |
| Template matching replaced with literal comparison | template pairing, plus a false orphan report |

That last row is the one worth keeping. With template matching removed, the test reports
`collection-home` as revalidating nothing and advises deleting it — reproducing C4's exact false
positive, in a check whose whole purpose is preventing it. A drift test built on literal comparison
would have been confidently wrong, which is why the pairing has its own test.

**Known limits, stated rather than papered over.**

- It is a text scan, so it is coupled to how the source is written. Splitting a `next: {}` option
  across lines in a shape the regex misses breaks the scan — the vacuity floors turn that into a
  loud failure rather than a silent pass, which is the trade being made.
- It only reads the two revalidate helpers and `lib/api`. A tag registered or revalidated somewhere
  new is invisible to it. `/api/revalidate` takes its tags from the request body and cannot be
  scanned; `clearCacheAction` uses `revalidatePath` and has no tags at all.
- Prefix matching means a registered `collection-${slug}` covers any revalidated tag starting with
  `collection-`. A genuinely wrong tag like `collection-typo-here` would pass. This is the failure
  mode C4's guardrail describes for `collections-location-${slug}`, and no static check can catch
  it — the slug is a runtime value.

---

## Group F — Structural

Bigger, optional, sequenced last. Do each individually and verify on :3000.

### ☐ F1 · Decompose `useCollectionEdit.tsx` (1,748 lines — C1 added the seed guard)

- [ ] After the A- and E-group work (~−150 lines), split along the pattern the file already established (`useContentReordering`, `useCoverImageSelection`, …): `useAdminCollectionState`, `useCollectionUpdateForm`, `useCollectionPeople` + `useGalleryAccess`, `useCollectionRelations`, `useContentOps`, `useManageBar`. The section boundaries verified 2026-08-22: state `:311–421`, update form `:438–792`, people+gallery `:471–851`, content ops `:852–1206`, relations `:1208–1392`, manage bar `:1393–1451`. Keep the existing `UseCollectionEditResult` facade so the SIX test suites (`test`, `buffer`, `handlers`, `bulkRemove`, `escapeSelection`, `delete`) plus `collectionEditFixtures.ts`'s ~70-member result builder do not churn. No file over ~450 lines.
- [ ] This also dissolves `EditModeLayer`'s FOUR `exhaustive-deps` suppressions (`:131`, `:201`, `:208`, `:215` — was "three").

### ☐ F2 · `RendererContext` for the BoxRenderer tree

- [ ] Twenty render-constant props are copied ~10 times across `BoxRenderer`, `Component`, and `ContentBlockWithFullScreen` (count re-verified 2026-08-22; "five times" understated it). A context provided once by `Component` reduces `BoxRenderer` to `tree`/`sizes`/`isMobile`/`priority` and removes ~100 lines of plumbing — `priority` STAYS a prop, it is per-row (`priority={rowIndex <= priorityRowIndex}`, Component.tsx:284), not render-constant. Completes the context migration the codebase already chose for `SelectStar`/`SaveHeart`.

### ☐ F3 · File moves and renames

- [ ] `contactApi.ts` → `lib/api/` (fold into the tracked Wave B ApiError item).
- [ ] `CollectionPageWrapper.tsx` out of `app/lib/components/` — it is the only component under `lib`.
- [ ] `fullscreen-image.module.scss` → `FullScreenModal.module.scss`, which leaves `app/styles/` holding only `globals.css`.
- [ ] `getUserPage` from the one-function `user.ts` into `personal.ts`, killing the `user.ts` vs `users.ts` naming trap.
- [ ] Invite functions from `users.ts` → `auth.ts`.
- [ ] `ReorderMove` type → `app/types/Content.ts`; the public tree currently imports it from the admin edit directory.
- [ ] Rename the lowercase `auth/` and `messages/` component directories.
- [ ] Fold the `AdminPanel/` fossil (now only contexts) into `ListPanel/`.

### ⛔ F4 · `TaxonomyPage` ← `LocationPageClient` — USER DECISION

- [ ] Tag pages are location pages minus filters. Consolidating deletes `TaxonomyPage` and gives tag pages filters for free. Candidate, not a defect.
- [ ] Re-scoped 2026-08-22: the delta is bigger than "minus filters". Both render the byte-identical
      `ContentBlockWithFullScreen` call under the same frame, but LocationPage also carries
      `LocationCollections`, a cover on the header, and `FollowsProvider` seeding — and TaxonomyPage
      is a 32-line SERVER page, so consolidation converts tag pages to a client page. Product call
      for the user: should tag pages gain filters, the collections strip, and follow seeding? Not
      startable until answered.

### ☐ F5 · `FullScreenModal` link + resolver cleanup

- [ ] Hand-rolled `<a>` + `router.push` → `Link`, which also removes `router` from props.
- [ ] `fullScreenModalUtils` resolvers: drop the `isGif` param that mirrors the internal guard.
- [ ] Fix `hideImage`'s vestigial event param in both type signatures.

---

## Group G — Decisions and docs

### ☐ G1 · Docs corrections

The book is wrong in five places.

- [ ] 0204 impersonation removal, 0211 passkey fixes, and 0246 admin-panel-collapse all say "pending" — all are merged.
- [ ] 007 still lists "Dependabot's 7 frontend vulns" — PR #254 cleared all 27.
- [ ] 002 says `thumbnailUrl` is never read — the GIF poster shipped in three places.
- [ ] 006's dead-code list drifted: `getAllCollectionsAdmin` is now live (RoleDetailView) and the logger placeholder line is gone. The error-tracking item itself stands.
- [ ] `previous-work.md`'s newest recorded PR is **#235** (recounted 2026-08-22, worse than the
      "stops before #243" this line used to claim): it is missing #236–#252 AND the cleanup wave's
      #254–#270 — ~27 merged PRs — which violates the book's own archive rule. All five other doc
      errors above re-verified still current 2026-08-22.

### ☐ G2 · Inline-comment rule — DECIDED 2026-08-22: keep and enforce

The review recommended relaxing the rule; the user overruled it. The standard: no why-comments inline. The why belongs in the docblock of the function it explains. If a function's docblock would get too big because there is too much going on in the function, split the function — do not comment inline. CLAUDE.md now carries this wording. Do not propose relaxing the rule again.

- [x] **Commit the CLAUDE.md wording — PR #268.** Landed on its own, as instructed. The rule now
      covers plain function bodies (not just component bodies) and closes the "but this is
      why-context" exception explicitly. This is the standard G2a's ESLint rule has to enforce.

Inventory at decision time: 15 JSX `{/* */}` comments + 504 `//` lines in 226 blocks across 56 files (AST sweep of comments inside function/component bodies; module-scope headers and `eslint-`/`@ts-` directives excluded). Line refs drift as A/E/F MRs land — regenerate the sweep before each migration MR.

**⛔ Scope call found 2026-08-22: that inventory was a `.tsx`-only sweep.** Re-run today: `.tsx` =
506 lines / 228 blocks / 55 files (barely moved — useCollectionEdit 18→19 via C1, MenuDropdown 6→7).
But `.ts` files under `app/` add **416 lines / 174 blocks / 35 files** the inventory never counted —
`app/**` total 922 / 402 / 90. The decided standard (#268: "plain function bodies") covers `.ts`
too; the inventory said otherwise. USER decides: does G2b's migration (and the `error` flip) cover
`.ts` util/lib files, roughly doubling it? If yes, ten more heavy files join G2c's ride-along list:
`metadataUtils.ts` (38 blocks), `rowCombination.ts` (15), `contentLayout.ts` (15), `contentFilter.ts`
(13), the proxy `route.ts` (10), `userSpaceData.ts` (10), `useMetadataState.ts` (9), `useParallax.ts`
(8), `core.ts` (7), `rowStructureAlgorithm.ts` (6). (Exclude or delete the untracked
`layoutpreview/page.tsx` harness before regenerating any baseline — it contributes 3 comment lines.)

- [ ] **G2a · Enforcement first.** ESLint: (1) `no-restricted-syntax` with selector `JSXExpressionContainer > JSXEmptyExpression` bans `{/* */}` in JSX; (2) a small local flat-config rule reports `//` and `/* */` comments whose range falls inside a function body under `app/**` (allow `eslint-`, `@ts-`, `prettier-` directives; docblocks above declarations untouched). Land as `warn` immediately; flip to `error` when G2b merges.
      **Feasibility verified empirically 2026-08-22** on the repo's ESLint 9.36 + typescript-eslint
      8.29: the selector flags `{/* */}` (and bare `{}` — acceptable bonus) and not real
      expressions; a commented-out `no-restricted-syntax` stub already sits at
      `eslint.config.mjs:78-84`; the local rule is ~50–60 lines inline in flat config, no new deps.
      COLD — startable today.
- [ ] **G2b · Mechanical migration — light files (~45 files with 1–5 blocks).** Hoist each comment into the docblock of the function it explains. A comment explaining a mid-function statement with no declaration to attach to is the split signal: extract a named helper/hook so the docblock has a home.
- [ ] **G2c · Heavy files ride their refactors — do NOT migrate standalone.** Their comment volume is itself the too-big-function evidence, and the split gives every extracted function a docblock home: `useFullScreenImage.tsx` (~86 lines — needs its own decomposition; pair with F5), `CollectionPageClient.tsx` (24 blocks → E7), `useCollectionEdit.tsx` (19 → F1; was 18, C1 added one), `CollectionContentRenderer.tsx` (16 + 4 JSX → E8/F2), `EditModeLayer.tsx` (13 → F1), `CollectionPageWrapper.tsx` (9), `ClientGalleryDownload.tsx` (8 → E9), `CameraSettingsSection.tsx` (7), `MenuDropdown.tsx` (7 → E8; was 6), `UserManagementPanel.tsx` (5), `Component.tsx` (5 → F2). Plus the ten `.ts` heavies listed under G2b if the user rules `.ts` in scope.

### ⛔ G3 · `/user/selects` — delete or rebuild — USER DECISION

- [ ] `app/user/selects/page.tsx` (65 lines) is an orphan page: it renders raw IDs and links to `/?collection=`, which nothing reads (re-verified 2026-08-22: no reader of a `collection` search param exists anywhere). Either delete it — Selects live in the gallery star flow — or rebuild it properly.
- [ ] Status wording reconciled 2026-08-22: A1 is COMPLETE as shipped — the `/user/selects` deletion
      was pulled OUT of A1 (see A1's closing note). Deciding G3 performs that final deletion (or its
      rebuild); it does not reopen A1.

---

## What to build next (product roadmap, not cleanup)

Kept here because the cleanup sequencing has to make room for it.

**User-facing, in priority order:**

1. Backend `GET /content/images/search` plus the `/search` route (004/009) — the keystone blocker; the frontend plan is already written.
2. Backend `blocks_per_page` fix → restore ISR on the home page (002). Every visitor pays a live Spring fetch on the hottest page today.
3. The now-unblocked 002 perf tail (items 2, 4, 5, 7, 9) — the "after the refactor wave" condition has been met.
4. Client-gallery BCrypt (003) — plaintext gallery passwords, real users on the other end.
5. Email/SES go-live (009) — invite links are clipboard-only until this ships; gates client onboarding.
6. Passkey enrollment-state UI (009) — FE and BE fixes are merged; needs the backend credentials list/remove endpoint.

**Admin and internal:** staging collection (008), `/user` ↔ `/admin/users/[id]` layout unification (008, unblocked by 0204), 004 stragglers (the Breadcrumb drop is A1, chip-click verification, A3 Spot-1), CloudFlare Phase 2 (007).

**Debt:** E1 first (correctness risk), then the error-tracking decision (Sentry vs CloudWatch), F1, property-based layout tests, the 001 CSS sweeps, and G1.

## Session log

One line per `/next` run. Three consecutive entries ending in the same `Next:` means that item is
being avoided, not scheduled — make it real work or drop it from the board.

- 2026-08-22 — merged A5 (#260), A6 (#261), A7b (#262), A8 (#263) and synced main; the incoming
  prompt claimed #262/#263 were still open, they were not. Shipped C1 (#264) and D1 (#265), both
  merged and deployed via Amplify. Filed D6 (Origin allowlist, split out of D1). Hoisted the
  prove-the-test-fails rule into "How to use this doc" after it caught two would-be-worthless tests.
  Next: D2, then B8's first slice.
- 2026-08-22 (2) — shipped D2 (#266, merged) and B8's first slice (#267, merged). Reported on
  unifying D1/D2: the doc's reason ("a route handler cannot resolve a session") is WRONG —
  `meServer()` works in a route handler. Corrected in D2's section below; the real argument is 3
  extra auth round trips per collection save and turning a loud failure quiet.
  Next: G2's CLAUDE.md commit, then E1.
- 2026-08-22 (3) — `0251-collections-panel` (PR #253) is a SEPARATE agent's branch. Cleanup work
  moved to a worktree at `.claude/worktrees/cleanup` so the primary checkout is never disturbed;
  per the global rule that is the sanctioned two-branches-at-once case. `node_modules` cloned with
  `cp -Rc`. Shipped G2's CLAUDE.md wording (#268) and E1 (#269). Split C6 out of E1 — the board
  called E1 a correctness fix, but the plan scopes it as a pure refactor, and the password-strip
  divergence is a separate item that may need a backend field first.
  Next: C6's decision (check whether it is a backend item), or D6 / D3-D5 to finish Group D.
  _(That "Next" named two items and a range, which is not a next. Resolved in the entry below:
  C6 is backend-blocked, so D6 is next. One item per entry from here on.)_
- 2026-08-23 — reconciled: #266, #267, #268, #269 all MERGED (the previous entry left them
  unverified). Local `main` was 7 behind. Answered C6 and it is **backend-blocked** —
  `ContentCollectionModel` carries no `isPasswordProtected`, so the public card path has nothing to
  strip on; marked ⛔ so nobody opens an empty frontend MR. Moved the D6 section out from under the
  Group E heading, where it was unfindable. Re-verified D6's two line refs.
  Next: D6.
- 2026-08-22 — shipped D6 (PR #270). Origin allowlist extracted to `app/utils/originAllowlist.ts`
  and applied to `/api/revalidate`'s POST; the pinned proxy suite passed unchanged, 22/22, which was
  the whole safety argument for the extraction. Held both guardrails: no `principal.isAdmin` change
  (cost reported in the D6 section instead — the short version is three to four extra `/api/auth/me`
  round trips per save to close a gap that is unreachable until Phase C ships client users), and D5
  not bundled even though it edits the same file. Estimate ±60 vs actual +75 src / +230 test — the
  same "estimates count source only" lesson as A4/A6/D2, now four for four.
  Next: D5.
- 2026-08-22 — brought PR #253 (`0251-collections-panel`, open and untouched since 08-15) current
  with main. Clean merge, one compile break from A4's `formatDisplayDateRange` deletion, fixed at
  `3242531`. 220 suites / 4143 tests green; hub fixtures needed no re-derivation. The PR is still
  blocked on the same unanswered design question it opened with — whether four tall panels belong
  on the admin hub. Not a cleanup item; it needs a decision, not a sitting.
- 2026-08-23 — PR #270 (D6) merged. Wrote `2026-08-22-frontend-cleanup-HANDOFF.md` next to this
  file for a review-only session on a different model, and mirrored its durable parts into MemPalace
  (`mempalace_user_search(query="frontend cleanup spike review")`) because this directory is
  gitignored and a handoff that dies with the machine is not a handoff. The handoff's findings that
  belong here: **E10 and D7 have sections but no board row**, and **D7 is filed under the Group E
  heading** — the exact unfindability bug this log recorded fixing for D6 on 08-23, recurring. Also
  **A1 is ✅ on the board while G3 says it blocks A1's last item**; unreconciled. Corrected C5's
  proxy-log ref, which D6 drifted from :153 to :140.
  Next: D5 — but D4 is ±3 lines and closes a live abuse vector, so consider taking it first.
  _(The two entries above this one were appended later with 08-22 dates from a late-night session;
  the log was reordered causally on 2026-08-23 and a stray blank line removed.)_
- 2026-08-22/23 — full-board review session (7 parallel read-only agents; no MRs opened). Merged
  main into #253's branch (clean; 223 suites / 4,066 tests green) and pushed. Verdicts: the D1/D2/D6
  gates are SOUND under adversarial review (one new trivial item filed, D8); ZERO regressions from
  A5/A6/C1/E1/D2 reached main; PR #253 is technically merge-ready, awaiting only the four-panel
  decision. 27 refs checked (4 drifted, 1 gone) — corrected in place. Estimates recalibrated;
  every open item stamped COLD or ⛔ on the board. D3 and D4 UNBLOCKED against production
  (no headers injected; distribution `d2qp8h5pbkohe6.cloudfront.net`). C5's token-leak bullet
  DISPROVEN and reframed. D7 moved under Group D and shrank to "rides #253"; E10 marked AWAITS #253.
  E5 lost two bullets (one false, one already done). Board rows added for D7/D8/E10. Removed the
  cleanup worktree (D6 branch merged, tree clean). Blocked set: C6 backend; D7/E10 await #253;
  E9-srOnly, F4, G2b scope, G3 are user decisions; G2c rides its refactors. Everything else is COLD.
  Next: D4.
- 2026-08-23 — **PR #253 MERGED (79fbca5).** D7 closed outright (both token fixes rode the branch);
  E10 unblocked — all four panels are on main. Primary checkout back on `main`; the worktree era is
  over, cleanup MRs branch off main in the primary checkout directly. The user accepted the review's
  recommendations wholesale. Renamed this file `2026-summer-refactor.md` as the standing per-session
  tracker (pointer stub left at the old date-stamped path; MemPalace drawers updated to the new
  name). The `layoutpreview/` screenshot harness is now purposeless — delete on sight. Blocked set
  is down to: C6 backend; E9-srOnly, F4, G2b scope, G3 user decisions; G2c rides its refactors.
  Next: D4.
- 2026-08-23 — shipped D4 (PR #272, open). **D4 had been the `Next:` of the two entries above this
  one and was about to become a third — the leak the log exists to catch — so it was executed on
  the spot rather than handed off again.** One line, ±1 estimated and ±1 actual. Re-verified the
  distribution against seven production pages instead of the homepage the 08-23 capture used;
  all seven serve `d2qp8h5pbkohe6.cloudfront.net` exclusively. Held the bundling guardrail:
  `poweredByHeader: false` stayed with D3 even though D3 edits the same file. Reconciled first:
  zero PRs open, everything through #271 merged, local `main` was 2 behind — and because #271's
  `.gitignore` negation had not been pulled yet, this file read as untracked and `git check-ignore`
  called it ignored. Recorded that trap in the header note. Verified all six of D5's `file:line`
  refs, zero drift, and wrote D5's two guardrails into its section. Filed the still-present
  `layoutpreview/` harness as a real A9 bullet — the 08-23 "delete on sight" log line did not stick
  because it was only a log line.
  Next: D5.
- 2026-08-23 — shipped D5 (PR #273). #272 was already merged on arrival, so the sitting was the
  work itself. **The item's own guardrail would have produced a broken fix if followed to the
  letter.** "The reject is one prefix check" reads as `startsWith('api/')` on the raw joined path,
  and that check is walked past by `api/../actuator/env`, because `fetch` normalizes dot segments
  while parsing the URL. Verified the normalization before writing anything, then ran the same one
  check against the normalized path instead of the raw string — still one check, still not
  allowlisting or rewriting the builder. Three more spellings (`%2e%2e`, backslash, multi-hop) are
  caught by that and would not have been by a segment blocklist; `..%2F` correctly still forwards.
  Wrote the eight reject tests first and confirmed all eight red against the unpatched handler
  before touching `route.ts`. `/cdn` removal was exactly the four places listed, and the matcher
  guardrail held — the D5 section now carries a table of what changing each remaining entry would
  do, so the next session with a tidying mindset has the answer without opening the array.
  Next: D3 (security headers + `poweredByHeader: false`), started in the same session as its own MR.
- 2026-08-23 — shipped D3 (PR #274), same session as D5 (#273) but a separate MR off `main`, so the
  two could merge in either order. **They did conflict here, exactly as the entry above predicted,
  and the resolution was to keep both entries — the log is append-only, so a same-session pair
  always collides in this one spot.** #273 landed first; #274 was rebased onto it. Five headers plus
  `poweredByHeader: false`, CSP report-only. Verified against a running server on the "Verify
  Preview" config rather than against the config object; the headers are real. **The console being
  clean was not enough and the gap was closable in one step:** the backend was down, so all three
  routes rendered error boundaries and no image or video ever loaded, leaving `img-src`/`media-src`
  unexercised — injected a CloudFront `<img>` and `<video>` into the live page plus an `example.org`
  control, and only the control reported. Without the control the silence would have proven nothing.
  Folded the D4 CloudFront host into one `CLOUDFRONT_HOST` const shared by `remotePatterns` and the
  CSP, with a test pinning that they agree. Held scope: no `Permissions-Policy`, and
  `'unsafe-inline'` stays until a nonce moves the CSP into `proxy.ts`.
  Next: D8 (the last open Group D item), then Group B or C.
- 2026-08-23 — reconciled: #272, #273 and #274 are all MERGED, zero PRs open, `main` at `840c0b8`.
  The board needed no status corrections for once — D3/D4/D5 were marked ✅ in the same commits as
  their fixes, so the record landed with the code instead of trailing it. Re-verified D8's ref
  (`originAllowlist.ts:21`), zero drift; none of the three MRs touched that file. Filed **D9** from
  a finding made while setting up D8: the two `localhost` literals in `allowedOrigins()` are
  redundant with `DEV_LAN_ORIGIN`, verified by running the regex, and deleting them is invisible to
  all 19 tests in that file — so it is a decision to write down, not a cleanup to do. Hoisted two
  session lessons into "How to use this doc": verifying a negative by observation needs a positive
  control (from D3), and an item that specifies the *mechanism* of a fix can specify a broken one
  (from D5). `app/(admin)/admin/layoutpreview/` is STILL untracked — third session running; it is an
  A9 bullet and nobody has deleted it.
  Next: D8.
- 2026-08-23 — D8 shipped as PR #276; `main` was already at `eb45705` when the session opened (#275
  had merged on its own, so "merge it" was a reconciliation, not a merge). **The board's own spec
  was the bug this time.** "Guard the throw" is not sufficient to normalize `NEXT_PUBLIC_APP_URL`:
  `new URL()` does not throw on a non-special scheme, it returns the literal string `"null"` — which
  is what browsers send from sandboxed iframes — so the prescribed fix would have added `"null"` to
  the allowlist and opened the exact class of hole D6 was built to close. Caught by checking Node's
  actual behavior across twelve env-value shapes before writing the guard. **Second consecutive
  session where an item specified the mechanism of its own fix and specified a broken one** (D5 was
  the first, already hoisted into "How to use this doc"); the lesson is paying rent, so treat a
  board item's prescribed mechanism as a hypothesis to test, never a spec to transcribe. Both
  guardrails held — the incoming `origin` argument untouched, the D9 literals reported on rather
  than changed. That report found something D9 had wrong: the literals are a strict *subset* of
  `DEV_LAN_ORIGIN` (the regex is case-insensitive, the Set match is not), so "two independent
  expressions of the same intent" overstates them. **Do not run Prettier on this file** — it is not
  Prettier-clean on `main`, so `--write` realigns every board table and buries the real diff under
  ~140 lines of churn. Caught and reverted here; the file has always been committed unformatted.
  `app/(admin)/admin/layoutpreview/` is STILL untracked — fourth session running.
  Next: D9, the decision, as its own MR.
- 2026-08-23 — D9 decided and shipped as PR #277, stacked on #276 rather than waiting for it to
  merge, because both edit the same function; retarget to `main` after #276 lands. **Group D is now
  closed.** Decision was delete, and the argument that settled it was not the redundancy — it was
  that the failure "keep" would protect against is loud. A tightened regex breaks the dev server on
  the next request and reddens tests in the same second; defense in depth is priced for silent
  failures. **The D9 entry's own premise turned out to be wrong, and only checking it revealed
  that:** it claimed no test would catch a wrong redundancy argument, but simulating the feared
  future (dropping bare `localhost` from `DEV_LAN_ORIGIN`) turned `allows both local dev ports` red
  at once. The entry mistook tests that pass because the reasoning is right for tests that cannot
  tell. **That is the same failure mode as D5 and D8 one level up** — those two had board items
  prescribing a broken mechanism; this one had a board item asserting a false fact about coverage.
  The rule generalizes: verify a board item's *claims*, not just its refs, before acting on them.
  Refs have been drift-checked every session; claims had not been.
  Next: Group B or C — Group D is done.
- 2026-08-24 — reconciled: **#276 and #277 both MERGED** (01:19Z, seconds apart); #277 was retargeted
  from the D8 branch to `main` before merging, so the stack resolved cleanly. `main` at `237ea03`.
  **Group D is closed — all nine items.** No status corrections needed; D8/D9 were marked in the
  same commits as their fixes.
  Audited C4 before handing it off rather than trusting its bullets, and it **understated itself a
  second time**: it only ever examined `revalidateMetadataCache`, so it missed `collection-home`,
  a dead revalidate target in `revalidateCollectionCache` two lines above. Five dead tags across two
  functions, not four in one. Full register-vs-revalidate table now in the item so the next MR does
  not re-derive it. Also filed **E11** for the tag-registry idea, specifically to keep it OUT of C4.
  The stale-index trap fired once and was caught: MemPalace still indexes a second
  `revalidateMetadataCache` in `manageUtils.ts` that A-group deleted — the palace is a June snapshot,
  so grep before believing it about file existence.
  `app/(admin)/admin/layoutpreview/` — **re-attempted the delete and was denied again**, with bypass
  permissions active. Now confirmed reproducible rather than a D4-session fluke, so it is genuinely
  a user action; A9 updated to say stop trying. Fifth session carrying it.
  Next: C4, dead-revalidate half only.

## Verified fine — do not re-investigate

- `app/[slug]/page.tsx`'s double `getCollectionBySlug` is deduped by Next request memoization; it is not a single-fetch violation. `meServer` is wrapped in React `cache()`.
- The admin hub's count-fetch and lazy panel fetch are different queries by design.
- BFF proxy internals — body buffering, cookie re-emission, size caps, origin allowlist, sanitized IP order — all check out and are test-pinned.
- `rowCombination.ts` has no retired-model survivors; the prominence model is the only model present. `rowStructureAlgorithm` and `affineHeight` are clean.
- No `any` types, no `import React` namespace, no raw `<img>` anywhere in `app/`. No hydration risks found.
- The gap rule is honored across all 92 style files, stylelint exits 0, and all `!important` uses are defensible.
- All 23 `ui/` primitives have live consumers. `useCachedPanelData`'s generation-counter design is sound. The localStorage admin cache is wiped on logout by design.
- Suite-wide: no skipped or focused tests, no snapshots, no stale TODOs.
- The merged cleanup wave through #270 introduced no regression (2026-08-22 spot review of
  A5/A6/C1/E1/D2: overlay gate traced to every render site, adapter defaults diff-checked against
  pre-consolidation source, the C1 seed-effect state machine walked against all three failure
  modes, exactly one callable action in `clearCache.ts`).
- The D1/D2/D6 gates under adversarial attack (2026-08-22): no bypass found. Details in the Group D
  note above D7.
- PR #253's diff, technical review 2026-08-22: merge-ready. The error path is sound (a dead backend
  reaches the alert+Retry branch, never the empty state), a11y checks out, and the only diff-level
  notes were the E10 skip-list bullet and a stale `AdminHubClient` seed docblock (fixed on the
  branch).
