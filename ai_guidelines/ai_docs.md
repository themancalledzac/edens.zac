# Documentation & Comments

## Inline comments: never

No `//` or `/* */` inside function bodies, component bodies, JSX (`{/* ... */}`), test cases, or
against fields and local variables. There is no importance threshold that earns one.

"Why" context is not an exception — it goes in the docblock of the function it explains. If the
docblock would get too big because the function does too much, **split the function**.

Decided 2026-08-22 (refactor board G2) after a review proposed relaxing it. Do not propose relaxing
it again. Enforcement is tracked as G2a.

Exempt: `eslint-`, `@ts-`, and `prettier-` directives.

## Docblocks: short, and about what matters

A docblock answers one question: **what does someone need to know to use or change this safely?**

Three sentences is usually enough. Two heuristics, both falsifiable:

- If the docblock is longer than the code it documents, cut it.
- If a reader who already understands the change would skip a sentence, delete that sentence.

### What does not belong in a docblock

This is where the file gets fat. All of it belongs somewhere, just not here:

| Content                                                            | Where it goes                             |
| ------------------------------------------------------------------ | ----------------------------------------- |
| How a conclusion was reached; what was tried and rejected          | PR description                            |
| Measurements, before/after numbers, benchmark tables               | The spike group file under `docs/spikes/` |
| The history of a decision, or premises later found false           | The group file's Closed section           |
| Restating the signature, prop types, or the function name in prose | Nowhere — the code says it                |
| Anything true of the codebase generally rather than this symbol    | These guideline files                     |

Link instead of inlining: `See PF4 in docs/spikes/2026-features/pf-performance-platform.md`.

### This repo's actual failure mode

Comment-to-code ratios have been measured three times on this codebase and logged in
`docs/spikes/2026-summer-refactor/group-e-consolidations.md`: **22 of 31 source lines**, 6 of 9, and
39 of 45 — all comment. It was recorded as an estimation multiplier rather than as a defect. It is
a defect. A docblock that narrates an investigation is not thorough, it is misplaced.

The trap is specifically the no-inline-comments rule: banned from writing a comment beside the
code, it is tempting to write six paragraphs above it instead. Both are wrong; the fix is to write
less, not to relocate it.

## Keeping documentation current

- **Update in the same MR that changes the behavior.** A guideline describing code that no longer
  exists is worse than no guideline, because it is trusted.
- **Consolidate on close.** When a board item merges, its write-up moves into the group file's
  Closed section and the row comes off the board. One record per item, not two.
- **Delete what is no longer true.** Stale sections get removed, not annotated with corrections.
  If a claim is wrong, fix it in place; do not leave the wrong version beside the right one.
- **Correct comments you invalidate.** Changing behavior described by a nearby docblock means
  editing that docblock in the same commit, even when it is not otherwise part of the diff.
- **Delete inline comments in any file you touch**, whatever brought you there.
