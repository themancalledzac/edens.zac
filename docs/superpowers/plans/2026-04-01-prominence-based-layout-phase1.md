# Prominence-Based Layout: Phase 1 — AR-Aware cv Formula + Scalable rowWidth

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the old `cv = rowWidth / itemsPerRow` formula with a fixed-weight system (`cv = BASE_WEIGHT[rating] × arFactor`) and increase desktop rowWidth from 5→8, so 5★ images share rows instead of consuming them entirely.

**Architecture:** The cv formula moves from `contentRatingUtils.ts` (where it scales with rowWidth) to a fixed-weight lookup in `rowCombination.ts` (where cv is a constant cost, and rowWidth is the budget). The `ImageType` interface gains a `numericAR` field so the AR factor can be computed. `buildRows` hero logic is updated so 5★ images no longer auto-break into solo rows. All existing composition logic (template map, buildAtomic, compose) is preserved — only the *inputs* change.

**Tech Stack:** TypeScript, Jest

**Spec Reference:** `docs/superpowers/specs/2026-03-30-prominence-based-layout-design.md` — this plan implements Phase 1 (section 8).

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `app/constants/index.ts` | Add `BASE_WEIGHT`, `MIN_WIDTH_FRACTION`, `MIN_HEIGHT_FRACTION`; update `desktopSlotWidth` 5→8, `mobileSlotWidth` 2→3 |
| Modify | `app/utils/contentRatingUtils.ts` | Rewrite `getComponentValue` to use `BASE_WEIGHT × arFactor`; add `imageAR` parameter |
| Modify | `app/utils/rowCombination.ts` | Add `numericAR` to `ImageType`; pass AR through `toImageType`; update `buildRows` hero logic |
| Modify | `app/utils/contentLayout.ts` | Update rowWidth source from `LAYOUT.desktopSlotWidth` / `mobileSlotWidth` (picks up new values automatically) |
| Update | `tests/utils/contentRatingUtils.test.ts` | Rewrite `getComponentValue` tests for new formula |
| Update | `tests/utils/rowCombination.test.ts` | Update `DESKTOP` constant, cv-dependent assertions |
| Update | `tests/utils/rowCombination.characterization.test.ts` | Update expected row assignments for new cv values |
| Update | `tests/utils/rowOptimizer.test.ts` | Update `DESKTOP` constant |
| Update | `tests/utils/contentLayout.test.ts` | Update any rowWidth-dependent expectations |

---

## Task 1: Add BASE_WEIGHT and related constants

**Files:**
- Modify: `app/constants/index.ts` (lines 18-52, LAYOUT section)

- [ ] **Step 1: Add BASE_WEIGHT, MIN_WIDTH_FRACTION, MIN_HEIGHT_FRACTION to LAYOUT**

In `app/constants/index.ts`, add these properties inside the `LAYOUT` object, after the existing `mobileSlotWidth` line (line 46):

```typescript
  // Fixed-weight cv formula: cv = BASE_WEIGHT[rating] × arFactor
  // cv is a fixed cost. rowWidth is the budget. fraction = cv / rowWidth.
  baseWeight: {
    5: 5.0,
    4: 3.5,
    3: 2.5,
    2: 1.75,
    1: 1.25,
    0: 1.0,
  } as Record<number, number>,

  // Minimum width fractions for horizontal images (post-composition validation)
  minWidthFraction: {
    5: 0.40,
    4: 0.25,
    3: 0.15,
    2: 0.08,
    1: 0.05,
    0: 0.05,
  } as Record<number, number>,

  // Minimum height fractions for vertical images (composition structure constraint)
  minHeightFraction: {
    5: 0.75,
    4: 0.50,
    3: 0.25,
    2: 0.10,
    1: 0.10,
    0: 0.10,
  } as Record<number, number>,

  // Reference AR for the AR factor in cv calculation
  referenceAR: 1.5,
```

- [ ] **Step 2: Update desktopSlotWidth and mobileSlotWidth**

In the same `LAYOUT` object, change:
- `desktopSlotWidth: 5` → `desktopSlotWidth: 8`
- `mobileSlotWidth: 2` → `mobileSlotWidth: 3`

- [ ] **Step 3: Run type check**

Run: `/opt/homebrew/bin/node node_modules/.bin/tsc --noEmit`

