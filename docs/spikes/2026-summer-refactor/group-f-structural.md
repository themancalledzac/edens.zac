# Group F — Structural (shipped)

_Archive of shipped work from the [2026 Summer Refactor board](../2026-summer-refactor.md). Nothing here is open work. Sections are verbatim as they were when the item merged._

### ✅ F2 · `RendererContext` for the BoxRenderer tree — SHIPPED

**SHIPPED 2026-08-24 — PR #321, −47 src / +142 test.** New `app/components/Content/RendererContext.tsx`
holds `SharedRendererProps` (the 16) once; `ContentBlockWithFullScreen` and `Component` extend it and
forward the set as one object; `BoxRenderer` is down to `tree`/`sizes`/`isMobile`/`priority` and reads
the rest from `useRenderer()`. 245 suites / 4398 tests pass, against a `main` baseline of 244 / 4381
measured with the tree stashed — so the 17 new tests are the whole delta and nothing was lost.

**The re-derived estimate was right to distrust the src number, and the src number was still high.**
Re-deriving from the 16-prop / 3-site measurement predicted "much smaller than −100"; actual is −47,
so the board's −100 was over by roughly 2×. The test half landed at +142, just under the +150–250
band — close enough that bias 1b is not indicted here. Counting method, per the new rule:
`git diff --cached --numstat -- app/` and `-- tests/`, summed. Src is 157 added / 204 removed across
four files; test is 148 added / 6 removed across two.

**What actually shrank, and what did not.** The savings are concentrated in `BoxRenderer` (−42) and
`Component` (−39), because both carried the set twice — once in an interface, once in JSX — and
`BoxRenderer` carried it a third time in its `childProps` recursion object, which is now gone
entirely. `ContentBlockWithFullScreen` gave up −47 by collapsing its 16 destructured names and 16
JSX lines into `...shared` / `{...shared}`. Against that, the new context file is +81. The reason
the net is not larger is that the 16 declarations did not disappear — they moved into
`SharedRendererProps`, which is the point of the item, but it means the win is "declared once
instead of three times", not "deleted".

**Defaults moved down, not away.** `Component` used to default `enableFullScreenView`,
`isSelectingCoverImage`, `isReorderMode` to `false` and `selectedIds` to `[]` on the way in. Those
defaults are now applied in `BoxRenderer`'s context destructure, so the leaf sees exactly the values
it saw before. `CollectionContentRenderer` defaults three of the four itself, so this is
belt-and-braces — but it is the difference between a refactor that provably changes nothing and one
that changes `false` to `undefined` in four places and asks you to trust that nothing reads it.

**The context value is deliberately not memoized**, and the reasoning is in the docblock on
`RendererProvider` rather than here: the only consumers are `BoxRenderer` trees in `Component`'s own
JSX, none wrapped in `memo`, so they re-render with the parent regardless. Wrap `BoxRenderer` in
`memo` and that stops being true — the docblock says so.

**Threading is now pinned, because it was not.** `tests/components/Content/RendererContext.threading.test.tsx`
(+144, 17 tests) renders the real `ContentBlockWithFullScreen → Component → BoxRenderer` chain with
only `CollectionContentRenderer` mocked, and asserts every shared member arrives at the leaf, that
the five caller handlers arrive by identity, that `onImageLoadError` arrives as `Component`'s
wrapper and not the raw handler, and that `reorderMoves`/`reorderDisplayOrder` stop at `BoxRenderer`
as the derived flags. This is the E8 rule paying off a second time: `boxRendererUtils.test.ts` pinned
`computeReorderFlags`, and `Component.reflowOnError.test.tsx` pinned the `onImageLoadError` wrapper,
but nothing pinned the other fifteen props' threading — which is precisely the behavior being moved.
The only other test churn was `BoxRenderer.visibility.test.tsx`, which passed `currentCollectionId`
as a prop and now wraps in a provider (−6/+4).

