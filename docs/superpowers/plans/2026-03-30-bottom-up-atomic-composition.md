# Bottom-Up Atomic Composition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace top-down dominant-extraction composition with bottom-up "merge smallest first" composition that preserves natural image order.

**Architecture:** The new `buildAtomic` iteratively merges the two lowest-maxRating adjacent (or skip-one) components until only 1-2 remain. Higher-rated images get merged last, making them larger in the tree. `compose` becomes a thin dispatcher into `buildAtomic`. The template map, `findDominant`, `generateCandidates`, `buildDominantStacked`, `buildNestedQuad`, `generatePartitionCandidates`, and `reorderWithinRows` are all removed.

**Tech Stack:** TypeScript, Jest

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `app/utils/rowCombination.ts` | Replace `buildAtomic`, `compose`; remove `findDominant`, `generateCandidates`, `buildDominantStacked`, `buildNestedQuad`, `generatePartitionCandidates`, `TEMPLATE_MAP`, `lookupComposition` |
| Modify | `app/utils/rowOptimizer.ts` | Remove `reorderWithinRows`; update `optimizeRows` |
| Modify | `app/utils/contentLayout.ts` | No changes needed (calls `buildRows` → `optimizeRows`, both keep their public API) |
| Rewrite | `tests/utils/rowCombination.test.ts` | Update `buildAtomic` and `compose` tests; remove `findDominant`, `TEMPLATE_MAP`, `lookupComposition` dom-stacked/nested-quad tests |
| Rewrite | `tests/utils/rowOptimizer.test.ts` | Remove `reorderWithinRows` tests; keep `optimizeBoundaries` and `optimizeRows` tests |
| Update | `tests/utils/rowCombination.characterization.test.ts` | Update or delete characterization tests that assert on old tree shapes |

---

## Task 1: Write failing tests for new `buildAtomic` bottom-up behavior

**Files:**
- Modify: `tests/utils/rowCombination.test.ts`

These tests define the new contract: bottom-up merging, natural order preservation, higher-rated = merged last = bigger.

- [ ] **Step 1: Write new `buildAtomic` test cases**

Replace the existing `describe('buildAtomic', ...)` block (lines 1131-1245) with:

