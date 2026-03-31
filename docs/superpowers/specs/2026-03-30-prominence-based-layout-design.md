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

**The proposal doesn't address how rows get *filled*.** Saying "5★ is at least 75%" tells us the constraint, but not the algorithm. How do we decide which images go together? The current greedy fill works by summing cv until the row is full. With the new fixed-weight system (section 7.2), H5★ has cv=5.0 on a rowWidth=8 budget = 62.5% fill. The greedy fill naturally pulls in companions: H5★(5.0) + H3★(2.5) = 7.5 → 94% fill. But we need a deliberate algorithm for which companions get pulled and how they're composed, not accidental arithmetic.

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

Change `getComponentValue` to use fixed weights (cv=5.0 for 5★) instead of `rowWidth / itemsPerRow`. Increase rowWidth to 8 so 5★ can share rows.

| effectiveRating | Old cv (rw=5) | New cv (fixed) | Fraction at rw=8 |
|----------------|---------------|---------------|-------------|
| 5 | 5.0 (100%) | 5.0 | 62% |
| 4 | 2.5 (50%) | 3.5 | 44% |
| 3 | 1.67 (33%) | 2.5 | 31% |
| 2 | 1.25 (25%) | 1.75 | 22% |
| 0–1 | 1.0 (20%) | 1.0–1.25 | 12–16% |

**Pros:** Minimal code change. Solves the hero problem. Fixed weights scale with density.
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

1. **Fixed-weight cv formula** with AR factor: cv = BASE_WEIGHT[rating] × arFactor (rowWidth is the budget, not part of cv).
2. **Remove the `seqCount===1` hero shortcut** so 5★ images can share rows.
3. **Add dense composition templates** for 5–8 items with orientation-aware molecules.
4. **Enhance `compose()` with orientation-aware molecule strategy** (hPair verticals, vStack horizontals).
5. **Add two-axis prominence validation** — width constraints for H images, height constraints for V images.
6. **Fix the slotCountComplete hero-skip bug** (DSC_6643).