Expected: PASS — adding properties to the object literal is type-safe.

- [ ] **Step 4: Commit**

```bash
git add app/constants/index.ts
git commit -m "feat: add BASE_WEIGHT constants and update slot widths for prominence layout

desktopSlotWidth 5→8, mobileSlotWidth 2→3. Add baseWeight, minWidthFraction,
minHeightFraction, and referenceAR constants for the new cv formula."
```

---

## Task 2: Rewrite getComponentValue with AR-aware fixed-weight formula

**Files:**
- Modify: `app/utils/contentRatingUtils.ts` (lines 98-123)
- Modify: `tests/utils/contentRatingUtils.test.ts`

- [ ] **Step 1: Write failing tests for the new getComponentValue**

In `tests/utils/contentRatingUtils.test.ts`, find the existing `describe('getComponentValue', ...)` block and replace its contents with tests for the new formula. The new signature is `getComponentValue(effectiveRating, imageAR)` — no more `slotWidth` parameter.

```typescript
describe('getComponentValue', () => {
  it('returns base weight for standard horizontal (AR=1.5)', () => {
    // AR=1.5 → arFactor = sqrt(1.5/1.5) = 1.0 → cv = baseWeight
    expect(getComponentValue(5, 1.5)).toBe(5.0);
    expect(getComponentValue(4, 1.5)).toBe(3.5);
    expect(getComponentValue(3, 1.5)).toBe(2.5);
    expect(getComponentValue(2, 1.5)).toBe(1.75);
    expect(getComponentValue(1, 1.5)).toBe(1.25);
    expect(getComponentValue(0, 1.5)).toBe(1.0);
  });

  it('caps arFactor at 1.0 for wide horizontals (AR > 1.5)', () => {
    // AR=2.0 → arFactor = sqrt(min(2.0,1.5)/1.5) = sqrt(1.0) = 1.0
    expect(getComponentValue(5, 2.0)).toBe(5.0);
    expect(getComponentValue(3, 2.5)).toBe(2.5);
  });

  it('reduces cv for verticals (AR < 1.0) via sqrt factor', () => {
    // AR=0.67 → arFactor = sqrt(0.67/1.5) ≈ 0.668
    const cv5v = getComponentValue(4, 0.67); // V5★ has effectiveRating=4
    expect(cv5v).toBeCloseTo(3.5 * Math.sqrt(0.67 / 1.5), 2);
    expect(cv5v).toBeLessThan(3.5);
    expect(cv5v).toBeGreaterThan(2.0);
  });

  it('reduces cv for square images (AR=1.0)', () => {
    // AR=1.0 → arFactor = sqrt(1.0/1.5) ≈ 0.816
    const cv = getComponentValue(3, 1.0);
    expect(cv).toBeCloseTo(2.5 * Math.sqrt(1.0 / 1.5), 2);
  });

  it('handles effectiveRating > 5 by capping at 5', () => {
    expect(getComponentValue(6, 1.5)).toBe(5.0);
    expect(getComponentValue(10, 1.5)).toBe(5.0);
  });

  it('handles effectiveRating < 0 by flooring at 0', () => {
    expect(getComponentValue(-1, 1.5)).toBe(1.0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `/opt/homebrew/bin/node node_modules/.bin/jest tests/utils/contentRatingUtils.test.ts --testNamePattern="getComponentValue" --no-coverage`

Expected: FAIL — the current `getComponentValue` takes `(effectiveRating, slotWidth)`, not `(effectiveRating, imageAR)`.

- [ ] **Step 3: Rewrite getComponentValue in contentRatingUtils.ts**

Replace the existing `getComponentValue` function (lines 98-110) with:

```typescript
/**
 * Calculate component value (cv) for an image using the fixed-weight formula.
 *
 * cv = BASE_WEIGHT[effectiveRating] × arFactor
 *
 * cv is a FIXED WEIGHT — it does NOT scale with rowWidth.
 * The caller divides cv / rowWidth to get the fill fraction.
 * This means ALL images shrink proportionally as rowWidth increases.
 *
 * @param effectiveRating - The effective rating (0-5) from getEffectiveRating()
 * @param imageAR - The actual aspect ratio of the image (width/height)
 * @returns The component value (fixed weight, independent of rowWidth)
 */
