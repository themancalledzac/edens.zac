# 2026 Summer Refactor — Living Checklist

_Formerly `docs/spikes/2026-08-22-frontend-cleanup-spike.md`; renamed 2026-08-23 as the standing
per-session tracker (a pointer stub remains at the old path for stale references)._

_Origin: full critical review of `main` on 2026-08-22, produced by 8 parallel review agents (API, security, utils/hooks, admin surface, public surface, tests, styles, organization/roadmap). Every dead-code claim was verified by grepping call sites; the parent session re-verified every high-severity claim against current code. Full-board re-review 2026-08-22/23 by 7 more agents — see the stamp below._

**This file is a running to-do list, not a one-shot report.** Work is split into numbered MRs sized to land in a single sitting. Check the box when the MR merges, and put the PR number next to it. Keep the `file:line` references — they let any MR be picked up cold.

> **Two tiers. This file carries ONLY what is still open.**
>
> When an item closes, its write-up **moves** to its group's archive under
> [`2026-summer-refactor/`](2026-summer-refactor/) rather than staying here ticked. The group heading
> keeps a one-line pointer naming what shipped and where. Same split for the session log: the newest
> two entries stay here, everything older lives in
> [session-log.md](2026-summer-refactor/session-log.md).
>
> | Tier    | File                                             | Holds                                                                                                             |
> | ------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
> | Live    | this file                                        | working rules, the MR board, the open-item classification, open item sections, the newest two session-log entries |
> | Archive | [`2026-summer-refactor/`](2026-summer-refactor/) | every closed item's full write-up, one file per group, plus the older session log                                 |
>
> **Why:** this file is `@`-referenced into a fresh session's opening context every run, so its
> length is a per-session cost paid forever. It reached 4,571 lines on 2026-08-28 — of which 1,907
> were closed-item detail and 837 were old session-log entries — before the split was re-applied,
> taking it to ~1,800. Anything a session must read to start work belongs here; anything it would
> only read to understand a decision already made belongs in the archive.
>
> **The invariant that makes this safe:** an open item must be readable with every archive file
> closed. Where an open item depends on something shipped, copy the part it needs into the open item
> as a guardrail. Generalizable lessons get hoisted into "How to use this doc" **before** the item's
> section moves — that is what stops archiving from losing a rule.
>
> **This lapsed once already.** The archive was created 2026-08-24 and then twenty-four items closed
> on the live board without moving. If a group heading says "N shipped" and the sections are still
> below it, the split has lapsed again — re-apply it in that session's close-out, not later.

> **Tracked as of 2026-08-23** (branch `0271-summer-refactor-tracker`): `docs/spikes/*` stays
> gitignored except this file, so the board and its decisions now have history and survive the
> machine. Trade-off accepted deliberately 2026-08-23: the repo is public and this file then
> documented unfixed security items (D3, D5, D8) — the backend repo's tracker set the precedent.
> All three shipped, and Group D closed 2026-08-24, so the tracked board no longer names a live
> weakness. Additional durable copies: the review artifact (stamp below) and MemPalace
> (`mempalace_user_search(query="frontend cleanup spike review")`).
>
> **CONFIRMED 2026-08-23: PR #271 merged, the file is tracked** (`git ls-files docs/spikes/` lists
> it; `.gitignore` pairs `docs/spikes/*` with `!docs/spikes/2026-summer-refactor.md` and, since the
> archive split, `!docs/spikes/2026-summer-refactor/`. A new archive file is invisible to git
> without that second negation — add files under that directory, never beside it).
> **Trap this creates, hit on the very next run:** a session whose local `main` predates #271 sees
> this file as untracked, and `git check-ignore -v` reports it plainly IGNORED — the pre-negation
> `.gitignore` is what's checked out. Do not conclude the tracking never happened; `git fetch` and
> compare against `origin/main` first. Syncing also needs the local untracked copy removed before
> the fast-forward, because git refuses to create a tracked file over an untracked one even when
> the bytes are identical. Diff them first (`git show origin/main:<path>`), then delete and merge.

> **Full-board review, 2026-08-22/23 (7 parallel agents).** Every open item re-verified and stamped
> COLD or ⛔ in the board. 27 `file:line` refs checked: 22 correct, 4 drifted, 1 gone — corrected in
> place below. Estimates recalibrated per item (the source-only pattern held: several "negative"
> E-items go net-positive once required tests are counted). The merged security gates (D1/D2/D6)
> passed an adversarial review with no high/medium finding (one new trivial item, D8). A correctness
> spot-review of A5/A6/C1/E1/D2 found ZERO regressions on main. PR #253 re-reviewed: technically
> merge-ready, blocked only on the four-panel design decision. D3 and D4 were UNBLOCKED against
> production (`curl -sI https://www.zacedens.com/`): Amplify injects no security headers, and the
> distribution is `d2qp8h5pbkohe6.cloudfront.net`. C5's token-leak bullet was disproven and reframed.
> Durable copy of the review: https://claude.ai/code/artifact/2bac2495-6d76-40e7-bcad-56b3ddf1d4fe
> **PR #253 MERGED 2026-08-23 (79fbca5)** — that closed D7 outright and unblocked E10.

## How to use this doc

- One MR per numbered item (`A1`, `B3`, …). Do not bundle across items.
- **A status cell naming an open PR is a claim by the session that opened it, not a fact.** Run
  `gh pr view <N> --json state,mergedAt` on every PR the board calls open before trusting any of
  them. On 2026-08-24 all five rows saying "PR #N open" — B5/#298, E5/#299, E9/#300, G1/#303,
  E10/#304 — had merged hours earlier, and their sections' checkboxes had gone unswept with them,
  so bullets that had shipped still read as work remaining. Close the row AND the boxes in the same
  pass as the merge.
