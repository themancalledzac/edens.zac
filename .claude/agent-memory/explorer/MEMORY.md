# Explorer Agent Memory

## Project: edens.zac (Next.js 15 App Router)

### Key Architecture Patterns

- API layer: `app/lib/api/{collections,content,core}.ts`
- Types: `app/types/` (PascalCase files)
- Utils: `app/utils/` (camelCase files)
- Components: `app/components/` (PascalCase directories)
- Tests mirror `app/` structure under `tests/`

### Layout System (Phase 1+2 COMPLETE as of 2026-02-23)

Pipeline: `reorderLonelyVerticals → buildRows → optimizeRows → calculateSizesFromBoxTree → render`

Key files:
- `app/utils/rowCombination.ts` — template map (TEMPLATE_MAP), buildRows, ImageType, AtomicComponent, BoxTree
- `app/utils/rowOptimizer.ts` — rowScore (fill-ratio only), optimizeBoundaries (single forward pass), reorderWithinRows, optimizeRows
- `app/utils/rowStructureAlgorithm.ts` — calculateSizesFromBoxTree (ONLY height-aware step)
- `app/utils/contentRatingUtils.ts` — getEffectiveRating, getComponentValue, getItemComponentValue
- `app/utils/contentLayout.ts` — processContentForDisplay, reorderLonelyVerticals, chunkContent (mobile)

Key facts confirmed by reading code:
- Height is ABSENT from row building. Only enters at calculateSizesFromBoxTree.
- rowScore measures fill ratio only (no height). 1.0 = perfect fill.
- optimizeBoundaries is a single forward pass (no convergence loop).
- reorderLonelyVerticals swaps [V, standalone] → [standalone, V] before buildRows.
- Slot width cancels in effective AR: (w*s)/(h*s) = w/h, so row height ≈ totalWidth / sum(w_i/h_i).
- TEMPLATE_MAP has 20 entries keyed by "hCount-vCount" (e.g., "2-1").
- isRowComplete: fill must be 0.9–1.15 of rowWidth (MIN_FILL_RATIO/MAX_FILL_RATIO).
- MAX_ROW_ITEMS=5, MIN_ROW_ITEMS=1 in optimizer.

### Constants (app/constants/index.ts)

- desktopSlotWidth: 5
- mobileSlotWidth: 2
- gridGap: 12.8 (px)
- mobileGridGap: 6.4 (px)
- defaultChunkSize: 4
- minChunkSize: 2
- headerRowHeightRatio: 0.45
- headerCoverMinRatio: 0.3
- headerCoverMaxRatio: 0.5

### Test Patterns

- Fixtures: createImageContent(), H(id, rating), V(id, rating)
- Run: `npx jest <file> --no-coverage`
- CollectionModel uses `type: CollectionType` enum (not string)
- ContentCollectionModel requires `referencedCollectionId: number`
- @testing-library/jest-dom matchers need explicit import

### Refactor Docs Location

- `todo/refactor/00-overview.md` — active work streams
- `todo/refactor/10-row-layout-main.md` — row layout phase tracker
- `todo/refactor/phase3-research.md` — Phase 3 investigation findings
- `todo/refactor/10-row-layout-08-display-modes-and-reorder.md` — display modes spec
- `todo/refactor/10-row-layout-04-edge-cases.md` — DOES NOT EXIST YET (referenced but missing)