export function getComponentValue(effectiveRating: number, imageAR: number): number {
  const clampedRating = Math.min(Math.max(effectiveRating, 0), 5);
  const baseWeight = LAYOUT.baseWeight[clampedRating] ?? 1.0;

  const arFactor = Math.sqrt(Math.min(imageAR, LAYOUT.referenceAR) / LAYOUT.referenceAR);
  return baseWeight * arFactor;
}
```

- [ ] **Step 4: Update getItemComponentValue to pass AR instead of slotWidth**

Replace the existing `getItemComponentValue` function (lines 120-123) with:

```typescript
/**
 * Convenience function: Get component value directly from an item.
 * Combines getEffectiveRating() and getComponentValue() in one call.
 *
 * @param item - The content item to evaluate
 * @returns The component value for this item (fixed weight, rowWidth-independent)
 */
export function getItemComponentValue(item: AnyContentModel): number {
  const effectiveRating = getEffectiveRating(item);
  const imageAR = getAspectRatio(item);
  return getComponentValue(effectiveRating, imageAR);
}
```

This requires adding the `getAspectRatio` import. Add to the existing imports at the top of the file:

```typescript
import { getAspectRatio } from '@/app/utils/contentTypeGuards';
```

- [ ] **Step 5: Remove the unused `slotWidth` parameter from getItemComponentValue**

The old `getItemComponentValue` had `slotWidth` as a parameter. All callers pass `rowWidth` as the second arg. Since the new version doesn't take `slotWidth`, all callers that pass a second argument will get a TypeScript error. We need to update the callers:

In `app/utils/rowCombination.ts`, find all calls to `getItemComponentValue(item, rowWidth)` and change them to `getItemComponentValue(item)`:
- Line 51: `getItemComponentValue(item, rowWidth)` → `getItemComponentValue(item)`
- Line 78: `getItemComponentValue(item, rowWidth)` → `getItemComponentValue(item)`
- Line 132: `getItemComponentValue(item, rowWidth)` → `getItemComponentValue(item)`
- Line 638: `getItemComponentValue(candidate, rowWidth)` → `getItemComponentValue(candidate)`
- Line 674: `getItemComponentValue(expandedWindow[i]!, rowWidth)` → `getItemComponentValue(expandedWindow[i]!)`
- Line 761: `getItemComponentValue(item, rowWidth)` → `getItemComponentValue(item)`
- Line 771: `getItemComponentValue(window[bestIndex]!, rowWidth)` → `getItemComponentValue(window[bestIndex]!)`

In `app/utils/rowOptimizer.ts`, check for any calls — `rebuildRow` calls `toImageType(comp, rowWidth)` which internally calls `getItemComponentValue`. Update if needed.

- [ ] **Step 6: Update getItemComponentValue tests**

In `tests/utils/contentRatingUtils.test.ts`, find the `describe('getItemComponentValue', ...)` block and update to remove the `slotWidth` parameter:

```typescript
describe('getItemComponentValue', () => {
  it('combines getEffectiveRating and getComponentValue', () => {
    const h5 = createHorizontalImage(1, 5);
    const cv = getItemComponentValue(h5);
    // H5★: effectiveRating=5, AR≈1.78 (capped at 1.5 ref) → cv=5.0
    expect(cv).toBe(5.0);
  });

  it('applies vertical penalty and AR factor for vertical images', () => {
    const v5 = createVerticalImage(1, 5);
    const cv = getItemComponentValue(v5);
    // V5★: effectiveRating=4, AR≈0.67 → cv = 3.5 × sqrt(0.67/1.5) ≈ 2.34
    expect(cv).toBeGreaterThan(2.0);
    expect(cv).toBeLessThan(3.5);
  });
});
```

- [ ] **Step 7: Run the contentRatingUtils tests**

Run: `/opt/homebrew/bin/node node_modules/.bin/jest tests/utils/contentRatingUtils.test.ts --no-coverage`

Expected: All tests PASS.

- [ ] **Step 8: Run type check**

Run: `/opt/homebrew/bin/node node_modules/.bin/tsc --noEmit`

Expected: PASS — all callers updated to new signature.

- [ ] **Step 9: Commit**

```bash
git add app/utils/contentRatingUtils.ts tests/utils/contentRatingUtils.test.ts app/utils/rowCombination.ts
git commit -m "feat: rewrite getComponentValue with AR-aware fixed-weight formula

