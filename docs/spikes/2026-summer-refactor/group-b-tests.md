# Group B — Test-suite reductions (shipped)

_Archive of shipped work from the [2026 Summer Refactor board](../2026-summer-refactor.md). Nothing here is open work. Sections are verbatim as they were when the item merged._

B1, B2, B3, B4 and B7 merged 2026-08-24 as PRs #290, #288, #287, #289 and #286 — five in one sitting, run as parallel agents in separate worktrees. B5, B6, B8 and B9 are still open on the live board.

**Read the estimate corrections before sizing B5, B6 or B8.** Every estimate in this group came in short, in the same direction, because it counted repeated text and assumed repetition meant redundancy. Four of five duplication claims were also wrong. Both patterns are recorded per item below and hoisted into the live board's "How to use this doc".

---

### ☐ B1 · Merge `manageUtils.test.ts` — NEXT

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

- The drift test **scans source text** and asserts the registered and revalidated tag *sets* agree.
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

**SHIPPED — PR #290 (open).** `manageUtils.test.ts` deleted; `collectionEditUtils.test.ts` 190 →
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

| Mutation | `cacheTagDrift` | revalidate suites |
| --- | --- | --- |
| 3 tags in source, only 1 POSTed | MISSED | CAUGHT |
| Metadata tags under key `tag` not `tags` | CAUGHT | CAUGHT |
| `POST` → `PUT` | MISSED | CAUGHT |
| `Content-Type` dropped | MISSED | CAUGHT |
| `path` dropped, tag correct | MISSED | CAUGHT |
| `collection-home` deleted | CAUGHT | CAUGHT |

Row one settles it. Leave all three tag literals in the source and change only which ones reach
`fetch`: the drift test still reads three tags out of the text and passes, while the runtime suite
fails on `toHaveBeenCalledTimes(3)`. **A source scan cannot distinguish a tag that is posted from a
tag that is merely written down** — which is exactly why the `collection-home` pin has to be a live
request assertion. Method, headers and path never appear in the drift test's regexes at all. The
intersection is one row. Keep both, and stop re-asking.

### ☐ B2 · `rowCombination` characterization dedup

- [ ] `rowCombination.characterization.test.ts:481-714` — the "architecture types" half duplicates `rowCombination.test.ts`'s own describes. Both files kept a copy after an unfinished handoff. Keep the numbered scenario pins; they are still valuable while the layout engine is under active work.
- [ ] `heroAcceptance.test.ts` is a strict subset of the unit file — delete it.

**SHIPPED — PR #288 (open).** Characterization file 714 → 470, `rowCombination.heroAcceptance.test.ts`
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

### ☐ B3 · `metadataUtils.test.ts` dedup

- [ ] 1,893 lines (was 2,461 — A3/PR #257 already removed the seven `getDisplay*` delegate suites).
      Still duplicated: `buildAssociationDiff` via Tags (:332) and People (:442), and the
      camera/lens/filmType triplet (:169/:207/:245). Keep one full suite per shared builder plus one
      wiring test per field, or convert to `it.each`. Est −200 to −300, not −500.

**SHIPPED — PR #287 (open).** 1,893 → 1,768 lines (−125). Tests in file 106 → **107**.

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

### ☐ B4 · `contentLayout.test.ts` merge

- [ ] Two merged generations left duplicate `createHeaderRow` and `processContentForDisplay` describes. Merge them, keeping the stronger assertions.

**SHIPPED — PR #289 (open).** 1,587 → 1,555 lines (−32, against an estimate of −150 to −250 — off by
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

### ☐ B7 · `useClickOutside` spy tests

- [ ] Drop the four listener-attachment-spy tests. They pin an implementation detail; the behavior tests already pin the outcomes.

**SHIPPED — PR #286 (open).** 21 insertions, 58 deletions, net −37 (est. −90). File 21 → 18 tests;
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
