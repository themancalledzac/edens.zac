# Prominence-Based Layout System — Design Spec

> **Status:** Draft — awaiting user review
> **Date:** 2026-03-30
> **Replaces:** The failed bottom-up atomic composition attempt (reverted same day)
> **Scope:** Row fill algorithm, composition system, cv formula, size constraints

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Design Goals](#2-design-goals)
3. [Critical Review of the Proposal](#3-critical-review-of-the-proposal)
4. [What We Keep](#4-what-we-keep)
5. [What We Change](#5-what-we-change)
6. [Proposed Approaches](#6-proposed-approaches)
7. [Recommended Design: Weight-Budget System](#7-recommended-design-weight-budget-system)
8. [Migration Path](#8-migration-path)
9. [Open Questions for User](#9-open-questions-for-user)

---

## 1. Problem Statement

### 1a. The hero problem

A horizontal 5★ image occupies the **entire row width**. This is the single most impactful visual decision in the layout, and it's wrong for most collections. In `enchantments-2020`, over half the images are 5★, which means over half the page is hero rows — monotonous, scroll-heavy, and it buries the rhythm of the collection.

**Root cause:** `cv = rowWidth / itemsPerRow` where `itemsPerRow = 6 - effectiveRating`. For effectiveRating=5: `itemsPerRow=1`, so `cv=5.0`, which equals `rowWidth=5`, making the image fill the entire row by itself. There's no way for another image to join that row.

### 1b. The ordering problem (partially solved)

The 6 ordering fixes from today's session are correct. Images within rows were being shuffled by sorts in `buildAtomic`, `buildNestedQuad`, and `generatePartitionCandidates`. These sorts are removed. The dominant placement is now positional (based on original index). This is done and working.

**Remaining:** The `slotCountComplete` expansion can pull a hero-worthy image into a multi-image row (the DSC_6643 bug). This is a separate bug that needs fixing regardless of which design we choose.

### 1c. The density problem

Rows are thin. Most rows contain 2–4 images laid out as a flat horizontal chain. The `hChain` fallback produces a flat `hPair(hPair(a, b), c)` tree, which gives every image the same height. There's no vertical stacking happening unless the template map specifically routes to `buildDominantStacked` or `buildNestedQuad`. The result: rows are too short, images are too small, and the page feels like a spreadsheet of thumbnails punctuated by giant heroes.

### 1d. The scaling problem

The `chunkSize`/`rowWidth` parameter (5 for desktop, 2 for mobile) controls how many images fit per row, but it's a blunt instrument. Changing it from 5 to 8 wouldn't help because cv values would scale proportionally — a 5★ image would still consume `8/1 = 8.0` of 8.0 budget. The fundamental issue is that the cv formula maps rating to "what fraction of the row should this image fill," and for 5★ that fraction is always 100%.

---

## 2. Design Goals

1. **5★ images share rows.** A 5★ horizontal should occupy ~70–80% of a row, not 100%. It can sit next to a small vertical or a stacked pair.
2. **More images per row.** Rows should commonly contain 3–6 images via vertical stacking, not just 2–4 in a flat chain.
3. **Taller rows.** Vertical stacking (atoms → molecules) produces taller, denser rows. The page should feel like a curated gallery, not a film strip.
4. **Rating controls prominence, not isolation.** Higher-rated images are visually larger (more pixel area), but they're not quarantined into solo rows.
5. **Natural reading order preserved.** Left-to-right, top-to-bottom, same as English. No rating-based reordering.
6. **Atomic design preserved.** single → hPair/vStack → compose. The tree structure stays. We're changing the inputs and constraints, not the tree algebra.
7. **Scalable density.** Collections with few images → bigger images, more space. Collections with many images → smaller images, denser rows. The user controls this (or it's automatic based on collection size).
8. **Mobile still works.** Same pipeline, different parameters.

---

## 3. Critical Review of the Proposal

### What works

**"Max size" instead of "max count" is the right mental model.** The user's instinct is correct: controlling image prominence through size constraints rather than row-item-count constraints is more natural and produces better layouts. A 5★ image that's "at least 75% of row width" is a more meaningful constraint than "1 item per row."

**More vertical stacking.** The current system barely uses vStack. `buildDominantStacked` handles 2H+1V and 1H+2V. `buildNestedQuad` handles 3V+1H and 4V. Everything else falls through to `hChain` or `compose`, which often picks `hPair` (flat horizontal). Adding more vertical composition would make rows denser and more interesting.

**Limiting 5★ images per collection.** This is a curation decision, not a layout decision, and it's a good one. If only 3–5 images per collection are 5★, the layout algorithm has more room to create visual rhythm. This is upstream of the layout system and independent of it.

### What needs refinement

**The percentage model mixes incompatible units.** The proposal says H5★ should be "at least 75% width" and V5★ should be "at most 75–85% height." Width and height are different axes. In the current system, height is *derived* from width via aspect ratio — you can't independently constrain both. If a horizontal image is 75% of row width, its height is `0.75 * rowWidth / AR`. If a vertical image is 85% of row height, what's row height? Row height isn't known until all images in the row are composed.

**The solution (revised after further analysis — see section 7.2a):** Width fraction alone is NOT sufficient. A vertical image at 50% width produces a row 4× taller than a horizontal at 50% width. The real unit of prominence is **visual area**, which is AR-dependent. The cv formula must account for aspect ratio, not just rating. See section 7.2a for the AR-aware cv approach.

**"At least" vs "at most" creates conflicts.** If H5★ is "at least 75%" and H4★ is "at most 50%," what happens when they're in the same row? 75% + 50% = 125% > 100%. The constraints need to be *targets* that the layout engine optimizes toward, not hard walls that must be satisfied simultaneously.

**The proposal doesn't address how rows get *filled*.** Saying "5★ is at least 75%" tells us the constraint, but not the algorithm. How do we decide which images go together? The current greedy fill works by summing cv until the row is full. If we change cv for 5★ from 5.0 to 3.75 (75% of 5), a 5★ image no longer fills a row — but what fills the remaining 25%? A 1★ image has cv=1.0 (20%), a 2★ has cv=1.25 (25%). So a row could be: H5★(75%) + H2★(25%) = 100%. That works — but only because the cv formula happens to produce complementary values. We need a deliberate algorithm, not accidental arithmetic.

**"More images per row" and "images should be bigger" for high-rated ones are in tension.** If 5★ images occupy 75% of a row, you can fit maybe 1–2 more small images. To get 5–6 images per row, you need lower-rated images with lower-rated neighbors, which already happens for 2–3★ images. The visual variety will come from rows having different densities (hero row with 2 images, dense row with 5–6), not from every row having many images.

### What doesn't work

**Increasing `rowWidth` alone won't help.** If we bump `rowWidth` from 5 to 8 or 10, the cv formula scales proportionally, and we're back where we started. The fix has to change the *relationship* between rating and cv, not the overall budget.

**The bottom-up merge approach (the one we reverted) was the wrong direction.** It threw out the template map, findDominant, and all the H/V-aware composition logic. The atomic design system's strength is that it knows about orientation (H vs V) and uses that to build intelligent compositions (dominant-stacked, nested-quad). A generic "merge lowest-rated pair" algorithm loses all that domain knowledge. The correct approach is to keep the template map and smart composition, but change the *inputs* (cv values, row fill strategy) and add *more* templates for denser compositions.

---

## 4. What We Keep

| Component | Why |
|-----------|-----|
| `AtomicComponent` tree (`single`, `pair` with H/V direction) | Core data structure — sound and flexible |
| `BoxTree` → `calculateSizesFromBoxTree` pipeline | Proven pixel-sizing logic |
| `TEMPLATE_MAP` routing by `(hCount, vCount)` | Domain knowledge about H/V composition is valuable |
| `buildDominantStacked` and `buildNestedQuad` | These produce good dense layouts — we want MORE of this, not less |
| `findDominant` | Still useful for placing the most important image prominently |
| `compose()` recursive dispatcher | Good general-purpose fallback for unusual counts |
| `buildRows` greedy fill structure | The greedy sequential fill is fundamentally sound |
| `optimizeBoundaries` | Boundary smoothing is independent of composition changes |
| `estimateRowAR` / AR floor check | Prevents too-narrow rows |
| The 6 ordering fixes from today | Correct and working |

## 5. What We Change

| Component | Change | Why |
|-----------|--------|-----|
| **cv formula** (`getComponentValue`) | AR-aware formula: rating × AR factor determines cv | Width fraction alone fails — verticals at same width are 4× taller. cv must account for AR. |
| **`rowWidth` budget** | Increase from 5 to 8 (desktop) | More granular budget allows finer-grained compositions |
| **Template map** | Add entries for 5–8 item compositions | Currently only covers 1–5 items; denser rows need templates |
| **`buildAtomic`** | Expand to handle 5–6 item groups with more vStack candidates | Currently limited to 3–4 items with limited vStack usage |
| **`compose`** | Add orientation-aware molecule composition (hPair verticals, vStack horizontals) | Currently prefers flat hChain for large groups |
| **`buildRows` hero logic** | Remove the `seqCount===1 → break` shortcut | 5★ images should not auto-break into solo rows |
| **`buildRows` slotCountComplete** | Add hero-skip check (the DSC_6643 fix) | Pre-existing bug |
| **Size constraints** | Add min-width validation after composition | Ensure high-rated images don't get squeezed too small |

---

## 6. Proposed Approaches

### Approach A: "Retune cv" — Minimal change, adjust the formula

Change `getComponentValue` so that 5★ maps to cv=6.0 on a rowWidth=8 budget (75%) instead of cv=5.0 on rowWidth=5 (100%). Everything else scales.

| effectiveRating | Old cv (rw=5) | New cv (rw=8) | Row fraction |
|----------------|---------------|---------------|-------------|
| 5 | 5.0 (100%) | 6.0 (75%) | 75% |
| 4 | 2.5 (50%) | 4.0 (50%) | 50% |
| 3 | 1.67 (33%) | 2.67 (33%) | 33% |
| 2 | 1.25 (25%) | 2.0 (25%) | 25% |
| 0–1 | 1.0 (20%) | 1.33 (17%) | 17% |

**Pros:** Minimal code change. Just the formula + rowWidth constant.
**Cons:** Doesn't solve density. Rows still use flat hChain. No new vertical stacking. The template map doesn't have entries for 6–8 items. The composition system can't build good trees for large groups.

**Verdict:** Necessary but not sufficient. This fixes the hero problem but not the density problem.

### Approach B: "Molecule builder" — Add a vStack-first composition phase

Before `buildRows` fills rows, pre-compose "molecules" — pairs of adjacent low-rated images vStacked together. These molecules have a combined cv and act as single units during row fill.

Example: `[V3★, V2★, H5★, H3★, V2★]` → pre-compose `[vStack(V3★,V2★), H5★, H3★, V2★]` → row fill sees 4 units, not 5.

**Pros:** Creates the vertical density the user wants. Taller rows. More images per row visually.
**Cons:** The molecule composition happens *before* knowing which row the images will be in, so it can't optimize for row AR. It's a separate pass that might conflict with the greedy fill. It also makes the pipeline harder to reason about (3 passes: molecule → fill → optimize).

**Verdict:** Good idea, wrong execution point. The vertical stacking should happen *during* composition, not before row fill.

### Approach C: "Weight-budget with dense composition" — Recommended

**Change the cv formula AND the composition system together.** This is the holistic fix:

1. **New cv formula** on rowWidth=8: 5★=6.0 (75%), 4★=4.0 (50%), 3★=2.67 (33%), 2★=2.0 (25%), 0–1★=1.33 (17%).
2. **Remove the `seqCount===1` hero shortcut** so 5★ images can share rows.
3. **Add dense composition templates** for 5–8 items that use vStack aggressively.
4. **Enhance `compose()` to prefer vStack molecules** when the row has many items.
5. **Add post-composition min-width validation** to prevent high-rated images from being squeezed.
6. **Fix the slotCountComplete hero-skip bug** (DSC_6643).

**Pros:** Solves all three problems (hero, density, ordering). Preserves the template map and atomic design. Additive rather than destructive (we're adding templates and enhancing composition, not ripping anything out).
**Cons:** Larger change. Needs careful testing. The cv formula change affects every row, so characterization tests will need updating.

**Verdict: This is the right approach.** It's evolutionary, not revolutionary. We keep everything that works and change the parts that need changing.

---

## 7. Recommended Design: Weight-Budget System

### 7.1 New Constants

```typescript
// In app/constants/index.ts (LAYOUT section)
desktopSlotWidth: 8,   // was 5 — finer granularity for prominence control
mobileSlotWidth: 3,    // was 2 — allows 3-image rows on mobile

// New: minimum width fractions by effective rating (for post-composition validation)
// These are FLOORS — the layout engine won't squeeze a 5★ below 60% of row width
minWidthFraction: {
  5: 0.60,  // 5★ must occupy at least 60% of row width
  4: 0.35,  // 4★ must occupy at least 35%
  3: 0.20,  // 3★ must occupy at least 20%
  2: 0.10,  // no meaningful constraint below this
  1: 0.05,
  0: 0.05,
},
```

### 7.2 New cv Formula (Base — Rating Only)

> **Important:** This is the base formula. Section 7.2a extends it with AR-awareness.
> The final formula (7.2a) takes `imageAR` as a parameter and applies an AR correction factor.
> Read this section for the rating-based intuition, then 7.2a for the complete solution.

```typescript
// Base formula — rating-only (superseded by 7.2a, shown for intuition)
// Desktop (slotWidth=8):
const TARGET_FRACTIONS: Record<number, number> = {
  5: 0.75,   // 75% → cv=6.0
  4: 0.50,   // 50% → cv=4.0
  3: 0.333,  // 33% → cv=2.67
  2: 0.25,   // 25% → cv=2.0
  1: 0.167,  // 17% → cv=1.33
  0: 0.125,  // 12.5% → cv=1.0
};
```

**What this means for row fill (desktop, rowWidth=8) — before AR correction:**

| Row scenario | Total cv | Fill ratio | Notes |
|-------------|----------|-----------|-------|
| H5★ alone | 6.0 | 75% — underfills | ❌ Not allowed (below MIN_FILL=0.9) |
| H5★ + V2★ | 6.0 + 2.0 = 8.0 | 100% | ✅ Perfect fill |
| H5★ + V1★ + V1★ | 6.0 + 1.33 + 1.33 = 8.66 | 108% | ✅ Within MAX_FILL=1.15 |
| H4★ + H4★ | 4.0 + 4.0 = 8.0 | 100% | ✅ Two 4★ images side by side |
| H3★ + H3★ + H3★ | 2.67 × 3 = 8.0 | 100% | ✅ Three 3★ images |
| H2★ × 4 | 2.0 × 4 = 8.0 | 100% | ✅ Four 2★ images |

**⚠️ But this ignores AR — see next section for why this breaks with verticals.**

**Critical observation:** A 5★ horizontal can **no longer be a solo row**. Its cv=6.0 only gives 75% fill, which is below `MIN_FILL_RATIO=0.9`. The greedy fill MUST pull in at least one more image. This is exactly the behavior we want.

### 7.2a The AR Problem — Why Width Fraction Alone Fails

**This is the single most important insight in this spec.**

The cv formula in 7.2 treats all images equally by rating. But consider what happens when `H5★ (AR=2.0)` and `V5★ (AR=0.5)` both get cv=6.0:

In a row with `H5★ + V2★`, the box tree calculator distributes width by AR ratio:
- H5★ (AR=2.0) gets: `2.0 / (2.0 + 0.67)` = **75% width**
- V2★ (AR=0.67) gets: `0.67 / 2.67` = **25% width**
- Row height: `rowWidth / 2.67` — reasonable.

In a row with `V5★ + H2★`, the box tree distributes:
- V5★ (AR=0.67) gets: `0.67 / (0.67 + 2.0)` = **25% width** — but it's TALL
- H2★ (AR=2.0) gets: `2.0 / 2.67` = **75% width** — but forced to match the vertical's height
- Row height: `rowWidth / 2.67` — same math, but the V5★ at 25% width and this row height is **much taller than wide**, making it feel enormous.

**The core issue:** Width fraction doesn't capture visual weight. A vertical at 25% width with row height 1.5x its width takes up more visual area than a horizontal at 75% width with the same row height.

**Visual area analysis:**

For an image in an hPair, its actual rendered area (relative to row area) is:
```
widthFraction = imageAR / totalRowAR
heightFraction = 1.0 (all images in hPair share row height)
areaFraction = widthFraction × heightFraction = imageAR / totalRowAR
```

So in the `H5★ + V2★` row above:
- H5★ area: 2.0 / 2.67 = **75%** of row area (dominant — good!)
- V2★ area: 0.67 / 2.67 = **25%** (companion — good!)

In the `V5★ + H2★` row:
- V5★ area: 0.67 / 2.67 = **25%** of row area (NOT dominant — bad! The 5★ image looks small)
- H2★ area: 2.0 / 2.67 = **75%** (companion takes most of the area — bad!)

**The vertical penalty already partially addresses this** — V5★ → effectiveRating 4 → cv=4.0 instead of 6.0. But it's a crude -1 adjustment that doesn't reflect the actual AR difference.

#### Solution: AR-Weighted cv

The cv formula should account for aspect ratio to ensure that the *visual area* (not just width) matches the intended prominence.

**Approach: Scale cv by an AR factor.** Images with low AR (vertical) have their cv reduced because they'll take up more vertical space per unit of width. Images with high AR (horizontal) keep their cv as-is.

```typescript
export function getComponentValue(
  effectiveRating: number,
  slotWidth: number,
  imageAR: number  // NEW parameter — actual aspect ratio of the image
): number {
  if (slotWidth <= 3) {
    // Mobile — keep simple, AR factor less impactful on small screens
    if (effectiveRating >= 5) return slotWidth;
    if (effectiveRating >= 4) return 2;
    if (effectiveRating >= 3) return 1.5;
    return 1;
  }

  // Desktop (slotWidth=8):
  const TARGET_FRACTIONS: Record<number, number> = {
    5: 0.75,
    4: 0.50,
    3: 0.333,
    2: 0.25,
    1: 0.167,
    0: 0.125,
  };

  const baseFraction = TARGET_FRACTIONS[Math.min(effectiveRating, 5)] ?? 0.125;

  // AR factor: normalize to a "standard" horizontal AR of 1.5
  // Verticals (AR < 1) get reduced cv → they need less width to be visually prominent
  // Horizontals (AR > 1.5) get slightly increased cv → they need more width
  const REFERENCE_AR = 1.5;
  const arFactor = Math.sqrt(Math.min(imageAR, REFERENCE_AR) / REFERENCE_AR);
  // arFactor examples:
  //   AR=2.0 (wide H):  sqrt(min(2.0,1.5)/1.5) = sqrt(1.0) = 1.00 (capped at reference)
  //   AR=1.5 (standard): sqrt(1.5/1.5) = 1.00
  //   AR=1.0 (square):   sqrt(1.0/1.5) = 0.82
  //   AR=0.67 (portrait): sqrt(0.67/1.5) = 0.67
  //   AR=0.5 (tall V):   sqrt(0.5/1.5) = 0.58

  return slotWidth * baseFraction * arFactor;
}
```

**What this means in practice:**

| Image | Rating | AR | baseFraction | arFactor | cv (rw=8) | Row fraction |
|-------|--------|------|-------------|----------|-----------|-------------|
| H5★ | 5 | 2.0 | 0.75 | 1.00 | **6.0** | 75% |
| H4★ | 4 | 1.8 | 0.50 | 1.00 | **4.0** | 50% |
| V5★(er=4) | 4 | 0.67 | 0.50 | 0.67 | **2.67** | 33% |
| H3★ | 3 | 1.5 | 0.333 | 1.00 | **2.67** | 33% |
| V4★(er=3) | 3 | 0.67 | 0.333 | 0.67 | **1.78** | 22% |
| H2★ | 2 | 2.0 | 0.25 | 1.00 | **2.0** | 25% |
| V3★(er=2) | 2 | 0.5 | 0.25 | 0.58 | **1.16** | 14.5% |
| V1★(er=0) | 0 | 0.67 | 0.125 | 0.67 | **0.67** | 8% |

**Key improvement:** V5★ (effectiveRating=4, AR=0.67) now gets cv=2.67 instead of 4.0. In a row with H4★, the total is 4.0+2.67=6.67 (83% fill). That leaves room for a small image. And the V5★'s narrow width + tall height gives it visual area comparable to the H4★ — true parity.

**Row scenarios with AR-weighted cv:**

| Row | Total cv | Fill | Visual balance |
|-----|----------|------|---------------|
| H5★(6.0) + V3★(1.16) + V2★(0.67) | 7.83 | 98% | H5★ dominates width, verticals add density beside it |
| H4★(4.0) + V5★(2.67) + V1★(0.67) | 7.34 | 92% | H4★ and V5★ share similar visual area |
| V4★(1.78) + V3★(1.16) + H3★(2.67) + H2★(2.0) | 7.61 | 95% | Mixed — verticals tall and narrow, horizontals wide and short |
| H3★(2.67) + H3★(2.67) + H3★(2.67) | 8.0 | 100% | Three equal horizontals |

#### Impact on Molecule Strategy (Section 7.5)

The AR-aware cv changes which molecule strategies make sense:

- **Two verticals side by side** (`hPair`): Combined AR = AR_a + AR_b ≈ 1.33. This makes a roughly-square molecule. **This is good** — it "normalizes" verticals into a wider shape.
- **Two horizontals stacked** (`vStack`): Combined AR = 1/(1/AR_a + 1/AR_b) ≈ 0.75. This makes a portrait-ish molecule. **This adds height/density** to a row.
- **Vertical + horizontal stacked** (`vStack`): Creates an intermediate AR.

**The molecule strategy must be orientation-aware:**
- Vertical pairs → prefer `hPair` (side by side) — normalizes their AR
- Horizontal pairs → prefer `vStack` (stacked) — adds density
- Mixed pairs → try both, pick best AR fit

This is a significant refinement from the naive "always vStack molecules" in the original spec.

### 7.3 buildRows Changes

The greedy fill algorithm stays mostly the same. Key changes:

**Remove the `seqCount===1` hero shortcut (line 771–773).** Currently, when a single item fills `>= MIN_FILL_RATIO`, it auto-breaks as a hero. With the new cv formula, 5★ items cv=6.0/8=0.75 won't trigger this (below 0.9). But we still need to remove the shortcut for correctness — even if an item *could* fill a row alone, we should still check AR and potentially add more items for density.

**Actually**: we should keep the shortcut but raise its threshold. A single item should only become a hero if `cv / rowWidth >= 0.95` (nearly full width). In the new formula, no image reaches this threshold on desktop, so heroes become opt-in via the standalone promotion path only.

**Fix the slotCountComplete hero-skip bug.** In the `slotCountComplete` expansion loop, before adding an item, check:
```typescript
if (cv / rowWidth >= MIN_FILL_RATIO) {
  // This item is hero-worthy — don't swallow it into a multi-image row
  break;
}
```
This prevents DSC_6643 (cv=5.0 old / cv=6.0 new) from being pulled into someone else's row.

**Note:** With the new cv formula, this bug affects different ratings. A 5★ (cv=6.0) on rowWidth=8 has fill ratio 0.75 — below `MIN_FILL_RATIO=0.9` — so the existing `cv / rowWidth >= MIN_FILL_RATIO` guard from the standalone promotion path won't protect it. We need a different guard: check if adding this item would give it *less* prominence than its rating deserves. Specifically: if the item's cv would become less than `minWidthFraction[rating] * rowWidth` in the expanding row, skip it.

**Simpler alternative:** In the `slotCountComplete` loop, check if the next item's effectiveRating ≥ 4. If so, don't swallow it — let it start a new row where it can be properly composed. This is a coarser but more robust guard.

### 7.4 Dense Composition Templates

The template map currently has entries for 1–5 items. With rowWidth=8, rows will commonly have 4–7 images. We need templates for these counts that use vertical stacking.

**Philosophy:** The composition should build "molecules" from adjacent pairs, but the molecule type depends on orientation:
- **Vertical pairs → hPair** (side by side): Two narrow/tall images become one wider unit
- **Horizontal pairs → vStack** (on top): Two wide/short images become one taller unit
- **Mixed pairs → try both**, pick best AR fit for the row

This is the atom → molecule → row pattern, and it's **orientation-aware** — the same principle as the template map's H/V routing, extended to larger groups.

**New template patterns for 5–8 items:**

```
5 items (2H+3V): H(dominant, H(Va,Vb), Vc)       — dominant + hPaired verticals + single V
5 items (3H+2V): H(V(Ha,Hb), Hc, H(Vd,Ve))       — vStacked Hs + single H + hPaired Vs

6 items (3H+3V): H(V(Ha,Hb), H(Va,Vb), V(Hc,Hd)) — alternating stacked/paired molecules
6 items (6V):    H(H(Va,Vb), H(Vc,Vd), H(Ve,Vf)) — three hPaired vertical molecules

7 items (4H+3V): H(V(Ha,Hb), V(Hc,Hd), H(Va,Vb), Vc) — two vStacked H molecules + hPaired Vs + single
7 items (3H+4V): H(Ha, H(Va,Vb), V(Hb,Hc), H(Vc,Vd)) — dominant H + mixed molecules

8 items (4H+4V): H(V(Ha,Hb), H(Va,Vb), V(Hc,Hd), H(Vc,Vd)) — four alternating molecules
8 items (8V):    H(H(Va,Vb), H(Vc,Vd), H(Ve,Vf), H(Vg,Vh)) — four hPaired vertical molecules
```

These won't all be static template entries — `compose()` will generate candidates dynamically using the orientation-aware molecule strategy. But the *principle* is: **normalize orientations first (hPair verticals, vStack horizontals), then combine molecules horizontally.**

### 7.5 Enhanced compose() — Orientation-Aware Molecule Strategy

The current `compose()` for n≥5 tries:
1. dominant + rest (flat)
2. partition splits (left/right halves)

The enhanced version adds a third strategy: **orientation-aware molecule composition**.

```
Molecule composition strategy:
1. Scan adjacent image pairs
2. For each pair, choose molecule type by orientation:
   - Both vertical → hPair (side by side — widens them)
   - Both horizontal → vStack (on top — adds density/height)
   - Mixed → try both, pick better AR fit
3. hPair the resulting molecules together
4. Score against targetAR like all other candidates
```

**Why orientation matters for molecules:**

| Molecule type | Input AR | Output AR | Effect |
|--------------|----------|-----------|--------|
| hPair(V, V) | 0.67, 0.67 | **1.33** | Two tall/narrow → one wide/short ✅ |
| vStack(V, V) | 0.67, 0.67 | **0.33** | Two tall/narrow → one taller/narrower ❌ |
| vStack(H, H) | 2.0, 2.0 | **1.0** | Two wide/short → one square (adds height) ✅ |
| hPair(H, H) | 2.0, 2.0 | **4.0** | Two wide/short → one extremely wide ❌ |

The wrong molecule type makes the composition *worse*, not better. This is why the naive "always vStack" approach fails — it works for horizontals but destroys verticals.

**Implementation:** This is a new `generateMoleculeCandidates()` function that sits alongside `generatePartitionCandidates`. Both produce candidate trees; `pickBest` selects the winner by AR distance. No special-casing needed — the AR scoring naturally picks the orientation-appropriate molecule strategy.

**Key insight:** We don't need to force molecule composition. We add it as a *candidate strategy*, and the AR-scoring picks it when it produces better AR fit. The orientation-awareness guides which molecule types are generated as candidates, but the final selection is still AR-based.

### 7.6 Post-Composition Min-Width Validation

After `lookupComposition` builds the tree, walk the tree and check that each leaf's effective width fraction meets the minimum for its rating. This is a *validation* step, not a layout step — it detects bad compositions, not creates good ones.

```typescript
function validateMinWidths(
  tree: BoxTree,
  totalWidth: number,
  minWidthFractions: Record<number, number>
): boolean {
  // Walk the tree, calculate each leaf's width as fraction of totalWidth
  // If any leaf violates its rating's minimum, return false
  // Caller can then try a different composition or accept the result
}
```

**When validation fails:** Log a warning (for debugging) but accept the composition. The min-width constraints are *soft* — they guide composition choice but don't block rendering. In practice, violations should be rare because the cv formula already ensures high-rated images get proportional row budget.

### 7.7 Ordering Guarantees

All 6 ordering fixes from today are preserved. Additionally:

- **Molecule composition preserves order.** When pairing adjacent images into molecules, pairs are (0,1), (2,3), (4,5) — never shuffled.
- **compose() partition splits preserve order.** Left group = first N items, right group = remaining — already the case after today's fix.
- **findDominant placement is positional.** Dominant goes left if it was in the first half of the input, right otherwise — already fixed today.

### 7.8 Density Scaling

The user wants collections with few images to show bigger images, and collections with many images to show smaller, denser images.

**Mechanism:** The `targetAR` parameter already controls this. Higher `targetAR` = wider/shorter rows = more images per row. Lower `targetAR` = taller rows = fewer images per row.

Currently: `targetAR = clamp(contentWidth / viewportHeight, 1.5, 3.0)`.

We can add a density multiplier based on collection size:

```typescript
const baseTAR = clamp(contentWidth / viewportHeight, 1.5, 3.0);
const densityMultiplier = collectionSize <= 20 ? 0.85
                        : collectionSize <= 50 ? 1.0
                        : 1.15;
const targetAR = baseTAR * densityMultiplier;
```

Small collections (≤20 images) get a lower targetAR → taller rows → bigger images.
Large collections (50+) get a higher targetAR → wider rows → more images per row.

**This is optional and can be added later.** The cv formula change + molecule composition are the primary improvements.

### 7.9 Mobile Behavior

With `mobileSlotWidth=3`:

| effectiveRating | cv (mobile) | Items per row |
|----------------|-------------|---------------|
| 5 | 3.0 | 1 (hero — full width) |
| 4 | 2.0 | 1–2 |
| 3 | 1.5 | 2 |
| 2 | 1.0 | 3 |
| 0–1 | 1.0 | 3 |

5★ images are still full-width heroes on mobile (cv=3.0 = slotWidth). This is correct — on a narrow screen, you want your best images to be prominent. The density changes apply primarily to desktop.

### 7.10 Visual Examples (Text-Based)

**Current (rowWidth=5):**
```
Row 1: [=============== H5★ ================]          ← full width hero, entire row
Row 2: [======= H4★ =======][==== H4★ =====]          ← two images, flat
Row 3: [==== H3★ ====][==== H3★ ====][= H3★ =]       ← three images, flat
Row 4: [== H2★ ==][== H2★ ==][== H2★ ==][H2★]        ← four images, flat
```

All rows are the same short height. Monotonous strip layout.

**Proposed (rowWidth=8, AR-aware cv):**

```
Row 1:  [=========== H5★ ===========][V3★]            ← H5★ dominates width (~75%)
        [=========== H5★ ===========][V3★]            ← V3★ is narrow but shares full row height
                                                        ← V3★'s visual area is small — correct for 3★

Row 2:  [===== H4★ =====][V5★][==== H3★ ====]         ← V5★ (er=4) gets narrow column but TALL
        [===== H4★ =====][V5★][==== H3★ ====]         ← V5★ visual area ≈ H4★ area — equal prominence
                                                        ← hPair naturally gives V5★ less width, more height

Row 3:  [H3★][H3★][V2★][V2★][V1★][V1★]               ← 6 images! Molecules:
        [H2★][H2★][V2★][V2★][V1★][V1★]               ← H3+H2 vStacked, V2+V2 hPaired, V1+V1 hPaired
                                                        ← Row is TALL — vStacked Hs add height

Row 4:  [V4★ ][V3★ ][V2★ ][V2★ ]                      ← 4 verticals, each narrow
        [V4★ ][V3★ ][V2★ ][V2★ ]                      ← hPaired into 2 molecules: (V4+V3), (V2+V2)
        [V4★ ][V3★ ][V2★ ][V2★ ]                      ← Very tall row — verticals stacked for density
```

**Key differences:**
1. **Rows are TALLER** — vStacked horizontal molecules add height, hPaired vertical molecules add width
2. **More images per row** — 4–6 instead of 2–4
3. **Visual prominence tracks rating** — H5★ at 75% width dominates; V5★ narrow but tall = similar area
4. **No solo hero rows** — even 5★ shares with companions
5. **AR-aware cv** — verticals get lower cv (they "cost" more visual space per unit of width)

---

## 8. Migration Path

This is an **evolutionary** change, not a rewrite. We modify existing functions in place.

### Phase 1: AR-Aware cv Formula + rowWidth (foundation)
- Update `LAYOUT.desktopSlotWidth` from 5 → 8
- Update `LAYOUT.mobileSlotWidth` from 2 → 3
- Rewrite `getComponentValue` with AR-aware formula (rating × AR factor)
- Update `getItemComponentValue` and `toImageType` to pass AR through
- Remove `seqCount===1` hero shortcut in `buildRows`
- Fix `slotCountComplete` hero-skip bug
- Update all tests that hardcode cv values or row counts

### Phase 2: Orientation-Aware Molecule Composition
- Add `generateMoleculeCandidates()` — orientation-aware (hPair verticals, vStack horizontals)
- Add template map entries for 6–8 item H/V combinations
- Enhance `buildAtomic` to handle 5–6 items with molecule candidates
- Update characterization tests for new tree shapes

### Phase 3: Polish + Validation
- Add post-composition min-width validation (soft constraint)
- Add density scaling by collection size (optional)
- Visual verification across multiple collections
- Performance testing (more composition candidates = more work)

### Phase 4: Cleanup
- Remove debug logging from `rowCombination.ts`
- Remove the `seqCount===1` guard and `scoreA/scoreB < 0.99` guard left from today
- Update memory docs

**Each phase is independently shippable.** Phase 1 alone solves the hero problem. Phase 2 adds density. Phase 3 adds polish. Phase 4 cleans up.

---

## 9. Open Questions for User

### Q1: Target fractions — are these the right numbers?

The proposed target fractions for desktop (rowWidth=8):

| Rating | Target fraction | Meaning |
|--------|----------------|---------|
| 5★ | 75% | Dominates the row but shares with 1–2 small images |
| 4★ | 50% | Half the row — pairs nicely with another 4★ or two smaller |
| 3★ | 33% | Third of the row — natural 3-per-row grouping |
| 2★ | 25% | Quarter — 4-per-row |
| 0–1★ | 12.5–17% | Small — 5–6 per row |

Do these feel right? The 5★ number is the most important — 75% means a 5★ image always shares its row with at least one companion. If you want 5★ to be even bigger (say 85%), it could still share with a tiny image, but the companion would be very small. If you want 5★ smaller (say 60%), it could share with a 4★ image (60% + 50% = 110%, just within MAX_FILL).

### Q2: Should 5★ images EVER be solo heroes?

Currently: always. Proposed: never on desktop (cv=6.0 on budget 8.0 = 75% < MIN_FILL 0.9).

Option A: **Never solo** — 5★ always shares its row. This maximizes density.
Option B: **Solo only if explicitly marked** — add a `hero: true` flag to specific images.
Option C: **Solo only if no good companion exists** — if the next image is also 5★, don't pair them.

Which do you prefer? The current design assumes Option A.

### Q3: rowWidth=8 — or something else?

The choice of 8 gives clean math (75% = 6.0 slots, 50% = 4.0 slots). But 10 would give even finer granularity (75% = 7.5, 50% = 5.0, 33% = 3.33). Higher rowWidth = more precision but potentially more items per row.

My recommendation is 8 — it's the smallest number that gives meaningful graduation between all rating levels while being large enough that 5★ can share a row. But I want to flag this as a tuneable parameter.

### Q4: How many 5★ images per collection?

You mentioned limiting 5★ to "just a few." Is there a target? 3? 5? 10%? This is a curation guideline, not a layout constraint, but it affects how well the layout works. With 3 five-star images in a 50-image collection, the rhythm is: occasional prominence punctuating a sea of medium-density rows. With 25 five-star images, every other row has a dominant image, which might still feel monotonous even at 75% width.

### Q5: Should the density multiplier be automatic or user-controlled?

The proposed density scaling (section 7.8) adjusts `targetAR` based on collection size. Options:

- **Automatic:** Small collections → bigger images, large collections → smaller images. No user control.
- **Manual slider:** The collection page has a density control (like a "zoom" slider) that adjusts `targetAR`.
- **Both:** Automatic default with manual override.

A manual slider would be a separate UI feature. The automatic version is simpler to implement and could come first.

### Q6: What about the existing dirty files?

The handoff notes several files with uncommitted changes (ordering fixes, debug logging, unrelated filter work). Before starting implementation:

1. Should we commit the 6 ordering fixes as-is (with debug logging removed)?
2. Should we commit the unrelated filter/UI work separately?
3. Should we start the prominence work on a clean branch from those commits?

My recommendation: commit the ordering fixes clean (remove debug logs first), commit unrelated work separately, then branch for the prominence work.

### Q7: AR factor — sqrt or linear?

The AR-aware cv formula (section 7.2a) uses `sqrt(imageAR / referenceAR)` as the correction factor. This produces moderate adjustments:

| AR | sqrt factor | linear factor |
|----|------------|--------------|
| 2.0 (wide H) | 1.00 (capped) | 1.00 (capped) |
| 1.5 (standard) | 1.00 | 1.00 |
| 1.0 (square) | 0.82 | 0.67 |
| 0.67 (portrait) | 0.67 | 0.45 |
| 0.5 (tall V) | 0.58 | 0.33 |

With `sqrt`: a V5★ (er=4, AR=0.67) gets cv=2.67. With `linear`: cv=1.78.

`sqrt` is gentler — verticals still get meaningful cv, so they don't become invisible in row fill. `linear` is more aggressive — verticals get tiny cv, which means rows could have many more verticals (8–10 tiny verticals to fill a budget of 8.0).

My recommendation is `sqrt` — it's conservative and we can always adjust later. But this is a key tuning parameter that we'll want to test visually.

### Q8: Should the vertical penalty (-1 effectiveRating) stack with the AR factor?

Currently V5★ → effectiveRating=4 (vertical penalty). Then with AR factor, cv gets further reduced. This double-penalty might be too aggressive:

- V5★: er=4, baseFraction=0.50, arFactor=0.67, **cv=2.67** (33% of row)
- Without vertical penalty: er=5, baseFraction=0.75, arFactor=0.67, **cv=4.0** (50% of row)

Should we remove the vertical penalty now that AR factor handles it? Or keep both for maximum differentiation? The answer affects whether V5★ images feel "important" in the layout or get treated like H3★.

---

## Appendix A: Why the Bottom-Up Rewrite Failed

The reverted `bottom-up atomic composition` approach failed because it:

1. **Destroyed domain knowledge.** The template map encodes real knowledge about how H and V images compose well together (dom-stacked for 2H+1V, nested-quad for 3V+1H). The bottom-up merge algorithm treats all images as interchangeable, losing this.

2. **Replaced a debuggable system with a black box.** Template map entries are named (`dom-stacked-2h1v`) and predictable. Bottom-up merge produces trees whose structure depends on rating ordering, which is harder to reason about and test.

3. **Didn't solve the actual problem.** The hero problem is caused by `cv=5.0 = rowWidth=5`, not by the composition algorithm. Changing how images are *arranged within a row* doesn't change how many images *get assigned to the row*. The row fill algorithm (buildRows) is where the hero problem lives.

4. **Was too ambitious for one session.** Rewriting buildAtomic + compose + removing template map + removing reorderWithinRows was 4 major changes at once. Any one of them could introduce bugs, and stacking all 4 made debugging impossible.

The lesson: **change the inputs to the system (cv formula, rowWidth), not the system itself (composition algebra, template routing).** The composition system is fine — it just needs better inputs and more candidate strategies.

## Appendix B: Relationship to Ordering Fixes

The 6 ordering fixes from today's session are **orthogonal** to this design. They fix image *sequencing within rows*, while this design fixes *which images go in which rows* and *how they're composed*. Both changes are needed, and they don't conflict.

The ordering fixes should be committed before starting this work, creating a clean baseline.
