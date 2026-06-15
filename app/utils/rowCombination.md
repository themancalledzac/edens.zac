# Row Composition (`buildAtomic`)

`buildAtomic` is the canonical row composer. It builds each row's `AtomicComponent`
tree in two phases. Leaves stay in input order — no reordering, only adjacent splits.

## The value model — directional prominence (P / Hv / Vv)

The layout is driven by a single, **orientation-agnostic** prominence value `P`
(see `app/utils/contentRatingUtils.ts`). There is **no vertical penalty** — a 5★
portrait and a 5★ panorama both have the same rating; directionality is expressed
by aspect-ratio extremeness, not by demoting the rating.

```
P  = BASE_WEIGHT[rating] × prominenceFactor(extremeness)
Hv = √(P · AR)     // width-cost   — how much horizontal space the image demands
Vv = √(P / AR)     // height-demand — how much vertical space the image demands
```

with the identities `Hv · Vv = P` and `Hv / Vv = AR`.

- `extremeness = max(AR, 1/AR)` (direction-agnostic — a 3:1 pano and a 1:3
  portrait both have extremeness 3.0).
- `prominenceFactor` is `1.0` below `EXTREMENESS_RAMP_START` (2.0) and climbs
  linearly above it, so very wide **or** very tall images get extra weight.
- **Width-cost `Hv`** is the Stage-1 packing metric: a row is "full" when the sum
  of its leaves' `Hv` reaches `rowWidth`. A wide panorama has a high `Hv` (eats
  the budget); a tall portrait has a low `Hv` (cheap to pack horizontally).
- **Height-demand `Vv`** drives the per-row target AR (see `rowTargetAR`): a tall
  hero raises the row's peak `Vv`, pulling the target toward a taller shape.

This replaces the **retired `cv` value-model** (`getComponentValue` /
`getItemComponentValue` / `PANORAMA_AR_*`), which combined a `BASE_WEIGHT` with a
one-sided `arFactor` and a `−1` vertical penalty. `cv` is gone; `Hv` is the packing
cost and `P` is the equity target.

### Density → row width

`rowWidth = round(chunkSize × K)` where `K = DENSITY_ROW_WIDTH_MULTIPLIER` (2.1).
`K` is calibrated against the width-cost `Hv`, not the old `cv` scale: at this `K`
a default 4-chunk collection of normal 3★ landscapes (`Hv ≈ 2.108`) packs the same
4-per-row it did under the old `cv` scale. Used by `contentLayout.ts` (desktop and
mobile).

### Per-row target AR (`rowTargetAR`)

Each row derives its own target AR from the viewport baseline, pulled toward a
floor in proportion to the row's **peak height-demand** (`Vv`). A bland horizontal
row (peak `Vv` below `ROW_TARGET_AR_VV_LOW`) keeps the baseline; a row holding a
tall vertical hero targets a taller (lower-AR) shape so the hero renders bigger.
The pull is content-driven (peak `Vv`), not count-driven, so it does not affect
the density→size monotonicity. Clamped so a row never drops below
`ROW_TARGET_AR_MIN_FRACTION` (0.6) of the baseline.

### Solo hero (`isSoloHero`)

`isSoloHero` is the emergent successor to the **retired `isFullWidthHero` rule**.
An item claims its own full-width row only when **both** gates pass:

1. **Extremeness gate** (`getArExtremeness ≥ EXTREMENESS_RAMP_START`): only images
   far from square in either direction are eligible — subsumes the old `AR ≥ 2`
   gate with no new magic number, and the old rating gate is dropped per the
   prominence philosophy.
2. **Width-cost gate** (`Hv / rowWidth ≥ HERO_SOLO_WIDTH_FRACTION`, 0.5): the
   item's width-cost must dominate the row budget — subsumes the old density
   ceiling (a wide pano solos at low density, shares at high density).

A tall portrait passes the extremeness gate but its small `Hv` keeps its
width-fraction below the bar, so it never solos — its prominence is expressed as
row height via `rowTargetAR`, not a solo row. Disabled on mobile (`rowWidth ≤ 2`).

> **Deferred — AR-floor relaxation (taller-than-wide hero rows).** Letting a
> high-prominence vertical hero claim a row that is intentionally taller than wide
> is **not implemented**. The AR floor below stays hard at 1.0 on the desktop path
> (it is only disabled on the `rowWidth ≤ 2` mobile branch). See the known
> limitation at the bottom.

## Phase 1 — point-balance split (`splitByPointBalance`)

