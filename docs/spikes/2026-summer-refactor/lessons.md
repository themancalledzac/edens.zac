# Lessons — 2026 Summer Refactor

_Long-form incident narratives behind the rules in the live board's "How to use this doc". The live
board keeps each rule distilled to a few lines; this file keeps the full story of how each rule was
earned. Nothing here is open work. One section per rule, in the board's order. Moved from the live
board 2026-08-29._

## Board history: the two-tier split lapsed once

**This lapsed once already.** The archive was created 2026-08-24 and then twenty-four items closed
on the live board without moving. If a group heading says "N shipped" and the sections are still
below it, the split has lapsed again — re-apply it in that session's close-out, not later. The live
file reached 4,571 lines on 2026-08-28 — of which 1,907 were closed-item detail and 837 were old
session-log entries — before the split was re-applied.

## Board history: how the file came to be tracked, and the trap that created

**Tracked as of 2026-08-23** (branch `0271-summer-refactor-tracker`): `docs/spikes/*` stays
gitignored except this board, so the board and its decisions have history and survive the
machine. Trade-off accepted deliberately 2026-08-23: the repo is public and the file then
documented unfixed security items (D3, D5, D8) — the backend repo's tracker set the precedent.
All three shipped, and Group D closed 2026-08-24, so the tracked board no longer names a live
weakness. Additional durable copies: the review artifact (stamp below) and MemPalace
(`mempalace_user_search(query="frontend cleanup spike review")`).

**CONFIRMED 2026-08-23: PR #271 merged, the file is tracked** (`git ls-files docs/spikes/` lists
it; `.gitignore` pairs `docs/spikes/*` with `!docs/spikes/2026-summer-refactor.md` and, since the
archive split, `!docs/spikes/2026-summer-refactor/`. A new archive file is invisible to git
without that second negation — add files under that directory, never beside it).
**Trap this creates, hit on the very next run:** a session whose local `main` predates #271 sees
the board as untracked, and `git check-ignore -v` reports it plainly IGNORED — the pre-negation
`.gitignore` is what's checked out. Do not conclude the tracking never happened; `git fetch` and
compare against `origin/main` first. Syncing also needs the local untracked copy removed before
the fast-forward, because git refuses to create a tracked file over an untracked one even when
the bytes are identical. Diff them first (`git show origin/main:<path>`), then delete and merge.

## Board history: the 2026-08-22/23 full-board review

**Full-board review, 2026-08-22/23 (7 parallel agents).** Every open item re-verified and stamped
COLD or ⛔ in the board. 27 `file:line` refs checked: 22 correct, 4 drifted, 1 gone — corrected in
place. Estimates recalibrated per item (the source-only pattern held: several "negative"
E-items go net-positive once required tests are counted). The merged security gates (D1/D2/D6)
passed an adversarial review with no high/medium finding (one new trivial item, D8). A correctness
spot-review of A5/A6/C1/E1/D2 found ZERO regressions on main. PR #253 re-reviewed: technically
merge-ready, blocked only on the four-panel design decision. D3 and D4 were UNBLOCKED against
production (`curl -sI https://www.zacedens.com/`): Amplify injects no security headers, and the
distribution is `d2qp8h5pbkohe6.cloudfront.net`. C5's token-leak bullet was disproven and reframed.
Durable copy of the review: https://claude.ai/code/artifact/2bac2495-6d76-40e7-bcad-56b3ddf1d4fe
**PR #253 MERGED 2026-08-23 (79fbca5)** — that closed D7 outright and unblocked E10.

**Estimates recalibrated 2026-08-22 to count test coupling** (the original source-only numbers were
wrong 4-for-4: D2 +15→+212, E1 −120→+757 total, A4 and A6 the same way). Where a range appeared, the
top end assumed the repo's prove-it-fails discipline, which is not optional. Superseded 2026-08-23
by the two structural biases now recorded beside the scorecard: stop recalibrating item by item.

**Groups A and B together are ~5,000 lines removed at near-zero regression risk** — recorded here
when both groups closed.

**Board maintenance (recommendation, 2026-08-22).** Three drift classes recurred within 48 hours:
sections without board rows (E10, D7), items filed under the wrong group heading (D6, then D7
again), and rows whose status contradicts their section (A1 vs G3, A9 ✅ with two open bullets).
Every stale line traced to fallout from a previously shipped item — the board decays fastest
exactly where work lands. Keep the board, but stop maintaining status in two places by hand:
(1) rule — a new finding gets its board row and its section in the SAME edit, under the right
heading; (2) optional — a ~40-line script that regenerates the table from the `### <status> <id> ·`
headings, run after each edit. The bigger call was the user's and was taken: the file is tracked.