**Pros:** Solves all three problems (hero, density, ordering). Preserves the template map and atomic design. Additive rather than destructive (we're adding templates and enhancing composition, not ripping anything out).
**Cons:** Larger change. Needs careful testing. The cv formula change affects every row, so characterization tests will need updating.

**Verdict: This is the right approach.** It's evolutionary, not revolutionary. We keep everything that works and change the parts that need changing.

---

## 7. Recommended Design: Weight-Budget System

### 7.0 Core Principle: Rows Must Have Vertical Depth

**This is the most important section of the spec.**

A "row" in this layout is NOT a horizontal strip of images at the same height. A row is a **composition with internal vertical structure** — images stacked on top of each other, molecules nested inside, creating a visually rich block that fills a meaningful portion of the viewport.

**On a 16:9 desktop monitor (1920×1080), a row should aim to occupy ~40–60% of viewport height (430–650px).** This means rows need vertical depth — flat hChain rows at 1274px wide would be ~200px tall (3 horizontal images side by side), which is only 18% of viewport height. That's a film strip, not a gallery.

**The rule: almost every row with 3+ images MUST contain at least one vStack node.** The only acceptable flat (all-hPair) rows are:
- 1 image (hero)
- 2 images (natural pair)
- 2 H5★ images side by side (rare, acceptable because both are wide and create a substantial row)

**Why this matters for composition:**
- **Horizontal images are "height donors"** — vStacking two horizontals turns a 200px strip into a 400px block. They SHOULD be stacked.
- **Vertical images are "height consumers"** — they're already tall. vStacking a vertical with anything makes the row absurdly tall. They should NOT be stacked — let them take full row height as a column.
- A V5★ image at full row height, paired horizontally with a column of 2–3 vStacked horizontal images, is the **ideal composition**. The vertical dominates height, the stacked horizontals add density beside it.

**This is a two-axis prominence system:**
- **Horizontal images:** prominence = width fraction (wider = more prominent)
- **Vertical images:** prominence = height fraction of the row (taller = more prominent, and they should occupy full height or close to it)

This is exactly what the user's original proposal described:
- H5★ = dominates row **width** (~62% at default density, ~83% at sparse)
- V5★ = at least 75–85% of row **height** (i.e., don't vStack it — let it be full row height)
- V4★ = 50–75% of row **height** (could share with one vStacked companion)
- V3★ = 25–50% of row **height** (can be vStacked with 1–2 others)

These are not incompatible units — they're constraints on DIFFERENT AXES that map to composition structure:

| Constraint | What it means for composition |
|-----------|------------------------------|
| V5★ ≥ 75% row height | Do NOT vStack this image. Let it be a standalone column at full row height. |
| V4★ ≥ 50% row height | May vStack with ONE small companion (V4★ gets the bigger share). |
| V3★ ≥ 25% row height | Can be vStacked with 2–3 others. |
| H5★ — dominant width | This image dominates width (fraction depends on density). vStack it with 1–2 smaller images for height. |
| H4★ — secondary width | Takes a significant share. Can be vStacked with a companion. |
| H3★ — no constraint | Flexible — vStack freely for density. |

**Flat-row penalty for AR scoring:** When `compose()` generates candidates, flat hChain compositions (no vStack nodes) should receive an AR penalty for rows with 3+ images. This ensures the AR scorer prefers compositions with vertical depth even when a flat layout happens to hit the target AR.

### 7.0a Core Principle: rowWidth Is THE Scaling Knob

**This must be designed from the ground up. Getting it wrong means rethinking everything later.**

The user needs to dynamically increase or decrease the number/size of images in a row — similar to how the old system offered "up to 5 wide" or "up to 6 wide." This is not a one-time constant choice. It's a **runtime-adjustable parameter** that controls layout density, and **every other number in the system must derive from it.**

**The rule: rowWidth is the ONLY input that changes.** Everything else — cv formula, target fractions, max items per row, molecule depth, MIN_FILL_RATIO, MAX_FILL_RATIO — must be expressed as functions of rowWidth, not as independent constants.

**What rowWidth represents:**
- It's an abstract "budget" for how much content fits in a row
- Higher rowWidth → more images per row → smaller individual images → denser layout
- Lower rowWidth → fewer images per row → bigger individual images → sparser layout
- Desktop default: 8. But the system must work correctly at 6, 8, 10, 12, or any reasonable value.

**What must scale with rowWidth:**

| Value | Formula | rowWidth=6 | rowWidth=8 | rowWidth=10 | rowWidth=12 |
|-------|---------|-----------|-----------|------------|------------|
| H5★ cv | `BASE_WEIGHT[5]` | **5.0** | **5.0** | **5.0** | **5.0** |
| H5★ fraction | `5.0 / rw` | 83% | 62% | 50% | 42% |
| H3★ cv | `BASE_WEIGHT[3]` | **2.5** | **2.5** | **2.5** | **2.5** |
| H3★ fraction | `2.5 / rw` | 42% | 31% | 25% | 21% |
| Typical items/row | `~rw / avg_cv` | 2–4 | 3–5 | 4–7 | 5–9 |

**Key: cv is a FIXED WEIGHT. Only rowWidth changes.** This means:

1. **No magic numbers** — every cv is `BASE_WEIGHT[rating] * arFactor`. No rowWidth in the formula.
2. **ALL images shrink together** — increase rowWidth and every image's fraction decreases proportionally.
3. **Prominence ratios are preserved** — 5★/3★ = 5.0/2.5 = 2× at ANY rowWidth.
4. **MIN_FILL_RATIO and MAX_FILL_RATIO stay as ratios** (0.9 and 1.15) — they scale automatically because fill = totalCV / rowWidth.
5. **AR floor stays as a ratio** (targetAR × 0.7) — also scales automatically.
6. **The molecule strategy is rowWidth-independent** — it's driven by H/V orientation, not by absolute sizes.

**The minWidthFraction and minHeightFraction tables also stay constant** — they're fractions of the row, not absolute values. At rowWidth=6 or rowWidth=12, "H5★ must occupy at least 60% of row width" means the same thing proportionally.

**Where rowWidth is set:**

```typescript
// In processContentForDisplay or a new density config
const rowWidth = isMobile
  ? LAYOUT.mobileSlotWidth                    // 3 (fixed)
  : LAYOUT.desktopSlotWidth + densityOffset;  // 8 + user adjustment

// densityOffset: -2 for sparse, 0 for default, +2 for dense, +4 for very dense
// This could come from:
//   - A UI slider on the collection page
//   - Automatic calculation based on collection size
//   - A per-collection setting stored in the database
```

**What MUST NOT change when rowWidth changes:**
- The composition algebra (single, hPair, vStack, AtomicComponent tree)
- The box tree → pixel size calculation (calculateSizesFromBoxTree)
- The template map routing logic (H/V counting)
- The AR scoring (pickBest, scoreCandidate)
- The ordering guarantees
- **The BASE_WEIGHT table** — cv per rating is fixed, rowWidth is the budget

**What DOES change when rowWidth changes:**
- How many images fit in a row (more budget → more images)
- **How big EVERY image is** — ALL images shrink proportionally, not just low-rated ones
- Which compositions get generated (more items → deeper molecule trees)
- The visual density of the page

**Critical: cv is a fixed weight, NOT a fraction of rowWidth.** If cv = rowWidth × fraction, then the fraction is constant and increasing rowWidth only affects the leftover crumbs. The whole point of density scaling is that EVERYTHING gets smaller when you increase density. See section 7.2 for the correct formula.

**Test for correctness: the rowWidth invariant.** Any function that uses rowWidth must produce valid output for rowWidth ∈ [4, 16]. If a function breaks at rowWidth=4 or rowWidth=16, it has a hidden assumption about a specific rowWidth value. This is the ground-truth test for whether we've built it correctly.

### 7.1 New Constants

```typescript
// In app/constants/index.ts (LAYOUT section)
desktopSlotWidth: 8,   // was 5 — default, adjustable at runtime via densityOffset
mobileSlotWidth: 3,    // was 2 — allows 3-image rows on mobile

// ============================================================================
// BASE_WEIGHT: Fixed absolute weights per rating.
// cv = BASE_WEIGHT[rating] × arFactor
// fraction = cv / rowWidth  (this is what SHRINKS as rowWidth increases)
//
// THIS IS THE KEY INSIGHT: cv does NOT scale with rowWidth.
// rowWidth is the budget. cv is the cost. Bigger budget → more items fit →
// every item's fraction shrinks → everything gets smaller together.
// ============================================================================

BASE_WEIGHT: {
  5: 5.0,    // A 5★ image "costs" 5.0 units of row budget
  4: 3.5,    // A 4★ image "costs" 3.5
  3: 2.5,    // A 3★ image "costs" 2.5
  2: 1.75,   // etc.
  1: 1.25,
  0: 1.0,
},

// What these produce at different rowWidths:
//
// | Rating | Weight | rw=6   | rw=8    | rw=10  | rw=12  |
// |--------|--------|--------|---------|--------|--------|
// | 5★     | 5.0    | 83%    | 62.5%   | 50%    | 42%    |
// | 4★     | 3.5    | 58%    | 44%     | 35%    | 29%    |
// | 3★     | 2.5    | 42%    | 31%     | 25%    | 21%    |
// | 2★     | 1.75   | 29%    | 22%     | 17.5%  | 14.6%  |
// | 0-1★   | 1.0    | 17%    | 12.5%   | 10%    | 8.3%   |
//
// At rw=6 (sparse):  H5★ is 83% of row — near-hero, 1 tiny companion
// At rw=8 (default):  H5★ is 62.5% — shares with 1-2 companions
// At rw=12 (dense):  H5★ is 42% — shares with 2-3 companions
//
// The RATIO between ratings is ALWAYS preserved:
//   5★/3★ = 5.0/2.5 = 2× at ANY rowWidth
//   5★/1★ = 5.0/1.25 = 4× at ANY rowWidth
// What changes is the absolute fraction — ALL images shrink together.

// Minimum WIDTH fractions for HORIZONTAL images (post-composition validation)
// NOTE: these ARE fractions of the row, and they DO stay constant.
// They're FLOORS — "don't squeeze a 5★ below X% regardless of density."
// At very high density (rw=12), 5★ naturally occupies 42%. The floor of 40%
// means it can't be squeezed further by composition.
MIN_WIDTH_FRACTION: {
  5: 0.40,  // H5★ must occupy at least 40% of row width (even at high density)
  4: 0.25,  // H4★ at least 25%
  3: 0.15,  // H3★ at least 15%
  2: 0.08,
  1: 0.05,
  0: 0.05,
},

// Minimum HEIGHT fractions for VERTICAL images (composition structure constraint)
// Controls whether a vertical image can be vStacked with others
MIN_HEIGHT_FRACTION: {
  5: 0.75,  // V5★ (er=4): full row height — NEVER vStack
  4: 0.50,  // V4★ (er=3): at least half — vStack with at most 1 companion
  3: 0.25,  // V3★ (er=2): quarter — can be vStacked freely
  2: 0.10,
  1: 0.10,
  0: 0.10,
},

// These existing ratios are already rowWidth-independent — no changes needed:
// MIN_FILL_RATIO: 0.9        (fill = totalCV / rowWidth — scales automatically)
// MAX_FILL_RATIO: 1.15       (same)
// AR_FLOOR_MULTIPLIER: 0.7   (arFloor = targetAR × 0.7 — scales automatically)
```

### 7.2 New cv Formula (Base — Rating Only)

> **Important:** This is the base formula. Section 7.2a extends it with AR-awareness.
> Read this section for the core insight, then 7.2a for the complete solution.

**The fundamental change: cv is a FIXED WEIGHT, not a fraction of rowWidth.**

```typescript
// cv = BASE_WEIGHT[effectiveRating]  (fixed — does NOT multiply by rowWidth)
// fraction = cv / rowWidth           (THIS is what changes with density)
```

**Why this matters — the old formula was wrong:**

Old: `cv = rowWidth × fraction` → fraction is constant regardless of rowWidth. Increasing density only affects the scraps around the dominant image. The 5★ image stays at 75% forever.

New: `cv = BASE_WEIGHT[rating]` → fraction = weight/rowWidth → fraction SHRINKS as rowWidth grows. ALL images get smaller together. The 5★ image goes from 83% at rw=6 to 42% at rw=12.

**Row fill examples at different densities (before AR correction):**

**At rowWidth=8 (default):**

| Row scenario | Total cv | Fill ratio | Notes |
|-------------|----------|-----------|-------|
| H5★ alone | 5.0 | 62.5% | ❌ Underfills — must pull companions |
| H5★ + H3★ | 5.0 + 2.5 = 7.5 | 94% | ✅ Good fill |
| H5★ + H3★ + H1★ | 5.0 + 2.5 + 1.25 = 8.75 | 109% | ✅ Within MAX_FILL |
| H4★ + H4★ | 3.5 + 3.5 = 7.0 | 87.5% | ⚠️ Slightly under — may pull one more |
| H3★ + H3★ + H3★ | 2.5 × 3 = 7.5 | 94% | ✅ Three 3★ images |
| H2★ × 4 | 1.75 × 4 = 7.0 | 87.5% | ⚠️ May pull a 5th |
| H1★ × 6 | 1.25 × 6 = 7.5 | 94% | ✅ Six small images |

**At rowWidth=6 (sparse):**

| Row scenario | Total cv | Fill ratio | Notes |
|-------------|----------|-----------|-------|
| H5★ alone | 5.0 | 83% | ⚠️ Just under MIN_FILL — pulls 1 companion |
| H5★ + H1★ | 5.0 + 1.25 = 6.25 | 104% | ✅ Near-hero with tiny companion |
| H4★ + H3★ | 3.5 + 2.5 = 6.0 | 100% | ✅ Perfect pair |

**At rowWidth=12 (dense):**

| Row scenario | Total cv | Fill ratio | Notes |
|-------------|----------|-----------|-------|
| H5★ alone | 5.0 | 42% | ❌ Way under — pulls 2-3 companions |
| H5★ + H4★ | 5.0 + 3.5 = 8.5 | 71% | ❌ Still under — pulls more |
| H5★ + H4★ + H3★ | 5.0 + 3.5 + 2.5 = 11.0 | 92% | ✅ Three images fill the row |
| H3★ × 5 | 2.5 × 5 = 12.5 | 104% | ✅ Five 3★ images |

**The prominence ratio is always preserved:** 5★/3★ = 5.0/2.5 = 2× at ANY rowWidth. But the absolute fraction shrinks for ALL ratings as density increases.

**⚠️ But this ignores AR — see next section for why this breaks with verticals.**

### 7.2a The AR Problem — Why Width Fraction Alone Fails

**This is the single most important insight in this spec.**

The base cv formula in 7.2 treats all images equally by rating. But consider what happens when `H5★ (AR=2.0)` and `V5★ (AR=0.5)` both get the same base weight:

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

**Approach: Scale the fixed base weight by an AR factor.** Images with low AR (vertical) have their cv reduced because they'll take up more vertical space per unit of width. Images with high AR (horizontal) keep their cv as-is.

```typescript
export function getComponentValue(
  effectiveRating: number,
  imageAR: number  // actual aspect ratio of the image
): number {
  // NOTE: rowWidth is NOT a parameter. cv is a fixed weight.
  // The caller divides cv / rowWidth to get the fill fraction.

  const baseWeight = BASE_WEIGHT[Math.min(effectiveRating, 5)] ?? 1.0;

  // AR factor: normalize to a "standard" horizontal AR of 1.5
  // Verticals (AR < 1) get reduced cv → they need less width to be visually prominent
  // Horizontals (AR > 1.5) keep full weight (capped — wide H doesn't need bonus)
  const REFERENCE_AR = 1.5;
  const arFactor = Math.sqrt(Math.min(imageAR, REFERENCE_AR) / REFERENCE_AR);
  // arFactor examples:
  //   AR=2.0 (wide H):  sqrt(min(2.0,1.5)/1.5) = sqrt(1.0) = 1.00 (capped)
  //   AR=1.5 (standard): sqrt(1.5/1.5) = 1.00
  //   AR=1.0 (square):   sqrt(1.0/1.5) = 0.82
  //   AR=0.67 (portrait): sqrt(0.67/1.5) = 0.67
  //   AR=0.5 (tall V):   sqrt(0.5/1.5) = 0.58

  return baseWeight * arFactor;
}

// Mobile override (simple — AR factor is less impactful on small screens)
export function getMobileComponentValue(effectiveRating: number): number {
  if (effectiveRating >= 5) return 3;  // full width
  if (effectiveRating >= 4) return 2;
  if (effectiveRating >= 3) return 1.5;
  return 1;
}
```

**What this means in practice — cv is FIXED, fraction scales with rowWidth:**

| Image | er | AR | baseWeight | arFactor | **cv** | rw=6 | rw=8 | rw=10 | rw=12 |
|-------|-----|------|-----------|----------|--------|------|------|-------|-------|
| H5★ | 5 | 2.0 | 5.0 | 1.00 | **5.0** | 83% | 62% | 50% | 42% |
| H4★ | 4 | 1.8 | 3.5 | 1.00 | **3.5** | 58% | 44% | 35% | 29% |
| V5★(er=4) | 4 | 0.67 | 3.5 | 0.67 | **2.34** | 39% | 29% | 23% | 20% |
| H3★ | 3 | 1.5 | 2.5 | 1.00 | **2.5** | 42% | 31% | 25% | 21% |
| V4★(er=3) | 3 | 0.67 | 2.5 | 0.67 | **1.67** | 28% | 21% | 17% | 14% |
| H2★ | 2 | 2.0 | 1.75 | 1.00 | **1.75** | 29% | 22% | 17.5% | 14.6% |
| V3★(er=2) | 2 | 0.5 | 1.75 | 0.58 | **1.01** | 17% | 13% | 10% | 8.4% |
| H1★ | 1 | 1.5 | 1.25 | 1.00 | **1.25** | 21% | 16% | 12.5% | 10.4% |
| V1★(er=0) | 0 | 0.67 | 1.0 | 0.67 | **0.67** | 11% | 8% | 6.7% | 5.6% |

**Key properties of this table:**
1. **cv is fixed** — the cv column doesn't change with rowWidth. Ever.
2. **ALL fractions shrink as rowWidth increases** — look across any row: 83% → 62% → 50% → 42%.
3. **Prominence ratios are preserved** — H5★/H3★ = 5.0/2.5 = 2× at every rowWidth.
4. **AR factor reduces verticals** — V5★(cv=2.34) costs less than H4★(cv=3.5) despite same effectiveRating, because it's already tall.

**Row scenarios at rowWidth=8 (default):**

| Row | Total cv | Fill | Notes |
|-----|----------|------|-------|
| H5★(5.0) + H3★(2.5) | 7.5 | 94% | ✅ 5★ gets 62%, 3★ gets 31% |
| H5★(5.0) + V3★(1.01) + H2★(1.75) | 7.76 | 97% | ✅ 5★ dominant, two smaller companions |
| H4★(3.5) + V5★(2.34) + H2★(1.75) | 7.59 | 95% | ✅ H4★ and V5★ have similar visual area |
| H3★(2.5) + H3★(2.5) + H3★(2.5) | 7.5 | 94% | ✅ Three equal horizontals |
| H2★(1.75) × 4 + H1★(1.25) | 8.25 | 103% | ✅ Five images |

**Row scenarios at rowWidth=12 (dense):**

| Row | Total cv | Fill | Notes |
|-----|----------|------|-------|
| H5★(5.0) + H4★(3.5) + H3★(2.5) | 11.0 | 92% | ✅ Three images — 5★ is still biggest at 42% |
| H3★(2.5) × 5 | 12.5 | 104% | ✅ Five 3★ images |
| H2★(1.75) × 7 | 12.25 | 102% | ✅ Seven images! Dense but readable |

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

**Remove the `seqCount===1` hero shortcut (line 771–773).** Currently, when a single item fills `>= MIN_FILL_RATIO`, it auto-breaks as a hero. With the new cv formula, H5★ has cv=5.0, fill=5.0/8=0.625 — well below MIN_FILL 0.9. So this shortcut can't trigger for any standard image. But we still need to remove or raise the threshold for correctness — even if an item *could* fill a row alone, we should still check AR and potentially add more items for density.

**Actually**: we should keep the shortcut but raise its threshold. A single item should only become a hero if `cv / rowWidth >= 0.95` (nearly full width). In the new formula, no image reaches this threshold on desktop, so heroes become opt-in via the standalone promotion path only.

**Fix the slotCountComplete hero-skip bug.** In the `slotCountComplete` expansion loop, before adding an item, check:
```typescript
if (cv / rowWidth >= MIN_FILL_RATIO) {
  // This item is hero-worthy — don't swallow it into a multi-image row
  break;
}
```
This prevents DSC_6643 from being pulled into someone else's row.

**Note:** With the new cv formula, a 5★ has cv=5.0 on rowWidth=8 → fill ratio 0.625 — well below `MIN_FILL_RATIO=0.9` — so the existing `cv / rowWidth >= MIN_FILL_RATIO` guard won't protect it. We need a different guard: check if adding this item would give it *less* prominence than its rating deserves. Specifically: if the item's cv would become less than `MIN_WIDTH_FRACTION[rating] * rowWidth` in the expanding row, skip it.

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

### 7.6 Post-Composition Prominence Validation

After `lookupComposition` builds the tree, validate that each leaf's prominence matches its rating. This is a *validation* step, not a layout step — it detects bad compositions, not creates good ones.

**Two-axis validation:**
- **Horizontal images:** Check width fraction ≥ minimum for rating
- **Vertical images:** Check height fraction ≥ minimum for rating (i.e., the image isn't vStacked when it shouldn't be)

```typescript
function validateProminence(
  tree: AtomicComponent,
  minWidthFractions: Record<number, number>,  // for H images
  minHeightFractions: Record<number, number>,  // for V images
): boolean {
  // Walk the tree
  // For each leaf:
  //   If H: check its effective width fraction ≥ minWidthFractions[rating]
  //   If V: check whether it's inside a vStack node.
  //         A V5★ inside a vStack = violation (it should be full row height)
  //         A V3★ inside a vStack = acceptable
  // Return false if any violation found
}
```

**Height fraction is structural, not numerical.** We don't need to compute exact pixel heights — we can infer height fraction from the tree structure:
- A vertical image that is NOT inside any vStack ancestor → 100% row height
- A vertical image inside one vStack → ~50% row height (shared with sibling)
- A vertical image inside nested vStacks → ~25% row height

So the check is: "walk up from this leaf; count vStack ancestors; if the image is vertical and its rating requires ≥ N% height, reject if too many vStack ancestors."

**When validation fails:** Prefer a different composition candidate. If no candidate passes, accept the best-AR one and log a warning. These constraints are *soft* — they guide candidate selection but don't block rendering.

### 7.7 Ordering Guarantees

All 6 ordering fixes from today are preserved. Additionally:

- **Molecule composition preserves order.** When pairing adjacent images into molecules, pairs are (0,1), (2,3), (4,5) — never shuffled.
- **compose() partition splits preserve order.** Left group = first N items, right group = remaining — already the case after today's fix.
- **findDominant placement is positional.** Dominant goes left if it was in the first half of the input, right otherwise — already fixed today.

### 7.8 Density Scaling — The rowWidth Knob in Practice

The user needs to dynamically grow or shrink image density. There are two independent knobs:

1. **`rowWidth`** — controls how many images fit per row (more budget → more items → smaller each)
2. **`targetAR`** — controls row height (higher AR → shorter rows, lower AR → taller rows)

**rowWidth is the primary density control.** It's the one the user adjusts (via slider, per-collection setting, or automatic calculation). targetAR is secondary — it's viewport-derived and mostly stays constant.

```typescript
// Primary density control: rowWidth
const baseRowWidth = isMobile ? LAYOUT.mobileSlotWidth : LAYOUT.desktopSlotWidth;
const rowWidth = baseRowWidth + densityOffset;
// densityOffset sources (pick one or combine):
//   - UI slider: user drags left (-2) to right (+4)
//   - Automatic: based on filtered image count
//   - Per-collection setting from database

// Secondary: targetAR (viewport-derived, rarely adjusted)
const targetAR = clamp(contentWidth / viewportHeight, 1.5, 3.0);
```

**Example density levels (desktop):**

| Density | rowWidth | densityOffset | H5★ fraction | Typical items/row | Use case |
|---------|----------|--------------|-------------|-------------------|----------|
| Sparse | 6 | -2 | 83% | 1–3 | Small collections, portfolio showcase |
| Default | 8 | 0 | 62% | 3–5 | Most collections |
| Dense | 10 | +2 | 50% | 4–7 | Large collections, browse mode |
| Very dense | 12 | +4 | 42% | 5–9 | Huge collections, contact sheet feel |

**Because cv is a fixed weight, ALL images shrink proportionally as rowWidth increases.** H5★ goes from 83% (sparse) → 62% (default) → 42% (dense). H3★ goes from 42% → 31% → 21%. The prominence RATIO stays constant (5★ is always 2× the fraction of 3★), but the absolute fraction — and therefore pixel size — shrinks for everyone. This is the correct behavior: "more images in a row" means everything gets smaller, not just the low-rated ones.

**Automatic density based on collection size (optional):**

```typescript
const autoDensityOffset = filteredCount <= 15 ? -2
                        : filteredCount <= 30 ? -1
                        : filteredCount <= 60 ? 0
                        : filteredCount <= 100 ? +1
                        : +2;
```

This is optional and can come later. The important thing is that the system SUPPORTS it by making rowWidth the single knob.

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
Row 1:  [=========== H5★ ===========][V3★]            ← H5★ dominates width (~62% at rw=8)
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
3. **Visual prominence tracks rating** — H5★ at ~62% width dominates at default density; V5★ narrow but tall = similar visual area
4. **No solo hero rows** — even 5★ shares with companions
5. **AR-aware cv** — verticals get lower cv (they "cost" more visual space per unit of width)

---

## 8. Migration Path

This is an **evolutionary** change, not a rewrite. We modify existing functions in place.

### Phase 1: AR-Aware cv Formula + Scalable rowWidth (foundation)
- Update `LAYOUT.desktopSlotWidth` from 5 → 8, `mobileSlotWidth` from 2 → 3
- Extract `BASE_WEIGHT`, `MIN_WIDTH_FRACTION`, `MIN_HEIGHT_FRACTION` as constants
- Rewrite `getComponentValue` as `BASE_WEIGHT[rating] × arFactor` — cv is a fixed weight, NOT multiplied by rowWidth
- Update `getItemComponentValue` and `toImageType` to pass AR through
- Remove `seqCount===1` hero shortcut in `buildRows`
- Fix `slotCountComplete` hero-skip bug
- **rowWidth invariant tests:** verify buildRows + compose produce valid output for rowWidth ∈ [4, 16]
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

### Q1: Base weights — are these the right numbers?

The proposed base weights (fixed, rowWidth-independent):

| Rating | BASE_WEIGHT | At rw=6 | At rw=8 | At rw=12 |
|--------|------------|---------|---------|----------|
| 5★ | 5.0 | 83% | 62% | 42% |
| 4★ | 3.5 | 58% | 44% | 29% |
| 3★ | 2.5 | 42% | 31% | 21% |
| 2★ | 1.75 | 29% | 22% | 15% |
| 0–1★ | 1.0–1.25 | 17–21% | 12–16% | 8–10% |

The key question is the **spread**. Currently 5★/1★ = 5.0/1.25 = 4×. That means a 5★ image is always 4× the visual weight of a 1★ image. Is 4× enough? Too much? At rw=8: 62% vs 16% — the 5★ is clearly dominant. At rw=12: 42% vs 10% — still dominant but less dramatically.

If the spread is too wide, lower-rated images become tiny at high density. If too narrow, high-rated images don't feel special enough.

### Q2: Should 5★ images EVER be solo heroes?

With the new model: at rw=8, H5★ has cv=5.0, fill=62.5% — well below MIN_FILL 0.9. It CANNOT be solo. At rw=6 (sparse), fill=83% — still below 0.9. So with the current BASE_WEIGHT of 5.0, **5★ images are never solo at any rowWidth ≥ 6**.

If we want solo heroes at sparse density, we'd need BASE_WEIGHT[5] ≥ rw × 0.9. At rw=6, that's 5.4. At rw=8, that's 7.2. Should BASE_WEIGHT[5] be 5.5 (solo possible at rw=6 only) or stay at 5.0 (never solo)?

Option A: **Never solo** (BASE_WEIGHT=5.0) — 5★ always shares. This is the current design.
Option B: **Solo at sparse density only** (BASE_WEIGHT=5.5) — solo hero at rw=6, shares at rw=8+.
Option C: **Solo only if explicitly marked** — add a `hero: true` flag for specific images.

### Q3: Default rowWidth=8 — or something else?

With fixed-weight cv, the choice of default rowWidth determines the default density feel:
- rw=6: H5★ at 83%, very few companions — feels like the current system but slightly less extreme
- rw=8: H5★ at 62%, 1–2 companions — meaningful sharing, good gallery feel
- rw=10: H5★ at 50%, 2–3 companions — denser, more images visible

Since this is now adjustable at runtime, the default is less critical than before. But it sets the out-of-box experience. My recommendation is still 8 — it's a good middle ground where 5★ images are clearly dominant (62%) but always share their row.

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

With `sqrt`: a V5★ (er=4, AR=0.67) gets cv = 3.5 × 0.67 = 2.34. With `linear`: cv = 3.5 × 0.45 = 1.57.

`sqrt` is gentler — verticals still get meaningful cv, so they don't become invisible in row fill. `linear` is more aggressive — verticals get tiny cv, which means rows could have many more verticals (8–10 tiny verticals to fill a budget of 8.0).

My recommendation is `sqrt` — it's conservative and we can always adjust later. But this is a key tuning parameter that we'll want to test visually.

### Q8: Row height target — what % of viewport?

Section 7.0 says rows should target 40–60% of viewport height on a 16:9 monitor. This translates to:
- 1080p: 430–650px row height
- With content width 1274px: targetAR = 1274/430 to 1274/650 = **2.0 to 3.0**

The current `targetAR` clamp is `[1.5, 3.0]`. Should we narrow this to `[1.8, 2.5]` to enforce taller rows? Or is this better handled by the flat-row penalty (preferring compositions with vStack) rather than forcing a specific targetAR range?

### Q9: Should the vertical penalty (-1 effectiveRating) stack with the AR factor?

Currently V5★ → effectiveRating=4 (vertical penalty). Then with AR factor, cv gets further reduced. This double-penalty might be too aggressive:

- V5★: er=4, baseWeight=3.5, arFactor=0.67, **cv=2.34** → 29% at rw=8
- Without vertical penalty: er=5, baseWeight=5.0, arFactor=0.67, **cv=3.35** → 42% at rw=8

Should we remove the vertical penalty now that AR factor handles it? Or keep both for maximum differentiation? The answer affects whether V5★ images feel "important" in the layout (42% without penalty — clearly prominent) or get treated like H3★ (29% with both penalties — not prominent at all).

### Q10: Density control — UI slider, automatic, or both?

Section 7.0a establishes rowWidth as the single scaling knob. Section 7.8 shows how it maps to density levels. The question is how the user (you) adjusts it:

**Option A: Automatic only.** densityOffset is derived from filtered image count. No UI control. Simplest to implement.

**Option B: UI slider.** A density slider on the collection page (like Google Photos' zoom slider). User has full control. More complex but more flexible.

**Option C: Both.** Automatic default with manual override via slider. Best of both worlds but most complex.

**Option D: Per-collection setting.** Each collection has a density setting stored in the database. Set once during curation, no runtime slider needed.

My recommendation: start with Option A (automatic), then add Option B later if needed. The architecture supports all options because rowWidth is the only thing that changes.

### Q11: What's the valid range for rowWidth?

Section 7.0a says the system must work for rowWidth ∈ [4, 16]. But what's the practical range you'd actually use?

- rowWidth=4: Very sparse. Most rows have 1–2 images. Almost a slideshow.
- rowWidth=6: Sparse. 2–4 images per row. Good for small collections.
- rowWidth=8: Default. 3–6 images per row.
- rowWidth=12: Dense. 6–9 images per row. Contact sheet territory.
- rowWidth=16: Very dense. 8–12 images per row. Might be too small for individual images.

Knowing the practical range helps us know how aggressively to test edge cases.

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
