# 2026 Summer Refactor — Living Checklist

_Formerly `docs/spikes/2026-08-22-frontend-cleanup-spike.md`; renamed 2026-08-23 as the standing
per-session tracker (a pointer stub remains at the old path for stale references)._

_Origin: full critical review of `main` on 2026-08-22, produced by 8 parallel review agents (API, security, utils/hooks, admin surface, public surface, tests, styles, organization/roadmap). Every dead-code claim was verified by grepping call sites; the parent session re-verified every high-severity claim against current code. Full-board re-review 2026-08-22/23 by 7 more agents — see the stamp below._

**This file is a running to-do list, not a one-shot report.** Work is split into numbered MRs sized to land in a single sitting. Check the box when the MR merges, and put the PR number next to it. Keep the `file:line` references — they let any MR be picked up cold.

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

## MR board

| MR  | Scope                                                                    | Risk        | Est. diff                                                                                  | Status                                                                                       |
| --- | ------------------------------------------------------------------------ | ----------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| A1  | Dead whole files + their tests                                           | Minimal     | −1,261                                                                                     | ✅ PR #255                                                                                   |
| A2  | Dead exports in `lib/api`                                                | Minimal     | −283                                                                                       | ✅ PR #256                                                                                   |
| A3  | Dead half of `metadataUtils.ts`                                          | Minimal     | −400 src, −500 test                                                                        | ✅ PR #257                                                                                   |
| A4  | Dead small utils, constants, type guards                                 | Minimal     | −652                                                                                       | ✅ PR #258                                                                                   |
| A5  | Gray overlay never paints on the manage grid (BUG)                       | Low         | ±40                                                                                        | ✅ PR #260                                                                                   |
| A6  | `CollectionListSelector` flat mode                                       | Medium      | −223 net (−183 src/scss, −40 test)                                                         | ✅ PR #261                                                                                   |
| A7a | `useCollectionEdit` legacy aliases                                       | Minimal     | −8                                                                                         | ✅ PR #259                                                                                   |
| A7b | `enterSelect`/`enterAdd` inline copies                                   | Low         | −2 src                                                                                     | ✅ PR #262                                                                                   |
| A8  | Dead SCSS in live modules + `globals.css` tokens                         | Low         | −327                                                                                       | ✅ PR #263                                                                                   |
| A9  | Dead config                                                              | Minimal     | −35                                                                                        | ◐ PR #259; 3 follow-ups open                                                                 |
| B1  | Merge `manageUtils.test.ts`                                              | Low         | −209 net (est. −450)                                                                       | ✅ PR #290                                                                                   |
| B2  | `rowCombination` characterization dedup                                  | Low         | −229 (est. −250)                                                                           | ✅ PR #288                                                                                   |
| B3  | `metadataUtils.test.ts` dedup                                            | Low         | −125 (est. −200 to −300)                                                                   | ✅ PR #287                                                                                   |
| B4  | `contentLayout.test.ts` merge                                            | Low         | −32 (est. −150 to −250)                                                                    | ✅ PR #289                                                                                   |
| B5  | `useCollectionEdit` fixture consolidation                                | Low         | **−145 actual** (est. −350)                                                                | ✅ PR #298                                                                                   |
| B6  | Fold in `CollectionContentRenderer` characterization                     | Low         | **0 actual** (est. −150)                                                                   | ✅ PR #294 + #297 (restore)                                                                  |
| B7  | `useClickOutside` spy tests                                              | Low         | −37 (est. −90)                                                                             | ✅ PR #286                                                                                   |
| B8  | Fill the required-coverage gaps                                          | Low         | +1,545 actual for the 3 slices shipped                                                     | ◐ 5 of 6 — #266 (clearCache), #267 (Escape), #295 (share+messages), #296 (collectionStorage) |
| B9  | `useCollectionEdit.buffer.test.tsx` flakes under parallel load           | Low         | unknown until it reproduces                                                                | ☐ 0/13 + 10/10 standalone — reproduce under other conditions, do not re-measure here         |
| C1  | Unsaved people/gallery-access wipe (HIGH)                                | Low         | +73 −11                                                                                    | ✅ PR #264                                                                                   |
| C2  | About portrait aspect ratio                                              | Trivial     | +99 −5                                                                                     | ✅ PR #281                                                                                   |
| C3  | `SelectsContext.toggle` purity                                           | Low         | +121 −10                                                                                   | ✅ PR #282                                                                                   |
| C4  | Cache tags that never connect                                            | Low         | +155 −62                                                                                   | ✅ PR #279                                                                                   |
| C5  | Assorted LOW bugs                                                        | Low         | +497 −101 (11 files)                                                                       | ✅ PR #283                                                                                   |
| C6  | Password cover strip missing on the public card path                     | Low-medium  | ±30                                                                                        | ⛔ BACKEND-BLOCKED (split out of E1)                                                         |
| C7  | `emailShareLink` POSTs to a route that does not exist                    | Low         | ±40 src, +30 test                                                                          | ☐ (FE built, BE missing — decide build vs hide)                                              |
| C9  | Dimensionless cover renders no header, missing cover does                | Low         | ±20 src, +40 test                                                                          | ☐ (found by B4; needs a decision first)                                                      |
| C8  | Unfollowing leaves the chip count stale                                  | Low         | +418 −22 (est. +40/+80)                                                                    | ✅ PR #291                                                                                   |
| D1  | Gate `POST /api/revalidate` (HIGH)                                       | Low         | +175                                                                                       | ✅ PR #265                                                                                   |
| D2  | Gate `clearCacheAction`                                                  | Low         | +212 (est. +15)                                                                            | ✅ PR #266                                                                                   |
| D3  | Security headers                                                         | Low-medium  | +60 src, +0–40 test                                                                        | ✅ PR #274                                                                                   |
| D4  | Pin the CloudFront host                                                  | Low         | ±1 (actual ±1)                                                                             | ✅ PR #272                                                                                   |
| D5  | Proxy path reject + `/cdn` matcher removal                               | Low         | ~+30 net (−27 src, +6 reject, +40–60 test)                                                 | ✅ PR #273                                                                                   |
| D6  | Shared Origin allowlist (CSRF on `/api/revalidate`)                      | Low-medium  | +75 src, +230 test (est. ±60)                                                              | ✅ PR #270                                                                                   |
| D7  | Wrong danger token on error text (a11y)                                  | Trivial     | 0 (rode #253)                                                                              | ✅ via PR #253                                                                               |
| D8  | Normalize `NEXT_PUBLIC_APP_URL` in the Origin allowlist                  | Trivial     | +30 src, +52 test (est. ±5 src, +2 test)                                                   | ✅ PR #276                                                                                   |
| D9  | Decide: redundant localhost literals in the Origin allowlist             | Trivial     | −5 src, +20 docblock, +7 test                                                              | ✅ PR #277 — deleted                                                                         |
| E1  | Parallax-card builder consolidation                                      | Medium      | +98 src, +659 test (est. −120)                                                             | ✅ PR #269                                                                                   |
| E2  | `core.ts` fetch skeleton + `clientFetch`                                 | Medium      | ~0 net (−180 src, +150–200 test)                                                           | ☐                                                                                            |
| E3  | `collectionStorage.ts` generics                                          | Low         | **−12 src actual** (−46 code, +39 comment); +927 test via #296 (est. +50–150 net for both) | ◐ generics ✅ PR #306; guards bullet ⛔ user call                                            |
| E4  | Entity-diff generics + one IMAGE guard                                   | Medium      | **+44 src / +177 test actual** for the twins half (est. −80)                               | ✅ PR #311 — twins → `entityUtils.ts`; IMAGE-guard half STRUCK, guards are NOT duplicates    |
| E5  | Filter/sort/date duplication                                             | Low         | **0 src / +139 test actual** (est. −50 src)                                                | ◐ PR #299; 4 bullets still open                                                              |
| E6  | `useCollectionEdit` refresh helpers                                      | Medium      | −90 src, ±100 test churn                                                                   | ☐                                                                                            |
| E7  | `useFilteredContentBlocks` hook                                          | Medium      | +100–200 net (new hook suite)                                                              | ☐                                                                                            |
| E8  | Renderer + `MenuDropdown` dedup                                          | Medium      | −120 src, **+150–250 test** (re-sized 2026-08-24, bias 1b)                                 | ☐                                                                                            |
| E9  | Download icon/hook, auth-card SCSS, `.srOnly`                            | Low         | **+16 src / +393 test actual** (est. −100 src)                                             | ◐ PR #300 — both COLD bullets shipped; srOnly ⛔ user call                                   |
| E10 | Admin panel dedup (`LoadError`, `.viewAll`, literals, comparator)        | Low         | **−79 src code-only / +176 test code-only** (est. −60 src)                                 | ◐ PR #304; late-added bullets 6–7 unswept                                                    |
| E11 | Make cache-tag register/revalidate drift detectable                      | Low-medium  | +277 −28                                                                                   | ✅ PR #280                                                                                   |
| E12 | Wire up `collections-location-${slug}`                                   | Low-medium  | **+72 src / +293 test actual** (est. +30 src)                                              | ✅ PR #301; image-path trigger split out as E13                                              |
| E13 | Trigger `collections-location-${slug}` from the image-metadata save path | Low-medium  | **+36 src net / +165 test actual** (est. +30 src, +60 test)                                | ✅ PR #313 — src estimate held; location-RENAME gap split out as E16                         |
| E14 | `createHeaderRow`'s `_chunkSize` is dead but receives a live value       | Low         | **−3 src / −4 test net actual**, 36 call sites (est. −2 src, ~40 sites)                    | ✅ PR #307 — the one estimate on this board that held                                        |
| E15 | `createHeaderRow`'s two trailing boolean params → options object         | Low         | **+22 src net / 14 test call sites** (est. ±15 src, ~20 sites)                             | ✅ PR #314 — stacked on #313; first call-site estimate to come in OVER                       |
| E16 | Revalidate the OLD slug when a location is RENAMED                       | Low-medium  | +25 src, +60 test                                                                          | ☐ **COLD** — E13's pre-build check; rename confirmed real and it 404s, not just goes stale   |
| F1  | Decompose `useCollectionEdit.tsx`                                        | Medium-high | ~neutral                                                                                   | ☐                                                                                            |
| F2  | `RendererContext` for the BoxRenderer tree                               | Medium      | −100 src, **+150–250 test** (re-sized 2026-08-24, bias 1b)                                 | ☐                                                                                            |
| F3  | File moves and renames                                                   | Medium      | ~neutral                                                                                   | ☐                                                                                            |
| F4  | `TaxonomyPage` ← `LocationPageClient`                                    | Medium      | −150                                                                                       | ⛔ USER DECISION                                                                             |
| F5  | `FullScreenModal` link + resolver cleanup                                | Low         | −30 src, **+60–120 test** (re-sized 2026-08-24, bias 1b)                                   | ☐                                                                                            |
| G1  | Docs corrections                                                         | Trivial     | **+106 / −72 actual** (est. ±50)                                                           | ✅ PR #303                                                                                   |
| G2  | Inline-comment enforcement + migration (decided: keep the rule)          | Low         | ~neutral (relocation + splits)                                                             | ◐ wording PR #268; G2a COLD, G2b ⛔ scope call, G2c ⛔ rides refactors                       |
| G3  | `/user/selects` decision                                                 | —           | —                                                                                          | ⛔ USER DECISION                                                                             |
| G4  | Docblock standard — length, structure, and no history                    | Low         | **−50 net actual across 19 blocks** (est. −300 to −500 across ~53); 0 src                  | ◐ intersection pass done — 19 long+historical blocks rewritten; remaining 45 historical open |
| H1  | Merge `Following` into `Collections` on `/user`                          | Medium      | −60 src, ±150 test churn (6 test files)                                                    | ☐ (do C8 first)                                                                              |
| H2a | `/user` rail copy pass + chip-style the Admin links                      | Low         | **+319 / −117 actual** (est. −25 src)                                                      | ✅ PR #302                                                                                   |
| H3  | `Send a message` into the rail as a plain button                         | Low         | rode H2a                                                                                   | ✅ PR #302                                                                                   |

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

### ◐ A9 · Dead config — PR #259

_Shipped bullets are in the [archive](2026-summer-refactor/group-a-deletions.md). These three are open._

- [ ] `.claude/agents/` — NOT done, and the premise looks wrong: `npm`, `npx`, and `node` all resolve
      on PATH (`/opt/homebrew/bin`). Re-confirmed 2026-08-22 from the review session's shell — same
      result, so the "npm is not on PATH" line in CLAUDE.md may itself be stale. Re-diagnose against
      an actual agent run before editing 7 allowlists.
- [ ] `.claude/worktrees/` still holds the 6 orphaned `agent-*` directories (Mar 16, unregistered —
      re-checked 2026-08-22). Check each for uncommitted work before deleting — that is the only
      reason they were left in place. The `cleanup` worktree was removed by the review session (its
      D6 branch merged, tree clean).
- [ ] `app/(admin)/admin/layoutpreview/` — the untracked screenshot harness for PR #253's
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
      reads "TEMPORARY — screenshot harness for the PR #253 four-panel layout question.

```bash
rm -rf "app/(admin)/admin/layoutpreview"
```

---

## Group B — Test-suite reductions

The suite is 51,446 lines against 37,211 source lines. Hygiene is otherwise excellent: zero skips,
zero `.only`, zero snapshots, zero stale TODOs.

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

### ✅ B5 · `useCollectionEdit` fixture consolidation — PR #298

- [ ] SIX files (PR #267 added `escapeSelection.test.tsx` with the same hand-rolled preamble) each
      open with a 122–169-line preamble hand-rolling `makeCollection`/`makeMetadata` — now defined
      6× each and drifted — that `tests/fixtures/collectionEditFixtures.ts` already exists to
      provide (886 preamble lines total). Consolidate the setup. The describe topics are
      complementary; keep them. C1's lesson is a hard constraint: the shared builders must return
      FRESH objects per call so per-DTO array identities survive — a shared constant re-introduces
      the exact fixture trap C1's tests document.
- [ ] **B5 is bigger than six files.** The separate hand-rolled `GeneralMetadataDTO` literal (eight
      empty arrays) appears in all six `useCollectionEdit.*` tests plus `tests/explore/page.test.tsx`
      — seven sites, and `collectionEditFixtures.ts` does NOT currently export a builder for it
      (`makeState()` returns `CollectionUpdateResponseDTO`, a different type). One `makeMetadata()`
      export covers all of them. Est −350 to −450 net.

### ☐ B6 · Fold in `CollectionContentRenderer` characterization

- [ ] `CollectionContentRenderer.characterization.test.tsx`'s stated purpose (pin behavior before the `getClickEligibility` extraction) is complete. Fold the ~6 unique wiring tests into the main file and delete the rest.

### ☐ B9 · `useCollectionEdit.buffer.test.tsx` flakes under parallel load

Filed 2026-08-23 out of B2's run. It is a real suite defect, not a B2 artifact — the file is
unrelated to B2's, and it passes standalone and on a clean re-run.

- [ ] `tests/components/ContentCollection/useCollectionEdit.buffer.test.tsx` fails intermittently
      when the full suite runs in parallel, and passes when run alone.

**Measured 2026-08-23: 0 failures in 13 full-suite runs.** Default parallel scheduling, no
`--runInBand`, ~11.6s per run. **The suite counts quoted here were wrong and misled a later run** —
the real baseline on `53aaac4` is **229 suites / 4086 tests**, measured independently by four agents.
A further 5 standalone runs of the named file on 2026-08-24 gave 10/10 passes. Zero total failures and zero failures of the
named file.

**The instrument was validated in the same session, because a null result from an unproven detector
is not a result.** The run loop classified pass/fail by grepping jest's stdout, which is the mistake
that produced a false all-CAUGHT table elsewhere this session — a grep can match an unrelated line,
or miss a crash that never prints a summary. Control: a deliberately failing test was injected into
`tests/`, the full suite re-run, and both signals confirmed to fire — exit code 1 and the grep
reporting FAIL, against `Tests: 1 failed, 4126 passed`. The control file was then removed and the
tree confirmed clean. So the channel can speak, and 0/13 means what it says.

**0/13 does not close this item, and that is deliberate.** An intermittent failure that hides for
thirteen runs is worse than one that fails every time, not better — it will surface in CI on some
unrelated PR and cost that author an afternoon. What 0/13 does establish is that it is rarer than
~1-in-13 on this machine, which bounds the search: whoever picks it up should reproduce under
different conditions rather than repeating this measurement, since repeating it is now known to be
uninformative. Try a loaded machine, a cold cache, `--maxWorkers` variations, or CI itself, and
record the conditions alongside the count. If it cannot be reproduced under any of those, close it
as not-reproducible with the conditions listed — do not close it as fixed.

Likely suspects once it does reproduce, given the file: this suite is the one C1 rewrote around
re-seed effects and ref guards, and its fixtures were specifically noted as sharing array identities
when built with `mockResolvedValue` instead of `mockImplementation`. Shared module state or a
fixture object leaking across workers is the first place to look. Do not "fix" it by adding a
retry or by moving it to `--runInBand`; both hide the defect rather than removing it.

### ☐ B8 · Fill the required-coverage gaps

The project rule requires tests for these and they have none.

- [x] **First slice — the A7 Escape-path regression test — PR #267.**
      `tests/components/ContentCollection/useCollectionEdit.escapeSelection.test.tsx`, 4 tests,
      test-only. The effect is now at `useCollectionEdit.tsx:432-436` (drifted +1 when C1 landed).
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

- [ ] `lib/api/share.ts` — 217 lines, 9 function exports + 4 type exports, only ever mocked.
      Est +350–500 (calibrated against the sibling API suites: selects 152, personal 282, users 544).
- [ ] `lib/api/messages.ts` — 25 lines. Est +80–150.
- [ ] `lib/storage/collectionStorage.ts` — 286 lines. Est +250–400. **Sequence: write these BEFORE
      E3** — they become E3's characterization safety net.
- [x] `lib/actions/clearCache.ts` — shipped with D2, PR #266. `tests/lib/actions/clearCache.test.ts`.
- [ ] If being thorough: `sharedObserver` (116), `useParallax` (161), `useContentReordering` (198).
      Est +400–600. `collectionToggle` came OFF this list 2026-08-22: `collectionEditUtils.ts:28`
      re-exports `toggleRelation` and `manageUtils.test.ts:1859` tests it — that bullet is a
      retarget when B1 moves the file, not new coverage.

---

## Group C — Bug fixes — C1–C5 and C8 shipped; C6, C7 and C9 open

C1–C5 merged (#264, #281, #282, #279, #283). Full write-ups:
[group-c-bugs.md](2026-summer-refactor/group-c-bugs.md). C4's `collections-location-${slug}` report became E12.

### ☐ C6 · Password cover strip is missing on the public collection-card path

Split out of E1, which deliberately left it alone to stay a provable no-op.

- [ ] `collectionToContentModel` ([CollectionPage.tsx](app/components/ContentCollection/CollectionPage.tsx))
      strips `coverImage` for `isPasswordProtected` collections unless `showProtectedCovers` is set.
      `convertCollectionContentToParallax` ([contentLayout.ts](app/utils/contentLayout.ts)) does NOT
      — it passes `col.coverImage` through unconditionally. Both feed the same parallax card.
      **VERIFIED 2026-08-23, re-verified 2026-08-24 (still zero): this is a BACKEND item, not a frontend one.** `ContentCollectionModel` has
      zero `isPasswordProtected` — grep the interface in `app/types/Content.ts` and confirm. Only
      `CollectionModel` carries it ([Collection.ts:266](app/types/Collection.ts:266)). So the public card
      path has nothing to key the strip on; it is not an oversight that can be fixed in the frontend. That
      is almost certainly WHY the strip only ever existed on `collectionToContentModel`.

- [ ] Backend first: decide whether `ContentModels.Collection` should serialize
      `isPasswordProtected`. The strip is defense-in-depth against a stale cache re-exposing a cover
      the backend (BE-H5) already strips, so the real question is whether the content-block path can
      carry a stale protected cover at all. If the backend already guarantees it cannot, close this
      as won't-fix and record that here.
- [ ] Only if the field lands: post-E1 the frontend side is a two-line change — pass a stripped
      `coverImage` into `buildParallaxCard`, exactly as `collectionToContentModel` now does.
- [ ] Do NOT open this as a frontend MR before the field exists. There is nothing to write.

### ☐ C7 · `emailShareLink` POSTs to an endpoint that does not exist

Found 2026-08-23 while researching the email strategy (H4). The "Send" button under Share on `/user`
404s on every click.

- [ ] [share.ts:176](app/lib/api/share.ts:176) `emailShareLink` POSTs to `${SHARE}/email`, i.e.
      `/api/read/user/share/email` (base constant at [share.ts:16](app/lib/api/share.ts:16)).
- [ ] The backend has no such route. `UserShareControllerProd`
      (`controller/prod/UserShareControllerProd.java:39`) declares exactly four mappings:
      `@GetMapping` `:50`, `@PostMapping("/rotate")` `:64`,
      `@PutMapping("/collections/{collectionId}")` `:80`,
      `@DeleteMapping("/collections/{collectionId}")` `:98`.
      **Re-verified against backend `origin/main` 2026-08-24: still four mappings, and
      `git grep` for any `@*Mapping(…email…)` under `controller/**` returns nothing.** Three of
    the four refs above had drifted (`:67→:64`, `:86→:80`, `:107→:98`) and are corrected here.
      Cross-repo refs on this board are not covered by the frontend drift sweep — re-check them
      by hand whenever the item is picked up.
- [ ] The UI is fully built and reachable: input and Send button at
      [ShareCard.tsx:183-200](app/components/Personal/ShareCard.tsx:183), handler `handleEmail` at
      `:112-121`. The 404 surfaces as the generic "Could not send that email" at `:121`, so it reads
      as a transient failure rather than a missing feature.
- [ ] The `ShareEmailResult { sent, reason }` contract at
      [share.ts:60-63](app/lib/api/share.ts:60) was written against a backend that was never built.

**Three claims checked, not assumed** — the C4 lesson is that a literal grep can report a live route
as dead when the real one is assembled from a template, so all three were run before filing:
(1) _Reachable in production?_ Yes. The Send button renders in the `settings.exists && shareUrl` arm
of `ShareCard.tsx` (from `:167`) with no env gate, no `isAdmin` gate and no feature flag; it enables
as soon as the input is non-empty. (2) _A mapping built from a constant or template?_ No. On backend
`origin/main` every mapping annotation under `src/main/java/**/controller/**` is a plain string
literal; the only four that are not bare `Mapping("…")` are `@PostMapping(value = "/literal",
consumes = …)` forms, still literals. There is nowhere for a template-assembled route to hide.
(3) _A sibling controller that could catch it?_ There is a second share controller,
`ShareControllerProd.java` at `@RequestMapping("/api/read/share")`, but it cannot match — the
frontend posts to `/api/read/user/share/email`, and `/api/read/share` is not a prefix of that.
Verified against backend `origin/main`, not a working branch.

The fix is a decision, not a patch: build the handler — `EmailService` already has a working send
path to reuse — or hide the input until it exists. **Do not "fix" it by swallowing the error**; that
converts a visible 404 into a silent no-op, which is strictly worse. Whichever way it goes, it is
paired with H4's decision 2, since both are about whether this app sends mail on a user's behalf.

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

---

## Group D — Security — ✅ CLOSED

All nine items merged (#265, #266, #274, #272, #273, #270, #253, #276, #277). Full write-ups:
[group-d-security.md](2026-summer-refactor/group-d-security.md). D7's one residual bullet moved to E10.

---

## Group E — Consolidations

Behavior-preserving refactors. Lean on the existing tests.

E1 (#269) and E11 (#280) shipped — write-ups in
[group-e-consolidations.md](2026-summer-refactor/group-e-consolidations.md). E11 matters to B1; B1 carries what it
needs inline.

### ☐ E2 · `core.ts` fetch skeleton + `clientFetch`

- [ ] `throwFromResponse` exists six times — `auth.ts`, `personal.ts`, `selects.ts`, `share.ts`, plus inline in `collections.ts` and `users.ts`. Keep one copy in `core.ts`.
- [ ] The surrounding raw client-fetch wrapper repeats in ~14 functions; a single `clientFetch(url, init)` collapses another ~60 lines.
- [ ] Three copies of the fetch skeleton inside `core.ts` — `fetchAdminGetApi` is `fetchReadApi` with a different channel constant. Fold `'read'` into `fetchBase`.
- [ ] Drop the pointless `Content-Type` on GETs, the double-`throwApiError` try/catch shape, and the identity `ENDPOINT_TYPE_TO_CHANNEL` map.

### ◐ E3 · `collectionStorage.ts` generics — generics ✅ PR #306; guards bullet open

**SHIPPED 2026-08-24, generics half only — PR #306, −12 net in `collectionStorage.ts`.**
`createSlugCache<T>(keyPrefix, suffix)` now builds both trios, so the SSR guard, the slug-match
guard, the TTL rule and the error handling are written once. Executable code went 173 → 127 lines
(−46, −27%); comments went 74 → 113 (+39) carrying the two rationales below. The guards were carried
through unchanged, exactly as the guardrail required, and M3 confirmed it (see below).

**The "halves the file (~100 lines)" estimate was wrong, and here is the failure mode.** It halved
the file's 286 total lines. Only the two trios dedup — 173 lines of code across both — and
`clearAll`, `updateImagesInCache`, the imports and the envelope type do not. Real saving: 46 code
lines. **Generalize this to every remaining dedup item (E4, E5, E8, E10): size the duplicated
region, not the file.** This is a different bias from the source-only-vs-test-coupling one already
on this board, and it stacks with it — E3's row estimated +50–150 net "characterize first", while
the characterization alone came in at +927.

**Two traps found in the rewrite, both now documented in the source.**

1. _The suite pins exact logger text_ (`collectionStorage.test.ts:792` asserts
   `'set: failed to write cache for slug: wedding'`), and the messages vary on **two** axes at once —
   the method name (`set` vs `setFull`) and the noun (`cache` vs `full cache`). The factory takes
   `suffix: '' | 'Full'` and rebuilds each message so all seven stay byte-identical to the originals.
2. _`update`/`updateFull` must NOT become `update: plainCache.set`._ Seven suites automock this
   module with a bare `jest.mock(...)`, and jest's automocker gives two properties holding the same
   function reference the **same mock**. Probed directly: under the alias variant
   `collectionStorage.update === collectionStorage.set`, and a `set()` call lands in `update`'s call
   list. **Honest severity: this does not break the suites today** — all 18 `ContentCollection`
   suites pass 400/400 against the alias variant. It is a latent trap, not a live failure, and
   `useCollectionEdit.handlers.test.tsx` asserts on `update`/`updateFull` call order, so it would
   start counting `set` calls as `update` calls the first time one of those paths also calls `set`.
   Hoisted into "How to use this doc" — it applies to every twin-collapse item.

**M3 re-verified against the refactored source: 6 failed / 82 passed**, up from 4 on `main`, because
the collapsed guard now serves both `get` and `getFull`. The safety net got tighter, not looser.

**Why it was next.** PR #296 was written specifically as this item's characterization safety net, so
its context is as warm as it will ever be. That suite pins `update`/`updateFull` separately from
`set`/`setFull`, pins every key prefix by literal string, and carries a mutation (M2) that simulates
this exact refactor going wrong. Do not start E3 before #296 is on `main`; without it this is an
unguarded rewrite of a storage layer.

**Guardrail — leave the `cached.slug !== slug` guards alone in this MR, and report what deleting
them would do.** The generics half is COLD and needs no decision. The guards half is a behavior
change with a user call attached (see the rewritten bullet below), and bundling the two makes the
diff impossible to review: a reviewer cannot tell a generic-collapse bug from an intentional guard
removal. Ship the generics with the guards carried through unchanged, and put the deletion analysis
in the PR body. If the analysis says removing them is safe, that is a second, one-line MR that the
reviewer can actually see.

Mutation M3 in the #296 suite is the test that goes red if you touch them. If it goes red in this
MR, you have gone out of scope.

- [x] `update`/`updateFull` are literal aliases of `set`/`setFull`. The `get`/`set`/`clear` pairs differ only in key prefix and type — one generic pair halves the file (~100 lines). **Done, PR #306 —
      but the two halves of this bullet resolved differently.** The trios collapsed as described.
      `update`/`updateFull` did NOT: they stay as their own delegating functions, because aliasing
      them merges their jest automocks (trap 2 above). "Literal aliases" was true of the source and
      false of what the test suite can distinguish.
- [ ] ~~The `cached.slug !== slug` checks can never fire. Remove them.~~ **Half wrong — reworded
      2026-08-23 from PR #296's characterization work, which proved both halves.**
      _Unreachable through the module's own API:_ confirmed, and proven rather than assumed.
      `getStorageKey` concatenates onto a fixed prefix so it is injective; `set` always writes the
      same slug it keys on; the two prefixes cannot alias (`collection_full_cache_` does not start
      with `collection_cache_`); and nothing outside `collectionStorage.ts` writes those keys — all
      six callers go through the module API. A test drives seven adversarial slugs, including
      `collection_cache_a`, `full_cache_x`, `''` and `a/b`, and none trip it.
      _But it is not dead code._ It fires on a foreign write to the same key — devtools, a stale
      entry from an older key scheme, a future module — and on a plain-JS caller passing a non-string
      slug: `set(42, …)` then `get('42')` trips it. Removing it changes `get` from "evict and return
      null" to "return `cached.data`", which for a foreign payload can be `undefined`. That silently
      violates the declared `CollectionModel | null` return, because the value came through
      `JSON.parse` and TypeScript never sees it.
      **So E3 may still delete them — as an intentional behavior change, reviewed as such, not as
      removing unreachable code.** Mutation M3 in `tests/lib/storage/` is the test that goes red; if
      the decision is to delete, update those four tests in the E3 PR rather than treating them as a
      regression. ⛔ USER DECISION.

      **⛔ BLOCKED on one yes/no from the user. The question: delete the two `cached.slug !== slug`
      guards, or keep them?** The analysis is finished and shipped in #306's body — nothing further
      needs investigating, and no code needs reading to answer it. Everything else in E3 is done, so
      this is all that holds the item open.

      _Recommendation: keep them._ The cost is four lines. The benefit is that `get` cannot return
      `undefined` through a `CollectionModel | null` signature, which is the one failure the type
      system cannot catch here because the value arrives via `JSON.parse`. Deleting them buys
      nothing measurable and removes the only check on a payload the module did not write.
      If the answer is delete, it is a one-line MR plus four test updates, and M3 is the test to
      re-point rather than treat as a regression.

      After #306 the guards live in **one** place, not two — `createSlugCache`'s `get` serves both
      caches — so deleting them is now a single edit and M3 goes red on 6 tests, not 4.

### ◐ E4 · Entity-diff generics — twins shipped; IMAGE-guard half struck

**Why it is queued next after G4.** Both refs verified correct against `main` 2026-08-24 (`contentFilter.ts:68`,
`contentTypeGuards.ts:23` — neither drifted). It is the same generic-collapse shape E3 just proved,
so the technique is warm, and the second bullet is clean subtraction with no decision attached.

**Guardrail — do NOT consolidate the two IMAGE guards as if it were a rename. They are not
duplicates, and the board's wording invites exactly that mistake.** Checked 2026-08-24:

|            | `isImageContent` (contentFilter.ts:68) | `isContentImage` (contentTypeGuards.ts:23)                                      |
| ---------- | -------------------------------------- | ------------------------------------------------------------------------------- |
| Parameter  | `AnyContentModel` (typed)              | `Content \| unknown` (untyped)                                                  |
| Predicate  | `contentType === 'IMAGE'`              | object-ness **and** `contentType === 'IMAGE'` **and** `'imageUrl' in candidate` |
| Call sites | 20                                     | 21                                                                              |

The `imageUrl` requirement is not incidental — `contentTypeGuards.test.ts` has a dedicated test,
"returns false for IMAGE contentType but missing imageUrl", so it is pinned behavior. One is a
type-level narrow over a known union; the other is a runtime shape validator for data that may not
be typed at all. **Swapping `isContentImage` in at `isImageContent`'s 20 call sites adds an
`imageUrl` presence check to every one of them.** That is a behavior change, not a consolidation,
and it is the same failure B3 caught: two separately written functions that look like one
copy-pasted pair.

Related and worth reading first: `isDateable` ([contentFilter.ts:1002](app/utils/contentFilter.ts:1002))
documents that `convertCollectionContentToParallax` stamps child-collection cards
`contentType: 'IMAGE'`, so "the plain image check would admit them". The codebase already excludes
those via `isCollectionCard` (slug presence), deliberately keyed that way so it "can never disagree
with the layout/badge code". Do not re-solve that with the guard.

**So E4 splits, and the second bullet is the safe one to do first.** The `tagUtils`/`locationUtils`
generic is COLD with no decision attached. The IMAGE-guard bullet now carries a question that is
**the user's or a reviewer's, not a research one**: should those 20 sites start requiring `imageUrl`?
If yes, it is a behavior change needing its own tests; if no, the two guards are correctly distinct
and this bullet should be struck rather than shipped.

Apply the estimate lesson from E3 before sizing: measure the duplicated region, not the files.

- [x] ~~`isImageContent` vs `isContentImage`~~ — **STRUCK 2026-08-24, user decision.** The guards are
      not duplicates (see the table above), and the user confirmed it rather than leaving it open.
      Consolidating would add an `imageUrl` presence check to 20 call sites, which is a behavior
      change, not a consolidation. Nothing to ship; the two guards are correctly distinct.
- [x] `tagUtils.ts` / `locationUtils.ts` twins → `entityUtils.ts` — PR #311.

**Shipped 2026-08-24 (PR #311).** `convertToModels<T>` and `buildEntityDiff` now live in
`app/utils/entityUtils.ts`; `tagUtils` and `locationUtils` are wrappers that fix the type and keep
their exported names, so all four call sites and both existing suites pass untouched.

`buildEntityDiff` did NOT need a type parameter — its body reads only `.id` and `.name`, and both
concrete models are assignable to `EntityRef`. Only `convertToModels` is generic, and it takes a
`createUnknown` factory instead of casting its constructed fallback to `T`: a cast would silently
absorb a new required field on `ContentTagModel`, where the factory breaks at the wrapper.

**Second not-a-duplicate, found while doing this — do not fold it in later.**
`buildAssociationDiff` ([metadataUtils.ts:305](app/components/Metadata/metadataUtils.ts:305)) is a
THIRD prev/newValue/remove implementation and reads like the same function. It is not:

|                     | `buildEntityDiff`                 | `buildAssociationDiff`                    |
| ------------------- | --------------------------------- | ----------------------------------------- |
| Emits a diff when   | new names differ **positionally** | the edited set holds **any** unsaved name |
| ~~`id` type~~       | ~~`number` (required)~~           | ~~`number \| undefined`~~                 |
| `prev` built from   | a `Set` — duplicates collapse     | a raw array — duplicates survive          |
| Shape               | returns a value                   | mutates `diff[field]` in place            |

Given identical unsaved names on both sides, `buildEntityDiff` returns `undefined` and
`buildAssociationDiff` emits a write. Same failure mode as the IMAGE guards and as B3. The warning
is pinned in `entityUtils.ts`'s own docblock, not only here.

**Two rows of this table were wrong, corrected 2026-08-24 while doing E13.** The `id` row is struck:
`buildAssociationDiff`'s signature says `id?: number` but every model reaching it declares
`id: number` required, so the loose branch is unreachable. The `prev`-dedup row was missing and is
the only divergence with a reachable trigger. **And the sentence that used to close this paragraph
— "Moving its callers onto the shared helper changes which saves fire" — was overstated and is
deleted.** It does not: the image save path calls `updateImages` unconditionally, so a diff decides
payload contents, not whether a save happens. The full report, including why the both-sides check
is nevertheless load-bearing on the COLLECTION path, is in E13.

**Estimate, measured after the fact.** Board said −80 (which included the now-struck guard half).
Actual for the twins half: **source +44 lines**, +177 test. The duplicated region really was ~105
lines collapsing to ~55, but the shared module needs its own docblocks and `EntityRef`/`EntityUpdate`
need declaring, and those exceed what the wrappers gave back. The win is one copy of the mechanic
instead of two, not a smaller tree — the same lesson E3 taught, in the same direction.

### ◐ E5 · Filter/sort/date duplication — PR #299; 4 bullets open

- [x] `FILTER_PARAM_KEYS` in `useFilterUrlState.ts` hand-mirrors `serializeFilterToParams`; the "MUST mirror" comment is a drift warning. Export the key list from `contentFilter.ts`.
- [x] ~~`sortContent.ts` / `sortByDate.ts` mirror `contentFilter`'s merge/sort pair~~ — STRUCK
      2026-08-22: false. `sortContent.ts` _imports_ `isDateable`/`mergeDateSortedImages` from
      `contentFilter` and `sortByDate` from `sortByDate.ts`; its own docblock documents the
      placement as an import-cycle necessity. There is no duplicate.
- [x] ~~`collectionDates.ts`'s `MONTH_NAMES` duplicates `formatDateRange.ts`'s `MONTHS_LONG` (`:34`)~~
      — **the 2026-08-22 correction was itself wrong, twice over** (found 2026-08-23, PR #299).
      `collectionDates.MONTH_NAMES` is the **short** list, byte-identical to
      `formatDateRange.MONTHS_SHORT` at `:24` — not `MONTHS_LONG` at `:34`. And the parenthetical
      claiming the short lists were distinct was also false. The dedup was right; only the
      description was wrong. A ref can drift twice: re-read it even when a prior session says it
      already corrected it.
- [ ] `createMetadataTextBlock` / `createTextOnlyHeaderRow` are near-identical literals.
- [x] ~~`rowCombination` re-derives AR formulas that `affineHeight.ts` already exports~~ — STRUCK
      2026-08-22: already done. `rowCombination.ts:37` imports them, its `:1342` comment says both
      are adapters onto the shared core, and `affineHeight.mirror.test.ts` pins it.
- [ ] The `ImageBlock` alias is declared twice.
- [ ] `searchImages` and `getAllImages` should share a `buildImageFilterParams` for the query string (~30 lines). The endpoints stay separate by design.
- [ ] `contentLayout.ts`'s `ProcessContentOptions.displayMode` is accepted and advertised but silently ignored — honor it or remove it.

### ☐ E6 · `useCollectionEdit` refresh helpers

- [ ] Three copies of "refetch → adopt → storage-write → revalidate → clear selection" (`handleMetadataSaveSuccess`, `handleGifSaveSuccess`, `handleDeleteSuccess`) → one `refreshAfterContentMutation`.
- [ ] `handleUpdate` and `enterReorder` duplicate the save-adoption block → `adoptSaveResponse`.
- [ ] `handleBulkRemove` duplicates `useMetadataSubmit.handleRemoveFromCollection` → shared builder.
- [ ] Sequencing (added 2026-08-22): E6 is a slice of F1's decomposition — do E6 first or fold it
      into F1, not both independently. And `useCollectionEdit.handlers.test.tsx` asserts on
      `collectionStorage.update`/`updateFull` CALL ORDER — a consolidated helper that reorders those
      calls moves assertions (budget ±100 test churn across the six suites).

### ☐ E7 · `useFilteredContentBlocks` hook

- [ ] `CollectionPageClient` and `EditModeLayer` both run the full filter → process → sort pipeline, so it runs twice per filter change while editing. Extract one hook.

### ☐ E8 · Renderer + `MenuDropdown` dedup

- [ ] `CollectionContentRenderer` — `ReorderOverlay` JSX is duplicated verbatim in the GIF and image branches; the two placeholder blocks share construction; `isSelected` is recomputed inline twice; seven no-op `key={contentId}` on root returns.
- [ ] `MenuDropdown` — eight copies of the menu-item block → one config array (~60 lines). The `pageType` union has two values that decide nothing.

### ◐ E10 · Admin panel dedup — PR #304; late-added bullets 6–7 unswept

All four panels are on main as of 79fbca5, so every bullet below is now startable — the former
branch-only refs (CollectionsPanel) are main refs. Verified byte-identical by `diff` (re-hashed
2026-08-22), not by eye. COLD.

- [ ] `.loadError` is byte-identical in `CollectionsPanel`, `RolesPanel` and `UserManagementPanel`;
      `.error` is byte-identical in `CollectionsPanel` and `RolesPanel`. The 6-line retry block
      (`<div role="alert">` + `<p>` + Retry `<Button>`) is identical in **five** .tsx files, not four —
      `RoleDetailView.tsx` is the fifth copy, missed by the original audit and found by PR #304.
      Extract `<LoadError message onRetry />` into `app/components/ui/StatusText/`. It completes a
      family that already cross-references itself — `EmptyState.tsx:15-22` explicitly says failed
      reads get their own branch, and the failed-read branch is the only member never written.
- [ ] `.viewAll` in `CollectionsPanel.module.scss:14-23` is byte-identical to
      `MessagesPanel.module.scss:4-13`, hover block included. The JSX is the same five lines too.
- [ ] **Do NOT extract a `<PanelBody>` owning the whole load/error/empty ladder.** Checked: it needs
      ~10 props, three of them pure escape hatches — `footer` for the Messages/Roles delete errors,
      and `visible` for the Roles/Users `view.mode === 'list'` gate. `LoadingText` must stay mounted
      OUTSIDE that gate ([LoadingText.tsx:24-28](app/components/ui/StatusText/LoadingText.tsx:24)),
      so the component would have to render one child unconditionally and the rest conditionally —
      an invariant its name does not imply and nothing would enforce.
- [ ] The four `ContentPanelModel` literals in `buildAdminHubContent` are four copies of the same
      14-line object differing in `panelType`, `title`, and `id`/`orderIndex` that are just
      `1001+n`/`100+n`. A `PANEL_ORDER.map(...)` replaces ~60 lines with ~20.
      **`width: 600` and `height: 1100` are NOT dead** — perturbing them to 137/999 moved 15 hub
      tests. They feed the layout solve. Do not "clean them up".
- [ ] `newestFirst` in `CollectionsPanel.tsx:58` is the same algorithm as `sortGroup`'s BLOG branch
      at [CollectionListSelector.tsx:63](app/components/CollectionListSelector/CollectionListSelector.tsx:63),
      over the same `CollectionListModel` from the same `getMetadata()`. Only difference is
      `compareNames` vs a raw `localeCompare` (a real base-sensitivity difference in name
      tie-breaks, not just style — pick one deliberately).
- [ ] Added by the 2026-08-22 review of #253: the `TALLER_THAN_OPEN_TODAY` skip lists
      (`page.collapseStates.test.ts:395`, `page.collapsedLayout.test.ts:331`) are one-directional on
      their own — each excepted state is held bidirectional only by a companion exact pin, and
      nothing asserts the two name the same states. Convert to the whole-list compare pattern the
      width sweep uses, or add that assertion.
- [ ] From D7, which shipped without it: `RolesPanel.module.scss:72` still uses
      `--color-danger` for a button hover where the other three panels use `--color-danger-text`.
      A visible design change, so it needs a call rather than a sweep.

### ◐ E9 · Download icon/hook, auth-card SCSS, `.srOnly` — PR #300; srOnly ⛔

- [x] `ClientGalleryDownload` and `FullScreenDownloadButton` share an identical SVG and an identical download-navigate/reset-timer pattern → `DownloadIcon` plus a small hook.
- [x] The login and invite `page.module.scss` files → one shared auth-card style — PR #300.
      **Not byte-identical, as this item claimed.** They differ on line 1, the header comment, which
      is why the rename shows 62% similarity rather than 100%. Lines 2–29 match
      (`md5 1c595922f7093c94149989928905d3da`). The SVGs in bullet 1 _are_ identical apart from
      `className` (`md5 8b73bb4e2b4833ac8c8876e74942b737`).
- [ ] `.srOnly` is copy-pasted in 6 modules (was 7 — one copy fell to A8's sweep). This is documented policy, but an SCSS `%placeholder` honors the no-global-utility rule and collapses ~50 lines. ⛔ Needs the G2-style USER decision, not a violation report. (Bullets 1–2 of this item are COLD and don't wait on it.)

---

### ☐ E12 · Wire up `collections-location-${slug}`

_Moved off C4 when Group C was archived. It was scoped, sized and ready, and had no board row —
the exact drift the board-maintenance note describes. C4 left it untouched deliberately and said
"do it after E11"; E11 shipped as #280, so it is unblocked._

- [ ] `collections-location-${slug}` is registered at `collections.ts:151` and revalidated
      nowhere. It is the one orphan registration left after C4 removed the four dead tags.

**Report — what wiring up `collections-location-${slug}` would actually take.**

The guardrail written when C4 was set up said the collection's locations and its previous locations
are "neither plumbed through today". That is not right, and the real obstacle is elsewhere. Both
halves of the data are already in `useCollectionEdit`: `collection.locations` gives the pre-edit set
(there is already an `originalLocations` memo built from it), and the save path already reads
`response.collection.locations` into a `resolvedLocations` local. `CollectionModel.locations` is a
`LocationModel[]` and `LocationModel` carries `slug`. What actually blocks it:

1. **The helper's signature, and its call sites.** `revalidateCollectionCache(slug)` takes one
   collection slug and is called from eight places, including `CreateCollectionForm` and
   `useCaptureDateSelection`, which have no location data in scope. Either the helper grows a second
   argument most callers cannot fill, or location revalidation moves out of it and into the save
   paths in `useCollectionEdit` that do know about locations. The second is the honest shape, and it
   means location freshness depends on which code path did the edit — which needs saying out loud.
2. **New locations have no slug until the backend assigns one.** A location added during an edit is
   `{ id: 0, name, slug: '' }` on the frontend. Revalidating from `updateData` would build
   `collections-location-` and hit nothing. It has to come from the post-save
   `response.collection.locations`, so it can only run after the save resolves, not optimistically
   alongside the other three.
3. **Removals need the union, not the new set.** Moving a collection from Seattle to Portland has to
   revalidate both location pages. Revalidating only the post-save locations leaves the Seattle page
   listing a collection that is no longer there for up to `TIMING.revalidateCache`. So the call needs
   previous ∪ next, which is why the pre-edit set matters and why this is not a one-liner.
4. **Unverified: whether the backend keys that endpoint off collection locations alone.**
   `/collections/location/{slug}` is a backend query. Whether an IMAGE-level location change can move
   a collection in or out of that list is not knowable from this repo, and it decides whether image
   edits need to trigger this too. Worth one question to the backend before building.

Sizing: small if it lands as a `revalidateLocationCaches(previous, next)` helper called from the
`useCollectionEdit` save paths — roughly +30 source, +60 test. Do it after E11, not before: E11
decides how a template-keyed tag gets registered and revalidated through one place, and this is the
second template-keyed tag that would use it.

---

### ✅ E13 · Trigger `collections-location-${slug}` from the image-metadata save path — PR #313

**SHIPPED 2026-08-24 — PR #313, +36 src net / +165 test, 7 new tests.**

**The src estimate held; the test estimate was 2.75× under.** Estimated +30 src / +60 test, actual
+36 / +165. The src half held for the reason the item itself gave — "a second caller, not new
logic" — and that framing is checkable before building, which is why it worked. Of the +45 src
lines added, **six are executable**: the import, the `previousLocations` binding, and the four-line
`void revalidateLocationCaches(...)` call. Everything else is docblock. The test half missed for the
usual reason (bias 1b): a second call site still needs its own suite, and pinning the union, the
slug source and the bulk case takes more setup than the one-line call suggests.

**Where it landed:** `submitImageEdits` in `app/components/Metadata/hooks/useMetadataSubmit.ts`.
`previous` reads off `imageSubset` (still the pre-save images at that point), `next` off
`response.updatedImages`. Both guardrails held — `revalidateLocationCaches` was not touched except
for its docblock, and `buildAssociationDiff` was not touched at all.

**Four of the seven new tests fail without the change; three pass either way.** Verified by removing
the call and re-running, rather than assuming. The three that pass either way are the negative
cases (no locations, null response, revalidation rejects) — they are guards, not proof, and are
labelled as such here so a future reader does not mistake the count for coverage.

_Split out of E12 (PR #301) once the backend question E12 could not answer got answered._

E12 wired the tag from the collection-edit save paths, which is correct regardless of what the
backend does. This item is the other half.

**The backend does NOT key `/collections/location/{slug}` off collection locations alone.**
`CollectionService.getLocationPage` runs two queries: the collections at that location, plus orphan
images from `ContentRepository.findOrphanImagesByLocationName`, matched by image location name. So
retagging a single image changes what a location page shows, and an image-level location edit has to
revalidate the tag too.

- [x] Call `revalidateLocationCaches(previous, next)` from the image-metadata save path. The helper
      already exists in `collectionEditUtils.ts` and already handles the union, the dedup and the
      slug-less case — this is a second caller, not new logic. **Done in #313, exactly as written —
      the helper's body is byte-identical.**
- [x] ~~Confirm with the backend that `findOrphanImagesByLocationName` is the only image-side
      input.~~ **ANSWERED 2026-08-24 by reading backend `origin/main`, no backend session needed.**
      `CollectionService.getLocationPage` (`services/CollectionService.java:232`) makes exactly six
      repository reads. Three are collection-side (`countListedByLocationName`,
      `findListedByLocationName`, `findListedIdsByLocationName`) and are E12's territory. One is the
      location record itself (`locationRepository.findByLocationName`). The image side is a
      find/count PAIR — `contentRepository.findOrphanImagesByLocationName` and
      `countOrphanImagesByLocationName` — but both take the same `(locationName, allCollectionIds)`
      key, so there is **one image-side matching rule**, not two. The premise holds and the item is
      COLD.

**One thing the answer added.** The orphan queries take `allCollectionIds` and exclude images
already inside a listed collection at that location. So an image appears on `/location/{slug}` only
while it is an orphan there, and a COLLECTION-side change can move an image on or off the page
without the image being touched. E12 already revalidates on the collection side, so the pair is
complete once this lands — but do not describe this item as "the image half" in code; it is the
image-side TRIGGER for a page whose contents both sides feed.

- [x] ~~**Check before building: what happens on a location RENAME?**~~ **CHECKED 2026-08-24, both
      sides. The rename is real, and the consequence is worse than this bullet guessed.** The
      frontend exposes it at `/metadata`: `MetadataList.handleUpdate`
      (`app/components/ui/MetadataList/MetadataList.tsx:53`) PUTs `{ name }` to
      `/metadata/locations/{id}`, and that surface does not revalidate anything at all. The backend
      then **recomputes the slug unconditionally** — `MetadataService.java:410` does
      `location.setSlug(SlugUtil.generateSlug(locationName))` with no guard, and the DAO's UPDATE
      writes the column. So the old slug does not go stale, it **stops existing**:
      `CollectionService.getLocationPageBySlug` resolves via `locationRepository.findBySlug(...)
      .orElseThrow(...)`, and there is no slug-history or redirect table anywhere in the backend.
      `/location/{old-slug}` 404s while its cache tag keeps serving a snapshot of a page whose URL
      is gone. **Filed as E16 rather than folded in here** — the caller is a generic list component
      shared with tags and people, so it needs a callback prop, not a hardcoded call. That is a
      different change from this item, and this item's premise ("a third caller, not a change to
      the helper") survives.

Sizing: +30 src, +60 test, assuming the helper needs no changes. **Actual +36 src / +165 test.**

**Two adjacent paths deliberately NOT wired, both verified rather than assumed:**

1. **The GIF save path (`submitGifEdit`) needs nothing.** `ContentGifModel` does carry `locations`,
   so this looked like a symmetric gap. It is not: `findOrphanImagesByLocationName` and its count
   twin build on `SELECT_CONTENT_IMAGE` and `JOIN content_image ci ON c.id = ci.id`
   (`ContentRepository.java:390-450`), which structurally drops every non-image row — there is no
   `content_type` predicate doing it. GIFs live in `content_gif`. So a location-tagged GIF can
   never appear on `/location/{slug}`, and revalidating on GIF save would be a no-op.
   **Backend footnote worth its own eyes later:** `content_image_locations` is content-level keyed
   (`cil.content_id`, generalized by V27), so GIFs *can* be location-tagged and simply never
   surface. That reads like an unintentional gap on the backend, not a deliberate exclusion. Not
   filed here because it is a backend item, not a frontend one.

2. **`handleRemoveFromCollection` is a real gap and is NOT covered.** It sits in the same hook and
   also calls `updateImages`, but it changes collection membership, not locations. That still moves
   a location page: the orphan queries take `allCollectionIds` and exclude images already inside a
   listed collection at that location, so dropping an image out of a collection can flip it INTO
   orphan status and onto `/location/{slug}`. Left alone because this item is scoped to the
   location-editing save path, and the fix is three lines in a different function. **Confirm the
   scope call before filing it** — it may belong to E16's MR rather than its own row.

**Guardrail — `buildAssociationDiff` is one file away and is NOT a duplicate.** This item puts you
in `Metadata/metadataUtils.ts`, where `buildAssociationDiff` (`:305`) sits beside the now-shared
`buildEntityDiff` that E4 extracted. It reads like the same function and is not one. Held in #313:
it was not touched. See the table in E4, and the warning pinned in `entityUtils.ts`'s own docblock.

**Report as asked: unifying them would change nothing a user can trigger — but keep them separate
anyway, for a different reason than this board gave.** Investigated 2026-08-24 without editing.

- **The mechanism the board describes is real.** `buildAssociationDiff` emits whenever the edited
  set holds any unsaved name (`metadataUtils.ts:315,319,321`); `buildEntityDiff` compares unsaved
  names on both sides and returns `undefined` when they match (`entityUtils.ts:82,88-92`).
- **The consequence it draws does not follow, and the sentence is now corrected in E4.** Every
  divergent case needs `current` to hold an `id === 0` entry, and no `buildAssociationDiff` call
  site can produce one: both callers (`metadataUtils.ts:459-460`, `:490`) take backend-sourced
  models, and post-save state is re-read from `response.updatedImages`. The only code writing
  `{id: 0}` into a current-side list (`useCollectionEdit.tsx:1194`, `:1232`) already feeds
  `buildEntityDiff`. **And "which saves fire" is wrong even where the outputs differ**: the image
  path calls `updateImages` unconditionally (`useMetadataSubmit.ts:138`), gated only by
  `hasChanges`. A diff controls payload CONTENTS, not whether a save happens. The one path where an
  empty diff does suppress the request is the GIF path (`useMetadataSubmit.ts:104`), and it routes
  only `people`/`locations` against a server model.
- **"Its ids are optional" describes an unreachable branch.** The signature says `id?: number`
  (`metadataUtils.ts:305`), but every concrete model — `ContentTagModel`, `ContentPersonModel`,
  `LocationModel` — declares `id: number` required. Struck from E4's table.
- **Two divergences neither the board nor the docblock names.** (1) The reverse case: current holds
  an unsaved name and the update drops it — `buildAssociationDiff` emits nothing,
  `buildEntityDiff` emits `{prev}`. (2) `prev` is built from a raw array in one
  (`metadataUtils.ts:324`) and a `Set` in the other (`entityUtils.ts:95`), so duplicates survive
  only in the former. **(2) is the sole divergence with a reachable trigger**: bulk edit merges
  `updateState.tags` with `imageSpecificTags` (`metadataUtils.ts:611-640`), which can repeat an id
  and ship `prev: [5, 5]`. `buildEntityDiff` would ship `prev: [5]` — a fix, not a regression,
  though the backend's tolerance for the duplicate was not verified.
- **Unifying would pass the suite silently.** All six cases in the `describe.each` block at
  `tests/components/Metadata/metadataUtils.test.ts:298-396` use real ids or empty arrays on the
  current side, and produce byte-identical output from either function. Nothing pins the divergent
  behavior of `buildAssociationDiff`. The untested case is untested because it is unreachable — but
  that is an argument from call-site analysis, not from the green suite.
- **Where the both-sides check genuinely earns its keep is the COLLECTION path, not the image one.**
  There `originalTags` comes from `convertTagsToModels(collection.tags, ...)` over bare names, so
  unresolved entries really are `{id: 0}` via `createUnknown` (`entityUtils.ts:56`), and
  `isUpdateDirty` (`useCollectionEdit.tsx:658-663`) diffs the built payload to decide whether Save
  lights up. Drop the check there and the button is dirty on load. That is the real reason the two
  behaviors both exist.
- **Recommendation: leave them separate.** Not because unifying breaks a save — it does not — but
  because the merge is mechanical churn (`buildAssociationDiff` mutates `diff[field]` in place and
  takes a `field` discriminator; both call sites would need rewriting to a return-a-value shape) in
  exchange for one payload dedup that no one has reported. If it is ever revisited, the dedup is
  the reason to do it, and this paragraph is the sizing.

**Second guardrail: do not grow `revalidateLocationCaches`.** Its docblock says `handleUpdate` is
the only caller — that sentence becomes wrong when this lands, and the correct fix is to update the
sentence, not to generalize the helper. It already handles the union, the dedup and the slug-less
case. This is a second call site. **Held in #313: the helper's body is unchanged and only the
docblock moved.**

### ✅ E14 · `createHeaderRow`'s `_chunkSize` is dead but receives a live value — PR #307

**SHIPPED 2026-08-24 — PR #307, −3 src / −4 test net, 36 call sites touched.**

**This is the first estimate on this board to land on the nose.** Estimated "−2 src, ~40 test call
sites"; actual −3 src (the parameter, its `@param` line, and the forwarding argument) and 36 sites.
It held for the reason "How to use this doc" already predicts: the sizing was done by grepping the
symbol's call sites first, so the test churn was counted rather than discovered. Every estimate on
this board that was built that way has held; every one built from source alone has missed.

**Type-checking is what made a 36-site positional shift safe.** With the parameter gone, any call
still passing a number in slot 3 fails to compile against `isMobile: boolean`. That is why this was
mechanical rather than risky, and it is the reusable part: a positional-parameter removal in
TypeScript is self-verifying, whereas the same removal in a JS or untyped-options codebase is not.
Full suite came back 233 suites / 4243 tests, identical counts to `main`.

**The options-object alternative below was NOT taken, and not deliberately.** #307 did the straight
deletion. The session that shipped it was working from `main`, where this item did not yet exist —
E14 was defined on the unmerged #305 branch — so the alternative was never weighed. That is a
process finding worth more than the item: **a board item can be invisible to the session doing its
work if the item is still sitting in an open board PR.** The two trailing booleans survive, so the
idea is still live and is now filed as **E15**, where it is a smaller change than it would have been
here.

_Found while finishing E5 (PR #299) and deliberately left out of it — it is not one of E5's six
duplication bullets, and folding it in would have invalidated that MR's verification._

- [x] `_chunkSize` occurs exactly twice in `app/utils/contentLayout.ts`: the docblock and the
      parameter declaration. The body never reads it. The docblock says "(unused, kept for API
      compatibility)". But `processContentForDisplay` in the same file **does** pass a real
      `chunkSize` into that slot, so the value is computed, threaded through and discarded.
      **Confirmed exactly as written and removed in #307.** The "kept for API compatibility" note
      was false: there is no external API. `createHeaderRow` has one production caller —
      `processContentForDisplay`, in the same file — and no other file in `app/` calls it.
      `processContentForDisplay`'s **own** `chunkSize` is real (it drives `rowWidth` via
      `DENSITY_ROW_WIDTH_MULTIPLIER`) and was left untouched; do not confuse the two on a future read.

**This is larger than a two-line deletion, which is why it is its own item.** Roughly 40 call sites in
`tests/utils/contentLayout.test.ts` pass a third positional argument, and the parameters after it —
`isMobile` and `forceRail` — are both positional, so removing a middle parameter shifts them. Every
call site needs checking individually, including the four- and five-argument forms and the bare
three-argument ones.

Worth considering instead of a straight deletion: convert the tail parameters to an options object.
That removes the positional-shift hazard permanently rather than paying it once now and again at the
next signature change. **Not done in #307 — carried forward as E15.**

---

### ✅ E15 · `createHeaderRow`'s two trailing boolean params → options object — PR #314

**SHIPPED 2026-08-24 — PR #314, +22 src net / 14 test call sites rewritten.**

**The first call-site estimate on this board to come in OVER rather than under.** Estimated ~20
sites, actual 14 — 36 total callers, of which 22 pass two arguments and were untouched exactly as
predicted. The estimate was made the right way (grep first), and it still missed by 30%, because it
counted "calls with a third or fourth argument" from a naive text scan. A `createHeaderRow(` scan
that does not balance parentheses miscounts every nested call like `createHeaderRow(bare(), 1200,
false)`. **Balance the parens, or the grep-first rule buys less than it looks like it does.**

**E14's self-verification property carried over intact, which is the reusable part.** Changing slot
3 from `boolean` to an object means every unconverted call fails to compile — `TS2559` for the
three-argument form, `TS2554: Expected 2-3 arguments, but got 4` for the four-argument one. The
compiler enumerated all 14 sites; no site was found by reading. Same as E14, and the same caveat
applies: this is a TypeScript property, not a general one.

**The "roughly net-neutral, may be net positive" line-count prediction was wrong.** Actual +22 src
net. The conversion itself is nearly free — the signature loses a line, the destructure adds one,
the production call site loses two — but `HeaderRowOptions` needs declaring and its two keys need
docblocks, and `forceRail` in particular is not self-explanatory. That is the cost of the
readability win, not a surprise, and the item was right that the win is the point.

**Behaviour is provably unchanged**: 108 `contentLayout` tests pass unmodified except for their call
shape, and the full suite is 243 suites / 4356 tests — identical counts to before, as a pure
refactor should be. **Browser verification was not possible**: the local Spring Boot backend was not
running, so every page fails at `meServer`'s `/auth/me` fetch with `ECONNREFUSED` before any header
renders. Unrelated to this change, but recorded so the next reader does not take "verified by tests
and types only" for an oversight.

_Split out of E14, 2026-08-24. E14 raised this as the alternative to a straight `_chunkSize`
deletion; #307 shipped the deletion without weighing it, because E14's section was still sitting in
the unmerged #305 board PR and was invisible from `main`._

**#314 is stacked on #313, deliberately, for exactly that reason.** E15 and E13 both edit this
board, so branching E15 off `main` would have conflicted here AND re-created the trap E14 named — a
session working from `main` cannot see an item that lives in an open board PR. Merge #313 first.

After #307 the signature is `createHeaderRow(collection, componentWidth, isMobile = false,
forceRail = false)` — two trailing positional booleans. This is the boolean-trap shape: the call
sites now read `createHeaderRow(bare(), 375, true, true)`, where nothing at the call site says which
`true` is which.

- [x] Convert the tail to a single options object — `createHeaderRow(collection, width, opts)` with
      `opts` carrying `isMobile` and `forceRail`. Both already default to `false`, so `opts` and
      both its keys stay optional and the two-argument calls do not change at all. **Done as
      written; the defaults moved into a destructure and all 22 two-argument callers are untouched.**
- [x] ~~Roughly 20 call sites~~ **14 call sites** in `tests/utils/contentLayout.test.ts` pass a third
      or fourth argument and need rewriting; the ~~~16~~ **22** two-argument calls are untouched.
      **Grep the symbol before sizing** — that is what made E14's estimate the only one on this
      board to hold. **It held here too, but only roughly: both call-site numbers were off because
      the scan did not balance parentheses.**

**Two sibling functions have the same shape and were deliberately left alone.**
`createTextOnlyHeaderRow` (`contentLayout.ts:557`) and `createMetadataTextBlock` (`:511`) each take
a single trailing `forceRail: boolean = false`. They are not the boolean-trap shape this item
targets — one trailing boolean next to clearly-typed arguments is readable, and both are
module-private with a handful of callers. Converting them would be churn. Named here so the next
reader sees they were considered rather than missed.

**Smaller now than it would have been inside E14**, because `_chunkSize` is already gone: this
converts two parameters, not three, and the positional-shift hazard it removes is the one E14 just
paid once.

**Do this one for the readability, not the line count — it is roughly net-neutral and may be net
positive.** If that is not worth an MR right now, say so on the row and close it rather than leaving
it to be re-derived a third time. **Done, and the readability framing was correct: the line count
went the other way (+22) and the call sites still read better —
`createHeaderRow(bare(), 1200, { isMobile: false, forceRail: true })` against the old
`createHeaderRow(bare(), 1200, false, true)`.**

---

### ☐ E16 · Revalidate the OLD slug when a location is RENAMED — COLD

_Split out of E13, 2026-08-24. E13's "check before building" bullet asked whether the frontend even
exposes a location rename. It does, and the answer was worth its own item._

**This is not a stale-cache bug. The old URL 404s.** Both halves verified by reading source, no
guessing:

- **Frontend.** `/metadata` renders `MetadataList` per entity type. `handleUpdate`
  (`app/components/ui/MetadataList/MetadataList.tsx:53`) PUTs `{ name: newName }` to
  `/metadata/locations/{id}` via `fetchAdminPutJsonApi`, splices the response into local state, and
  **revalidates nothing** — grep for `revalidate` in that file returns zero hits.
- **Backend.** `MetadataService.java:410` runs `location.setSlug(SlugUtil.generateSlug(locationName))`
  unconditionally on update, and the DAO's `UPDATE location SET location_name = :locationName,
  slug = :slug` writes it. There is no `@PreUpdate` to worry about — `LocationEntity` is a plain
  POJO with hand-written JDBC, so that one line is the whole story.
- **Consequence.** `CollectionService.getLocationPageBySlug` resolves through
  `locationRepository.findBySlug(slug).orElseThrow(...)`. No slug-history table, no redirects. After
  a rename the old slug throws, while `collections-location-${oldSlug}` keeps serving a cached
  snapshot of a page whose URL no longer resolves.

- [ ] Revalidate the old slug's tag on rename. The old slug is only in scope BEFORE the PUT
      resolves, as `item.slug`; `handleUpdate` overwrites `items` with the response and discards it.
      `revalidateLocationCaches([item], [response])` fits the existing signature as-is — this is a
      **third call site, not a change to the helper**, same as E13 was a second.
- [ ] **The obstacle that makes this bigger than E13: `MetadataList` is generic.** It renders tags,
      people and locations from one component and does not know which it is holding. A hardcoded
      call is wrong. Add a per-list callback prop — `onRenamed?: (previous, next) => void` — and let
      `MetadataPageClient` pass the location-specific one. Do NOT special-case entity type inside
      `MetadataList`.
- [ ] **Tags need the same treatment; people do not.** `MetadataService.java:95` re-slugs tags
      exactly like locations. People do not: `updatePerson` (`:160-161`) sets only the name, and
      `Records.java:44` has no slug field at all, so a renamed person keeps their original slug.
      A callback keyed off "the returned slug differs" therefore works for locations and tags and
      correctly no-ops for people. Check whether any `content-tag-${slug}`-shaped tag exists before
      wiring the tag half — if nothing registers one, the tag half is a no-op today and should be
      left out rather than written speculatively.
- [ ] `MetadataList.handleDelete` (`:74`) has the same exposure and is a cheaper case: on delete the
      slug is unambiguously gone. Decide it with this item rather than filing a third row.

**Backend bug found in passing, NOT part of this item and not fixed here.** `updateLocation` checks
uniqueness on the NAME only (`MetadataService.java:403-407`), while `V8` put a UNIQUE index on
`location.slug`. Two distinct names that slugify identically — `"St. Moritz"` and `"St Moritz"` —
pass the name check and then hit a constraint violation on the UPDATE. The create path consults
`findBySlug` first; the admin update path does not. That is a backend 500, and it belongs on the
backend's board, not this one.

Sizing: +25 src, +60 test. The src is a callback prop and one wiring line; the test half is sized
off E13's actual (+165 for a simpler change), so treat +60 as the floor, not the estimate.

---

## Group F — Structural

Bigger, optional, sequenced last. Do each individually and verify on :3000.

### ☐ F1 · Decompose `useCollectionEdit.tsx` (1,748 lines — C1 added the seed guard)

- [ ] After the A- and E-group work (~−150 lines), split along the pattern the file already established (`useContentReordering`, `useCoverImageSelection`, …): `useAdminCollectionState`, `useCollectionUpdateForm`, `useCollectionPeople` + `useGalleryAccess`, `useCollectionRelations`, `useContentOps`, `useManageBar`. The section boundaries verified 2026-08-22: state `:311–421`, update form `:438–792`, people+gallery `:471–851`, content ops `:852–1206`, relations `:1208–1392`, manage bar `:1393–1451`. Keep the existing `UseCollectionEditResult` facade so the SIX test suites (`test`, `buffer`, `handlers`, `bulkRemove`, `escapeSelection`, `delete`) plus `collectionEditFixtures.ts`'s ~70-member result builder do not churn. No file over ~450 lines.
- [ ] This also dissolves `EditModeLayer`'s FOUR `exhaustive-deps` suppressions (`:131`, `:201`, `:208`, `:215` — was "three").

### ☐ F2 · `RendererContext` for the BoxRenderer tree

- [ ] Twenty render-constant props are copied ~10 times across `BoxRenderer`, `Component`, and `ContentBlockWithFullScreen` (count re-verified 2026-08-22; "five times" understated it). A context provided once by `Component` reduces `BoxRenderer` to `tree`/`sizes`/`isMobile`/`priority` and removes ~100 lines of plumbing — `priority` STAYS a prop, it is per-row (`priority={rowIndex <= priorityRowIndex}`, Component.tsx:284), not render-constant. Completes the context migration the codebase already chose for `SelectStar`/`SaveHeart`.

### ☐ F3 · File moves and renames

- [ ] `contactApi.ts` → `lib/api/` (fold into the tracked Wave B ApiError item).
- [ ] `CollectionPageWrapper.tsx` out of `app/lib/components/` — it is the only component under `lib`.
- [ ] `fullscreen-image.module.scss` → `FullScreenModal.module.scss`, which leaves `app/styles/` holding only `globals.css`.
- [ ] `getUserPage` from the one-function `user.ts` into `personal.ts`, killing the `user.ts` vs `users.ts` naming trap.
- [ ] Invite functions from `users.ts` → `auth.ts`.
- [ ] `ReorderMove` type → `app/types/Content.ts`; the public tree currently imports it from the admin edit directory.
- [ ] Rename the lowercase `auth/` and `messages/` component directories.
- [ ] Fold the `AdminPanel/` fossil (now only contexts) into `ListPanel/`.
- [ ] Two `logger.warn('manageUtils', …)` labels in `collectionEditUtils.ts` still name a module
      that no longer exists. Found by B1 (#290) and deliberately left — renaming log labels
      inside a test-only MR would have put a source change in a diff that had none.

### ⛔ F4 · `TaxonomyPage` ← `LocationPageClient` — USER DECISION

- [ ] Tag pages are location pages minus filters. Consolidating deletes `TaxonomyPage` and gives tag pages filters for free. Candidate, not a defect.
- [ ] Re-scoped 2026-08-22: the delta is bigger than "minus filters". Both render the byte-identical
      `ContentBlockWithFullScreen` call under the same frame, but LocationPage also carries
      `LocationCollections`, a cover on the header, and `FollowsProvider` seeding — and TaxonomyPage
      is a 32-line SERVER page, so consolidation converts tag pages to a client page. Product call
      for the user: should tag pages gain filters, the collections strip, and follow seeding? Not
      startable until answered.

### ☐ F5 · `FullScreenModal` link + resolver cleanup

- [ ] Hand-rolled `<a>` + `router.push` → `Link`, which also removes `router` from props.
- [ ] `fullScreenModalUtils` resolvers: drop the `isGif` param that mirrors the internal guard.
- [ ] Fix `hideImage`'s vestigial event param in both type signatures.

---

## Group G — Decisions and docs

### ✅ G1 · Docs corrections — PR #303

The book is wrong in six places.

- [ ] 0204 impersonation removal, 0211 passkey fixes, and 0246 admin-panel-collapse all say "pending" — all are merged.
- [ ] 007 still lists "Dependabot's 7 frontend vulns" — PR #254 cleared all 27.
- [ ] 002 says `thumbnailUrl` is never read — the GIF poster shipped in three places.
- [ ] 006's dead-code list drifted: `getAllCollectionsAdmin` is now live (RoleDetailView) and the logger placeholder line is gone. The error-tracking item itself stands.
- [ ] `previous-work.md`'s newest recorded PR is **#235** (recounted 2026-08-22, worse than the
      "stops before #243" this line used to claim): it is missing #236–#252 AND the cleanup wave's
      #254–#270 — ~27 merged PRs — which violates the book's own archive rule. All five other doc
      errors above re-verified still current 2026-08-22.
- [ ] **The email claim is stale in two places, found 2026-08-23 researching H4.** This board's own
      roadmap item 5 below, and `docs/009-backend-and-vision.md:29`, both say invite links are
      clipboard-only until SES ships. Invite email is **built**: `sendInviteEmail`
      (`EmailService.java:97`) wired through `sendInviteEmailAfterCommit`
      (`AdminUserController.java:457`, called from `:133`, `:180`, `:228`) with an `afterCommit`
      hook so a rollback cannot mail a dead link. The remaining blocker is operational —
      `EMAIL_ENABLED` defaults false at `EmailService.java:46` — not code. Correct both. While
      there, note `docs/superpowers/specs/2026-07-06-email-ses-production.md` is itself partly stale:
      it asserts one public `EmailService` method (`:20`) and "invite email doesn't exist" (`:34`,
      `:73`), but its own C5 recommendation (`:161`) has since shipped.

### ☐ G2 · Inline-comment rule — DECIDED 2026-08-22: keep and enforce

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
(8), `core.ts` (7), `rowStructureAlgorithm.ts` (6). (Exclude or delete the untracked
`layoutpreview/page.tsx` harness before regenerating any baseline — it contributes 3 comment lines.)

- [ ] **G2a · Enforcement first.** ESLint: (1) `no-restricted-syntax` with selector `JSXExpressionContainer > JSXEmptyExpression` bans `{/* */}` in JSX; (2) a small local flat-config rule reports `//` and `/* */` comments whose range falls inside a function body under `app/**` (allow `eslint-`, `@ts-`, `prettier-` directives; docblocks above declarations untouched). Land as `warn` immediately; flip to `error` when G2b merges.
      **Feasibility verified empirically 2026-08-22** on the repo's ESLint 9.36 + typescript-eslint
      8.29: the selector flags `{/* */}` (and bare `{}` — acceptable bonus) and not real
      expressions; a commented-out `no-restricted-syntax` stub already sits at
      `eslint.config.mjs:78-84`; the local rule is ~50–60 lines inline in flat config, no new deps.
      COLD — startable today.
- [ ] **G2b · Mechanical migration — light files (~45 files with 1–5 blocks).** Hoist each comment into the docblock of the function it explains. A comment explaining a mid-function statement with no declaration to attach to is the split signal: extract a named helper/hook so the docblock has a home.
- [ ] **G2c · Heavy files ride their refactors — do NOT migrate standalone.** Their comment volume is itself the too-big-function evidence, and the split gives every extracted function a docblock home: `useFullScreenImage.tsx` (~86 lines — needs its own decomposition; pair with F5), `CollectionPageClient.tsx` (24 blocks → E7), `useCollectionEdit.tsx` (19 → F1; was 18, C1 added one), `CollectionContentRenderer.tsx` (16 + 4 JSX → E8/F2), `EditModeLayer.tsx` (13 → F1), `CollectionPageWrapper.tsx` (9), `ClientGalleryDownload.tsx` (8 → E9), `CameraSettingsSection.tsx` (7), `MenuDropdown.tsx` (7 → E8; was 6), `UserManagementPanel.tsx` (5), `Component.tsx` (5 → F2). Plus the ten `.ts` heavies listed under G2b if the user rules `.ts` in scope.

### ⛔ G3 · `/user/selects` — delete or rebuild — USER DECISION

- [ ] `app/user/selects/page.tsx` (65 lines) is an orphan page: it renders raw IDs and links to `/?collection=`, which nothing reads (re-verified 2026-08-22: no reader of a `collection` search param exists anywhere). Either delete it — Selects live in the gallery star flow — or rebuild it properly.
- [ ] Status wording reconciled 2026-08-22: A1 is COMPLETE as shipped — the `/user/selects` deletion
      was pulled OUT of A1 (see A1's closing note). Deciding G3 performs that final deletion (or its
      rebuild); it does not reopen A1.

---

### ◐ G4 · Docblock standard — length, structure, and no history — intersection pass done

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

The other three have no rows and no sections here, because a design review, an ops project and a
vision item are not MRs and rows for them would make this board unscannable: **H2b** (a durable
layout for labelled metadata sections), **H4** (one email strategy), **H5** (`MenuDropdown` design
review) and **H6** (composable page components, vision only). Their detail is in
[group-h-features.md](2026-summer-refactor/group-h-features.md), reached from "What to build next"
below. A bug found while researching H4 is filed as **C7** in Group C.

### ☐ H1 · Merge `Following` into `Collections` on `/user`; drop the `Following` chip

`Collections` should show owned, tagged and followed collections in one list. Unfollowing a
collection that has no other association removes it from the page.

**The premise checks out — there is no dedup anywhere.** It was established by reading both
membership paths in the loader, not by comparing what renders on screen. That distinction matters
enough to record: two sets that look identical in the browser prove nothing about whether the same
source decides them, and a same-session review of five "duplicate" claims elsewhere on this board
found only one that survived intact. This one is a source-level finding, so it does not need redoing.

`Collections` membership is decided at
[userSpaceData.ts:72](app/components/UserSpace/userSpaceData.ts:72) (`isContentCollection` over the
`getUserPage()` content blocks, split at [:65](app/components/UserSpace/userSpaceData.ts:65)).
`Following` membership is decided at
[userSpaceData.ts:278](app/components/UserSpace/userSpaceData.ts:278), by intersecting the followed
id list against a separate catalog read. The two sets never see each other. Own a collection and
follow it, and it renders in both tabs today.

Where the data comes from:

- Followed ids: `listFollowedCollectionIdsServer()` —
  [personal.ts:174](app/lib/api/personal.ts:174), hitting `GET /api/proxy/api/read/user/follows`
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

### ☐ H2a · `/user` rail copy pass + chip-style the Admin links

Copy and control changes across the three rail cards, from the annotated screenshot. Startable today
and the smallest of the six.

- [ ] Delete the passkey hint sentence at
      [AccountCard.tsx:69](app/components/Personal/AccountCard.tsx:69) ("Sign in faster with Face /
      Touch ID on this device."). Keep the `Add Face / Touch ID` button
      ([:70-78](app/components/Personal/AccountCard.tsx:70), label `:77`) and move it onto the email
      row ([:67](app/components/Personal/AccountCard.tsx:67)), right-aligned.
- [ ] Delete the Share description sentence at
      [ShareCard.tsx:155-158](app/components/Personal/ShareCard.tsx:155).
- [ ] Rename `Create a link` → `Link to share` at
      [ShareCard.tsx:160](app/components/Personal/ShareCard.tsx:160).
- [ ] Delete the Admin description sentence at
      [AdminCard.tsx:36](app/components/Personal/AdminCard.tsx:36).
- [ ] Restyle the four Admin links to the filter-chip look. They render `NavLink` today
      ([AdminCard.tsx:41](app/components/Personal/AdminCard.tsx:41), destinations as data at
      [:16-21](app/components/Personal/AdminCard.tsx:16)), whose only styling is
      [NavLink.module.scss:1](app/components/ui/NavLink/NavLink.module.scss:1) — colour inherit,
      hover underline, no border, no padding, no background.

**The real scope is the chip swap, not the copy edits.** `FilterChip`'s link variant
([FilterChip.tsx:86-99](app/components/ui/FilterChip/FilterChip.tsx:86)) already renders exactly what
`AdminCard` needs: a `next/link` anchor with chip styling and an optional count. So `AdminCard.tsx:41`
can swap `NavLink` → `FilterChip href=…` without touching the chip component. Styling lives at
[FilterChip.module.scss:1](app/components/ui/FilterChip/FilterChip.module.scss:1) (`.chip`), with
`.active` `:62`, `.count` `:92`, `.trailing` `:100`.

Two traps:

1. `FilterChip` passes `scroll={false}`
   ([FilterChip.tsx:93](app/components/ui/FilterChip/FilterChip.tsx:93)). That is right for `?tab=`
   navigation and wrong for a cross-page jump to `/admin` — it will land the user mid-page. Add a
   prop before the swap, not after.
2. `FilterChip` is imported by exactly one file today
   ([FilterToolbar.tsx:5](app/components/ui/FilterToolbar/FilterToolbar.tsx:5)). A second consumer
   promotes it to a shared primitive. Budget for that and for churn in
   `tests/components/ui/FilterChip.test.tsx:64-96`.

**There is no `AdminCard` test file** — confirmed absent, not merely unfound. H2a adds one. Note the
prove-it-fails rule needs care here: a brand-new test file has never been seen to fail, so write each
assertion against current behaviour first, watch it pass, then change the source and watch it fail
the other way. A new test written only against the new copy proves nothing.

### ☐ H3 · `Send a message` placement — DIRECTION DECIDED 2026-08-23

**Decided: keep it, move it into the metadata stack, and make it an ordinary clear button — not a
filled or "bright" box.** The user's words: it should be "a `Button` that is clear what it's
intended purpose is, and is in a position according to its importance or likelihood of being used."
So this is Option A of the original pair, with the loud treatment explicitly rejected. Do it in the
same pass as H2a, which restyles the same rail.

**The two entry points already share a form, so this is placement, not plumbing.**
`SendMessageButton` ([SendMessageButton.tsx:27](app/components/SendMessageButton/SendMessageButton.tsx:27),
43 lines) opens `ContactForm` at
[:38](app/components/SendMessageButton/SendMessageButton.tsx:38). The menu's Contact disclosure opens
the same component at [MenuDropdown.tsx:343](app/components/MenuDropdown/MenuDropdown.tsx:343). On
`/user` the email field is hidden and autofilled from the principal via `lockedEmail={me?.email}`.

Why it floats top-right in the screenshot: it is not in the rail. It renders in its own top bar at
[user/page.tsx:66-68](app/user/page.tsx:66), while the three cards ride `railExtras` at
[:76](app/user/page.tsx:76).

Work:

- [ ] Move `SendMessageButton` out of the top bar (`user/page.tsx:66-68`) and into `railExtras`
      (`:76`) with the three cards.
- [ ] **It is currently `variant="ghost" size="sm"`** — the quietest button the design system has,
      which is the opposite of the brief. Promote it to a normal-weight variant. `outline` matches
      what `ShareCard` and `AccountCard` already use for their actions, so the rail stays coherent
      without anything shouting.
- [ ] **Reconsider the label.** "Send a message" does not say who receives it, and this sits on the
      viewer's _own_ page, which makes the recipient genuinely ambiguous. Something naming the
      destination reads clearer. Same string appears twice — button
      [:28](app/components/SendMessageButton/SendMessageButton.tsx:28) and modal heading
      [:34](app/components/SendMessageButton/SendMessageButton.tsx:34) — change both.

**Open sub-question the brief surfaces but does not settle: ordering by importance depends on who is
looking.** For a signed-in client or follower, messaging the owner is plausibly the most-used thing
on the page, which argues for first position. For the site owner viewing their own `/user`, it is
close to useless — the form would prefill their own address, and they read incoming messages through
Admin → Comments instead, which argues for last or hidden. A single fixed position cannot be right
for both. Decide: one fixed slot, or order the rail on `isAdmin`. Cheapest defensible default is
first for non-admins, last for admins, since the rail is already assembled per-viewer.

The docblock at
[SendMessageButton.tsx:13-19](app/components/SendMessageButton/SendMessageButton.tsx:13) says the
button "sits in the collection header's filter-bar area". That stops being true the moment it moves —
update it in the same commit rather than leaving a stale description behind.

---

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
H1, H2a, H3 — are in `## Group H` above. Sequencing note: **H5 waits on E8**, which already owns the
mechanical half of that component, and **H2b overlaps the 008 `/user` ↔ `/admin/users/[id]` layout
unification** — settle those two together or they will produce two competing designs.

## Session log

_Newest first. **Dates are local (America/Los_Angeles), not UTC** — earlier entries mixed the two,
which is why a "08-23" entry can sit between two "08-24" ones. The ordering was verified correct
against real merge timestamps on 2026-08-24; only the labels were inconsistent. Use local dates._

- 2026-08-24 (4) — **shipped G4's intersection pass (#310) and E4's twins half (#311)**; `main` at
  ac3f4d0. G4: 19 long-and-historical docblocks, not the 12 the baseline predicted — the scan counts
  file headers and one-liners (1,384 blocks vs 865), so the counts are not comparable to the
  baseline table. Intersection cleared 19 → 0, backward-looking 63 (4.6%) → 45 (3.3%), net −50 with
  zero non-comment lines in `git diff -U0`. E4: twins → `entityUtils.ts`; the IMAGE-guard bullet is
  **struck** on the user's call rather than left open, and `buildAssociationDiff` turned up as a
  THIRD non-duplicate and was left alone. Both confirm estimate bias 1 (+44 and −50 vs −80 and
  −300/−500), and E4 exposed **bias 1b**: an extraction also buys a required test suite, which no
  Group E estimate has ever counted — E8, F2 and F5 re-sized off it.
  **Reconcile: all five rows reading "PR #N open" had merged** (B5/#298, E5/#299, E9/#300, G1/#303,
  E10/#304) and their sections' checkboxes were unswept with them; rows, headings and two
  shipped-but-unchecked bullets corrected. Five drifted refs fixed — `Collection.ts:241→266` (mine,
  from #311) and `UserSpace.tsx:108→117` (pre-existing, outside the sweep neighborhood), plus three
  cross-repo refs in C7 (`:67→:64`, `:86→:80`, `:107→:98`). C6 and C7 premises both re-verified and
  still hold. **E13's blocking question answered by reading backend `origin/main`** — `getLocationPage`
  has one image-side matching rule, so E13 is COLD. Next: E13.

- 2026-08-24 (4) — **shipped E13 (#313)**. `main` at 0b0f255. +36 src net / +165 test; the src
  estimate held at +30, the test estimate was 2.75× under. **Six of the 45 added src lines are
  executable** — the rest is docblock, which is worth knowing before reading the next "+N src"
  estimate on this board as if it meant code.
  **Both guardrails held.** `revalidateLocationCaches`'s body is byte-identical; only its docblock
  changed, exactly as the item instructed. `buildAssociationDiff` was not touched.
  **The pre-build check was worth more than the item.** E13's rename bullet asked whether the
  frontend even exposes a location rename. It does — `/metadata` → `MetadataList.handleUpdate` — and
  the backend re-slugs unconditionally (`MetadataService.java:410`), so **the old URL 404s rather
  than going stale**: `getLocationPageBySlug` does `findBySlug(...).orElseThrow(...)` and there is
  no slug-history table. Filed as **E16**, sized, and NOT folded in — the caller is a component
  shared with tags and people, so it needs a callback prop rather than a hardcoded call.
  **The `buildAssociationDiff` report contradicts this board in two places, and the board is now
  corrected.** The mechanism it describes is real, but "moving its callers onto the shared helper
  changes which saves fire" does not follow — the image path calls `updateImages` unconditionally,
  so a diff decides payload contents, not whether a save happens. And "its ids are optional"
  describes an unreachable branch. Both struck in E4's table. Two divergences the board never named
  were added, one of which (duplicate ids surviving in `prev`) is the only one with a reachable
  trigger. **Generalizable lesson: a guardrail can be right to obey and wrong about why**, and this
  board had been re-copying the reason into new items each time it was cited.
  **Two adjacent paths checked and deliberately not wired**, both settled by reading rather than
  assuming: the GIF save path needs nothing, because the orphan query joins `content_image` and
  structurally cannot return GIFs; `handleRemoveFromCollection` IS a real gap and was left out of
  scope with the finding written down rather than silently fixed.
  Suite 243 suites / 4356 tests green. **Verified the new tests fail without the change** — 4 of 7
  do; the other 3 are guards and are labelled as such rather than counted as coverage.
  Next: **E15**, as its own MR.

- 2026-08-24 (5) — **shipped E15 (#314)**, stacked on #313. +22 src net / 14 test call sites.
  Suite unchanged at 243 / 4356, which is the right result for a pure refactor.
  **First call-site estimate on this board to come in OVER** (est. ~20, actual 14). The estimate
  followed the grep-first rule and still missed 30%, because the scan did not balance parentheses —
  every nested call like `createHeaderRow(bare(), 1200, false)` miscounts. **The rule needs the
  qualifier: balance the parens, or grep-first buys less than it appears to.** Both of E15's own
  call-site numbers were wrong for this reason (14 not ~20 to change, 22 not ~16 untouched).
  **E14's self-verification property carried over exactly**, which is the transferable finding:
  changing slot 3 from `boolean` to an object makes every unconverted call a compile error
  (`TS2559`, and `TS2554` for the four-argument form). The compiler enumerated all 14 sites; none
  was found by reading. Two positional-parameter changes in a row now, both mechanical for the same
  TypeScript-specific reason.
  **The board's "roughly net-neutral" line-count guess was wrong** (+22), because an options object
  has to declare and document its keys — `forceRail` especially is not self-explanatory. The
  readability framing it paired that guess with was right, so the item's advice survives its
  arithmetic.
  **Stacked on #313 deliberately.** Both items edit this board, so branching off `main` would have
  conflicted AND re-created the exact trap E14 named — a session working from `main` cannot see an
  item sitting in an open board PR. Merge #313 first.
  **Browser verification blocked, not skipped:** the local Spring Boot backend was down, so every
  page dies at `meServer`'s `/auth/me` with `ECONNREFUSED` before a header renders. Verified by
  types and the 108 `contentLayout` tests instead, and said so rather than implying a visual check.
  Next: **E16**, or E8/F2/F5 — nothing on E13/E15 is left open.

- 2026-08-24 (2) — **shipped E3's generics half (#306) and E14 (#307)**; merged #296 (B8's
  `collectionStorage` slice) first as E3's safety net, and #305 (this board) landed mid-session.
  `main` at ea19883. E3's guardrail held: the `cached.slug !== slug` guards were carried through
  unchanged and **M3 re-verified against the refactored source goes red on 6 tests, up from 4**,
  because the collapsed guard now serves both `get` and `getFull`.
  **Two estimate biases, one new.** E3's "halves the file (~100 lines)" measured the file instead of
  the duplicated region — real saving 46 code lines — and that is independent of the
  source-only-vs-test-coupling bias already on the board; both are now hoisted, and every remaining
  dedup item (E4, E5, E8, E10) should be re-read with the first one in mind. **E14 is the first
  estimate here to land on the nose** (est. −2 src / ~40 sites; actual −3 / 36), and it held because
  it was sized by grepping call sites — the rule this doc already states.
  **One claim was half wrong in a way that changed the code.** E3's "update/updateFull are literal
  aliases" is true of the source and false of what the tests can distinguish: aliasing them merges
  their jest automocks. Probed directly rather than assumed — and **the suites pass either way**, so
  it is a latent trap, not a live failure, and it is written down as such rather than overstated.
  Hoisted, because every twin-collapse item on this board has the same exposure.
  **Process finding:** #307 never saw E14's suggested options-object alternative, because E14 was
  defined in the then-unmerged #305 and was invisible from `main`. Filed the alternative as **E15**
  and hoisted the lesson. E3 is now ◐ with one yes/no left for the user (keep the guards —
  recommended — or delete them); nothing about it needs further investigation.
  **Filed G4** on the user's request, from #301's 30-line `revalidateLocationCaches` docblock.
  Measured a baseline rather than filing a vibe: 865 docblocks in `app/`, 53 over 20 lines, 57 with
  backward-looking language ("used to" ×23, "no longer" ×11), 12 both. The sharp finding is that
  **#301's "known gap" paragraph IS E13** — a tracked item copied into a docblock, which goes false
  the day E13 ships. Also named why `CLAUDE.md`'s existing rule misses this: its escape hatch is
  "split the function", which assumes a long docblock means the function does too much, and here the
  function is small and the docblock is carrying decision-record content.
  **Verified the merge order for the 8 open PRs** rather than guessing: 76 files touched, 76 unique,
  so zero overlap. Trial-merged all 8 onto `main` in sequence — every merge clean, `tsc` clean at
  each step, combined suite 242 suites / 4325 tests green, eslint and stylelint clean. Order is
  therefore a convenience call, not a risk one. Two risks I had flagged did not exist: #299 touches
  `contentLayout.ts` but never `createHeaderRow`/`chunkSize`, and #301's new test builds its own
  fixtures rather than importing the ones #298 rewrites.
  Next: **G4**, then E4.
- 2026-08-24 — **ten items shipped as parallel agents**, PRs #294–#304, plus #305 (this board) and
  #297 (restores a test #294 dropped). Merged so far: #294, #295, #302. Four board claims disproved,
  two estimate biases named, three standing traps hoisted into "how to use this doc". Filed E13 and
  E14. Corrected H1's test ref (drifted `:238-262` → `:252-276`). Settled two blocked questions by
  looking: the repo has **no CI at all**, and the class-key guard would span 104 files / 401 reads.
  Next: **E3**, once #296 merges.

### 2026-08-23/24 — ten items as parallel agents, one worktree and one MR each

Ran B5, B6, B8 (two slices), E5, E9, E10, E12, G1 and H2a+H3 concurrently in ten git worktrees under
`.claude/worktrees/`, each on its own branch off `53aaac4`. Every item produced a PR: #294–#304.

**Merge state, updated 2026-08-24:** #294, #295 and #302 merged. #296–#301, #303, #304 and the
board PR #305 open. #297 restores a test #294 dropped and should merge before anyone trusts
`CollectionContentRenderer`'s coverage.

**Open decisions for the user — nothing else in these MRs is blocked.**

1. ~~**The H3 label (PR #302).**~~ **SETTLED by merge, 2026-08-24.** #302 merged at `4cd41f2`,
   so "Contact the photographer" is live in both the button and the modal heading. Changing it is
   now an ordinary one-line copy edit, not a pending decision — if it reads wrong in use, file it as
   a new item rather than reopening this one. Note the rename also reached a docblock in
   `app/lib/api/share.ts`, which quotes the old string; that was updated in the same PR.
   Original text: "Send a message" became "Contact the photographer" in both the button
   (`SendMessageButton.tsx:28`) and the modal heading (`:34`). It names the destination and matches
   the menu's existing "Contact" vocabulary. Reads slightly oddly on the owner's own `/user`, though
   the ordering change already puts it last for admins. One word replaces it.
2. **E3 and the `cached.slug !== slug` guards (PR #296).** See the rewritten E3 bullet. E3 may still
   delete them, but as a reviewed behavior change, not as dead-code removal.
3. **`RolesPanel.module.scss`'s `--color-danger` hover** (now `:65`, not `:72`). Left alone by #304
   as a visible design change.
4. **Extending the CSS-module class-key guard beyond the admin panels.** See the standing trap in
   "How to use this doc".
5. **`.srOnly`** — unchanged, still the G2-style user call it always was.
6. **Enforcing the archive rule mechanically.** ⛔ USER DECISION, but **narrowed by fact on
   2026-08-24: this repo has no CI.** `.github/workflows/` does not exist, so G1's suggested CI
   check is not a small addition — it means standing up GitHub Actions first. The PR-template
   checkbox is the only cheap option on the table today. Decide between "add a PR template now" and
   "stand up CI, and let this ride along with it"; do not treat the CI check as a quick win. `previous-work.md` has now gone stale twice. G1
   proposes a PR-template checkbox or a CI check that its newest PR number tracks `main`. The CI
   check is the one that would actually fire: two PRs were merged by hand mid-run without the book
   being updated.

**Process findings worth keeping.**

- **A PR merged while its branch head has moved silently drops the newer commits.** #294 merged at
  `bc4d84b`; the fix for its one real defect was pushed to the branch afterward as `8210dd4` and
  never landed. Caught only because a follow-up agent re-checked. PR #297 restores it. After merging
  anything during a parallel run, check `git diff <mergedSha> <branchHead>`.
- **A usage limit killed 8 of 10 agents mid-flight and no work was lost** — every worktree survived
  exactly as its agent left it. Killed agents are **not** resumable after a session restart, so the
  worktree is the handoff artifact: re-dispatch a fresh agent with the inherited `git diff`, an
  instruction to treat it as a draft to audit, and the specific thread the dead agent was on. That
  last part matters most — two of the three test-that-cannot-fail findings came from partial thoughts
  in a killed agent's final message.
- **Fresh agents auditing an inherited draft found real defects in it every time**: a module-scope
  `Set` shared across three relation triples (B5), a union spreading the same array twice with a
  docblock justifying it falsely (E12), a deleted `.loadError` leaving a dangling class in a fifth
  copy nobody knew existed (E10), and docblocks citing a file that does not exist (E9). Inheriting a
  draft is not the same as inheriting working code.
- `git worktree add` under `.claude/` needs the command sandbox disabled, and it fails in a way that
  **creates the branch but not the directory** — the retry then reads as "branch already exists".
  Recover with `git worktree add <dir> <existing-branch>` (no `-b`). `git push` and `gh` also need
  the sandbox off. `node_modules` clones per worktree with `cp -Rc` for no measurable disk.

**Ref drift found this run:** C7's share-mapping refs are at `:50, :64, :80, :98` (filed as
`:50, :67, :86, :107`). `AdminCard.tsx:41` is `</li>`; the `NavLink` is at `:40`. `RolesPanel`'s
danger token is at `:65`, not `:72`. `TODO(A3)` moved `:1353` → `:1562` and is now referenced by
marker name instead of line number.

**C7 re-confirmed independently** by #295: every `share.ts` endpoint maps to a real controller except
`${SHARE}/email`. `UserShareControllerProd` has exactly four mappings and no `/email`.
`messages.ts` does **not** have the same problem — its two calls match `MessagesControllerAdmin`
exactly. One asymmetry worth knowing: the backend clamps `limit` to 200 and returns the clamped
value; the frontend does not clamp. Nothing depends on it today.

One line per `/next` run. The newest entry is here; older entries are in
[session-log.md](2026-summer-refactor/session-log.md). Three consecutive entries ending in the same `Next:` means
that item is being avoided, not scheduled — make it real work or drop it from the board.

- 2026-08-24 (3) — **six MRs merged in one sitting**, run as parallel agents in separate worktrees:
  B1 (#290), B2 (#288), B3 (#287), B4 (#289), B7 (#286) and C8 (#291). `main` at a5a7080. All six
  write-ups moved out in this commit — B-items to `group-b-tests.md`, C8 into `group-c-bugs.md` —
  which is **the archive rule's first test under load, and it held.** Six items closing at once is
  exactly where the two previous consolidations failed.
  **Every Group B estimate came in short, in the same direction**, because each counted repeated
  text and assumed repetition meant redundancy. B4 was off by roughly an order of magnitude. Two
  items moved the opposite way from subtraction: B3's test count went up 106 → 107, B7 gained a
  behavioural test. B5, B6 and B8 should be re-estimated as merges.
  **Four of five duplication claims were wrong; B1's held.** B3's was the dangerous one — deleting
  the "duplicate" `buildLensDiff` suite would have removed all coverage of a live source function,
  because `buildCameraDiff` and `buildLensDiff` are two separately copy-pasted functions, not one
  shared builder. **Refs were fine everywhere**, and B3's needed no correction at all. Claims and
  refs fail independently, and only refs had ever been drift-checked. Both lessons hoisted.
  B1 settled E11's guardrail with a six-mutation table: folding the revalidate suites into the drift
  test loses four of six catches, because a source scan cannot tell a tag that is posted from a tag
  that is merely written down. Both suites stay; stop re-asking.
  Filed **C9** (a dimensionless cover renders no header while a missing cover renders one) and an F3
  bullet for the stale `logger.warn('manageUtils')` labels. The archive rule was **amended**: the
  invariant is reachability, not status.
  Next: B5.
- 2026-08-23 — **Not a `/next` run: six feature requests filed from a user design review of `/user`.**
  Filed as Group H. Only H1, H2a and H3 got board rows; H2b/H4/H5/H6 are a design review, an ops
  project, a second design review and a vision item, so they went to
  [group-h-features.md](2026-summer-refactor/group-h-features.md) with a pointer under "What to
  build next". **The rule that decided the split is reachability, not status** — F4 and G3 are ⛔ and
  still carry rows because each has a self-sufficient live section, so H3 (a decision gating a ±40
  MR) got the same treatment and the four non-MRs did not.
  Three parallel explorers gathered the refs; **three of their claims were checked and two were
  wrong in a way that changed the item.** H5's "should we have this menu on desktop" assumed no
  desktop treatment exists — there are eight `@media (width >= 768px)` blocks and a JS click-outside
  branch at `BREAKPOINTS.mobile`. H5's "make About add a component to the page" assumed About is a
  route — there is no `app/about/`; it is already an inline `Disclosure`, and `About.tsx` is 33
  lines, props-free and droppable anywhere. Both sub-questions changed meaning once checked.
  Filed **C7** from the H4 research: `emailShareLink` (`share.ts:176`) POSTs to
  `/api/read/user/share/email`, which no controller declares. The peer session pushed back on a
  zero-hit grep as the C4 failure mode, correctly — so it was re-verified three ways before filing
  (button reachable in prod with no gate; every controller mapping on backend `origin/main` is a
  string literal, so no template route can hide; the sibling `ShareControllerProd` at
  `/api/read/share` cannot match on prefix). All three are recorded in the item.
  Also corrected the roadmap's "invite links are clipboard-only" claim — invite email is built and
  wired, the blocker is operational — as a sixth G1 bullet.
  Coordination: this ran alongside the #285 archive split in the SAME checkout. Nothing was written
  until #285 merged and a branch was cut off `main`. A first draft was misfiled into the archive
  directory and deleted once the shipped-only rule was checked at lines 120-123.
  Next: H2a — smallest of the three and startable today, but H3 is a one-line user decision that
  gates it, so ask first.
- 2026-08-24 — **Group C is closed except the backend-blocked C6.** Shipped C4 (#279, +155 −62),
  E11 (#280, +277 −28), C2 (#281, +99 −5), C3 (#282, +121 −10), C5 (#283, +497 −101); all five
  merged, `main` at 2e7a184. Estimates on the board rows were replaced with measured diffs.
  **Two of the four bug items named something that was wrong, in two different ways.** C4's audit
  table called `collection-home` a dead tag; it is `collection-${slug}` resolved for the home
  collection, invisible to the literal grep the audit was built from — so C4 shipped as four dead
  tags, not five, and the fix for the fifth was to keep it and write down why. C3's prescribed fix
  was correct for the optimistic update and destructive for the rollback, which needs to
  inverse-apply against current state; following it literally would have dropped a concurrent
  toggle. Both lessons are hoisted into "How to use this doc" — an audit's _method_ is a claim, and
  a prescribed fix has to be checked on the _error_ path, not just the happy one. C5, by contrast,
  was true on all five bullets, which is what makes the other two worth flagging rather than
  assuming the board is generally unreliable. C5's proxy bullet turned out understated: the raw
  error log does serialise its `cause` chain including the upstream `host:port`, proven by a test
  that goes red against the old code — still not a token, so it stays out of Group D.
  #282 needed a rebase after #281 merged; both had edited the same two rows of the MR board table.
  Next: B1.

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