## An open-PR status cell is a claim

On 2026-08-24 all five rows saying "PR #N open" — B5/#298, E5/#299, E9/#300, G1/#303,
E10/#304 — had merged hours earlier, and their sections' checkboxes had gone unswept with them,
so bullets that had shipped still read as work remaining. Run
`gh pr view <N> --json state,mergedAt` on every PR the board calls open before trusting any of
them. Close the row AND the boxes in the same pass as the merge.

## Verify checkboxes against the filesystem, not the heading

**FOURTH occurrence, 2026-08-27, B8 — and the row was RIGHT this time.** B8's heading already read
"5 of 6 shipped (#266, #267, #295, #296)", yet three bullets under it still sat unticked: `share.ts`
and `messages.ts` (both #295) and `collectionStorage.ts` (#296). The board therefore advertised
three finished slices as available for three days, and `share.ts` was a plausible "next" pick right
up until `ls tests/lib/api/share.test.ts` said otherwise. So verify boxes against the filesystem,
not against the heading — and treat the boxes under any heading that names a PR as suspect until
checked. The check is one `ls` or one `git log --diff-filter=A -- <test path>` per bullet.

## Stacked PRs: `MERGED` is not a claim about `main`

A stacked PR merges into its BASE, and if that base has already been merged and retired, the child
lands on a dead branch and `main` never sees it. `gh pr view` still says `MERGED`. This happened on
2026-08-24 with E15/#314: it was based on `0313-…`, #313 merged to `main` at 21:17:42, and #314
merged into the now-retired `0313-…` branch 33 seconds later — inside the window before GitHub's
auto-retarget fires. `createHeaderRow` still had its two boolean params on `main` while the board
read ✅. **The check is `git merge-base --is-ancestor <commit> origin/main`, not the badge**, and it
is the only one that answers the question the board actually asks. Run it for every stacked PR.
Better still, merge a stack base-first and confirm each child re-targeted to `main` before merging
it.

**IT HAPPENED AGAIN on 2026-08-25, with F6/#325 — and the repeat is the more useful data point
than the original.** #325 was based on `0324-…`; #324 merged to `main` at 23:59:31 and #325 merged
into the retired base 13 minutes later. `SharedRendererProps` still had all sixteen members on
`main` while the board read ✅. Recovered by re-opening the same branch against `main` as #326.
**Why the rule above did not prevent it: every clause is addressed to the session that MERGES, not
the session that OPENS.** It is a detection procedure, so an authoring session reads it as someone
else's checklist and stacks anyway. So the rule gained a preventive half, aimed at the author:
do NOT open a PR on this board against anything but `main`. If the work genuinely depends on an
unmerged branch, say so in the PR body and wait for the parent to merge before opening the child.
The one-line alternative, if a stack is unavoidable: **delete the base branch the moment it
merges** — GitHub's auto-retarget fires on base DELETION, and neither `0313-…` nor `0324-…` was
deleted, which is the direct cause of both orphanings.

**THIRD occurrence, 2026-08-26, E2/#332 — and this one indicts the rule's PLACEMENT, not its
content.** #332 was based on `0331-…`; #331 merged to `main` first, so #332 merged into the
already-retired base. `clientFetch` and the `throwFromResponse` dedup were absent from `main`
while the board read shipped — caught by checking, not by the badge: `main` had all 25 raw
fetches back and no `clientFetch`. Recovered as #333 against `main`.
**The preventive clause added after the second occurrence was sitting three lines above, and the
authoring session stacked anyway — because it read the C7 and E2 sections and never opened
"How to use this doc" at all.** That is the actual mechanism, and it generalizes past this rule:
a session navigates by the board to its item, so anything written only in the preamble is read by
sessions that did not need it and skipped by the one that did. **The mitigation is therefore
mechanical, not another clause: on this board, `gh pr create` takes `--base main` and nothing
else. If a `--base` other than `main` is ever typed here, that is the bug, whatever the reason
seemed to be.** Three occurrences, one unchanged cause. Do not rely on the rule being read — make
the command incapable of expressing the mistake. (Process fix, 2026-08-28: the repo had
`deleteBranchOnMerge: false` and 311 remote branches; the setting is now on.)

## A ref written during the session that edits the file is born stale

The obvious drift risk is refs aging across sessions; the quieter one is writing a ref from a read
taken BEFORE your own edit, or from a subagent that read the file while you were editing it. Both
happened on 2026-08-24: E15 added a 20-line interface near the top of `contentLayout.ts` and the
two refs written later in that same session pointed 5–6 lines past their targets, and a
concurrent subagent's refs were taken against the pre-edit file. Re-resolve every ref you write
against the tree as it stands when you commit, not as it stood when you read it — and prefer
anchoring on a declaration line over a line inside a body, because a body line moves for reasons
the declaration does not.

## A fallback error string is not evidence of unhandled errors

It is the LAST branch of a mapper, and the specific branches are somewhere else. C7 is the worked
example, and it was nearly written into the board as work: `handleEmail` passes
`'Could not send that email. Please try again.'` to `run`, which reads as an unhandled 409 — until
you follow `run` one hop to `mapError`, which already returns dedicated copy for 401, 403 and 409.
Follow the error to where it is rendered before filing anything about error handling. One `grep`
separated a correct close-out from a confident, wrong finding.

## Read the sibling repo's source, never a paraphrase

Two consecutive items got their cross-repo premise wrong in opposite directions, which is the real
pattern. C6 asserted backend behaviour that had never existed; C7 asserted behaviour that existed
but described only half of it. Both were written from a summary of the other repo rather than from
its code. Read the sibling's source and tests, never a paraphrase of them — including a paraphrase
on this board. A second, sharper form from C6's close-out: when quoting the other repo's own words,
include the sentence after the one that supports you — C6's premise died on the very next clause.

## Cross-repo refs are outside every drift sweep

The per-session sweep scopes to files this repo's merges touched, so a ref into
`edens.zac.backend` can rot for weeks unseen. C7's backend refs had drifted three-of-four when
re-checked. Re-verify them by hand against that repo's `origin/main` — not a local working branch —
whenever such an item is picked up.

## Prove every regression test fails without its fix

Stash the source change, re-run the new test, confirm it goes red, restore. A green test proves
nothing until you have watched it fail. This caught two would-be-worthless tests already: C1's
first draft passed against the buggy source because the fixture left the relevant fields
`undefined`, and it is the only reason D1's gate coverage is known to be real. Cheap, and it is the
difference between a test and a decoration.

## A silent result needs a channel that can speak

"No errors in the console", "no violations reported", "nothing in the logs" — a silent result is
only evidence if you have shown the channel can speak. Include a case that SHOULD trigger the
thing, in the same run. D3 is the worked example: the CSP report-only console was clean, but the
backend was down so no image ever loaded and `img-src` was never exercised at all. Injecting an
off-policy image alongside the real ones is what turned "no reports" from unfalsifiable into a
result.

## Verify a prescribed mechanism before implementing it

The board line is a reviewer's shorthand and can name a check that does not work. D5 is the worked
example: "the reject is one prefix check" reads as `startsWith('api/')` on the joined path, and
that check is walked past by `api/../actuator/env`, because `fetch` resolves dot segments while
parsing the URL. One `new URL(...).pathname` in node, before writing any code, is what caught it.
Implementing a spec'd check without confirming it does what the item claims ships a decoration —
and it passes review, because the diff matches the item.

## An item's coverage claims are claims

The mechanism rule covers a spec'd _mechanism_; this one covers a spec'd _fact_. D9 is the worked
example: the entry asserted "no test would catch it if the redundancy reasoning were wrong", and
that was false. Deleting the redundant literals and then simulating the feared change turned an
existing test red at once. The entry had mistaken tests that pass _because the reasoning is right_
for tests that cannot tell the difference. Cost of checking: one sed, one jest run. Refs on this
board have been drift-checked every session; claims never had been. Both need it.

## An audit's method is a claim — state what its pattern cannot match

C4 is the worked example: its register-vs-revalidate table was built by grepping literal tag
strings, every ref in it was correct, and it still reported a live tag (`collection-home`) as dead
— because that tag is assembled from a template, `collection-${slug}`, and no grep for the literal
can see it. A pattern-match audit should name the set its pattern is blind to and walk that set by
hand. Here the blind set was the three template tags, and `HOME_SLUG = 'home'` settled it in one
look.

## A prescribed fix can be right on the happy path and wrong on the error path

C3 is the worked example: "compute `next` outside, then call the setter and the callback
sequentially" is correct for the optimistic update and silently destructive for the rollback, which
has to inverse-apply against whatever the state is _when the persist rejects_, not against a set
captured when the toggle started. Following the item literally would have made a second toggle
vanish whenever the first one failed. Error paths run late, hold stale closures, and are the least
covered part of any file — read the failure branch before adopting a one-line prescription.

## Collapsing two exports into one reference merges their jest automocks

Every dedup item on this board (E4's twin guards, E5, E8, E10) ends with two exports becoming one.
If ANY suite mocks that module with a bare `jest.mock('<path>')`, jest's automocker tracks
already-seen function objects by reference and hands both properties the **same** mock — so a call
to one shows up in the other's `mock.calls`, and any assertion on call order or call count
silently starts counting both. E3 is the worked example: seven suites automock
`collectionStorage`, and `update: plainCache.set` makes
`collectionStorage.update === collectionStorage.set`. **The tell is that nothing fails** — all 18
`ContentCollection` suites pass against the aliased version, so this is invisible until a later
change makes it wrong. Before collapsing twins, `grep -rn "jest.mock('<module path>')" tests/`; if
there are hits, keep the two as separate delegating functions and say why in the docblock. Costs
two lines.

## `git show --stat` the credited PR before trusting any checkbox

This is the one command that would have caught all four of 2026-08-28's sweeps, and the failure has
now happened FIVE times (B8, then E5, E10 and A9 in a single pass). The shape is always the same
and it is counter-intuitive: **the PR credited in the status cell is the PR that silently finished
the "open" bullets.** E5's row said "PR #299; 4 bullets still open" while all four shipped in
`699441b` inside #299. E10's said "bullets 6–7 unswept" while bullet 6 shipped in #304. The
shipping commit's own diffstat named every bullet in both cases. **A session writes its row before
it finishes its work, and nothing makes it come back** — so the row is a snapshot of an intention,
not a record of an outcome. Never carry a checkbox forward on the strength of the row above it.

## UNSTAMPED is a state, not a failure

**The 2026-08-26 state-table stamp claimed to cover every open item and did not — six were missing
entirely (A9, B8, E5, E10, F3, G4).** They were added; only the two swept that session (B8, F3)
carried a verified state, and the other four were marked UNSTAMPED rather than given a state nobody
checked, since a wrong COLD is exactly the thing the table exists to prevent.
**RESOLVED 2026-08-28 — the four UNSTAMPED items were swept, and holding back the stamp was the
right call. Every one of them was wrong.** E5 was complete. E10 was 5-of-7 done with a sixth bullet
that was never a task. A9 was 2-of-3 done, including a deletion the board re-filed for five
sessions. G4's count held but half its scope was false positives and ~17 blocks of real work were
uncounted. Had these been stamped COLD unverified, four sessions would have opened them expecting
work that was already finished. **The general lesson, the FIFTH occurrence of shipped-but-unticked
(B8, then E5, E10, A9 in one pass): the board is least accurate about the items it has most
recently shipped against** — E5 and E10 both credited the exact PR that silently finished their
open bullets.

## An item that hands work to the user needs a verification step

A9's `layoutpreview` delete was correctly diagnosed as user-only after the permission gate denied
it twice, correctly moved into the handoff prompt — and then re-filed for five sessions because
nobody ever ran `ls` to see whether the user had done it. They had. Write such bullets with the
check attached ("done when `find app -iname '*layoutpreview*'` is empty"), not just the ask.

## Never quote a recorded suite/test baseline

Hoisted from F3 on 2026-08-28 because it has now bitten three close-outs running, and because the
failure looks exactly like success: every stale reading was correct when it was taken. The number
moved THREE TIMES on 2026-08-27–28 alone — 245/4399 → 246/4451 (E2 merges added 52 tests) →
246/4454 (E7's new specs) → 245/4454 (#336 deleted a suite). Two of those readings were taken from
a branch whose base had since changed, which is the specific trap: a count measured on your own
branch is not a claim about `main`. The board then pinned "`main` at `fed67e8` is 245 suites /
4454 tests" — which itself went stale within a day (#342 → 4460), proving the sentence's own point.
Re-measure by stashing the tree and running the suite; never quote a recorded number.

## The mock-declaration count is the unit of value for a MOVE item

It moves in both directions. F3's `getUserPage` move (#336) looked like net +12 src; what actually
happened is that all six test files mocking `@/app/lib/api/user` ALSO mocked
`@/app/lib/api/personal` separately, so twelve mock declarations became six. Before sizing any move
item, run `grep -rln "jest.mock('<source module>')" tests/` and the same for the DESTINATION
module, and count the overlap. High overlap means the move pays; zero overlap means it is cosmetic;
and a SPLIT with high overlap costs you — F3's invite bullet would have turned six declarations
into eight, which is what tipped it from "small" to "don't".

## Costing an item is allowed to change its answer

Twice in one session it did, and a rejection is a valid, finished outcome of a sizing pass — not a
punt. F3's invite bullet and E7's `useFilteredContentBlocks` hook were both measured on 2026-08-27
and both came back rejected, each for the same underlying reason: **the thing the item proposed to
share was not actually shared.** The invite functions span three fetch perimeters, so any file
holding all three relocates the mix rather than reducing it. The two filter pipelines are
character-identical but consume different `allContent` and pass opposite arguments, so one hook
serving both needs 9–11 parameters whose job is to re-describe the differences. The tell in both:
write the shared signature FIRST. When a rejection happens, record the measurement and the
recommended alternative shape in the item so the next pass does not re-litigate it — both items
now name a smaller move that WOULD work (a 2-function invite split; a four-line handoff guard),
and in E7's case the smaller thing shipped the same day.

## Size the duplicated region, not the file

E3's "one generic pair halves the file (~100 lines)" halved 286 total lines; only the two trios
dedup, and the real saving was 46 code lines. This is a _second_, independent estimate bias from
the source-only-vs-test-coupling one, and they stack: E3's row estimated +50–150 net including
characterization, and the characterization alone was +927. When an item says "halves" or
"collapses", measure the region it actually collapses.

## An item can be invisible to the session doing its work

\#307 shipped E14 without weighing the alternative E14's own section proposed, because that section
was on the unmerged #305 branch and `grep E14 docs/` from `main` returned nothing. If board updates
are batched into a PR, either merge it before starting the items it defines, or check
`git diff main...<board-branch>` for the item first.

## Work in the primary checkout — worktree traps

PR #253 merged 2026-08-23, so the two-branches-at-once case is over: branch off `main` in
`/Users/themancalledzac/Code/edens.zac` directly, no worktree. If a second concurrent branch ever
becomes necessary again, the worktree traps are: `git worktree add` under `.claude/` needs the
sandbox disabled; worktrees have no `node_modules`, clone with `cp -Rc` and never symlink;
branching MR N+1 off MR N carries its commit, so
`git rebase --onto origin/main <prev-branch> <this-branch>` before opening the PR. Never
`git reset --hard` in the primary checkout.

## Grep symbols for test call sites before sizing

The estimates were produced from source only and have been wrong in both directions. The grep also
tells you which way it will miss: a zero-hit grep means the source-only number is trustworthy (D4
estimated ±1 and shipped ±1, the first estimate on this board to hold); any hits mean budget for
test churn on top, which is how A4, A6, D2 and D6 all came in over.

## Re-read outside-world values from more than one sample

D4's distribution was captured from the production homepage alone; a `remotePatterns` pin that
misses a second distribution breaks every image on some other page, silently, in production.
Seven pages took under a minute to check. The same applies to D3's header claims and to anything
that hardcodes a host, ID, or endpoint the repo does not own.

## Where a written plan exists, the plan's scope beats the board's one-liner

The board line was written by a reviewer skimming; the plan by someone who read the code. E1 is
the worked example: the board called it a correctness fix ("one copy carries the password-cover
strip"), the plan scoped it as a provable no-op and put that fix explicitly out of scope. The plan
was right, and the divergence became C6 — which then turned out to be backend-blocked entirely.
Read the plan before believing the board about WHY an item matters.

## Before filing a fix for a "missing" field check, grep the type

C6 looked like a frontend oversight for a day. `ContentCollectionModel` simply has no
`isPasswordProtected` to check, which is why the strip was never there. Confirm the data exists
before scoping the work.

## The move-on-close rule, and why it exists

When an item ships, its write-up moves to `docs/spikes/2026-summer-refactor/` in the same commit
that marks it done — not "later", not "when the file gets long". The move is part of closing, the
way stamping the PR number is. Two things happen first, in this order: hoist any generalizable
lesson into "How to use this doc", then check that no open item depended on the prose being inline
(if one did, copy the part it needs into that item as a guardrail). Then move the section and leave
a one-line pointer on the group heading. This is the third attempt at stopping the live file from
growing without bound, and the first two failed the same way — a consolidation pass shrinks it
once, then shipped work accretes right back, because nothing said where done work goes. Skipping
the move is how the live file got to 4,571 lines, and the cost is paid by every future session,
because the file is loaded into each one's opening context.

## The reference set and the reachability invariant

The reference directory holds two kinds of file: shipped write-ups for closed groups, and
out-of-band detail for work that is not cleanup, such as the product items in
`group-h-features.md`. The move-on-close rule was originally written as "shipped work only", and
that was too tight — enforcing it literally would have forced 26KB of product roadmap onto a
cleanup board, re-creating the bloat the split removed. The invariant that actually has to hold is
narrower: the MR board plus the live sections must be enough to pick up any cleanup MR cold, with
every reference file closed. So the test for whether an item may live in a reference file is
**reachability, not status**. An item with a row on the MR board must have its detail on the
board, because a row cannot depend on a reference file. An item that is a design review, a user
decision, an ops project or a vision item is not an MR, gets no row, and belongs in a reference
file reached from "What to build next". F4 and G3 are the calibration: both are ⛔ and both
correctly carry rows, because both have short live sections — the ⛔ is not what licenses the row.

## CSS module failures are invisible to the suite, in two distinct ways

Both were found in the 2026-08-23 run, independently, by agents working different items — which is
why this is a standing trap and not one item's detail.

1. A dangling _file_ import passes BOTH jest and tsc. Jest's `moduleNameMapper` rewrites
   `*.module.scss` to an object proxy **before** resolution, and that proxy answers any key on any
   path. TypeScript matches the ambient `declare module '*.module.scss'` wildcard without checking
   the file exists. Only `next build` fails. E9 proved it by pointing `/login` at a nonexistent
   stylesheet and watching both stay green.
2. A dangling _class key_ — `styles.loadError` with no `.loadError` rule — also passes, because
   the proxy returns `undefined`, React drops the attribute, and jsdom's identity proxy hides it.
   E10 shipped this defect into a draft and the full suite stayed green.

Guards now in the repo: `tests/styles/scssImportResolution.test.ts` (case 1, repo-wide) and
`tests/components/panelStyleReferences.test.ts` (case 2, panels only). Extending case 2 beyond the
panels is a user call, sized at 104 files importing a CSS module and 401 distinct `styles.<key>`
reads — now in the board's blocked-questions table.

## A test that cannot fail is the most common defect this board finds

Three separate agents in the 2026-08-23 run each found one, and each proved it with a control
rather than asserting it: run the _old_ test against _broken_ source and watch it pass. That third
step is what turns a suspicion into a finding. The three shapes seen so far: a fixture whose
values make the transformation a no-op (E5 — `createdAt` undefined, so the sort compares 0 against
0); an assertion on caller-supplied literals that holds regardless of the code under test (B5);
and a negative query pinned to a string that a rename just removed, so it passes vacuously (H2a).
Sweep for the third shape after **any** copy change: `queryBy…` + `not.toBeInTheDocument()`
against a renamed string proves nothing.

## `new Response(...)` in a test mock throws under jsdom

jsdom has no global `Response`, so a mock resolving `new Response(null, { status: 200 })` throws
on its first call. Under `Promise.all(xs.map(fetch))` that records **one** call instead of N,
which reads as a batching bug in source that is actually fine. Resolve a plain `{ ok: true }`, the
repo convention. Applies to any test asserting more than one parallel fetch.

## Before escalating to the user, grep the source and the crediting PR for the answer

When a guardrail said "report what changing X would cost", go read where that report landed before
re-asking the question. It is usually in the PR body or in a docblock the PR added, not in the
board — so the board keeps showing BLOCKED against an answer that already exists in the repo. E3
is the worked example: #306's guardrail asked for the guard-deletion analysis, #306 wrote it into
`collectionStorage.ts:47-55`, and the item sat blocked on the user for four days anyway. This is
the same family as shipped-but-unticked, pointed at questions instead of checkboxes, and it is the
sixth occurrence.

## A multi-hunk merge cannot be corrected with a single offset

\#339 made three edits to one file and produced three different offsets (+23/+17/+11 by band).
Re-derive from an anchor, never by adding a constant — and do not anchor on generic punctuation:
anchoring F1's update-form boundary on its raw `);` false-matched 13 lines early. Anchor on the
enclosing construct (a `const` declaration, a dependency array), not on a line that appears 200
times. The stronger form, from the third F1 drift: ANY merge invalidates refs below it, including
one that changes no logic — a Prettier collapse is a hunk.

## An open item must be readable without opening the archive

The archive is for forensics, not for prerequisites. Where an open item depends on something
shipped, copy the part it needs into the open item as a guardrail. B1 was the worked example: it
restated exactly what E11's drift test cannot see, so B1 could be picked up cold with the archive
left closed.

## A new reference file goes INSIDE the archive directory

`.gitignore` matches `docs/spikes/*` and negates exactly two paths — the live board and the
`2026-summer-refactor/` directory. A doc filed next to the directory is invisible to git with no
error and no warning; it will look tracked in the editor and vanish with the machine.
`git check-ignore -v <path>` before assuming any new doc is safe.

## A claim that two test suites are duplicates is really a claim about their source

Two suites are only redundant if they exercise the same source function. B3 is the worked example:
the board called camera/lens/filmType a duplicated triplet, but `buildCameraDiff` and
`buildLensDiff` are two separate copy-pasted functions with identical bodies, so deleting either
suite would have dropped all coverage of a real function — and `buildFilmTypeDiff` is unrelated
logic. B7 is the same error pointed the other way: two of its four listener-spy tests asserted on
a `keydown` listener that `useClickOutside` never registers, because Escape is delegated to
`useEscapeKey`. Read the source both suites call before believing they overlap.

## Duplication claims are the weakest class on this board

Five were checked in one session and the tally is worth stating exactly, because rounding it to
"always wrong" would be the same overstatement the rule exists to catch. B1's `handleApiError`
claim held completely: eight of ten cases were byte-identical twins, the other two hit the same
branch, nothing needed carrying over. The other four were wrong or partial — B3's triplet was a
pair plus unrelated logic, B7's spies watched a listener that is never registered, B2 found three
of eighteen cases unique, and B4's "duplicate" describes turned out complementary, which is why
its estimate was off by an order of magnitude. So: one in five survived intact. Treat a
duplication claim as a lead worth an hour, not as a finding, and expect the work to be merging
rather than deleting.

## A red-then-green test is the gate, but it is not the same as having watched the bug

The prove-it-fails rule is necessary and it is not sufficient, because a test written from the
same mental model as the fix can encode the same error and go red for the wrong reason. C1 is the
worked example one level down: its first draft went green against buggy source because the fixture
left the relevant fields `undefined`. The same mistake is available one level up. Where an
observation is cheap — a page you can open, a button you can click — spend the minute and record
that you did. Where it is not, say so in the item rather than implying it happened.

## Record the command beside any count — and try to recover a method before discarding one

Line refs can be checked by opening the file; counts cannot, because the next session does not
know what was being counted. Two items were found unrepairable on 2026-08-24 for exactly this:
F2's "twenty render-constant props copied ~10 times" (actual intersection 16, actual copy sites 3)
and G2c's per-file comment-block inventory, where the recorded count differed from a re-take by so
much that it was plainly a different metric rather than drift. Both had been "re-verified" at some
point, which is what made them trusted. A count that drives an estimate and cannot be re-run is
worse than no count, because it gets believed. **Amended 2026-08-24 after E17: "unrepairable" was
too strong.** G2c's inventory was recovered by reproducing candidate methods until one matched —
"runs of consecutive `//`-only lines" hit 6 of 11 files exactly, and a method that reproduces most
of a table IS the method. So before declaring a count lost, spend one pass trying two or three
plausible metrics against it.

## A line count cannot see a narrowed type

E17 was sized −15 src and shipped at +3 (−2 code, +5 comment). Nothing went wrong: swapping a
four-value union for a boolean is a SAME-LINE edit at every declaration and every call site, so
the diff shows churn where the win is a type that can no longer express three states nothing
reads. An item whose payoff is a narrower type, a moved file, or a reversed dependency edge will
score ~0 on this board's metric and is not thereby a failed item. F3 was the live case — its
"~neutral" estimate was true and said nothing; its value was the `ReorderMove` edge that unblocked
F6. When sizing an item, first ask whether its win is even the kind of thing a diff can measure,
and if not, say so in the estimate column instead of writing a number that will later read as a
miss.