- **FOURTH occurrence, 2026-08-27, B8 — and the row was RIGHT this time.** B8's heading already read
  "5 of 6 shipped (#266, #267, #295, #296)", yet three bullets under it still sat unticked: `share.ts`
  and `messages.ts` (both #295) and `collectionStorage.ts` (#296). The board therefore advertised
  three finished slices as available for three days, and `share.ts` was a plausible "next" pick right
  up until `ls tests/lib/api/share.test.ts` said otherwise. **So verify boxes against the filesystem,
  not against the heading — and treat the boxes under any heading that names a PR as suspect until
  checked.** The check is one `ls` or one `git log --diff-filter=A -- <test path>` per bullet.
- **`MERGED` is not a claim about `main`.** A stacked PR merges into its BASE, and if that base has
  already been merged and retired, the child lands on a dead branch and `main` never sees it.
  `gh pr view` still says `MERGED`. This happened on 2026-08-24 with E15/#314: it was based on
  `0313-…`, #313 merged to `main` at 21:17:42, and #314 merged into the now-retired `0313-…` branch
  33 seconds later — inside the window before GitHub's auto-retarget fires. `createHeaderRow` still
  had its two boolean params on `main` while the board read ✅. **The check is
  `git merge-base --is-ancestor <commit> origin/main`, not the badge**, and it is the only one that
  answers the question the board actually asks. Run it for every stacked PR. Better still, merge a
  stack base-first and confirm each child re-targeted to `main` before merging it.
  **IT HAPPENED AGAIN on 2026-08-25, with F6/#325 — and the repeat is the more useful data point
  than the original.** #325 was based on `0324-…`; #324 merged to `main` at 23:59:31 and #325 merged
  into the retired base 13 minutes later. `SharedRendererProps` still had all sixteen members on
  `main` while the board read ✅. Recovered by re-opening the same branch against `main` as #326.
  **Why the rule above did not prevent it: every clause is addressed to the session that MERGES, not
  the session that OPENS.** It is a detection procedure, so an authoring session reads it as someone
  else's checklist and stacks anyway. **So the rule now has a preventive half, aimed at the author:
  do NOT open a PR on this board against anything but `main`.** If the work genuinely depends on an
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
  seemed to be.** Three occurrences, one unchanged cause. Do not rely on this rule being read —
  make the command incapable of expressing the mistake.
- **A `file:line` ref written during the session that edits that file is born stale.** The obvious
  drift risk is refs aging across sessions; the quieter one is writing a ref from a read taken
  BEFORE your own edit, or from a subagent that read the file while you were editing it. Both
  happened on 2026-08-24: E15 added a 20-line interface near the top of `contentLayout.ts` and the
  two refs written later in that same session pointed 5–6 lines past their targets, and a
  concurrent subagent's refs were taken against the pre-edit file. **Re-resolve every ref you write
  against the tree as it stands when you commit, not as it stood when you read it** — and prefer
  anchoring on a declaration line over a line inside a body, because a body line moves for reasons
  the declaration does not.
- **A fallback error string at a call site is not evidence that the error is unhandled.** It is the
  LAST branch of a mapper, and the specific branches are somewhere else. C7 is the worked example,
  and it was nearly written into this board as work: `handleEmail` passes
  `'Could not send that email. Please try again.'` to `run`, which reads as an unhandled 409 — until
  you follow `run` one hop to `mapError`, which already returns dedicated copy for 401, 403 and 409.
  **Follow the error to where it is rendered before filing anything about error handling.** One
  `grep` separated a correct close-out from a confident, wrong finding.
- **Two consecutive items got their cross-repo premise wrong in opposite directions, which is the
  real pattern.** C6 asserted backend behaviour that had never existed; C7 asserted behaviour that
  existed but described only half of it. Both were written from a summary of the other repo rather
  than from its code. **Read the sibling's source and tests, never a paraphrase of them — including
  a paraphrase on this board.**
- **Cross-repo `file:line` refs are not covered by any drift sweep here.** The per-session sweep
  scopes to files this repo's merges touched, so a ref into `edens.zac.backend` can rot for weeks
  unseen. C7's backend refs had drifted three-of-four when re-checked. Re-verify them by hand
  against that repo's `origin/main` — not a local working branch — whenever such an item is picked up.
- Every MR ends with the standard verification: scoped `eslint --fix` → `prettier --write` → `tsc --noEmit` → full `jest`.
- **Prove every regression test fails without its fix.** Stash the source change, re-run the new
  test, confirm it goes red, restore. A green test proves nothing until you have watched it fail.
  This caught two would-be-worthless tests already: C1's first draft passed against the buggy source
  because the fixture left the relevant fields `undefined`, and it is the only reason D1's gate
  coverage is known to be real. Cheap, and it is the difference between a test and a decoration.
- **The same rule applies to anything you verify by observation, not just to tests.** "No errors in
  the console", "no violations reported", "nothing in the logs" — a silent result is only evidence
  if you have shown the channel can speak. Include a case that SHOULD trigger the thing, in the same
  run. D3 is the worked example: the CSP report-only console was clean, but the backend was down so
  no image ever loaded and `img-src` was never exercised at all. Injecting an off-policy image
  alongside the real ones is what turned "no reports" from unfalsifiable into a result.
- **When an item specifies the mechanism of a fix, verify the mechanism before you implement it.**
  The board line is a reviewer's shorthand and can name a check that does not work. D5 is the worked
  example: "the reject is one prefix check" reads as `startsWith('api/')` on the joined path, and
  that check is walked past by `api/../actuator/env`, because `fetch` resolves dot segments while
  parsing the URL. One `new URL(...).pathname` in node, before writing any code, is what caught it.
  Implementing a spec'd check without confirming it does what the item claims ships a decoration —
  and it passes review, because the diff matches the item.
- **An item's claims about test coverage are claims, not facts — check them the same way.** The
  rule above covers a spec'd _mechanism_; this one covers a spec'd _fact_. D9 is the worked example:
  the entry asserted "no test would catch it if the redundancy reasoning were wrong", and that was
  false. Deleting the redundant literals and then simulating the feared change turned an existing
  test red at once. The entry had mistaken tests that pass _because the reasoning is right_ for
  tests that cannot tell the difference. Cost of checking: one sed, one jest run. **Refs on this
  board have been drift-checked every session; claims never had been.** Both need it.
- **An audit's METHOD is a claim too — state what its pattern cannot match.** The rule above covers
  a spec'd fact; this one covers how the fact was gathered. C4 is the worked example: its
  register-vs-revalidate table was built by grepping literal tag strings, every ref in it was
  correct, and it still reported a live tag (`collection-home`) as dead — because that tag is
  assembled from a template, `collection-${slug}`, and no grep for the literal can see it. A
  pattern-match audit should name the set its pattern is blind to and walk that set by hand. Here
  the blind set was the three template tags, and `HOME_SLUG = 'home'` settled it in one look.
- **A prescribed fix can be right on the happy path and wrong on the error path — check both.** The
  rule above is about how a claim was gathered; this one is about the fix an item hands you. C3 is
  the worked example: "compute `next` outside, then call the setter and the callback sequentially"
  is correct for the optimistic update and silently destructive for the rollback, which has to
  inverse-apply against whatever the state is _when the persist rejects_, not against a set captured
  when the toggle started. Following the item literally would have made a second toggle vanish
  whenever the first one failed. Error paths run late, hold stale closures, and are the least
  covered part of any file — read the failure branch before adopting a one-line prescription.
- **Collapsing two exported functions into one reference merges their jest automocks.** Every
  dedup item on this board (E4's twin guards, E5, E8, E10) ends with two exports becoming one.
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
- **When a row names a merged PR, `git show --stat <sha>` that PR against the bullet list BEFORE
  trusting any checkbox in it.** This is the one command that would have caught all four of
  2026-08-28's sweeps, and the failure has now happened FIVE times (B8, then E5, E10 and A9 in a
  single pass). The shape is always the same and it is counter-intuitive: **the PR credited in the
  status cell is the PR that silently finished the "open" bullets.** E5's row said "PR #299; 4
  bullets still open" while all four shipped in `699441b` inside #299. E10's said "bullets 6–7
  unswept" while bullet 6 shipped in #304. The shipping commit's own diffstat named every bullet in
  both cases. **A session writes its row before it finishes its work, and nothing makes it come
  back** — so the row is a snapshot of an intention, not a record of an outcome. Never carry a
  checkbox forward on the strength of the row above it.
- **An item that hands work to the USER needs a verification step, or it becomes immortal.** A9's
  `layoutpreview` delete was correctly diagnosed as user-only after the permission gate denied it
  twice, correctly moved into the handoff prompt — and then re-filed for five sessions because
  nobody ever ran `ls` to see whether the user had done it. They had. **Write such bullets with the
  check attached ("done when `find app -iname '*layoutpreview*'` is empty"), not just the ask.**
- **Never quote a recorded suite/test baseline. Re-measure it by stashing the tree and running the
  suite.** Hoisted from F3 on 2026-08-28 because it has now bitten three close-outs running, and
  because the failure looks exactly like success: every stale reading was correct when it was taken.
  The number moved THREE TIMES on 2026-08-27–28 alone — 245/4399 → 246/4451 (E2 merges added 52
  tests) → 246/4454 (E7's new specs) → **245/4454** (#336 deleted a suite). Two of those readings
  were taken from a branch whose base had since changed, which is the specific trap: a count
  measured on your own branch is not a claim about `main`. **`main` at `fed67e8` is 245 suites /
  4454 tests.** Any close-out that quotes a different number without a fresh measurement is wrong,
  including this line the moment something merges.
- **The mock-declaration count is the unit of value for a MOVE item, and it moves in both
  directions.** The rule above covers collapsing two exports into one. The same mechanic decides
  whether moving an export between modules is worth doing, and a line count cannot see it. F3's
  `getUserPage` move (#336) looked like net +12 src; what actually happened is that all six test
  files mocking `@/app/lib/api/user` ALSO mocked `@/app/lib/api/personal` separately, so twelve mock
  declarations became six. **Before sizing any move item, run
  `grep -rln "jest.mock('<source module>')" tests/` and the same for the DESTINATION module, and
  count the overlap.** High overlap means the move pays; zero overlap means it is cosmetic; and a
  SPLIT with high overlap costs you — F3's invite bullet would have turned six declarations into
  eight, which is what tipped it from "small" to "don't".
- **Costing an item is allowed to change its answer, and twice in one session it did. A rejection is
  a valid, finished outcome of a sizing pass — not a punt.** F3's invite bullet and E7's
  `useFilteredContentBlocks` hook were both measured on 2026-08-27 and both came back rejected, each
  for the same underlying reason: **the thing the item proposed to share was not actually shared.**
  The invite functions span three fetch perimeters, so any file holding all three relocates the mix
  rather than reducing it. The two filter pipelines are character-identical but consume different
  `allContent` and pass opposite arguments, so one hook serving both needs 9–11 parameters whose job
  is to re-describe the differences. **The tell in both: write the shared signature FIRST. If more
  than about a third of its parameters exist only to switch behavior between the callers, the
  callers are not duplicates and the item is wrong.** When this happens, record the measurement and
  the recommended alternative shape in the item so the next pass does not re-litigate it — both of
  those items now name a smaller move that WOULD work (a 2-function invite split; a four-line
  handoff guard), and in E7's case the smaller thing shipped the same day.
- **Size the duplicated region, not the file.** E3's "one generic pair halves the file (~100 lines)"
  halved 286 total lines; only the two trios dedup, and the real saving was 46 code lines. This is a
  _second_, independent estimate bias from the source-only-vs-test-coupling one, and they stack:
  E3's row estimated +50–150 net including characterization, and the characterization alone was
  +927. When an item says "halves" or "collapses", measure the region it actually collapses.
- **An item can be invisible to the session doing its work if it lives in an open board PR.** #307
  shipped E14 without weighing the alternative E14's own section proposed, because that section was
  on the unmerged #305 branch and `grep E14 docs/` from `main` returned nothing. If board updates
  are batched into a PR, either merge it before starting the items it defines, or check
  `git diff main...<board-branch>` for the item first.
- **Work in the primary checkout.** PR #253 merged 2026-08-23, so the two-branches-at-once case is
  over: branch off `main` in `/Users/themancalledzac/Code/edens.zac` directly, no worktree. If a
  second concurrent branch ever becomes necessary again, the worktree traps are: `git worktree add`
  under `.claude/` needs the sandbox disabled; worktrees have no `node_modules`, clone with `cp -Rc`
  and never symlink; branching MR N+1 off MR N carries its commit, so
  `git rebase --onto origin/main <prev-branch> <this-branch>` before opening the PR. Never
  `git reset --hard` in the primary checkout.
- Group B is pure subtraction and can run in any order. Group A is NOT — `A5` turned out to be a bug
  fix, not a deletion. Group E has one item (`E1`) that is a real correctness risk — do it before the
  rest of E.
- Before sizing a sitting around an item, grep its symbols for test call sites. The estimates were
  produced from source only and have been wrong in both directions. **The grep also tells you which
  way it will miss:** a zero-hit grep means the source-only number is trustworthy (D4 estimated ±1
  and shipped ±1, the first estimate on this board to hold); any hits mean budget for test churn on
  top, which is how A4, A6, D2 and D6 all came in over.
- **When an item pins a value read off the outside world, re-read it from more than one sample.**
  D4's distribution was captured from the production homepage alone; a `remotePatterns` pin that
  misses a second distribution breaks every image on some other page, silently, in production.
  Seven pages took under a minute to check. The same applies to D3's header claims and to anything
  that hardcodes a host, ID, or endpoint the repo does not own.
- When an item is done, mark it `[x]` and append `— PR #NNN`. Leave the detail text in place; it is the record of what changed.
- **Where a written plan exists, the plan's scope beats this board's one-liner.** The board line was
  written by a reviewer skimming; the plan by someone who read the code. E1 is the worked example:
  the board called it a correctness fix ("one copy carries the password-cover strip"), the plan
  scoped it as a provable no-op and put that fix explicitly out of scope. The plan was right, and
  the divergence became C6 — which then turned out to be backend-blocked entirely. Read the plan
  before believing the board about WHY an item matters.
- **Before filing a frontend fix for a "missing" field check, grep the type.** C6 looked like a
  frontend oversight for a day. `ContentCollectionModel` simply has no `isPasswordProtected` to
  check, which is why the strip was never there. Confirm the data exists before scoping the work.
- **When an item ships, its write-up moves to `docs/spikes/2026-summer-refactor/` in the same commit
  that marks it done.** The board keeps the row; the group section keeps a pointer. This is the
  third attempt at stopping this file from growing without bound, and the first two failed the same
  way — a consolidation pass shrinks it once, then shipped work accretes right back, because nothing
  said where done work goes. Now something does.
- **That directory is the board's reference set, not only an archive.** It holds two kinds of file:
  shipped write-ups for closed groups, and out-of-band detail for work that is not cleanup, such as
  the product items in `group-h-features.md`. The rule above was originally written as
  "shipped work only", and that was too tight — enforcing it literally would have forced 26KB of
  product roadmap onto a cleanup board, re-creating the bloat the split removed. The invariant that
  actually has to hold is narrower:

  > The MR board plus the live sections must be enough to pick up any cleanup MR cold, with every
  > reference file closed.

  So the test for whether an item may live in a reference file is **reachability, not status**. An
  item with a row on the MR board must have its detail on the board, because a row cannot depend on
  a reference file. An item that is a design review, a user decision, an ops project or a vision
  item is not an MR, gets no row, and belongs in a reference file reached from
  "What to build next". F4 and G3 are the calibration: both are ⛔ and both correctly carry rows,
  because both have short live sections — the ⛔ is not what licenses the row.

- **CSS module failures are invisible to this suite, in two distinct ways.** Both were found in
  the 2026-08-23 run, independently, by agents working different items — which is why this is a
  standing trap and not one item's detail.
  1. A dangling _file_ import passes BOTH jest and tsc. Jest's `moduleNameMapper` rewrites
     `*.module.scss` to an object proxy **before** resolution, and that proxy answers any key on any
     path. TypeScript matches the ambient `declare module '*.module.scss'` wildcard without checking
     the file exists. Only `next build` fails. E9 proved it by pointing `/login` at a nonexistent
     stylesheet and watching both stay green.
  2. A dangling _class key_ — `styles.loadError` with no `.loadError` rule — also passes, because
     the proxy returns `undefined`, React drops the attribute, and jsdom's identity proxy hides it.
     E10 shipped this defect into a draft and the full suite stayed green.
     Guards now in the repo: `tests/styles/scssImportResolution.test.ts` (case 1, repo-wide) and
     `tests/components/panelStyleReferences.test.ts` (case 2, panels only). **Extending case 2 beyond
     the panels is an open user call, now sized: 104 files under `app/` import a CSS module and
     there are 401 distinct `styles.<key>` reads across them. A repo-wide version of the panel guard
     is a real item, which is the argument for one generic test over per-component assertions.** Until then, any MR that moves or deletes SCSS must verify by
     `next build` or by an explicit resolution assertion — a green jest run is not evidence.
- **A test that cannot fail is the most common defect this board finds.** Three separate agents in
  the 2026-08-23 run each found one, and each proved it with a control rather than asserting it: run
  the _old_ test against _broken_ source and watch it pass. That third step is what turns a suspicion
  into a finding. The three shapes seen so far: a fixture whose values make the transformation a
  no-op (E5 — `createdAt` undefined, so the sort compares 0 against 0); an assertion on
  caller-supplied literals that holds regardless of the code under test (B5); and a negative query
  pinned to a string that a rename just removed, so it passes vacuously (H2a). Sweep for the third
  shape after **any** copy change: `queryBy…` + `not.toBeInTheDocument()` against a renamed string
  proves nothing.
- **`new Response(...)` in a test mock throws under jsdom.** jsdom has no global `Response`, so a
  mock resolving `new Response(null, { status: 200 })` throws on its first call. Under
  `Promise.all(xs.map(fetch))` that records **one** call instead of N, which reads as a batching bug
  in source that is actually fine. Resolve a plain `{ ok: true }`, the repo convention. Applies to
  any test asserting more than one parallel fetch.
- **A closed item's write-up moves to its group archive in the same close-out that closes it.**
  Not "later", not "when the file gets long" — the move is part of closing, the way stamping the PR
  number is. Two things happen first, in this order: hoist any generalizable lesson into this
  section, then check that no open item depended on the prose being inline (if one did, copy the
  part it needs into that item as a guardrail). Then move the section and leave a one-line pointer
  on the group heading. **Skipping the move is how the live file got to 4,571 lines**, and the cost
  is paid by every future session, because this file is loaded into each one's opening context.
- **When a guardrail said "report what changing X would cost", go read where that report landed
  before re-asking the question.** It is usually in the PR body or in a docblock the PR added, not
  in the board — so the board keeps showing BLOCKED against an answer that already exists in the
  repo. E3 is the worked example: #306's guardrail asked for the guard-deletion analysis, #306 wrote
  it into `collectionStorage.ts:47-55`, and the item sat blocked on the user for four days anyway.
  This is the same family as shipped-but-unticked, pointed at questions instead of checkboxes, and
  it is now the sixth occurrence. **Before escalating any item to the user, grep the source and the
  crediting PR for the answer.**
- **A line ref invalidated by a multi-hunk merge cannot be fixed with a single offset.** #339 made
  three edits to one file and produced three different offsets (+23/+17/+11 by band). Re-derive from
  an anchor, never by adding a constant — and **do not anchor on generic punctuation**: anchoring
  F1's update-form boundary on its raw `);` false-matched 13 lines early. Anchor on the enclosing
  construct (a `const` declaration, a dependency array), not on a line that appears 200 times.
- **An open item must be readable without opening the archive.** The archive is for forensics, not
  for prerequisites. Where an open item depends on something shipped, copy the part it needs into
  the open item as a guardrail. B1 is the worked example: it restates exactly what E11's drift test
  cannot see, so B1 can be picked up cold with the archive left closed.
- **A new reference file must go INSIDE `docs/spikes/2026-summer-refactor/`, never beside it.**
  `.gitignore` matches `docs/spikes/*` and negates exactly two paths — this file and that
  directory. A doc filed next to the directory is invisible to git with no error and no warning; it
  will look tracked in the editor and vanish with the machine. `git check-ignore -v <path>` before
  assuming any new doc is safe.
- **A claim that two test suites are duplicates is really a claim about their SOURCE.** Two suites
  are only redundant if they exercise the same source function. B3 is the worked example: the board
  called camera/lens/filmType a duplicated triplet, but `buildCameraDiff` and `buildLensDiff` are
  two separate copy-pasted functions with identical bodies, so deleting either suite would have
  dropped all coverage of a real function — and `buildFilmTypeDiff` is unrelated logic. B7 is the
  same error pointed the other way: two of its four listener-spy tests asserted on a `keydown`
  listener that `useClickOutside` never registers, because Escape is delegated to `useEscapeKey`.
  Read the source both suites call before believing they overlap.
- **Duplication claims are the weakest class on this board — budget for checking them, not for
  acting on them.** Five were checked in one session and the tally is worth stating exactly, because
  rounding it to "always wrong" would be the same overstatement the rule exists to catch. B1's
  `handleApiError` claim held completely: eight of ten cases were byte-identical twins, the other
  two hit the same branch, nothing needed carrying over. The other four were wrong or partial — B3's
  triplet was a pair plus unrelated logic, B7's spies watched a listener that is never registered,
  B2 found three of eighteen cases unique, and B4's "duplicate" describes turned out complementary,
  which is why its estimate was off by an order of magnitude. So: one in five survived intact. Treat
  a duplication claim as a lead worth an hour, not as a finding, and expect the work to be merging
  rather than deleting.
- **A red-then-green test is the gate, but it is not the same as having watched the bug.** The
  prove-it-fails rule above is necessary and it is not sufficient, because a test written from the
  same mental model as the fix can encode the same error and go red for the wrong reason. C1 is the
  worked example one level down: its first draft went green against buggy source because the fixture
  left the relevant fields `undefined`. The same mistake is available one level up. Where an
  observation is cheap — a page you can open, a button you can click — spend the minute and record
  that you did. Where it is not, say so in the item rather than implying it happened.
- **An inventory number with no recorded method is not verifiable, only re-derivable — so record
  the command beside the number.** Line refs can be checked by opening the file; counts cannot,
  because the next session does not know what was being counted. Two items were found unrepairable
  on 2026-08-24 for exactly this: F2's "twenty render-constant props copied ~10 times" (actual
  intersection 16, actual copy sites 3) and G2c's per-file comment-block inventory, where today's
  count differs from the recorded one by so much that it is plainly a different metric rather than
  drift. Both had been "re-verified" at some point, which is what made them trusted. **When you
  write a count on this board, write the command that produced it on the same line.** A count that
  drives an estimate and cannot be re-run is worse than no count, because it gets believed.
  **Amended 2026-08-24 after E17: "unrepairable" was too strong.** G2c's inventory was recovered by
  reproducing candidate methods until one matched — "runs of consecutive `//`-only lines" hit 6 of
  11 files exactly, and a method that reproduces most of a table IS the method. So before declaring
  a count lost, spend one pass trying two or three plausible metrics against it. Record the method
  when you write the count; try to recover it before you discard it.

- **A line count cannot see a narrowed type, and several remaining items are of that kind.** E17
  was sized −15 src and shipped at +3 (−2 code, +5 comment). Nothing went wrong: swapping a
  four-value union for a boolean is a SAME-LINE edit at every declaration and every call site, so
  the diff shows churn where the win is a type that can no longer express three states nothing
  reads. **An item whose payoff is a narrower type, a moved file, or a reversed dependency edge will
  score ~0 on this board's metric and is not thereby a failed item.** F3 is the live case — nine
  bullets of moves and renames, currently sized "~neutral", which is true and says nothing; its
  value is the `ReorderMove` edge that unblocks F6. When sizing an item, first ask whether its win
  is even the kind of thing a diff can measure, and if not, say so in the estimate column instead of
  writing a number that will later read as a miss.

## MR board

| MR  | Scope                                                                      | Risk        | Est. diff                                                                                                                                  | Status                                                                                                                                                          |
| --- | -------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Dead whole files + their tests                                             | Minimal     | −1,261                                                                                                                                     | ✅ PR #255                                                                                                                                                      |
| A2  | Dead exports in `lib/api`                                                  | Minimal     | −283                                                                                                                                       | ✅ PR #256                                                                                                                                                      |
| A3  | Dead half of `metadataUtils.ts`                                            | Minimal     | −400 src, −500 test                                                                                                                        | ✅ PR #257                                                                                                                                                      |
| A4  | Dead small utils, constants, type guards                                   | Minimal     | −652                                                                                                                                       | ✅ PR #258                                                                                                                                                      |
| A5  | Gray overlay never paints on the manage grid (BUG)                         | Low         | ±40                                                                                                                                        | ✅ PR #260                                                                                                                                                      |
| A6  | `CollectionListSelector` flat mode                                         | Medium      | −223 net (−183 src/scss, −40 test)                                                                                                         | ✅ PR #261                                                                                                                                                      |
| A7a | `useCollectionEdit` legacy aliases                                         | Minimal     | −8                                                                                                                                         | ✅ PR #259                                                                                                                                                      |
| A7b | `enterSelect`/`enterAdd` inline copies                                     | Low         | −2 src                                                                                                                                     | ✅ PR #262                                                                                                                                                      |
| A8  | Dead SCSS in live modules + `globals.css` tokens                           | Low         | −327                                                                                                                                       | ✅ PR #263                                                                                                                                                      |
| A9  | Dead config                                                                | Minimal     | −35                                                                                                                                        | ◐ PR #259 — swept 08-28: 2 of 3 already DONE; 1 open, and it is a CLAUDE.md:22 correction, not a deletion                                                       |
| B1  | Merge `manageUtils.test.ts`                                                | Low         | −209 net (est. −450)                                                                                                                       | ✅ PR #290                                                                                                                                                      |
| B2  | `rowCombination` characterization dedup                                    | Low         | −229 (est. −250)                                                                                                                           | ✅ PR #288                                                                                                                                                      |
| B3  | `metadataUtils.test.ts` dedup                                              | Low         | −125 (est. −200 to −300)                                                                                                                   | ✅ PR #287                                                                                                                                                      |
| B4  | `contentLayout.test.ts` merge                                              | Low         | −32 (est. −150 to −250)                                                                                                                    | ✅ PR #289                                                                                                                                                      |
| B5  | `useCollectionEdit` fixture consolidation                                  | Low         | **−145 actual** (est. −350)                                                                                                                | ✅ PR #298                                                                                                                                                      |
| B6  | Fold in `CollectionContentRenderer` characterization                       | Low         | **0 actual** (est. −150)                                                                                                                   | ✅ PR #294 + #297 (restore)                                                                                                                                     |
| B7  | `useClickOutside` spy tests                                                | Low         | −37 (est. −90)                                                                                                                             | ✅ PR #286                                                                                                                                                      |
| B8  | Fill the required-coverage gaps                                            | Low         | +1,545 actual for the 3 slices shipped                                                                                                     | ◐ 8 of 9 — #266, #267, #295 (share+messages), #296 (collectionStorage); only the optional bullet is open                                                        |
| B9  | `useCollectionEdit.buffer.test.tsx` flakes under parallel load             | Low         | 0 repro in 22 runs across 3 worker configs                                                                                                 | ✅ CLOSED not-reproducible 2026-08-24 — NOT fixed; CI still untried                                                                                             |
| C1  | Unsaved people/gallery-access wipe (HIGH)                                  | Low         | +73 −11                                                                                                                                    | ✅ PR #264                                                                                                                                                      |
| C2  | About portrait aspect ratio                                                | Trivial     | +99 −5                                                                                                                                     | ✅ PR #281                                                                                                                                                      |
| C3  | `SelectsContext.toggle` purity                                             | Low         | +121 −10                                                                                                                                   | ✅ PR #282                                                                                                                                                      |
| C4  | Cache tags that never connect                                              | Low         | +155 −62                                                                                                                                   | ✅ PR #279                                                                                                                                                      |
| C5  | Assorted LOW bugs                                                          | Low         | +497 −101 (11 files)                                                                                                                       | ✅ PR #283                                                                                                                                                      |
| C6  | Password cover strip missing on the public card path                       | Low-medium  | est ±30 → **actual +60 −16 src (net +44) / +73 test**; much of src is the docblock correction                                              | ✅ PR #327 — premise was FALSE (backend never stripped); unification analysed and DECLINED                                                                      |
| C7  | `emailShareLink` POSTs to a route that does not exist                      | Low         | ±40 src, +30 test → **actual 0 src / +34 test**: FE was already complete, 409 included                                                     | ✅ PR #331 (+185 −101) — 403 + 409 tests added; "zero coverage" was wrong about 401; live click not run (no local DB); unification DECLINED                     |
| C9  | Dimensionless cover renders no header, missing cover does                  | Low         | ±20 src, +40 test                                                                                                                          | ☐ (found by B4; needs a decision first)                                                                                                                         |
| C8  | Unfollowing leaves the chip count stale                                    | Low         | +418 −22 (est. +40/+80)                                                                                                                    | ✅ PR #291                                                                                                                                                      |
| D1  | Gate `POST /api/revalidate` (HIGH)                                         | Low         | +175                                                                                                                                       | ✅ PR #265                                                                                                                                                      |
| D2  | Gate `clearCacheAction`                                                    | Low         | +212 (est. +15)                                                                                                                            | ✅ PR #266                                                                                                                                                      |
| D3  | Security headers                                                           | Low-medium  | +60 src, +0–40 test                                                                                                                        | ✅ PR #274                                                                                                                                                      |
| D4  | Pin the CloudFront host                                                    | Low         | ±1 (actual ±1)                                                                                                                             | ✅ PR #272                                                                                                                                                      |
| D5  | Proxy path reject + `/cdn` matcher removal                                 | Low         | ~+30 net (−27 src, +6 reject, +40–60 test)                                                                                                 | ✅ PR #273                                                                                                                                                      |
| D6  | Shared Origin allowlist (CSRF on `/api/revalidate`)                        | Low-medium  | +75 src, +230 test (est. ±60)                                                                                                              | ✅ PR #270                                                                                                                                                      |
| D7  | Wrong danger token on error text (a11y)                                    | Trivial     | 0 (rode #253)                                                                                                                              | ✅ via PR #253                                                                                                                                                  |
| D8  | Normalize `NEXT_PUBLIC_APP_URL` in the Origin allowlist                    | Trivial     | +30 src, +52 test (est. ±5 src, +2 test)                                                                                                   | ✅ PR #276                                                                                                                                                      |
| D9  | Decide: redundant localhost literals in the Origin allowlist               | Trivial     | −5 src, +20 docblock, +7 test                                                                                                              | ✅ PR #277 — deleted                                                                                                                                            |
| E1  | Parallax-card builder consolidation                                        | Medium      | +98 src, +659 test (est. −120)                                                                                                             | ✅ PR #269                                                                                                                                                      |
| E2  | `core.ts` fetch skeleton + `clientFetch`                                   | Medium      | **−115 src actual** (−57 bullets 1–2, −58 bullets 3–4); +6 tests (est. −180 src, +150–200 test)                                            | ✅ bullets 1–2 PR #333; bullets 3–4 PR #334 — CLOSED                                                                                                            |
| E3  | `collectionStorage.ts` generics                                            | Low         | **−12 src actual** (−46 code, +39 comment); +927 test via #296 (est. +50–150 net for both)                                                 | ✅ CLOSED 2026-08-28 — generics shipped in #306; the guards question was answered by #306 itself in `collectionStorage.ts:47-55` (keep them), 0 further code    |
| E4  | Entity-diff generics + one IMAGE guard                                     | Medium      | **+44 src / +177 test actual** for the twins half (est. −80)                                                                               | ✅ PR #311 — twins → `entityUtils.ts`; IMAGE-guard half STRUCK, guards are NOT duplicates                                                                       |
| E5  | Filter/sort/date duplication                                               | Low         | **0 src / +139 test actual** (est. −50 src)                                                                                                | ✅ PR #299 — COMPLETE. All 4 "open" bullets shipped in #299 itself (swept 08-28)                                                                                |
| E6  | `useCollectionEdit` refresh helpers                                        | Medium      | **`−90 src` is FALSE** — bullet 2 shipped at **+11 src, 0 test churn**; bullets 1/3 also ≈break-even (docblock costs what the dedup saves) | ◐ bullet 2 SHIPPED 2026-08-28; bullet 1 BLOCKED on user (fails the rejection test at 3-of-6 params); bullet 3 startable but sells as drift-protection, not size |
| E7  | Edit-grid handoff (was `useFilteredContentBlocks` hook)                    | Small       | **+22 src / +84 test actual** (est. was "+100–200 net (new hook suite)" — the hook is rejected)                                            | ◐ waste FIXED ✅ #337; hook REJECTED (9–11 params, 4 behavior switches); two smaller paths still open                                                           |
| E8  | Renderer + `MenuDropdown` dedup                                            | Medium      | est −120 src / +150–250 test → **actual −49 src / +90 test** (PR #319)                                                                     | ✅                                                                                                                                                              |
| E9  | Download icon/hook, auth-card SCSS, `.srOnly`                              | Low         | **+16 src / +393 test actual** (est. −100 src)                                                                                             | ◐ PR #300 — both COLD bullets shipped; srOnly ⛔ user call                                                                                                      |
| E10 | Admin panel dedup (`LoadError`, `.viewAll`, literals, comparator)          | Low         | **−79 src code-only / +176 test code-only** (est. −60 src)                                                                                 | ✅ CLOSED 2026-08-28 — PR #304 shipped 5 of 7, 1 was never a task, and the last (`--color-danger` hover) was DECIDED by the user as keep-as-is, 0 code          |
| E11 | Make cache-tag register/revalidate drift detectable                        | Low-medium  | +277 −28                                                                                                                                   | ✅ PR #280                                                                                                                                                      |
| E12 | Wire up `collections-location-${slug}`                                     | Low-medium  | **+72 src / +293 test actual** (est. +30 src)                                                                                              | ✅ PR #301; image-path trigger split out as E13                                                                                                                 |
| E13 | Trigger `collections-location-${slug}` from the image-metadata save path   | Low-medium  | **+36 src net / +165 test actual** (est. +30 src, +60 test)                                                                                | ✅ PR #313 — src estimate held; location-RENAME gap split out as E16                                                                                            |
| E14 | `createHeaderRow`'s `_chunkSize` is dead but receives a live value         | Low         | **−3 src / −4 test net actual**, 36 call sites (est. −2 src, ~40 sites)                                                                    | ✅ PR #307 — the one estimate on this board that held                                                                                                           |
| E15 | `createHeaderRow`'s two trailing boolean params → options object           | Low         | **+22 src net / 14 test call sites** (est. ±15 src, ~20 sites)                                                                             | ✅ PR #314 — stacked on #313; first call-site estimate to come in OVER                                                                                          |
| E16 | Revalidate the OLD slug when a location is RENAMED                         | Low-medium  | **+40 src / +281 test actual** across 2 slices (est. +30 src / +120 test)                                                                  | ✅ PR #316 (slice 1) + #317 (slice 2) — src held; test half 2.3x over                                                                                           |
| E17 | Collapse the inert `pageType` union to a boolean                           | Low         | est −15 src / ~0 test → **actual +3 src (−2 code, +5 comment) / +9 test** (PR #322)                                                        | ✅                                                                                                                                                              |
| F1  | Decompose `useCollectionEdit.tsx`                                          | Medium-high | ~neutral                                                                                                                                   | ☐                                                                                                                                                               |
| F2  | `RendererContext` for the BoxRenderer tree                                 | Medium      | est −100 src / +150–250 test → **actual −47 src / +142 test** (PR #321)                                                                    | ✅                                                                                                                                                              |
| F3  | File moves and renames                                                     | Medium      | `ReorderMove` **+7 src / 0 test**; `getUserPage` **+12 src / +2 test** (both est. ~neutral); other six unsized                             | ◐ `ReorderMove` ✅ #324 (F6 unblocked) · `getUserPage` ✅ #336 (`user.ts` deleted) · invite bullet COSTED and REJECTED 2026-08-27 · six bullets open            |
| F4  | `TaxonomyPage` ← `LocationPageClient`                                      | Medium      | −150                                                                                                                                       | ⛔ USER DECISION                                                                                                                                                |
| F5  | `FullScreenModal` link + resolver cleanup                                  | Low         | **−25 src / +20 test net actual** (est. −30 src, +60–120 test)                                                                             | ✅ PR #318 — src held; test came in UNDER, unlike E13/E16                                                                                                       |
| F6  | Fold `EditModeLayer` into `RendererContext` (shared set 16 → **4**, not 3) | Medium      | est −20 src / +40–60 test → **actual +53 src / +218 test** (PR #325 → #326)                                                                | ✅ via **#326** — #325 orphaned on a retired base; src missed in the WRONG DIRECTION                                                                            |
| F7  | Delete `onImageLoadError` from the render path (dead plumbing)             | Low         | est −15 src / −20 test → **actual −3 src / +8 test**; docblocks explaining a deletion cost lines                                           | ✅ PR #328 — completes 16 → 3; premise re-verified, estimate missed direction on BOTH halves                                                                    |
| G1  | Docs corrections                                                           | Trivial     | **+106 / −72 actual** (est. ±50)                                                                                                           | ✅ PR #303                                                                                                                                                      |
| G2  | Inline-comment enforcement + migration (decided: keep the rule)            | Low         | ~neutral (relocation + splits)                                                                                                             | ◐ wording PR #268; G2a COLD, G2b ⛔ scope call, G2c ⛔ rides refactors                                                                                          |
| G3  | `/user/selects` decision                                                   | —           | —                                                                                                                                          | ⛔ USER DECISION                                                                                                                                                |
| G4  | Docblock standard — length, structure, and no history                      | Low         | **−50 net actual across 19 blocks** (est. −300 to −500 across ~53); 0 src                                                                  | ◐ intersection pass done; swept 08-28: 49 hits but only ~26 real; #327/#328 line was STALE (#329 cleared it); +~17 uncounted board-label blocks                 |
| H1  | Merge `Following` into `Collections` on `/user`                            | Medium      | −60 src, ±150 test churn (6 test files)                                                                                                    | ☐ COLD — C8 shipped, so its stated blocker has cleared                                                                                                          |
| H2a | `/user` rail copy pass + chip-style the Admin links                        | Low         | **+319 / −117 actual** (est. −25 src)                                                                                                      | ✅ PR #302                                                                                                                                                      |
| H3  | `Send a message` into the rail as a plain button                           | Low         | rode H2a                                                                                                                                   | ✅ PR #302                                                                                                                                                      |

### State of the open items (re-stamped 2026-08-26)

Every open item is COLD or BLOCKED, and every BLOCKED one names its question and who answers it. An
item blocked on an unwritten question reads as available and then eats a session.

**The 2026-08-26 stamp claimed to cover every open item and did not — six were missing entirely
(A9, B8, E5, E10, F3, G4).** They were added below. ~~Only the two swept this session (B8, F3) carry
a verified state; the other four are marked UNSTAMPED rather than given a state nobody checked,
since a wrong COLD is exactly the thing this table exists to prevent.~~

**RESOLVED 2026-08-28 — the four UNSTAMPED items are now swept, and holding back the stamp was the
right call. Every one of them was wrong.** E5 was complete. E10 was 5-of-7 done with a sixth bullet
that was never a task. A9 was 2-of-3 done, including a deletion the board re-filed for five
sessions. G4's count held but half its scope was false positives and ~17 blocks of real work were
uncounted. **Had these been stamped COLD unverified in August, four sessions would have opened them
expecting work that was already finished.** UNSTAMPED is a useful state; use it rather than guessing,
and then actually sweep it.

**The general lesson, now the FIFTH occurrence of shipped-but-unticked (B8, then E5, E10, A9 all in
one pass): the board is least accurate about the items it has most recently shipped against.** E5
and E10 both credit the exact PR that silently finished their open bullets. See the
`git show --stat` rule in "how to use this doc".

| Item   | State              | If blocked: the question, and who answers it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **E6** | PARTLY SHIPPED     | —— bullet 2 (`adoptSaveResponse`) SHIPPED 2026-08-28, hook-local at `useCollectionEdit.tsx:740`. Test churn was **0**, not ±20 — both budgets on this item were over-estimates. File GREW 1748 → 1759. **All refs below `:740` in this item drifted; the item carries a re-derived list.** Bullet 1 stays BLOCKED on the user and was costed: the shared signature needs 3-of-6 behavior-switching params, so it fails the rejection test. Bullet 3 is unblocked but ≈break-even on size; its value is drift-protection. Dead `_deletedIds` (`:1060`, type at `:285`) is the cheapest thing left |
| **E7** | COLD               | —— the waste shipped as a handoff guard 2026-08-27 (#337); the hook is REJECTED with measurement. Two smaller wasted paths left open in the item (`EditModeLayer.tsx:280` reorder path, and a third `processContentBlocks` caller at `useCollectionEdit.tsx:556`)                                                                                                                                                                                                                                                                                                                                |
| **B8** | COLD               | —— verified 2026-08-27: 8 of 9 shipped; the one open bullet (`sharedObserver`/`useParallax`/`useContentReordering`) is explicitly optional                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **F3** | COLD               | —— `getUserPage` shipped 2026-08-27 (#336), `user.ts` deleted. The invite bullet is COSTED and REJECTED — do not re-open it as a 3-function move; the note names the 2-function alternative. Six bullets open, refs swept 2026-08-27                                                                                                                                                                                                                                                                                                                                                             |
| **A9** | COLD               | —— swept 2026-08-28. 2 of 3 bullets were ALREADY DONE (worktrees cleared; `layoutpreview` deleted by the user outside git after 5 sessions of re-filing). The one open bullet is a factual correction to `CLAUDE.md:22` — `npm`/`npx`/`node` all resolve, `npm --version` is 11.8.0. Allowlist count was 7, is 6                                                                                                                                                                                                                                                                                 |
| **G4** | COLD               | —— swept 2026-08-28. Count reproduces (49 vs ~48) and its method is recoverable, but ~23 are false positives so the history sweep is ~26 real and must be read block-by-block, not regexed. Row's "#327/#328 added to the pile" was stale. NEW: ~17 uncounted board-label blocks (13 docblocks + 6 inline)                                                                                                                                                                                                                                                                                       |
| **F1** | COLD               | —— largest open item; no unanswered question, just size                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **H1** | BLOCKED — **user** | Does the merged `Collections` count include follows (12 + 2 = 14), and does a followed-but-not-owned tile get a visual marker? Also: accept a 500-row catalog fetch on every `/user` load, or ask the backend to return followed collections on the user-page read?                                                                                                                                                                                                                                                                                                                              |
| **C9** | BLOCKED — **user** | Should a cover with no `imageWidth`/`imageHeight` fall back to the text-only header, or is rendering nothing deliberate?                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **F4** | BLOCKED — **user** | Stated in the item                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **G3** | BLOCKED — **user** | Delete `/user/selects` or rebuild it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **E9** | BLOCKED — **user** | `.srOnly` bullet only; both COLD bullets shipped in #300                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **G2** | BLOCKED — **user** | G2b is a scope call; G2c rides other refactors. G2a is COLD                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

**Six of the eleven are blocked on the same person, and none of the six is blocked on work.** That
is the board's real bottleneck, not any individual item — a single sitting answering H1, C9, F4, G3,
E3's guards and E9's `.srOnly` would unblock more than any refactor on the list. Worth putting to
the user as one batch rather than surfacing them one item at a time as each becomes "next".

Groups A and B together are ~5,000 lines removed at near-zero regression risk.

**Shipped write-ups are not on this page.** Groups A, C and D are closed and their sections live
in [`2026-summer-refactor/`](2026-summer-refactor/), one file per group, plus the session log.
A row here with a PR number is the whole live record of that item; the archive has the detail.

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

   Applied forward to the un-started consolidations, whose current estimates count only the first:
   **E8** (−120 src, +0–50 test) — the `+0–50` assumes the extracted renderer/`MenuDropdown` unit
   needs almost no new coverage; on this scorecard read it as +150–250. **F2** (−100) and **F5**
   (−30) carry no test figure at all; both extract a unit and so both need one. E2 (−180 src,
   +150–200 test) and E7 (+100–200 net, "new hook suite") already price it and are the two to copy.

2. **Group B estimates over-count preamble.** The existing note below says the estimates counted
   repeated _text_ and assumed repetition meant redundancy. That is one failure mode. B5 found the
   opposite one: the board counted whole preambles at 122–169 lines each (886 total) when only 460 of
   those lines were duplicated builders — the rest is per-file imports, `jest.mock` blocks and
   `jest.MockedFunction` casts that legitimately stay per-file. Count the duplicated _construct_, not
   the block it sits in.

**Estimates recalibrated 2026-08-22 to count test coupling** (the original source-only numbers were
wrong 4-for-4: D2 +15→+212, E1 −120→+757 total, A4 and A6 the same way). Where a range appears, the
top end assumes the repo's prove-it-fails discipline, which is not optional.

**Board maintenance (recommendation, 2026-08-22).** Three drift classes recurred within 48 hours:
sections without board rows (E10, D7), items filed under the wrong group heading (D6, then D7
again), and rows whose status contradicts their section (A1 vs G3, A9 ✅ with two open bullets).
Every stale line traced to fallout from a previously shipped item — the board decays fastest
exactly where work lands. Keep the board, but stop maintaining status in two places by hand:
(1) rule — a new finding gets its board row and its section in the SAME edit, under the right
heading; (2) optional — a ~40-line script that regenerates this table from the `### <status> <id> ·`
headings, run after each edit. The bigger call is the user's: this file is still gitignored; track
it (or move it to a tracked `docs/cleanup/`) so its decisions survive the machine.

---

## Group A — Pure deletions — ✅ CLOSED

All nine items merged (#255–#263). Full write-ups: [group-a-deletions.md](2026-summer-refactor/group-a-deletions.md).
Three bullets under A9 never shipped and stay here.

### ◐ A9 · Dead config — PR #259 — swept 2026-08-28: TWO of the three are done, ONE is open

_Shipped bullets are in the [archive](2026-summer-refactor/group-a-deletions.md). ~~These three are
open.~~_ **Swept for the first time on 2026-08-28. Two of the three describe states that no longer
exist — including the `layoutpreview` delete this board carried for FIVE sessions and repeatedly
re-attempted. The user cleared it outside git. Nobody checked; the board just kept re-filing it.**
That is the cost of an item stamped UNSTAMPED: not a wrong line number, five sessions of re-deriving
a dead task.

- [ ] `.claude/agents/` — NOT done, and the premise looks wrong: `npm`, `npx`, and `node` all resolve
      on PATH (`/opt/homebrew/bin`). Re-confirmed 2026-08-22 from the review session's shell — same
      result, so the "npm is not on PATH" line in CLAUDE.md may itself be stale. ~~Re-diagnose against
      an actual agent run before editing 7 allowlists.~~
      **RE-CONFIRMED A THIRD TIME 2026-08-28, and the diagnosis is now settled — the CLAUDE.md line
      is simply WRONG.** `which npm npx node` returns all three under `/opt/homebrew/bin`, and
      `npm --version` prints **11.8.0**. The stale claim is live at
      [CLAUDE.md:22](CLAUDE.md:22): "`npm` and `npx` are not on PATH."
      **So the work is not the allowlists — it is deleting that CLAUDE.md paragraph.** The
      allowlists already use plain `npm`/`npx`, which work; nothing there is broken.
      **Count corrected: "7 allowlists" is wrong.** Ten `.claude/agents/*.md` files carry a `tools:`
      block, and only **6** carry `Bash(npm…)`/`Bash(npx…)` entries — `code-reviewer.md:14-15`,
      `debugger.md:11-13`, `implementer.md:12-13`, `linter-fixer.md:12-14`,
      `refactor-rename.md:11-12`, `test-writer.md:11`. The seventh `grep -l` hit was
      `.claude/agents/README.md`, which is documentation, not an allowlist.
      **Cost of the stale line, measured:** every command in this session ran as
      `/opt/homebrew/bin/node node_modules/.bin/jest` because CLAUDE.md says to. That works, so
      nothing ever failed loudly enough to prompt a re-check. **A false instruction that still
      produces working commands is invisible indefinitely** — which is why this sat through three
      confirmations without anyone editing the line.
- [x] ~~`.claude/worktrees/` still holds the 6 orphaned `agent-*` directories (Mar 16, unregistered —
      re-checked 2026-08-22). Check each for uncommitted work before deleting — that is the only
      reason they were left in place. The `cleanup` worktree was removed by the review session (its
      D6 branch merged, tree clean).~~ **DONE — verified 2026-08-28.** `ls -a .claude/worktrees/`
      shows an empty directory (mtime Aug 24, i.e. cleared after the 08-22 re-check), and
      `git worktree list` returns exactly one entry: the main checkout. Zero orphans.
- [x] **DONE — the directory is GONE. Verified 2026-08-28: `ls "app/(admin)/admin/layoutpreview/"`
      returns "No such file or directory" and `find app -iname "*layoutpreview*"` returns nothing.**
      The user cleared it outside git (it was never tracked —
      `git log --all -- "app/(admin)/admin/layoutpreview"` is empty), and `git grep` across every
      remote branch finds `layoutpreview` only in this board file. Nothing is live anywhere.
      **This bullet was carried for five sessions and re-attempted at least twice.** The board's own
      advice — "stop re-attempting the delete, put the command in the handoff prompt" — was right,
      worked, and then nobody checked whether it had worked. **The lesson is not about permissions:
      an item that hands work to the USER needs a verification step on the next run, or it becomes
      immortal.** Stamp such bullets with what to check, not just what to ask for.
      **One live consequence remains and it is NOT this bullet:** `.next-verify/dev/types/validator.ts`
      still holds a generated type pointing at the deleted `layoutpreview/page.tsx`, which is the
      single `tsc --noEmit` error this board has called "expected noise" for three sessions. The
      page is gone, so the error is now purely a stale build artifact. `.next-verify/` is gitignored
      (`.gitignore:123`) and regenerable; `rm -rf .next-verify` clears it. Left for the user — it is
      their local build cache, not repo state.
      _Original text follows._
      ~~`app/(admin)/admin/layoutpreview/` — the untracked screenshot harness for PR #253's
      four-panel question. Read and confirmed purposeless 2026-08-23: its own first line says
      "TEMPORARY … Delete this directory when the screenshots are captured", and #253 merged at
      79fbca5. Carried forward from the 08-23 log entry's "delete on sight", which did not stick
      because it was a log line and not a tracked bullet — now it is one. **The D4 session's
      `rm -rf` was denied by the permission gate, so this is a user action, not an agent one.**
      Deleting it also removes the 3 comment lines G2's `.tsx` baseline has to exclude by hand.
      **Re-attempted and re-denied 2026-08-24 — this is now confirmed reproducible, not a one-off
      of the D4 session.** The permission gate denies `rm -rf` on this path even with bypass
      permissions active, so no agent session can clear it. Fifth session carrying it. Stop
      re-attempting the delete; put the command in the handoff prompt instead and let the user run
      it. Re-read before deleting if you want: it is one file, `page.tsx`, whose first line still
      reads "TEMPORARY — screenshot harness for the PR #253 four-panel layout question.~~

~~```bash
rm -rf "app/(admin)/admin/layoutpreview"

````~~

**A9 is now one bullet, and it is not a deletion — it is a one-paragraph correction to
[CLAUDE.md:22](CLAUDE.md:22).** The item is a third of its recorded size.

---

## Group B — Test-suite reductions

The suite is 51,446 lines against 37,211 source lines. Hygiene is otherwise excellent: zero skips,
zero `.only`, zero snapshots, zero stale TODOs.

**B5, B6 and B9 also shipped — write-ups in [group-b-tests.md](2026-summer-refactor/group-b-tests.md). Only B8 remains open, below.**

**B1, B2, B3, B4 and B7 shipped 2026-08-24** (#290, #288, #287, #289, #286) — five in one sitting,
run as parallel agents in separate worktrees. Write-ups:
[group-b-tests.md](2026-summer-refactor/group-b-tests.md).

**Correction — "no tautologies" was wrong.** B2 found two cases in
`rowCombination.characterization.test.ts` that hand-build a tree with `hPair`/`vStack` and then
assert the tree they just built, with no production path under test. Dropped as dead weight rather
than as duplicates.

**Read this before sizing B5, B6 or B8.** Every estimate in this group came in short, in the same
direction, for the same reason: it counted repeated _text_ and assumed repetition meant redundancy.
−450 → −209, −250 → −229, −200/−300 → −125, −150/−250 → −32, −90 → −37. B4 is the extreme, off by
roughly an order of magnitude, because its "duplicate" describes turned out complementary — so the
work was merging, not deleting. Two items moved the opposite way from subtraction entirely: B3's
test count went **up** (106 → 107) and B7 gained a behavioural test. **Re-estimate the three
remaining items as merges, not deletions.**

### ◐ B8 · Fill the required-coverage gaps — 8 of 9 shipped (#266, #267, #295, #296); only the optional bullet is open

The project rule requires tests for these and they have none.

- [x] **First slice — the A7 Escape-path regression test — PR #267.**
      `tests/components/ContentCollection/useCollectionEdit.escapeSelection.test.tsx`, 4 tests,
      test-only. The effect is now at `useCollectionEdit.tsx:433-437` (drifted +1 when C1 landed, then +1 again by 2026-08-24).
      Verified against two separate mutations, not one: deleting the effect fails the two
      Escape-teardown tests, and dropping its `!isMultiSelectMode` guard fails the multi-select
      preservation test. The reasoning is out of the scratchpad and into the repo.

      **Test-design trap, cost one rewrite.** The multi-select preservation test must open the
      editor through the bottom bar's `edit` cell, NOT through `handleImageClick`. In multi-select
      mode a click only toggles the id and never opens the editor, so `editingContent` stays null,
      `useEscapeKey` (enabled on `!!editingContent`) never attaches, and the effect never re-runs.
      The first draft did exactly that and passed against BOTH mutants — a decoration. Note also
      that `handleBulkEdit` is not on the hook's public API (`:1617` is a deps array, not the
      return), so the bottom bar cell is the only route to it.

- [x] `lib/api/share.ts` — 9 function exports + 4 type exports. **Shipped in PR #295**
      (`tests/lib/api/share.test.ts`, 520 lines, covering all nine function exports; the four type
      exports are exercised through the values those functions return). Est +350–500, actual +520 —
      in range, at the top of it.
      **This checkbox was stale, and so were the two below it.** #295 and #296 are named in this
      item's own heading, and `share.test.ts`'s docblock opens "B8 coverage gap — `share.ts` had
      none". The work shipped 2026-08-24; nobody ticked the boxes, so the board advertised three
      finished slices as available for three days.
      **Corrected 2026-08-27: `share.ts` is 161 lines, not 217.** E2's `clientFetch` conversion
      (#333) cut 26% of it. The export counts in the original claim are still exactly right — only
      the line count rotted, and it rotted because a later item shipped against the same file.
- [x] `lib/api/messages.ts` — 25 lines. **Shipped in PR #295** (`tests/lib/api/messages.test.ts`,
      98 lines). Est +80–150, actual +98 — in range.
- [x] `lib/storage/collectionStorage.ts` — **shipped in PR #296**, and the sequencing worked as
      written: these landed before E3's rewrite and served as its characterization net.
      `collectionStorage.test.ts` (806) + `collectionStorage.ssr.test.ts` (121) = **+927 against an
      estimate of +250–400 — 2.3–3.7x over**, the same test-side blowout this board has now recorded
      four times. **Corrected 2026-08-27: the file is 274 lines, not 286** — E3 (#306) cut it after
      this bullet was written.
- [x] `lib/actions/clearCache.ts` — shipped with D2, PR #266. `tests/lib/actions/clearCache.test.ts`.
- [ ] If being thorough: `sharedObserver` (116), `useParallax` (161), `useContentReordering` (197,
      **was `198`; corrected 2026-08-27**). **Re-verified 2026-08-27: all three are still untested** —
      no `tests/utils/sharedObserver.test.ts`, no `tests/hooks/useParallax.test.ts`, and no suite for
      `useContentReordering`. This is now the ONLY open B8 bullet, and it is explicitly optional.
      Est +400–600. `collectionToggle` came OFF this list 2026-08-22: `collectionEditUtils.ts:30`
      (**was `:28`; corrected 2026-08-25**) re-exports `toggleRelation`. **The second half of this
      line is DEAD: `manageUtils.test.ts` no longer exists** — B1 (#290) merged it away, which is
      the very move this bullet said to wait for. The retarget already happened; coverage now lives
      in `tests/components/ContentCollection/edit/collectionEditUtils.test.ts`. Nothing to do here.

---

## Group C — Bug fixes — C1–C8 shipped; C9 open

C1–C6 merged (#264, #281, #282, #279, #283, #327). Full write-ups:
[group-c-bugs.md](2026-summer-refactor/group-c-bugs.md). C4's `collections-location-${slug}` report became E12.

### ☐ C9 · A dimensionless cover renders no header; a missing cover renders one

Found by B4 (#289) while merging the duplicated `createHeaderRow` describes. Both test copies
encoded it correctly, so it is behaviour as written rather than a regression — but the two paths
disagree in a way that reads more like an oversight than a decision, and nothing had recorded it.

- [ ] `coverImage` absent (`undefined` **or** `null`) → `createTextOnlyHeaderRow`, which returns a
      one-item TEXT row when metadata exists. A collection with a description and no cover renders
      a header.
- [ ] `coverImage` present but missing `imageWidth`/`imageHeight` → `null` unconditionally, metadata
      ignored. The same collection with a broken cover renders nothing.
- [ ] **The decision is the user's:** should a dimensionless cover fall back to the text-only
      header, or is rendering nothing deliberate? Falling back is the smaller change and makes the
      paths agree. Rendering nothing may be intentional if a cover that failed to measure signals a
      broken collection worth hiding — but nothing says so.
- [ ] Whichever way it goes, pin it. Neither path has a test asserting the _contrast_, so a future
      refactor can flip one without failing anything.

Est ±20 src, +40 test. It needs an answer before it needs code.

**Premise re-verified 2026-08-24 after E15 changed `createHeaderRow`'s signature.** E15 converted
the trailing booleans to an options object and touched nothing else: the `!collection.coverImage →
createTextOnlyHeaderRow` branch and the `!coverBlock.imageWidth || !coverBlock.imageHeight → null`
branch are byte-identical. Both bullets above still describe the code. The ~20 call sites E15
rewrote are all in the test file, so C9's estimate is unaffected — but any C9 test written now must
use the new `{ isMobile, forceRail }` call shape.

---

## Group D — Security — ✅ CLOSED

All nine items merged (#265, #266, #274, #272, #273, #270, #253, #276, #277). Full write-ups:
[group-d-security.md](2026-summer-refactor/group-d-security.md). D7's one residual bullet moved to E10.

---

## Group E — Consolidations

Behavior-preserving refactors. Lean on the existing tests.

E1, E2, E3, E4, E5, E8, E10, E11 and E12–E17 have all shipped — full write-ups in
[group-e-consolidations.md](2026-summer-refactor/group-e-consolidations.md). **Only E6, E7 and E9
remain open, below.** E11 matters to B1; B1 carries what it needs inline.

### ◐ E6 · `useCollectionEdit` refresh helpers — bullet 2 SHIPPED 2026-08-28; bullets 1 and 3 COSTED, both blocked

**Bullet 2 is done and the guardrail held — bullets 1 and 3 were costed, not touched.** Both costs
are recorded under their own bullets below. Neither is a mechanical lift, and bullet 1 still needs a
user decision before anyone can start it.

**Where each open bullet now stands:**

- **Bullet 1 (three refresh copies) — BLOCKED on the user, cost measured.** The shared signature
  needs `revalidateMetadata: boolean` (the gif path omits it), `failLoudly: boolean` (only
  `handleDeleteSuccess` calls `setError`/`logger.warn`), and either an `adoptFirst: boolean` or a
  `transform` callback (`handleMetadataSaveSuccess` adopts LAST through `mergeNewMetadata` and calls
  `updateImagesInCache`). That is three or four of roughly six parameters existing purely to switch
  behavior between callers — **it fails the rejection test on its own terms**, which is what the
  item predicted. The only version that passes is the narrow one: extend
  `refreshCollectionAfterOperation` (`collectionEditUtils.ts:338`) to fold in `revalidateCache`, and
  leave the adopt-ordering and the error handling at the three call sites. That narrow version saves
  roughly 6–9 lines across three sites and still changes behavior on the gif path, so **it does not
  clear the user-decision gate either.** Recommend leaving bullet 1 for F1, which has to touch these
  three functions anyway.
- **Bullet 3 (shared diff builder) — NOT blocked, but costs more than it saves.** Extracting
  `buildRemoveFromCollectionDiffs` from `handleBulkRemove:1107-1116` (**was `:1090-1099`** — bullet 2
  shifted it +17) and `useMetadataSubmit.ts:216-225` (unchanged, different file) removes about 10
  duplicated lines and adds a helper plus its
  docblock — the same roughly-break-even shape bullet 2 turned out to have, and it lands the helper
  in a third file. Its real value is not line count, it is that the two copies can drift; nothing
  currently pins them to each other. **Startable any time, no user decision needed**, but it should
  be sold as drift-protection, not as a size win. Do not unify the handlers or the confirm strings
  (`useCollectionEdit.bulkRemove.test.tsx:180-184` pins the wording).
> **NEXT RUN, picked 2026-08-28 — three MRs, in this order.** All three are COLD; the run
> deliberately avoids the seven user-blocked items.
>
> 1. **E6 `_deletedIds` removal.** Cheapest fully-specified change on the board. It touches the
>    public `UseCollectionEditResult` type, so it wants its own reviewable diff rather than riding
>    along with 2. _Guardrail: remove only `_deletedIds`. Leave the rest of the interface alone —
>    it is 60+ members and "while we're here" would bury the one real change._
> 2. **E6 bullet 3 — `buildRemoveFromCollectionDiffs`.** Same file as 1, so **re-derive its refs
>    after 1 lands**; `handleBulkRemove` is at `:1091` today. _Guardrail: share the `map` body only.
>    Do NOT unify the two handlers and do NOT touch the confirm strings —
>    `useCollectionEdit.bulkRemove.test.tsx:180-184` pins the wording._
> 3. **F3's three `logger.warn('manageUtils', …)` labels in `collectionEditUtils.ts`.** Different
>    file, trivial, no decision. Sequence it after 2 because bullet 3's shared helper may land in
>    that same file. _Guardrail: fix the labels only. Do not re-open F3's invite bullet — it is
>    COSTED and REJECTED._
>
> Sized at three because that is what the log says a session here actually lands, and because
> stopping after 1 or 2 still leaves merged work rather than a half-finished branch.

- **The dead `_deletedIds` parameter is still open and is now the cheapest thing on this item.**
  Untouched by bullet 2. `useCollectionEdit.tsx:1060` (**was `:1043`**, +17) still takes
  `async (_deletedIds: number[])` and never reads it, still fed by `:1119` (**was `:1102`**)
  computing `imageSubset.map(img => img.id)`. It is still on the public `UseCollectionEditResult`
  type at `:285` — **that ref did NOT drift**, the interface sits above bullet 2's insertion point.

> **Ref drift from bullet 2, applies to the whole E6 section below.** `adoptSaveResponse` added 11
> net lines at `:740`. The shift is **not uniform** — the 27-line helper inserts before
> `handleUpdate`, then each of the two call-site collapses removes 8 more lines further down, so a
> ref moves +23, +17 or +11 depending on which of the three edits it sits below. Every ref above
> `:740` is unchanged. **Do not apply a single offset; use these re-derived values.**
> `handleUpdate:730` → **`:753`**, `handleMetadataSaveSuccess:990` → **`:1007`**,
> `handleGifSaveSuccess:1021` → **`:1038`**, `handleDeleteSuccess:1042` → **`:1059`**,
> `handleBulkRemove:1074` → **`:1091`**, `enterReorder:1395` → **`:1412`**. File is **1759** lines,
> not 1748. The prose further down this item still carries the pre-bullet-2 numbers; trust this list.

#### The original filing — bullet 2's rationale, kept for history

**Bullet 2 only — extract `adoptSaveResponse`.** Three reasons, and the third is the one
that decided it.

It is the only bullet on this item with **no behavior question attached**. `handleUpdate:745-751`
and `enterReorder:1425-1431` are the same seven lines in the same order; the lift is mechanical and
its correctness is checkable by reading. Bullets 1 and 3 are not like that — see below.

Its refs are as fresh as they get. `git diff --name-only d784bc5..fed67e8 --
app/components/ContentCollection/edit/` returns nothing, so nothing in this file moved under #336 or
#337, and all six function refs were re-confirmed on `main` at `fed67e8` on 2026-08-28.

And **the two things that made E6 look risky are both gone.** The ±100 test-churn budget rested on a
call-order assertion that does not exist, and this session's sweep of the four UNSTAMPED items
means E6 is now the largest COLD item with no user question in front of it. F1 is bigger but is
pure size; E6 bullet 2 is small, verified, and shrinks the file F1 will later split.

**Guardrail — do bullet 2 ONLY. Leave bullets 1 and 3 alone and report what changing them would
cost.** They are the adjacent tempting changes and both look like the same kind of lift:

- **Bullet 1 (the three refresh copies) is not a refactor, it is a behavior change.** The three
  differ on four axes — `handleMetadataSaveSuccess:990` adopts LAST through `mergeNewMetadata` and
  calls `updateImagesInCache`; `handleGifSaveSuccess:1021` adopts FIRST and **omits
  `revalidateMetadataCache` entirely**; `handleDeleteSuccess:1042` adopts first, keeps it, and is
  the only one that fails loudly. Consolidating means either 3–4 options params or deciding that the
  gif path starts firing `revalidateMetadataCache`. **That decision is the user's.** Also: extend
  `refreshCollectionAfterOperation` (`collectionEditUtils.ts:338`, already used at three of the six
  sites) rather than writing a new helper.
- **Bullet 3 should narrow to the diff builder before anyone touches it.** `handleBulkRemove:1090-1099`
  and `useMetadataSubmit.ts:216-225` share a near-identical `map` body, but the handlers around it
  differ and the confirm wording is pinned by `useCollectionEdit.bulkRemove.test.tsx:180-184`.
  Share `buildRemoveFromCollectionDiffs`; do NOT unify the handlers or the strings.

**Apply the rejection test to both before proposing either** — write the shared signature first, and
if a third of its parameters exist only to switch behavior between callers, they are not duplicates.
That test has now killed two items in two days (F3's `invites.ts`, E7's hook), and bullet 1 is the
next candidate to fail it.

**Also in scope if the pass is quick: the dead `_deletedIds` parameter** at
`useCollectionEdit.tsx:1043`, never read, fed by `handleBulkRemove:1102` computing
`imageSubset.map(img => img.id)` purely to satisfy it. It is on the public `UseCollectionEditResult`
type at `:285`, so removing it changes callers — which is why it belongs to E6 rather than to a
drive-by.

- [ ] Three copies of "refetch → adopt → storage-write → revalidate → clear selection" (`handleMetadataSaveSuccess`, `handleGifSaveSuccess`, `handleDeleteSuccess`) → one `refreshAfterContentMutation`.
- [x] ~~`handleUpdate` and `enterReorder` duplicate the save-adoption block → `adoptSaveResponse`.~~
      **SHIPPED 2026-08-28 — PR #339, MERGED (`4ac6026`), +11 src / 0 test.** `adoptSaveResponse` is a
      `useCallback` at `useCollectionEdit.tsx:740`, called at `:768` (`handleUpdate`) and `:1442`
      (`enterReorder`). Hook-local, not a `collectionEditUtils` export — the block mutates
      `seededCollectionIdRef`/`seededFromAdminRef` and calls `setCurrentState`/`setUpdateData`, so a
      module-level helper would have taken five injected params to move seven lines and would have
      failed the rejection test.
      **Test churn was ZERO, not ±20.** All six suites pass untouched (122 tests), full suite
      245/245, 4454 tests. No test file was edited. The ±20 budget was still an over-estimate after
      the ±100 one was corrected.
      **The file GREW by 11 lines (1748 → 1759), it did not shrink.** The dedup saves 16 lines and
      the helper costs 27, of which 9 are the docblock the project's no-inline-comments rule
      requires. Anyone costing the remaining E6 bullets by "lines removed" should assume the same
      shape: each extraction here trades duplicated code for a documented helper and roughly breaks
      even. The `−90 src` figure on the MR-board row is not achievable from bullets 1 and 3 either.
- [ ] `handleBulkRemove` duplicates `useMetadataSubmit.handleRemoveFromCollection` → shared builder.
- [ ] Sequencing (added 2026-08-22): E6 is a slice of F1's decomposition — do E6 first or fold it
      into F1, not both independently. ~~And `useCollectionEdit.handlers.test.tsx` asserts on
      `collectionStorage.update`/`updateFull` CALL ORDER — a consolidated helper that reorders those
      calls moves assertions (budget ±100 test churn across the six suites).~~

**VERIFIED 2026-08-27 against `main` at `d784bc5`, nothing changed. The call-order claim is FALSE
and the churn budget with it.** `useCollectionEdit.handlers.test.tsx` (908 lines) contains **zero**
call-order assertions on `collectionStorage.update`/`updateFull`. Its only two `collectionStorage`
assertions are `:124-125`, both order-independent `toHaveBeenCalledWith`. The single
`invocationCallOrder` assertion in any of the six suites is in a DIFFERENT file
(`useCollectionEdit.test.tsx:283-285`) on DIFFERENT mocks — it pins `reorderCollectionContent`
before `updateCollection`, the failure-safety ordering documented at `useCollectionEdit.tsx:1412`
and `:1420`, and it sits BEFORE the adoption block, so extracting `adoptSaveResponse` cannot touch
it. **There is nothing to reorder. Budget ±20, not ±100** — the six suites hold ~122 tests total, so
±100 would have meant rewriting 80% of them, which should have been the tell.

**The item also missed that the helper already exists.** `refreshCollectionAfterOperation` is at
`collectionEditUtils.ts:338` (`operation() → refetch → storage.update → storage.updateFull`), used
at `useCollectionEdit.tsx:871`, `:922` and `useCaptureDateSelection.ts:61`. **The family is six
sites, three using it and three not.** Reframe bullet 1 as "extend the existing helper to cover
revalidate + clear-selection", not "write a new one".

**And the three "copies" are not copies — consolidating them is a BEHAVIOR change, not a
refactor.** `handleMetadataSaveSuccess:990-1019` adopts LAST through `mergeNewMetadata` and calls
`updateImagesInCache`; `handleGifSaveSuccess:1021-1040` adopts FIRST and **omits
`revalidateMetadataCache` entirely**; `handleDeleteSuccess:1042-1072` adopts first, keeps
`revalidateMetadataCache`, and is the only one that fails LOUDLY (`setError` + `logger.warn`) where
the other two return silently. Four axes of variation. One helper serves all three only with 3–4
options params, or by accepting that the gif path starts firing `revalidateMetadataCache` and that
adopt-ordering is normalized. **Both are decisions for the user, not mechanics** — flag them before
starting rather than discovering them mid-PR.

**Bullet 2 is the clean one and is unaffected by any of the above.** `handleUpdate:745-751` and
`enterReorder:1425-1431` are the same seven lines in the same order. `adoptSaveResponse` is a
straight lift with no behavior question. **If E6 is picked and time is short, do this bullet alone.**

**Refs RE-CONFIRMED on `main` at `fed67e8` (2026-08-28), zero drift.** `git diff --name-only
d784bc5..fed67e8 -- app/components/ContentCollection/edit/` returns nothing — neither #336 nor #337
touched this directory, so every line number above still lands on its named function:
`handleUpdate:730`, `handleMetadataSaveSuccess:990`, `handleGifSaveSuccess:1021`,
`handleDeleteSuccess:1042`, `handleBulkRemove:1074`, `enterReorder:1395`. File is 1748 lines.
**This item is fully specified and needs no discovery pass before it starts.**

**Bullet 3 should narrow to the diff builder only.** `handleBulkRemove:1090-1099` and
`useMetadataSubmit.ts:216-225` share a near-identical `map` body (same `filter` + same
`buildImageUpdateDiff`), but everything around it differs — `useMetadataSubmit` wraps in `runSave`
and closes the modal, `handleBulkRemove` manages its own loading/error and calls
`handleDeleteSuccess`. Share `buildRemoveFromCollectionDiffs`; keep the handlers separate. **Do not
unify the confirm strings** — `useCollectionEdit.bulkRemove.test.tsx:180-184` pins the wording.

**Dead parameter found, not fixed here.** `useCollectionEdit.tsx:1043` takes
`async (_deletedIds: number[])` and never reads it; `handleBulkRemove:1102` computes
`imageSubset.map(img => img.id)` purely to feed it. Both sides can drop it, but it is on the public
`UseCollectionEditResult` type at `:285`, so callers change — that makes it E6's business rather
than a drive-by.

**F1 boundary note.** F1's slices (`docs/spikes/2026-summer-refactor.md:1990`) put the three refresh
copies and `handleBulkRemove` inside content-ops `:857-1211`, and `handleUpdate:730-797` inside
update-form `:439-797`. `enterReorder:1395-1449` **straddles** F1's relations/manage-bar boundary at
`:1397`, so F1's boundary is already slightly off there. `adoptSaveResponse` is the one E6 bullet
spanning two F1 slices. The file is **1748 lines**, not the 1,747 F1 records.

### ◐ E7 · Edit-grid handoff — the waste is FIXED (#337); the hook is REJECTED

**The item was half right, and its prescription did not follow from its own evidence.** Verified
against `main` at `d784bc5`. The double run is real. But only the process → sort half is wasted, and
the fix for it is a four-line guard, not a shared hook.

**SHIPPED 2026-08-27 — PR #337.** `CollectionPageClient.tsx`'s `contentBlocks` memo now
short-circuits once `editLayerMounted` is true. Src `+22/−0`, test `+87/−3` (3 new specs), measured
with `git diff --cached --numstat` per group rather than quoted from memory.

**Suite/test counts. `main` at `fed67e8` (both #336 and #337 merged) is 245 suites / 4454 tests —
quote nothing older.** This number moved THREE TIMES inside one day's work, every move legitimate:

| When                  | Reading        | What moved it                             |
| --------------------- | -------------- | ----------------------------------------- |
| #324 close-out, 08-24 | 245 / 4399     | stamped "quote from here on"              |
| #336 branch, 08-27    | 246 / 4451     | E2 merges (#332/#333/#334) added 52 tests |
| #337 branch, 08-27    | 246 / 4454     | this item's 3 new specs                   |
| `main` now, 08-28     | **245 / 4454** | #336 deleted `tests/lib/api/user.test.ts` |

**Every one of those was correct when taken, and three of them are wrong now.** That is the whole
argument for the re-measure rule: a baseline is a measurement with a timestamp, not a fact about the
repo. The 246 readings were taken while #336 was open, so they counted a suite main no longer has.
**Re-measure by stashing the tree and running the suite; never quote a recorded number.**

**What was actually being wasted.** `contentBlocks` is defined at `CollectionPageClient.tsx:407`,
read at exactly one place (`content={contentBlocks}`, `:509`, inside `grid`), and `grid` renders
only under `{!editLayerMounted && grid}` at `:536`. So after the edit layer mounts, every filter
change ran a full `processContentBlocks` + `applySort` pass whose result nothing rendered.
**Confirmed by `grep -n "contentBlocks\|editLayerMounted\|const grid"`, which returns those four
lines and nothing else.** `EditModeLayer` is a child (`:537`), gets `filterState` as a prop, and is
created by `dynamic()` with no `React.memo` — so memoization never prevented the double run.

**The hook is rejected, and the reason is the same one that killed F3's `invites.ts`: the shared
thing is not shared.** The two sites' filter blocks are character-identical
(`CollectionPageClient.tsx:332-335`, `EditModeLayer.tsx:169-172`) but consume DIFFERENT `allContent`
— the parent scopes through `applyVisibilityScope(rawContent, filterState.showHidden)` (`:284-296`),
the layer does not (`EditModeLayer.tsx:149-152`). Same code, different domain, different output,
both used. And the process/sort calls pass opposite arguments: `filterVisible` `true` vs `false`,
`showProtectedCovers` absent vs `true`, `collection.*` vs `liveCollection.*`, plus a pinned-selects
branch the layer can never reach (`selectsEnabled` requires `!editMode`, `:219-220`). `filterVisible`
is not a flag tweak — `contentLayout.ts:415-427` shows `false` both skips `filterVisibleBlocks` AND
runs `sortNonVisibleToBottom`. **A hook serving both sites takes 9–11 parameters, four of them pure
behavior switches. That signature's job would be to re-describe the differences.**

**The parent's filter work is NOT waste and was deliberately left alone.** `filteredContent` feeds
`filteredImages:337` → `filteredAvailableOptions:367-394`, which drives filter-chip greying and is
live while editing. Only `contentBlocks` is dead. Gating the wrong one would break the chips.

- [x] ~~`CollectionPageClient` and `EditModeLayer` both run the full filter → process → sort pipeline, so it runs twice per filter change while editing. Extract one hook.~~ **Waste fixed by the handoff guard (#337); hook extraction rejected — see above.**
- [ ] **Still open, found while measuring: a fourth wasted path inside the layer.**
      `EditModeLayer.tsx:280` renders `content={reorderActive ? edit.displayContent : contentBlocks}`,
      so in reorder mode the layer's OWN `contentBlocks` is computed and discarded in favour of
      `useCollectionEdit`'s separately-processed `displayContent`. Same shape as the bug just fixed,
      one level down. Not bundled into #337 — that PR's claim is "the parent stops processing what
      the layer took over", and this is a different claim about the layer itself. Unsized.
- [ ] **Still open: a third `processContentBlocks` caller the item never mentioned.**
      `useCollectionEdit.tsx:556-568` (`processedContent`) uses the layer's argument set
      (`false, id, displayMode, true`) on unfiltered `collection.content ?? []` with no `applySort`.
      Worth knowing before anyone counts call sites again — there are three, not two.

### ◐ E9 · Download icon/hook, auth-card SCSS, `.srOnly` — PR #300; srOnly ⛔

- [x] `ClientGalleryDownload` and `FullScreenDownloadButton` share an identical SVG and an identical download-navigate/reset-timer pattern → `DownloadIcon` plus a small hook.
- [x] The login and invite `page.module.scss` files → one shared auth-card style — PR #300.
      **Not byte-identical, as this item claimed.** They differ on line 1, the header comment, which
      is why the rename shows 62% similarity rather than 100%. Lines 2–29 match
      (`md5 1c595922f7093c94149989928905d3da`). The SVGs in bullet 1 _are_ identical apart from
      `className` (`md5 8b73bb4e2b4833ac8c8876e74942b737`).
- [ ] `.srOnly` is copy-pasted in 6 modules (was 7 — one copy fell to A8's sweep). This is documented policy, but an SCSS `%placeholder` honors the no-global-utility rule and collapses ~50 lines. ⛔ Needs the G2-style USER decision, not a violation report. (Bullets 1–2 of this item are COLD and don't wait on it.)

---

## Group F — Structural

Bigger, optional, sequenced last. Do each individually and verify on :3000.

F2, F5, F6 and F7 shipped — full write-ups in
[group-f-structural.md](2026-summer-refactor/group-f-structural.md). F1, F3 and F4 remain open, below.

### ☐ F1 · Decompose `useCollectionEdit.tsx` (**1,759 lines** as of #339 — was 1,747 here and 1,748 in E6)

- [ ] After the A- and E-group work (~−150 lines), split along the pattern the file already established (`useContentReordering`, `useCoverImageSelection`, …): `useAdminCollectionState`, `useCollectionUpdateForm`, `useCollectionPeople` + `useGalleryAccess`, `useCollectionRelations`, `useContentOps`, `useManageBar`. The section boundaries were verified 2026-08-22, corrected 2026-08-25, and **corrected AGAIN 2026-08-28 after #339** — current values: state `:312–422`, update form `:439–814`, people+gallery `:472–873`, content ops `:874–1228`, relations `:1230–1414`, manage bar `:1415–1467`. (Pre-#339 they were `:439–797`, `:472–856`, `:857–1211`, `:1213–1397`, `:1398–1456`.) **Why they moved, and the rule it implies:** #313 landed on 2026-08-24, one day AFTER the boundaries were checked, and inserted 1 line at `:68` and 4 at `:748` — so every boundary below `:748` is +1 and every boundary at or above it is +5. Re-anchored on `const [currentState`, `const [editTab`, `const seedUpdateData`, `const [collectionPeople` and `const handleMediaUpload`, all of which still match. **The file's stated 1,747 lines is correct**, which is exactly what made this drift invisible: the line COUNT was refreshed after #313 and the line REFS were not, so the item looked verified.

**It happened a SECOND time, the same way, four days later — #339 (E6 bullet 2).** Three edits at `:730`, `:765` and `:1439` produced **three different offsets**, so no single number corrects the boundaries: `+0` at or above `:730`, `+23` between `:730` and `:765`, `+17` between `:765` and `:1439`, `+11` below it. The five anchors above all still match and were re-used. **The general rule, now demonstrated twice: F1's boundaries are invalidated by ANY merge into `useCollectionEdit.tsx`, and a uniform offset is the wrong correction whenever the merge had more than one hunk.** Re-derive from the anchors, never by adding a constant.

**Trap found while doing exactly that:** anchoring the update-form end on its raw source line — a bare `);` — false-matched 13 lines early. Generic closing punctuation is not an anchor. The end boundaries here were re-derived from the enclosing construct (`handleUpdate`'s dependency array, `const bottomBarCells`), which is why `:797 → :814` is right and the naive `);` match at `:801` is wrong. Keep the existing `UseCollectionEditResult` facade so the SIX test suites (`test`, `buffer`, `handlers`, `bulkRemove`, `escapeSelection`, `delete`) plus `collectionEditFixtures.ts`'s ~70-member result builder do not churn. No file over ~450 lines.
- [ ] This also dissolves `EditModeLayer`'s FOUR `exhaustive-deps` suppressions (**`:135`, `:205`, `:212`, `:219` as of 2026-08-25** — were `:131`/`:201`/`:208`/`:215`, shifted +4 by F6's provider block; was "three" before that).

### ◐ F3 · File moves and renames — `ReorderMove` (#324) and `getUserPage` (#336) SHIPPED; invite bullet COSTED and REJECTED; six bullets open

**SHIPPED 2026-08-27 — the `getUserPage` bullet, PR #336. Src `+38/−26` (net +12), test `+58/−56`
(net +2).** Measured with `git diff --cached --numstat -- app` and `-- tests`, summed with `awk`.
`getUserPage` now lives in `app/lib/api/personal.ts`; `app/lib/api/user.ts` and
`tests/lib/api/user.test.ts` are deleted and the naming trap is gone. **The bullet's `2 src / 7
test` was exactly right** — 2 importers (`UserSpace/userSpaceData.ts:16`,
`lib/components/CollectionPageWrapper.tsx:10`), 7 test files. Estimate-vs-actual: no surprise.

**Suite count −1, test count unchanged.** 246 → 245 suites, 4451 → 4451 tests. `user.test.ts`'s
three specs folded into `personal.test.ts` under the harness it already had — that file mocks
`fetchReadApi` and keeps `ApiError` real, which is precisely what `user.test.ts` set up for itself.
The fold cost zero new mock scaffolding.

**BASELINE CORRECTION — the board's `4399` is stale. Current `main` is 246 suites / 4451 tests**,
measured by stashing the tree and running the full suite at `d784bc5`. #324's close-out said "quote
4399 from here on"; the E2 merges (#332/#333/#334) added 52 tests since. **Quote 4451 / 246 from
here on**, and note that this is the second time in a row the recorded baseline aged out within
three merges. A baseline is only good until the next merge — re-measure it, do not quote it.

**What the move actually cost, and it is not the line count.** Every one of the six test files that
mocked `@/app/lib/api/user` ALSO already mocked `@/app/lib/api/personal` separately. Moving the
export merged twelve mock declarations into six. That is the real content of the diff: a module
boundary that two files had to be mocked across is now one. **The reverse of this is what a future
split costs** — see the invite-functions cost report below, where two test files need a whole
second `jest.mock` block added for exactly this reason.

**One trap found and NOT triggered, worth writing down.** `tests/lib/components/CollectionPageWrapper.test.tsx`
mocks `personal` but never mocked `user`, so after the move its factory silently becomes
`getUserPage`'s mock too. It survives only because that file has no `home`-slug test, and
`getUserPage()` is called solely under `slug === HOME_SLUG && me` (`CollectionPageWrapper.tsx:76`).
**Add a `home`-slug test to that file with a logged-in `meServer` and it will fail with
`getUserPage is not a function`** until `getUserPage: jest.fn()` joins its personal factory. Not a
defect today; a tripwire for whoever writes that test.

**`share.ts:7,81` needed no edit — the bullet asked for a change that is a no-op.** Both are bare
`{@link getUserPage}` with no module path, so they resolve (or fail to resolve) identically before
and after. `share.ts` never imported the symbol. `core.ts:157` mentions `getInvitePreview` the same
bare way, so the invite move has the same non-cost. **Lesson for the four remaining "update the
refs" bullets: check whether the ref names a module before budgeting for it.**

**Why it was next (picked 2026-08-27).** Three reasons. Its context is
as warm as it will get — every one of its `file:line` refs was re-verified and corrected in this
session's drift sweep, so nothing in it is unchecked. It is small and fully specified: 2 src / 7
test, one export moving from a 19-line file into the module that already holds its three siblings.
And it kills the `user.ts` vs `users.ts` naming trap, which is a live hazard rather than a tidiness
complaint — this board has twice had to disambiguate the two by hand.

**Guardrail — do the `getUserPage` bullet only, and leave the invite functions alone.** The very next
bullet (invite functions from `users.ts` → `auth.ts`) is the adjacent tempting change: it is the same
kind of move, in the same directory, and its refs are now correct too, so a fresh session will be
inclined to sweep both into one MR. Do not. That bullet is marked PARTLY ACCURATE on purpose — its
DESTINATION is unresolved. The three invite functions span three different fetch perimeters
(`getInvitePreview` server-only via `getApiBaseUrl`, `regenerateInvite` through the admin perimeter
with the BFF secret, `acceptInvite` client-side through the BFF proxy), and `auth.ts` is client-side
session code. Moving them into `auth.ts` mixes three perimeters into one file, which is a worse
structure than the split it claims to fix. **If it still looks right after the `getUserPage` move,
write down what a new `invites.ts` would cost instead of doing it.**

**SHIPPED 2026-08-24 — PR #324, +16/−9 src (net +7), 0 test.** `ReorderMove` now lives in
`app/types/Content.ts`. Four files, zero test files, exactly as measured. 245 suites / 4399 tests
pass, identical to the `main` baseline at `a60d333` measured with the tree stashed. **F6 is
unblocked.**

**The judgment call, recorded because it was a live option.** No re-export was left in
`collectionEditUtils.ts`. That file already re-exports `toggleRelation` for exactly this reason, so
keeping the old import path working was the precedented move — and it defeats the point. A
re-export leaves the edge nominally intact and lets the next person import the type from `edit/`
again. All four importers were repointed instead.

**`~neutral` was right, and the +7 is worth a line.** The entire net is the docblock added above the
interface at its new home, which explains why it lives in `app/types/` rather than beside the
functions that use it. Moving a type is net-zero by construction; the only way to spend lines is to
explain the move, and that is a line worth spending.

**Baseline correction for the board.** F2's close-out recorded the post-#321 baseline as 245 / 4398.
Current `main` is 245 / **4399**. The extra test came from #322 or #323, not from #324 — confirmed by
stashing and re-running, which gave the identical 245 / 4399. ~~**Quote 4399 from here on.**~~
**SUPERSEDED 2026-08-27 — `main` at `d784bc5` is 246 / 4451.** The E2 merges moved it. See the
baseline correction at the top of this item; 4399 was accurate for three merges and then was not.

**Pre-existing `tsc` error, unchanged and not ours.** `tsc --noEmit` reports one error at
`.next-verify/dev/types/validator.ts`, a stale generated type for a deleted
`app/(admin)/admin/layoutpreview/page.tsx`. `.next-verify/` is gitignored (`.gitignore:123`). This is
the build-artifact rot F2's close-out already flagged; deleting the directory clears it. It has now
appeared in two consecutive sessions, so treat it as expected noise rather than re-investigating it.

**Why it was next (picked 2026-08-24).** Not because it is valuable on its own — it is a grab-bag —
but because one of its nine bullets is the sole blocker on F6, and F6 is the largest remaining win
in the neighborhood F2 just left warm (`SharedRendererProps` 16 members → 3). The `ReorderMove`
bullet is measured at four files and zero test files, so it is close to free. **Do that bullet;
leave the other eight alone.**

**Sizing this item is a category error and the estimate column now says so.** "~neutral" is correct
and useless: moving a file is net-zero lines by construction. See the line-count rule in "how to use
this doc". Judge this one by the edge it reverses, not its diff.

**Guardrail — HONORED in #324. The other eight were left untouched and verified against `main` at
`a60d333`; each bullet below now carries its verdict and its file counts.** Four are still accurate
as written, four are partly wrong — and in every one of the four the _move_ is fine while the
_justification_ has drifted. That is the specific failure mode this board keeps hitting: the
one-line reason ages faster than the fact. Nothing was changed. The original guardrail text follows.

**Guardrail — do the other eight bullets NOT, and report which are still accurate.** They are the
tempting part: nine small mechanical moves look like one tidy MR, and bundling them buries a
dependency-edge change that F6 depends on inside a rename sweep nobody will review carefully. Worse,
several of the eight were written before A-, E- and F-group work landed and may already be done or
wrong — `CollectionPageWrapper.tsx` "is the only component under `lib`", the `AdminPanel/` fossil
"now only contexts", the two `logger.warn('manageUtils', …)` labels. **Check each of the eight
against `main` and write down which are still true, without changing them.** That converts a stale
grab-bag into eight verified one-liners for later, and it is the same move that turned E17 from a
vague bullet into a shippable item.

- [ ] `contactApi.ts` → `lib/api/` (fold into the tracked Wave B ApiError item). **STILL ACCURATE
      (2026-08-24).** Still at `app/utils/contactApi.ts`, 61 lines, and it does hand-roll a result
      union instead of `ApiError` — `ContactResult` at `:6-8`, where every other `lib/api/` module
      throws `ApiError` from `core.ts`. The Wave B item is real and unshipped
      (`docs/006-code-health.md:30`). **Destination note the bullet does not have:**
      `app/lib/api/messages.ts` already exists but holds only the admin side (`getAdminMessages`,
      `deleteAdminMessage`); `submitContactMessage` posts to the public
      `/api/proxy/api/public/messages`, so it belongs in that file rather than a new one. 1 src / 3
      test.
- [ ] `CollectionPageWrapper.tsx` out of `app/lib/components/` — it is the only component under
      `lib`. **STILL ACCURATE (2026-08-24), justification included.** `find app/lib -name '*.tsx'`
      returns exactly this one file. The rest of `app/lib/` is `actions/clearCache.ts`, 13 files in
      `api/`, and `storage/collectionStorage.ts`. 3 src / 6 test — and the three
      `tests/lib/components/CollectionPageWrapper.*.test.tsx` files move with it.
      **RE-SWEPT 2026-08-28 after #336 touched two of those test files — counts unchanged, still
      3 src / 6 test.** Src importers are exactly `app/[slug]/page.tsx:5`,
      `app/all-client-galleries/page.tsx:1`, `app/page.tsx:3`; the other `CollectionPageWrapper`
      hits in `app/` are prose inside docblocks (`ClientGalleryGate.tsx:30`,
      `useCollectionEdit.tsx:1169` (**was `:1152`**), `personal.ts:89`, `contentTypeGuards.ts:181`) and move nothing.
      **`app/lib/` is now 12 files in `api/`, not 13 — #336 deleted `user.ts`.** One caution on the
      wording: the glob `CollectionPageWrapper.*.test.tsx` matches only TWO files
      (`.allCollectionsTile`, `.meTile`); the third is `CollectionPageWrapper.test.tsx` with no
      middle segment. The count of three is right, the glob is not — don't drive the move off it.
- [ ] `fullscreen-image.module.scss` → `FullScreenModal.module.scss`, which leaves `app/styles/`
      holding only `globals.css`. **PARTLY ACCURATE (2026-08-24) — the move is fine, the
      justification is wrong.** `app/styles/` holds THREE files: `auth-card.module.scss`,
      `fullscreen-image.module.scss`, `globals.css`. After the move it holds two, not one.
      `auth-card.module.scss` has a reason to stay — it is shared by two unrelated routes,
      `app/login/page.tsx` and `app/invite/[token]/page.tsx`, and
      `tests/styles/scssImportResolution.test.ts:3` documents that consolidation. **Do the rename;
      delete the "only `globals.css`" clause.** 2 src / 0 test —
      `tests/styles/breakpointConsistency.test.ts` globs `app/` recursively (`:17`) so it needs no
      update.
- [x] ~~`getUserPage` from the one-function `user.ts` into `personal.ts`, killing the `user.ts` vs
      `users.ts` naming trap.~~ **SHIPPED 2026-08-27 — see the close-out above the bullet list.**
      Original text, which was accurate in every particular:
      **STILL ACCURATE (2026-08-24); refs re-swept 2026-08-27.**
      `app/lib/api/user.ts` is 19 lines (**was `20`**), two imports, one export (`getUserPage:10`,
      unchanged). `users.ts` sits beside it with 13 exports.
      `personal.ts` is the right home: it already holds the signed-in user's own reads
      (`listSavedImageIdsServer:87` **was `:137`**, `listSavedImagesServer:105` **was `:155`**,
      `listFollowedCollectionIdsServer:124` **was `:174`**), same `cache: 'no-store'`, same
      null-on-401. 2 src / 7 test, and `tests/lib/api/user.test.ts` folds into
      `tests/lib/api/personal.test.ts`. **Also update the two `{@link getUserPage}` references at
      `app/lib/api/share.ts:7,81`** (**`:99` → `:81`**).
      **Every drifted ref here is E2's doing** — #333's `clientFetch` conversion shortened
      `personal.ts` to 131 lines and `share.ts` to 161. The premise is untouched; only the
      coordinates moved.
- [ ] Invite functions from `users.ts` → `auth.ts`. **PARTLY ACCURATE (2026-08-24) — the functions
      are where the bullet says, the destination is questionable.** `regenerateInvite:87`,
      `getInvitePreview:158`, `acceptInvite:240` in `app/lib/api/users.ts`, whose own docblock
      (`:2`) already admits the split. **All three `users.ts` refs re-verified correct 2026-08-27 —
      that file did not drift.** But `auth.ts` is client-side session code (`login:48`, `logout:65`,
      `me:75`, `registerPasskey:162`, `loginWithPasskey:219` — **all five drifted, was
      `:64`/`:87`/`:104`/`:191`/`:259`**) plus one server helper (`meServer:100`, **was `:129`**),
      and the three invite functions span three different fetch perimeters:
      `getInvitePreview` is server-only via `getApiBaseUrl`, `regenerateInvite` goes through the
      admin perimeter with the BFF secret. **Re-decide the destination before moving — a new
      `invites.ts` avoids mixing three perimeters into one file.** 3 src / 6 test.

      **COSTED 2026-08-27, NOT SHIPPED — and the answer is don't, on grounds the bullet does not
      yet state.** Measured against `main` at `d784bc5`. All three refs re-confirmed correct:
      `regenerateInvite:87`, `getInvitePreview:158`, `acceptInvite:240` in a 264-line `users.ts`.

      _Mechanical cost, which is small._ About 74 lines of body + docblock move out; `users.ts`
      drops to ~190. A new `invites.ts` needs its own import block (~10 lines — `ApiError`,
      `fetchAdminPostJsonApi`, `getApiBaseUrl`, three types from `@/app/types/User`) plus a file
      docblock that has to explain the three perimeters, so call it **+25 to +35 src net**, nearly
      all of it new-file header. The three src importers are one-line swaps with nothing to merge —
      `app/invite/[token]/InviteForm.tsx:12` imports only `acceptInvite`,
      `app/invite/[token]/page.tsx:6` only `getInvitePreview`, and
      `app/(admin)/admin/users/GenerateInviteButton.tsx:10` only `regenerateInvite`. **That is
      cheaper than the `getUserPage` move was**, where both importers needed merging.
      `core.ts:157` names `getInvitePreview` in prose with no module path — no edit, same no-op as
      `share.ts:7,81` turned out to be.

      _Test cost, which is where it turns._ Six files. Three are path swaps
      (`tests/app/invite/page.test.tsx`, `tests/components/InviteForm.test.tsx`,
      `tests/components/GenerateInviteButton.test.tsx` — the last two import the module as a
      namespace, so `usersApi` → `invitesApi` throughout the file, not just at the top). One is a
      split: roughly 175 lines of `tests/lib/api/users.test.ts` (the `getInvitePreview:85`,
      `acceptInvite:139` and `regenerateInvite:241` describes) become a new
      `tests/lib/api/invites.test.ts` **carrying a duplicated ~30-line fetch-mock harness**. And two
      — `tests/app/admin/AdminUserSpaceEditor.test.tsx:32` and
      `tests/components/UserManagementPanel.test.tsx:25` — mock `regenerateInvite` inside a `users`
      factory alongside other members, so each needs **a whole additional `jest.mock` block**, not a
      swap. **This is the `getUserPage` move run backwards**: that one merged twelve mock
      declarations down to six, this one splits six into eight.

      _The reason to not do it, which is neither of those._ **Splitting these three out does not
      reduce perimeter mixing, it relocates it.** `invites.ts` would hold the same three perimeters
      `auth.ts` was rejected for holding. It is better only because its NAME predicts the mix —
      a real improvement, but a much smaller one than the bullet implies.

      **Worse, it splits invite issuance across two files.** `createUser:42` and `upgradeUser:109`
      both return `CreateUserResponse` carrying a fresh `inviteUrl`, and both plainly stay in
      `users.ts` as admin user-lifecycle operations. Today "where does an invite come from" has one
      answer. After the move it has two — and the file named `invites.ts` is not the one that issues
      most of them. **That is a worse boundary than the one it replaces**, and no docblock fixes it.

      **Verdict: leave all three where they are; rewrite this bullet as a rejection, not a move.**
      If the real complaint is the admin/public mix that `users.ts`'s own docblock (`:2`) admits,
      the boundary that would actually pay is **public invite REDEMPTION (`getInvitePreview` +
      `acceptInvite` — both unauthenticated, both driven by `app/invite/[token]/`) split from
      everything else**, leaving `regenerateInvite` beside `createUser`/`upgradeUser` where issuance
      lives. Two functions, not three, and each file ends with ONE perimeter. **Not proposed as a
      task — recorded so the next pass does not re-litigate the 3-function version from scratch.**

- [x] ~~`ReorderMove` type → `app/types/Content.ts`~~ **Done in #324.** The public tree imported it from the admin edit directory. **This bullet is the sole blocker on F6** — do it first and F6's dependency edge is one-way instead of two. As of #321 the importer is `RendererContext.tsx`, not `BoxRenderer.tsx`. **Measured, not guessed** — `grep -rln "ReorderMove" app/ tests/` against `main` at `dbc706a` returns exactly FOUR files and zero test files: `Content/RendererContext.tsx`, `Content/boxRendererUtils.ts`, `edit/collectionEditUtils.ts` (the declaration), `edit/hooks/useContentReordering.ts`. Two of the four are already on the public side, which is the whole argument for the move. A four-file, no-test-churn change.
- [ ] Rename the lowercase `auth/` and `messages/` component directories. **PARTLY ACCURATE
      (2026-08-24) — both are lowercase, but the bullet omits a third and needs to say why.**
      `app/components/` has 36 entries and THREE are lowercase: `auth/`, `messages/`, `ui/`. The
      other 33 are PascalCase, which is also the documented convention. **`ui/` should stay
      lowercase and the bullet must say so**, or whoever picks this up will "fix" it: `ui/` is a
      namespace holding 23 PascalCase component folders (`ui/Button/Button.tsx`,
      `ui/Modal/Modal.tsx`, …), not a component. `auth/` and `messages/` hold exactly one file each
      — `auth/MeProvider.tsx`, `messages/MessageRow.tsx` — so they are components misfiled as
      namespaces. 9 src / 9 test combined.
- [ ] Fold the `AdminPanel/` fossil (now only contexts) into `ListPanel/`. **STILL ACCURATE
      (2026-08-24), "now only contexts" is exact.** `app/components/AdminPanel/` holds two files,
      both contexts: `AdminPanelCollapseContext.tsx` and `AdminPanelSeedContext.tsx`. No component.
      **`AdminPanelRenderer.tsx` + its `.module.scss` live in `app/components/Content/`, not here**
      — worth knowing so nobody hunts for them. Four of the five importers already import from
      `ListPanel/` too, so the pairing matches how the code is used. 5 src / 3 test.
- [ ] ~~Two~~ **THREE** `logger.warn('manageUtils', …)` labels in `collectionEditUtils.ts` still name
      a module that no longer exists. Found by B1 (#290) and deliberately left — renaming log labels
      inside a test-only MR would have put a source change in a diff that had none. **PARTLY
      ACCURATE (2026-08-24) — the labels are stale as claimed, but there are three, not two.**
      `collectionEditUtils.ts:225`, `:279`, `:305` as of 2026-08-25 (were `:224`/`:278`/`:304` at `a60d333`; #324 added one import line above them) ("Failed to revalidate
      cache", "…location caches", "…metadata cache"). `manageUtils.ts` is gone —
      `manageUtils.test.ts` was deleted in #290. **Nothing pins the string**: `git grep
"'manageUtils'" -- tests/` returns nothing and `logger.warn` is a no-op under
      `NODE_ENV === 'test'`, so this is a 1 src / 0 test change with no assertion to update.
      Correct label is `collectionEditUtils`.

### ⛔ F4 · `TaxonomyPage` ← `LocationPageClient` — USER DECISION

- [ ] Tag pages are location pages minus filters. Consolidating deletes `TaxonomyPage` and gives tag pages filters for free. Candidate, not a defect.
- [ ] Re-scoped 2026-08-22: the delta is bigger than "minus filters". Both render the byte-identical
      `ContentBlockWithFullScreen` call under the same frame, but LocationPage also carries
      `LocationCollections`, a cover on the header, and `FollowsProvider` seeding — and TaxonomyPage
      is a 32-line SERVER page, so consolidation converts tag pages to a client page. Product call
      for the user: should tag pages gain filters, the collections strip, and follow seeding? Not
      startable until answered.

## Group G — Decisions and docs

G1 shipped (#303) — write-up in
[group-g-decisions.md](2026-summer-refactor/group-g-decisions.md). G2, G3 and G4 remain open, below.

### ◐ G2 · Inline-comment rule — DECIDED 2026-08-22: keep and enforce; G2a COLD, G2b/G2c ⛔

The review recommended relaxing the rule; the user overruled it. The standard: no why-comments inline. The why belongs in the docblock of the function it explains. If a function's docblock would get too big because there is too much going on in the function, split the function — do not comment inline. CLAUDE.md now carries this wording. Do not propose relaxing the rule again.

- [x] **Commit the CLAUDE.md wording — PR #268.** Landed on its own, as instructed. The rule now
      covers plain function bodies (not just component bodies) and closes the "but this is
      why-context" exception explicitly. This is the standard G2a's ESLint rule has to enforce.

Inventory at decision time: 15 JSX `{/* */}` comments + 504 `//` lines in 226 blocks across 56 files (AST sweep of comments inside function/component bodies; module-scope headers and `eslint-`/`@ts-` directives excluded). Line refs drift as A/E/F MRs land — regenerate the sweep before each migration MR.

**⛔ Scope call found 2026-08-22: that inventory was a `.tsx`-only sweep.** Re-run today: `.tsx` =
506 lines / 228 blocks / 55 files (barely moved — useCollectionEdit 18→19 via C1, MenuDropdown 6→7).
But `.ts` files under `app/` add **416 lines / 174 blocks / 35 files** the inventory never counted —
`app/**` total 922 / 402 / 90. The decided standard (#268: "plain function bodies") covers `.ts`
too; the inventory said otherwise. USER decides: does G2b's migration (and the `error` flip) cover
`.ts` util/lib files, roughly doubling it? If yes, ten more heavy files join G2c's ride-along list:
`metadataUtils.ts` (38 blocks), `rowCombination.ts` (15), `contentLayout.ts` (15), `contentFilter.ts`
(13), the proxy `route.ts` (10), `userSpaceData.ts` (10), `useMetadataState.ts` (9), `useParallax.ts`
(8), `core.ts` (5 — **was `7`; corrected 2026-08-27**; E2's rewrite deleted two inline blocks
along with the duplicate skeletons), `rowStructureAlgorithm.ts` (6). (Exclude or delete the untracked
`layoutpreview/page.tsx` harness before regenerating any baseline — it contributes 3 comment lines.)

- [ ] **G2a · Enforcement first.** ESLint: (1) `no-restricted-syntax` with selector `JSXExpressionContainer > JSXEmptyExpression` bans `{/* */}` in JSX; (2) a small local flat-config rule reports `//` and `/* */` comments whose range falls inside a function body under `app/**` (allow `eslint-`, `@ts-`, `prettier-` directives; docblocks above declarations untouched). Land as `warn` immediately; flip to `error` when G2b merges.
      **Feasibility verified empirically 2026-08-22** on the repo's ESLint 9.36 + typescript-eslint
      8.29: the selector flags `{/* */}` (and bare `{}` — acceptable bonus) and not real
      expressions; a commented-out `no-restricted-syntax` stub already sits at
      `eslint.config.mjs:78-84`; the local rule is ~50–60 lines inline in flat config, no new deps.
      COLD — startable today.
- [ ] **G2b · Mechanical migration — light files (~45 files with 1–5 blocks).** Hoist each comment into the docblock of the function it explains. A comment explaining a mid-function statement with no declaration to attach to is the split signal: extract a named helper/hook so the docblock has a home.
- [ ] **G2c · Heavy files ride their refactors — do NOT migrate standalone.** Their comment volume is itself the too-big-function evidence, and the split gives every extracted function a docblock home. Plus the ten `.ts` heavies listed under G2b if the user rules `.ts` in scope.

  **Counting method RECOVERED 2026-08-24 — #320 called this inventory unrepairable and it was not.**
  The number is **runs of consecutive `//`-only lines** (a 3-line `//` comment counts once), plus
  `{/* */}` counted separately as "JSX". Recovered by reproducing it, not by finding it written
  down: the method that matched 6 of 11 files exactly is the method. Record it beside the count:

  ```bash
  awk '/^[[:space:]]*\/\//{if(!p)n++;p=1;next}{p=0}END{print n+0}' <file>   # blocks
  grep -c '{/\*' <file>                                                      # JSX
````

**Re-derived against `main` at `dbc706a`. Six of eleven were exact; five had drifted:**

> ⚠ **`useCollectionEdit.tsx` gained one docblock in #339 (raw `/**`count 27 → 28), and this table
cannot be updated for it, because the table does not record how its numbers were counted.** The raw
count is 28 and the table says 16, so the 16 is a filtered subset — but the filter is not written
down anywhere in G4, so there is no way to know whether the new`adoptSaveResponse` docblock falls
> inside it. **This is the same defect G4 exists to fix, in G4's own measurement.** Before this table
> is used to size anything, record the command that produces it; until then treat every row as
> approximate rather than re-deriving one row and trusting the rest.

| File                            | Doc claim  | Actual                     | Rides                           |
| ------------------------------- | ---------- | -------------------------- | ------------------------------- |
| `useFullScreenImage.tsx`        | ~86 lines  | **80** lines / 37 blocks   | own decomposition; pair with F5 |
| `CollectionPageClient.tsx`      | 24         | 24 ✓ (still 24 on 08-28)   | ~~E7~~ **nothing — see below**  |
| `useCollectionEdit.tsx`         | 19         | **16** ⚠ stale — see below | F1                              |
| `CollectionContentRenderer.tsx` | 16 + 4 JSX | 16 + 4 JSX ✓               | E8/F2                           |
| `EditModeLayer.tsx`             | 13         | **17**                     | F1                              |
| `CollectionPageWrapper.tsx`     | 9          | 9 ✓                        | —                               |
| `ClientGalleryDownload.tsx`     | 8          | **7**                      | E9                              |
| `CameraSettingsSection.tsx`     | 7          | **8**                      | —                               |
| `MenuDropdown.tsx`              | 7          | 7 ✓                        | E8                              |
| `UserManagementPanel.tsx`       | 5          | 5 ✓                        | —                               |
| `Component.tsx`                 | 5          | 5 ✓                        | F2                              |

Note `useFullScreenImage.tsx` is quoted in LINES while every other entry is in BLOCKS — that
inconsistency is in the original and is why it looked like an outlier. It is 37 blocks, which
is still the worst file on the list by a wide margin.

**`CollectionPageClient.tsx` LOST ITS RIDE (2026-08-28).** It was pencilled to ride E7, but E7's
main bullet shipped as a four-line guard in #337 and its two remaining bullets are in
`EditModeLayer.tsx` and `useCollectionEdit.tsx` — neither touches this file. Its 24 blocks now
ride nothing. `CollectionPageWrapper.tsx` (9) already rode nothing. **Two of the eleven files on
this inventory have no carrier, which is the thing that turns G2c from "rides other refactors"
into work someone has to schedule.** Say so when G2c is next picked up rather than re-discovering it.

**Re-derived after #336/#337 and the counts did NOT move: `CollectionPageClient.tsx` is still 24,
`CollectionPageWrapper.tsx` still 9.** Command: `awk` over each file counting runs of consecutive
lines whose first non-whitespace is `//`. This is worth recording as a property of the metric, not
just a result — **#337 added two `/** \*/`docblocks to`CollectionPageClient.tsx`and the count
did not budge, because the metric counts`//` runs only.\*\* So the inventory measures exactly the
thing the project's own rule wants removed (inline comments in bodies) and is blind to the thing
the rule wants added (docblocks). That is the right metric, and it means ordinary docblock-adding
work cannot inflate this table. For contrast, the same files hold 15 and 3 JSDoc blocks.

**The two files F2 and E17 just rewrote — `Component.tsx` and `MenuDropdown.tsx` — are both still
exact.** #321 cut 39 lines from `Component.tsx` and #322 rewrote three declarations plus ten call
sites in `MenuDropdown.tsx`, and neither added or removed a single `//` block. Useful calibration:
this inventory is not as fragile as line refs are. It drifts on comment edits, not on code edits,
so it does not need re-checking after every merge — only after a session that touched comments.
`UserManagementPanel.tsx` lives at `app/components/UserManagementPanel/`, not under `AdminPanel/`.

> **⚠ This inventory is stale as of 2026-08-24 and cannot be repaired as written.** Three of the
> files listed have since been edited by the very items they were tagged to: `useFullScreenImage.tsx`
> and `CollectionContentRenderer.tsx` + `MenuDropdown.tsx` (F5 and E8 respectively). Worse, **the
> counting method was never recorded**, so the numbers cannot be re-taken comparably — a naive
> contiguous-comment-run count today gives `useFullScreenImage` 50, `CollectionContentRenderer` 21,
> `MenuDropdown` 14, `Component` 21, `useCollectionEdit` 43, which is nowhere near the recorded
> 86/16+4/7/5/19 and is obviously a different metric, not a delta. **Whoever picks up G2 must
> re-take the whole inventory in one pass and write the command down beside it.** Do not trust or
> partially patch these numbers. Same failure as F2's prop count directly above: an inventory
> number with no recorded method is not verifiable, only re-derivable.

### ⛔ G3 · `/user/selects` — delete or rebuild — USER DECISION

- [ ] `app/user/selects/page.tsx` (65 lines) is an orphan page: it renders raw IDs and links to `/?collection=`, which nothing reads (re-verified 2026-08-22: no reader of a `collection` search param exists anywhere). Either delete it — Selects live in the gallery star flow — or rebuild it properly.
- [ ] **Both facts re-verified 2026-08-24 against `main` at `dbc706a`; nothing has changed.** Still
      65 lines. `grep -rn "collection'" app --include='*.ts' --include='*.tsx' | grep -E "searchParams|\.get\("`
      → no results, so still no reader. No page in `app/` links to `/user/selects` (the only hits
      are `lib/api/selects.ts`, which names the BACKEND endpoint path — a different thing that a
      grep for the string will keep suggesting is a caller). E17 touched this file (#322 dropped its
      `pageType="default"`), which is the only reason it came up; that edit does not bear on the
      decision. **The question is unchanged and is genuinely a product call, not a fact: delete or
      rebuild? Answerer: the user.**
- [ ] Status wording reconciled 2026-08-22: A1 is COMPLETE as shipped — the `/user/selects` deletion
      was pulled OUT of A1 (see A1's closing note). Deciding G3 performs that final deletion (or its
      rebuild); it does not reopen A1.

---

### ◐ G4 · Docblock standard — swept 2026-08-28: count REPRODUCES, scope is ~half on one axis and BIGGER on another

**Swept for the first time on 2026-08-28. Three corrections, and the item comes out a different
shape rather than a different size.**

**1. The `~48` count reproduces — 49 today — and the METHOD survives, which matters more.** Scan
every `.ts`/`.tsx` under `app/`, extract `/\*\*.*?\*/` non-greedy across newlines, test each block
against six anchored case-insensitive patterns: `\bused to\b`, `\bno longer\b`, `\bpreviously\b`,
`\bthe old\b`, `\bPR #\d+`, `\b20\d\d-\d\d-\d\d\b`. Result: **1411 blocks total, 49 backward-looking**
(`used to` 21, `no longer` 12, `previously` 7, bare date 6, `the old` 4, `PR #N` 1). The per-term
split is within one of the recorded table on every term but `the old` (2→4), and 1411 lines up with
#310's 1384. **"Long AND historical" is still 0.** Per the standing rule about unrecoverable counts:
this one is recoverable, so it stays trusted. Note the recorded table sums to 47 rather than the 45
it states — term overlap (`collectionSlugs.ts:43` and `listPanelShape.ts:97` each match two); the
union is the right number.

**2. But ~23 of the 49 are FALSE POSITIVES, so the history sweep is roughly half its apparent
size.** They are the DATA-state-not-code-history confusion this section already names, and the regex
cannot tell them apart: `Metadata.ts:16` "Used to categorize images" and `contentFilter.ts:255`
"Used to populate filter dropdowns" are _employed-to_, not _past-habit_; `users.ts:79`/`:95`/`:130`
"@throws `ApiError(404)` when the user no longer exists" is runtime state, three times;
`formatDateRange.ts:1`/`:65` and `FilterToolbar.tsx:29` match on bare dates that are _code examples_;
`useCachedPanelData.ts:227` "the superseded fetch no longer owns that flag" is a present-tense
invariant. **~26 are genuine.** And the regex MISSES history it should catch —
`contentRatingUtils.ts:35` ("The vertical penalty was RETIRED in the directional-prominence
rewrite") and `contentLayout.ts:93` ("bit-for-bit what it was before this option existed") are pure
history with no anchor term. **So 26 is a floor, not a ceiling, and this item cannot be finished by
running the regex — every hit needs reading.** Budget accordingly.

**3. The row's "#327/#328 ADDED to the pile" is STALE, and contradicts this section's own body.**
#329 cleaned them and it held: every source file those two PRs touched is clean of anchor terms
today (#327 `eb3948c` — `CollectionPage.tsx`, `EditModeLayer.tsx`, `useCollectionEdit.tsx`,
`types/Content.ts`, `contentLayout.ts`; #328 `dab519d` — `Component.tsx`, `RendererContext.tsx`,
`RendererContext.threading.test.tsx`). The one `contentLayout.ts` hit at `:86` is "used to hold
photos-per-row steady" — employed-to — and `git log -L` traces it to `10fb626`, not #327. The
section already said "Removed in #329"; **the row was arguing with its own section, which is exactly
the board/section contradiction the integrity check is for.**

**4. NEW, and the actual unswept work: the board-label rule has never been swept.** G4 added "board
item labels are not allowed in code comments at all" on 2026-08-25 and nobody counted against it.
**13 docblocks** carry board labels — `contentFilter.ts:872` (D7), `contentLayout.ts:589` (E14/E15),
`contentTypeGuards.ts:173` (D3), `originAllowlist.ts:42` (D9), `Badge.tsx:27` (D6),
`useMetadataSubmit.ts:111` (E12), `collectionEditUtils.ts:284` (C4), `useCollectionEdit.tsx:185`
(D3), `useCollectionEdit.tsx:193` (D3/D4), `StructureTab.tsx:34` (D4), `clearCache.ts:37` (D1/D2),
`core.ts:101` (E2), `api/revalidate/route.ts:7` (D6) — plus **6 inline `//` comments**:
`useCollectionEdit.tsx:1579` (`TODO(A3)`, **was `:1568`**), `useCollectionEdit.tsx:1594` (D4, **was `:1583`**),
`CollectionPageClient.tsx:322` and `:356` (D7), `useCoverImageSelection.ts:51` (D3),
`EditModeLayer.tsx:249` (D3). Only 2 of the 19 overlap the 49, so this is **~17 net-new blocks the
row does not count.** Watch one false positive: `contentRatingUtils.ts:35`'s `H5★` is a five-star
horizontal rating, not item H5. The worst single offender is `collectionEditUtils.ts:284-293`, which
breaks three rules at once — board label, PR number, and history.

**5. The section's own rot prediction came true and is now SPENT.** It quoted #301's "Image-level
location edits are not covered, and that is a known gap" as a paragraph that would go false. It did,
and it was caught: E13 (#313) shipped and rewrote the docblock in the same pass.
`collectionEditUtils.ts:230` now describes two live call sites, is 24 lines (down from the 30 that
filed the item), and the "slugs must come from the saved response" trap the section wanted preserved
is intact at `:239-242`. **Delete the prediction rather than carrying it — it was right and it is
finished.**

**G4 net: smaller on history (~26 real, not 48), larger overall (+~17 label blocks), and it cannot
be run as a regex sweep.** Two row corrections applied: drop "#327/#328 ADDED to the pile", and
carry the label count as its own number.

_Original section follows, unchanged apart from the corrections noted above._

**G4 · Docblock standard — length, structure, and no history — intersection pass done**

_Raised by the user 2026-08-24 off PR #301's `revalidateLocationCaches` docblock: 30 lines of prose
for a function that maps two location arrays to a set of tags._

**The standard.** A docblock says what the thing does, what its arguments mean, and any constraint a
caller must respect. It describes the code as it is now, for someone reading it for the first time.
It is not a decision log, not a changelog, and not a place to record what the code used to be.

**Baseline, measured across `app/` 2026-08-24** (865 docblocks):

| Length      | Count |            |
| ----------- | ----- | ---------- |
| 1–10 lines  | 643   | healthy    |
| 11–20 lines | 169   | acceptable |
| 21–30 lines | 37    | review     |
| 31+ lines   | 16    | rewrite    |

Separately, **57 blocks (6.6%) contain backward-looking language**: "used to" ×23, "no longer" ×11,
a bare date ×9, "previously" ×6, "the old" ×5, "PR #N" ×2. **Twelve are both long and historical**,
and that intersection is the priority list — start there, not with the whole 6%.

**Re-measured 2026-08-24 after the intersection pass** (PR #310). The scan script counts every
`/** … */` in `app/`, including file headers and one-liners, and finds **1,384** blocks rather than
865 — so the raw counts below are not comparable to the baseline table, only to each other. The
intersection came out at **19**, not 12, for that same width-of-scan reason. All 19 were done; the
difference is measurement, not scope creep.

| Measure                 | Before    | After     | Note                       |
| ----------------------- | --------- | --------- | -------------------------- |
| 21–30 lines             | 39        | 38        |                            |
| 31+ lines               | 17        | 16        |                            |
| Backward-looking        | 63 (4.6%) | 45 (3.3%) |                            |
| **Long AND historical** | **19**    | **0**     | the priority list, cleared |

Net −50 lines across 17 files, and `git diff -U0` carries **zero non-comment lines** — the docs-only
claim is checked, not asserted. Full suite 4,325 passed.

**What is left.** 45 blocks still carry backward-looking language, all of them short enough that the
line-count smell never fires on them: "used to" ×20, "no longer" ×11, "previously" ×7, a bare date
×6, "the old" ×2, "PR #N" ×1. Several are false positives of the scan — `collectionEditUtils`'
"listing a collection that is not there" and `CollectionPageClient`'s "ids that are not on screen"
describe DATA state, not code history, and a regex cannot tell those apart. That is the same reason
the no-lint-rule decision below holds. Sweeping the remainder is a separate sitting and a separate
MR; it is not blocking anything.

**The sweep will not converge while new docblocks keep adding to the pile, and 2026-08-25 proved
it.** C6 (#327) and F7 (#328) shipped fresh backward-looking docblocks — "was removed once
measured", "whatever an earlier version of this comment said", plus board labels (`F6`, `F7`, `C6`)
and backend PR numbers written into interfaces and test headers. The user caught it on read:
_"comments like this that explain 'previous issues or previous state' should NOT EXIST"_ and
_"F6 means NOTHING in this context ... we are only dealing with what the code IS and what it DOES"_.
Removed in #329, which also took two pre-existing blocks with it (the `reorderImagesBeforeCollections`
parenthetical in `processContentBlocks`, and `EditRendererProps`' previous-design paragraph).

**Two additions to the standard, both from that read.** First, **board item labels are not allowed
in code comments at all** — a reader at the call site has no board in front of them, and the name of
the MR that changed a line does not help them use it. The existing standard bans history; it did not
explicitly ban `F6`/`C6`/`PR #N`, and every one of those was written by a session that had just read
this very item. Second, **a refactor's own MR is the most likely place for this rot to enter**,
because the author has the before-state fresh in mind and mistakes it for context the reader needs.
Check your own new docblocks against the standard before opening the PR, not just the ones you set
out to fix.

A re-scan on 2026-08-25 (a looser regex than #310's, so not directly comparable) reports **48**
backward-looking blocks in `app/` against #310's 45 — after #329's removals. The pile is not
shrinking on its own.

**Why this is happening, and why the existing rule does not catch it.** `CLAUDE.md` already forbids
inline comments and sends every "why" into the docblock, with one escape hatch: _if the docblock
gets too big, split the function._ That escape hatch assumes a big docblock means the function does
too much. Here it does not. `revalidateLocationCaches` is small and does one thing; its docblock is
long because it is carrying **decision-record content that belongs in the PR and on this board**.
The rule has no answer for that case, which is the gap this item closes.

**Worked example, and a concrete rot prediction.** #301's docblock contains a paragraph beginning
"Image-level location edits are not covered, and that is a known gap" — roughly six lines explaining
`getLocationPage`'s two-query shape and `findOrphanImagesByLocationName`. **That paragraph is
[E13](#-e13--trigger-collections-location-slug-from-the-image-metadata-save-path).** It is already a
tracked item with a row and a section. The moment E13 ships, the docblock states something false,
and nothing will fail to tell anyone. A tracker entry duplicated into a docblock is a comment with
an expiry date on it.

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
buffer, because an unsaved location is `{ id: 0, slug: '' }`" is exactly right and should survive a
rewrite: it is a live trap, not a historical note. The test is **tense and audience** — does this
sentence help someone using the function _now_, or does it explain the past to someone who was
there? Cut on that test, not on line count. Line count is the smell; it is not the rule.

**Scope.** Docs-only, zero source change, so it is safe to split across sittings and safe to do
alongside anything. Do the 12 long-and-historical blocks first and stop; converting all 53 in one MR
makes an unreviewable diff for no extra benefit. Re-run the two measurements above afterwards and
put the new numbers on this item.

**Do NOT add a lint rule for this in the same MR.** `eslint-plugin-jsdoc` can cap length but cannot
tell history from a live constraint, so a rule would either be trivially satisfied or would fire on
the docblocks worth keeping. Decide whether a rule is wanted after the manual pass has established
what the standard actually looks like in this codebase.

---

## Group H — Feature requests

Filed 2026-08-23 from a user design review of `/user` plus an annotated screenshot. Six requests came
in; **only the three below are cleanup-board work.** H1 and H2a are startable frontend MRs with known
test coupling. H3 is a user decision gating a small MR — the same shape as F4 and G3, which is why it
gets a row: a board row has to be self-sufficient, so anything with a row has its section here.

H2a and H3 shipped (#302) — write-ups in
[group-h-features.md](2026-summer-refactor/group-h-features.md). **Only H1 remains open, below.**

The other three have no rows and no sections here, because a design review, an ops project and a
vision item are not MRs and rows for them would make this board unscannable: **H2b** (a durable
layout for labelled metadata sections), **H4** (one email strategy), **H5** (`MenuDropdown` design
review) and **H6** (composable page components, vision only). Their detail is in
[group-h-features.md](2026-summer-refactor/group-h-features.md), reached from "What to build next"
below. A bug found while researching H4 is filed as **C7** in Group C.

### ☐ H1 · Merge `Following` into `Collections` on `/user`; drop the `Following` chip

**UNBLOCKED 2026-08-24 — the board row still said "do C8 first" after C8 had shipped.** C8
(the stale Following-chip count) is merged, so H1's only stated dependency is gone and the item
is COLD. Caught by the standing check for a blocker that cleared without anyone clearing the
row; worth repeating each run, because a row that reads blocked is skipped rather than read.

`Collections` should show owned, tagged and followed collections in one list. Unfollowing a
collection that has no other association removes it from the page.

**The premise checks out — there is no dedup anywhere.** It was established by reading both
membership paths in the loader, not by comparing what renders on screen. That distinction matters
enough to record: two sets that look identical in the browser prove nothing about whether the same
source decides them, and a same-session review of five "duplicate" claims elsewhere on this board
found only one that survived intact. This one is a source-level finding, so it does not need redoing.

`Collections` membership is decided at
[userSpaceData.ts:75](app/components/UserSpace/userSpaceData.ts:75) (`isContentCollection` over the
`getUserPage()` content blocks, split at [:68](app/components/UserSpace/userSpaceData.ts:68)).
`Following` membership is decided at
[userSpaceData.ts:281](app/components/UserSpace/userSpaceData.ts:281), by intersecting the followed
id list against a separate catalog read. The two sets never see each other. Own a collection and
follow it, and it renders in both tabs today.

**All three refs drifted +3 and were corrected 2026-08-28 (were `:72`/`:65`/`:278`).** Cause: #336
merged `getUserPage`'s import into the existing `personal` import at `userSpaceData.ts:14`, turning
one line into five. Anchors matched on `isContentCollection(block)`, `export function
splitUserContent`, and `const followedBlocks = toCollectionBlocks(catalog.filter(...))`. **The
premise is untouched — `getUserPage` still sources the Collections side, it just lives in
`personal.ts` now rather than `user.ts`.** Only the coordinates moved.

Where the data comes from:

- Followed ids: `listFollowedCollectionIdsServer()` —
  [personal.ts:124](app/lib/api/personal.ts:124) (**was `:174`; corrected 2026-08-27** — E2 #333
  shortened the file), hitting `GET /api/proxy/api/read/user/follows`
  ([personal.ts:16](app/lib/api/personal.ts:16)). Type `FollowedCollectionIds = number[]` at
  [Personal.ts:14](app/types/Personal.ts:14). Called at `userSpaceData.ts:248`.
- Followed tiles: `getAllCollections(0, 500)` at `userSpaceData.ts:256`, filtered at `:278`, wrapped
  by `toCollectionBlocks` at [:87](app/components/UserSpace/userSpaceData.ts:87).
- Chip labels are data, not literals: `Collections` `userSpaceData.ts:302`, `Images` `:308`,
  `Saved` `:314`, `Following` `:321`. Mapped to `ToolbarSection[]` at
  [UserSpace.tsx:117](app/components/UserSpace/UserSpace.tsx:117), rendered at
  [FilterToolbar.tsx:219](app/components/ui/FilterToolbar/FilterToolbar.tsx:219).

Work:

- [ ] Union the two sets in `userSpaceData.ts`, deduping by collection id. `collectionBlocks` (`:72`)
      and `followedBlocks` (`:278`) are built from different sources, so the union must key on `id`,
      never on object identity.
- [ ] Delete the `following` section descriptor (`userSpaceData.ts:321`) and its key from the tab
      union.
- [ ] Decide whether the merged count includes follows (12 + 2 = 14) and whether a
      followed-but-not-owned tile carries a visual marker. The request does not say, and the answer
      changes the tile component, not just the loader.

**Two things this item must fix rather than inherit.**

1. **The catalog read is deferred, and merging un-defers it.** `getAllCollections(0, 500)` runs only
   when `activeKey === 'following'` (`userSpaceData.ts:256`). Merging makes a 500-row catalog fetch
   run on every `/user` load. That deferral is deliberately pinned by
   `tests/components/UserSpace/userSpaceData.selfCatalog.test.ts:77`, so that test goes red and the
   cost has to be accepted on purpose rather than discovered later. The cheaper path is to have the
   backend return followed collections on the user-page read instead of intersecting client-side —
   price that before writing the union.
2. **The stale-count bug is C8, and C8 ships FIRST.** Unfollowing does not update the chip count on
   `main` — mechanism and evidence are in C8, described there and not repeated here. Sequencing
   matters and runs the opposite way to the obvious reading: H1 deletes the `Following` chip, so
   doing H1 first does not remove the staleness, it relocates it onto the merged `Collections`
   count. H1 also needs the tile itself to vanish on unfollow, which is strictly harder than fixing
   a number, because tiles are server-built and the provider has no way to express a removal today.
   C8 builds the client-delta plumbing that H1 then needs anyway. Do C8, then H1.

**Claim to verify before shipping, not while shipping.** This item assumes a stale `?tab=following`
bookmark degrades to `collections` rather than erroring, via the `resolveTabKey` fallback at
[userSpaceData.ts:59](app/components/UserSpace/userSpaceData.ts:59) / `:31`. That is a claim about
code that is about to change. Confirm the fallback still fires once the key is removed from the
union — the board's record is that unverified item claims have been wrong twice.

Tests that will need updating: `tests/app/user/page.test.tsx:252-276` (chip labels, counts, hrefs
— **drifted from `:238-262`, corrected 2026-08-24 after #302 rewrote this file**; anchor on
`labels all four sections with their counts` and `gives every section a ?tab= link`),
`tests/components/UserSpace/UserSpace.sectionSwitch.test.tsx`,
`tests/components/UserSpace/userSpaceData.test.ts:73,93,166,237`,
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

**Debt:** E1 first (correctness risk), then the error-tracking decision (Sentry vs CloudWatch), F1, property-based layout tests, the 001 CSS sweeps, and G1.

**Feature requests (filed 2026-08-23 from a `/user` design review):** four items that are not MRs —
a durable layout for labelled metadata sections (H2b), one email strategy (H4), a `MenuDropdown`
design review (H5), and composable page components as vision only (H6). Detail in
[group-h-features.md](2026-summer-refactor/group-h-features.md). The three that _are_ board work —
H1, H2a, H3 — are in `## Group H` above. Sequencing note: **H5 is UNBLOCKED as of 2026-08-24** — it
waited on E8, which shipped as #319. E8 already owns the
mechanical half of that component, and **H2b overlaps the 008 `/user` ↔ `/admin/users/[id]` layout
unification** — settle those two together or they will produce two competing designs.

## Session log

_Newest first. **Dates are local (America/Los_Angeles), not UTC** — earlier entries mixed the two,
which is why a "08-23" entry can sit between two "08-24" ones. The ordering was verified correct
against real merge timestamps on 2026-08-24; only the labels were inconsistent. Use local dates._

- 2026-08-28 (2) — **close-out. #339 merged. E3 CLOSED with zero code — its "user decision" was
  already answered in the source. Corrected F1's slice boundaries, the third time they have drifted.
  Next run: E6 `_deletedIds`, then E6 bullet 3, then F3's logger labels.**

  **E3 is the sixth occurrence of the board's dominant failure mode and the first of a new shape.**
  The previous five were shipped-but-unticked. This one was answered-but-still-blocked: #306's
  guardrail asked for the guard-deletion analysis, #306 delivered it into
  `collectionStorage.ts:47-55`, and the board kept the question open against the user for four days.
  Hoisted the rule — before escalating anything to the user, grep the source and the crediting PR
  for the answer, because that is where a "report what it would cost" guardrail actually lands.

  **F1's boundaries drifted for the THIRD time, and the correction method had to change.** #313 broke
  them once with a uniform two-band offset; #339 broke them again with three hunks and therefore
  three offsets (+23/+17/+11). No single number fixes them. Re-derived all six from the five anchors
  F1 already names, and hoisted the rule. **Also found a trap doing it:** anchoring the update-form
  end on its raw source line — a bare `);` — false-matched 13 lines early. Generic punctuation is
  not an anchor.

  **G4's docblock table cannot be updated and that is a defect in G4 itself.** #339 added one
  docblock to `useCollectionEdit.tsx` (raw `/**` 27 → 28), but the table's "16" is a filtered count
  whose filter is written down nowhere, so there is no way to know whether the new block falls
  inside it. Flagged in place. G4 exists to fix undocumented conventions and its own measurement has
  the same defect.

  **The board is now decision-starved, not work-starved.** After E3 and E10 closed, seven items sit
  BLOCKED on user calls (H1, C9, F4, G3, E9's `.srOnly`, G2b/G2c, E6 bullet 1) against a COLD set
  that is F1 plus small tails. That ratio is the thing to watch: the next session should batch the
  blocked questions in its opening message rather than picking around them.

- 2026-08-28 — **shipped E6 bullet 2 (`adoptSaveResponse`) as PR #339, costed bullets 1 and 3 without
  touching them, and CLOSED E10 on a user decision. First code MR since #337.**

  **The lift itself was exactly as specified and that is worth recording, because it is the first
  item on this board that was.** E6 said "fully specified, needs no discovery pass" and it was true —
  the two blocks were byte-identical apart from one trailing comment, the six function refs all
  landed, and no exploration was needed. The three sessions of re-verification that preceded it
  (08-26, 08-27, 08-28) are what made that possible.

  **Both test-churn budgets on E6 were over-estimates, not just the first one.** ±100 was corrected
  to ±20 on 08-27 after the call-order claim was disproved. The real number is **0** — all six
  suites pass with no test file edited, full suite 245/245 and 4454 tests. The lesson is not "the
  ±100 was wrong"; it is that **a churn budget written before the extraction is a guess, and both
  guesses here were biased the same direction.** Extractions that preserve call order and add no
  branches do not move tests. Budget those at 0 and be surprised upward.

  **The size estimate was wrong in the other direction — E6's `−90 src` is unachievable.** Bullet 2
  removed 16 duplicated lines and added 27, of which 9 are the docblock the no-inline-comments rule
  requires. Net **+11**; the file went 1748 → 1759. **This is structural, not a one-off:** every
  remaining dedup on this board trades duplicated code for a documented helper, and a documented
  helper costs about what a seven-line dedup saves. Sell these items as drift-protection, not as
  line-count wins, and stop putting `−N src` figures on them.

  **The guardrail held — bullets 1 and 3 were costed, not quietly done.** Bullet 1's shared
  signature needs `revalidateMetadata`, `failLoudly`, and an adopt-ordering switch: **three of about
  six params exist only to switch behavior between callers, so it fails the rejection test on its
  own terms** — the third item that test has killed in three days, after F3's `invites.ts` and E7's
  hook. Even the narrow version (extend `refreshCollectionAfterOperation` for `revalidateCache`
  only) still changes the gif path's behavior, so it does not clear the user gate either. Recommend
  folding it into F1, which must touch those three functions anyway. Bullet 3 is unblocked and
  cheap but ≈break-even on size; its case is that nothing pins the two copies together.

  **E10 closed on a one-word answer, which vindicates asking early.** The user chose to keep
  `--color-danger` — zero code. The bullet had been BLOCKED for days over a comparison that turned
  out to be false; once "the other three panels" was shown not to exist, the decision cost one
  question and no MR. **Ask the small blocked questions before they need their own branch.**

  **New failure mode for this board: bullet 2 shifted every ref below `:740` in its own item, and
  the shift is not uniform** (+23, +17 or +11 depending on which of the three edits a line sits
  below). Left a re-derived ref list at the top of E6 rather than patching prose in place, because
  the prose below still argues from the old numbers and rewriting it would have risked breaking the
  reasoning. **A shipped bullet invalidates its siblings' refs — re-derive them in the same commit.**

## Verified fine — do not re-investigate

- `app/[slug]/page.tsx`'s double `getCollectionBySlug` is deduped by Next request memoization; it is not a single-fetch violation. `meServer` is wrapped in React `cache()`.
- The admin hub's count-fetch and lazy panel fetch are different queries by design.
- BFF proxy internals — body buffering, cookie re-emission, size caps, origin allowlist, sanitized IP order — all check out and are test-pinned.
- `rowCombination.ts` has no retired-model survivors; the prominence model is the only model present. `rowStructureAlgorithm` and `affineHeight` are clean.
- No `any` types, no `import React` namespace, no raw `<img>` anywhere in `app/`. No hydration risks found.
- The gap rule is honored across all 92 style files, stylelint exits 0, and all `!important` uses are defensible.
- All 23 `ui/` primitives have live consumers. `useCachedPanelData`'s generation-counter design is sound. The localStorage admin cache is wiped on logout by design.
- Suite-wide: no skipped or focused tests, no snapshots, no stale TODOs.
- The merged cleanup wave through #270 introduced no regression (2026-08-22 spot review of
  A5/A6/C1/E1/D2: overlay gate traced to every render site, adapter defaults diff-checked against
  pre-consolidation source, the C1 seed-effect state machine walked against all three failure
  modes, exactly one callable action in `clearCache.ts`).
- The D1/D2/D6 gates under adversarial attack (2026-08-22): no bypass found. Details in the Group D
  note above D7.
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
