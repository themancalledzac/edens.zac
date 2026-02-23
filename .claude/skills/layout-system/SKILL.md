---
name: layout-system
description: >
  BoxTree-based content layout system for this photography portfolio.
  Use when working on row layout, content rendering, pattern matching,
  BoxRenderer component hierarchy, rowCombination, rowStructureAlgorithm,
  contentLayout, contentRatingUtils, or slot-width calculations.
user-invocable: false
allowed-tools: Read Grep Glob
metadata:
  author: edens-zac
  version: "1.0"
---

# Layout System

## Architecture Overview

The layout system converts a flat list of content items into rows of visually balanced images.

```
contentLayout.ts
  └─ buildRows() from rowCombination.ts
       └─ produces RowResult[] (each with a BoxTree)
            └─ calculateSizesFromBoxTree() in rowStructureAlgorithm.ts
                 └─ produces RowWithPatternAndSizes[]
                      └─ BoxRenderer.tsx renders recursively
```

## Key Files

| File | Role |
|------|------|
| `app/utils/contentLayout.ts` | Layout orchestrator — entry point |
| `app/utils/rowCombination.ts` | Core layout engine: template map, BoxTree generation |
| `app/utils/rowStructureAlgorithm.ts` | BoxTree size calculator (`calculateSizesFromBoxTree`) |
| `app/utils/contentRatingUtils.ts` | Rating system: `getEffectiveRating`, `getComponentValue`, `getItemComponentValue` |
| `app/utils/contentTypeGuards.ts` | Type guards: `getAspectRatio`, `getSlotWidth` |
| `app/components/Content/BoxRenderer.tsx` | Recursive renderer for all patterns |
| `app/constants/index.ts` | `LAYOUT` constants |

## BoxTree Type

```typescript
// From rowCombination.ts
type BoxTree =
  | { type: 'leaf'; content: AnyContentModel }
  | {
      type: 'combined';
      direction: 'horizontal' | 'vertical';
      children: [BoxTree, BoxTree];
    };
```

- `leaf`: Single content item, rendered directly
- `combined`: Two children joined horizontally or vertically — rendered recursively by BoxRenderer

## LAYOUT Constants (`app/constants/index.ts`)

```typescript
LAYOUT.desktopSlotWidth = 5
LAYOUT.mobileSlotWidth = 2
LAYOUT.gridGap = 12.8  // px (0.8rem at 16px base)
```

## Rating System

Defined in `contentRatingUtils.ts`:

- `getEffectiveRating(item, rowWidth)` — returns adjusted rating for layout purposes
- `getItemComponentValue(item, rowWidth)` — proportion of row width an item occupies
- `getComponentValue(effectiveRating, rowWidth)` — effectiveRating / rowWidth

**Vertical Penalty Rule**: Vertical/square images (AR ≤ 1.0) get `effectiveRating = rating - 1` (min 0).
- A V5★ image → effective rating 4
- A V4★ image → effective rating 3

## Row Completion Threshold

A row is "complete" when total component values ≥ 0.9 (90%). Constants:
```typescript
MIN_FILL_RATIO = 0.9
MAX_FILL_RATIO = 1.15
```

## Template Map System

`TEMPLATE_MAP` in `rowCombination.ts` is keyed by orientation string (e.g. `"HH"`, `"HV"`, `"VV"`).

Each template is a `LayoutTemplate` that takes `ImageType[]` and returns an `AtomicComponent` tree,
which is then converted to a `BoxTree` via `acToBoxTree()`.

## RowResult / RowWithPatternAndSizes

```typescript
interface RowResult {
  items: AnyContentModel[];
  patternName: CombinationPattern;
  boxTree: BoxTree;
}

interface RowWithPatternAndSizes {
  items: AnyContentModel[];
  patternName: CombinationPattern | 'standard';
  boxTree: BoxTree;
  sizes: SizeTree;  // parallel structure to BoxTree with pixel widths/heights
}
```

## CombinationPattern Enum

Used for backward compat. Values: `STANDALONE`, `HORIZONTAL_PAIR`, `VERTICAL_PAIR`,
`DOMINANT_SECONDARY`, `TRIPLE_HORIZONTAL`, `MULTI_SMALL`, `DOMINANT_VERTICAL_PAIR`, `FORCE_FILL`.

## BoxRenderer Component

`BoxRenderer.tsx` renders recursively:
- `leaf` node → renders the content item (image, text, gif)
- `combined` node → renders two `BoxRenderer` children in a flex container (row or column)

## Testing Patterns

Test fixtures: `createImageContent()`, `createHorizontalImage()`, `createVerticalImage()`

Run tests: `npx jest <file> --no-coverage`

Test files mirror `app/` structure under `tests/`.
