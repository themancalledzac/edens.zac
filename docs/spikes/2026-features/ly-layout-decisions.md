# LY — Layout decisions

_Context file for the LY items on [2026-features.md](../2026-features.md). Both LY items are
closed: LY2 on 2026-08-31 as a pure adjudication, LY1 on 2026-09-02 as a correction — the
behaviour it proposed building was already shipped. No open LY row remains._

## Parked ideas (recorded so they are not rediscovered)

Mobile text overlay (self-labeled deferred experiment), the WFC mosaic, and the obsolete Pattern
Tree. Property-based layout tests are debt, tracked via chapter 006 and the refactor board's
roadmap — not a feature row here.

## Closed

### ☑ LY1 · Lone-last-row sizing — CLOSED 2026-09-02, the behaviour already shipped

**Closed as a correction, not a build. The behaviour was already shipped.**

The item said a lone image in a collection's last row renders full-width regardless of its rating,
and that two designs existed to fix it with neither built — the gap-box spacer
(`docs/superpowers/plans/005-end-row-gap.md`, gitignored) and the redesign spec's §13 FILLER atom.
The evidence for "neither built" was `grep -rn "FILLER|gapBox|endRowGap" app/utils` returning 0.

**That grep checked names, not behaviour, and the gap-box design ships under the name BLANK.**
`padRowToWidth` (`app/utils/rowCombination.ts:683`) appends a horizontal BLANK sibling to an
under-filled trailing row, so the real item renders at its proportional width share rather than
stretching to fill. Three gates decide a genuine leftover — trailing row only, under `MIN_FILL_RATIO`,
and the row could have absorbed another item — and it skips solo heroes and any row holding a
declared `minWidth`. That is the gap-box design, built and pinned:

```bash
npx jest tests/utils/rowCombination.blankPadding.test.ts   # → 14 passed
```

This file itself named the machinery — "the winner is whichever design extends that machinery
rather than fighting it" — without noticing that the machinery already WAS one of the two designs.

**The stated defect was also wrong about the mechanism.** Rating does not enter into it. The only
lone item that still fills its row is one passing `isSoloHero`, which gates on aspect-ratio
extremeness (an extreme-wide panorama), and that row is intentional.

**Zac's answer, put to him with the correction: close it, build nothing.** He declined the
FILLER-atom rewrite, which would relocate the same behaviour from a post-pass into the
`compose()`/`buildAtomic` pipeline and change no rendered output, and declined altering the
solo-hero rule. Neither design is to be re-proposed.

**The transferable lesson.** The feature board carries a rule that a fix is not verified by the
absence of the string it moved. This is the same error inverted: a feature was recorded as unbuilt
because the string naming it was absent. A design's vocabulary is not its behaviour, and a naming
grep can only ever answer a question about names.

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