cv = BASE_WEIGHT[rating] × sqrt(min(AR, 1.5) / 1.5). cv is now a fixed
weight independent of rowWidth. Removes slotWidth parameter from
getItemComponentValue — all callers updated."
```

---

## Task 3: Add numericAR to ImageType and update toImageType

**Files:**
- Modify: `app/utils/rowCombination.ts` (lines 107-136)
- Modify: `tests/utils/rowCombination.test.ts` (toImageType tests)

- [ ] **Step 1: Write failing test for numericAR field**

In `tests/utils/rowCombination.test.ts`, find the `describe('toImageType', ...)` block (line ~837) and add a test:

```typescript
  it('includes numericAR from the source image aspect ratio', () => {
    const hImg = createHorizontalImage(1, 3);
    const result = toImageType(hImg, 8);
    expect(result.numericAR).toBeGreaterThan(1.0);
    expect(typeof result.numericAR).toBe('number');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `/opt/homebrew/bin/node node_modules/.bin/jest tests/utils/rowCombination.test.ts --testNamePattern="toImageType" --no-coverage`

Expected: FAIL — `numericAR` doesn't exist on `ImageType`.

- [ ] **Step 3: Add numericAR to ImageType interface**

In `app/utils/rowCombination.ts`, update the `ImageType` interface (lines 107-113):

```typescript
export interface ImageType {
  source: AnyContentModel;
  title: string;
  ar: OrientationShort;
  numericAR: number;
  effectiveRating: number;
  componentValue: number;
}
```

- [ ] **Step 4: Update toImageType to populate numericAR**

In `app/utils/rowCombination.ts`, update the `toImageType` function (lines 129-136):

```typescript
export function toImageType(item: AnyContentModel, rowWidth: number): ImageType {
  const numericAR = getAspectRatio(item);
  const ar: OrientationShort = numericAR > 1.0 ? 'H' : 'V';
  const effectiveRating = getEffectiveRating(item);
  const componentValue = getItemComponentValue(item);
  const title = 'title' in item ? String(item.title) : `item-${item.id}`;

  return { source: item, title, ar, numericAR, effectiveRating, componentValue };
}
```

Note: `rowWidth` parameter is kept for API compatibility (used by callers) even though `getItemComponentValue` no longer needs it.

- [ ] **Step 5: Run toImageType tests**

Run: `/opt/homebrew/bin/node node_modules/.bin/jest tests/utils/rowCombination.test.ts --testNamePattern="toImageType" --no-coverage`

Expected: All PASS.

- [ ] **Step 6: Run type check**

Run: `/opt/homebrew/bin/node node_modules/.bin/tsc --noEmit`

Expected: PASS. If any code destructures `ImageType` without `numericAR`, TypeScript won't error since the field is always present.

- [ ] **Step 7: Commit**

```bash
git add app/utils/rowCombination.ts tests/utils/rowCombination.test.ts
git commit -m "feat: add numericAR field to ImageType for AR-aware composition

toImageType now stores the actual aspect ratio number alongside the
H/V orientation shorthand. This enables AR-aware cv calculation and
future molecule composition decisions."
```

---

## Task 4: Update buildRows hero logic for new cv values

**Files:**
- Modify: `app/utils/rowCombination.ts` (buildRows function, lines 623-817)
- Modify: `tests/utils/rowCombination.test.ts` (buildRows tests)

With the new cv formula, a 5★ horizontal has cv=5.0, and rowWidth is now 8. Fill ratio = 5.0/8 = 0.625, well below MIN_FILL_RATIO (0.9). The hero shortcut logic needs updating.

- [ ] **Step 1: Write tests for the new hero behavior**

In `tests/utils/rowCombination.test.ts`, update the `DESKTOP` constant at the top of the file:

```typescript
const DESKTOP = LAYOUT.desktopSlotWidth; // Now 8 instead of 5
```

Then add new tests in the `buildRows` describe block:

```typescript
  describe('5★ images share rows at rowWidth=8', () => {
    it('H5★ is not a solo hero — shares row with companions', () => {
      const items = [
        createHorizontalImage(1, 5),  // cv=5.0, fill=62.5%
        createHorizontalImage(2, 3),  // cv=2.5, fill=31%
        createHorizontalImage(3, 2),  // cv=1.75
      ];
      const rows = buildRows(items, DESKTOP);
      // H5★ + H3★ = 7.5/8 = 94% → should be in same row
      expect(rows[0]!.components.length).toBeGreaterThanOrEqual(2);
    });

    it('V5★ does not create solo hero row', () => {
      const items = [
        createVerticalImage(1, 5),   // er=4, cv≈2.34
        createHorizontalImage(2, 3), // cv=2.5
        createHorizontalImage(3, 3), // cv=2.5
      ];
      const rows = buildRows(items, DESKTOP);
      // V5★ cv≈2.34, fill=29% — definitely not solo
      expect(rows[0]!.components.length).toBeGreaterThanOrEqual(2);
    });
  });
```

- [ ] **Step 2: Update the standalone skip hero threshold**

In `app/utils/rowCombination.ts`, find the standalone skip logic in `buildRows` (around line 639):

```typescript
const cv = getItemComponentValue(candidate, rowWidth);
if (cv / rowWidth >= MIN_FILL_RATIO) {
```

Change the threshold check. Since cv is now fixed and rowWidth=8, a 5★ has cv=5.0 → fill=0.625 < 0.9. The standalone skip should use a higher threshold (0.95) so only images that truly fill a row get standalone treatment:

```typescript
const HERO_SOLO_THRESHOLD = 0.95;
```

Replace `MIN_FILL_RATIO` with `HERO_SOLO_THRESHOLD` in the standalone skip check (line ~639). This means no standard image becomes a solo hero at desktop rowWidth=8 (max cv=5.0, fill=62.5%).

**Specifically**, find the standalone skip block (lines ~630-663) and update:
- Line 639: `if (cv / rowWidth >= MIN_FILL_RATIO)` → `if (cv / rowWidth >= 0.95)`
- Line 681 (slotCountComplete expansion): Similar check — update to use the same threshold for the hero-skip guard

- [ ] **Step 3: Update the slotCountComplete hero-skip guard**

In `buildRows`, find the `slotCountComplete` expansion section. Add a guard to prevent swallowing high-rated images:

```typescript
// Inside the slotCountComplete expansion, before adding an item:
if (slotCountComplete) {
  // Don't swallow high-rated images into someone else's row
  if (expandedWindow[i]!.rating >= 4) {
    const candidateCV = getItemComponentValue(expandedWindow[i]!);
    if (candidateCV / rowWidth >= 0.4) {
      break; // Let this image start its own row
    }
  }
  // ... existing AR expansion logic
}
```

- [ ] **Step 4: Run buildRows tests**

Run: `/opt/homebrew/bin/node node_modules/.bin/jest tests/utils/rowCombination.test.ts --testNamePattern="buildRows" --no-coverage`

Note: Many existing tests will likely fail due to the DESKTOP constant changing from 5→8. This is expected — we'll fix those in Task 5.

Expected: The new "5★ shares rows" tests PASS. Existing tests may fail — that's handled in Task 5.

- [ ] **Step 5: Commit**

```bash
git add app/utils/rowCombination.ts tests/utils/rowCombination.test.ts
git commit -m "feat: update buildRows hero logic for prominence-based cv

Raise hero solo threshold to 0.95 so 5★ images share rows at rowWidth=8.
Add slotCountComplete guard to prevent swallowing high-rated images."
```

---

## Task 5: Update all tests for new rowWidth and cv values

**Files:**
- Modify: `tests/utils/rowCombination.test.ts`
- Modify: `tests/utils/rowCombination.characterization.test.ts`
- Modify: `tests/utils/rowOptimizer.test.ts`
- Modify: `tests/utils/contentLayout.test.ts`

This is the largest task — updating all test expectations for the new cv formula and rowWidth=8.

- [ ] **Step 1: Update DESKTOP constant in all test files**

In each test file, update the `DESKTOP` constant:
- `tests/utils/rowCombination.test.ts`: `const DESKTOP = LAYOUT.desktopSlotWidth;` (already 8 from Task 4)
- `tests/utils/rowOptimizer.test.ts`: Same — verify it references `LAYOUT.desktopSlotWidth`
- `tests/utils/rowCombination.characterization.test.ts`: Same

- [ ] **Step 2: Run all tests to identify failures**

Run: `/opt/homebrew/bin/node node_modules/.bin/jest --no-coverage 2>&1 | head -100`

Capture the failing test names and understand why they fail. Common failure patterns:
- Tests asserting `row.components.length === 1` for 5★ images (now shares rows)
- Tests asserting specific cv values (cv formula changed)
- Tests asserting specific row assignments (more images per row now)
- Tests using `findDominant` or `TEMPLATE_MAP` (still exist, but behavior differs with new cv)

- [ ] **Step 3: Fix isRowComplete tests**

The `isRowComplete` tests (lines 50-158) check fill ratios. With cv now AR-dependent:
- `getItemComponentValue(H5★)` = 5.0 (was 5.0 at rowWidth=5)
- `getItemComponentValue(H3★)` = 2.5 (was 1.67 at rowWidth=5)
- `getItemComponentValue(V5★)` ≈ 2.34 (was 2.5 at rowWidth=5)

Update the test expectations to use the new cv values. The `isRowComplete` function itself checks `totalCV / rowWidth`, so with rowWidth=8 the thresholds are different. Verify that `isRowComplete` still works correctly by checking:
- `[H5★, H3★]`: totalCV = 7.5, fill = 7.5/8 = 0.9375 ✅ (between 0.9 and 1.15)
- `[H5★]`: totalCV = 5.0, fill = 5.0/8 = 0.625 ❌ (below 0.9)

- [ ] **Step 4: Fix buildRows characterization tests**

In `tests/utils/rowCombination.characterization.test.ts`, run the tests and update expected row assignments. The key changes:
- 5★ images no longer solo — they share rows
- More images per row at rowWidth=8
- Row counts will generally decrease (more images per row)

For each failing characterization test:
1. Run it to see actual output
2. Verify the actual output makes sense (images share rows logically)
3. Update the expected values to match

**Strategy:** Run characterization tests individually, capture actual output, verify it's correct, update assertions.

```bash
/opt/homebrew/bin/node node_modules/.bin/jest tests/utils/rowCombination.characterization.test.ts --no-coverage --verbose 2>&1
```

- [ ] **Step 5: Fix buildRows unit tests**

For each failing `buildRows` test in `rowCombination.test.ts`:
- Tests about "low-rated item skip" may need updating since hero thresholds changed
- Tests about "standalone promotion" need new cv-aware expectations
- Tests about "template keys in buildRows output" need new expected keys

- [ ] **Step 6: Fix lookupComposition tests**

The `lookupComposition` tests (lines 1062-1125) assert on labels like `'dom-stacked'` and `'nested-quad'`. These still exist in the TEMPLATE_MAP, but the H/V counts per row will differ since more images fit per row. Update the template key expectations.

- [ ] **Step 7: Fix compose and buildAtomic tests**

The `compose` tests (lines 1251-1340) and `buildAtomic` tests (lines 1131-1245) use `DESKTOP` as rowWidth. Update assertions that depend on specific cv values or specific tree shapes.

- [ ] **Step 8: Fix rowOptimizer tests**

In `tests/utils/rowOptimizer.test.ts`, the tests use `buildRows` to create rows, then test optimization. With new cv and rowWidth, the initial row assignments will differ. Update expectations.

- [ ] **Step 9: Fix contentLayout tests**

In `tests/utils/contentLayout.test.ts`, check for any tests that assert on specific row counts or image assignments. These may need updating.

- [ ] **Step 10: Run all tests**

Run: `/opt/homebrew/bin/node node_modules/.bin/jest --no-coverage`

Expected: ALL PASS.

- [ ] **Step 11: Run format, lint, and type check**

```bash
/opt/homebrew/bin/node node_modules/.bin/prettier --write tests/utils/rowCombination.test.ts tests/utils/rowCombination.characterization.test.ts tests/utils/rowOptimizer.test.ts tests/utils/contentLayout.test.ts tests/utils/contentRatingUtils.test.ts
/opt/homebrew/bin/node node_modules/.bin/eslint --fix tests/utils/rowCombination.test.ts tests/utils/rowCombination.characterization.test.ts tests/utils/rowOptimizer.test.ts tests/utils/contentLayout.test.ts tests/utils/contentRatingUtils.test.ts
/opt/homebrew/bin/node node_modules/.bin/tsc --noEmit
```

Expected: All clean.

- [ ] **Step 12: Commit**

```bash
git add tests/
git commit -m "test: update all tests for prominence-based cv formula and rowWidth=8

Update cv expectations, row assignments, and characterization snapshots
for the new fixed-weight formula and larger row budget."
```

---

## Task 6: Verify the rowWidth invariant

**Files:**
- Modify: `tests/utils/rowCombination.test.ts`

The spec requires that `buildRows + compose` produce valid output for `rowWidth ∈ [4, 16]`. This is the ground-truth test for correctness.

- [ ] **Step 1: Write rowWidth invariant tests**

Add a new describe block in `tests/utils/rowCombination.test.ts`:

```typescript
describe('rowWidth invariant: valid output for rowWidth 4-16', () => {
  const images = [
    createHorizontalImage(1, 5),
    createVerticalImage(2, 4),
    createHorizontalImage(3, 3),
    createHorizontalImage(4, 3),
    createVerticalImage(5, 2),
    createHorizontalImage(6, 2),
    createVerticalImage(7, 1),
    createHorizontalImage(8, 1),
    createHorizontalImage(9, 3),
    createVerticalImage(10, 2),
  ];

  for (const rw of [4, 6, 8, 10, 12, 16]) {
    it(`rowWidth=${rw}: all images assigned to rows`, () => {
      const rows = buildRows(images, rw);
      const allIds = rows.flatMap(r => r.components.map(c => c.id));
      expect(allIds.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });

    it(`rowWidth=${rw}: no empty rows`, () => {
      const rows = buildRows(images, rw);
      for (const row of rows) {
        expect(row.components.length).toBeGreaterThanOrEqual(1);
      }
    });

    it(`rowWidth=${rw}: each row has valid boxTree`, () => {
      const rows = buildRows(images, rw);
      for (const row of rows) {
        expect(row.boxTree).toBeDefined();
      }
    });

    it(`rowWidth=${rw}: higher rowWidth produces equal or more images per row on average`, () => {
      if (rw === 4) return; // no comparison for smallest
      const rowsSmaller = buildRows(images, rw - 2);
      const rowsCurrent = buildRows(images, rw);
      const avgSmaller = images.length / rowsSmaller.length;
      const avgCurrent = images.length / rowsCurrent.length;
      // More budget should allow at least as many images per row (on average)
      expect(avgCurrent).toBeGreaterThanOrEqual(avgSmaller * 0.8); // allow some tolerance
    });
  }
});
```

- [ ] **Step 2: Run the invariant tests**

Run: `/opt/homebrew/bin/node node_modules/.bin/jest tests/utils/rowCombination.test.ts --testNamePattern="rowWidth invariant" --no-coverage`

Expected: ALL PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/utils/rowCombination.test.ts
git commit -m "test: add rowWidth invariant tests for valid output across 4-16 range

Verifies all images assigned, no empty rows, valid boxTrees, and
density scaling behavior across the supported rowWidth range."
```

---

## Task 7: Visual verification

**Files:** None (verification only)

- [ ] **Step 1: Start the dev server and verify layout**

Start the dev server and navigate to a collection page. Verify:
1. 5★ images now share rows with companions (not solo heroes)
2. Images still appear in natural order
3. No broken layouts or missing images
4. Rows fill properly at the new rowWidth=8

- [ ] **Step 2: Test density feel**

Compare the visual density to the old layout:
- Rows should have more images (3-5 typical, vs 2-4 before)
- 5★ images should be clearly larger but not full-width
- Overall page should feel denser and more gallery-like

- [ ] **Step 3: Test mobile**

Verify mobile layout at rowWidth=3:
- 5★ images should still be full-width heroes on mobile
- 2-3 images per row for lower ratings
- No broken layouts

---

## Summary

| Task | What Changes | Risk |
|------|-------------|------|
| 1 | Add constants | Low — additive only |
| 2 | Rewrite cv formula | **High** — changes every cv value in the system |
| 3 | Add numericAR to ImageType | Low — additive field |
| 4 | Update hero logic | Medium — changes row assignment behavior |
| 5 | Update all tests | **High** — many tests need updating for new values |
| 6 | rowWidth invariant tests | Low — new tests only |
| 7 | Visual verification | N/A — verification |

**Phase 1 is independently shippable.** After this, the hero problem is solved and 5★ images share rows. Phase 2 (molecule composition) builds on this to add vertical density.
