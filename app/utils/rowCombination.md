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

## Known limitation — vertical prominence is decided by STRUCTURE, not rating

> Reproduced 2026-06-10 on `/oval-lakes?manage=1` (branch `0179-mobile-first-admin`).
> This is the concrete, quantified instance of the directional-prominence plan's
> "Issue #4 — Reachability" ([2026-06-09-directional-prominence.md](../../docs/superpowers/plans/2026-06-09-directional-prominence.md)).

**Symptom:** the two highest-rated images in a row can render as the *smallest*.
For the reported row `V4★, H3★, V4★, V5★, V5★` (all but the 3★ are 9:16 verticals),
forced into one row at `rowWidth = 8`, `targetWidth = 1274`:

| Image | effectiveRating | cv | rendered (w×h) | area |
|------|----|----|----|----|
| V4★ #1 | 3 | 1.53 | 552×982 | **542,631 ← biggest** |
| H3★ #2 | 3 | 2.50 | 420×233 | 97,785 |
| V4★ #3 | 3 | 1.53 | 420×736 | 309,050 |
| V5★ #4 | 4 | 2.14 | 276×485 | **133,890 ← smallest** |
| V5★ #5 | 4 | 2.14 | 276×485 | **133,890 ← smallest** |

Winning tree:

```
H (root, forced hPair)
├─ H
│  ├─ leaf V4★ #1            ← solo leaf in an hPair → full row height → BIG
│  └─ V (vStack) [ H3★ #2, V4★ #3 ]
└─ V (vStack) [ V5★ #4, V5★ #5 ]   ← two heroes stacked → each half-height, narrow → SMALL
```

**Root cause (in order of impact):**

1. **Composition geometry, not the value model.** In a justified row, "big" = "got a
   tall, full-height column." Phase 1 (`splitByPointBalance`) groups the two adjacent,
   equal-rated 5★s into one sibling subtree; Phase 2 can then only `hPair` them (too wide)
   or `vStack` them (halves each one's height). It picks `vStack` because that lands the
   *whole row* near target AR (~1.27). Meanwhile a lone vertical (#1) that happens to land
   as its own leaf inherits the full row height and balloons. **Which vertical lands solo
   vs. stacked is not monotonic in rating** — it falls out of adjacency + AR-fitting.
2. **The AR floor is enforced only at the ROOT**, not at internal nodes
   ([`rowAR_Cost`](rowCombination.ts) / `pickRootAssignment`), so a sub-tree `vStack` of two
   verticals at AR 0.28 is permitted as long as the root row clears 1.0.
3. **The equity tiebreak can't rescue it.** `equitySpread` (the only mechanism that tries to
   make area track value) is confined to `AR_EQUITY_BAND` (0.3) around the AR-optimal
   candidate — and every tree where both 5★s get a full-height column falls *outside* that
   band, so it is never even considered. The realized area/cv spread here is ~5.7×.

**Proof the cv penalty is NOT the cause (counterfactual):** rerunning the identical row with
the vertical penalty *removed* (so V5★ cv = 3.06, unambiguously the highest value in the row)
produces **byte-for-byte identical** rendered sizes. Penalty-free ratings `[4,3,4,5,5]` still
point-balance-split into `left[V4,H3,V4] / right[V5,V5]`, so the two heroes stay grouped and
stacked. The `−1` penalty does invert the *cv ranking* (V5★ 2.14 < H3★ 2.50 — a latent bug,
the unresolved "Q9" in the 2026-03-30 design doc), but it does not change *this* layout.

**Implication for the fix:** feeding prominence `P` to the equity metric (plan Phase 1) and
removing the penalty (plan Phase 3.2) are **insufficient** for this case — neither changes the
Phase-1 grouping. A row whose top item should dominate needs a **structural / hero-isolation**
step that pulls a high-prominence vertical out to its own full-height column (analogous to
`isFullWidthHero` for panoramas, which has no vertical equivalent today). Tracked as the
upgraded Issue #4 in the directional-prominence plan.