```typescript
describe('buildAtomic', () => {
  const TARGET_AR = 1.5;

  it('throws on empty input', () => {
    expect(() => buildAtomic([], TARGET_AR, DESKTOP)).toThrow(
      'buildAtomic requires at least 1 image'
    );
  });

  it('returns single leaf for 1 image', () => {
    const img = toImageType(createHorizontalImage(1, 5), DESKTOP);
    const result = buildAtomic([img], TARGET_AR, DESKTOP);
    expect(result.type).toBe('single');
  });

  it('returns pair for 2 images preserving input order', () => {
    const imgs = [
      toImageType(createVerticalImage(1, 2), DESKTOP),
      toImageType(createHorizontalImage(2, 4), DESKTOP),
    ];
    const result = buildAtomic(imgs, TARGET_AR, DESKTOP);
    expect(result.type).toBe('pair');
    // Input order preserved: id 1 on left, id 2 on right
    if (result.type === 'pair') {
      expect(result.children[0].type).toBe('single');
      expect(result.children[1].type).toBe('single');
      if (result.children[0].type === 'single' && result.children[1].type === 'single') {
        expect(result.children[0].img.source.id).toBe(1);
        expect(result.children[1].img.source.id).toBe(2);
      }
    }
  });

  it('merges lowest-rated adjacent pair first for 3 images', () => {
    // [A(1★), B(4★), C(1★)] → A+C can't merge (not adjacent), so merge A+B or B+C
    // A+B: maxRating=4, B+C: maxRating=4 → tie, pick first (A+B)
    // But then B (highest) gets merged early. Alternative with skip-one:
    // A+C skip-one: maxRating=1, which is much better → merge A+C
    // Result: {A,C} then merge with B → B is merged last (biggest)
    const imgs = [
      toImageType(createHorizontalImage(1, 1), DESKTOP),
      toImageType(createHorizontalImage(2, 4), DESKTOP),
      toImageType(createHorizontalImage(3, 1), DESKTOP),
    ];
    const result = buildAtomic(imgs, TARGET_AR, DESKTOP);
    // All 3 images should be in the tree
    const leafIds = collectLeafIds(result);
    expect(leafIds).toHaveLength(3);
    expect(leafIds.sort()).toEqual([1, 2, 3]);
  });

  it('higher-rated images get merged last (occupy more space)', () => {
    // [A(1★), B(1★), C(5★)] → A+B merge first (both low-rated, adjacent)
    // Then {A,B} + C → C is merged last, occupies ~half the row
    const imgs = [
      toImageType(createHorizontalImage(1, 1), DESKTOP),
      toImageType(createHorizontalImage(2, 1), DESKTOP),
      toImageType(createHorizontalImage(3, 5), DESKTOP),
    ];
    const result = buildAtomic(imgs, TARGET_AR, DESKTOP);
    // Root should be a pair where one child is single (the 5★)
    // and the other child is the merged group of the two 1★ images
    expect(result.type).toBe('pair');
    if (result.type === 'pair') {
      const [left, right] = result.children;
      // One child should be single (the dominant 5★), other should be a pair (the two 1★)
      const singleChild = left.type === 'single' ? left : right.type === 'single' ? right : null;
      const pairChild = left.type === 'pair' ? left : right.type === 'pair' ? right : null;
      expect(singleChild).not.toBeNull();
      expect(pairChild).not.toBeNull();
      if (singleChild?.type === 'single') {
        expect(singleChild.img.effectiveRating).toBe(5);
      }
    }
  });

  it('preserves natural order: left-to-right matches input sequence', () => {
    // [A(1★), B(1★), C(5★)] → merge A+B first, then combine with C
    // Tree should be hPair({A,B}, C) → leaves read left-to-right: A, B, C
    const imgs = [
      toImageType(createHorizontalImage(1, 1), DESKTOP),
      toImageType(createHorizontalImage(2, 1), DESKTOP),
      toImageType(createHorizontalImage(3, 5), DESKTOP),
    ];
    const result = buildAtomic(imgs, TARGET_AR, DESKTOP);
    const leafIds = collectLeafIds(result);
    // Natural order preserved: 1, 2, 3 (not shuffled by rating)
    expect(leafIds).toEqual([1, 2, 3]);
  });

  it('4 images: lowest-rated pair merges first', () => {
    // [A(2★), B(5★), C(1★), D(1★)] → C+D merge first (adjacent, maxRating=1)
    // Then A merges with {C,D} or stays separate → finally merge with B
    const imgs = [
      toImageType(createHorizontalImage(1, 2), DESKTOP),
      toImageType(createHorizontalImage(2, 5), DESKTOP),
      toImageType(createHorizontalImage(3, 1), DESKTOP),
      toImageType(createHorizontalImage(4, 1), DESKTOP),
    ];
    const result = buildAtomic(imgs, TARGET_AR, DESKTOP);
    const leafIds = collectLeafIds(result);
    expect(leafIds).toHaveLength(4);
    expect(leafIds.sort()).toEqual([1, 2, 3, 4]);
  });

  it('produces reasonable AR for mixed orientations', () => {
    const imgs = [
      toImageType(createVerticalImage(1, 2), DESKTOP),
      toImageType(createHorizontalImage(2, 3), DESKTOP),
      toImageType(createVerticalImage(3, 3), DESKTOP),
      toImageType(createHorizontalImage(4, 5), DESKTOP),
    ];
    const result = buildAtomic(imgs, TARGET_AR, DESKTOP);
    const ar = calculateBoxTreeAspectRatio(acToBoxTree(result), DESKTOP);
    expect(ar).toBeGreaterThan(0.5);
    expect(ar).toBeLessThan(5);
  });

  it('4 verticals: stacked layout produces compact AR', () => {
    const imgs = [1, 2, 3, 4].map(id => toImageType(createVerticalImage(id, id), DESKTOP));
    const result = buildAtomic(imgs, TARGET_AR, DESKTOP);
    const ar = calculateBoxTreeAspectRatio(acToBoxTree(result), DESKTOP);
    // Stacked pairs should be more compact than flat chain (~2.25)
    expect(ar).toBeLessThan(2.5);
  });
});
```

- [ ] **Step 2: Add `collectLeafIds` helper at the top of the test file**

Add this helper near the existing test helpers (after the `DESKTOP` constant):

```typescript
/** Collect leaf image IDs from an AtomicComponent tree in left-to-right order */
function collectLeafIds(ac: AtomicComponent): number[] {
  if (ac.type === 'single') return [ac.img.source.id];
  return [...collectLeafIds(ac.children[0]), ...collectLeafIds(ac.children[1])];
}
```

