# 005 · Layout

> BoxTree / row-composition engine · the V3 algorithm **and** the directional-prominence value-model refactor have both shipped, so most sections are durable reference — a couple of smaller open items remain.

The layout system arranges content into justified, rating-weighted rows. The V3 bottom-up merge engine (`compose()` / `buildAtomic` in `rowCombination.ts`) has shipped, which retired the old top-down `findDominant` / `TEMPLATE_MAP` / `reorderWithinRows` pipeline. As a result this chapter is mostly history and rationale (the spec, flowcharts, retrospective, and reorder audit are now reference), with a couple of genuinely open items and three parked ideas.

> ✅ **Rendering update ([PR #161](https://github.com/themancalledzac/edens.zac/pull/161), `0160`, 2026-06-03):** the BoxTree is now **server-rendered** — the layout utils were confirmed pure (zero DOM access) and are called from the RSC with `userAgent()`-derived viewport defaults, so the first paint is real server HTML instead of an empty `rows=[]` measuring pass. This is a _rendering/perf_ change (tracked in [002 · Performance](002-performance.md)), not an algorithm change — the V3 `compose()` engine is untouched. It does close the long-standing "blank-on-load void."

> ✅ **Mobile density fix ([PR #167](https://github.com/themancalledzac/edens.zac/pull/167), `0165`, `3b8cf2c`):** the density filter now actually works and is confined to the 1–5 range on mobile (`mobileDensity` tests added). Small `contentLayout.ts` change — covers one slice of the "automatic density by collection size" tuning note below.

## Remaining work (deduped)

- ✅ **Directional prominence (unified value model) — shipped ([#182](https://github.com/themancalledzac/edens.zac/pull/182)).** Replaced the orientation-biased value model (the `−1` vertical penalty + the `arFactor` cap + the **two competing wide-panorama mechanisms** — `isFullWidthHero` and the `getComponentValue` AR ramp) with **one orientation-agnostic prominence `P`**, decomposed by each image's own AR into a width demand `Hv = √(P·AR)` (Stage-1 packing) and a height demand `Vv = √(P/AR)` (per-row target AR / row height). A 5★ portrait now commands the same visual _area_ as a 5★ landscape (only the shape differs), so rating drives size across the whole page for verticals and panoramas symmetrically. Followed by **#183 collection-fixes** and **#184 area-to-value layout**, which superseded the plan's Issue #4 (Reachability) — the motivating hero-isolation bug (two 5★ verticals rendering smaller than a lone 4★ vertical) is resolved per the area-to-value spec rather than via a separate structural hero-isolation step. Plan: [2026-06-09-directional-prominence](superpowers/plans/2026-06-09-directional-prominence.md) (archived — shipped). Retired in `905801f`: `isFullWidthHero`, the vertical penalty, `getComponentValue`/PANORAMA caps.
- ✅ **#185 related-collections row redesign — shipped** (`563ee08`).
- **Lone-last-row image sizing — RECONCILE the duplicate designs.** [005-end-row-gap](superpowers/plans/005-end-row-gap.md) (a trailing "gap" spacer box) and the redesign spec [§13 FILLER atom](superpowers/specs/005-row-composition-redesign.md) solve the SAME problem two different ways. Pick ONE, then implement it with TDD.
- **Confirm the `/tylerabby` reorder bug is dead under V3.** Its old fix target `reorderWithinRows` was deleted with the V3 cutover, so the swap should no longer be reachable — verify, then add the "vertical penalty = sizing only, not ordering" comment at `contentRatingUtils.ts`.
- **Fold the reorder scenario fixtures into the layout property/characterization tests**, which live in chapter 006 ([006-property-based-tests](superpowers/plans/006-property-based-tests.md)) — not here.

## Sections

| Section                                                                          | Role      | Status |
| -------------------------------------------------------------------------------- | --------- | ------ |
| [Row Composition Redesign](superpowers/specs/005-row-composition-redesign.md)    | spec      | 📘     |
| [Database → Row Flowcharts](superpowers/specs/005-row-composition-flowcharts.md) | reference | 📘     |
| [Row Composition Retrospective](spikes/005-row-composition-retrospective.md)     | reference | 📘     |
| [Image Reorder Audit & Fix Plan](spikes/005-image-reorder-audit.md)              | reference | 📘     |
| [End-Row Gap Component](superpowers/plans/005-end-row-gap.md)                    | plan      | 🟢     |
| [Mobile Text Overlay Experiment](superpowers/plans/005-mobile-text-overlay.md)   | idea      | 🗒️     |
| [Pattern Tree Exploration](spikes/005-pattern-tree-exploration.md)               | idea      | 🗒️     |
| [WFC Mosaic Exploration](spikes/005-wfc-mosaic-exploration.md)                   | idea      | 🗒️     |

## Blocked on / open

- The two end-of-row designs (gap-box vs FILLER atom) are a known duplicate ⚠ — they must be reconciled to ONE approach before either is built.
- The image-reorder audit's fix target (`reorderWithinRows`) is already deleted under V3, so that section is now reference/verification rather than active work.
- Pattern Tree is effectively OBSOLETE — V3 deleted the `TEMPLATE_MAP` it was built to replace. Mobile-text-overlay and WFC-mosaic are unscheduled ideas (low-priority experiment and a fun future display mode, respectively).

---

_↑ [Back to the book](000-summary.md)._
