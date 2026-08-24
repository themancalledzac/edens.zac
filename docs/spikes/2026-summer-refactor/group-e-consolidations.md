# Group E — Consolidations (shipped)

_Archive of shipped work from the [2026 Summer Refactor board](../2026-summer-refactor.md). Nothing here is open work. Sections are verbatim as they were when the item merged._

E1 (PR #269) and E11 (PR #280). E2–E10 and E12 are still open on the live board.

---

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
