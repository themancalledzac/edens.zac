# 005 · Layout

> BoxTree / row-composition engine · the V3 algorithm **and** the directional-prominence value-model refactor have both shipped, so most sections are durable reference. Remaining work is a few smaller items (last-row reconciliation, a possible hero-isolation follow-up).

The layout system arranges content into justified, rating-weighted rows. The V3 bottom-up merge engine (`compose()` / `buildAtomic` in `rowCombination.ts`) has shipped, which retired the old top-down `findDominant` / `TEMPLATE_MAP` / `reorderWithinRows` pipeline. As a result this chapter is mostly history and rationale (the spec, flowcharts, retrospective, and reorder audit are now reference), with a couple of genuinely open items and three parked ideas.

> ✅ **Rendering update ([PR #161](https://github.com/themancalledzac/edens.zac/pull/161), `0160`, 2026-06-03):** the BoxTree is now **server-rendered** — the layout utils were confirmed pure (zero DOM access) and are called from the RSC with `userAgent()`-derived viewport defaults, so the first paint is real server HTML instead of an empty `rows=[]` measuring pass. This is a _rendering/perf_ change (tracked in [002 · Performance](002-performance.md)), not an algorithm change — the V3 `compose()` engine is untouched. It does close the long-standing "blank-on-load void."

> ✅ **Mobile density fix ([PR #167](https://github.com/themancalledzac/edens.zac/pull/167), `0165`, `3b8cf2c`):** the density filter now actually works and is confined to the 1–5 range on mobile (`mobileDensity` tests added). Small `contentLayout.ts` change — covers one slice of the "automatic density by collection size" tuning note below.

## Remaining work (deduped)

- ✅ **Directional prominence (unified value model) — SHIPPED ([PR #182](https://github.com/themancalledzac/edens.zac/pull/182), `0182`).** Replaced the orientation-biased value model (the `−1` vertical penalty + the `arFactor` cap + the two competing wide-panorama mechanisms `isFullWidthHero` / `getComponentValue` AR ramp) with **one orientation-agnostic prominence `P`** (`app/utils/contentRatingUtils.ts` → `getProminence`), decomposed by each image's own AR into a width cost `Hv = √(P·AR)` (Stage-1 packing) and a height demand `Vv = √(P/AR)` (per-row target AR / row height). The vertical penalty, the retired `cv` model (`getComponentValue`/`PANORAMA_*`), and `isFullWidthHero` were all removed. Effect: a 5★ portrait commands the same visual _area_ as a 5★ landscape — "panorama gets its own row" and "portrait gets full height" are now **emergent**. Reference plan: [2026-06-09-directional-prominence](superpowers/plans/2026-06-09-directional-prominence.md).
  - ⚠️ **Possible follow-up — hero-isolation (verify against current code).** The plan noted a motivating bug (`/oval-lakes`: two 5★ verticals rendering smaller than a lone 4★ vertical) attributed to Phase-1 tree **structure** (grouping), not the value model — so it may persist even after the prominence rewrite. If a top-prominence vertical still gets grouped and `vStack`-crushed, the fix is a structural hero-isolation step (give it its own full-height column). Confirm current behavior before treating this as open. Diagnosis: [rowCombination.md → "Known limitation"](../app/utils/rowCombination.md).
- **Lone-last-row image sizing — RECONCILE the duplicate designs.** [005-end-row-gap](superpowers/plans/005-end-row-gap.md) (a trailing "gap" spacer box) and the redesign spec [§13 FILLER atom](superpowers/specs/005-row-composition-redesign.md) solve the SAME problem two different ways. Pick ONE, then implement it with TDD.
- **Confirm the `/tylerabby` reorder bug is dead under V3.** Its old fix target `reorderWithinRows` was deleted with the V3 cutover, so the swap should no longer be reachable — verify, then add the "vertical penalty = sizing only, not ordering" comment at `contentRatingUtils.ts`.
- **Fold the reorder scenario fixtures into the layout property/characterization tests**, which live in chapter 006 ([006-property-based-tests](superpowers/plans/006-property-based-tests.md)) — not here.
- **Stage-1 (`buildRows`) tuning nits** (carried over from the old `todo-random` catch-all): the `arFactor`-cap lift and the vertical-penalty-vs-AR decision are **now folded into the directional-prominence plan above** (its Phase 0/3). What remains here as small independent nits: remove the dead standalone-skip branch and revisit the moderate-overfill ceiling. Detail in the [redesign spec §8](superpowers/specs/005-row-composition-redesign.md).

## Sections

| Section                                                                                                | Role      | Status            |
| ------------------------------------------------------------------------------------------------------ | --------- | ----------------- |
| [Directional Prominence (unified value model)](superpowers/plans/2026-06-09-directional-prominence.md) | plan      | ✅ shipped (#182) |
| [Row Composition Redesign](superpowers/specs/005-row-composition-redesign.md)                          | spec      | 📘                |
| [Database → Row Flowcharts](superpowers/specs/005-row-composition-flowcharts.md)                       | reference | 📘                |
| [Row Composition Retrospective](spikes/005-row-composition-retrospective.md)                           | reference | 📘                |
| [Image Reorder Audit & Fix Plan](spikes/005-image-reorder-audit.md)                                    | reference | 📘                |
| [End-Row Gap Component](superpowers/plans/005-end-row-gap.md)                                          | plan      | 🟢                |
| [Mobile Text Overlay Experiment](superpowers/plans/005-mobile-text-overlay.md)                         | idea      | 🗒️                |
| [Pattern Tree Exploration](spikes/005-pattern-tree-exploration.md)                                     | idea      | 🗒️                |
| [WFC Mosaic Exploration](spikes/005-wfc-mosaic-exploration.md)                                         | idea      | 🗒️                |

## Blocked on / open

- **Directional prominence shipped** ([PR #182](https://github.com/themancalledzac/edens.zac/pull/182), `0182`) — the unified `P`/`Hv`/`Vv` value model is live and the old vertical penalty / `arFactor` / `isFullWidthHero` mechanisms were retired. A structural hero-isolation follow-up may remain (see above); verify against current code.
- The two end-of-row designs (gap-box vs FILLER atom) are a known duplicate ⚠ — they must be reconciled to ONE approach before either is built.
- The image-reorder audit's fix target (`reorderWithinRows`) is already deleted under V3, so that section is now reference/verification rather than active work.
- Pattern Tree is effectively OBSOLETE — V3 deleted the `TEMPLATE_MAP` it was built to replace. Mobile-text-overlay and WFC-mosaic are unscheduled ideas (low-priority experiment and a fun future display mode, respectively).

---

_↑ [Back to the book](000-summary.md)._
