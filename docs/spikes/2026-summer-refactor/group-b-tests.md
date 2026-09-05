# Group B — Test-suite reductions (shipped)

_Archive of shipped work from the [2026 Summer Refactor board](../2026-summer-refactor.md). Nothing here is open work. Sections are verbatim as they were when the item merged._

B1, B2, B3, B4 and B7 merged 2026-08-24 as PRs #290, #288, #287, #289 and #286 — five in one sitting, run as parallel agents in separate worktrees. B5 (#298), B6 (#294 + #297) and B9 (closed not-reproducible) are also archived below. Only B8 is still open on the live board.

## Closed rows

| MR  | Scope                                                | Outcome                                                                                           |
| --- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| B1  | Merge `manageUtils.test.ts`                          | −209 net (est. −450) · #290                                                                       |
| B2  | `rowCombination` characterization dedup              | −229 (est. −250) · #288                                                                           |
| B3  | `metadataUtils.test.ts` dedup                        | −125 (est. −200 to −300) · #287                                                                   |
| B4  | `contentLayout.test.ts` merge                        | −32 (est. −150 to −250) · #289                                                                    |
| B5  | `useCollectionEdit` fixture consolidation            | −145 actual (est. −350) · #298                                                                    |
| B6  | Fold in `CollectionContentRenderer` characterization | 0 actual (est. −150) · #294 + #297 (restore)                                                      |
| B7  | `useClickOutside` spy tests                          | −37 (est. −90) · #286                                                                             |
| B9  | `useCollectionEdit.buffer.test.tsx` parallel flakes  | CLOSED not-reproducible 2026-08-24 — 0 repro in 22 runs / 3 worker configs; NOT fixed; CI untried |

