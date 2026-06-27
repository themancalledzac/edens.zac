# 005 · Layout

> BoxTree / row-composition engine · the V3 algorithm shipped, so most sections are durable reference — the one substantial piece of future work is the **directional-prominence value-model refactor** (next steps, below), plus a few smaller items.

The layout system arranges content into justified, rating-weighted rows. The V3 bottom-up merge engine (`compose()` / `buildAtomic` in `rowCombination.ts`) has shipped, which retired the old top-down `findDominant` / `TEMPLATE_MAP` / `reorderWithinRows` pipeline. As a result this chapter is mostly history and rationale (the spec, flowcharts, retrospective, and reorder audit are now reference), with a couple of genuinely open items and three parked ideas.

> ✅ **Rendering update ([PR #161](https://github.com/themancalledzac/edens.zac/pull/161), `0160`, 2026-06-03):** the BoxTree is now **server-rendered** — the layout utils were confirmed pure (zero DOM access) and are called from the RSC with `userAgent()`-derived viewport defaults, so the first paint is real server HTML instead of an empty `rows=[]` measuring pass. This is a _rendering/perf_ change (tracked in [002 · Performance](002-performance.md)), not an algorithm change — the V3 `compose()` engine is untouched. It does close the long-standing "blank-on-load void."

> ✅ **Mobile density fix ([PR #167](https://github.com/themancalledzac/edens.zac/pull/167), `0165`, `3b8cf2c`):** the density filter now actually works and is confined to the 1–5 range on mobile (`mobileDensity` tests added). Small `contentLayout.ts` change — covers one slice of the "automatic density by collection size" tuning note below.

## Remaining work (deduped)

- 🟢 **Directional prominence (unified value model) — the big open layout refactor (next steps).** Replace the orientation-biased value model (the `−1` vertical penalty + the `arFactor` cap + the **two competing wide-panorama mechanisms** — `isFullWidthHero` on branch `0180` and the `getComponentValue` AR ramp on `0179`) with **one orientation-agnostic prominence `P`**, decomposed by each image's own AR into a width demand `Hv = √(P·AR)` (Stage-1 packing) and a height demand `Vv = √(P/AR)` (per-row target AR / row height). Effect: a 5★ portrait commands the same visual _area_ as a 5★ landscape (only the shape differs), so rating drives size across the whole page for verticals and panoramas symmetrically — "panorama gets its own row" and "portrait gets full height" both become **emergent**, retiring the special-case rules rather than adding more. Full 5-phase TDD plan (P into the equity metric → per-row target AR → pack by `Hv` + retire `isFullWidthHero` + strip the penalty → relax the AR floor for hero-vertical rows): [2026-06-09-directional-prominence](superpowers/plans/2026-06-09-directional-prominence.md). Decided 2026-06-09: unified model, all phases incl. floor relaxation, new branch off `main`. **Supersedes the Stage-1 `arFactor`/vertical-penalty nit below.**
  - ⚠️ **Reproduced motivating bug (2026-06-10, `/oval-lakes?manage=1`):** in a row `V4★, H3★, V4★, V5★, V5★` the two 5★ verticals render the **smallest** (276×485, area 134k) while a lone 4★ vertical renders **biggest** (552×982, area 543k). **Counterfactual proves the current plan does not fix this:** removing the vertical penalty (so V5★ has the highest `cv`) produces *byte-for-byte identical* sizes — penalty-free ratings `[4,3,4,5,5]` still point-balance-split into `left[V4,H3,V4]/right[V5,V5]`, so the two heroes stay grouped and `vStack`-crushed. The failure is **Phase-1 tree STRUCTURE**, which only Phase 3.2 touches (penalty rating) and which doesn't change the grouping here. ⇒ The plan needs an added **hero-isolation / structural** step (give a top-prominence vertical its own full-height column — the vertical analogue of `isFullWidthHero`). Full diagnosis + numbers: [rowCombination.md → "Known limitation"](../app/utils/rowCombination.md); upgraded as **Issue #4 (Reachability)** in the plan.
- **Lone-last-row image sizing — RECONCILE the duplicate designs.** [005-end-row-gap](superpowers/plans/005-end-row-gap.md) (a trailing "gap" spacer box) and the redesign spec [§13 FILLER atom](superpowers/specs/005-row-composition-redesign.md) solve the SAME problem two different ways. Pick ONE, then implement it with TDD.
- **Confirm the `/tylerabby` reorder bug is dead under V3.** Its old fix target `reorderWithinRows` was deleted with the V3 cutover, so the swap should no longer be reachable — verify, then add the "vertical penalty = sizing only, not ordering" comment at `contentRatingUtils.ts`.
- **Fold the reorder scenario fixtures into the layout property/characterization tests**, which live in chapter 006 ([006-property-based-tests](superpowers/plans/006-property-based-tests.md)) — not here.
- **Stage-1 (`buildRows`) tuning nits** (carried over from the old `todo-random` catch-all): the `arFactor`-cap lift and the vertical-penalty-vs-AR decision are **now folded into the directional-prominence plan above** (its Phase 0/3). What remains here as small independent nits: remove the dead standalone-skip branch and revisit the moderate-overfill ceiling. Detail in the [redesign spec §8](superpowers/specs/005-row-composition-redesign.md).

## Sections

| Section                                                                          | Role      | Status |
| -------------------------------------------------------------------------------- | --------- | ------ |
| [Directional Prominence (unified value model)](superpowers/plans/2026-06-09-directional-prominence.md) | plan | 🟢 next |
| [Row Composition Redesign](superpowers/specs/005-row-composition-redesign.md)    | spec      | 📘     |
| [Database → Row Flowcharts](superpowers/specs/005-row-composition-flowcharts.md) | reference | 📘     |
| [Row Composition Retrospective](spikes/005-row-composition-retrospective.md)     | reference | 📘     |
| [Image Reorder Audit & Fix Plan](spikes/005-image-reorder-audit.md)              | reference | 📘     |
| [End-Row Gap Component](superpowers/plans/005-end-row-gap.md)                    | plan      | 🟢     |
| [Mobile Text Overlay Experiment](superpowers/plans/005-mobile-text-overlay.md)   | idea      | 🗒️     |
| [Pattern Tree Exploration](spikes/005-pattern-tree-exploration.md)               | idea      | 🗒️     |
| [WFC Mosaic Exploration](spikes/005-wfc-mosaic-exploration.md)                   | idea      | 🗒️     |

## Blocked on / open

- **Directional prominence is the next layout build** (plan written, not started). It retires the in-flight `isFullWidthHero` work on branch `0180` and the `arFactor` ramp on `0179` — whoever picks it up must branch off `main` and not merge those special-cases forward, or the panorama promotion double-fires.
- The two end-of-row designs (gap-box vs FILLER atom) are a known duplicate ⚠ — they must be reconciled to ONE approach before either is built.
- The image-reorder audit's fix target (`reorderWithinRows`) is already deleted under V3, so that section is now reference/verification rather than active work.
- Pattern Tree is effectively OBSOLETE — V3 deleted the `TEMPLATE_MAP` it was built to replace. Mobile-text-overlay and WFC-mosaic are unscheduled ideas (low-priority experiment and a fun future display mode, respectively).

---

_↑ [Back to the book](000-summary.md)._
