# 2026 Summer Refactor — Living Checklist

_Formerly `docs/spikes/2026-08-22-frontend-cleanup-spike.md`; renamed 2026-08-23 as the standing
per-session tracker (a pointer stub remains at the old path for stale references)._

_Origin: full critical review of `main` on 2026-08-22, produced by 8 parallel review agents (API, security, utils/hooks, admin surface, public surface, tests, styles, organization/roadmap). Every dead-code claim was verified by grepping call sites; the parent session re-verified every high-severity claim against current code. Full-board re-review 2026-08-22/23 by 7 more agents — stamp archived in [lessons.md](2026-summer-refactor/lessons.md). A 9-agent split review re-verified both repos' boards on 2026-08-28; its corrections and new items were applied 2026-08-29._

**This file is a running to-do list, not a one-shot report.** Work is split into numbered MRs sized to land in a single sitting. Check the box when the MR merges, and put the PR number next to it. Keep the `file:line` references — they let any MR be picked up cold.

> **Two tiers. This file carries ONLY what is still open.**
>
> When an item closes, its write-up **moves** to its group's archive under
> [`2026-summer-refactor/`](2026-summer-refactor/) rather than staying here ticked. The group heading
> keeps a one-line pointer naming what shipped and where. Same split for the session log: the newest
> two entries stay here, everything older lives in
> [session-log.md](2026-summer-refactor/session-log.md). The long-form incident narratives behind
> the rules below live in [lessons.md](2026-summer-refactor/lessons.md).
>
> | Tier    | File                                             | Holds                                                                                                                            |
> | ------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
> | Live    | this file                                        | distilled working rules, the open MR board, the open-item classification, open item sections, the newest two session-log entries |
> | Archive | [`2026-summer-refactor/`](2026-summer-refactor/) | every closed item's full write-up and closed-row ledger, one file per group, plus the older session log and lessons.md           |
>
> **Why:** this file is `@`-referenced into a fresh session's opening context every run, so its
> length is a per-session cost paid forever. It reached 4,571 lines on 2026-08-28 before the split
> was re-applied (~1,980), and was restructured again 2026-08-29 — rules distilled with narratives
> moved to lessons.md, closed MR rows ledgered into the group files. Anything a session must read
> to start work belongs here; anything it would only read to understand a decision already made
> belongs in the archive.
>
> **The invariant that makes this safe:** an open item must be readable with every archive file
> closed. Where an open item depends on something shipped, copy the part it needs into the open item
> as a guardrail. Generalizable lessons get hoisted into "How to use this doc" **before** the item's
> section moves — that is what stops archiving from losing a rule.

> **Tracked in git since PR #271 (2026-08-23).** `.gitignore` negates exactly four paths under
> `docs/spikes/` — this file, `2026-summer-refactor/`, `2026-features.md`, `2026-features/` — a new doc goes INSIDE one of the two directories, never beside them
> (`git check-ignore -v` to confirm). The tracking history, the accepted public-repo trade-off, and
> the stale-local-main sync trap: [lessons.md](2026-summer-refactor/lessons.md).

> **A cross-board review handoff was written 2026-09-04:**
> [2026-features/2026-09-04-board-review-handoff.md](2026-features/2026-09-04-board-review-handoff.md).
> It records what was re-run and what had drifted at `main` @ `29bd30f0`, and it names claims on
> BOTH boards that were false — including three items marked COLD that had already shipped.
> **Applied 2026-09-05** (session log below): this board's row table, NEXT RUN, state table, refs
> and archives were brought into line with `main` @ `699aa4f2`.

## How to use this doc

Each rule below is the distilled form; the incident that earned it is in
[lessons.md](2026-summer-refactor/lessons.md) under the same heading order. Links in board files
are repo-root-relative by convention — they are checked against the repo root, not resolved from
`docs/spikes/`.

- One MR per numbered item (`A1`, `B3`, …). Do not bundle across items.
- **A status cell naming an open PR is a claim, not a fact.** Run `gh pr view <N> --json state,mergedAt`
  on every PR the board calls open — on 2026-08-24 all five "open" rows had merged hours earlier.
  Close the row AND the boxes in the same pass as the merge.
- **Verify checkboxes against the filesystem, not the heading.** B8 advertised three finished
  slices for three days. The check is one `ls` or one `git log --diff-filter=A -- <test path>` per bullet.
