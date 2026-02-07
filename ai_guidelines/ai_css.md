# CSS & Styling Guidelines

## Critical Rules

### Flexbox Spacing: Use `gap`, NOT `padding`

**Rule:** Always use the `gap` property for spacing between flex items. Never use `padding-right/bottom` on `:not(:last-child)`.

**Why?**

Gaps exist **BETWEEN** boxes (outside content area).
Padding exists **INSIDE** boxes (reduces content area with `box-sizing: border-box`).

**The Problem with Padding:**

```scss
// ❌ WRONG - Padding approach
.hbox > *:not(:last-child) {
  padding-right: 0.8rem; // This breaks width calculations!
}
```

**What happens:**
1. Calculate sizes: `availableWidth = 1044px - 12.8px = 1031.2px`
2. Distribute: `img1 = 573px, img2 = 458px`
3. CSS adds padding **INSIDE** img1's box: content becomes `573 - 12.8 = 560.2px`
4. **Result:** Total box width = `573 + 458 = 1031px` (short by 13px) ❌
5. The padding "eats into" the content area, making items narrower than calculated

**The Solution with Gap:**

```scss
// ✅ CORRECT - Gap approach
.hbox {
  display: flex;
  gap: 0.8rem; // Gap sits BETWEEN boxes
}
```

**What happens:**
1. Calculate sizes: `availableWidth = 1044px - 12.8px = 1031.2px`
2. Distribute: `img1 = 573px, img2 = 458px`
3. Gap sits **BETWEEN** boxes (outside them)
4. **Result:** `573px + 12.8px gap + 458px = 1043.8px ≈ 1044px` ✅
5. Content fills the full calculated width

**Key Insight:**

When we calculate layout sizes, we think: "subtract gaps from available space, then distribute."

With `gap`: This mental model matches reality.
With `padding`: The padding reduces content size AFTER calculation, breaking the math.

## Related Constants

- `LAYOUT.gridGap = 12.8` (defined in `app/constants/index.ts`)
- CSS equivalent: `0.8rem` (assuming 16px base font size)

## Files Using This Pattern

- `app/components/Content/BoxRenderer.module.scss` - Generic box renderer for all layout patterns
- Size calculations in `app/utils/rowStructureAlgorithm.ts` assume gaps are BETWEEN boxes
