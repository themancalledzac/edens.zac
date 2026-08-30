# Group F — Structural (shipped)

_Archive of shipped work from the [2026 Summer Refactor board](../2026-summer-refactor.md). Nothing here is open work. Sections are verbatim as they were when the item merged._

F2, F5, F6 and F7 shipped, plus the shipped bullets of F3. F1, F3's open bullets and F4 are on the
live board.

## Closed rows

| MR  | Scope                                                                      | Outcome                                                                                                  |
| --- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| F2  | `RendererContext` for the BoxRenderer tree                                 | −47 src / +142 test (est. −100 src / +150–250 test) · #321                                                |
| F5  | `FullScreenModal` link + resolver cleanup                                  | −25 src / +20 test net (est. −30 src, +60–120 test) · #318 — src held; test came in UNDER                 |
| F6  | Fold `EditModeLayer` into `RendererContext` (shared set 16 → **4**, not 3) | +53 src / +218 test (est. −20 src / +40–60 test) · #326 — #325 orphaned on a retired base; src missed in the WRONG DIRECTION |
| F7  | Delete `onImageLoadError` from the render path (dead plumbing)             | −3 src / +8 test (est. −15 src / −20 test) · #328 — completes 16 → 3; estimate missed direction on BOTH halves |

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

### ◐ F3 · File moves and renames — shipped bullets and cost reports (`ReorderMove` #324, `getUserPage` #336, logger labels #343; invite move REJECTED)

_Moved from the live board 2026-08-29. The six open bullets stay there with their verified counts._

