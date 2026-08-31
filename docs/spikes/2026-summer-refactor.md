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

> **Tracked in git since PR #271 (2026-08-23).** `.gitignore` negates exactly this file and the
> `2026-summer-refactor/` directory — a new doc goes INSIDE the directory, never beside it
> (`git check-ignore -v` to confirm). The tracking history, the accepted public-repo trade-off, and
> the stale-local-main sync trap: [lessons.md](2026-summer-refactor/lessons.md).

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
  "Localhost Admin Needs No Login" Critical Rule false — a rule that tells agents _not to
  investigate_ the breakage it now causes (G6). When either repo changes an auth perimeter, a
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
  should two concurrent branches ever return, are recorded in lessons.md.
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
  not the whole surface: 10 files import a module under another name** (`cbStyles` ×5,
  `modalStyles` ×4, `variantStyles` ×1) and a guard sized off this pair would skip them silently.
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
  `.gitignore` negates exactly two paths; a doc beside the directory vanishes silently.
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

## MR board

Open rows only. The 55 closed rows live as one-line ledgers under a "Closed rows" heading in each
group's archive file in [`2026-summer-refactor/`](2026-summer-refactor/); the estimate-bias
scorecard below keeps the est/actual pairs that still matter.

| MR  | Scope                                                             | Status                                                                                                                                                            |
| --- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B8  | Fill the required-coverage gaps                                   | ◐ 5 of 6 — #266, #267, #295 (share+messages), #296 (collectionStorage); only the optional bullet is open                                                          |
| C9  | Dimensionless cover renders no header, missing cover does         | ☐ BLOCKED — **on backend Bug #21, not on the user**. Answered 2026-08-30: never fall back. FE ships nothing until the backend stops writing `0`                   |
| C11 | `mapError` has no 429 branch for the share-email limiter          | ☐ COLD — small; backend #233 added the 429 after C7 closed                                                                                                        |
| D10 | `getApiBaseUrl` concatenates `NEXT_PUBLIC_APP_URL` raw            | ☐ COLD — reuse `configuredAppOrigin()`; same class as D8                                                                                                          |
| E7  | Edit-grid handoff (was `useFilteredContentBlocks` hook)           | ◐ waste FIXED ✅ #337; hook REJECTED (9–11 params); two smaller wasted paths open; its guard's exit bug is C10                                                    |
| E9  | Download icon/hook, auth-card SCSS, `.srOnly`                     | ◐ PR #300 — both COLD bullets shipped; srOnly ⛔ user call                                                                                                        |
| E18 | Location-tag revalidation gaps (4 unwired paths + stale previous) | ☐ COLD — fixes and tests specified in the section                                                                                                                 |
| F1  | Decompose `useCollectionEdit.tsx`                                 | ☐ COLD — largest open item, wants its own session; all six boundaries now anchored                                                                                |
| F3  | File moves and renames                                            | ◐ `ReorderMove` #324 · `getUserPage` #336 · logger labels #343 · `CollectionPageWrapper` #348 · `AdminPanel/` fold #349 · invite REJECTED · **four bullets open** |
| F4  | `TaxonomyPage` ← `LocationPageClient`                             | ⛔ USER DECISION                                                                                                                                                  |
| G2  | Inline-comment enforcement + migration (decided: keep the rule)   | ◐ wording PR #268; G2a COLD, G2b ⛔ scope confirm, G2c ⛔ rides refactors                                                                                         |
| G3  | `/user/selects` decision                                          | ⛔ USER DECISION — delete or rebuild                                                                                                                              |
| G4  | Docblock standard — length, structure, and no history             | ◐ intersection pass done (#310); ~26 real history blocks + ~17 uncounted label blocks; read, don't regex                                                          |
| H1  | Merge `Following` into `Collections` on `/user`                   | ☐ BLOCKED (user) — count semantics, followed-tile marker, and the 500-row catalog fetch                                                                           |

### NEXT RUN — updated 2026-08-31

**G6 shipped as PR #351** (2026-08-31) — it was this block's "first MR" and is now closed; write-up
in [group-g-decisions.md](2026-summer-refactor/group-g-decisions.md).

**In order:**

1. **C11** — the 429 branch in `ShareCard`'s `mapError`. Cheapest fully-specified item on the
   board (+5 src / +15 test), and it banks an MR early.
2. **D10** — `getApiBaseUrl` reuses `configuredAppOrigin()`. Small, self-contained, refs verified
   2026-08-30.
3. **E18** — location-tag revalidation gaps. Four unwired paths plus the stale-`previous` defect;
   fixes and tests specified, all refs verified 2026-08-30.

**No blocked-on-user questions are outstanding for this run.** The 2026-08-30 session asked C9 and
the GIF-refresh question and got both answered; C9's answer moved it to the backend and the
GIF question folded into F1. The remaining user-blocked items (H1, F4, G3, `.srOnly`, G2b, the CSS
guard) are all product or policy calls that no item in this run depends on. Batch them whenever the
user has a sitting — but do not hold this run for them.

**Re-derive refs between MRs only if an MR lands in a file a later one reads.**
C11, D10 and E18 touch disjoint trees (`ShareCard.tsx`, `lib/api/core.ts`, and the
`useCollectionEdit`/`useMetadataSubmit` pair).

**Deliberately NOT in this run:** F1, still the largest open item with boundaries invalidated three
times; it wants a session of its own. G2's inventory needs a single clean re-measure before any
migration is scheduled — see the correction under G2.

### State of the open items (re-stamped 2026-08-30)

Every open item is COLD or BLOCKED, and every BLOCKED one names its question and who answers it. An
item blocked on an unwritten question reads as available and then eats a session. (The 2026-08-26
stamp missed six items, and all four swept later turned out wrong — **UNSTAMPED is a useful state:
use it rather than guessing, then actually sweep it.** The shipped-but-unticked history behind that
is in [lessons.md](2026-summer-refactor/lessons.md).)

| Item      | State                 | If blocked: the question, and who answers it                                                                                                                                                                                                                                                                                                                |
| --------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **E7**    | COLD                  | —— the waste shipped as a handoff guard (#337); the hook is REJECTED with measurement. Two smaller wasted paths open (`EditModeLayer.tsx:280` reorder path; third `processContentBlocks` caller at `useCollectionEdit.tsx:556`)                                                                                                                             |
| **E18**   | COLD                  | —— four unwired revalidation paths + the stale-`previous` defect; fixes and tests specified                                                                                                                                                                                                                                                                 |
| **B8**    | COLD                  | —— 5 of 6 shipped; the one open bullet (`sharedObserver`/`useParallax`/`useContentReordering`) is explicitly optional                                                                                                                                                                                                                                       |
| **F3**    | COLD                  | —— `ReorderMove`, `getUserPage` and the logger labels shipped; the invite bullet is COSTED and REJECTED (do not re-open the 3-function version). **Six bullets open.** `CollectionPageWrapper` (3 src / 6 test) and the `AdminPanel/` fold (5 src / 3 test) re-verified 2026-08-29 and are the two freshest                                                 |
| **G4**    | COLD                  | —— count reproduces (**1415** blocks / 49 hits, re-run 2026-08-30; was 1413 at `cb6b87d` — the 49 hits and their per-term split are unchanged and exact) but ~23 are false positives; ~26 real + ~17 board-label blocks must be read block-by-block, not regexed                                                                                            |
| **C11**   | COLD                  | —— one `mapError` branch + one test                                                                                                                                                                                                                                                                                                                         |
| **D10**   | COLD                  | —— reuse `configuredAppOrigin()` in `core.ts`; docblock fix rides along                                                                                                                                                                                                                                                                                     |
| **F1**    | COLD                  | —— largest open item; no unanswered question, just size                                                                                                                                                                                                                                                                                                     |
| **H1**    | BLOCKED — **user**    | Does the merged `Collections` count include follows (12 + 2 = 14), and does a followed-but-not-owned tile get a visual marker? Also: accept a 500-row catalog fetch on every `/user` load, or ask the backend to return followed collections on the user-page read?                                                                                         |
| **C9**    | BLOCKED — **backend** | —— **ANSWERED 2026-08-30 and re-routed. Never fall back.** The user's answer ("we should NEVER HAVE AN IMAGE WITHOUT height/width") made this a data-integrity question about the backend, filed there as Bug #21. The FE ships nothing until the backend stops writing `0`                                                                                 |
| **F4**    | BLOCKED — **user**    | Stated in the item                                                                                                                                                                                                                                                                                                                                          |
| **G3**    | BLOCKED — **user**    | Delete `/user/selects` or rebuild it                                                                                                                                                                                                                                                                                                                        |
| **E9**    | BLOCKED — **user**    | `.srOnly`: SCSS `%placeholder`, yes or no? Both COLD bullets shipped in #300                                                                                                                                                                                                                                                                                |
| **G2**    | BLOCKED — **user**    | G2b: does the migration (and the `error` flip) cover `.ts` util/lib files? Evidence says yes (the global rule covers every language; #268's standard covers plain function bodies) — a confirm, not a design question. G2c rides other refactors. G2a is COLD                                                                                               |
| CSS guard | BLOCKED — **user**    | Extend the panel `styles.<key>` guard repo-wide? **Re-measured 2026-08-30: 105 files, 402 distinct keys — both were off by one when written, and neither moved this session.** Commands recorded in the CSS rule in "How to use this doc". **10 files import a CSS module under a name other than `styles`, so a `styles.<key>` regex silently skips them** |

**Six of the fifteen rows are blocked on the user, down from nine of nineteen.** The 2026-08-30
session cleared three by asking two questions and reading one other repo: C9 and E6 bullet 1 were
answered directly, and G5 was closed by a backend decision that had already merged. **Two of the
three cost no user time at all** — the answer was sitting in `edens.zac.backend`'s HEAD commit and
its `.claude/CLAUDE.md`. Read the other repo before adding a row to the blocked list.

The six that remain — H1, F4, G3, E9's `.srOnly`, G2b, and the CSS guard — are genuine product or
policy calls. None of them blocks the current run. Put them to the user as one batch when there is
a sitting for it, but do not treat them as a bottleneck on shipping.

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

## Group B — Test-suite reductions — shipped except B8's optional bullet

B1–B7 and B9 closed — write-ups, estimate corrections and closed rows:
[group-b-tests.md](2026-summer-refactor/group-b-tests.md). The suite is **57,306 lines against 36,685 source lines** (re-measured 2026-08-30:
`find tests -type f \( -name '*.ts' -o -name '*.tsx' \) -exec cat {} + | wc -l`, same for `app`).
The board carried 51,446/37,211 — stale by ~5,900 test lines, and nobody re-ran it because the
number reads as measured. **Do not quote this figure without re-running the command beside it.** Hygiene is otherwise excellent: zero skips, zero `.only`, zero snapshots, zero stale
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

---

## Group C — Bug fixes — C1–C8 and C10 shipped; C9 and C11 open

C1–C8 merged (#264, #281, #282, #279, #283, #327, #331, #291); **C10 merged 2026-08-30 (#346)**.
Full write-ups and closed rows: [group-c-bugs.md](2026-summer-refactor/group-c-bugs.md). C4's
`collections-location-${slug}` report became E12.

### ☐ C11 · `mapError` has no 429 branch for the share-email rate limiter

Filed 2026-08-29 from the cross-repo contract review. Backend #233 added `ShareEmailLimiter`
(5/sender/hour + 200/day global), which now returns **429** on the share `/email` route — it did
not exist when C7 closed, so C7's row needs no reopening. `mapError`
(`app/components/Personal/ShareCard.tsx:33-41`, verified 2026-08-29) maps 401/409/403 only, so a
rate-limited sender sees the generic failure copy.

- [ ] Add a 429 branch with rate-limit copy, plus one test beside the 403/409 coverage
      `ShareCard.test.tsx` already carries from #331. Est +5 src, +15 test.

### ☐ C9 · A dimensionless cover renders no header — ANSWERED 2026-08-30, now BLOCKED on backend Bug #21

Found by B4 (#289) while merging the duplicated `createHeaderRow` describes. Both test copies
encoded it correctly, so it is behaviour as written rather than a regression.

The two paths, both re-verified 2026-08-30 (`contentLayout.ts:644-646` and `:650-652`, byte-identical
since E15 changed the signature):

- `coverImage` absent (`undefined` **or** `null`) → `createTextOnlyHeaderRow`, a one-item TEXT row
  when metadata exists. A collection with a description and no cover renders a header.
- `coverImage` present but missing `imageWidth`/`imageHeight` → `null` unconditionally, metadata
  ignored. The same collection with a broken cover renders nothing.

**The user answered on 2026-08-30, and the answer re-routed the item rather than settling it: never
fall back.** Verbatim: _"why would a cover image ever have no image width or height? This seems more
like an edge case BUG or underlying issue from the backend... we should NEVER HAVE AN IMAGE WITHOUT
height/width... we should NEVER be caught in this situation."_ So the frontend adds no fallback, and
the existing pins stay as they are — `tests/utils/contentLayout.test.ts:1329`/`:1341` and
`:1355-1367` already fail if either branch flips.

**What the answer turned this into, chased down the same session.** The premise "this should never
happen" is not true today, and the frontend is not where it is fixable:

- `ImageProcessingService.applyMetadataToEntity:465-468` writes
  `parseIntegerOrDefault(metadata.get("imageWidth"), 0)` — **the default is `0`, not null**. So a
  photo whose dimensions cannot be determined is persisted as `0 x 0`, not as a null.
- The backend already tries hard first: `ensureDimensions`/`ensureDimensionsFromPath` read width
  and height off the image header when EXIF lacks them (`putDimensionsFromHeader:399-420`). **That
  fallback fails soft in three places** — null input stream, no `ImageReader` for the format, or a
  swallowed `IOException` — and each one lands on `0`. The realistic trigger is the no-reader
  branch: RAW or HEIC without a plugin.
- `0` is falsy in JS, so `!coverBlock.imageWidth` catches it exactly like `undefined` and the
  header disappears.
- **The sibling path gets it wrong the other way.** `parallaxCard.ts:135-136` falls back to a
  1000px square via `raw.imageWidth ?? SQUARE_FALLBACK_SIDE` — but `??` catches only
  null/undefined, so a `0` sails through the fallback built for exactly this case. One sentinel,
  two consumers, two different wrong answers.

- [ ] **BLOCKED on the backend, not on the user.** Filed as **Bug #21** on the backend board
      (`ai_docs/reviews/2026-08-22-backend-cleanup-spike.md`, PR
      [#244](https://github.com/themancalledzac/edens.zac.backend/pull/244)). When the backend
      defaults to `null` instead of `0`, `parallaxCard`'s `??` fallback starts working on its own
      and this item closes with **zero frontend code**. Do not pre-empt it with a frontend guard —
      that is the fallback the user explicitly rejected.

**Lesson, hoisted to "How to use this doc":** a "should we handle this bad state?" item is often a
"why does this bad state exist?" item wearing a costume. Ask where the value is produced before
costing a way to tolerate it.

---

## Group D — Security — one open item; the original nine are CLOSED

D1–D9 merged 2026-08-24 — full write-ups and closed rows:
[group-d-security.md](2026-summer-refactor/group-d-security.md). D7's one residual bullet moved to
E10. D10 below was filed 2026-08-29.

### ☐ D10 · `getApiBaseUrl` concatenates `NEXT_PUBLIC_APP_URL` raw

Filed 2026-08-29 from the adversarial review. D8 (#276) normalized this env var for one of its two
consumers — its write-up scoped itself to `originAllowlist.ts` — and left the other:
`getApiBaseUrl` (`app/lib/api/core.ts:77`, verified 2026-08-29) returns
`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/proxy/api/…` for production server-side fetches. A
trailing slash in the env var yields `https://host//api/proxy/...`; unset yields a relative URL
that Node `fetch` rejects. Same cosmetic-env-becomes-outage class D8 was filed for.

- [ ] Reuse `configuredAppOrigin()` (`app/utils/originAllowlist.ts:30`) in `core.ts` rather than
      writing a second normalizer. Est ±10 src, +20 test.
- [ ] Docblock fix riding along: `/api/revalidate`'s docblock (`app/api/revalidate/route.ts:24-27`)
      claims the Origin allowlist "already covers the dev ports" locally, but `DEV_LAN_ORIGIN` is
      `NODE_ENV === 'development'`-gated (`originAllowlist.ts:81`) while the cookie bypass uses the
      broader `isLocalEnvironment()` — a local prod build (`NEXT_PUBLIC_ENV=local` + `next start`)
      skips the cookie gate yet silently 403s every revalidate (the fetch resolves on 403, so the
      catch never fires). Fails closed, availability-only; no server code POSTs `/api/revalidate`
      (all callers are `'use client'`), so D6+D8 admit every real production caller. Fix the
      docblock; no behavior change.

---

## Group E — Consolidations

Behavior-preserving refactors. E1–E5, E8 and E10–E17 shipped, and **E6 closed 2026-08-30** — its
last bullet was answered by the user and folded into F1, so E6 is no longer scheduled as its own
item. Full write-ups and closed rows:
[group-e-consolidations.md](2026-summer-refactor/group-e-consolidations.md). E7, E9 and E18 are
open below.

### ◐ E7 · Edit-grid handoff — the waste is FIXED (#337); the hook is REJECTED; two paths open

The parent's double pipeline was fixed by a four-line handoff guard (#337, +22 src / +87 test). The
shared-hook proposal was REJECTED with measurement — a hook serving both sites takes 9–11
parameters, four of them pure behavior switches. The close-out and full rejection analysis are in
the [archive](2026-summer-refactor/group-e-consolidations.md). **Guardrail: the parent's remaining
filter work (`filteredContent:356` → `filteredImages:361` → `filteredAvailableOptions:391`; **all three re-derived 2026-08-30 — #346 shifted them +18**) is NOT
waste — it drives filter-chip greying while editing. Only `contentBlocks`-shaped work is dead
while the layer is mounted.** The #337 guard's own exit-path bug is filed as **C10** (Group C,
HIGH) — fix that first and do not bundle these bullets into it.

- [ ] **A fourth wasted path inside the layer.**
      `EditModeLayer.tsx:280` renders `content={reorderActive ? edit.displayContent : contentBlocks}`,
      so in reorder mode the layer's OWN `contentBlocks` is computed and discarded in favour of
      `useCollectionEdit`'s separately-processed `displayContent`. Same shape as the bug #337
      fixed, one level down. Unsized.
- [ ] **A third `processContentBlocks` caller the item never mentioned.**
      `useCollectionEdit.tsx:556-568` (`processedContent`) uses the layer's argument set
      (`false, id, displayMode, true`) on unfiltered `collection.content ?? []` with no `applySort`.
      Worth knowing before anyone counts call sites again — there are three, not two, **in the
      collection-page path. Repo-wide there are FIVE** (re-counted 2026-08-30):
      `TaxonomyPage.tsx:13` and `LocationPageClient.tsx:81` are the other two, and neither is in
      this item's scope. Say which number you mean when quoting it.

### ◐ E9 · Download icon/hook, auth-card SCSS, `.srOnly` — PR #300; srOnly ⛔

Both COLD bullets shipped in #300 — write-ups in the
[archive](2026-summer-refactor/group-e-consolidations.md).

- [ ] `.srOnly` is copy-pasted in 6 modules (was 7 — one copy fell to A8's sweep; re-counted 6 on
      2026-08-29). This is documented policy, but an SCSS `%placeholder` honors the
      no-global-utility rule and collapses ~50 lines. ⛔ Needs the G2-style USER decision, not a
      violation report.

### ☐ E18 · Location-tag revalidation gaps — four unwired mutation paths, and `previous` reads the page-load prop

Filed 2026-08-29 from the adversarial review (two findings, one item). E12 (#301), E13 (#313) and
E16 (#316/#317) wired `collections-location-${slug}` for image-metadata edits and location renames
— but no REMOVAL path fires it, and the wired paths read stale state. Location pages stay wrong up
to `TIMING.revalidateCache` = 3600s (`app/constants/index.ts:134`). All refs verified 2026-08-29.

**Half A — four mutation paths never fire `collections-location-${slug}`:**

- Image delete: `useMetadataSubmit.ts:172-202` → `handleDeleteSuccess`
  (`useCollectionEdit.tsx:1059-1086`) — revalidates collection + metadata tags only.
- Remove-from-collection, both paths: `useMetadataSubmit.ts:204-229` and `handleBulkRemove`
  (`useCollectionEdit.tsx:1088-1118`). Per E13's own backend answer, dropping an image's last
  membership flips it INTO orphan status and onto `/location/{slug}` — the page these paths most
  directly change.
- Collection delete: `handleDeleteCollection` (`useCollectionEdit.tsx:1120-1155`) — revalidates
  collection + parents + metadata, never the collection's locations' pages.

The E13 write-up flagged remove-from-collection as "deliberately NOT wired — confirm the scope call
before filing it"; this is that filing. The two delete paths were never flagged anywhere.

- [ ] Wire the four sites: `revalidateLocationCaches(preOpLocations, [])`. Recommended test:
      handleDelete POSTs the tag for each deleted image's locations — today the delete path makes
      **zero** such POSTs (existing delete tests assert only `deleteImages` + callback).

**Half B — E12/E13's `previous` reads the page-load prop, not live state.** `handleUpdate` passes
`collection.locations` (`useCollectionEdit.tsx:769-772`) and the image-path `previous` derives from
`contentToEdit` ⊂ `collection.content` (`:706-714`); the hook's `collection` is the static server
seed (`EditModeLayer.tsx:104-108`; `latestCollectionRef` tracks the same prop,
`useCollectionEdit.tsx:379-381`), refreshed only on a slug-change redirect. Save-add-location-A
then save-remove-A in one manage session: A is in neither `previous` nor `next` on the second save,
so `/location/a` lists the collection for up to an hour.

- [ ] Fix: read `currentState?.collection` first. Recommended test: two sequential saves, assert
      the second POSTs `collections-location-a` — #301's tests cover single saves only, so they
      pass against both the bug and the fix.
- [ ] **Ride-along: pin E11's single-source premise.** `tests/lib/api/cacheTagDrift.test.ts`
      scopes its scan to `REVALIDATION_SOURCE` (`:31`) and asserts the claim that it is the only
      revalidating file in a docblock the test never checks — a future `fetch('/api/revalidate')`
      in another file is invisible to it. One assertion ("no file outside `collectionEditUtils.ts`
      fetches `/api/revalidate`") pins it. The test pairs names, not flows — halves A and B are
      exactly what it cannot see, as its own docblock concedes.

**Accepted risk, recorded rather than fixed: a backend-only write reaches no frontend trigger.**
`POST /api/admin/content/images/{collectionId}/from-disk` (backend `AdminController.java:423`; zero
FE call sites) changes data cached under `collection-${slug}`/`collections-index`/`search-images`;
staleness is capped only by the 3600s window. If BE→FE revalidation is ever wanted, D1+D6 as
shipped reject a server-to-server call by design (no session cookie → 401; no Origin → fails
closed) — undoing that is a deliberate design change, not part of this item. Accepted given the
1-hour cap.

Est +40 src / +120 test across both halves.

---

## Group F — Structural

Bigger, optional, sequenced last. Do each individually and verify on :3000. F2, F5, F6 and F7
shipped — full write-ups, closed rows, F3's shipped bullets and F1's boundary-drift history:
[group-f-structural.md](2026-summer-refactor/group-f-structural.md). F1, F3 and F4 remain open.

### ☐ F1 · Decompose `useCollectionEdit.tsx` (1,751 lines as of #342)

- [ ] After the remaining E-group work, split along the pattern the file already established
      (`useContentReordering`, `useCoverImageSelection`, …): `useAdminCollectionState`,
      `useCollectionUpdateForm`, `useCollectionPeople` + `useGalleryAccess`,
      `useCollectionRelations`, `useContentOps`, `useManageBar`. **Current boundaries, re-verified
      2026-08-29, every one now anchored:** state `:312–422` (`const [currentState` →
      `const [editTab`), update form `:439–814` (`const seedUpdateData`; end anchored on
      `handleUpdate`'s dependency array), people+gallery `:472–873` (`const [collectionPeople`),
      content ops `:874–1220` (`const handleMediaUpload` at `:875`) — **the `:1220` END is WRONG,
      found 2026-08-30: `:1220` sits mid-`handleLocationsChange`, which starts `:1217` and is a
      RELATIONS concern. Pre-existing, not merge drift; it was already wrong on 2026-08-29. The
      anchored ends are sound, this un-anchored one is not — re-derive it by anchor before
      splitting** — relations `:1222–1406`
      (anchor `const currentTags` at `:1231`), manage bar `:1407–1459` (anchor `const enterSelect`
      at `:1402`). `enterReorder:1404` **straddles** the relations/manage-bar boundary — a real
      finding about the split, not a bad boundary. **These boundaries are invalidated by ANY merge
      into this file — a formatter is a hunk (three drifts so far; the history is in the archive).
      Re-derive from the anchors, never by adding an offset.** Keep the existing
      `UseCollectionEditResult` facade so the SIX test suites (`test`, `buffer`, `handlers`,
      `bulkRemove`, `escapeSelection`, `delete`) plus `collectionEditFixtures.ts`'s ~70-member
      result builder do not churn. No file over ~450 lines.
- [ ] This also dissolves `EditModeLayer`'s FOUR `exhaustive-deps` suppressions (`:135`, `:205`,
      `:212`, `:219` — re-verified 2026-08-29).

**Absorbed from E6 on 2026-08-30 (user decision), and it is a behaviour change, not a refactor.**
E6's last bullet — three copies of "refetch → adopt → storage-write → revalidate → clear selection"
in `handleMetadataSaveSuccess:1007`, `handleGifSaveSuccess:1038` and `handleDeleteSuccess:1059` —
was put to the user as "bug or intentional?" and answered **"leave it for the big hook rewrite"**.
F1 has to touch all three functions anyway. Carry these facts, measured on 2026-08-28 and
re-verified 2026-08-30:

- The GIF path **omits `revalidateMetadataCache` entirely** and adopts FIRST; the metadata path
  adopts LAST through `mergeNewMetadata` and calls `updateImagesInCache`; the delete path adopts
  first and keeps the revalidate. Only `handleDeleteSuccess` carries the loud missing-slug guard
  (`:1061-1065`); all three `setError` in their catch blocks (`:1032`/`:1053`/`:1084`).
- A shared helper needs `revalidateMetadata`, `failLoudly` and `adoptFirst`/`transform` — **three
  of roughly six parameters existing purely to switch behaviour between callers.** That is why the
  standalone consolidation was rejected; inside F1 the same change is a split, not a parameterised
  merge.
- **User-visible consequence, unfixed until F1:** after saving a GIF the public page can serve stale
  metadata until `TIMING.revalidateCache` (3600s) expires. Two of the three
  `refreshCollectionAfterOperation` callers (`handleMediaUpload:875` at `:888`,
  `handleTextBlockSubmit:927` at `:939`) skip server-cache revalidation the same way; only
  `useCaptureDateSelection.ts:70` follows up. E18 tracks the location-tag half of this class.

### ◐ F3 · File moves and renames — `ReorderMove` (#324), `getUserPage` (#336), logger labels (#343), `CollectionPageWrapper` (#348) and the `AdminPanel/` fold (#349) SHIPPED; invite move REJECTED; four bullets open

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
      `deleteAdminMessage`); `submitContactMessage` posts to the public
      `/api/proxy/api/public/messages`, so it belongs in that file rather than a new one. 1 src / 3
      test.
- [ ] `fullscreen-image.module.scss` → `FullScreenModal.module.scss`. **PARTLY ACCURATE — the move
      is fine, the original justification was wrong.** `app/styles/` holds THREE files:
      `auth-card.module.scss`, `fullscreen-image.module.scss`, `globals.css`; after the move it
      holds two, not one. `auth-card.module.scss` has a reason to stay — shared by
      `app/login/page.tsx` and `app/invite/[token]/page.tsx`, documented in
      `tests/styles/scssImportResolution.test.ts:3`. **Do the rename; drop the "only `globals.css`"
      clause.** 2 src / 0 test — importers are `FullScreenModal.tsx` and `useFullScreenImage.tsx`
      (re-verified 2026-08-29); `tests/styles/breakpointConsistency.test.ts` walks `app/`
      recursively (`:18` — **was quoted `:17`; corrected 2026-08-29**) so it needs no update, but
      its docblock (`:2`) names the file in prose and goes stale on rename — no code edit.
      **Collision found 2026-08-30: one of E9's six `.srOnly` copies lives in this very file.**
      Whichever of the two ships second inherits the other's churn. Not a blocker; do the rename
      first if both are ever scheduled, since it is the smaller diff.
- [ ] Rename the lowercase `auth/` and `messages/` component directories. **PARTLY ACCURATE — both
      are lowercase, but the bullet omits a third and needs to say why.** `app/components/` has
      **36 entries** (`ls app/components | wc -l`, re-run 2026-08-30 — was 37 until #349 deleted
      `AdminPanel/`; the 2026-08-29 count of 37 was correct when taken) and THREE are lowercase: `auth/`,
      `messages/`, `ui/`. The other 34 are PascalCase, the documented convention. **`ui/` should
      stay lowercase and the bullet must say so**, or whoever picks this up will "fix" it: `ui/` is
      a namespace holding 23 PascalCase component folders (`ui/Button/Button.tsx`,
      `ui/Modal/Modal.tsx`, …), not a component. `auth/` and `messages/` hold exactly one file each
      — `auth/MeProvider.tsx`, `messages/MessageRow.tsx` — so they are components misfiled as
      namespaces. 9 src / 9 test combined.
- [ ] `collectionEditUtils.ts` log labels are consistent-stale no more, but still inconsistent
      (found 2026-08-28 while shipping #343): `:437` logs under `'replayMoves'` (the call is `:437`, the label string sits on `:438`) — the FUNCTION
      name, where the other three (`:225`/`:279`/`:305`) now use the MODULE name. Not stale
      (`replayMoves` exists at `:432`; re-verified 2026-08-29), so #343 left it. **The open
      question is which convention this repo wants**: `useCollectionEdit.tsx` logs under
      `'useCollectionEdit'` (module), so module-name is dominant, but nothing writes it down. 1 src
      / 0 test if the answer is "module". Low value alone — fold it into whichever MR next touches
      this file.
- ~~Invite functions from `users.ts` → `auth.ts`.~~ **COSTED 2026-08-27 and REJECTED — no longer a
  checkbox.** The move relocates the three-perimeter mix rather than reducing it, and it splits
  invite issuance across two files (`createUser:42` and `upgradeUser:109` both return fresh
  `inviteUrl`s and plainly stay in `users.ts`) — a worse boundary than the one it replaces. The
  version that WOULD pay, recorded so no one re-litigates the 3-function version: split public
  invite REDEMPTION (`getInvitePreview:158` + `acceptInvite:240`, both unauthenticated, both driven
  by `app/invite/[token]/`) from everything else, leaving `regenerateInvite:87` beside issuance.
  Two functions, one perimeter per file. Not proposed as a task. Full cost report:
  [group-f-structural.md](2026-summer-refactor/group-f-structural.md).

### ⛔ F4 · `TaxonomyPage` ← `LocationPageClient` — USER DECISION

- [ ] Tag pages are location pages minus filters. Consolidating deletes `TaxonomyPage` and gives tag pages filters for free. Candidate, not a defect.
- [ ] Re-scoped 2026-08-22: the delta is bigger than "minus filters". Both render the byte-identical
      `ContentBlockWithFullScreen` call under the same frame, but LocationPage also carries
      `LocationCollections`, a cover on the header, and `FollowsProvider` seeding — and TaxonomyPage
      is a 32-line SERVER page, so consolidation converts tag pages to a client page. Product call
      for the user: should tag pages gain filters, the collections strip, and follow seeding? Not
      startable until answered.

---

## Group G — Decisions and docs

G1 shipped (#303) and **G5 closed 2026-08-30 with zero frontend code** — the backend blessed bare
arrays in its own `CLAUDE.md` (#243), which was the decision G5 was waiting on. Write-ups and closed
rows: [group-g-decisions.md](2026-summer-refactor/group-g-decisions.md), which also holds G2's
superseded per-file inventory and G4's measurement history. **G6 shipped 2026-08-31 as PR #351.**
G2, G3 and G4 are open below.

### ◐ G2 · Inline-comment rule — DECIDED 2026-08-22: keep and enforce; G2a COLD, G2b/G2c ⛔

The review recommended relaxing the rule; the user overruled it. The standard: no why-comments inline. The why belongs in the docblock of the function it explains. If a function's docblock would get too big because there is too much going on in the function, split the function — do not comment inline. CLAUDE.md now carries this wording. Do not propose relaxing the rule again.

- [x] **Commit the CLAUDE.md wording — PR #268.** Landed on its own, as instructed. The rule now
      covers plain function bodies (not just component bodies) and closes the "but this is
      why-context" exception explicitly. This is the standard G2a's ESLint rule has to enforce.

Inventory at decision time: 15 JSX `{/* */}` comments + 504 `//` lines in 226 blocks across 56 files (AST sweep of comments inside function/component bodies; module-scope headers and `eslint-`/`@ts-` directives excluded). Line refs drift as MRs land — regenerate the sweep before each migration MR.

**⛔ Scope call found 2026-08-22: that inventory was a `.tsx`-only sweep.** Recorded then: `.tsx` =
506 lines / 228 blocks / 55 files, `.ts` adding 416 / 174 / 35, `app/**` total 922 / 402 / 90.

> **⚠ Every `//` figure in this item is UNCHECKED as of 2026-08-30 and must not be quoted.** An
> attempt to re-derive them found the recorded `awk` block-counter is a _different metric_ from the
> AST sweep that produced the recorded numbers, and three filter variants bracket neither: raw awk
> gives `.ts` 603/239; excluding `eslint-`/`@ts-`/`prettier-` directives gives `.ts` 603, `.tsx`
> 532; additionally requiring ≥2-space indent as a proxy for "inside a body" gives `.tsx` 494,
> `.ts` 450. **The `.ts` gap runs in opposite directions depending on the filter**, which proves the
> original filter was neither. Only the JSX half reproduces exactly: `grep -rho '{/\*' app --include='*.tsx' | wc -l` → **15**.
> **Re-take the entire inventory in one pass and write the command down beside the number before
> scheduling any migration.** Sizing G2b off the current figures would be sizing off nothing. The decided standard (#268:
> "plain function bodies") covers `.ts` too; the inventory said otherwise. USER decides: does G2b's
> migration (and the `error` flip) cover `.ts` util/lib files, roughly doubling it? **The evidence
> says yes** — the user's global rule covers every language and #268's wording covers plain function
> bodies — so this is a confirm, not an open design question. If yes, ten more heavy files join
> G2c's ride-along list, **three counts corrected 2026-08-30**: `metadataUtils.ts` (38 blocks — and
> it lives at `app/components/Metadata/`, **not** `app/utils/` as this list implies),
> `rowCombination.ts` (**31, not 15 — the largest single error on this list**),
> `contentLayout.ts` (15), `contentFilter.ts` (**16, not 13**), the proxy `route.ts` (10), `userSpaceData.ts`
> (10), `useMetadataState.ts` (9), `useParallax.ts` (8), `core.ts` (5 — **was `7`; corrected
> 2026-08-27**), `rowStructureAlgorithm.ts` (6).

- [ ] **G2a · Enforcement first.** ESLint: (1) `no-restricted-syntax` with selector `JSXExpressionContainer > JSXEmptyExpression` bans `{/* */}` in JSX; (2) a small local flat-config rule reports `//` and `/* */` comments whose range falls inside a function body under `app/**` (allow `eslint-`, `@ts-`, `prettier-` directives; docblocks above declarations untouched). Land as `warn` immediately; flip to `error` when G2b merges.
      **Feasibility verified empirically 2026-08-22** on the repo's ESLint 9.36 + typescript-eslint
      8.29: the selector flags `{/* */}` (and bare `{}` — acceptable bonus) and not real
      expressions; a commented-out `no-restricted-syntax` stub already sits at
      `eslint.config.mjs:78-85` (re-verified 2026-08-29); the local rule is ~50–60 lines inline in
      flat config, no new deps. COLD — startable today.
- [ ] **G2b · Mechanical migration — light files (~45 files with 1–5 blocks).** Hoist each comment into the docblock of the function it explains. A comment explaining a mid-function statement with no declaration to attach to is the split signal: extract a named helper/hook so the docblock has a home.
- [ ] **G2c · Heavy files ride their refactors — do NOT migrate standalone.** Their comment volume
      is itself the too-big-function evidence, and the split gives every extracted function a
      docblock home. Plus the ten `.ts` heavies above if the user rules `.ts` in scope. The
      counting method, recovered 2026-08-24 (record it beside any re-take):

  ```bash
  awk '/^[[:space:]]*\/\//{if(!p)n++;p=1;next}{p=0}END{print n+0}' <file>   # blocks
  grep -c '{/\*' <file>                                                      # JSX
  ```

  The per-file inventory taken with it is archived as approximate in
  [group-g-decisions.md](2026-summer-refactor/group-g-decisions.md) — its filter was never
  recorded; re-take the whole inventory in one pass when G2c is picked. Two of its eleven files
  (`CollectionPageClient.tsx`, 24 blocks; `CollectionPageWrapper.tsx`, 9) now ride nothing, so
  G2c is partly schedulable work, not pure ride-along.

### ⛔ G3 · `/user/selects` — delete or rebuild — USER DECISION

- [ ] `app/user/selects/page.tsx` (65 lines; re-verified 2026-08-29) is an orphan page: it renders raw IDs and links to `/?collection=`, which nothing reads (re-verified 2026-08-22: no reader of a `collection` search param exists anywhere). Either delete it — Selects live in the gallery star flow — or rebuild it properly.
- [ ] **Both facts re-verified 2026-08-24 against `main` at `dbc706a`; nothing has changed.** Still
      65 lines. `grep -rn "collection'" app --include='*.ts' --include='*.tsx' | grep -E "searchParams|\.get\("`
      → no results, so still no reader. No page in `app/` links to `/user/selects` (the only hits
      are `lib/api/selects.ts`, which names the BACKEND endpoint path — a different thing that a
      grep for the string will keep suggesting is a caller). E17 touched this file (#322 dropped its
      `pageType="default"`), which is the only reason it came up; that edit does not bear on the
      decision. **The question is unchanged and is genuinely a product call, not a fact: delete or
      rebuild? Answerer: the user.**
- [ ] Status wording reconciled 2026-08-22: A1 is COMPLETE as shipped — the `/user/selects` deletion
      was pulled OUT of A1 (see A1's closing note in the archive). Deciding G3 performs that final
      deletion (or its rebuild); it does not reopen A1.

### ◐ G4 · Docblock standard — length, structure, and no history — ~26 real history blocks + ~17 label blocks

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

**Current history inventory (re-run 2026-08-29; command recorded).** Scan every `.ts`/`.tsx` under
`app/`, extract `/\*\*.*?\*/` non-greedy across newlines, test each block case-insensitively
against `\bused to\b`, `\bno longer\b`, `\bpreviously\b`, `\bthe old\b`, `PR #\d+`,
`\b20\d\d-\d\d-\d\d\b`: **1,413 blocks total, 49 backward-looking** (used-to 21, no-longer 12,
previously 7, bare date 6, the-old 4, PR-number 1). **~23 of the 49 are false positives** — the
employed-to reading ("Used to categorize images"), `@throws … no longer exists` runtime state,
dates inside code examples — so **~26 are genuine. And the regex MISSES pure history with no anchor
term** (`contentRatingUtils.ts:35`'s retired-model note, `contentLayout.ts:96`'s "bit-for-bit what
it was before"), so 26 is a floor. **Every hit needs reading; this item cannot be finished by
running the regex.**

**The board-label sweep has never been run and is the actual unswept work: ~17 net-new blocks.**
**13 docblocks** carry board labels — `contentFilter.ts:872` (D7), `contentLayout.ts:589`
(E14/E15), `contentTypeGuards.ts:173` (D3), `originAllowlist.ts:42` (D9), `Badge.tsx:27` (D6),
`useMetadataSubmit.ts:112` (E12 — **was quoted `:111`; block starts `:112`, re-derived
2026-08-29**), `collectionEditUtils.ts:284` (C4), `useCollectionEdit.tsx:185` (D3),
`useCollectionEdit.tsx:193` (D3/D4), `StructureTab.tsx:34` (D4), `clearCache.ts:37` (D1/D2),
`core.ts:101` (E2), `api/revalidate/route.ts:7` (D6) — plus **6 inline `//` comments**:
`useCollectionEdit.tsx:1571` (`TODO(A3)`), `useCollectionEdit.tsx:1586` (D4),
`CollectionPageClient.tsx:340` and `:356` (D7), `useCoverImageSelection.ts:51` (D3),
`EditModeLayer.tsx:249` (D3) — all six re-verified 2026-08-29. Only 2 of the 19 overlap the 49.
Watch one false positive: `contentRatingUtils.ts:35`'s `H5★` is a five-star horizontal rating, not
item H5. The worst single offender is `collectionEditUtils.ts:284-293` — board label, PR number,
and history in one block. One caveat on "every #327/#328 file is clean of anchor terms":
`useCollectionEdit.tsx:644`'s docblock matches `previously` (a #327-touched file); the others are
clean. The one `contentLayout.ts` hit (block start `:85`, "used to hold photos-per-row steady") is
employed-to, traced by `git log -L` to `10fb626`, not #327.

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

### ☐ H1 · Merge `Following` into `Collections` on `/user` — BLOCKED (user): count semantics, tile marker, catalog fetch

`Collections` should show owned, tagged and followed collections in one list. Unfollowing a
collection that has no other association removes it from the page. **Blocked on three product
answers, stated in the Work list below.** The unblock/re-block history is in the
[archive](2026-summer-refactor/group-h-features.md).

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
  [FilterToolbar.tsx:219](app/components/ui/FilterToolbar/FilterToolbar.tsx:219).

Work:

- [ ] Union the two sets in `userSpaceData.ts`, deduping by collection id. `collectionBlocks`
      (`:75`) and `followedBlocks` (`:281`) are built from different sources, so the union must key
      on `id`, never on object identity.
- [ ] Delete the `following` section descriptor (`userSpaceData.ts:324`) and its key from the tab
      union.
- [ ] Decide whether the merged count includes follows (12 + 2 = 14) and whether a
      followed-but-not-owned tile carries a visual marker. The request does not say, and the answer
      changes the tile component, not just the loader.

**Two things this item must handle rather than inherit.**

1. **The catalog read is deferred, and merging un-defers it.** `getAllCollections(0, 500)` runs only
   when the `following` tab renders (`userSpaceData.ts:259-260`). Merging makes a 500-row catalog
   fetch run on every `/user` load. That deferral is deliberately pinned by
   `tests/components/UserSpace/userSpaceData.selfCatalog.test.ts` (deferral describe at `:71-79`,
   the assertion at `:77`), so that test goes red and the cost has to be accepted on purpose rather
   than discovered later. The cheaper path is to have the backend return followed collections on
   the user-page read instead of intersecting client-side — price that before writing the union.
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
`tests/components/ui/FilterToolbar.test.tsx:507`. Six files touch this chip row — distrust the
estimate accordingly.

## What to build next (product roadmap, not cleanup)

Kept here because the cleanup sequencing has to make room for it.

**User-facing, in priority order:**

1. Backend `GET /content/images/search` plus the `/search` route (004/009) — the keystone blocker; the frontend plan is already written.
2. Backend `blocks_per_page` fix → restore ISR on the home page (002). Every visitor pays a live Spring fetch on the hottest page today.
3. The now-unblocked 002 perf tail (items 2, 4, 5, 7, 9) — the "after the refactor wave" condition has been met.
4. Client-gallery BCrypt (003) — plaintext gallery passwords, real users on the other end.
5. Email/SES go-live (009) — gates client onboarding. **Corrected 2026-08-23:** invite email is
   built and wired; the blocker is operational (`EMAIL_ENABLED` defaults false), not code. See H4 and
   the G1 bullet. Self-serve password reset does not exist at all and is the real gap.
6. Passkey enrollment-state UI (009) — FE and BE fixes are merged; needs the backend credentials list/remove endpoint.

**Admin and internal:** staging collection (008), `/user` ↔ `/admin/users/[id]` layout unification (008, unblocked by 0204), 004 stragglers (the Breadcrumb drop is A1, chip-click verification, A3 Spot-1), CloudFlare Phase 2 (007).

**Debt:** the error-tracking decision (Sentry vs CloudWatch), F1, property-based layout tests, and the 001 CSS sweeps.

**Feature requests (filed 2026-08-23 from a `/user` design review):** four items that are not MRs —
a durable layout for labelled metadata sections (H2b), one email strategy (H4), a `MenuDropdown`
design review (H5), and composable page components as vision only (H6). Detail in
[group-h-features.md](2026-summer-refactor/group-h-features.md). The one that _is_ board work — H1 —
is in `## Group H` above. Sequencing note: **H5 is UNBLOCKED as of 2026-08-24** — it
waited on E8, which shipped as #319. E8 already owns the
mechanical half of that component, and **H2b overlaps the 008 `/user` ↔ `/admin/users/[id]` layout
unification** — settle those two together or they will produce two competing designs.

## Session log

_Newest first. **Dates are local (America/Los_Angeles), not UTC** — earlier entries mixed the two,
which is why a "08-23" entry can sit between two "08-24" ones. The ordering was verified correct
against real merge timestamps on 2026-08-24; only the labels were inconsistent. Use local dates.
Same-day runs are numbered "(1)", "(2)", … in run order; 2026-08-28's first two runs predate the
numbering, so that day's numbered entries start at "(2)"._

- 2026-08-31 — shipped **G6 (#351)**, the block's own "first MR". Premise re-verified against the
  backend's `origin/main` by running the check rather than re-reading it: `SecurityConfig.java:75-77`
  gates `/api/admin/**` on `hasRole("ADMIN")` and `/api/edit/**` on `hasRole("USER")` with no
  profile condition, and the four surviving `app.admin.enforce-authz` references are prose in
  docblocks describing the removal. `tests/utils/admin.test.ts` confirmed a no-op (6/6 unchanged),
  the frontend-layer guardrail held, and the cost of changing those layers was reported (~10 src /
  20 test) with a recommendation not to. **Board integrity fixed in the same pass:** Group G carried
  a stale duplicate paragraph claiming "G2, G3, G4 and G5 are open" directly under the one saying
  G5 had closed — removed. G6's row, classification row and section are archived to
  `group-g-decisions.md`. Prose was cut roughly in half at close after the user objected to docblock
  bloat; the rule that produced the cut now lives in `~/.claude/CLAUDE.md`, global rather than
  repo-local, because the inline-comment ban it completes was already global. Next: C11, D10, E18.

- 2026-08-30 — **shipped the full picked run plus the HIGH bug ahead of it: #346 (C10), #347 (A9),
  #348 (F3 `CollectionPageWrapper`), #349 (F3 `AdminPanel/` fold). Four MRs, all merged.** Plus one
  cross-repo filing, [backend #244](https://github.com/themancalledzac/edens.zac.backend/pull/244).
  Suite baseline re-measured: **245 suites / 4,464 tests**, `tsc --noEmit` exit 0.
  **Two blocked questions asked at the START, and both answers changed the board more than any
  code would have.** C9's answer ("we should NEVER HAVE AN IMAGE WITHOUT height/width") re-routed
  the item out of this repo entirely — chasing the premise found
  `ImageProcessingService:465-468` defaulting dimensions to **`0`, not null**, which `!width`
  catches and `?? SQUARE_FALLBACK_SIDE` does not. C9 now blocks on backend Bug #21 and will close
  with zero frontend code. E6 bullet 1 was answered "leave it for the big hook rewrite", so E6
  closed and its last bullet is now an F1 sub-task.
  **A third blocked row closed for free, by reading the other repo.** G5 (wrap-vs-bless bare
  arrays) had sat BLOCKED-on-user; the backend blessed them in its own `.claude/CLAUDE.md` on
  2026-08-30 (#243). Nobody had looked. **Blocked-on-user is down 9-of-19 to 6-of-15, and two of
  the three cost the user nothing.** Rule hoisted.
  **One new HIGH filed, found the same way: G6.** Backend #243 also made `/api/admin/**`
  unconditionally gated, which falsifies `CLAUDE.md:14`'s "Localhost Admin Needs No Login" Critical
  Rule — a rule that tells agents _not to investigate_ the breakage it now causes. Verified at
  `SecurityConfig.java:75-76`, not from the commit message. Recommended next MR.
  **Est vs actual — the two MOVE items were EXACT, both halves.** F3 predicted 3 src / 6 test and
  5 src / 3 test; both landed precisely, at +11 −11 each. **Group F move counts, re-verified the
  same week, are trustworthy in a way Group E consolidation estimates are not** — the standing bias
  note is about extractions, and should not be read as distrust of a move count. A9 was the miss:
  scoped as one file, actual three, because the board recorded where the false sentence was FILED
  rather than where it APPEARED.
  **C10's item under-counted its own symptoms, and writing the test first is what caught it.** The
  section named one symptom (exit renders empty); the failing test surfaced a second in the opposite
  direction (re-entry paints no fallback grid at all). Both tests were watched failing before the
  fix. The three pre-existing handoff tests all passed against the bug because none ever flipped
  `editMode` back.
  **Verification sweep: 6 wrong numbers, 5 drifted refs, 1 pre-existing bad boundary.** Wrong:
  `app/components/` 37→**36** (this session's own #349), G4 blocks 1413→**1415**, the CSS-guard pair
  104/401→**105/402** (already wrong when written, unmoved by this session), the Group B suite
  baseline 51,446/37,211→**57,306/36,685** (stale by ~5,900 lines), G2's `rowCombination.ts` 15→**31**
  and `contentFilter.ts` 13→**16**. Drifted: E7's three guardrail refs +18, G4's two D7 refs +18,
  `contentLayout.ts:93`→`:96`, G2a's stub `:78-84`→`:78-85`. **F1's content-ops range end `:1220` is
  WRONG and was already wrong on 08-29** — it sits mid-`handleLocationsChange`, a relations concern;
  the un-anchored boundary failed exactly as F1's own anchoring rule predicted.
  **G2's whole `//` inventory is now UNCHECKED and must not be quoted.** Three filter variants
  bracket neither recorded figure and the `.ts` gap runs in opposite directions depending on the
  filter, which proves the original method was neither. Re-take in one pass with the command
  written down before scheduling G2b.
  **Process:** MemPalace was unreachable all session (ConnectionRefused, localhost:8787), so the
  protocol's searches did not run and the two verification sweeps were plain filesystem passes.
  Next: G6, then C11, D10, E18.

- 2026-08-29 — **applied the 2026-08-28 nine-agent split review (both repos' boards) to this
  board: corrections, five new items, and the slim-down restructure. No code MR — this is the
  board pass the review produced.**
  **Corrections applied, ~45 across the five review reports.** Statuses (H1 → BLOCKED-user
  everywhere; B8's arithmetic to 5-of-6 — no enumeration ever reached "8 of 9"; F3 to six open
  bullets, its rejected invite bullet struck rather than left as an open box). Counts (blocked
  footnote re-derived; "92 style files" → 87; the pinned 245/4454 suite figure retired in favour
  of re-measure). Stale refs (H1 fully re-derived — the 08-28 sweep had fixed only its three
  premise refs; E7's close-out refs stamped pre-#337 with current equivalents; E6's micro-drifts;
  F1's first-bullet boundary set replaced with the verified current set and its two unanchored
  boundaries anchored). Stale prose (`.next-verify` is gone and `tsc --noEmit` exits 0 — sessions
  should expect a CLEAN type check; C9's "pin it" bullet was already pinned by B4's own tests in
  `tests/utils/contentLayout.test.ts`; G2's dead layoutpreview parenthetical and superseded
  inventory blockquote removed; E6's dangling self-referencing line-number paragraph deleted and
  the no-line-number rule added to "How to use this doc"). One review claim did not reproduce and
  was left alone: no malformed link exists in group-h-features.md (all `(admin)` links use the
  valid angle-bracket form and every target resolves).
  **Five new items filed, each with a row and a section in the same edit:** **C10** (HIGH — exiting
  manage mode leaves a blank public page; #337's memo guard keys on never-reset `editLayerMounted`
  while exit is a soft navigation; recommended next MR, ahead of the picked run), **C11** (429
  branch missing in ShareCard's `mapError` for backend #233's rate limiter), **E18** (four mutation
  paths never fire `collections-location-${slug}`, plus the wired paths read the page-load prop —
  with the backend-only-write accepted-risk note), **D10** (`getApiBaseUrl` concatenates
  `NEXT_PUBLIC_APP_URL` raw — Group D reopens with one row), **G5** (⛔ bare-array coordination
  with backend MR 20 — the FE counterpart row that review found missing, phased plan recorded).
  The blocked-questions table gains G5 and the repo-wide `styles.<key>` guard call: **9 of 19 open
  rows now wait on the user.**
  **Restructure, per the review's move-map: 1,981 → ~980 lines.** "How to use this doc" distilled
  to ≤3-line rules with the incident narratives moved to the new
  `2026-summer-refactor/lessons.md`; the 55 closed MR rows became one-line ledgers under "Closed
  rows" in each group archive; shipped-bullet history for A9/B8/E6/E7/E9/F3/H1 and F1's
  drift sagas moved to their group files; the archive's own defects fixed (group-b's
  header/status contradictions, three doubled-path links in the archive session log, group-h's
  stale "two senders" line, group-c's "the thing the backend is waiting on" overstatement).
  **Deliberately skipped: the per-item re-estimate slice**, per this board's own
  estimate-bias note — both structural causes are known; stop recalibrating item by item.
  Next: C10 first, then the picked three (A9's CLAUDE.md fix, F3's `CollectionPageWrapper` move,
  F3's `AdminPanel/` fold), with the blocked questions batched in the opening message.

## Verified fine — do not re-investigate

- `app/[slug]/page.tsx`'s double `getCollectionBySlug` is deduped by Next request memoization; it is not a single-fetch violation. `meServer` is wrapped in React `cache()`.
- The admin hub's count-fetch and lazy panel fetch are different queries by design.
- BFF proxy internals — body buffering, cookie re-emission, size caps, origin allowlist, sanitized IP order — all check out and are test-pinned.
- `rowCombination.ts` has no retired-model survivors; the prominence model is the only model present. `rowStructureAlgorithm` and `affineHeight` are clean.
- No `any` types, no `import React` namespace, no raw `<img>` anywhere in `app/`. No hydration risks found.
- The gap rule is honored across all 87 style files (86 SCSS + `globals.css`; re-counted 2026-08-29
  — a merge took the earlier "92" down), stylelint exits 0, and all `!important` uses are defensible.
- All 23 `ui/` primitives have live consumers. `useCachedPanelData`'s generation-counter design is sound. The localStorage admin cache is wiped on logout by design.
- Suite-wide: no skipped or focused tests, no snapshots, no stale TODOs. (`app/` carries two
  scoped TODO comments — `useCollectionEdit.tsx:1571` `TODO(A3)`, counted by G4's label sweep, and
  `route.ts:77` `TODO(CloudFlare Phase 2)` — the clean claim is about `tests/`.)
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
  re-derives `X-Real-IP` from trusted hops, pinned by `tests/api/proxy/route.test.ts:441-463`.
  Also clean: no `dangerouslySetInnerHTML` or `eval`, no secret leakage into `NEXT_PUBLIC_*`, no
  committed `.env`, no open redirects, CSRF origin-allowlist on writes, SSRF-safe URL building,
  size caps with post-buffer recheck, correct `Set-Cookie` forwarding, careful share/invite/
  gallery-gate flows.
- Checked 2026-08-30 while fixing C10 and found sound: `liveEditContent`
  (`CollectionPageClient.tsx:309`) already gates on `editMode` and releases correctly on manage-mode
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
- These recorded numbers re-measured EXACT on 2026-08-30 and need no re-checking soon:
  `useCollectionEdit.tsx` 1,751 lines and all eight F1 boundary anchors; `sharedObserver` 116 /
  `useParallax` 161 / `useContentReordering` 197, all three still untested; `.srOnly` in 6 SCSS
  modules; `contactApi.ts` 61 lines with `ContactResult` at `:6-8` and 1 src / 3 test; `app/styles/`
  holding three files; 87 style files; 23 `ui/` primitives; 55 closed rows across the archives;
  G4's 49 history hits and their per-term split (21/12/7/6/4/1). **All of E6's, E18's, D10's, C11's
  and H1's refs resolved CORRECT** — H1's thirteen `userSpaceData.ts` anchors included.