**Read the estimate corrections before sizing anything like these.** Every estimate in this group came in short, in the same direction, because it counted repeated text and assumed repetition meant redundancy: −450 → −209, −250 → −229, −200/−300 → −125, −150/−250 → −32, −90 → −37. B4 is the extreme, off by roughly an order of magnitude, because its "duplicate" describes turned out complementary — the work was merging, not deleting. B5 found the opposite failure: the board counted whole 122–169-line preambles (886 total) when only 460 of those lines were duplicated builders. Two items moved the opposite way from subtraction entirely (B3's test count went up 106 → 107; B7 gained a behavioural test). Four of five duplication claims were also wrong. Both patterns are recorded per item below and hoisted into the live board's "How to use this doc".

---

### ✅ B1 · Merge `manageUtils.test.ts` — PR #290

- [ ] `manageUtils.test.ts` is **1,967 lines** (the board said 1,930; C4 added the
      `revalidateMetadataCache` suite). It tests `collectionEditUtils.ts` under a stale name at a
      stale route-shaped path. Merge into
      `tests/components/ContentCollection/edit/collectionEditUtils.test.ts`, which already exists —
      this is a merge into a live file, not a rename.
- [ ] Drop its duplicate `handleApiError` suite — claimed to be a strict subset of
      `apiUtils.test.ts`'s. **That is a claim, and two of four items this session had a false one.**
      `apiUtils.test.ts:3` and `manageUtils.test.ts:956` both open a `describe('handleApiError')`;
      diff the cases before deleting either, and say in the MR which cases were genuinely duplicated.
- [ ] Drop the position-permutation padding on one-line delegates.
- [ ] **The path itself is the hidden win, and it is worth stating because it cost time three
      separate times this session.** `tests/(admin)/collection/manage/[[...slug]]/manageUtils.test.ts`
      contains `(`, `)`, `[` and `]`, all regex metacharacters. Jest treats a positional argument as
      a regex against the path, so `jest 'tests/(admin)/.../manageUtils.test.ts'` matches **zero
      files and exits 1** — it looks like the suite vanished. Every run has to use a bare substring
      (`jest manageUtils`). Moving the file removes that trap for good.

**Guardrail — leave the two revalidate suites alone.** `describe('revalidateCollectionCache')`
(`:1038`) and `describe('revalidateMetadataCache')` (`:1162`) will look redundant next to
`tests/lib/api/cacheTagDrift.test.ts`, which E11 (#280) just landed and which is entirely about
those same tags. They are not redundant, and deleting them would be the most expensive mistake
available in this MR:

- The drift test **scans source text** and asserts the registered and revalidated tag _sets_ agree.
  It never renders a request. It cannot see a malformed POST body, a wrong header, or a tag posted
  under the wrong key.
- The `manageUtils` suites assert the actual `fetch('/api/revalidate', …)` payload, and one of them
  is the pin on `collection-home` that made C4 safe to ship. C4's whole finding was that
  `collection-home` looks dead to a literal grep; that pin is what turns a future "cleanup" red.

Carry both suites into the merged file unchanged, and report what folding them into the drift test
would actually cost. If the answer turns out to be "nothing, because X", that is a real finding —
but it needs to be argued from what each test asserts, not from the two files being about tags.

**Also out of scope, and deliberately.** Do not merge the six `useCollectionEdit.*.test.tsx` files
while you are here — that is B5, and it carries its own fixture-consolidation risk. Do not move
`collectionEditUtils.ts` itself; that is F3.

**SHIPPED — PR #290 (merged).** `manageUtils.test.ts` deleted; `collectionEditUtils.test.ts` 190 →
1,948 lines. Suite 4,126 → 4,101, and the −25 is fully accounted for: 10 `handleApiError`, 13
position-permutation, 2 exact duplicates. Real diff −209 net against an estimate of −450.

- [x] **The `handleApiError` duplicate claim HELD** — the only one of five duplication claims this
      session that did. Eight of ten cases are byte-identical twins in `apiUtils.test.ts`; the other
      two differ only in a string literal and a property name and hit the same branch. Nothing
      existed only in the manageUtils copy. Both suites independently reach 100% branch coverage of
      `apiUtils.ts`.
- [x] **The better finding: the suite was in the wrong file entirely.** `manageUtils.test.ts`
      imported `handleApiError` from `@/app/utils/apiUtils`, not from `collectionEditUtils` — it was
      testing another module's function. That is why it read as duplicated.
- [x] Both revalidate suites carried over **byte-identical**, verified by diffing each block against
      `git show HEAD:<old path>` after the merge, reorder, eslint and prettier.

**The guardrail's report — folding them into the drift test loses four of six catches.** Six source
mutations, each run against both files. CAUGHT means the suite failed.

| Mutation                                 | `cacheTagDrift` | revalidate suites |
| ---------------------------------------- | --------------- | ----------------- |
| 3 tags in source, only 1 POSTed          | MISSED          | CAUGHT            |
| Metadata tags under key `tag` not `tags` | CAUGHT          | CAUGHT            |
| `POST` → `PUT`                           | MISSED          | CAUGHT            |
| `Content-Type` dropped                   | MISSED          | CAUGHT            |
| `path` dropped, tag correct              | MISSED          | CAUGHT            |
| `collection-home` deleted                | CAUGHT          | CAUGHT            |

Row one settles it. Leave all three tag literals in the source and change only which ones reach
`fetch`: the drift test still reads three tags out of the text and passes, while the runtime suite
fails on `toHaveBeenCalledTimes(3)`. **A source scan cannot distinguish a tag that is posted from a
tag that is merely written down** — which is exactly why the `collection-home` pin has to be a live
request assertion. Method, headers and path never appear in the drift test's regexes at all. The
intersection is one row. Keep both, and stop re-asking.

### ✅ B2 · `rowCombination` characterization dedup — PR #288

- [ ] `rowCombination.characterization.test.ts:481-714` — the "architecture types" half duplicates `rowCombination.test.ts`'s own describes. Both files kept a copy after an unfinished handoff. Keep the numbered scenario pins; they are still valuable while the layout engine is under active work.
- [ ] `heroAcceptance.test.ts` is a strict subset of the unit file — delete it.

**SHIPPED — PR #288 (merged).** Characterization file 714 → 470, `rowCombination.heroAcceptance.test.ts`
deleted (15 lines), unit file 1,734 → 1,764. Net −229. Suite 4,126 → 4,109: 20 cases removed, 3
carried over.

- [x] **Only 15 of the 18 "architecture types" cases were duplicated.** Three existed nowhere else
      and were moved into `rowCombination.test.ts` rather than dropped: the `numericAR` pins (H at
      1.7778, V at 0.5625) — the only `numericAR` assertion in the entire suite; the
      `effectiveRating` V1★→1 case, which the unit file skipped while pinning V3★ and H3★, and which
      mapped to 0 under the retired vertical penalty; and leaf order through `acToBoxTree(hChain(3))`,
      which the unit file's own `hChain() of 3` could not assert because it reused ids (1, 1, 2).
- [x] **Two more were tautological, not duplicated.** `builds H(leaf, V(leaf,leaf))` and
      `builds H(leaf, V(H(a,b), leaf))` hand-construct a tree with `hPair`/`vStack` and then assert
      the tree they just built. No production path under test. Dropped as dead weight.
- [x] The `heroAcceptance` claim held. Its two cases differ from the `emergent full-width hero`
      describe only in a density argument (1.5 vs 1.4), and `isSoloHero(item, rowWidth)`
      ([rowCombination.ts:279](app/utils/rowCombination.ts:279)) takes no density parameter — so the
      difference exercised nothing. Both unit-file counterparts also assert leaf type and item count.
- [x] A line was added to the characterization file's docblock saying type-level coverage belongs in
      `rowCombination.test.ts`, so the second copy does not grow back after the next handoff.

### ✅ B3 · `metadataUtils.test.ts` dedup — PR #287

- [ ] 1,893 lines (was 2,461 — A3/PR #257 already removed the seven `getDisplay*` delegate suites).
      Still duplicated: `buildAssociationDiff` via Tags (:332) and People (:442), and the
      camera/lens/filmType triplet (:169/:207/:245). Keep one full suite per shared builder plus one
      wiring test per field, or convert to `it.each`. Est −200 to −300, not −500.

**SHIPPED — PR #287 (merged).** 1,893 → 1,768 lines (−125). Tests in file 106 → **107**.

- [x] **The "camera/lens/filmType triplet" was wrong, and acting on it would have deleted real
      coverage.** There is no shared equipment builder. `buildCameraDiff` and `buildLensDiff` are two
      separate copy-pasted source functions with identical bodies, so dropping either suite as a
      duplicate would have removed all coverage of a live function. `buildFilmTypeDiff` is unrelated
      logic entirely — string compare, `availableFilmTypes` lookup by name or `filmTypeName`, ISO
      defaulting to 400, plus a fallback when the list is absent. It is a pair plus an unrelated
      third; the filmType suite was left fully intact.
- [x] **The test count went up.** Tags was a strict superset of People, which had no
      "adding and removing simultaneously" case. Parameterizing with `describe.each` over the field
      runs all six cases against both, so People gained coverage it never had. `describe.each` was
      chosen over "one full suite plus a thin wiring test" precisely because it does not have to
      claim camera and lens share an implementation when they do not.
- [x] Every line ref was correct — `:332`, `:442`, `:169`, `:207`, `:245` each opened exactly the
      describe named, and the 1,893 count was right. **First item this session whose refs needed no
      correction**, which is worth recording next to the fact that its central claim was false: the
      refs and the claims fail independently.
- [x] `buildContentPeopleLocationsDiff` left alone. It calls `buildAssociationDiff('people', ...)`
      so it reads as a third copy, but it covers the GIF/MP4 entry point and pins `locations`, which
      routes through a different utility.
- [x] Mutation-proved: flipping `buildLensDiff`'s `remove: true` to `false` fails exactly one test,
      the lens variant. Rewiring `buildAssociationDiff('people', updateState.tags, ...)` fails nine.
- [x] Type trap: `ContentTagModel` ([Metadata.ts](app/types/Metadata.ts)) has `slug` **required**
      while `ContentPersonModel` has none, so a shared `{id, name}` fixture fails `tsc`. The helper
      maps a slug in for tags only.

### ✅ B4 · `contentLayout.test.ts` merge — PR #289

- [ ] Two merged generations left duplicate `createHeaderRow` and `processContentForDisplay` describes. Merge them, keeping the stronger assertions.

**SHIPPED — PR #289 (merged).** 1,587 → 1,555 lines (−32, against an estimate of −150 to −250 — off by
roughly an order of magnitude). Tests in file 111 → 107.

- [x] **The duplicate describes exist but do not overlap.** `createHeaderRow` at `:745` and `:983`,
      `processContentForDisplay` at `:919` and `:1362`. The two `processContentForDisplay` copies
      collide on only three tests: copy A is the sole home of `collectionData` header-row
      integration, copy B the sole home of `mobileChunkSize`, `targetAR` and id-order preservation.
      The two `createHeaderRow` copies collide only inside "Missing cover image cases" — `forceRail`,
      date-metadata pins and mobile rows live only in A; siblings, parents and height-constrained
      sizing only in B. **Collapsing on describe name alone would have dropped whichever copy lost.**
      The estimate was wrong because the work was merging, not deleting.
- [x] Four tests removed: empty input (byte-identical), mixed content types (kept exact id-set
      equality over five types, dropped `length >= 3` over three), mobile positive widths (subsumed
      by the Mobile vs desktop test), cover-with-no-dimensions (kept the direct construction, dropped
      the fixture-mutating one). Both cover-less variants kept — `undefined` and `null` are distinct
      falsy values — and the missing `rowType === 'header'` assertion was added to the copy lacking it.
- [x] `processContentForDisplay — row packing is order-preserving (D2 characterization)` has a
      distinct name, is not a duplicate, and was left alone. So was
      `contentLayoutWidthCostBaseline.test.ts`.
- [x] The copies never contradicted each other. What looked like a contradiction is real asymmetry in
      the source, and both copies encoded it correctly — filed as **C9**.

### ✅ B7 · `useClickOutside` spy tests — PR #286

- [ ] Drop the four listener-attachment-spy tests. They pin an implementation detail; the behavior tests already pin the outcomes.

**SHIPPED — PR #286 (merged).** 21 insertions, 58 deletions, net −37 (est. −90). File 21 → 18 tests;
suite 4,126 → 4,123 (four spy tests out, one behavior test in).

- [x] **Two of the four spy tests asserted on a listener this hook never registers.**
      `useClickOutside` attaches only `mousedown`; Escape is delegated to
      `useEscapeKey(onClose, isOpen)`, and `useEscapeKey.test.ts` already spies on it. The clearest
      case on this board of tests reaching past their own subject.
- [x] **One spy was load-bearing and was replaced, not deleted.** The `isOpen` true→false removal
      spy had no behavioral equivalent for the single-state hook (`useClickOutsideMultiple` had one).
      Replacement: mount open, dispatch an outside click, assert `onClose` fired once; rerender
      closed, dispatch again, assert the count is still one. Firing once first is what proves the
      listener was live and then removed, rather than never attached at all.
- [x] **The delegation hid a real gap.** Both cleanup tests dispatched only `mousedown`, so a leaked
      `keydown` listener was invisible. Mutation-proved: deleting cleanup from `useClickOutside`
      turns 4 tests red, deleting it from `useEscapeKey` turns exactly 2 — and both are the ones the
      Escape dispatch was added to. Nothing else in the file caught that leak. Both hooks restored;
      `git diff` on `app/hooks/` is empty.
- [x] The unmount spy deleted cleanly — the existing "should not call onClose after unmount" test
      already covers it.

### ✅ B5 · `useCollectionEdit` fixture consolidation — PR #298

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

### ✅ B6 · Fold in `CollectionContentRenderer` characterization — PR #294 + #297

- [ ] `CollectionContentRenderer.characterization.test.tsx`'s stated purpose (pin behavior before the `getClickEligibility` extraction) is complete. Fold the ~6 unique wiring tests into the main file and delete the rest.

### ✅ B9 · `useCollectionEdit.buffer.test.tsx` flakes under parallel load — CLOSED not-reproducible

Filed 2026-08-23 out of B2's run. It is a real suite defect, not a B2 artifact — the file is
unrelated to B2's, and it passes standalone and on a clean re-run.

- [ ] `tests/components/ContentCollection/useCollectionEdit.buffer.test.tsx` fails intermittently
      when the full suite runs in parallel, and passes when run alone.

**Measured 2026-08-23: 0 failures in 13 full-suite runs.** Default parallel scheduling, no
`--runInBand`, ~11.6s per run. **Three more clean full-suite runs 2026-08-24 during E13/E15**
(243 suites / 4356 tests, ~12s each), bringing the standing tally to **0 failures in 16 runs**. Not
proof of a fix — nothing was changed to fix it — but at 16 clean runs the cost of chasing this
exceeds the evidence that it is still live. **Recommend closing it as unreproducible** unless it
resurfaces, rather than carrying it a fourth time. **The suite counts quoted here were wrong and misled a later run** —
the real baseline on `53aaac4` is **229 suites / 4086 tests**, measured independently by four agents.
A further 5 standalone runs of the named file on 2026-08-24 gave 10/10 passes. Zero total failures and zero failures of the
named file.

**The instrument was validated in the same session, because a null result from an unproven detector
is not a result.** The run loop classified pass/fail by grepping jest's stdout, which is the mistake
that produced a false all-CAUGHT table elsewhere this session — a grep can match an unrelated line,
or miss a crash that never prints a summary. Control: a deliberately failing test was injected into
`tests/`, the full suite re-run, and both signals confirmed to fire — exit code 1 and the grep
reporting FAIL, against `Tests: 1 failed, 4126 passed`. The control file was then removed and the
tree confirmed clean. So the channel can speak, and 0/13 means what it says.

**0/13 does not close this item, and that is deliberate.** An intermittent failure that hides for
thirteen runs is worse than one that fails every time, not better — it will surface in CI on some
unrelated PR and cost that author an afternoon. What 0/13 does establish is that it is rarer than
~1-in-13 on this machine, which bounds the search: whoever picks it up should reproduce under
different conditions rather than repeating this measurement, since repeating it is now known to be
uninformative. Try a loaded machine, a cold cache, `--maxWorkers` variations, or CI itself, and
record the conditions alongside the count. If it cannot be reproduced under any of those, close it
as not-reproducible with the conditions listed — do not close it as fixed.

Likely suspects once it does reproduce, given the file: this suite is the one C1 rewrote around
re-seed effects and ref guards, and its fixtures were specifically noted as sharing array identities
when built with `mockResolvedValue` instead of `mockImplementation`. Shared module state or a
fixture object leaking across workers is the first place to look. Do not "fix" it by adding a
retry or by moving it to `--runInBand`; both hide the defect rather than removing it.

**CLOSED 2026-08-24 as NOT-REPRODUCIBLE — not as fixed. Nothing was changed.** This item asked for
a reproduction under _different conditions_, on the explicit grounds that repeating the default-run
measurement had become uninformative. That was done: **6 full-suite runs across three worker
configurations — `--maxWorkers=100%`, `=2` and `=1` — all 244 suites / 4374 tests green, with
`useCollectionEdit.buffer.test.tsx` passing in every one.** Serial (`=1`) matters most: it removes
parallelism entirely, so a cross-worker fixture leak could not hide there.

Counting the four default-scheduling runs this session as well, the standing tally is 0 failures in
**22 runs**. Per this item's own rule those four add nothing — logged for honesty, not as evidence.

**Conditions NOT tried, and they are where a future reproduction should start: CI itself**, a
loaded machine, and a cold cache. CI is the one that matters — it is different hardware with
different core counts, and it is where an intermittent failure would actually cost someone an
afternoon. If this resurfaces there, reopen with the CI run URL and go straight to the shared-state
suspects named above; do not re-run the local measurement, which is now 22-for-22 uninformative.

### ✅ B8 · Fill the required-coverage gaps — shipped slices (#266, #267, #295, #296); the optional bullet is open on the live board

The item's open bullet (the optional `sharedObserver`/`useParallax`/`useContentReordering` slice)
stays on the live board. The five shipped slices, moved here 2026-08-29:

- [x] **First slice — the A7 Escape-path regression test — PR #267.**
      `tests/components/ContentCollection/useCollectionEdit.escapeSelection.test.tsx`, 4 tests,
      test-only. The effect is now at `useCollectionEdit.tsx:433-437` (drifted +1 when C1 landed, then +1 again by 2026-08-24).
      Verified against two separate mutations, not one: deleting the effect fails the two
      Escape-teardown tests, and dropping its `!isMultiSelectMode` guard fails the multi-select
      preservation test. The reasoning is out of the scratchpad and into the repo.

      **Test-design trap, cost one rewrite.** The multi-select preservation test must open the
      editor through the bottom bar's `edit` cell, NOT through `handleImageClick`. In multi-select
      mode a click only toggles the id and never opens the editor, so `editingContent` stays null,
      `useEscapeKey` (enabled on `!!editingContent`) never attaches, and the effect never re-runs.
      The first draft did exactly that and passed against BOTH mutants — a decoration. Note also
      that `handleBulkEdit` is not on the hook's public API (its deps-array entry is now `:1620`,
      was `:1617` before #341/#342 — `:1617` is `handleCancelReorder` in the same array), so the
      bottom bar cell is the only route to it.

- [x] `lib/api/share.ts` — 9 function exports + 4 type exports. **Shipped in PR #295**
      (`tests/lib/api/share.test.ts`, 520 lines, covering all nine function exports; the four type
      exports are exercised through the values those functions return). Est +350–500, actual +520 —
      in range, at the top of it.
      **This checkbox was stale, and so were the two below it.** #295 and #296 are named in this
      item's own heading, and `share.test.ts`'s docblock opens "B8 coverage gap — `share.ts` had
      none". The work shipped 2026-08-24; nobody ticked the boxes, so the board advertised three
      finished slices as available for three days.
      **Corrected 2026-08-27: `share.ts` is 161 lines, not 217.** E2's `clientFetch` conversion
      (#333) cut 26% of it. The export counts in the original claim are still exactly right — only
      the line count rotted, and it rotted because a later item shipped against the same file.
- [x] `lib/api/messages.ts` — 25 lines. **Shipped in PR #295** (`tests/lib/api/messages.test.ts`,
      98 lines). Est +80–150, actual +98 — in range.
- [x] `lib/storage/collectionStorage.ts` — **shipped in PR #296**, and the sequencing worked as
      written: these landed before E3's rewrite and served as its characterization net.
      `collectionStorage.test.ts` (806) + `collectionStorage.ssr.test.ts` (121) = **+927 against an
      estimate of +250–400 — 2.3–3.7x over**, the same test-side blowout this board has now recorded
      four times. **Corrected 2026-08-27: the file is 274 lines, not 286** — E3 (#306) cut it after
      this bullet was written.
- [x] `lib/actions/clearCache.ts` — shipped with D2, PR #266. `tests/lib/actions/clearCache.test.ts`.
