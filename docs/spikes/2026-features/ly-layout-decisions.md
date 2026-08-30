# LY — Layout decisions

_Context file for board items LY1–LY2 on [2026-features.md](../2026-features.md). Both items are
user adjudications with the build gated behind them._

## LY1 · Lone-last-row sizing — pick one design, then build

The problem: a lone image in a collection's last row renders full-width regardless of its rating.
Two incompatible solutions were designed and neither was built (verified: zero
`FILLER`/`gapBox`/`endRowGap` hits in `app/utils`):

- **Gap-box spacer** (`docs/superpowers/plans/005-end-row-gap.md`, gitignored): append an
  invisible spacer box to the final row so the real image takes its proportional width.
- **FILLER atom** (row-composition redesign spec §13): a first-class atom type in the
  `compose()`/`buildAtomic` pipeline.

Context the chosen design must compose with: `buildRows` already carries a BLANK-spacer post-pass
(`MIN_FILL_RATIO`, `padRowToWidth`, solo-hero skip) from the 2026-07-16 row-width normalization —
the winner is whichever design extends that machinery rather than fighting it. `docs/005-layout.md`
flags this as the one concrete unreconciled design conflict in the spec set. After the pick
(decision #6), TDD the implementation against `tests/utils/rowCombination*` conventions.

## LY2 · Admin panel width vs page height

From the 2026-08-10 admin-hub panel work. The shared-width predicate (`pinnedWidthSpread`,
`e2328f6`, named causal by bisect) fixed a real fill defect but costs page height in the
`messages+roles` collapse state: 1607.0px against a 1567.7px all-open baseline, and 2683.6px at a
1174.4px body (+71%, portrait cover stranded into its own row). Both outcomes are already
implemented and the exact values are pinned in `tests/(admin)/admin/page.collapseStates.test.ts` —
flipping the decision is a predicate change plus re-pinning the tests. The trade looks intrinsic,
not tunable. Pure adjudication (decision #7).

**Settled nearby — do not re-attempt:** Phase C content-measured panel heights was implemented and
reverted the same day; the measure→re-pack→re-measure loop does not converge and each re-pack
remounted panels, re-firing all three admin fetches until the browser exhausted its socket pool.
Heights derive from server-resolved row counts, which severs the cycle. The collapsed-panel design
was also reversed on review: a closed panel is an ordinary small pinned block (180×102), not a
full-width `isSoloHero` bar.

## Parked ideas (recorded so they are not rediscovered)

Mobile text overlay (self-labeled deferred experiment), the WFC mosaic, and the obsolete Pattern
Tree. Property-based layout tests are debt, tracked via chapter 006 and the refactor board's
roadmap — not a feature row here.

## Closed

_Nothing yet._
