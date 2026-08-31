# LY — Layout decisions

_Context file for the LY items on [2026-features.md](../2026-features.md). LY1 is a user
adjudication with the build gated behind it; LY2 closed on 2026-08-31._

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

## Parked ideas (recorded so they are not rediscovered)

Mobile text overlay (self-labeled deferred experiment), the WFC mosaic, and the obsolete Pattern
Tree. Property-based layout tests are debt, tracked via chapter 006 and the refactor board's
roadmap — not a feature row here.

## Closed

### ☑ LY2 · Admin panel width vs page height — ADJUDICATED 2026-08-31, no code change

From the 2026-08-10 admin-hub panel work. The shared-width predicate (`pinnedWidthSpread`,
`e2328f6`, named causal by bisect; `app/utils/rowCombination.ts`) fixed a real fill defect but
costs page height wherever it strands the 1728×2500 portrait cover full-bleed in a row of its own.
Both outcomes were already implemented, so the question was which rule yields, not what to build.

**Zac's answer: the shared width holds, and the height cost stands.** Asked whether two panel
columns sitting side by side should be allowed to render at different widths, he said no — the
same atomic-design reasoning that groups a column applies to columns beside each other. Nothing
shipped: the predicate, the tolerance and the pinned heights are all unchanged.

**The question was narrower than the board framed it, and that is worth keeping.** Both this file
and the test docblock described `pinnedWidthSpread` as a rule about "panels in a row", which reads
as though it also governs stacking. It does not. `renderedLeafWidths` hands both children of a 'V'
split the full width, so a column is uniform by construction and scores 0 on the predicate no
matter what. Every spread it has ever rejected came from an 'H' split — two panel columns beside
each other. The measured populations say the same thing: same-column spreads land at 4.9–6.4px and
are a gap-accounting artifact, genuinely-split columns at 24–148px.

The accepted cost, for anyone re-reading the heights later: baseline 2009.5px, against
`messages+collections` 3099.4, `messages+roles+collections` 2875.4, `roles+collections` 2023.1, and
`users` alone at a 1174.4px body 2641.4. **Do not restate those here as they drift** — the
authority is the test file's own docblock in `tests/(admin)/admin/page.collapseStates.test.ts`,
which explains why they move and now records the adjudication. Re-tuning the collections count to
chase a figure would be fitting the fixture to the assertion.

**Settled nearby — do not re-attempt:** Phase C content-measured panel heights was implemented and
reverted the same day; the measure→re-pack→re-measure loop does not converge and each re-pack
remounted panels, re-firing all three admin fetches until the browser exhausted its socket pool.
Heights derive from server-resolved row counts, which severs the cycle. The collapsed-panel design
was also reversed on review: a closed panel is an ordinary small pinned block (180×102), not a
full-width `isSoloHero` bar.