**Browser verification did NOT run.** The Spring backend was not up (`ECONNREFUSED` on
`/api/auth/me`), so every page that renders the grid died in its error boundary before reaching
`Component`. The grid path is covered by the threading test above, which exercises the real chain,
but the "verify on :3000" step Group F asks for is outstanding and should be done next time the
stack is up. Unrelated find while looking for a backend-free page: the `tsc` error at
`.next-verify/dev/types/validator.ts` is a stale generated type for a deleted
`app/(admin)/admin/layoutpreview/page.tsx`; `.next-verify/` is gitignored, so this is build-artifact
rot, not a code defect. Deleting the directory clears it.

#### The `EditModeLayer` question, answered

Per the guardrail, `EditModeLayer` was left passing props. The measurement that decides the
follow-up:

**Thirteen of the sixteen shared props have exactly ONE caller, and it is `EditModeLayer`.**
Measured with `awk '/<ContentBlockWithFullScreen/,/\/>/'` over each of the seven call sites.
`TaxonomyPage`, `CollectionPage`, `LocationPageClient` and `AdminHubClient` pass only
`enableFullScreenView`; `CollectionPageClient` adds `onImageClick` and `selectedIds`;
`CollectionRailContext` passes none. `EditModeLayer` passes all eight reorder props plus
`isSelectingCoverImage`, `currentCoverImageId`, `justClickedImageId` and `currentCollectionId`.

**So the prize is bigger than "removing a third copy".** If `EditModeLayer` provided those thirteen
through the context, `ContentBlockWithFullScreen` and `Component` could stop declaring them at all —
`SharedRendererProps` would shrink to three members. That is a genuine simplification of the public
render path, not a cosmetic one.

**The cost is that `Component` becomes both consumer and provider of the same context.** It cannot
stop providing: it owns the `onImageLoadError` wrapper, `canDownload` and `collectionSlug`. So it
would have to read the ambient value and re-provide it merged with its own. Done carelessly that
creates two live paths for the same prop with invisible precedence — a caller passing
`isReorderMode` while an ancestor provides it, and nothing at either site showing which wins. **The
follow-up is only worth doing if it REMOVES the props rather than adding a second path**: the
thirteen come out of both interfaces, `EditModeLayer` becomes their sole source, and `Component`
augments an opaque value it never reads. Then there is exactly one path and the hazard does not
exist.

**Is the coupling acceptable? Yes, and the board's instinct was half wrong here.** The stated worry
was wiring an editing surface into a context owned by the public render tree. But the dependency
already runs the other way and worse: `RendererContext.tsx` imports `ReorderMove` from
`app/components/ContentCollection/edit/collectionEditUtils`, exactly as `BoxRenderer` did before it.
The public tree already knows the edit layer exists, at the type level, today. Having the edit layer
_provide_ values the public tree consumes opaquely is the cleaner direction of the two, because
`Component` would never import anything from `edit/` to read them.

**Sequencing: do F3's `ReorderMove` move first.** F3 already lists "`ReorderMove` type →
`app/types/Content.ts`; the public tree currently imports it from the admin edit directory." Doing
that first leaves the follow-up with a clean one-way edge instead of trading one direction of
coupling for another. **Sized at roughly −20 src** (−13 interface lines in
`ContentBlockWithFullScreen`, −13 JSX lines in `EditModeLayer`, +~5 provider lines there, +~5 merge
lines in `Component`) **and +40–60 test** — `CollectionPageClient.editMode.test.tsx` and anything
else mounting `EditModeLayer` needs the provider, and the merge precedence in `Component` is new
behavior that nothing pins. Filed as a follow-up MR with this analysis, not a scope expansion.

