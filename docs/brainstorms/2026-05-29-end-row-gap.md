# End-Row Gap Component — Design

> Branch: `0141-gif-updates` · Date: 2026-05-29 · Status: design locked, implementation blocked on reading source (file-tool outage during brainstorm)

## Problem

In the content layout (justified, rating-weighted photo grid), when the **final row** ends up containing a **single leftover image**, that image currently stretches to **full width** — it's the only slot-holder in the row, so its width share is 100%. This erases the rating-based size hierarchy: a lone 5★ and a lone 4★V render identically (both full-bleed), even though everywhere else a 5★ is visibly larger than a 4★V (which carries effectiveRating 3 via the vertical penalty, AR ≤ 1.0 → rating − 1).

## Goal

When the last row has exactly one image, size that image by its **natural rating-based share** instead of full width, and fill the remainder with an invisible **"end row gap"** spacer box — so the lone image's size still reflects its rating (5★ > 4★V), consistent with the rest of the grid.

## Chosen Approach

Treat the lone trailing image as if it had a **sibling box**. The row's boxes (image + gap) sum to a target point budget `P_budget`; the image takes `imagePoints / P_budget` of the width, the gap absorbs `(P_budget − imagePoints) / P_budget`.

### Locked decisions

1. **`P_budget` = mean of the other CONTENT rows' realized point sums**, with **fallback to the target row-points constant** when there are no other content rows (single-row / single-image collections). Rationale: realized rows all fill full width, so the mean realized sum tracks the layout's average visual scale → sizing the lone image against the mean makes it match the *average row*, maximizing consistency. (If the packer's realized sums turn out not to drift from the target, mean ≈ constant and output is identical — so this costs nothing.)
2. **Alignment: left-aligned image, gap trails right** — image stays on the grid's shared left rail (max gestalt connectedness; reads as a natural "last line"; simplest to build — gap is one box appended after the image). Rejected: right-aligned (breaks left rail / orphan look), centered (leaves rail). Trivially swappable later (gap box position or `justify-content`) — not a one-way door.
3. **No cap** on small lone images — a lone 2★ keeps its natural small size + large gap. Revisit if a stranded tiny image + huge gap looks bad in practice.

### Exception

Does **not** apply to intentional `row-density === 1` rows (images deliberately meant to span full width). The lone-image rule only fires for *unintentional* single-image trailing rows.

## Requirements

- Detect: final row, content-kind, exactly one image, NOT an intentional density-1 / full-width row.
- Compute `P_budget` = mean(other content rows' realized points); fallback to target constant.
- Insert a gap box (new box-kind, e.g. `kind: 'gap'`) sized to `P_budget − imagePoints`, placed AFTER the image.
- Image width = `imagePoints / P_budget` of row width; gap fills remainder.
- Gap renders as pure whitespace (no border/background/content), not focusable, ignored by lightbox/click handlers and counts/analytics.
- Preserve the rating→size hierarchy (verify lone 5★ wider than lone 4★V via points).

## Constraints

- App Router; Server Components default. Layout utils are pure (no DOM/React) and unit-tested — keep gap logic in the pure layer, render only in BoxRenderer.
- No `any`; use existing layout types; add gap as a discriminated box-kind following the existing content/header tagging pattern.
- Adds a new box-kind rather than changing rating math, so existing fixtures should be stable; new fixtures needed for the gap case.
- Tests required for new util logic (`tests/utils/layout/`).

## Open Questions / Pre-implementation verification (BLOCKED on file-tool outage)

Must confirm against source before planning/implementing:

1. **Width model**: is rendered width ∝ points/slots, or aspect-ratio justification? Determines how the gap box is expressed (slot count vs flex-basis vs points weight).
2. **`row-density === 1` mechanism**: how is an intentional full-width single-image row represented/detected today?
3. **Target constant**: exact name/value in `layoutConstants.ts`; and does the greedy packer's realized row sum systematically drift from it (if not, mean ≈ constant)?
4. **Types**: `LayoutRow` / Box shape; existing box-kind discriminant (content/header) to extend with `gap`.
5. **Renderer**: how `BoxRenderer` maps a box to width; where a gap box slots in; SCSS for the spacer.
6. **Placement of detection logic**: `contentLayout` orchestration vs `rowStructureAlgorithm` vs a post-pass.

## Next Steps

1. (Blocked) Read the layout files + `BoxRenderer` + types to resolve the open questions.
2. `superpowers:writing-plans` → implementation plan with a spec-coverage table.
3. TDD: fixtures for lone-image last row (5★ vs 4★V, density-1 exception, single-row fallback), then implement.