**SHIPPED 2026-08-27 — the `getUserPage` bullet, PR #336. Src `+38/−26` (net +12), test `+58/−56`
(net +2).** Measured with `git diff --cached --numstat -- app` and `-- tests`, summed with `awk`.
`getUserPage` now lives in `app/lib/api/personal.ts`; `app/lib/api/user.ts` and
`tests/lib/api/user.test.ts` are deleted and the naming trap is gone. **The bullet's `2 src / 7
test` was exactly right** — 2 importers (`UserSpace/userSpaceData.ts:15`,
`lib/components/CollectionPageWrapper.tsx:8` — **were quoted as `:16`/`:10`; re-derived
2026-08-29**), 7 test files. Estimate-vs-actual: no surprise.

**Suite count −1, test count unchanged.** 246 → 245 suites, 4451 → 4451 tests. `user.test.ts`'s
three specs folded into `personal.test.ts` under the harness it already had — that file mocks
`fetchReadApi` and keeps `ApiError` real, which is precisely what `user.test.ts` set up for itself.
The fold cost zero new mock scaffolding.

**BASELINE CORRECTION — the board's `4399` is stale. Current `main` is 246 suites / 4451 tests**,
measured by stashing the tree and running the full suite at `d784bc5`. #324's close-out said "quote
4399 from here on"; the E2 merges (#332/#333/#334) added 52 tests since. **Quote 4451 / 246 from
here on**, and note that this is the second time in a row the recorded baseline aged out within
three merges. A baseline is only good until the next merge — re-measure it, do not quote it.
(**It aged out again within a day: #336 deleted a suite and #342 added six tests. A baseline is a
measurement with a timestamp, not a fact.**)

**What the move actually cost, and it is not the line count.** Every one of the six test files that
mocked `@/app/lib/api/user` ALSO already mocked `@/app/lib/api/personal` separately. Moving the
export merged twelve mock declarations into six. That is the real content of the diff: a module
boundary that two files had to be mocked across is now one. **The reverse of this is what a future
split costs** — see the invite-functions cost report below, where two test files need a whole
second `jest.mock` block added for exactly this reason.

**One trap found and NOT triggered, worth writing down.** `tests/lib/components/CollectionPageWrapper.test.tsx`
mocks `personal` but never mocked `user`, so after the move its factory silently becomes
`getUserPage`'s mock too. It survives only because that file has no `home`-slug test, and
`getUserPage()` is called solely under `slug === HOME_SLUG && me` (`CollectionPageWrapper.tsx:75`,
guard at `:70` — **was quoted as `:76`; re-derived 2026-08-29**).
**Add a `home`-slug test to that file with a logged-in `meServer` and it will fail with
`getUserPage is not a function`** until `getUserPage: jest.fn()` joins its personal factory. Not a
defect today; a tripwire for whoever writes that test.

**`share.ts:7,81` needed no edit — the bullet asked for a change that is a no-op.** Both are bare
`{@link getUserPage}` with no module path, so they resolve (or fail to resolve) identically before
and after. `share.ts` never imported the symbol. `core.ts:157` mentions `getInvitePreview` the same
bare way, so the invite move has the same non-cost. **Lesson for the remaining "update the
refs" bullets: check whether the ref names a module before budgeting for it.**

**Why it was next (picked 2026-08-27).** Three reasons. Its context is
as warm as it will get — every one of its `file:line` refs was re-verified and corrected in this
session's drift sweep, so nothing in it is unchecked. It is small and fully specified: 2 src / 7
test, one export moving from a 19-line file into the module that already holds its three siblings.
And it kills the `user.ts` vs `users.ts` naming trap, which is a live hazard rather than a tidiness
complaint — this board has twice had to disambiguate the two by hand.

**Guardrail — do the `getUserPage` bullet only, and leave the invite functions alone.** The very next
bullet (invite functions from `users.ts` → `auth.ts`) is the adjacent tempting change: it is the same
kind of move, in the same directory, and its refs are now correct too, so a fresh session will be
inclined to sweep both into one MR. Do not. That bullet is marked PARTLY ACCURATE on purpose — its
DESTINATION is unresolved. The three invite functions span three different fetch perimeters
(`getInvitePreview` server-only via `getApiBaseUrl`, `regenerateInvite` through the admin perimeter
with the BFF secret, `acceptInvite` client-side through the BFF proxy), and `auth.ts` is client-side
session code. Moving them into `auth.ts` mixes three perimeters into one file, which is a worse
structure than the split it claims to fix. **If it still looks right after the `getUserPage` move,
write down what a new `invites.ts` would cost instead of doing it.** (It was costed 2026-08-27 —
see the invite cost report below.)

**SHIPPED 2026-08-24 — PR #324, +16/−9 src (net +7), 0 test.** `ReorderMove` now lives in
`app/types/Content.ts`. Four files, zero test files, exactly as measured. 245 suites / 4399 tests
pass, identical to the `main` baseline at `a60d333` measured with the tree stashed. **F6 is
unblocked.**

**The judgment call, recorded because it was a live option.** No re-export was left in
`collectionEditUtils.ts`. That file already re-exports `toggleRelation` for exactly this reason, so
keeping the old import path working was the precedented move — and it defeats the point. A
re-export leaves the edge nominally intact and lets the next person import the type from `edit/`
again. All four importers were repointed instead.

**`~neutral` was right, and the +7 is worth a line.** The entire net is the docblock added above the
interface at its new home, which explains why it lives in `app/types/` rather than beside the
functions that use it. Moving a type is net-zero by construction; the only way to spend lines is to
explain the move, and that is a line worth spending.

**Baseline correction for the board.** F2's close-out recorded the post-#321 baseline as 245 / 4398.
Current `main` is 245 / **4399**. The extra test came from #322 or #323, not from #324 — confirmed by
stashing and re-running, which gave the identical 245 / 4399. ~~**Quote 4399 from here on.**~~
**SUPERSEDED 2026-08-27 — `main` at `d784bc5` is 246 / 4451.** The E2 merges moved it. See the
baseline correction at the top of this item; 4399 was accurate for three merges and then was not.

**Why it was next (picked 2026-08-24).** Not because it is valuable on its own — it is a grab-bag —
but because one of its nine bullets is the sole blocker on F6, and F6 is the largest remaining win
in the neighborhood F2 just left warm (`SharedRendererProps` 16 members → 3). The `ReorderMove`
bullet is measured at four files and zero test files, so it is close to free. **Do that bullet;
leave the other eight alone.**

**Guardrail — HONORED in #324. The other eight were left untouched and verified against `main` at
`a60d333`; each bullet now carries its verdict and its file counts.** Four were still accurate
as written, four were partly wrong — and in every one of the four the _move_ is fine while the
_justification_ has drifted. That is the specific failure mode this board keeps hitting: the
one-line reason ages faster than the fact. Nothing was changed. The original guardrail text follows.

**Guardrail — do the other eight bullets NOT, and report which are still accurate.** They are the
tempting part: nine small mechanical moves look like one tidy MR, and bundling them buries a
dependency-edge change that F6 depends on inside a rename sweep nobody will review carefully. Worse,
several of the eight were written before A-, E- and F-group work landed and may already be done or
wrong — `CollectionPageWrapper.tsx` "is the only component under `lib`", the `AdminPanel/` fossil
"now only contexts", the two `logger.warn('manageUtils', …)` labels. **Check each of the eight
against `main` and write down which are still true, without changing them.** That converts a stale
grab-bag into eight verified one-liners for later, and it is the same move that turned E17 from a
vague bullet into a shippable item.

#### The shipped bullets, verbatim

- [x] ~~`getUserPage` from the one-function `user.ts` into `personal.ts`, killing the `user.ts` vs
      `users.ts` naming trap.~~ **SHIPPED 2026-08-27 — see the close-out above.**
      Original text, which was accurate in every particular:
      **STILL ACCURATE (2026-08-24); refs re-swept 2026-08-27.**
      `app/lib/api/user.ts` is 19 lines (**was `20`**), two imports, one export (`getUserPage:10`,
      unchanged). `users.ts` sits beside it with 13 exports.
      `personal.ts` is the right home: it already holds the signed-in user's own reads
      (`listSavedImageIdsServer:87` **was `:137`**, `listSavedImagesServer:105` **was `:155`**,
      `listFollowedCollectionIdsServer:124` **was `:174`**), same `cache: 'no-store'`, same
      null-on-401. 2 src / 7 test, and `tests/lib/api/user.test.ts` folds into
      `tests/lib/api/personal.test.ts`. **Also update the two `{@link getUserPage}` references at
      `app/lib/api/share.ts:7,81`** (**`:99` → `:81`**).
      **Every drifted ref here is E2's doing** — #333's `clientFetch` conversion shortened
      `personal.ts` to 131 lines and `share.ts` to 161. The premise is untouched; only the
      coordinates moved.
- [x] ~~`ReorderMove` type → `app/types/Content.ts`~~ **Done in #324.** The public tree imported it from the admin edit directory. **This bullet is the sole blocker on F6** — do it first and F6's dependency edge is one-way instead of two. As of #321 the importer is `RendererContext.tsx`, not `BoxRenderer.tsx`. **Measured, not guessed** — `grep -rln "ReorderMove" app/ tests/` against `main` at `dbc706a` returns exactly FOUR files and zero test files: `Content/RendererContext.tsx`, `Content/boxRendererUtils.ts`, `edit/collectionEditUtils.ts` (the declaration), `edit/hooks/useContentReordering.ts`. Two of the four are already on the public side, which is the whole argument for the move. A four-file, no-test-churn change.
- [x] ~~~~Two~~ **THREE** `logger.warn('manageUtils', …)` labels in `collectionEditUtils.ts` still name
      a module that no longer exists.~~ **SHIPPED 2026-08-28 — PR #343, MERGED, +3/−3 src, 0 test.**
      All three (`collectionEditUtils.ts:225`, `:279`, `:305`) now read `'collectionEditUtils'`.
      **The estimate was exactly right for once** — 1 src file, 0 test churn; suite unchanged at the
      pre-run reading (recorded as 245 / 4454, itself stale — see the re-measure rule).
      The bullet's own count correction (THREE, not two) also held, and the line refs had not
      drifted since the 2026-08-25 sweep. Original filing kept for history: found by B1 (#290) and
      deliberately left, because renaming log labels inside a test-only MR would have put a source
      change in a diff that had none. Nothing pinned the string —
      `git grep "'manageUtils'" -- tests/` returned nothing and `logger.warn` is a no-op under
      `NODE_ENV === 'test'`. The one surviving `manageUtils` mention, at
      `collectionEditUtils.test.ts:4`, is a docblock recording which file B1 merged in; that is
      accurate history and was left alone.

#### The invite-move cost report — COSTED 2026-08-27, REJECTED

The bullet read: invite functions from `users.ts` → `auth.ts`. **PARTLY ACCURATE
(2026-08-24) — the functions are where the bullet says, the destination is questionable.**
`regenerateInvite:87`, `getInvitePreview:158`, `acceptInvite:240` in `app/lib/api/users.ts`, whose
own docblock (`:2`) already admits the split. **All three `users.ts` refs re-verified correct
2026-08-27 — that file did not drift.** But `auth.ts` is client-side session code (`login:48`,
`logout:65`, `me:75`, `registerPasskey:162`, `loginWithPasskey:219` — **all five drifted, was
`:64`/`:87`/`:104`/`:191`/`:259`**) plus one server helper (`meServer:100`, **was `:129`**),
and the three invite functions span three different fetch perimeters:
`getInvitePreview` is server-only via `getApiBaseUrl`, `regenerateInvite` goes through the
admin perimeter with the BFF secret. **Re-decide the destination before moving — a new
`invites.ts` avoids mixing three perimeters into one file.** 3 src / 6 test.

**COSTED 2026-08-27, NOT SHIPPED — and the answer is don't, on grounds the bullet did not
yet state.** Measured against `main` at `d784bc5`. All three refs re-confirmed correct:
`regenerateInvite:87`, `getInvitePreview:158`, `acceptInvite:240` in a 264-line `users.ts`.

_Mechanical cost, which is small._ About 74 lines of body + docblock move out; `users.ts`
drops to ~190. A new `invites.ts` needs its own import block (~10 lines — `ApiError`,
`fetchAdminPostJsonApi`, `getApiBaseUrl`, three types from `@/app/types/User`) plus a file
docblock that has to explain the three perimeters, so call it **+25 to +35 src net**, nearly
all of it new-file header. The three src importers are one-line swaps with nothing to merge —
`app/invite/[token]/InviteForm.tsx:12` imports only `acceptInvite`,
`app/invite/[token]/page.tsx:6` only `getInvitePreview`, and
`app/(admin)/admin/users/GenerateInviteButton.tsx:10` only `regenerateInvite`. **That is
cheaper than the `getUserPage` move was**, where both importers needed merging.
`core.ts:157` names `getInvitePreview` in prose with no module path — no edit, same no-op as
`share.ts:7,81` turned out to be.

_Test cost, which is where it turns._ Six files. Three are path swaps
(`tests/app/invite/page.test.tsx`, `tests/components/InviteForm.test.tsx`,
`tests/components/GenerateInviteButton.test.tsx` — the last two import the module as a
namespace, so `usersApi` → `invitesApi` throughout the file, not just at the top). One is a
split: roughly 175 lines of `tests/lib/api/users.test.ts` (the `getInvitePreview:85`,
`acceptInvite:139` and `regenerateInvite:241` describes) become a new
`tests/lib/api/invites.test.ts` **carrying a duplicated ~30-line fetch-mock harness**. And two
— `tests/app/admin/AdminUserSpaceEditor.test.tsx:32` and
`tests/components/UserManagementPanel.test.tsx:25` — mock `regenerateInvite` inside a `users`
factory alongside other members, so each needs **a whole additional `jest.mock` block**, not a
swap. **This is the `getUserPage` move run backwards**: that one merged twelve mock
declarations down to six, this one splits six into eight.

_The reason to not do it, which is neither of those._ **Splitting these three out does not
reduce perimeter mixing, it relocates it.** `invites.ts` would hold the same three perimeters
`auth.ts` was rejected for holding. It is better only because its NAME predicts the mix —
a real improvement, but a much smaller one than the bullet implies.

**Worse, it splits invite issuance across two files.** `createUser:42` and `upgradeUser:109`
both return `CreateUserResponse` carrying a fresh `inviteUrl`, and both plainly stay in
`users.ts` as admin user-lifecycle operations. Today "where does an invite come from" has one
answer. After the move it has two — and the file named `invites.ts` is not the one that issues
most of them. **That is a worse boundary than the one it replaces**, and no docblock fixes it.

**Verdict: leave all three where they are; the bullet is a rejection, not a move.**
If the real complaint is the admin/public mix that `users.ts`'s own docblock (`:2`) admits,
the boundary that would actually pay is **public invite REDEMPTION (`getInvitePreview` +
`acceptInvite` — both unauthenticated, both driven by `app/invite/[token]/`) split from
everything else**, leaving `regenerateInvite` beside `createUser`/`upgradeUser` where issuance
lives. Two functions, not three, and each file ends with ONE perimeter. **Not proposed as a
task — recorded so the next pass does not re-litigate the 3-function version from scratch.**

### ☐ F1 · Decompose `useCollectionEdit.tsx` — boundary-drift history (three occurrences)

_Moved from the live board 2026-08-29. The item itself is open there with the current boundaries
and anchors; this is the record of how the boundaries drifted and what each drift taught._

**The first drift (found 2026-08-25):** #313 landed on 2026-08-24, one day AFTER the boundaries
were checked, and inserted 1 line at `:68` and 4 at `:748` — so every boundary below `:748` was +1
and every boundary at or above it +5. Re-anchored on `const [currentState`, `const [editTab`,
`const seedUpdateData`, `const [collectionPeople` and `const handleMediaUpload`, all of which still
match. **The file's stated 1,747 lines was correct**, which is exactly what made this drift
invisible: the line COUNT was refreshed after #313 and the line REFS were not, so the item looked
verified.

**It happened a SECOND time, the same way, four days later — #339 (E6 bullet 2).** Three edits at `:730`, `:765` and `:1439` produced **three different offsets**, so no single number corrects the boundaries: `+0` at or above `:730`, `+23` between `:730` and `:765`, `+17` between `:765` and `:1439`, `+11` below it. The five anchors above all still match and were re-used. **The general rule, now demonstrated twice: F1's boundaries are invalidated by ANY merge into `useCollectionEdit.tsx`, and a uniform offset is the wrong correction whenever the merge had more than one hunk.** Re-derive from the anchors, never by adding a constant.

**It happened a THIRD time, on 2026-08-28, and this one is the most instructive — #341 and #342
between them changed FOUR lines of logic and still moved the boundaries.** #341's only structural
effect was a **Prettier collapse**: emptying `handleDeleteSuccess`'s parameter list let the
`useCallback` fit on one line, removing 3 lines at `:1059`. #342 replaced a 10-line `map` body
with a 5-line call at `:1101`. Two hunks, two offsets: **+0 at or above `:1058`, −3 between
`:1059` and `:1100`, −8 at or below `:1101`.** Re-derived boundaries, verified against `main` at
`652d5bb`: state **`:312–422`** (unchanged), update form **`:439–814`** (unchanged),
people+gallery **`:472–873`** (unchanged), content ops **`:874–1220`**, relations
**`:1222–1406`**, manage bar **`:1407–1459`**. **The rule now has a stronger form: it is not
"any merge with more than one hunk" — it is ANY merge at all, including one that changes no logic
below the edit. A formatter is a hunk.**

**DEFECT found 2026-08-28 (2): two of the six boundaries had no anchor, so the re-derive rule
could not actually be applied to them.** The item named five anchors — `const [currentState`
(`:312`), `const [editTab` (`:422`), `const seedUpdateData` (`:439`), `const [collectionPeople`
(`:472`), `const handleMediaUpload` (`:875`) — all five re-confirmed. But the
**content-ops/relations** boundary and the **relations/manage-bar** boundary were bare numbers.
Re-deriving them by offset lands `:1220` in the middle of `handleLocationsChange` (`:1217`) and
`:1407` in the middle of `enterReorder` (`:1404`) — both mid-function, which is not a boundary.
Anchors proposed and verified: relations starts at `const currentTags` (`:1231`), manage bar starts
at `const enterSelect` (`:1402`). Under those, `enterReorder` straddles the relations/manage-bar
line — that straddle is real and is a genuine finding about the split, not a bad boundary. **The
anchors are now folded into the live item's boundary list.**

**Trap found while anchoring:** anchoring the update-form end on its raw source line — a bare `);`
— false-matched 13 lines early. Generic closing punctuation is not an anchor. The end boundaries
were re-derived from the enclosing construct (`handleUpdate`'s dependency array,
`const bottomBarCells`), which is why `:797 → :814` is right and the naive `);` match at `:801` is
wrong.
