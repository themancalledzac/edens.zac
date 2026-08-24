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
  rule above covers a spec'd *mechanism*; this one covers a spec'd *fact*. D9 is the worked example:
  the entry asserted "no test would catch it if the redundancy reasoning were wrong", and that was
  false. Deleting the redundant literals and then simulating the feared change turned an existing
  test red at once. The entry had mistaken tests that pass *because the reasoning is right* for
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
  inverse-apply against whatever the state is *when the persist rejects*, not against a set captured
  when the toggle started. Following the item literally would have made a second toggle vanish
  whenever the first one failed. Error paths run late, hold stale closures, and are the least
  covered part of any file — read the failure branch before adopting a one-line prescription.
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

| MR | Scope | Risk | Est. diff | Status |
| --- | --- | --- | --- | --- |
| A1 | Dead whole files + their tests | Minimal | −1,261 | ✅ PR #255 |
| A2 | Dead exports in `lib/api` | Minimal | −283 | ✅ PR #256 |
| A3 | Dead half of `metadataUtils.ts` | Minimal | −400 src, −500 test | ✅ PR #257 |
| A4 | Dead small utils, constants, type guards | Minimal | −652 | ✅ PR #258 |
| A5 | Gray overlay never paints on the manage grid (BUG) | Low | ±40 | ✅ PR #260 |
| A6 | `CollectionListSelector` flat mode | Medium | −223 net (−183 src/scss, −40 test) | ✅ PR #261 |
| A7a | `useCollectionEdit` legacy aliases | Minimal | −8 | ✅ PR #259 |
| A7b | `enterSelect`/`enterAdd` inline copies | Low | −2 src | ✅ PR #262 |
| A8 | Dead SCSS in live modules + `globals.css` tokens | Low | −327 | ✅ PR #263 |
| A9 | Dead config | Minimal | −35 | ◐ PR #259; 3 follow-ups open |
| B1 | Merge `manageUtils.test.ts` | Low | −209 net (est. −450) | ✅ PR #290 |
| B2 | `rowCombination` characterization dedup | Low | −229 (est. −250) | ✅ PR #288 |
| B3 | `metadataUtils.test.ts` dedup | Low | −125 (est. −200 to −300) | ✅ PR #287 |
| B4 | `contentLayout.test.ts` merge | Low | −32 (est. −150 to −250) | ✅ PR #289 |
| B5 | `useCollectionEdit` fixture consolidation | Low | −350 | ☐ |
| B6 | Fold in `CollectionContentRenderer` characterization | Low | −150 | ☐ |
| B7 | `useClickOutside` spy tests | Low | −37 (est. −90) | ✅ PR #286 |
| B8 | Fill the required-coverage gaps | Low | +1,100–1,650 for the 4 open bullets (est. +600 for all 6) | ◐ 2 of 6 — PR #266 (clearCache), PR #267 (Escape) |
| B9 | `useCollectionEdit.buffer.test.tsx` flakes under parallel load | Low | unknown until it reproduces | ☐ 0/13 locally — reproduce under other conditions, do not re-measure here |
| C1 | Unsaved people/gallery-access wipe (HIGH) | Low | +73 −11 | ✅ PR #264 |
| C2 | About portrait aspect ratio | Trivial | +99 −5 | ✅ PR #281 |
| C3 | `SelectsContext.toggle` purity | Low | +121 −10 | ✅ PR #282 |
| C4 | Cache tags that never connect | Low | +155 −62 | ✅ PR #279 |
| C5 | Assorted LOW bugs | Low | +497 −101 (11 files) | ✅ PR #283 |
| C6 | Password cover strip missing on the public card path | Low-medium | ±30 | ⛔ BACKEND-BLOCKED (split out of E1) |
| C7 | `emailShareLink` POSTs to a route that does not exist | Low | ±40 src, +30 test | ☐ (FE built, BE missing — decide build vs hide) |
| C9 | Dimensionless cover renders no header, missing cover does | Low | ±20 src, +40 test | ☐ (found by B4; needs a decision first) |
| C8 | Unfollowing leaves the chip count stale | Low | +418 −22 (est. +40/+80) | ✅ PR #291 |
| D1 | Gate `POST /api/revalidate` (HIGH) | Low | +175 | ✅ PR #265 |
| D2 | Gate `clearCacheAction` | Low | +212 (est. +15) | ✅ PR #266 |
| D3 | Security headers | Low-medium | +60 src, +0–40 test | ✅ PR #274 |
| D4 | Pin the CloudFront host | Low | ±1 (actual ±1) | ✅ PR #272 |
| D5 | Proxy path reject + `/cdn` matcher removal | Low | ~+30 net (−27 src, +6 reject, +40–60 test) | ✅ PR #273 |
| D6 | Shared Origin allowlist (CSRF on `/api/revalidate`) | Low-medium | +75 src, +230 test (est. ±60) | ✅ PR #270 |
| D7 | Wrong danger token on error text (a11y) | Trivial | 0 (rode #253) | ✅ via PR #253 |
| D8 | Normalize `NEXT_PUBLIC_APP_URL` in the Origin allowlist | Trivial | +30 src, +52 test (est. ±5 src, +2 test) | ✅ PR #276 |
| D9 | Decide: redundant localhost literals in the Origin allowlist | Trivial | −5 src, +20 docblock, +7 test | ✅ PR #277 — deleted |
| E1 | Parallax-card builder consolidation | Medium | +98 src, +659 test (est. −120) | ✅ PR #269 |
| E2 | `core.ts` fetch skeleton + `clientFetch` | Medium | ~0 net (−180 src, +150–200 test) | ☐ |
| E3 | `collectionStorage.ts` generics | Low | +50–150 net (characterize first) | ☐ |
| E4 | Entity-diff generics + one IMAGE guard | Medium | −80 (A5 landed the guard half) | ☐ |
| E5 | Filter/sort/date duplication | Low | −50 src, +30–60 test (2 bullets struck) | ☐ |
| E6 | `useCollectionEdit` refresh helpers | Medium | −90 src, ±100 test churn | ☐ |
| E7 | `useFilteredContentBlocks` hook | Medium | +100–200 net (new hook suite) | ☐ |
| E8 | Renderer + `MenuDropdown` dedup | Medium | −120 src, +0–50 test | ☐ |
| E9 | Download icon/hook, auth-card SCSS, `.srOnly` | Low | −100 src, +80–150 test | ☐ (srOnly bullet: user call) |
| E10 | Admin panel dedup (`LoadError`, `.viewAll`, literals, comparator) | Low | −60 src, +120 new | ☐ (unblocked — #253 merged) |
| E11 | Make cache-tag register/revalidate drift detectable | Low-medium | +277 −28 | ✅ PR #280 |
| E12 | Wire up `collections-location-${slug}` | Low-medium | +30 src, +60 test | ☐ (was buried in C4; unblocked by #280) |
| F1 | Decompose `useCollectionEdit.tsx` | Medium-high | ~neutral | ☐ |
| F2 | `RendererContext` for the BoxRenderer tree | Medium | −100 | ☐ |
| F3 | File moves and renames | Medium | ~neutral | ☐ |
| F4 | `TaxonomyPage` ← `LocationPageClient` | Medium | −150 | ⛔ USER DECISION |
| F5 | `FullScreenModal` link + resolver cleanup | Low | −30 | ☐ |
| G1 | Docs corrections | Trivial | ±50 | ☐ |
| G2 | Inline-comment enforcement + migration (decided: keep the rule) | Low | ~neutral (relocation + splits) | ◐ wording PR #268; G2a COLD, G2b ⛔ scope call, G2c ⛔ rides refactors |
| G3 | `/user/selects` decision | — | — | ⛔ USER DECISION |
| H1 | Merge `Following` into `Collections` on `/user` | Medium | −60 src, ±150 test churn (6 test files) | ☐ (do C8 first) |
| H2a | `/user` rail copy pass + chip-style the Admin links | Low | −25 src, +60–120 test (new `AdminCard` suite) | ☐ |
| H3 | `Send a message` into the rail as a plain button | Low | ±40 | ☐ direction decided; ride H2a |

Groups A and B together are ~5,000 lines removed at near-zero regression risk.

**Shipped write-ups are not on this page.** Groups A, C and D are closed and their sections live
in [`2026-summer-refactor/`](2026-summer-refactor/), one file per group, plus the session log.
A row here with a PR number is the whole live record of that item; the archive has the detail.

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
direction, for the same reason: it counted repeated *text* and assumed repetition meant redundancy.
−450 → −209, −250 → −229, −200/−300 → −125, −150/−250 → −32, −90 → −37. B4 is the extreme, off by
roughly an order of magnitude, because its "duplicate" describes turned out complementary — so the
work was merging, not deleting. Two items moved the opposite way from subtraction entirely: B3's
test count went **up** (106 → 107) and B7 gained a behavioural test. **Re-estimate the three
remaining items as merges, not deletions.**

### ☐ B5 · `useCollectionEdit` fixture consolidation

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
`--runInBand`, 230 suites / 4126 tests / ~11.6s per run. Zero total failures and zero failures of the
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
**VERIFIED 2026-08-23: this is a BACKEND item, not a frontend one.** `ContentCollectionModel` has
zero `isPasswordProtected` — grep the interface in `app/types/Content.ts` and confirm. Only
`CollectionModel` carries it ([Collection.ts:241](app/types/Collection.ts:241)). So the public card
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
      `@GetMapping` `:50`, `@PostMapping("/rotate")` `:67`,
      `@PutMapping("/collections/{collectionId}")` `:86`,
      `@DeleteMapping("/collections/{collectionId}")` `:107`.
- [ ] The UI is fully built and reachable: input and Send button at
      [ShareCard.tsx:183-200](app/components/Personal/ShareCard.tsx:183), handler `handleEmail` at
      `:112-121`. The 404 surfaces as the generic "Could not send that email" at `:121`, so it reads
      as a transient failure rather than a missing feature.
- [ ] The `ShareEmailResult { sent, reason }` contract at
      [share.ts:60-63](app/lib/api/share.ts:60) was written against a backend that was never built.

**Three claims checked, not assumed** — the C4 lesson is that a literal grep can report a live route
as dead when the real one is assembled from a template, so all three were run before filing:
(1) *Reachable in production?* Yes. The Send button renders in the `settings.exists && shareUrl` arm
of `ShareCard.tsx` (from `:167`) with no env gate, no `isAdmin` gate and no feature flag; it enables
as soon as the input is non-empty. (2) *A mapping built from a constant or template?* No. On backend
`origin/main` every mapping annotation under `src/main/java/**/controller/**` is a plain string
literal; the only four that are not bare `Mapping("…")` are `@PostMapping(value = "/literal",
consumes = …)` forms, still literals. There is nowhere for a template-assembled route to hide.
(3) *A sibling controller that could catch it?* There is a second share controller,
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
- [ ] Whichever way it goes, pin it. Neither path has a test asserting the *contrast*, so a future
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

### ☐ E3 · `collectionStorage.ts` generics

- [ ] `update`/`updateFull` are literal aliases of `set`/`setFull`. The `get`/`set`/`clear` pairs differ only in key prefix and type — one generic pair halves the file (~100 lines).
- [ ] The `cached.slug !== slug` checks can never fire. Remove them.

### ☐ E4 · Entity-diff generics + one IMAGE guard

- [ ] `isImageContent` ([contentFilter.ts:68](app/utils/contentFilter.ts:68)) vs `isContentImage`
      ([contentTypeGuards.ts:23](app/utils/contentTypeGuards.ts:23)) — two exported IMAGE guards, and
      no import cycle justifies the copy. Consolidate on `isContentImage`. (The other half of this
      item — `checkImageVisibility` — already landed via A5/PR #260; the −150 estimate predates that
      and is now −80. Keep thin public wrappers on the twins so both existing suites pass unchanged.)
- [ ] `tagUtils.ts` and `locationUtils.ts` are line-for-line twins — generic `convertToModels<T>` / `buildEntityDiff<T>`.

### ☐ E5 · Filter/sort/date duplication

- [ ] `FILTER_PARAM_KEYS` in `useFilterUrlState.ts` hand-mirrors `serializeFilterToParams`; the "MUST mirror" comment is a drift warning. Export the key list from `contentFilter.ts`.
- [x] ~~`sortContent.ts` / `sortByDate.ts` mirror `contentFilter`'s merge/sort pair~~ — STRUCK
      2026-08-22: false. `sortContent.ts` *imports* `isDateable`/`mergeDateSortedImages` from
      `contentFilter` and `sortByDate` from `sortByDate.ts`; its own docblock documents the
      placement as an import-cycle necessity. There is no duplicate.
- [ ] `collectionDates.ts`'s `MONTH_NAMES` duplicates `formatDateRange.ts`'s `MONTHS_LONG` (`:34`).
      (`formatDateRange` has no `MONTH_NAMES`; its short list is distinct. Corrected 2026-08-22.)
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

### ☐ E10 · Admin panel dedup — found reviewing PR #253, 2026-08-22 — UNBLOCKED (#253 merged)

All four panels are on main as of 79fbca5, so every bullet below is now startable — the former
branch-only refs (CollectionsPanel) are main refs. Verified byte-identical by `diff` (re-hashed
2026-08-22), not by eye. COLD.

- [ ] `.loadError` is byte-identical in `CollectionsPanel`, `RolesPanel` and `UserManagementPanel`;
      `.error` is byte-identical in `CollectionsPanel` and `RolesPanel`. The 6-line retry block
      (`<div role="alert">` + `<p>` + Retry `<Button>`) is identical in all four .tsx files.
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

### ☐ E9 · Download icon/hook, auth-card SCSS, `.srOnly`

- [ ] `ClientGalleryDownload` and `FullScreenDownloadButton` share an identical SVG and an identical download-navigate/reset-timer pattern → `DownloadIcon` plus a small hook.
- [ ] The login and invite `page.module.scss` files are byte-identical (29 lines) → one shared auth-card style.
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

### ☐ G1 · Docs corrections

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
  [UserSpace.tsx:108](app/components/UserSpace/UserSpace.tsx:108), rendered at
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

Tests that will need updating: `tests/app/user/page.test.tsx:238-262` (chip labels, counts, hrefs),
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
      viewer's *own* page, which makes the recipient genuinely ambiguous. Something naming the
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
[group-h-features.md](2026-summer-refactor/group-h-features.md). The three that *are* board work —
H1, H2a, H3 — are in `## Group H` above. Sequencing note: **H5 waits on E8**, which already owns the
mechanical half of that component, and **H2b overlaps the 008 `/user` ↔ `/admin/users/[id]` layout
unification** — settle those two together or they will produce two competing designs.

## Session log

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
  toggle. Both lessons are hoisted into "How to use this doc" — an audit's *method* is a claim, and
  a prescribed fix has to be checked on the *error* path, not just the happy one. C5, by contrast,
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
