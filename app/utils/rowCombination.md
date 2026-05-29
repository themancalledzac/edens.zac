# Row Composition (`buildAtomic`)

`buildAtomic` is the canonical row composer. It builds each row's `AtomicComponent`
tree in two phases. Leaves stay in input order — no reordering, only adjacent splits.

## Phase 1 — point-balance split (`splitByPointBalance`)

Split the row hierarchically at the adjacent boundary where the left and right
halves have the closest `effectiveRating` sums — minimise
`|leftSum − half| + |rightSum − half|` with `half = total / 2`. Ties (e.g.
uniform-rating rows) break toward the middle gap, yielding structurally-balanced
trees.

Uses `effectiveRating`, not `cv`: it's perceived prominence. `cv` would
double-penalise verticals by reapplying the AR factor on top of the rating.

## Phase 2 — direction enumeration (`pickRootAssignment`)

Enumerate every hPair/vStack assignment of the Phase-1 tree (the root is forced
to hPair — rows are horizontal by definition), then select two-tiered:

1. **Hard AR floor at 1.0** — a row must never be taller than it is wide.
   Sub-1.0 candidates carry a large penalty. Within a small AR band
   (`AR_EQUITY_BAND`) of the best-scoring candidate…
2. **…pick the most equitable** — the tree whose leaf areas best track each
   image's `cv`, so equal-rated images render at similar size instead of one
   ballooning while its siblings are crushed.

`MAX_ROW_IMAGES` (12) bounds both greedy fill and this enumeration (~2^(n-1)
candidates for an n-leaf row).

## Design rationale

**Why point-balance over sum-cv merge or AR-gap split.** Sum-cv merge produces
"dominant emergence" — the heaviest item ends up alone at the root, visually
singling it out even on uniformly-rated rows. AR-gap split makes structural
choices off an orientation-boundary signal that isn't always meaningful (with
multiple AR boundaries an arbitrary tie-break decides which side gets the lone
item). Point-balance ties the split to perceived prominence: items group when
their combined weight matches the other side's. Same-rated rows yield balanced
trees.

**Why a hard floor at 1.0.** "Never taller than wide" takes priority over
"closest to square" when they conflict — e.g. on a 2H+2V row a near-square
2×2 nested arrangement at AR ~0.9 is rejected in favour of a wider (≥1.0) arrangement,
even though 0.9 is closer to square.

**Why enumeration in Phase 2.** The aspect-ratio constraint is global; local
greedy direction picks can't see the cumulative effect (children that look fine
in isolation can compose into a too-tall or too-wide row). Small trees (≤12
leaves) make exhaustive enumeration cheap, so it finds the genuine optimum.

**Why no special-case rules.** The floor + equity selection subsume the special
cases older composers needed:

- Top-level no-vStack is a hard constraint (forced hPair at the root).
- vertical-depth caps are unneeded — deep vStacks emerge when they make a row squarer at
  high density, and are rejected by the floor when they'd make it taller than wide.
- "4★+ blocks vStack" is unneeded — a 4★ leaf in a deep vStack that tanks the
  row AR is rejected by the floor.
- Same-orientation (V+V) avoidance is unneeded — narrow-AR vStacks push the row
  AR below 1.0 and get rejected.

Selection is two-tiered, not a stack of special-case rules: (1) the AR floor plus closeness
to the target row AR pick the acceptable band; (2) within it, the lowest
area-vs-cv spread wins, so sizing tracks `cv` (the intended signal) rather than
being an artifact of which subtree a leaf landed in.