**Why it was next (picked 2026-08-24).** The board named E8/F2/F5 as the candidates after E16.
F5 shipped (#318), E8 shipped (#319), so F2 is the last of the three. Its context is warm twice
over: E8 just spent a session inside `CollectionContentRenderer`, the leaf of this exact chain, and
this close-out just re-measured F2's premise from scratch, so the item is fully specified for a
cold start. F1 is the only larger structural item left and it should follow, not precede.

**Read the re-measurement above before estimating.** Both of this item's numbers were wrong; the
real surface is 16 shared props across 3 copy sites, not twenty across ten. **Size the test half by
which touched surfaces are already pinned, not by the src sign** — that is the rule E8 corrected
(see its section). Concretely: `boxRendererUtils.test.ts` already pins `computeReorderFlags`, so the
reorder half of this tree has coverage, but check whether anything pins the prop _threading_ itself
before assuming the test half is small. E8's went to +90 precisely because the behavior it moved
turned out to be unpinned.

**Guardrail — leave `EditModeLayer` on props and report what moving it into the context would do.**
**Honored in #321; the report is "The `EditModeLayer` question, answered" above, and it upgrades the
follow-up from "removes a third copy" to "shrinks the shared set from 16 members to 3".** The
original text follows.

The measurement above found the reorder prop block copied at three sites, and the third is
`EditModeLayer`, in the admin edit directory — outside the `BoxRenderer` chain a `Component`-provided
context reaches. Folding it in is the tempting move, because it looks like the same duplication and
would make the "remove all copies" story clean. It is also exactly the shape this board keeps
getting wrong: two things that look identical and are deliberately separate. Wiring the admin edit
layer into a context owned by the public render tree couples an editing surface to a display
surface, and the public tree currently has no reason to know the edit layer exists. **Do the
`BoxRenderer`/`Component`/`ContentBlockWithFullScreen` migration, leave `EditModeLayer` passing
props, and write up what including it would cost and whether the coupling is acceptable.** If it
turns out clean, that is a follow-up MR with the analysis attached rather than a scope expansion
discovered mid-diff.

- [x] ~~Twenty render-constant props are copied ~10 times across~~ **Re-measured 2026-08-24 and both numbers are wrong — see below.** **Done in #321.** Render-constant props are copied across `BoxRenderer`, `Component`, and `ContentBlockWithFullScreen`. A context provided once by `Component` reduces `BoxRenderer` to `tree`/`sizes`/`isMobile`/`priority` and removes plumbing — `priority` STAYS a prop, it is per-row (`priority={rowIndex <= priorityRowIndex}`, was Component.tsx:284, then `:246` after #321 cut 39 lines, **now `:248` — F6 pushed it to `:254`, then F7 (#328) cut 6 lines above it (2026-08-25)**), not render-constant. Completes the context migration the codebase already chose for `SelectStar`/`SaveHeart`.

**The two numbers this item's estimate rests on are both wrong, and the second one badly.**
Measured on 2026-08-24 against `main` + E8:

- **Props present in all three prop interfaces: 16, not twenty.** The exact set is
  `currentCollectionId`, `currentCoverImageId`, `enableFullScreenView`, `isReorderMode`,
  `isSelectingCoverImage`, `justClickedImageId`, `onArrowMove`, `onCancelImageMove`, `onImageClick`,
  `onImageLoadError`, `onPickUp`, `onPlace`, `pickedUpImageId`, `reorderDisplayOrder`,
  `reorderMoves`, `selectedIds`. Interface sizes: `BoxRenderer` 23, `Component` 27,
  `ContentBlockWithFullScreen` 28. F5 accounts for at most one of the missing four — it removed
  `router` from `ContentBlockWithFullScreen` — so the 2026-08-22 "re-verified" count was already
  wrong when it was written, or it counted a different set.
- **Copy sites: 3, not "~10".** `grep -rl 'onCancelImageMove={' app/` returns exactly
  `Component.tsx`, `ContentBlockWithFullScreen.tsx`, `EditModeLayer.tsx`. Note the third — the
  block is also copied into the **admin edit layer**, which is outside the `BoxRenderer` chain this
  item describes, so a context provided by `Component` does not reach it. Whether `EditModeLayer`
  can join the context or has to keep passing props is an open design question for whoever picks
  this up; it is the difference between removing two copies and removing three.

**Consequence: the "~100 lines of plumbing" estimate is unverified and probably high.** 3 JSX
sites + 3 interface declarations is a much smaller surface than "~10 times" implied. Re-derive the
estimate from the 16-prop / 3-site measurement before quoting a number, and record the counting
method this time — neither prior count recorded one, which is why they could not be checked.

### ✅ F5 · `FullScreenModal` link + resolver cleanup — PR #318, merged 2026-08-24 (fd74870)

- [x] ~~Hand-rolled `<a>` + `router.push` → `Link`, which also removes `router` from props.~~ Done,
      and the `router` cascade went further than the bullet predicted: **`useFullScreenImage` called
      `useRouter()` and never used it.** `grep 'router\.'` in the hook returns nothing — it only
      returned the instance, and the modal's `router.push` was the sole consumer. So the removal is
      the prop, the pass-through in `ContentBlockWithFullScreen`, the hook's return field, the
      `useRouter()` call, and both imports.
- [x] ~~`fullScreenModalUtils` resolvers: drop the `isGif` param that mirrors the internal guard.~~
      Done in all three (`resolveDisplayLocations`, `resolveDisplayDate`, `resolveDisplayFilmStock`).
      Each already called `isGifBlock(currentImage)` alongside the param, so the guard was doing the
      work and the boolean only had to agree with it. Dropping it also let each body collapse to a
      single `isGifBlock(...)` ternary.
- [x] ~~Fix `hideImage`'s vestigial event param in both type signatures.~~ Done —
      `(e?: MouseEvent) => void` → `() => void` in `FullScreenModal.tsx` and
      `useFullScreenImage.tsx`. The implementation is a zero-arg `useCallback`; nothing ever passed
      an event.
- [x] **Fourth vestigial thing, found while testing the first bullet.** The link carried
      `onClick={e => e.stopPropagation()}`, which looked load-bearing because `handleOverlayClick`
      on `.overlayContainer` closes the viewer. It is dead: **`.metadataOverlay` already stops every
      click inside it** (`FullScreenModal.tsx:236`), so nothing in the metadata panel ever reaches
      the overlay handler. Removed. **Caught only by red-checking the test** — the first assertion
      written for it passed with the link's guard deleted, which is what exposed the parent guard.

**Sizing: −25 src / +20 test net (+67 added, −47 removed), against −30 src and +60–120 test.** The
src estimate held, the third in a row. **The test half came in UNDER, which contradicts the rule
written into E16's close-out one item earlier** — and the contradiction is informative rather than
noise. E13 and E16 both **added** callers, and new callers need new tests, so their test halves ran
~2.3x over. F5 **removes parameters**, so its existing tests got shorter and the only additions were
the three pinning the `Link`. Corrected rule: **the 2.3x test overrun applies to items that add a
caller or a prop, not to items that delete one.** E8's `MenuDropdown` config array and F2's
`RendererContext` are both deletions with a new indirection — expect them nearer F5 than E16, and
re-measure rather than assuming either way.

**Toolchain trap worth its own line, and it is the one CLAUDE.md already warns about.** Running
`eslint --fix` over the resolver tests silently deleted the explicit `undefined` argument in the two
cases whose whole point is "collectionData is absent" (`unicorn/no-useless-undefined`), turning two
2-arg calls into 1-arg calls and breaking `tsc`. The fix is a named binding —
`const noCollection: CollectionModel | undefined = undefined` — which satisfies both tools. This is
the second distinct shape of that rule biting this board; the first was `mockResolvedValue(undefined)`.
**Re-run `tsc` after `eslint --fix`, never only before.**

---

### ✅ F6 · Fold `EditModeLayer` into `RendererContext` — SHIPPED, PR #325 → re-landed as #326

**ORPHANED ON MERGE, then recovered — read this before trusting the ✅.** #325 was opened stacked on
`0324-f3-reordermove-move`. #324 merged to `main` at 23:59:31; #325 merged 13 minutes later into
that now-retired base, so **`main` never saw F6** even though `gh pr view 325` says `MERGED`. Caught
by the 2026-08-25 close-out's reconcile step via
`git merge-base --is-ancestor 9953f19 main`, which said no; the giveaway was that `main`'s
`SharedRendererProps` still had all sixteen members. Re-opened the same two commits against `main`
as **#326**. This is the SECOND time this exact trap has hit this board — see E15/#314 and the
strengthened rule in "how to use this doc", which now carries a preventive clause aimed at the
session that opens a PR rather than only the one that merges it.

**SHIPPED 2026-08-24 — PR #325 (landed via #326), +53 src / +218 test, against an estimate of −20 src / +40–60 test.**
`EditModeLayer` supplies the twelve edit-only members through `RendererProvider`; `Component` reads
the ambient value and re-provides it merged with its own. 246 suites / 4423 tests pass (+1 suite,
+24 tests) on a 245 / 4399 baseline.

**The src estimate missed in the WRONG DIRECTION — it predicted a shrink and the item grew by 53.**
Two causes, and the second is the one worth remembering:

1. **A win already banked was counted twice.** The estimate budgeted "−13 interface lines in
   `ContentBlockWithFullScreen`". #321 had already collapsed that file to
   `extends SharedRendererProps` + `{...shared}`, so it has no per-member lines left to delete.
   `ContentBlockWithFullScreen` changed by **zero lines** in this MR.
2. **The twelve declarations were relocated, not deleted.** They moved out of `SharedRendererProps`
   and into a new `EditRendererProps` in the same file. `RendererContext.tsx` went +51/−23;
   `EditModeLayer` lost twelve JSX props and gained a twelve-line provider value, a docblock, the
   JSX wrapper and an import, for +40/−23.

**This is F2's own lesson, forgotten one item later.** F2's close-out says it outright: "the 16
declarations did not disappear — they moved into `SharedRendererProps` … the win is 'declared once
instead of three times', not 'deleted'." F6 has the identical shape and its estimate assumed
deletion anyway. **New rule: when an item MOVES a declaration rather than removing its last caller,
the src half is ≥ 0 before docblocks, and the docblock explaining the move makes it positive. Only
deleting the last caller produces a negative src number.**

**The test half ran ~4× over (+218 vs +40–60), and the reason is findable rather than noise.** The
board applied E8's rule and correctly named the merge in `Component` as bare. It missed that
`EditModeLayer`'s provider was **also** completely bare — measured, not guessed: with the
`RendererProvider` deleted outright, all 245 suites and 4399 tests still passed. Sizing covered one
bare surface and the item had two. `tests/components/ContentCollection/edit/EditModeLayer.rendererContext.test.tsx`
(+196, 24 tests) closes it, and is red-checked twice: deleting the provider fails 14 of the 24,
dropping one member from the value fails exactly that member's test and nothing else.

#### Three of this item's own measurements were wrong — corrected

Re-measured 2026-08-24 across every call site before writing any code:

- **`EditModeLayer` is the sole caller of TWELVE members, not thirteen.** The table below said
  "all 8 reorder + 4 cover/select = **13**", and 8 + 4 = 12. The arithmetic slip propagated into
  the headline "16 members → 3".
- **There are SIX `ContentBlockWithFullScreen` call sites, not seven.** `CollectionRailContext.tsx`
  mentions the component but has no JSX call site. Also, all six pass `enableFullScreenView` — four
  of them by boolean shorthand, which a `grep 'prop={'` misses. **Measure JSX props with a pattern
  that matches bare shorthand**, or four call sites vanish.
- **`onImageLoadError` has ZERO callers anywhere in `app/`.** No page supplies one. It is threaded
  through two interfaces and wrapped by `Component` for nobody.

**So `SharedRendererProps` went 16 → 4, not 16 → 3**, and the missing member is not one
`EditModeLayer` could have provided. Reaching 3 means **deleting `onImageLoadError` as dead
plumbing** — a separate, one-line-reviewable change, deliberately not bundled here. Note the
wrapper `Component` builds around it stays live either way: it records the failed id so the public
view reflows, and only the call out to the absent caller is inert.

**One thing the scope note did not predict: `Component` CONSUMES one of the twelve.**
`currentCollectionId` is not just forwarded — `Component.tsx` reads it to set `isPublicView`, which
decides whether a failed image is dropped so the row reflows (public) or kept for an admin to
delete (manage). So `Component` reads it from the ambient context now, and
`Component.reflowOnError.test.tsx` had to move from passing a prop to wrapping in a provider. That
is the consumer/provider overlap the filing flagged as a hazard, and it is real rather than
theoretical.

**Browser verification did NOT run — second consecutive session.** The Spring backend is down;
`meServer()` fails with `ECONNREFUSED` at `app/lib/api/auth.ts:131`, so every page rendering a grid
dies in `CollectionPageWrapper`'s error boundary before reaching `Component`. Group F's ":3000
verify" is now outstanding on **both F2 and F6**, and both exercise the same chain — one session
with the stack up clears both.

---

#### The filing, as written 2026-08-24

Filed 2026-08-24 out of F2's guardrail. F2 was told to leave `EditModeLayer` on props and report
what folding it in would do; this is that report promoted to a numbered item so it does not rot
inside a shipped section. The full analysis is in F2's close-out — this section is the actionable
summary and the blocker.

**The measurement that makes it worth doing.** ~~Thirteen~~ **TWELVE** of `SharedRendererProps`'
sixteen members have exactly ONE caller, and it is `EditModeLayer` — see the correction above; the
rest of this filing is left as written. Measured 2026-08-24 with
`awk '/<ContentBlockWithFullScreen/,/\/>/'` over each of the seven call sites:

| Caller                                                                   | Shared props passed                                   |
| ------------------------------------------------------------------------ | ----------------------------------------------------- |
| `EditModeLayer.tsx:279` (was `:250` pre-F6)                              | all 8 reorder + 4 cover/select = **12** (was "13")    |
| `CollectionPageClient.tsx`                                               | `enableFullScreenView`, `onImageClick`, `selectedIds` |
| `TaxonomyPage`, `CollectionPage`, `LocationPageClient`, `AdminHubClient` | `enableFullScreenView` only                           |
| `CollectionRailContext`                                                  | none                                                  |

So this is not "remove a third copy of the reorder block" — it is **`SharedRendererProps` going
from 16 members to 3**, and `ContentBlockWithFullScreen`/`Component` losing thirteen props from
their public surface.

**Scope, and the one way to get it wrong.** `EditModeLayer` provides the thirteen through
`RendererProvider`; `ContentBlockWithFullScreen` and `Component` stop declaring them. `Component`
cannot stop providing — it owns the `onImageLoadError` wrapper, `canDownload` and `collectionSlug` —
so it reads the ambient value and re-provides it merged with its own. **It must REMOVE the props,
not add a context path beside them.** Leaving both paths live means any of the thirteen can arrive
two ways with precedence invisible at both the call site and the provider, which is a worse defect
than the duplication it replaces.

**UNBLOCKED 2026-08-24 by #324 — the ordering is satisfied, start here.** The blocker was never a
decision, just a sequence: `RendererContext.tsx` imported `ReorderMove` from
`app/components/ContentCollection/edit/`, so doing F6 first would have added an edit → display edge
while that display → edit edge still existed, trading one direction of coupling for two. #324 moved
the type to `app/types/Content.ts` and repointed all four importers with no re-export, so
`app/components/Content/` no longer imports from `edit/` at all. The edge F6 adds is now the only
one.

**This also corrects F2's stated worry.** The guardrail said wiring the edit layer into a context
owned by the public tree "couples an editing surface to a display surface". Half right: the coupling
exists already and points the wrong way. Having `EditModeLayer` _provide_ values that `Component`
re-provides without ever importing from `edit/` is the cleaner of the two directions.

**Sized −20 src / +40–60 test.** Src: −13 interface lines in `ContentBlockWithFullScreen`, −13 JSX
lines in `EditModeLayer`, +~5 provider lines there, +~5 merge lines in `Component`. Test: anything
mounting `EditModeLayer` needs the provider, and the merge precedence in `Component` is new behavior
nothing pins — per E8's rule, size the test half by what is bare, and that merge is bare.

---

### ✅ F7 · Delete `onImageLoadError` from the render path — PR #328

Filed 2026-08-25 out of F6's re-measurement, shipped the same day. `SharedRendererProps` is now
three members, completing F6's 16 → 3.

**The premise held on re-measurement.** Zero callers, re-checked against `main` at `ebb948f` across
all six `ContentBlockWithFullScreen` call sites (`grep -rn "onImageLoadError=" app/` returns
nothing). The live half was identified correctly too: `Component`'s wrapper records the failed id
into `failedImageIds` so the public view drops the image and the row reflows; only the trailing
`onImageLoadError?.(contentId)` was inert. `Component.reflowOnError.test.tsx` passes untouched, as
this item required.

**One thing the item did not anticipate, and it is a type-system trap worth naming.**
`RendererContextValue extends SharedRendererProps`, so deleting the member from the parent silently
deletes it from the context type as well — and `Component` assigns `onImageLoadError:
handleImageLoadError` into exactly that type. The item said "`RendererContextValue` keeps
`onImageLoadError` ... do not delete that one", which reads as "leave it alone" but actually
required **adding** an explicit declaration to replace the inherited one. `tsc` catches it, so the
cost was a minute; the lesson is cheaper than the next instance. **When an item says one interface
keeps a member another loses, check whether the first inherits it from the second — "keep" may mean
"re-declare".**

**The rename was considered and declined.** The item suggested renaming the context member so a
reader is not asked to hold two meanings for one identifier. Once the caller-facing prop is deleted
there is only one meaning left, so the ambiguity the rename would fix no longer exists. Both
interfaces now say in a docblock what the surviving one means. A rename would have churned
`BoxRenderer`, `CollectionContentRenderer`, `ContentRenderer.ts` and the reflow test — the one test
this item said must not be edited.

**The estimate missed direction on both halves, and it is the same bias for the third item running.**
Estimated −15 src / −20 test on the reasoning that a deletion is negative twice. Actual: **src +17
−20 (net −3), test +20 −12 (net +8)**. Code lines alone are clearly negative; the additions are
docblocks explaining why a deleted thing was deleted and why its namesake was not. **A deletion that
needs explaining is not a net subtraction from the file.** F2 and F6 both wrote down a version of
this — "the win is 'declared once instead of three times', not 'deleted'" — and it applies to real
deletions too, not only to moves. The counter-check is one question: after this lands, will the next
reader need to be told why the code is shaped the way it is? If yes, budget the comment.

**The reworked test was checked for vacuity, not just for green.** The old assertion — leaf handler
`not.toBe(caller's raw handler)` — would have passed trivially once no caller could supply one, so
rewriting it was mandatory rather than cosmetic. The replacement pins that the leaf receives a
function even though the grid is rendered without one. Confirmed non-vacuous by removing
`Component`'s provision and watching it go red alongside the reflow test. **The board's
prove-it-fails rule is usually applied to new tests; it applies at least as much to a test whose
assertion changed shape, because that is exactly when an assertion quietly becomes tautological.**

**Verification.** `eslint --fix` → `prettier --write` → `tsc --noEmit` clean; full jest 246 suites /
4423 tests pass. No `:3000` browser check — the reflow is covered by a test that was already there
and still passes.

---