Note: import `AtomicComponent` from `@/app/utils/rowCombination` (it's already a type export).

- [ ] **Step 3: Run the tests to verify they fail**

Run: `/opt/homebrew/bin/node node_modules/.bin/jest tests/utils/rowCombination.test.ts --testNamePattern="buildAtomic" --no-coverage`

Expected: The "preserves natural order" and "higher-rated merged last" tests should FAIL because the current `buildAtomic` sorts by rating and forces dominant right.

- [ ] **Step 4: Commit**

```bash
git add tests/utils/rowCombination.test.ts
git commit -m "test: add failing tests for bottom-up buildAtomic composition

Tests define the new contract: merge lowest-rated adjacent pairs first,
preserve natural input order in the tree, higher-rated images merged last."
```

---

## Task 2: Implement bottom-up `buildAtomic`

**Files:**
- Modify: `app/utils/rowCombination.ts` (lines 181-284 primarily)

- [ ] **Step 1: Remove `findDominant` and `generateCandidates`**

Delete the `findDominant` function (lines 181-195) and the `generateCandidates` function (lines 218-248). Also remove the `findDominant` export from any import statements.

- [ ] **Step 2: Write the new `buildAtomic` implementation**

Replace the existing `buildAtomic` function (lines 261-284) with:

```typescript
/** A component being iteratively merged in bottom-up composition */
interface MergeComponent {
  ac: AtomicComponent;
  maxRating: number;
}

/**
 * Build an AR-aware AtomicComponent tree using bottom-up atomic composition.
 *
 * Iteratively merges the two lowest-maxRating nearby components:
 * 1. Start with every image as a single atom, in natural input order
 * 2. Score all adjacent pairs (and skip-one pairs with a penalty)
 * 3. Merge the best pair — try both hPair and vStack, pick closest to targetAR
 * 4. The merged component inherits the max rating of its children
 * 5. Repeat until 1-2 components remain, then do the final merge
 *
 * This ensures higher-rated images are merged last (occupying more space)
 * while preserving natural input order with minimal positional shifts.
 *
 * @param images - ImageType[] to arrange (in natural order)
 * @param targetAR - Target aspect ratio (typically 1.5 for most viewports)
 * @param rowWidth - Row width for AR calculation (chunkSize param)
 */
export function buildAtomic(images: ImageType[], targetAR: number, rowWidth: number): AtomicComponent {
  if (images.length === 0) throw new Error('buildAtomic requires at least 1 image');
  if (images.length === 1) return single(images[0]!);

  // Initialize: every image is an atom
  let components: MergeComponent[] = images.map(img => ({
    ac: single(img),
    maxRating: img.effectiveRating,
  }));

  while (components.length > 1) {
    let bestIdx = 0;
    let bestScore = Infinity;
    let bestDist = 1;

    // Score adjacent pairs (distance 1)
    for (let i = 0; i < components.length - 1; i++) {
      const score = Math.max(components[i]!.maxRating, components[i + 1]!.maxRating);
      if (score < bestScore) {
        bestScore = score;
        bestIdx = i;
        bestDist = 1;
      }
    }

    // Score skip-one pairs (distance 2) — must be notably better to justify the skip
    for (let i = 0; i < components.length - 2; i++) {
      const score = Math.max(components[i]!.maxRating, components[i + 2]!.maxRating);
      if (score < bestScore - 1) {
        bestScore = score;
        bestIdx = i;
        bestDist = 2;
      }
    }

    if (bestDist === 1) {
      // Merge adjacent pair
      const left = components[bestIdx]!;
      const right = components[bestIdx + 1]!;
      const merged = pickBestMerge(left.ac, right.ac, targetAR, rowWidth);
      components.splice(bestIdx, 2, {
        ac: merged,
        maxRating: Math.max(left.maxRating, right.maxRating),
      });
    } else {
      // Merge skip-one pair: items at bestIdx and bestIdx+2
      // The item at bestIdx+1 stays in place between the merged group
      const left = components[bestIdx]!;
      const right = components[bestIdx + 2]!;
      const middle = components[bestIdx + 1]!;
      const merged = pickBestMerge(left.ac, right.ac, targetAR, rowWidth);
      components.splice(bestIdx, 3,
        { ac: merged, maxRating: Math.max(left.maxRating, right.maxRating) },
        middle
      );
    }
  }

  return components[0]!.ac;
}

/**
 * Merge two AtomicComponents, picking the better of hPair vs vStack by AR fit.
 */
function pickBestMerge(
  left: AtomicComponent,
  right: AtomicComponent,
  targetAR: number,
  rowWidth: number
): AtomicComponent {
  const h = hPair(left, right);
  const v = vStack(left, right);
  const hAR = calculateBoxTreeAspectRatio(acToBoxTree(h), rowWidth);
  const vAR = calculateBoxTreeAspectRatio(acToBoxTree(v), rowWidth);
  return Math.abs(hAR - targetAR) <= Math.abs(vAR - targetAR) ? h : v;
}
```

- [ ] **Step 3: Run the buildAtomic tests**

Run: `/opt/homebrew/bin/node node_modules/.bin/jest tests/utils/rowCombination.test.ts --testNamePattern="buildAtomic" --no-coverage`

Expected: All new `buildAtomic` tests PASS.

- [ ] **Step 4: Commit**

```bash
git add app/utils/rowCombination.ts
git commit -m "feat: replace top-down buildAtomic with bottom-up merge composition

Iteratively merges lowest-rated adjacent components first, preserving
natural input order. Higher-rated images are merged last = bigger."
```

---

## Task 3: Simplify `compose` and remove template map routing

**Files:**
- Modify: `app/utils/rowCombination.ts`

The template map (`TEMPLATE_MAP`), `lookupComposition`, `buildDominantStacked`, `buildNestedQuad`, and `generatePartitionCandidates` all become unnecessary — `buildAtomic` handles every case.

- [ ] **Step 1: Simplify `compose` to delegate to `buildAtomic`**

Replace the existing `compose` function (lines 385-418) and remove `PARTITION_THRESHOLD`, `MAX_COMPOSE_DEPTH`, and `generatePartitionCandidates` (lines 290-366). The new `compose`:

```typescript
/**
 * Composition dispatcher — delegates to buildAtomic for all sizes.
 *
 * Kept as a separate entry point for API compatibility (used by estimateRowAR
 * and as the public composition API).
 */
export function compose(images: ImageType[], targetAR: number, rowWidth: number): AtomicComponent {
  return buildAtomic(images, targetAR, rowWidth);
}
```

- [ ] **Step 2: Remove `buildDominantStacked`, `buildNestedQuad`, and `TEMPLATE_MAP`**

Delete:
- `buildDominantStacked` function (lines 454-460)
- `buildNestedQuad` function (lines 467-485)
- `LayoutTemplate` interface (lines 443-447)
- `TEMPLATE_MAP` constant (lines 488-527)

- [ ] **Step 3: Simplify `lookupComposition`**

Replace `lookupComposition` (lines 548-559) and remove `parseTemplateKey` (lines 562-570). The new version:

```typescript
/**
 * Build a composition for a set of images.
 *
 * Uses bottom-up buildAtomic for all sizes. The template map routing is no longer needed
 * since buildAtomic handles all H/V combinations naturally.
 *
 * @param images - ImageType[] assigned to this row
 * @param targetAR - Target aspect ratio for AR-aware composition (default 1.5)
 * @param rowWidth - Row width budget for AR calculation
 * @returns CompositionResult with AtomicComponent tree, structural key, and label
 */
export function lookupComposition(images: ImageType[], targetAR: number = 1.5, rowWidth: number = 5): CompositionResult {
  const templateKey = countOrientations(images);
  const composition = buildAtomic(images, targetAR, rowWidth);
  return { composition, templateKey, label: `compose-${images.length}` };
}

/** Count horizontal and vertical orientations in a set of images */
function countOrientations(images: ImageType[]): TemplateKey {
  let h = 0;
  let v = 0;
  for (const img of images) {
    if (img.ar === 'H') h++;
    else v++;
  }
  return { h, v };
}
```

- [ ] **Step 4: Clean up exports**

Remove from the file's exports: `findDominant`, `TEMPLATE_MAP`. These are no longer defined.

Keep exports: `buildAtomic`, `compose`, `lookupComposition`, `getTemplateKey`, `single`, `hPair`, `vStack`, `hChain`, `acToBoxTree`, `toImageType`, `estimateRowAR`, `buildRows`, `deriveDirection`, `isRowComplete`, `MIN_FILL_RATIO`, `MAX_FILL_RATIO`.

- [ ] **Step 5: Run type check**

Run: `/opt/homebrew/bin/node node_modules/.bin/tsc --noEmit`

Expected: PASS (no type errors). If there are import errors in test files referencing removed exports, note them for Task 5.

- [ ] **Step 6: Commit**

```bash
git add app/utils/rowCombination.ts
git commit -m "refactor: remove template map, findDominant, and specialized builders

compose now delegates to buildAtomic. lookupComposition simplified to
use buildAtomic directly. Removes ~200 lines of special-case routing."
```

---

## Task 4: Remove `reorderWithinRows` from optimizer

**Files:**
- Modify: `app/utils/rowOptimizer.ts`

- [ ] **Step 1: Remove `reorderWithinRows` and update `optimizeRows`**

Delete the `reorderWithinRows` function (lines 98-112). Update `optimizeRows` (line 118-120):

```typescript
/**
 * Public API — optimize row boundaries.
 * Drop-in wrapper around buildRows() output.
 */
export function optimizeRows(rows: RowResult[], rowWidth: number): RowResult[] {
  return optimizeBoundaries(rows, rowWidth);
}
```

Remove `reorderWithinRows` from the file's exports and from `toImageType` import (if only used there).

- [ ] **Step 2: Run type check**

Run: `/opt/homebrew/bin/node node_modules/.bin/tsc --noEmit`

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/utils/rowOptimizer.ts
git commit -m "refactor: remove reorderWithinRows — natural order preserved by buildAtomic"
```

---

## Task 5: Update test files for removed exports and changed behavior

**Files:**
- Modify: `tests/utils/rowCombination.test.ts`
- Modify: `tests/utils/rowOptimizer.test.ts`
- Modify: `tests/utils/rowCombination.characterization.test.ts`

- [ ] **Step 1: Update `rowCombination.test.ts` imports and remove stale tests**

Remove from imports: `findDominant`, `TEMPLATE_MAP`.

Delete these test blocks entirely:
- `describe('findDominant', ...)` (line ~996)
- `describe('TEMPLATE_MAP', ...)` (line ~1019)
- The `lookupComposition` tests that assert on `dom-stacked` or `nested-quad` labels (lines ~1080-1114). Keep the basic `lookupComposition` tests but update label expectations from specific template names to `compose-N` pattern.

Update `lookupComposition` tests:

```typescript
describe('lookupComposition', () => {
  it('returns compose-1 label for 1 image', () => {
    const imgs = [toImageType(createHorizontalImage(1, 5), DESKTOP)];
    const { label, templateKey } = lookupComposition(imgs);
    expect(label).toBe('compose-1');
    expect(templateKey).toEqual<TemplateKey>({ h: 1, v: 0 });
  });

  it('returns compose-2 label for 2 images', () => {
    const imgs = [
      toImageType(createHorizontalImage(1, 3), DESKTOP),
      toImageType(createHorizontalImage(2, 3), DESKTOP),
    ];
    const { label, templateKey } = lookupComposition(imgs);
    expect(label).toBe('compose-2');
    expect(templateKey).toEqual<TemplateKey>({ h: 2, v: 0 });
  });

  it('returns valid composition for 3 mixed images', () => {
    const imgs = [
      toImageType(createHorizontalImage(1, 4), DESKTOP),
      toImageType(createVerticalImage(2, 3), DESKTOP),
      toImageType(createVerticalImage(3, 2), DESKTOP),
    ];
    const { composition, templateKey } = lookupComposition(imgs);
    expect(composition.type).toBe('pair');
    expect(templateKey).toEqual<TemplateKey>({ h: 1, v: 2 });
  });

  it('handles 6+ images via compose fallback', () => {
    const imgs = Array.from({ length: 6 }, (_, i) =>
      toImageType(createHorizontalImage(i + 1, 3), DESKTOP)
    );
    const { label, composition } = lookupComposition(imgs);
    expect(label).toBe('compose-6');
    expect(composition.type).toBe('pair');
  });
});
```

- [ ] **Step 2: Update `compose` tests**

Update the existing `compose` tests. Remove the test `'n=6 with vertical panorama: single-dominant wins when appropriate'` since the dominant concept no longer exists. Keep structural/AR tests but remove assertions about dominant placement. The compose tests should verify:
- n=1: single
- n=2: pair
- n=3-6: valid tree with reasonable AR
- All leaf IDs present

- [ ] **Step 3: Update the `buildAtomic` test that manually constructs candidates**

The test `'result AR is closest to targetAR among all candidates'` (line ~1217) uses `findDominant` and the old candidate strategy. Replace it with a test that verifies the bottom-up result has reasonable AR without referencing removed functions:

```typescript
it('result AR is reasonable for mixed inputs', () => {
  const imgs = [
    toImageType(createVerticalImage(1, 1), DESKTOP),
    toImageType(createVerticalImage(2, 2), DESKTOP),
    toImageType(createVerticalImage(3, 3), DESKTOP),
    toImageType(createHorizontalImage(4, 5), DESKTOP),
  ];
  const result = buildAtomic(imgs, TARGET_AR, DESKTOP);
  const resultAR = calculateBoxTreeAspectRatio(acToBoxTree(result), DESKTOP);
  expect(resultAR).toBeGreaterThan(0.5);
  expect(resultAR).toBeLessThan(5);
});
```

- [ ] **Step 4: Update `rowOptimizer.test.ts`**

Remove the entire `describe('reorderWithinRows', ...)` block (lines 165-220).

Remove `reorderWithinRows` from the imports at the top of the file.

The `optimizeRows` integration tests should still pass since `optimizeRows` still works (it just skips the within-row reorder step).

- [ ] **Step 5: Update `rowCombination.characterization.test.ts`**

Remove imports of `findDominant`, `getTemplateKey`, `TEMPLATE_MAP` if present.

The characterization tests capture old tree shapes (which will change with bottom-up composition). Two options:
- **Option A (recommended):** Update the boxTree assertions to match the new bottom-up output. Run the characterization tests first, see which fail, then update the expected trees to match the new (correct) output.
- **Option B:** Delete the characterization test file entirely, since the new unit tests cover the contract.

Choose Option A if the characterization tests verify row assignment (which images go in which row) — that logic is unchanged. Only update the boxTree shape assertions.

- [ ] **Step 6: Run all tests**

Run: `/opt/homebrew/bin/node node_modules/.bin/jest --no-coverage`

Expected: All tests PASS.

- [ ] **Step 7: Run format, lint, and type check**

```bash
/opt/homebrew/bin/node node_modules/.bin/prettier --write app/utils/rowCombination.ts app/utils/rowOptimizer.ts tests/utils/rowCombination.test.ts tests/utils/rowOptimizer.test.ts tests/utils/rowCombination.characterization.test.ts
/opt/homebrew/bin/node node_modules/.bin/eslint --fix app/utils/rowCombination.ts app/utils/rowOptimizer.ts tests/utils/rowCombination.test.ts tests/utils/rowOptimizer.test.ts tests/utils/rowCombination.characterization.test.ts
/opt/homebrew/bin/node node_modules/.bin/tsc --noEmit
```

Expected: All clean.

- [ ] **Step 8: Commit**

```bash
git add tests/
git commit -m "test: update tests for bottom-up composition — remove stale assertions

Remove findDominant, TEMPLATE_MAP, reorderWithinRows tests.
Update lookupComposition and compose tests for new behavior.
Update characterization tests for new tree shapes."
```

---

## Task 6: Visual verification

**Files:** None (verification only)

- [ ] **Step 1: Start the dev server and verify layout**

Start the dev server and navigate to a collection page with 3-5 images. Verify:
1. Images appear in natural order (left-to-right matches the collection's orderIndex)
2. Higher-rated images are visually larger
3. No broken layouts or missing images
4. The row still fills properly (no excessive whitespace)

- [ ] **Step 2: Test with the specific bug case**

Navigate to the collection that contains `DSC_6274, DSC_6275, DSC_6304, DSC_6412`. After filtering to show these 4 images, verify they appear in a sensible order — not the old `6275, 6412, 6304, 6274` scramble.

- [ ] **Step 3: Test edge cases**

- Single image row → displays as hero
- Two images → side by side in natural order
- Row with all same-rated images → natural order preserved
- Row with many verticals → stacked compactly, not flat chain
- Mobile viewport → still renders correctly

---

## Summary of Removals

| Removed | Lines | Why |
|---------|-------|-----|
| `findDominant` | ~15 | Top-down extraction replaced by bottom-up merge |
| `generateCandidates` | ~30 | Explicit candidate trees replaced by iterative merge |
| `buildDominantStacked` | ~7 | Behavior emerges naturally from bottom-up merge |
| `buildNestedQuad` | ~18 | Behavior emerges naturally from bottom-up merge |
| `generatePartitionCandidates` | ~35 | Partition splits no longer needed |
| `TEMPLATE_MAP` + `LayoutTemplate` | ~45 | All routing through single algorithm |
| `reorderWithinRows` | ~15 | Natural order preserved by buildAtomic |
| **Total removed** | **~165 lines** | |
| **Total added** | **~60 lines** | (new `buildAtomic` + `pickBestMerge`) |
| **Net reduction** | **~105 lines** | |