Split the row hierarchically at the adjacent boundary where the left and right
halves have the closest `effectiveRating` sums — minimise
`|leftSum − half| + |rightSum − half|` with `half = total / 2`. Ties (e.g.
uniform-rating rows) break toward the middle gap, yielding structurally-balanced
trees.

Balances on `effectiveRating` (now penalty-free — equal to the raw rating for
images): it's perceived prominence, not packing width. The width-cost `Hv` is the
packing metric, not the balance metric.

## Phase 2 — direction enumeration (`pickRootAssignment`)

Enumerate every hPair/vStack assignment of the Phase-1 tree (the root is forced
to hPair — rows are horizontal by definition), then select two-tiered:

1. **Hard AR floor at 1.0** — a row must never be taller than it is wide.
   Sub-1.0 candidates carry a large penalty. Within a small AR band
   (`AR_EQUITY_BAND`) of the best-scoring candidate…
2. **…pick the most equitable** — the tree whose leaf areas best track each
   image's **prominence `P`** (`equitySpread` / `leafShares`), so equal-prominence
   images render at similar size instead of one ballooning while its siblings are
   crushed. Using `P` (orientation-agnostic) is what lets a high-rated vertical
   claim area rather than being shrunk by the old one-sided `cv`.

`MAX_ROW_IMAGES` (12) bounds both greedy fill and this enumeration (~2^(n-1)
candidates for an n-leaf row).

## Design rationale

**Why point-balance over sum-value merge or AR-gap split.** Sum-value merge produces
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
area-vs-prominence spread wins, so sizing tracks `P` (the intended signal) rather than
being an artifact of which subtree a leaf landed in.

## Known limitation — vertical prominence is decided by STRUCTURE, not rating

> Reproduced 2026-06-10 on `/oval-lakes?manage=1` (branch `0179-mobile-first-admin`).
> This is the concrete, quantified instance of the directional-prominence plan's
> "Issue #4 — Reachability" ([2026-06-09-directional-prominence.md](../../docs/superpowers/plans/2026-06-09-directional-prominence.md)).

**Symptom:** the two highest-rated images in a row can render as the _smallest_.
For the reported row `V4★, H3★, V4★, V5★, V5★` (all but the 3★ are 9:16 verticals),
forced into one row at `rowWidth = 8`, `targetWidth = 1274`. Under the retired
`cv` model the realized sizes (smallest were the two 5★ heroes) were captured as:

| Image  | effectiveRating | cv   | rendered (w×h) | area                   |
| ------ | --------------- | ---- | -------------- | ---------------------- |
| V4★ #1 | 3               | 1.53 | 552×982        | **542,631 ← biggest**  |
| H3★ #2 | 3               | 2.50 | 420×233        | 97,785                 |
| V4★ #3 | 3               | 1.53 | 420×736        | 309,050                |
| V5★ #4 | 4               | 2.14 | 276×485        | **133,890 ← smallest** |
| V5★ #5 | 4               | 2.14 | 276×485        | **133,890 ← smallest** |

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
   _whole row_ near target AR (~1.27). Meanwhile a lone vertical (#1) that happens to land
   as its own leaf inherits the full row height and balloons. **Which vertical lands solo
   vs. stacked is not monotonic in rating** — it falls out of adjacency + AR-fitting.
2. **The AR floor is enforced only at the ROOT**, not at internal nodes
   ([`rowAR_Cost`](rowCombination.ts) / `pickRootAssignment`), so a sub-tree `vStack` of two
   verticals at AR 0.28 is permitted as long as the root row clears 1.0.
3. **The equity tiebreak can't rescue it.** `equitySpread` (the only mechanism that tries to
   make area track prominence) is confined to `AR_EQUITY_BAND` (0.3) around the AR-optimal
   candidate — and every tree where both 5★s get a full-height column falls _outside_ that
   band, so it is never even considered.

**Why the prominence rewrite alone did not fix it.** Feeding prominence `P` to the
equity metric (plan Phase 1) and removing the vertical penalty (plan Phase 3.2) are
**insufficient** for this case — neither changes the Phase-1 grouping. With penalty-free
ratings `[4,3,4,5,5]` the row still point-balance-splits into
`left[V4,H3,V4] / right[V5,V5]`, so the two heroes stay grouped and stacked, and the
realized sizes are unchanged. A row whose top item should dominate needs a **structural /
hero-isolation** step that pulls a high-prominence vertical out to its own full-height
column. `isSoloHero` provides this for **wide** extreme-AR items (width-cost gated), but
its tall counterpart — a taller-than-wide hero row via AR-floor relaxation — is **deferred,
not implemented**. Tracked as the upgraded Issue #4 in the directional-prominence plan.