- **Open every PR here with `--base main` — no exceptions.** A stacked PR whose base merges
  un-deleted lands on a dead branch while `gh` says MERGED (#314, #325, #332). Truth is
  `git merge-base --is-ancestor <sha> origin/main`, never the badge; delete base branches on merge.
- **A `file:line` ref written during the session that edits that file is born stale.** Re-resolve
  every ref against the tree as it stands when you commit, and anchor on declarations, not body lines.
- **A fallback error string at a call site is not an unhandled error.** Follow the error to the
  mapper that renders it before filing anything — C7's `mapError` already covered 401/403/409.
- **Read the sibling repo's source and tests, never a paraphrase** — including a paraphrase on this
  board, and including the sentence after the one that supports you (C6 died on the next clause).
- **Read the OTHER repo's board and HEAD before stamping an item BLOCKED-on-user.** Two of this
  board's nine user-blocked rows were answered on 2026-08-30 by facts already sitting in
  `edens.zac.backend`: G5's wrap-vs-bless was decided in its `.claude/CLAUDE.md` and its HEAD commit
  message, and C9's premise turned out to be a backend defect. A question the other repo already
  answered costs the user nothing and eats a session if nobody looks.
- **A backend change can silently falsify a frontend standing instruction, and nothing watches for
  it.** Backend #243 made `/api/admin/**` unconditionally gated and thereby made `CLAUDE.md`'s
  "Localhost Admin Needs No Login" Critical Rule false until G6 (#351) corrected it — a rule that
  told agents _not to investigate_ the breakage it was causing. When either repo changes an auth perimeter, a
  response shape, or a local-dev affordance, grep the other repo's `CLAUDE.md` and guidelines for
  claims about it in the same pass.
- **A "should we tolerate this bad state?" item is often a "why does this bad state exist?" item.**
  C9 was costed as a rendering decision for a week; one look at where the value is produced turned
  it into a backend bug and closed the frontend side at zero code. Trace the value to its writer
  before costing a way to live with it.
- **A guard that must release on a prop change must be DERIVED from that prop, never reset by an
  effect.** An effect runs after paint, so a reset-on-exit renders the broken frame once every time.
  C10's own fix sketch offered the two as equivalent; they are not.
- **When an item is a wrong sentence, grep the sentence.** A9 tracked one file and the false claim
  lived in three, because the board recorded where the defect was FILED, not where it APPEARED.
  Five re-verifications of "this claim is false" never re-checked how many places carried it.
- **A filename glob with a middle wildcard silently excludes the unsuffixed base file.**
  `CollectionPageWrapper.*.test.tsx` matches `.meTile` and `.allCollectionsTile` but not
  `CollectionPageWrapper.test.tsx`. Enumerate movers by the import they carry, not their name shape.
- **A suite count that rises without a new assertion is not coverage.** Directory-walking generators
  (`tests/components/panelStyleReferences.test.ts` uses `readdirSync` + `it.each`) mint a case per
  file, so any MOVE into a watched directory changes the total. Say which of a delta is generated.
- **Cross-repo `file:line` refs are outside every drift sweep here.** Re-verify them by hand against
  that repo's `origin/main` whenever such an item is picked up.
- Every MR ends with the standard verification: scoped `eslint --fix` → `prettier --write` → `tsc --noEmit` → full `jest`.
- **Prove every regression test fails without its fix.** Stash the source change, watch the test go
  red, restore. A green test proves nothing until you have watched it fail.
- **A silent result is evidence only if the channel can speak.** Include a case that SHOULD trigger
  the thing, in the same run (D3's clean CSP console had loaded no images at all).
- **Verify a prescribed mechanism before implementing it.** D5's "one prefix check" was walked past
  by `api/../actuator/env`; one `new URL(...).pathname` in node caught it before any code.
- **An item's test-coverage claims are claims — check them like refs.** D9's "no test would catch
  it" was false; one sed and one jest run settled it.
- **An audit's method is a claim too — state what its pattern cannot match** and walk that blind
  set by hand (C4's literal grep called the template-built `collection-home` dead).
- **A prescribed fix can be right on the happy path and wrong on the error path — read the failure
  branch first.** Error paths run late, hold stale closures, and are the least covered code (C3).
- **Collapsing two exports into one reference merges their jest automocks.**
  `grep -rn "jest.mock('<module path>')" tests/` first; on hits, keep two delegating functions and
  say why in the docblock. The tell is that nothing fails (E3's `update === set`).
- **When a row names a merged PR, `git show --stat <sha>` it against the bullet list BEFORE trusting
  any checkbox.** The PR credited in the status cell is usually the one that silently finished the
  "open" bullets — five occurrences. Never carry a checkbox forward on the strength of its row.
- **An item that hands work to the USER needs its verification check written in** ("done when
  `find app -iname '*layoutpreview*'` is empty"), or it becomes immortal — A9 re-filed for five sessions.
- **Never quote a recorded suite/test baseline. Re-measure by stashing the tree and running the
  suite.** Every recorded number on this board aged out within days, and each was correct when taken.
- **The mock-declaration count is the unit of value for a MOVE item.** Grep
  `jest.mock('<source>')` and the destination in `tests/`, count the overlap: high overlap pays
  (#336 merged twelve declarations into six), zero is cosmetic, a split with overlap costs.
- **Write the shared signature before consolidating.** If over ~a third of its params only switch
  behavior between callers, they are not duplicates — record the measurement and the smaller
  alternative and stop (killed F3's invites.ts, E7's hook, E6 bullet 1). A costed rejection is a
  finished outcome.
- **Size the duplicated region, not the file.** "Halves the file (~100 lines)" halved 286 total
  lines; the real dedup was 46 code lines (E3). When an item says "halves", measure what collapses.
- **An item on an unmerged board branch is invisible to the session doing its work.** Merge board
  PRs before starting the items they define, or check `git diff main...<board-branch>` first (#307).
- **Work in the primary checkout — no worktrees while one branch is in play.** The worktree traps,
  should two concurrent branches ever return, are recorded in lessons.md. The one exception is
  `CLAUDE.md`'s: another session is using the checkout (the backend repo, twice). Then, and only
  then, a worktree off `origin/main`.
- **Grep an item's symbols for test call sites before sizing it.** Zero hits: trust the source-only
  number (D4 ±1). Any hits: budget test churn on top (A4, A6, D2, D6 all came in over).
- **Re-read any outside-world value from more than one sample** — hosts, headers, distributions
  (D4's pin would have missed a second CloudFront distribution). Seven pages took a minute.
- **Where a written plan exists, the plan's scope beats this board's one-liner** (E1: the plan was
  right about WHY the item mattered; the board was not). Read the plan first.
- **Before filing a fix for a "missing" field check, grep the type** — confirm the data exists
  (C6: the model simply has no `isPasswordProtected`).
- **Closing an item and moving its write-up are one act, in the same close-out commit.** First
  hoist any generalizable lesson here, then copy anything an open item needs inline as a guardrail,
  then move the section and leave a one-line group pointer. Skipping the move is how this file hit
  4,571 lines, paid by every future session.
- **`2026-summer-refactor/` is the board's reference set:** shipped write-ups + non-cleanup detail.
  Invariant: board + live sections must let any cleanup MR start cold with every reference file
  closed — an item with a row keeps its detail live; decisions/design/ops/vision get no row and
  live in a reference file.
- **Jest and tsc cannot see CSS-module failures** — dangling file imports and dangling
  `styles.<key>` both stay green; only `next build` fails. Guards:
  `tests/styles/scssImportResolution.test.ts` (files), `tests/components/panelStyleReferences.test.ts`
  (keys, panels only). Any MR touching SCSS verifies by `next build` or a resolution assertion.
  **Sizing commands, recorded 2026-08-30 so the number stops drifting** — files importing a CSS
  module: `grep -rlE "from '.*\.module\.(scss|css)'" app --include='*.ts' --include='*.tsx' | wc -l`
  → **105**; distinct key names: `grep -rhoE '\bstyles\.[A-Za-z_][A-Za-z0-9_]*' app --include='*.ts' --include='*.tsx' | sort -u | wc -l`
  → **402**. Both were recorded as 104/401 and were wrong when written. **A `styles.<key>` regex is
  not the whole surface: 10 import statements across 9 files bind a module to another name**
  (`cbStyles` ×5, `modalStyles` ×4, `variantStyles` ×1 — `CollectionContentRenderer.tsx` carries two
  of them, which is why counting statements and counting files give different answers), and a guard
  sized off this pair would skip them silently.
  (The repo-wide key-guard decision is in the blocked-questions table.)
- **A test that cannot fail is this board's most common defect.** Prove it with a control: run the
  old test against broken source. After ANY copy change, sweep `queryBy…` +
  `not.toBeInTheDocument()` against renamed strings — they pass vacuously (E5, B5, H2a).
- **`new Response(...)` in a test mock throws under jsdom**, making N parallel fetches record one
  call. Resolve a plain `{ ok: true }`, the repo convention.
- **Before escalating any question to the user, grep the source and the crediting PR for the
  answer.** "Report what it would cost" guardrails land in docblocks and PR bodies, not here —
  E3 sat blocked four days past its own answer.
- **Re-derive drifted refs from anchors, never by adding an offset.** A multi-hunk merge has
  multiple offsets, a Prettier collapse is a hunk, and generic punctuation (`);`) is not an anchor
  (F1, three times).
- **Never cite this tracker by line number — reference sections by heading.** The tracker moves
  constantly; a `2026-summer-refactor.md:NNNN` ref dangled past EOF within a day of being written.
- **An open item must be readable without opening the archive.** Copy the part it needs inline as a
  guardrail (B1 restated exactly what E11's drift test cannot see).
- **A new reference file must go INSIDE `docs/spikes/2026-summer-refactor/`, never beside it.**
  `.gitignore` negates exactly four paths (both boards and their directories); a doc beside them vanishes silently.
  `git check-ignore -v <path>` before assuming any new doc is safe.
- **A claim that two test suites are duplicates is really a claim about their SOURCE.** Read the
  source both suites call (B3's "triplet" was two real functions plus unrelated logic; B7's spies
  watched a listener that is never registered).
- **Duplication claims are the weakest class on this board — budget for checking, not acting.**
  One in five survived intact; expect the work to be merging rather than deleting.
- **A red-then-green test is the gate, but not the same as having watched the bug.** Where an
  observation is cheap — a page to open, a button to click — spend the minute and record that you
  did; where it is not, say so in the item (C1's fixture encoded the fix's own error).
- **Write the command beside any count you write.** A number with no recorded method can only be
  re-derived, not verified (F2, G2c). Before calling a count unrepairable, try two or three
  plausible metrics — reproducing most of the table IS the method.
- **A line count cannot see a narrowed type, a moved file, or a reversed dependency edge.** If an
  item's win is not diff-measurable, say so in the estimate column instead of writing a number that
  will later read as a miss (E17: sized −15, shipped +3, nothing went wrong).
- **An item whose deliverable is an action rather than a diff must say so in its row.** D15's
  frontend half was one `revalidateTag` — a runtime purge, not a commit — and it was picked as a
  run's first item on the strength of being "fully specified". It was; it just had no MR in it.
- **A time-boxed item needs its expiry in the row.** D15 was filed with a 3600s cache fuse and
  carried as live work for three days after the window shut. Nobody re-checked the clock, because
  a checkbox does not look like it expires.
- **Un-stacking MRs is necessary but not sufficient to avoid a tracker conflict, because a run's
  items are adjacent lines.** Git merges two hunks only when an unchanged line separates them, and
  the run list numbers items consecutively while the state table lists them as neighbouring rows.
  #410 and #411 conflicted on exactly that as independent branches off `main`. Budget one rebase
  per merge and run it before the user sees the PR; or keep per-item status edits out of the code
  MRs and close the whole run's rows in one docs MR.

**A lint rule shipped alongside its own remediation must be run against that remediation before the
PR opens.** #414 shipped the inline-comment rule and, in the same diff, converted inline comments in
two test files into docblocks above `it()` — which that rule reports. CI was green, because the rule
lands as `warn`. A `warn`-level rule buys a safe rollout and costs you the signal that would have
caught this at review; run the rule over your own diff by hand when it is new.

**A crude re-run of a recorded sweep is not a re-verification of it.** The third principle says
re-run recorded commands, and it is right, but a _reimplementation_ of a prose method is a different
command. This close-out re-ran G4's board-label sweep with a naive `\b[A-H][0-9]{1,2}\b`, got 18
against the recorded 17, and started correcting the board — the 18th was `H5★`, a five-star
horizontal rating, which the section had already flagged as the false positive to watch. **Read the
section's caveats before trusting your own re-run, and prefer the recorded command to a rewrite of
it. Where only prose exists, write the runnable form down** so the next pass runs the same thing.

## MR board

Open rows only. The 72 closed rows live as one-line ledgers under a "Closed rows" heading in each
group's archive file in [`2026-summer-refactor/`](2026-summer-refactor/); the estimate-bias
scorecard below keeps the est/actual pairs that still matter.

Three checks, run every close-out (imported from the feature board 2026-09-05, after this table
was found seven rows short of its own sections):

```bash
# every row has a section, and every section has a row
grep -oE '^\| [A-Z][0-9]+ +\|' docs/spikes/2026-summer-refactor.md | tr -d '| ' | sort > /tmp/rows
grep -oE '^### [☐◐⛔] [A-Z][0-9]+' docs/spikes/2026-summer-refactor.md | awk '{print $3}' | sort > /tmp/secs   # awk, not sed: BSD sed mangles a multibyte bracket
comm -3 /tmp/rows /tmp/secs                                   # must be empty
# no closed section survives on the live board
grep -c -e '^### ✅' -e '^### ☑' docs/spikes/2026-summer-refactor.md   # must be 0
# no archive file carries two headings for one item (keyed on the status mark; H2a/H2b share a stem by design)
grep -ohE '^#{2,3} [☐◐⛔✅☑] [A-H][0-9]+[a-z]?' docs/spikes/2026-summer-refactor/group-*.md \
  | grep -oE '[A-H][0-9]+[a-z]?' | sort | uniq -d                  # must be empty
```

| MR  | Scope                                                   | Status                                                                                                                                                                                                                                     |
| --- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| B8  | Fill the required-coverage gaps                         | ◐ 5 of 6 — #266, #267, #295, #296; only the optional bullet is open (`sharedObserver` 116 / `useParallax` 169 / `useContentReordering` 197 lines, all untested)                                                                            |
| E7  | Edit-grid handoff (was `useFilteredContentBlocks` hook) | ◐ waste FIXED #337; hook REJECTED; one path open (`EditModeLayer.tsx:281` reorder branch, unsized)                                                                                                                                         |
| F1  | Decompose `useCollectionEdit.tsx` (1,829 lines)         | ☐ COLD — largest open item; anchors re-derived 2026-09-06; goes BEFORE feature-board MA1 and leaves the update-form region alone (see section)                                                                                             |
| F3  | File moves and renames                                  | ◐ seven shipped (#324 #336 #343 #348 #349 #409 #414); invite REJECTED; two bullets open                                                                                                                                                    |
| F4  | `TaxonomyPage` ← `LocationPageClient`                   | ☐ DECIDED 2026-09-08 **merge them** — tag pages take filters, the collections strip, the header cover and follow seeding, and become a client page. COLD and UNSIZED; do not schedule beside F1                                            |
| G2  | Inline-comment enforcement + migration                  | ◐ wording #268; **G2a SHIPPED #414** as `warn`. G2b is **2,893 across 248 files** re-run on `main` at `5537c4aa` — **less the 4 false positives G2d fixes, so 2,889 is the real target**; splits `app/` then `tests/`; G2c rides refactors |
| G2d | G2a's rule flags docblocks above `it()`                 | ☐ COLD, cheap, fully specified. **Blocks G2b-tests** — the prescribed `tests/` migration hoists into a `describe`/`it` docblock, which the rule reports. ~10 src / ~4 test                                                                 |
| G4  | Docblock standard — length, structure, and no history   | ◐ intersection pass #310; **1,500** blocks / 54 hits (re-run on `main` at `5537c4aa` 2026-09-08 (2)); 17 label docblocks + 4 inline, re-verified; read, don't regex                                                                        |
| H1  | Merge `Following` into `Collections` on `/user`         | ☐ DECIDED 2026-09-08 — **one list of all associations plus a `following` filter**, no tile marker, count is the union. COLD; the filter's home in the toolbar is the open design question                                                  |
| H7  | Passkey management on `/admin/users/[id]`               | ☐ DECIDED 2026-09-08 **yes** — builds as feature-board AU2's admin half, not as a row here. Closes against AU2                                                                                                                             |

### NEXT RUN — picked 2026-09-08 (2)

**The 2026-09-08 run emptied, and it emptied the blocked list with it.** Two code MRs — **#414**
(D13 + G2a + F3's log label) and **#415** (G8) — plus this docs MR. **All four user questions were
asked in the opening message and all four were answered**, which is the whole reason the run
produced more than the three items it was scoped to: G8 went from a blocked question to a merged MR
in the same sitting.

**State of `main` at `e6bdad3a`, measured 2026-09-08:** 264 suites / 4,788 tests, 0 failures;
`npm run lint` clean. After both MRs: **266 suites / 4,885 tests**, `eslint .` **0 errors / 2,909
warnings** (all from G2a's new rule, and `lint:js` sets no `--max-warnings`, so CI is unaffected).
`tsc --noEmit` still fails locally on three stale `.next*/types/validator.ts` files left by #411's
route deletion — an artifact, not a regression; all three directories are gitignored and regenerate.

**Nothing on this board is blocked on anyone.** The blocked list is empty for the first time since
it was created. Every remaining item is COLD, and three of the six are large enough to want their
own sitting.

**One item was filed by the close-out's own verification pass: G2d.** Re-running G2a's count on
`main` after #414 merged returned 2,893 across 248 files instead of the 2,892 / 247 measured
pre-merge, and the extra file was `tests/config/inlineCommentRule.test.ts` — the rule's own test
suite, reported by the rule. Chasing the one-file discrepancy is what found it. **A count that moves
by one is worth explaining, not rounding.**

**Feature-board AU2 is the next run's first item overall**, ahead of this board — H7 closes against
it. After that, this board's order:

1. **G2d** — the cheapest fully-specified item on the board and a genuine dependency: it blocks
   G2b-tests, and four instances of the bug are already on `main` from #414. ~10 src / ~4 test.
2. **F4** — newly decided, and it must be SIZED before it is scheduled. Sizing prices three things
   the decision does not settle: what a tag page passes for a header cover it does not have, what
   `LocationCollections` renders when the subject is a tag, and what the 32-line server page was
   getting for free by being a server page. **The third is the risk**, not the component merge.
3. **H1** — also newly decided and re-shaped. Its remaining unknown is design, not data: where the
   `following` filter lives in a toolbar row that already carries the section chips. The filter
   itself costs no new read.
4. **G2b-app** — 842 comments, the smaller half, and the tree G2a was designed against. **Take the
   light/heavy cut in `tests/` before scheduling G2b-tests**; it has still never been taken, and
   G2d must land before it is.

**Available, not in this run:**

- **F1** — its own session, and it goes BEFORE feature-board MA1 (see the F1 section). **Do not
  schedule it beside F4** — both restructure the same rendering path.
- **G2b-tests** (2,050 comments) and **G2c**, which now has a schedulable part.
- **F3's other two bullets** — `contactApi.ts` → `lib/api/messages.ts` (61 lines), and the lowercase
  `auth/` + `messages/` directories (`ui/` STAYS lowercase, it is a namespace).
- **E7's reorder path** (unsized; size it first) and **B8's optional bullet** (+400–600 test).
- **G4** — 1,497 blocks / 54 hits; read block-by-block, do not regex.

**Two process rules were tested this run and both held.**

**One docs MR for the board, code MRs touching none of it — it worked.** Three branches all cut from
`main`, no stack, and zero conflicts, against the previous run's four. Keep doing this.

**Small items share an MR.** F3's log label was opened as its own one-line PR (#413) and the user
closed the practice down mid-run: a one-line change does not earn a review cycle. #413 was closed
unmerged and the commit was folded into #414 with D13 and G2a. **The rule is now: bundle small items
into one MR with independent commits, and let the MR body carry a section per item.** It does not
loosen the board rule above — the docs MR still stands alone.

### State of the open items (re-stamped 2026-09-08 (2))

Every open item is COLD, and **for the first time since this table was created, none is BLOCKED.**
An item blocked on an unwritten question reads as available and then eats a session. (The
2026-08-26 stamp missed six items, and all four swept later turned out wrong — **UNSTAMPED is a
useful state: use it rather than guessing, then actually sweep it.** The shipped-but-unticked
history behind that is in [lessons.md](2026-summer-refactor/lessons.md).)

| Item    | State | Note                                                                                                                                                                                                                                                                                                                               |
| ------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **E7**  | COLD  | The waste shipped as a handoff guard (#337); the hook is REJECTED with measurement. One wasted path open (`EditModeLayer.tsx:281` reorder branch), still unsized                                                                                                                                                                   |
| **B8**  | COLD  | 5 of 6 shipped; the one open bullet (`sharedObserver`/`useParallax`/`useContentReordering`) is explicitly optional                                                                                                                                                                                                                 |
| **F3**  | COLD  | Seven bullets shipped (the log label closed 2026-09-08, #414); the invite bullet is COSTED and REJECTED (do not re-open the 3-function version). **Two bullets open**                                                                                                                                                              |
| **G4**  | COLD  | **1,500** blocks / 54 backward-looking, re-run on `main` at `5537c4aa` 2026-09-08 (2), per-term split reproducing exactly; the ~23 false positives are a classification and were NOT re-checked; **17** label docblocks + 4 label inlines (re-verified; a naive regex says 18 — see the section), read block-by-block, not regexed |
| **F1**  | COLD  | Largest open item; no unanswered question, just size. Goes before feature-board MA1, and **not in the same run as F4**                                                                                                                                                                                                             |
| **G2**  | COLD  | **G2a SHIPPED #414** as `warn`. G2b is **2,893 across 248 files** — `app/` 842, `tests/` 2,051 — re-run on `main` at `5537c4aa`, and **4 are G2d's false positives**, so the real target is 2,889. Splits `app/` then `tests/`; the light/heavy cut has never been taken in `tests/`. **G2d goes first**                           |
| **G2d** | COLD  | Cheap and fully specified. **It blocks G2b-tests**, so its position is a dependency, not a preference                                                                                                                                                                                                                              |
| **F4**  | COLD  | **DECIDED 2026-09-08: merge them.** UNSIZED — size it before scheduling; the risk is what the 32-line server page was getting for free, not the component merge                                                                                                                                                                    |
| **H1**  | COLD  | **DECIDED 2026-09-08: one list of all associations plus a `following` filter**, no tile marker, count is the union. The remaining unknown is design — where the filter lives in the toolbar                                                                                                                                        |
| **H7**  | COLD  | **DECIDED 2026-09-08: yes.** Builds as feature-board AU2's admin half; this row closes against AU2 rather than taking its own MR                                                                                                                                                                                                   |

**The blocked list is empty — user and backend both** (re-counted 2026-09-08 (2), after D13 and G8
left the table). Four rows were blocked on the user that morning; all four were answered in the
opening message, and one of them (G8) shipped the same day.

**Asking the questions FIRST is the practice that produced this run, and it should be the standing
opening move.** The 2026-09-06 (2) run's block said it in as many words — "asked at the end they
roll to the next one for nothing" — and this run is the evidence. G8's answer arrived early enough
to become #415; had it arrived at the close-out it would have been a row edit and nothing else. The
other three answers did not become MRs, and that is the correct outcome: F4 and H1 need sizing and
design passes respectively, and H7 belongs to the feature board. **An answered question is not
automatically a schedulable item — but an unanswered one is guaranteed not to be.**

**D15 closed itself, and that is the row worth learning from.** It left the blocked list on
2026-09-06 when backend #309 shipped the visibility predicate, and was picked as the next run's
first item on the strength of being the cheapest fully-specified thing on the board. It was neither
cheap nor an MR: the frontend owed a runtime `revalidateTag`, not a diff, and by the time anyone
reached it the 3600s cache window it was racing had been shut for three days. **Two rules came out
of it and are in "How to use this doc": an item whose deliverable is an action rather than a diff
must say so in its row, and a time-boxed item needs its expiry date in the row.**

The 2026-08-30 session cleared three blocked rows by asking two questions and reading one other
repo; 2026-08-31 (3) cleared C9 the same way; 2026-09-05 cleared C15 the same way again; 2026-09-06
cleared D15 by reading the backend's own board. **Read the other repo's board before adding a row to
the blocked list, and re-read it before quoting one** — it has now paid six times.

**Shipped write-ups are not on this page.** Closed items live in
[`2026-summer-refactor/`](2026-summer-refactor/), one file per group (each with a "Closed rows"
ledger), plus the session log and lessons.md. An open item's row plus its live section is its whole
live record.

**Two structural estimate biases, confirmed 2026-08-23 across ten items.** Stop recalibrating
item by item; both causes are known and neither is going away.

1. **Group E "consolidations" come out flat or positive on source, never negative.** Scorecard:
   B6 0 vs −150, B5 −145 vs −350/−450, E5 0 vs −50, E9 +16 vs −100, E12 +72 vs +30, E10 −79
   code-only vs −60, **E4 +44 vs −80**, **G4 −50 vs −300/−500**. The cause is the same every time:
   **extracted units need docblocks the inline
   copies never had**, and this repo's no-inline-comment rule means that context has nowhere else to
   go. E9 is the clearest case — excluding docblocks its call sites drop 265 → 215 code lines and the
   two extracted files add exactly 50 back. Break-even by construction. When sizing a consolidation,
   quote the code-only delta and the raw delta separately, or the number will look like a failure.
   1b. **An extraction also buys a required test suite, and no Group E estimate has counted one.**
   Bias 1 names the docblock cost. E4 showed a second, additive one: `CLAUDE.md` requires tests for
   every new utility function, so extracting a shared module is never just moving code — it commits
   you to a new suite. Test actuals where a module was extracted: E1 +659, E9 +393, E12 +293, E4
   +177, E5 +139. None were predicted. **A consolidation's honest estimate is three numbers: code
   delta, docblock delta, new-test delta**, and only the first is ever negative.

2. **Group B estimates over-count preamble.** The estimates counted repeated _text_ and assumed
   repetition meant redundancy — one failure mode. B5 found the opposite one: the board counted
   whole preambles at 122–169 lines each (886 total) when only 460 of those lines were duplicated
   builders — the rest is per-file imports, `jest.mock` blocks and `jest.MockedFunction` casts that
   legitimately stay per-file. Count the duplicated _construct_, not the block it sits in.

---

## Group A — Pure deletions — ✅ FULLY CLOSED

All nine items merged (#255–#263); A9's last bullet — the `CLAUDE.md` PATH correction — closed
2026-08-30 (#347). Full write-ups and closed rows:
[group-a-deletions.md](2026-summer-refactor/group-a-deletions.md). **Nothing in Group A is open.**

---

## Group B — Test-suite reductions — only B8's optional bullet is open (B10 shipped #408)

B1–B7, B9 and **B10 (#408, archived 2026-09-08)** closed — write-ups, estimate corrections and
closed rows: [group-b-tests.md](2026-summer-refactor/group-b-tests.md). The suite is **61,143 lines
against 38,508 source lines** (re-measured 2026-09-08 at `fcc6ebd3`; **stale a THIRD time** — it
read 61,171/38,600, which was measured before #408–#411):
`find tests -type f \( -name '*.ts' -o -name '*.tsx' \) -exec cat {} + | wc -l`, same for `app`).
This figure has now been stale three times running — 51,446/37,211, then 57,306/36,685, then
61,171/38,600, each wrong when quoted. **Do not quote it without re-running the command beside
it.** Three misses is the pattern, not bad luck: it moves on every merge, so it is only ever
correct on the day it is written. Hygiene is otherwise excellent: zero skips, zero `.only`, zero snapshots, zero stale
TODOs.

### ◐ B8 · Fill the required-coverage gaps — 5 of 6 shipped (#266, #267, #295, #296); only the optional bullet is open

The project rule requires tests for these and they had none. The five shipped slices are in the
[archive](2026-summer-refactor/group-b-tests.md).

- [ ] If being thorough: `sharedObserver` (116), `useParallax` (161), `useContentReordering` (197,
      **was `198`; corrected 2026-08-27**). **Re-verified 2026-08-28: all three are still untested** —
      no `tests/utils/sharedObserver.test.ts`, no `tests/hooks/useParallax.test.ts`, and no suite for
      `useContentReordering`. This is the ONLY open B8 bullet, and it is explicitly optional.
      Est +400–600. `collectionToggle` came OFF this list 2026-08-22: `collectionEditUtils.ts:30`
      (**was `:28`; corrected 2026-08-25**) re-exports `toggleRelation`, and its coverage lives in
      `tests/components/ContentCollection/edit/collectionEditUtils.test.ts` since B1's merge.

## Group C — Bug fixes — ✅ FULLY CLOSED

All eighteen items closed. C1–C8 (#264, #281, #282, #279, #283, #327, #331, #291), C10 and C11
2026-08-30 (#346, #352), C12–C14 2026-09-05 (#402), C15–C17 (#403), C18 (#404), and C9 the same day
at zero frontend code on a production census. Full write-ups and closed rows:
[group-c-bugs.md](2026-summer-refactor/group-c-bugs.md). C4's `collections-location-${slug}` report
became E12; C17's location-page half became feature-board SD8; C18's `act()` warnings became B10.
**Nothing in Group C is open.**

---

## Group D — Security — ✅ FULLY CLOSED

D1–D9 merged 2026-08-24 and **D10 merged 2026-08-30 (#353)** while this board still called it COLD
— full write-ups and closed rows: [group-d-security.md](2026-summer-refactor/group-d-security.md),
which now also holds **D15 (closed 2026-09-08: its purge expired on its own; the `/search` corpus
half moved to feature-board PF16)** and **D13 (shipped 2026-09-08, #414 — `POST /api/csp-report`
plus the `report-uri` directive; the `www`→apex redirect stayed at the Amplify/DNS layer with
PF7)**. D7's one residual bullet moved to E10. The 2026-09-05 adversarial pass attacked the whole merged set
(18 traversal spellings, 17 malformed origins, header injection, the live headers on both hosts,
the admin gate including `?manage=1`, secrets) and found **no HIGH**; what held is recorded under
"Verified fine". It also answered the cache-key question the feature board's PF13 left open: Next
16.3.1 hashes request headers into the fetch-cache key (`incremental-cache/index.js:284-305`,
only `traceparent`/`tracestate` excluded), so the gallery gate's locked and unlocked payloads never
share an entry. D11 pinned that in a test and shipped as #404, with D12 and D14. **Nothing in this
group is open.**

## Group E — Consolidations

Behavior-preserving refactors. E1–E5, E8 and E10–E17 shipped, **E6 closed 2026-08-30** (its last
bullet folded into F1), and **E18 shipped 2026-08-30 as #354** — both halves and the ride-along in
one commit, while this board called it COLD for six days and the 2026-09-04 handoff still called
Half B "genuinely open" (the hook's `collection` derives from `currentState`, so the premise was
false). Full write-ups and closed rows:
[group-e-consolidations.md](2026-summer-refactor/group-e-consolidations.md), which now also holds
**E9 (closed 2026-09-08, `.srOnly` partial shipped #410)**. **Only E7 is open below.**

### ◐ E7 · Edit-grid handoff — the waste is FIXED (#337); the hook is REJECTED; one path open

The parent's double pipeline was fixed by a four-line handoff guard (#337, +22 src / +87 test). The
shared-hook proposal was REJECTED with measurement — a hook serving both sites takes 9–11
parameters, four of them pure behavior switches. The close-out and full rejection analysis are in
the [archive](2026-summer-refactor/group-e-consolidations.md). **Guardrail: the parent's remaining
filter work (`filteredContent:358` → `filteredImages:363` → `filteredAvailableOptions:405`; re-derived 2026-09-06) is NOT
waste — it drives filter-chip greying while editing. Only `contentBlocks`-shaped work is dead
while the layer is mounted.** (The #337 guard's exit-path bug was C10, merged #346.)

- [ ] **A fourth wasted path inside the layer.**
      `EditModeLayer.tsx:281` renders `content={reorderActive ? edit.displayContent : contentBlocks}`,
      so in reorder mode the layer's OWN `contentBlocks` is computed and discarded in favour of
      `useCollectionEdit`'s separately-processed `displayContent`. Same shape as the bug #337
      fixed, one level down. Unsized.
      Not a checkbox, a count (moved to "Verified fine" 2026-09-05): `useCollectionEdit.tsx:574-586`
      (`processedContent`) is a third `processContentBlocks` caller in the collection-page path, and
      repo-wide there are **six** — `SearchPageClient.tsx:84` (SD1), `TaxonomyPage.tsx:13`,
      `LocationPageClient.tsx:84` plus the three collection-page callers. Say which number you mean.

## Group F — Structural

Bigger, optional, sequenced last. Do each individually and verify on :3000. F2, F5, F6 and F7
shipped — full write-ups, closed rows, F3's shipped bullets and F1's boundary-drift history:
[group-f-structural.md](2026-summer-refactor/group-f-structural.md). F1, F3 and F4 remain open.

### ☐ F1 · Decompose `useCollectionEdit.tsx` (1,829 lines as of #404)

- [ ] Split along the pattern the file already established (`useContentReordering`,
      `useCoverImageSelection`, …): `useAdminCollectionState`, `useCollectionPeople` +
      `useGalleryAccess`, `useCollectionRelations`, `useContentOps`, `useManageBar` — **five hooks,
      not six: the update-form region stays put for MA1** (below). **Boundaries are anchor →
      anchor, never line ranges; re-derive each with `grep -n` before splitting.** They were
      invalidated four times by line drift (three merges, one formatter — history in the archive),
      and all eight anchors had moved again by 2026-09-06 (#404). At `7e50ed3d`:
  - state — `const [currentState` (`:331`) → the line before `const [editTab` (`:441`).
  - update form — `const seedUpdateData` (`:458`) → `handleUpdate`'s dependency array
    `[collection, currentState, updateData, router, adoptSaveResponse]` (`:838`). **Not extracted by
    F1: MA1 rewrites this region into `commitField`.**
  - people + gallery — `const [collectionPeople` (`:489`) → `handleClearPassword`'s closing
    `}, [collection]);` (`:911`). The old boundary stopped at `handleSaveAccess`'s deps (`:893`)
    and left `handleClearPassword` outside.
  - content ops — `const handleMediaUpload` (`:919`) → the line before
    `const handleLocationsChange` (`:1282`). The old end sat mid-`handleLocationsChange`,
    which is a RELATIONS concern and starts the next region.
  - relations — `const handleLocationsChange` (`:1282`; `const currentTags` at `:1296`) → the line
    before `const enterSelect` (`:1471`).
  - manage bar — `const enterSelect` (`:1471`) → end of the hook body. `enterReorder` (`:1486`)
    sits inside this region now — it no longer straddles; the old "straddle" was an artefact of
    stale line numbers. It reads `processedContent` (content ops), which is the cross-region
    dependency to design for.

  Keep the `UseCollectionEditResult` facade so the six suites (`test`, `buffer`, `handlers`,
  `bulkRemove`, `escapeSelection`, `delete`), `locationCacheRevalidation.test.tsx` and
  `collectionEditFixtures.ts`'s ~70-member result builder do not churn. No file over ~450 lines.

- [ ] This also dissolves `EditModeLayer`'s FOUR `exhaustive-deps` suppressions (`:136`, `:206`,
      `:213`, `:220` — re-verified 2026-09-05).

**Ordering with feature-board MA1 (decided 2026-09-05): F1 lands first and does NOT extract the
update-form region (`const seedUpdateData` → `handleUpdate`'s dependency array).** MA1's Tasks 2–3
rewrite that region into `commitField`; extracting `useCollectionUpdateForm` now is work MA1
deletes. F1 extracts the other five hooks and leaves `handleUpdate`, `updateData` and the buffer in
place; MA1 must not re-inline them, and must leave `useCollectionEdit.buffer.test.tsx` green until
its own Task 11 rewrites it. With E18 closed and E7's remaining bullet in `EditModeLayer.tsx`, the
open items touching the files MA1 deletes are F1, G4 and G2c — and the last two ride whichever
lands.

**Absorbed from E6 on 2026-08-30 (user decision), and it is a behaviour change, not a refactor.**
E6's last bullet — three copies of "refetch → adopt → storage-write → revalidate → clear selection"
in `handleMetadataSaveSuccess:1050`, `handleGifSaveSuccess:1081` and `handleDeleteSuccess:1102` —
was put to the user as "bug or intentional?" and answered **"leave it for the big hook rewrite"**.
F1 has to touch all three functions anyway. Carry these facts, measured on 2026-08-28 and
re-verified 2026-08-30:

- The GIF path **omits `revalidateMetadataCache` entirely** and adopts FIRST; the metadata path
  adopts LAST through `mergeNewMetadata` and calls `updateImagesInCache`; the delete path adopts
  first and keeps the revalidate. Only `handleDeleteSuccess` carries the loud missing-slug guard
  (`:1103-1109`); all three `setError` in their catch blocks (`:1075`/`:1096`/`:1127`).
- A shared helper needs `revalidateMetadata`, `failLoudly` and `adoptFirst`/`transform` — **three
  of roughly six parameters existing purely to switch behaviour between callers.** That is why the
  standalone consolidation was rejected; inside F1 the same change is a split, not a parameterised
  merge.
- **User-visible consequence, unfixed until F1:** after saving a GIF the public page can serve stale
  metadata until `TIMING.revalidateCache` (3600s) expires. Two of the three
  `refreshCollectionAfterOperation` callers (`handleMediaUpload:919` at `:932`,
  `handleTextBlockSubmit:970` at `:982`) skip server-cache revalidation the same way; only
  `useCaptureDateSelection.ts:70` follows up. (E18 closed the location-tag half of this class.)

### ◐ F3 · File moves and renames — seven bullets shipped (#324, #336, #343, #348, #349, #409, #414); invite move REJECTED; two bullets open

Shipped close-outs, the mock-declaration lesson and the full invite cost report:
[group-f-structural.md](2026-summer-refactor/group-f-structural.md). Each open bullet below carries
its verification date; do them one or two at a time — bundling buries the interesting change in a
rename sweep nobody reviews carefully.

- [ ] `contactApi.ts` → `lib/api/` (fold into the tracked Wave B ApiError item). **STILL ACCURATE
      (re-verified 2026-08-29).** Still at `app/utils/contactApi.ts`, 61 lines, and it does hand-roll a result
      union instead of `ApiError` — `ContactResult` at `:6-8`, where every other `lib/api/` module
      throws `ApiError` from `core.ts`. The Wave B item is real and unshipped
      (`docs/006-code-health.md:30`). **Destination note the bullet does not have:**
      `app/lib/api/messages.ts` already exists but holds only the admin side (`getAdminMessages`,
      `deleteAdminMessage`, `markMessageRead` since #396); `submitContactMessage` posts to the public
      `/api/proxy/api/public/messages`, so it belongs in that file rather than a new one. 1 src / 3
      test.
- [x] ~~`fullscreen-image.module.scss` → `FullScreenModal.module.scss`.~~ **Shipped in #409** as
      `app/components/FullScreenModal/FullScreenModal.module.scss`, beside its component. The
      estimate held: 2 src / 2 test, plus two prose docblocks. `app/styles/` now holds
      `auth-card.module.scss` and `globals.css`; the original "leaves only `globals.css`"
      justification was dropped, and the move stands on the two-importer count.
      `FullScreenModal.tsx` took the relative `./FullScreenModal.module.scss` specifier every other
      component module uses; `useFullScreenImage.tsx` took the `@/` path.
      `tests/styles/metadataToggleTouchTarget.test.ts` kept its home in `tests/styles/` — it
      compiles a stylesheet, which is what that directory is for — and only its path constant moved.
      **`tests/styles/scssImportResolution.test.ts` is the guard that made this safe to do
      mechanically:** jest's `moduleNameMapper` and TS's wildcard `declare module` both stay green
      against a stylesheet that does not exist, and that test asserts every SCSS specifier under
      `app/` resolves on disk. The `.srOnly` copy in the file was left for E9.
      Whichever of the two ships second inherits the other's churn. Not a blocker; do the rename
      first if both are ever scheduled, since it is the smaller diff.
- [ ] Rename the lowercase `auth/` and `messages/` component directories. **PARTLY ACCURATE — both
      are lowercase, but the bullet omits a third and needs to say why.** `app/components/` has
      **38 entries** (`ls app/components | wc -l`, re-run 2026-09-05 — SD1 and #396 added two) and
      THREE are lowercase: `auth/`, `messages/`, `ui/`. The other 35 are PascalCase, the documented convention. **`ui/` should
      stay lowercase and the bullet must say so**, or whoever picks this up will "fix" it: `ui/` is
      a namespace holding 23 PascalCase component folders (`ui/Button/Button.tsx`,
      `ui/Modal/Modal.tsx`, …), not a component. `auth/` and `messages/` hold exactly one file each
      — `auth/MeProvider.tsx`, `messages/MessageRow.tsx` — so they are components misfiled as
      namespaces. 9 src / 9 test combined.
- [x] ~~`collectionEditUtils.ts` log labels.~~ **SHIPPED 2026-09-08 in #414.** The convention is
      the MODULE name, decided by the user rather than inferred; `replayMoves` now logs under
      `'collectionEditUtils'` like the other three. The estimate held exactly: 1 src / 0 test, no
      test asserted the old label. **The bullet's "fold it into whichever MR next touches this file"
      advice was overtaken by a better rule** — the user's standing preference is that small items
      share an MR, so it rode with D13 and G2a, which touch nothing near it. A one-line MR of its
      own was opened first (#413) and closed unmerged for exactly that reason.
- ~~Invite functions from `users.ts` → `auth.ts`.~~ **COSTED 2026-08-27 and REJECTED — no longer a
  checkbox.** The move relocates the three-perimeter mix rather than reducing it, and it splits
  invite issuance across two files (`createUser:42` and `upgradeUser:109` both return fresh
  `inviteUrl`s and plainly stay in `users.ts`) — a worse boundary than the one it replaces. The
  version that WOULD pay, recorded so no one re-litigates the 3-function version: split public
  invite REDEMPTION (`getInvitePreview:158` + `acceptInvite:240`, both unauthenticated, both driven
  by `app/invite/[token]/`) from everything else, leaving `regenerateInvite:87` beside issuance.
  Two functions, one perimeter per file. Not proposed as a task. Full cost report:
  [group-f-structural.md](2026-summer-refactor/group-f-structural.md).

### ☐ F4 · `TaxonomyPage` ← `LocationPageClient` — UNBLOCKED 2026-09-08, COLD and UNSIZED

- [x] ~~Tag pages are location pages minus filters.~~ Superseded by the 2026-08-22 re-scope below.
- [x] ~~Re-scoped 2026-08-22: the delta is bigger than "minus filters".~~ Both render the
      byte-identical `ContentBlockWithFullScreen` call under the same frame, but LocationPage also
      carries `LocationCollections`, a cover on the header, and `FollowsProvider` seeding — and
      TaxonomyPage is a 32-line SERVER page, so consolidation converts tag pages to a client page.
- [x] ~~**BLOCKED — user:** should tag pages gain filters, the collections strip, and follow
      seeding?~~ **DECIDED 2026-09-08: yes, merge them.** Tag pages take all four, and the
      conversion from a server page to a client page is accepted as the price.
- [ ] **Build it. COLD and UNSIZED — size it before scheduling, and do not schedule it in the same
      run as F1.** Both restructure the same rendering path, and F1 is the largest open item on the
      board. Sizing has to price three things the decision does not settle on its own: what a tag
      page passes for the cover the header now expects (a tag has no cover of its own), what
      `LocationCollections` renders when the subject is a tag, and whether the 32-line server page
      leaves anything behind that only worked because it was a server page. **The answer to the
      third is the risk in this item**, not the component merge.

---

## Group G — Decisions and docs

G1 shipped (#303) and **G5 closed 2026-08-30 with zero frontend code** — the backend blessed bare
arrays in its own `CLAUDE.md` (#243), which was the decision G5 was waiting on. Write-ups and closed
rows: [group-g-decisions.md](2026-summer-refactor/group-g-decisions.md), which also holds G2's
superseded per-file inventory and G4's measurement history, and now **G3 (deleted `/user/selects`,
#411, archived 2026-09-08)** and **G8 (the CSS-module class guard, extended repo-wide 2026-09-08,
#415 — it found a live regression on its first run)**. **G6 shipped 2026-08-31 as PR #351; G7
shipped 2026-09-05 as PR #404.** G2 and G4 are open below.

### ◐ G2 · Inline-comment rule — DECIDED 2026-08-22 keep and enforce; G2a SHIPPED #414; G2b and G2c open

The review recommended relaxing the rule; the user overruled it. The standard: no why-comments inline. The why belongs in the docblock of the function it explains. If a function's docblock would get too big because there is too much going on in the function, split the function — do not comment inline. CLAUDE.md now carries this wording. Do not propose relaxing the rule again.

- [x] **Commit the CLAUDE.md wording — PR #268.** Landed on its own, as instructed. The rule now
      covers plain function bodies (not just component bodies) and closes the "but this is
      why-context" exception explicitly. This is the standard G2a's ESLint rule has to enforce.

**Scope question SETTLED 2026-09-06: `.ts` util/lib files are in scope.** The user's global rule
says "This is absolute and applies to every language and every repo", names `//`, `#` and `--`, and
covers "function bodies, methods, constructors, test cases". The project wording from #268
(`ai_guidelines/ai_quick_reference.md:122`) says "inline `//` in component or function bodies".
Neither leaves `.ts` out. This was a confirm, not a design question, and it no longer needs the user.

**Inventory, re-taken 2026-09-06 (≥2-space-indent variant, directives excluded).** Down from the
2026-09-05 figures by the three merges since:

| Scope             | Lines     | Files  | Command                                                                                                  |
| ----------------- | --------- | ------ | -------------------------------------------------------------------------------------------------------- |
| `app/**` `.tsx`   | **445**   | **47** | `grep -rhE '^[[:space:]]{2,}//' app --include='*.tsx' \| grep -Ev 'eslint-\|@ts-\|prettier-' \| wc -l`   |
| `app/**` `.ts`    | **430**   | **36** | same with `--include='*.ts'`; files with `-rlE … \| wc -l`                                               |
| `app/**` JSX      | **14**    | —      | `grep -rho '{/\*' app --include='*.tsx' \| wc -l`                                                        |
| `tests/**` `.tsx` | **603**   | **80** | `grep -rhE '^[[:space:]]{2,}//' tests --include='*.tsx' \| grep -Ev 'eslint-\|@ts-\|prettier-' \| wc -l` |
| `tests/**` `.ts`  | **1,118** | **55** | same with `--include='*.ts'`; files with `-rlE … \| wc -l`                                               |
| `tests/**` JSX    | **2**     | —      | `grep -rho '{/\*' tests --include='*.tsx' \| wc -l`                                                      |

**Total in scope: 2,596 lines across 218 files** — `app/` 875 in 83 files, `tests/` 1,721 in 135
files. **Re-run at HEAD `fcc6ebd3` on 2026-09-08**, and the table above carries the new figures.

> **SUPERSEDED 2026-09-08 by G2a's lint rule, which measures the thing the rule actually enforces:
> 2,892 comments across 247 files (`app/` 842, `tests/` 2,050), plus 16 JSX.** The grep above is
> kept only because the history below refers to it. Size G2b off the rule
> (`npx eslint app tests -f json`), not off the table.

**It drifted by −3 lines and −1 file in one run, and the cause is the third principle exactly.**
The 2026-09-06 figures were 2,599 across 219. G3's deletion (#411) took two indented `//` comments
out of `listAllSelectsServer` (`app/` `.ts` 432 → 430) and one out of the describe block in
`tests/lib/api/selects.test.ts` (`tests/` `.ts` 1,119 → 1,118). That test file dropped out of the
file count entirely (56 → 55) because its one surviving `//` comment sits at column 0 and the
inventory counts only `^[[:space:]]{2,}//`. **A deletion elsewhere on the board moves this
inventory**, so re-run it rather than quoting it.

Older `//` figures on this item are superseded. The 2026-08-30 note recorded that three filter
variants bracketed neither the original AST sweep's `.tsx` nor its `.ts` number, in opposite
directions — which is why only the recorded variant above may be quoted, and why any re-take must
carry its command.

> **DECIDED 2026-09-06 by the user: `tests/` is in scope, for both the migration and the lint
> rule.** The sweep covers `app/` and `tests/` together, and G2a's rule widens from `app/**` to both
> trees. No exemption goes into `ai_quick_reference.md`; the global rule as written already names
> test cases and now nothing contradicts it.
>
> **This roughly triples the item, and the board should not pretend otherwise.** G2b was sized
> against `app/`'s 877 lines. The job is **2,599 lines across 219 files**. Split it — see the G2b
> bullet for the split and the recommendation.

Ten heavy `.ts` files join G2c's ride-along list now that `.ts` is confirmed in scope, **three counts
corrected 2026-08-30**: `metadataUtils.ts` (38 blocks — and it lives at `app/components/Metadata/`,
**not** `app/utils/` as G2c's list implies), `rowCombination.ts` (**31, not 15 — the largest single
error on that list**), `contentLayout.ts` (15), `contentFilter.ts` (**16, not 13**), the proxy
`route.ts` (**9 since #404**), `userSpaceData.ts` (10), `useMetadataState.ts` (9), `useParallax.ts`
(8), `core.ts` (5 — **was `7`; corrected 2026-08-27**), `rowStructureAlgorithm.ts` (6).

- [x] ~~**G2a · Enforcement first.**~~ **SHIPPED 2026-09-08 as #414**, bundled with D13 and F3's
      log label. `eslint-rules/no-inline-comments-in-functions.js` (a real module, not inline in
      flat config, so `RuleTester` can drive it) plus the `no-restricted-syntax` JSX selector. Both
      `warn`, scoped `app/**/*.{ts,tsx}` + `tests/**/*.{ts,tsx}`. `eslint .` reports **0 errors**,
      so CI is untouched. The rule skips `eslint`/`@ts-`/`prettier` directives, anything outside a
      function body, and JSDoc blocks documenting a declaration nested inside one; 19 test cases pin
      that boundary, because a false positive on a directive makes the rule unusable the moment it
      flips.
      **The measurement is the part that changes G2b's sizing, and it is now authoritative.** The
      rule reports **2,892 comments across 247 files — `app/` 842, `tests/` 2,050 — plus 16 JSX
      comments.** The 16 match the board's recorded 14 + 2 exactly, which is the cross-check that
      the JSX selector works. **The 2,892 does NOT match the board's 2,596, and the difference is
      not drift: the two count different things.** The grep counts indented `//` LINES anywhere in a
      file; the rule counts COMMENTS of either syntax inside a function body. It finds fewer in
      `app/` (842 vs 875 — module-scope object literals the grep counted are outside any function)
      and many more in `tests/` (2,050 vs 1,721 — block comments the grep cannot see). **Quote the
      rule's number from now on and retire the grep**, and re-run it rather than quoting it, per the
      third principle.
      `jest.config.mjs` gained `mjs` and `json` to `moduleFileExtensions` — both are jest defaults
      this config had narrowed away, and the plugin chain needs `json` to load when a test imports
      the flat config.
      **The `error` flip is now the only thing G2a is waiting on**, and it waits for BOTH G2b halves.
- [ ] **G2b · Mechanical migration — light files, now in BOTH trees, and it SPLITS.** Hoist each comment into the docblock of the function it explains. A comment explaining a mid-function statement with no declaration to attach to is the split signal: extract a named helper/hook so the docblock has a home.
      **One MR per item is this board's rule, and G2b at its new size is not one reviewable MR.**
      Split by tree, not by file type: **G2b-app** then **G2b-tests**, and do `app/` first — it is
      the smaller half, it is the tree G2a was designed against, and `tests/` churn is safer to land
      after the source it tests has stopped moving. Why by tree and not by file type: the two trees
      need different judgement. An `app/` comment hoists into a function's docblock; a `tests/`
      comment usually explains a case and hoists into the `describe`/`it` docblock, or dies with an
      inline it can no longer justify. A `.ts`/`.tsx` split cuts across that boundary and gives
      neither MR a coherent story. G2a's `error` flip waits for BOTH halves.
      **The light/heavy cut has never been re-taken with `tests/` in scope — take it before
      scheduling either half.** The "~45 files with 1–5 blocks" this bullet used to carry was an
      `app/`-only figure and is deleted rather than extrapolated. The whole G2 inventory is 2,599
      lines across 219 files (table above); G2b owns the light subset of that and G2c the heavies,
      and nobody has drawn the line in `tests/`. Use G2c's recorded block-count command per file.
- [ ] **G2c · Heavy files ride their refactors — do NOT migrate standalone.** Their comment volume
      is itself the too-big-function evidence, and the split gives every extracted function a
      docblock home. The ten `.ts` heavies above are in, `.ts` scope having been settled.
      **`tests/` heavies have no list at all** — the 2026-09-06 decision brought 1,722 lines in and
      nobody has run the block count over them. A heavy test file rides nothing, though: no refactor
      is coming for it, so `tests/` heavies are G2b-tests work, not ride-along. The
      counting method, recovered 2026-08-24 (record it beside any re-take):

  ```bash
  awk '/^[[:space:]]*\/\//{if(!p)n++;p=1;next}{p=0}END{print n+0}' <file>   # blocks
  grep -c '{/\*' <file>                                                      # JSX
  ```

  The per-file inventory taken with it is archived as approximate in
  [group-g-decisions.md](2026-summer-refactor/group-g-decisions.md) — its filter was never
  recorded; re-take the whole inventory in one pass when G2c is picked. Two of its eleven files
  (`CollectionPageClient.tsx`, 23 blocks; `CollectionPageWrapper.tsx`, 9) now ride nothing, so
  G2c is partly schedulable work, not pure ride-along.

### ☐ G2d · G2a's rule reports docblocks above `it()` — fix before G2b-tests

Filed 2026-09-08 (2) from the close-out's own re-measurement. **Not cosmetic: it blocks G2b-tests.**

G2a's rule (`eslint-rules/no-inline-comments-in-functions.js`, #414) exempts a JSDoc block that
immediately precedes a **declaration** — `documentsDeclaration()` checks the next token's node
against `FunctionDeclaration`, `VariableDeclaration`, `ClassDeclaration` and three TS declaration
types. A test-case docblock does not precede a declaration. It precedes `it('…', () => {…})`, which
is an `ExpressionStatement` wrapping a `CallExpression`, so the rule reports it.

**Why that stops G2b-tests rather than merely annoying it.** G2b's own bullet prescribes the
`tests/` migration as: "a `tests/` comment usually explains a case and hoists into the
`describe`/`it` docblock". That is 2,051 comments whose prescribed destination the rule reports.
Run as written, G2b-tests would _raise_ the warning count and G2a could never flip to `error` —
the flip is the only thing G2a is still waiting on.

**Four instances already exist, and they are #414's own**, which is the cheapest possible
demonstration: `tests/next.config.test.ts:85`, `:102`, `:113` and
`tests/config/inlineCommentRule.test.ts:125`. All four are inline comments that #414 converted to
docblocks above an `it()` — the correct remediation, reported by the rule shipped in the same PR.

```bash
npx eslint app tests -f json | node -e "…"   # 2,893 across 248 files; these 4 are the false positives
```

- [ ] Widen the exemption to a JSDoc block preceding a call-expression statement whose callee is
      `describe`/`it`/`test`, including the `.each` / `.only` / `.skip` / `.failing` member forms.
      **Scope it to those callees, not to every call.** A blanket "docblock above any statement"
      exemption would also excuse `/** why */` above a bare `return`, which the rule's own test
      suite pins as invalid at `tests/config/inlineCommentRule.test.ts` — keep that case red.
- [ ] Add the valid cases to that suite and re-run the count. Expect **2,893 → 2,889**.

**Lesson, hoisted to "How to use this doc":** a lint rule shipped alongside its own remediation must
be run against that remediation before the PR opens. #414 did both in one diff and the contradiction
survived a green CI, because the rule is `warn`.

### ◐ G4 · Docblock standard — length, structure, and no history — ~31 real history blocks + 21 label blocks

Raised by the user 2026-08-24 off PR #301's 30-line `revalidateLocationCaches` docblock. The
intersection pass shipped as #310 (net −50 lines, the 19 long-and-historical blocks cleared).
Baselines, the #310 tables and the spent findings are archived in
[group-g-decisions.md](2026-summer-refactor/group-g-decisions.md).

**The standard.** A docblock says what the thing does, what its arguments mean, and any constraint a
caller must respect. It describes the code as it is now, for someone reading it for the first time.
It is not a decision log, not a changelog, and not a place to record what the code used to be.

**Two additions to the standard (2026-08-25, from a user read of #327/#328).** First, **board item
labels are not allowed in code comments at all** — a reader at the call site has no board in front
of them, and the name of the MR that changed a line does not help them use it. Second, **a
refactor's own MR is the most likely place for this rot to enter**, because the author has the
before-state fresh in mind and mistakes it for context the reader needs. Check your own new
docblocks against the standard before opening the PR.

**Current history inventory (re-run 2026-09-05; method recorded).** Scan every `.ts`/`.tsx` under
`app/`, extract `/\*\*.*?\*/` non-greedy across newlines, test each block case-insensitively
against `\bused to\b`, `\bno longer\b`, `\bpreviously\b`, `\bthe old\b`, `PR #\d+`,
`\b20\d\d-\d\d-\d\d\b`: **1,500 blocks total, 54 backward-looking** (used-to 22, no-longer 14,
previously 7, bare date 8, the-old 4, PR-number 1). **Re-run on `main` at `5537c4aa`
2026-09-08 (2): the total went 1,497 → 1,500 and the 54 plus the per-term split reproduce exactly
for the third consecutive measurement.** The three gained blocks are #414's, all in
`app/api/csp-report/route.ts`, and none is backward-looking. **The runnable form of the method
above is in the archive** — a prose method gets re-implemented differently each time, which is how
this number was disputed across three passes. The three lost
blocks are G3's (#411) — `listAllSelectsServer`'s docblock, `SelectGroup`'s, and the deleted page's
— and none was backward-looking, which is why only the denominator moved. **The denominator moves
on any deletion; the numerator only moves when someone writes history into a docblock.** The 1,494 this board carried elsewhere was measured at
`699aa4f2`, before #402/#403/#404 added six docblocks and no backward-looking one. **The "~23 false
positives" is a classification, not a count, and was NOT re-run** — it is a 2026-09-05 reading of
the 54 hits (the employed-to sense of "Used to categorize images", `@throws … no longer exists`
runtime state, dates inside code examples). Treat ~31 genuine as unchecked. And the regex MISSES pure history with no anchor
term** (`contentRatingUtils.ts:35`'s retired-model note, `contentLayout.ts:96`'s "bit-for-bit what
it was before"), so 26 is a floor. **Every hit needs reading; this item cannot be finished by
running the regex.\*\*

**The board-label sweep has never been run and is the actual unswept work — and it grew while
"all re-verified 2026-08-29" sat on it: 21 blocks, re-verified on `main` at `5537c4aa`
2026-09-08 (2)** (labels `A1`–`H7` inside `/** */` blocks and `//` lines under `app/`). **17 + 4
still holds; #414 added no board label.** **17 docblocks** carry board labels —
`originAllowlist.ts:14` (D10 — **added by D10's own commit `68fbb59b`**, this item's "the
refactor's own MR is where the rot enters" demonstrated) and `:47` (D9), `contentFilter.ts:979`
(D7), `contentLayout.ts:589` (E14/E15), `contentTypeGuards.ts:178` (D3), `Badge.tsx:27` (D6),
`useMetadataSubmit.ts:118` (E12) and `:224` (E13), `collectionEditUtils.ts:284` (C4),
`useCollectionEdit.tsx:197` (D3), `:205` (D3/D4), `:1131` (E13), `:1533` (D4, formerly an inline),
`StructureTab.tsx:34` (D4), `clearCache.ts:37` (D1/D2), `core.ts:112` (E2),
`api/revalidate/route.ts:7` (D6/D8) — plus **4 inline `//` comments**: `CollectionPageClient.tsx:342`
and `:388` (D7), `useCoverImageSelection.ts:51` (D3), `EditModeLayer.tsx:250` (D3). The `TODO(A3)`
and D4 inlines at `useCollectionEdit.tsx:1571`/`:1586` are gone (#354's comment sweep).
Watch one false positive: `contentRatingUtils.ts:35`'s `H5★` is a five-star horizontal rating, not
item H5. **A naive `\b[A-H][0-9]{1,2}\b` sweep returns 18, not 17, and that one block is the whole
difference — it is the false positive, not a miss.** Verified the hard way 2026-09-08 (2): the crude
regex was run, the board was assumed stale, and the board was right. **Do not "correct" 17 upward
without reading the block.** The worst single offender is `collectionEditUtils.ts:284-293` — board label, PR number,
and history in one block. One caveat on "every #327/#328 file is clean of anchor terms":
`useCollectionEdit.tsx:667`'s docblock (`isUpdateDirty`) matches `previously` (a #327-touched
file); the others are clean. The one `contentLayout.ts` hit (block start `:85`, "used to hold
photos-per-row steady") is employed-to, traced by `git log -L` to `10fb626`, not #327.

**What to cut, by kind:**

- [ ] **History.** "used to", "no longer", "the old X", "previously", bare dates, PR numbers. The
      git log holds this and does not go stale. Delete outright.
- [ ] **Tracked gaps.** If a paragraph describes known missing work, it belongs on this board. Cut
      it and leave at most one sentence naming the limitation, with no rationale.
- [ ] **Rejected-alternative essays.** "This deliberately does not live inside X because…" is PR
      content. One clause is fine — "kept separate from `revalidateCollectionCache`, which has no
      location data in scope" — the paragraph is not.
- [ ] **Restating the signature in prose** when `@param` already says it.

**What to keep — this item is not an instruction to strip rationale.** Constraints a caller can get
wrong stay, in full. #301's own "slugs must come from the saved response, never from the edit
buffer, because an unsaved location is `{ id: 0, slug: '' }`" is exactly right and survives any
rewrite: it is a live trap, not a historical note. The test is **tense and audience** — does this
sentence help someone using the function _now_, or does it explain the past to someone who was
there? Cut on that test, not on line count. Line count is the smell; it is not the rule.

**Scope.** Docs-only, zero source change — safe to split across sittings and safe to do alongside
anything. **Do NOT add a lint rule for this in the same MR.** `eslint-plugin-jsdoc` can cap length
but cannot tell history from a live constraint, so a rule would either be trivially satisfied or
would fire on the docblocks worth keeping. Decide whether a rule is wanted after the manual pass
has established what the standard looks like in this codebase.

---

## Group H — Feature requests

Filed 2026-08-23 from a user design review of `/user` plus an annotated screenshot. Six requests
came in; only H1 remains board work. H2a and H3 shipped (#302) — write-ups and closed rows in
[group-h-features.md](2026-summer-refactor/group-h-features.md). The other four (H2b, H4, H5, H6)
are a design review, an ops project, a second design review and a vision item — no rows, detail in
the same file, reached from "What to build next".

**H7 was added 2026-08-31 (3)** from the backend cross-repo review and did not come from that
design review.

### ☐ H7 · Passkey management on the admin user page — WANTED (decided 2026-09-08); builds as feature-board AU2

Filed 2026-08-31 (3) from the backend cross-repo review. **A product item, not a defect.** Nothing
is broken and nothing is drifting; two endpoints were built and the UI for them was not.

Backend [#257](https://github.com/themancalledzac/edens.zac.backend/pull/257) added
`GET /api/admin/users/{id}/passkeys` and `DELETE /api/admin/users/{id}/passkeys/{credentialId}`
(`AdminUserController`, row types in `UserRequests.java`). The delete deregisters one authenticator
without disabling the account, which is the whole point of it — today the only recovery for a lost
key is heavier.

This repo has `registerPasskey` in `app/lib/api/auth.ts` and neither a list nor a deregister call.
`/admin/users/[id]` has nowhere to show or revoke an authenticator.

**The backend ask shrank on 2026-09-06: it is one field, not two.** The board recorded this item as
waiting on both `passwordLoginAvailable` and a passkey count. The count needs no backend change —
the client fetches the list and takes `.length`, so a warning saying "this is their last passkey"
is buildable today. Only the second clause, "…and they have no password to fall back on", needs the
backend, because `AdminUserSummary` is five fields carrying neither a passkey count nor a password
flag, and `passwordHash` is read in exactly one place outside auth: inside the DELETE handler.

```bash
git grep -n -e passwordLoginAvailable -e hasPassword -e passwordSet origin/main -- src/main/java/
```

- [x] ~~**BLOCKED — user: is this wanted?**~~ **DECIDED 2026-09-08: yes, build it.** Asked once, as
      feature-board AU2's decision #4, per the instruction on both boards.
- [ ] **Build it, and build it on the feature board, not here.** Add
      `listPasskeys`/`deregisterPasskey` to `app/lib/api/users.ts` and a section on
      `/admin/users/[id]`. Sized after the design, not before. **This row is AU2's admin half — it
      does not get its own MR.** AU2 is the next run's first item overall; when its admin UI ships,
      this row closes against it and nothing here needs re-deciding.
      **What the decision does and does not unblock.** The passkey list, the revoke action and the
      "this is their last passkey" warning are all buildable today — the count is `.length` on the
      list the client already fetches. The second clause of that warning, "…and they have no
      password to fall back on", still needs the backend's one field, `passwordLoginAvailable`
      (§4 of the handoff). **Ship the warning without the second clause rather than waiting**; a
      last-passkey warning that appears is worth more than a perfectly-worded one that does not.

### ☐ H1 · Merge `Following` into `Collections` on `/user` — UNBLOCKED and RE-SHAPED 2026-09-08; COLD

`Collections` should show owned, tagged and followed collections in one list. Unfollowing a
collection that has no other association removes it from the page. The unblock/re-block history is
in the [archive](2026-summer-refactor/group-h-features.md).

> **DECIDED 2026-09-08 by the user, and the answer re-shapes the item rather than just unblocking
> it.** The two tabs are not two kinds of thing — they are two ways a user came to be associated
> with a collection. **`Collections` are associations an ADMIN granted** (today the only way one is
> created); **`Following` is an association the USER granted themselves.** So: **put every
> associated collection in ONE list, and add a `following` FILTER above it** that narrows to the
> self-granted ones.
>
> **This kills the marker question the row was blocked on.** A per-tile marker was the wrong shape:
> the distinction is a property of the association, and a filter expresses it once instead of on
> every tile. Do NOT build a marker. **It also settles the count** — one list of all associations,
> so the count is the union's size (14, not 12), and no second count needs defending.
>
> **What it costs that a plain merge would not.** The filter is a fourth control in a toolbar row
> that already carries the section chips, so it needs a home that is not another chip pretending to
> be a tab — the thing this item exists to remove. Price that before the union.

**The premise checks out — there is no dedup anywhere.** Established by reading both membership
paths in the loader, not by comparing what renders on screen (a source-level finding; it does not
need redoing). All refs below re-derived 2026-08-29:

`Collections` membership is decided at
[userSpaceData.ts:75](app/components/UserSpace/userSpaceData.ts:75) (`isContentCollection` over the
`getUserPage()` content blocks, split at [:68](app/components/UserSpace/userSpaceData.ts:68)).
`Following` membership is decided at
[userSpaceData.ts:281](app/components/UserSpace/userSpaceData.ts:281), by intersecting the followed
id list against a separate catalog read. The two sets never see each other. Own a collection and
follow it, and it renders in both tabs today.

Where the data comes from:

- Followed ids: `listFollowedCollectionIdsServer()` —
  [personal.ts:132](app/lib/api/personal.ts:132), hitting `GET /api/proxy/api/read/user/follows`
  ([personal.ts:24](app/lib/api/personal.ts:24)). Type `FollowedCollectionIds = number[]` at
  [Personal.ts:14](app/types/Personal.ts:14). Called at `userSpaceData.ts:251`.
- Followed tiles: `getAllCollections(0, 500)` at `userSpaceData.ts:259-260`, filtered at `:281`,
  wrapped by `toCollectionBlocks` at [:90](app/components/UserSpace/userSpaceData.ts:90).
- Chip labels are data, not literals: `Collections` `userSpaceData.ts:305`, `Images` `:311`,
  `Saved` `:317`, `Following` `:324`. Mapped to `ToolbarSection[]` at
  [UserSpace.tsx:117](app/components/UserSpace/UserSpace.tsx:117), rendered at
  [FilterToolbar.tsx:255-257](app/components/ui/FilterToolbar/FilterToolbar.tsx:255).

Work:

- [ ] Union the two sets in `userSpaceData.ts`, deduping by collection id. `collectionBlocks`
      (`:75`) and `followedBlocks` (`:281`) are built from different sources, so the union must key
      on `id`, never on object identity.
- [ ] Delete the `following` section descriptor (`userSpaceData.ts:324`) and its key from the tab
      union.
- [x] ~~Decide the merged count and whether a followed tile carries a marker.~~ **DECIDED
      2026-09-08: one list of every association, count is the union (14), and a `following` filter
      replaces the marker.** The tile component does not change.
- [ ] Build the `following` filter. It reads `followedCollectionIds` — already fetched at
      `userSpaceData.ts:251`, and already the source of the old Following count at `:331` — so the
      filter costs no new read. Its home in the toolbar is the open design question, not its data.

**Two things this item must handle rather than inherit.**

1. **The catalog read is deferred, and merging un-defers it — but the cost is already measured, in
   the file this item edits.** `userSpaceData.ts:202-203` records it: `getAllCollections(0, 500)` is
   ~0.5s and ~57KB against the local backend. The page is `force-dynamic`, so making the read
   unconditional spends that on every load and every tab switch, not once. The deferral is
   deliberately pinned by `tests/components/UserSpace/userSpaceData.selfCatalog.test.ts` (deferral
   describe at `:71-79`, assertion at `:77`), so that test goes red and the cost gets accepted on
   purpose rather than discovered later.

   **Two things make it softer than the row read, both at `userSpaceData.ts:239-262`.** The catalog
   read already sits inside the `Promise.all` (opened at `:239`, catalog entry at `:260`) alongside
   the page read, so the wall-clock cost is the overlap, not a serial +0.5s. And the Following count
   comes from `followedCollectionIds.length` (`:331`), never from the hydrated array — which is why
   the deferral was safe in the first place, and why the merged count can be correct without the
   catalog. **The product call is now made; one alternative is still worth pricing:** have the backend
   return followed collections on the user-page read instead of intersecting client-side. Price it
   before writing the union — showing one list makes the catalog read unconditional, which is
   exactly the case where pushing the join to the backend pays.

2. **The stale-count bug was C8, and C8 shipped first (#291), as its sequencing note required.**
   H1 now uses the client-delta plumbing C8 built: deleting the `Following` chip relocates any
   staleness onto the merged `Collections` count, and H1 needs the tile itself to vanish on
   unfollow — strictly harder than fixing a number, because tiles are server-built.

**Claim to verify before shipping, not while shipping.** This item assumes a stale `?tab=following`
bookmark degrades to `collections` rather than erroring, via the `resolveTabKey` fallback at
[userSpaceData.ts:62](app/components/UserSpace/userSpaceData.ts:62) (`TAB_KEYS` at `:30`,
`DEFAULT_TAB` at `:34`). That is a claim about code that is about to change. Confirm the fallback
still fires once the key is removed from the union — the board's record is that unverified item
claims have been wrong twice.

Tests that will need updating (anchors re-derived 2026-08-29): `tests/app/user/page.test.tsx`
(`labels all four sections with their counts` at `:255`, `gives every section a ?tab= link` at
`:269`), `tests/components/UserSpace/UserSpace.sectionSwitch.test.tsx`,
`tests/components/UserSpace/userSpaceData.test.ts` (the describes at `:81`, `:160`, `:229` and
`:289` all assert on `sections.following`),
`tests/components/UserSpace/userSpaceData.selfCatalog.test.ts:77`,
`tests/components/ui/FilterToolbar.test.tsx:508`. Six files touch this chip row — distrust the
estimate accordingly.

## Product roadmap

Lives on [2026-features.md](2026-features.md), not here. This board carries cleanup, refactors and
bug fixes only. The list this section used to hold was stale on every line by 2026-09-05: `/search`
shipped (SD1, #357); the `blocks_per_page` fix is gone from the backend and the real question is
PF13; error tracking is decided (CloudWatch, PF6, #391); BCrypt waits on EM4; email go-live is EM1
and EM3; passkey UI is AU2, the same feature as H7 here; the staging collection is MA2; CloudFlare
Phase 2 is PF7; the `/user` ↔ `/admin/users/[id]` unification is H2b.

Two debt items from the old list have no row anywhere: property-based layout tests and the `001`
CSS sweeps. The feature board excludes them by name ("debt, chapter 006"); file them here as G-group
rows when someone wants them, or leave them in `docs/006`.

Non-MR design items H2b, H4, H5 and H6 live in
[group-h-features.md](2026-summer-refactor/group-h-features.md). H5 has been unblocked since E8
shipped (#319); its own `MenuDropdown` line map is stale (the file is 427 lines, Explore at `:294`).
H2b overlaps the `/user` ↔ `/admin/users/[id]` layout unification — settle those two together.

## Session log

_Newest first. **Dates are local (America/Los_Angeles), not UTC** — earlier entries mixed the two,
which is why a "08-23" entry can sit between two "08-24" ones. The ordering was verified correct
against real merge timestamps on 2026-08-24; only the labels were inconsistent. Use local dates.
Same-day runs are numbered "(1)", "(2)", … in run order; 2026-08-28's first two runs predate the
numbering, so that day's numbered entries start at "(2)"._

- 2026-09-08 (2) — **the run scoped to three items shipped five, because the four user questions
  were asked in the opening message instead of at the close.** Two code MRs: **#414** (D13 +
  G2a + F3's log label) and **#415** (G8). **All four blocked-on-user rows were answered** — F4
  merge the tag page into the location page; G8 extend the CSS guard repo-wide; H7 yes, build
  passkey management; H1 one list of every association with a `following` FILTER, no tile marker.
  **G8's answer became an MR the same day; the other three became sized-or-designed COLD rows.**
  **The blocked list is now EMPTY, user and backend both, for the first time since it existed.**
  **G8 found a live regression on its first run and that is the run's real find:** `ff3a3e9c`
  (2026-08-04) deleted `.checkboxRow`/`.checkboxLabel` from `InfoTab.module.scss` while
  `InfoTab.tsx:101-109` kept using them, so the Kind checkboxes rendered unstyled **for a month**.
  Second instance of the same bug class after `.loadError`/`RoleDetailView.tsx` — two unrelated SCSS
  deletions is the argument panels-only scoping could not make for itself. Verified by stashing the
  fix: `1 failed, 109 passed`, then 110 passed with it. **Three recorded figures were wrong at
  HEAD:** G8's 107 files → **106** and 411 keys → **451** (the key count was low because the board's
  own `styles.` regex cannot see the renamed bindings — the same reason the guard had to be rewritten
  against the import specifier); and **G2's 2,596 is not drift but a different measurement** — the
  grep counts indented `//` LINES anywhere in a file, G2a's rule counts COMMENTS of either syntax
  inside a function body, giving **2,892 across 247 files** (`app/` 842, `tests/` 2,050). The rule's
  number is now authoritative and G2b sizes off it. The 16 JSX hits matched the recorded 14 + 2
  exactly, which is what proves the selector works. **D13 came in 2.6× / 6.5× over estimate** (+104
  src / +196 test vs +40 / +30) — Group E bias 1b outside Group E: a new route is a new required
  suite, and the row priced the handler, not the cases proving each gate. **Two process rules held.**
  One docs MR for the board with code MRs touching none of it: three branches all cut from `main`,
  zero conflicts, against last run's four. And a NEW one from the user mid-run — **small items share
  an MR.** F3's log label was opened as a one-line PR (#413), closed unmerged, and folded into #414;
  bundle small items with independent commits and a section per item in the body. **#414 merged;
  #415 and #416 were BEHIND after it and were rebased and force-pushed by this session, not left for
  the user — both CLEAN, no conflict.** **The close-out's own verification pass filed G2d and
  corrected one figure in each direction:** G4's docblock total 1,497 → **1,500** (#414's three
  `csp-report` docblocks; the 54 backward-looking and the full per-term split reproduced exactly for
  the third measurement running, and the runnable form of that method is now recorded in the
  archive), and G2b 2,892/247 → **2,893/248** — chasing that single extra file is what found G2d.
  **One attempted correction was wrong and is recorded as a rule:** a naive `\b[A-H][0-9]{1,2}\b`
  re-run of G4's board-label sweep returned 18 against the recorded 17, and the board was right —
  the 18th is `H5★`, a five-star horizontal rating the section already flagged as the false positive
  to watch. Next: feature-board AU2 first overall, then G2d, F4 (size it), H1 (design the filter's
  home), G2b-app.

- 2026-09-08 — **the 2026-09-06 (2) run emptied: four MRs merged and the fifth item turned out not
  to be one.** Shipped **B10 (#408)**, **F3's SCSS rename (#409)**, **E9's `.srOnly` partial
  (#410)** and **G3's delete (#411)**. **D15 produced no MR and needed none** — its "one
  `revalidateTag('search-images')`" is a runtime purge, not a diff (the tag is already registered at
  `content.ts:139` and already purged by `revalidateMetadataCache` at `collectionEditUtils.ts:300`),
  and the 3600s window it was racing shut on 2026-09-05, three days before anyone reached it. D15
  CLOSED by arithmetic; its `/search` corpus half moved to **feature-board PF16**, filed with a
  production measurement (234 KB warm, 5.9× the home page). **Three board rows were wrong in ways
  worth keeping:** B10's prescribed mock shape removes 20 of 60 warnings, not 60 — only PENDING
  reads reach 0, and an `afterEach` `act` flush removes none; E9's "emitted CSS unchanged" is true
  of the declarations and false of the ordering, because `@extend` hoists; and
  `sassOptions.includePaths` is not merely mis-pathed but **ignored by Turbopack**, which reads
  `loadPaths` (measured three ways). Suite-wide `act()` **96 → 36**. **Counts re-run at `fcc6ebd3`,
  three drifted:** G2b 2,599/219 → **2,596/218** (G3's deletion took three indented comments and
  dropped a file below the threshold), G4 1,500 → **1,497** blocks with the 54 backward-looking and
  the per-term split reproducing exactly, and the suite-size figure stale a **third** time
  (61,171/38,600 → 61,143/38,508). Zero ref drift in open items — every neighbourhood ref belonged
  to an item that closed. **Archived B10, D15, E9 and G3** (tracker 1,404 → ~1,160 lines) after
  hoisting their lessons. **Process failure, twice, and the fix is in the run block:** the five MRs
  were stacked, so #409 conflicted after #408 squash-merged; un-stacking then let #410 and #411
  conflict _again_, because consecutive run items edit adjacent lines and git needs an unchanged
  line between hunks. Next run's code MRs must not touch this board — one docs MR closes all rows.
  Next: ask F4/G8/H7/H1, then F3's log label, D13, G2a.

## Verified fine — do not re-investigate

- **Admin and edit routes being auth-gated in dev is already handled — do not file it again.** The
  backend cross-repo review of 2026-08-31 (3) reported it as a new frontend-owed finding: backend
  [#243](https://github.com/themancalledzac/edens.zac.backend/pull/243) removed
  `app.admin.enforce-authz` rather than pinning it true, so `/api/admin/**` and `/api/edit/**` are
  gated in every profile and local dev is no longer login-free on the write surface. That is
  **G6**, shipped as **#351** on 2026-08-31 — `CLAUDE.md`'s Critical Rule was corrected in the same
  pass. Write-up in [group-g-decisions.md](2026-summer-refactor/group-g-decisions.md); the
  dev-session affordance follow-up is AU4 on [2026-features.md](2026-features.md). No frontend code
  change was ever needed; developers needed to know, and now the rule says so.
- `app/[slug]/page.tsx`'s double `getCollectionBySlug` is deduped by Next request memoization; it is not a single-fetch violation. `meServer` is wrapped in React `cache()`.
- The admin hub's count-fetch and lazy panel fetch are different queries by design.
- BFF proxy internals — body buffering, cookie re-emission, size caps, origin allowlist, sanitized IP order — all check out and are test-pinned.
- `rowCombination.ts` has no retired-model survivors; the prominence model is the only model present. `rowStructureAlgorithm` and `affineHeight` are clean.
- No `any` types, no `import React` namespace, no raw `<img>` anywhere in `app/`. No hydration risks found.
- The gap rule is honored across all 88 style files (87 SCSS + `globals.css`; re-counted 2026-09-05
  with `find app -name '*.scss' | wc -l` — SD1 added `app/search/loading.module.scss`), stylelint
  exits 0, and all `!important` uses are defensible.
- All 23 `ui/` primitives have live consumers. `useCachedPanelData`'s generation-counter design is sound. The localStorage admin cache is wiped on logout by design.
- Suite-wide: no skipped or focused tests, no snapshots, no stale TODOs. (`app/` carries one
  scoped TODO comment — `route.ts:103` `TODO(CloudFlare Phase 2)`, feature-board PF7; the
  `TODO(A3)` went with #354 — the clean claim is about `tests/`.) Re-run 2026-09-05 (2) after #402,
  #403 and #404: `tsc`, `eslint app/ --max-warnings 0`, `stylelint`, and `jest` (264 suites / 4,792
  tests) all clean; 60 of the 96 `act()` warnings are B10 and the rest are spread across seven
  suites (table in B10's section).
- The merged cleanup wave through #270 introduced no regression (2026-08-22 spot review of
  A5/A6/C1/E1/D2: overlay gate traced to every render site, adapter defaults diff-checked against
  pre-consolidation source, the C1 seed-effect state machine walked against all three failure
  modes, exactly one callable action in `clearCache.ts`).
- The D1/D2/D6 gates under adversarial attack (2026-08-22): no bypass found. Details in
  [group-d-security.md](2026-summer-refactor/group-d-security.md).
- PR #253's diff, technical review 2026-08-22: merge-ready. The error path is sound (a dead backend
  reaches the alert+Retry branch, never the empty state), a11y checks out, and the only diff-level
  notes were the E10 skip-list bullet and a stale `AdminHubClient` seed docblock (fixed on the
  branch).
- X-Forwarded-For / spoofed-IP handling in the BFF proxy (moved here from the Group D heading
  when Group D was archived). `forwardHeaders` strips all client-controllable IP headers and
  re-derives `X-Real-IP` from trusted hops, pinned by `tests/api/proxy/route.test.ts:431-499`
  (`describe('BFF proxy /api/proxy/[...path] — real-IP header sanitization')`; #404 added the
  `true-client-ip` and `forwarded` strips and a third test).
  Also clean: no `dangerouslySetInnerHTML` or `eval`, no secret leakage into `NEXT_PUBLIC_*`, no
  committed `.env`, no open redirects, CSRF origin-allowlist on writes, SSRF-safe URL building,
  size caps with post-buffer recheck, correct `Set-Cookie` forwarding, careful share/invite/
  gallery-gate flows.
- Checked 2026-08-30 while fixing C10 and found sound: `liveEditContent`
  (`CollectionPageClient.tsx:307`) already gates on `editMode` and releases correctly on manage-mode
  exit — it is the precedent C10's fix copied. `filterState` deliberately survives the exit (it is
  URL-synced), so filters set while managing carrying into the public view is intended, not a leak.
- The six agent allowlists carrying `Bash(npm…)`/`Bash(npx…)` are correct (re-verified 2026-08-30,
  A9's close-out): every script name they reference exists in `package.json`,
  `Bash(npm run lint:*)` covers `npm run lint:fix`, and `.claude/agents/README.md`'s capability
  table matches all six frontmatter blocks. **Known gap, not a defect:** neither `scss-reviewer` nor
  `code-reviewer` can run stylelint — a scoping call, recorded in the A9 archive.
- G5's premise and arithmetic (14 call sites in 6 files, `/user/selects` appearing twice → 13
  distinct endpoints) reconciled exactly on 2026-08-30 immediately before the item closed. The
  count was right; only the decision was missing.
- Numbers re-measured 2026-09-05, with the command beside each so the next pass re-runs rather
  than re-reads: `sharedObserver` 116 / `useParallax` 169 / `useContentReordering` 197 (`wc -l`),
  all three still untested; `.srOnly` in 6 SCSS modules (`grep -rl srOnly app --include='*.scss' | wc -l`);
  `contactApi.ts` 61 lines with `ContactResult` at `:6-8`; `app/styles/` holding three files;
  23 `ui/` primitives (`ls app/components/ui | wc -l`); 60 closed rows across the archives after
  this pass's three; `processContentBlocks` has **six** callers repo-wide
  (`grep -rn 'processContentBlocks(' app | grep -v 'export function' | wc -l`). H1's thirteen
  `userSpaceData.ts` anchors hold. **The 2026-08-30 line that said `useCollectionEdit.tsx`'s
  1,751 lines and F1's anchors "need no re-checking soon" was stale within a day** — a count in a
  file three open items edit never is; it is deleted rather than refreshed.
- Adversarial re-review of the merged security work, 2026-09-05 (D1–D10 plus the proxy, the
  origin allowlist, the headers, the admin gate, the error reporter, the gallery cookie, secrets):
  no HIGH. Held under attack: 18 path-traversal spellings through `isProxyableApiPath`. The `;`
  family was the one spelling that still forwarded; **#404 closed it** — `isProxyableApiPath` now
  runs on a `normalizePath` result and rejects `;` and `%3B` outright, so Spring's firewall is no
  longer the only thing answering. Header injection
  (`Headers.set` throws on CR/LF; a client `X-Internal-Secret` is overwritten); 17 malformed or
  lookalike origins through `isAllowedWriteOrigin` in production mode, all rejected; the live
  headers on both hosts (every CSP directive read; `frame-ancestors 'none'`, HSTS 2 years, no
  `unsafe-eval`); anonymous `/api/proxy/api/admin/**` → 401 before any backend hop; `?manage=1`
  behind `requireAdmin()`; `revalidate`'s session-then-Origin ordering; `NEXT_PUBLIC_*` limited to
  `APP_URL` and `ENV`; no tracked `.env`. **The cache-key contract:** Next 16.3.1 hashes request
  headers into the fetch-cache key (`incremental-cache/index.js:284-305`; reproduced — four cookie
  strings, four hashes), so a locked and an unlocked gallery payload never share an entry. D11 pins
  it. The findings are D11–D14; D15 is the backend's S-29 seen from here.
