# 2026 Feature Board — Living Checklist

_Origin: sprint-planning sweep of 2026-08-30. Three parallel agents inventoried
`docs/superpowers/specs/` (22 docs), `docs/superpowers/plans/` (38 docs), the numbered review docs
(`docs/000`–`009`), `docs/handoffs/CURRENT-STATE.md`, and the backend board, then reconciled every
candidate against code and git history. This board carries FEATURE work — designed-but-unbuilt or
partially built product capability. Cleanup, refactors and bug fixes stay on
[2026-summer-refactor.md](2026-summer-refactor.md); nothing is ticketed on both boards._

**This file is a running to-do list, not a one-shot report.** Work is split into numbered items in
lettered groups, sized where possible to land in a single sitting. Check the box when the MR
merges, and put the PR number next to it. Detail and context live in one tracked file per group
under [`2026-features/`](2026-features/) — the board row plus its group-file section is an item's
whole record.

> **Two tiers, same rule as the refactor board.** This file carries only open rows and short live
> sections. Each group has a context file in [`2026-features/`](2026-features/) carrying the
> feature's design context, spec pointers and full work breakdown. When an item closes, its
> write-up moves into a "Closed" section of its group file and the row comes off this board. The
> session log keeps the newest two entries here; older entries move to
> [2026-features/session-log.md](2026-features/session-log.md).
>
> **Why the group files exist at all:** most of the design record lives in `docs/superpowers/`,
> which is **gitignored** — unversioned, local-disk only. Every fact an item needs has been copied
> into the tracked group file. Do not plan from a `docs/superpowers/` path alone; if a spec detail
> matters, it belongs in the group file.

> **A cross-board review handoff was written 2026-09-04:**
> [2026-features/2026-09-04-board-review-handoff.md](2026-features/2026-09-04-board-review-handoff.md).
> It records what was re-run and what had drifted at `main` @ `29bd30f0`, and it names claims on
> BOTH boards that were false — including three items marked COLD that had already shipped.
> **Applied 2026-09-05**: seven read-only review slices and one apply pass brought both boards,
> their group files, the archives and the tracked `docs/00x` chapters into line with `main` @
> `699aa4f2`. The handoff's own four wrong claims are corrected in its preface.

## How to use this doc

- One MR per numbered item slice (`SD1`, `RC2`, …). Do not bundle across items. Open every PR with
  `--base main`.
- Every MR ends with the standard verification: scoped `eslint --fix` → `prettier --write` →
  `tsc --noEmit` → full `jest`. SCSS changes also verify by `next build` or a resolution assertion.
- **A doc's "blocked on backend" claim is a claim, not a fact.** This board was born from four docs
  asserting the search endpoints were missing while all three sat live in
  `ContentControllerProd.java`. Before honoring any blocked status, grep the backend controller.
- **Never open an MR or write a board row in `edens.zac.backend`.** That repo has its own agent and
  its own board; a second writer there collides with work in flight. Settled by the owner
  2026-09-01, after this board's own run instructions sent a frontend session to build two backend
  MRs and append rows to the backend board while another session had it open and dirty. This board
  stays the product-level view across both repos, but a backend item gets specced here and handed
  off — [2026-features/backend-handoff-MA4-RC1.md](2026-features/backend-handoff-MA4-RC1.md) is the
  worked example. Keep the row here for the frontend half only.
- **A rule is not in force until it is on `main`.** The commit carrying the rule above was dropped
  by the squash-merge of #394, which took only that PR's first commit. For four hours the board
  went on telling sessions to do the opposite of what had just been decided. After any PR merges,
  check every commit that was on the branch:
  `git merge-base --is-ancestor <sha> origin/main`. A squash whose `--stat` lists fewer files than
  the branch touched has dropped something.
- **Stale-spec quarantine.** These specs will actively mislead a planner and must be re-read
  against current code before use: `2026-07-06-collections-as-tags-design.md` (pre-typeless; whole
  type model renamed), `009-abac-access-control.md` (`gallery_access` table deleted),
  `2026-07-06-email-ses-production.md` (§1 factually false — invite email now exists),
  `006-frontend-audit.md` (dead file paths), `008-staging-collection.md` (targets a deleted enum).
  The group files record what survives from each.
- Decisions the user has not made are batched in "Decisions for Zac" below. Ask them at the START
  of a session, batched, so an answer can become one of the run's MRs.
- The refactor board's estimate biases apply here too: extractions cost docblocks plus a required
  new test suite; test-side effort on items that add a caller or prop runs ~2.3× estimate.
- **A numeric API parameter no test exercises against the real backend needs a live check or a
  pinned bound.** SD1 shipped with `size: 500`; the backend caps `size` at 200 and _rejects_ rather
  than truncating, so the whole route 500'd — and **all 4497 tests passed** with the broken value,
  because nothing mocks the real validation. The browser check found it. Applies next to RC2's
  `?limit=5` and MA5's paging.
- **Grep the other repo's `origin/main`, never its checkout.** `edens.zac.backend` keeps
  `.claude/worktrees/` copies of the whole source tree, so an unscoped `grep -rn` returns three
  hits for every real one and will happily confirm a symbol that does not exist on `main`. Use
  `git grep <pattern> origin/main -- src/`. This is how MA1's missing endpoint was nearly missed.
- **Re-run a recorded number; never re-read it.** Two items were found wrong on 2026-08-31 by
  running their own commands: LY2's collapse-state heights (a fourth admin panel had moved the
  pathology, so the row named the one state that is now fine) and PF6's `// Future:
reportToService()` seam (it does not exist — `logger.ts` is 14 lines of `console.*` wrappers).
  Neither sat near anything that had merged, so a drift sweep scoped to the last run's files would
  have missed both. Record the command beside any number you write, so the next pass checks it
  rather than re-deriving it and disagreeing. Claims about **versions and support schedules**
  (`engines.node`, LTS status) go stale on the calendar's schedule rather than the repo's — re-check
  those every run regardless of how recent the sentence looks.
- **A "small" that touches a SHARED component costs its own change plus every consumer's tests.**
  Three of this run's four items were sized by counting the source edit alone and all three came in
  several times over. EM5 was "one callout in the access section" and landed +222/−36 across **12
  files**: one prop on `useCollectionEdit` pulled in the shared test fixture and three suites. SD3
  was "one slice" and landed +314/−56 across **8 files**, because fixing the badge's accessible
  name meant a new prop on `FilterChip`, which every other chip consumer's tests then had to keep
  passing. This is the same arithmetic as the PF8 rule below, but the trigger is different and
  easier to miss: PF8 was a batch of three, these were single items whose blast radius ran through
  a shared primitive and its fixtures. Before sizing anything as "small", ask which shared file it
  touches and count that file's test consumers.
- **A batch item costs the sum of its parts plus their tests.** PF8 was three "smalls" and landed
  +455/−108 across 14 files, several times any one part. Size a batch by adding up, not by its
  largest member.
- **A framework capability is a version claim — check it against the installed version's own docs
  before sizing an item on it.** PF13 was sized and guardrailed as "PPR the home page only", which
  was true of Next 15's per-route `experimental_ppr` and is false in the 16.3.1 this repo runs:
  `cacheComponents` is app-wide and errors 19 of 21 route segments the moment it is on. The docs
  ship in the repo — `node_modules/next/dist/docs/` — so this costs one grep, and reading them also
  turned up a root-layout `new Date()` that blocks every prerender regardless. Anything an item
  assumes about "we can scope this to one route" is the sentence to check first.
- **"Frontend-only" is a claim about the backend's write semantics — read them before sizing it.**
  EM2 sat COLD for two passes while both argued over whether the frontend control existed. It did.
  The blocker was that one backend column is written by exactly one method, which overwrites the
  whole value while mailing every entry in it, so the two halves of the deliverable are
  structurally exclusive from this repo. Grepping the frontend can only ever confirm the frontend;
  before ticketing a reshape as FE, read the write path that stores what it reshapes.
- **A drift-guard test guards only what its fixture sets.** SD3 added a `year` URL param and
  `contentFilter.filterParamKeys.test.ts` — whose entire job is catching exactly that omission —
  passed green, because `EVERY_CRITERION` did not set `years`. A guard keyed on "every field"
  needs the fixture updated in the same change that adds a field, or it silently stops guarding.
- **Run the close-out's ref sweep AFTER that session's own PRs merge, not before.** Both refs that
  moved on 2026-08-31 (5) were moved by that same session: #376's `year` key pushed
  `FILTER_PARAM_KEYS` from `:670` to `:689`, and #375 deleted the `Footer.tsx:29` `new Date()` that
  the PF13 section went on describing in the present tense as a live blocker. The third principle
  says drift lives in the neighbourhood of what shipped — the sharpest case of that is what YOU
  just shipped, and it is the case a sweep run before merging cannot see.
- **The local backend writes to PRODUCTION. There is no local database.** Port 5432 is an autossh
  tunnel to the production EC2 (`ps aux | grep 'ssh.*5432'`), and the backend container's
  `SPRING_DATASOURCE_URL` is `host.docker.internal:5432/edens_zac`. Every admin mutation made at
  localhost:3000 or :8080 edits live rows — real users, real collections. This constrains every MA
  item and anything touching admin writes: do not exercise a destructive feature against localhost
  to test it, and never build a dev-only auth bypass or session-minting route, which against this
  datasource is a real hole rather than a convenience. Verified 2026-08-31 (7); on `main` since
  #383 merged 2026-09-01 — README's "Working on admin pages" section carries the login flow.
  Related: an agent cannot obtain an admin session on its own, because the only working password is
  the owner's own — `ADMIN_BOOTSTRAP_PASSWORD` seeds a user that does not exist yet and does
  nothing for an existing account. The working flow is signing in at `/login`.
- **Check whether a row's work already shipped before sizing it.** Board rows are a plan written at
  a point in time, not a description of current state, and this board has now mis-sized four items
  the same way. MA4 listed "read/delete/search" as three unbuilt slices when **delete was already
  complete on both ends** — endpoint, hook, optimistic rollback, button. AU4 proposed building a
  local-session affordance when the `/login` form already worked. SD3's "removable badges +
  Clear-all" was half-built. MA1's `TODO(A3)` sub-task named a feature that had already shipped. The
  check is one grep per named deliverable, in this repo **and** the backend's `origin/main`, and it
  has changed the size of four separate items.
- **A verified feature can still be the wrong feature. Ask before adding a facet.** SD3's
  focal-length dimension was built to this board's spec, passed 4648 tests, was checked against
  live data and browser-verified — then dropped before merge because it was not wanted. Every
  guardrail here is about building the thing _right_; none of them asks whether to build it at all.
  For a slice whose whole value is "one more way to narrow a list", on a bar that already carries
  several, the cheap check is a question up front, not a browser pass at the end. Applies to the
  remaining SD3 slices first.
- **A fix is not verified by the absence of the string it moved.** PF13 step 1 shipped as #375 and
  the board recorded its blocker CLEARED, on the evidence that
  `grep -c 'new Date' app/components/Footer/Footer.tsx` returns 0. It does — the call moved to
  `CopyrightYear.tsx`, and a Client Component is still server-rendered during prerender, so the
  build error it was meant to remove is still there. The grep proved relocation and was read as
  removal. When an item's deliverable is "X no longer happens", the check has to be X not
  happening — here, a build — not the symbol being gone from the file it used to be in.
- **`instant = false` is a validation opt-out, not a rendering one.** The whole PF13 step-2 plan
  rested on the codemod making unconverted routes safe. It does not: the build still renders those
  trees, so it still calls the backend and still evaluates synchronous IO. `/search` failed the
  prerender while carrying both a Suspense boundary and `instant = false`. Anything sized on "the
  codemod handles the rest" is sized wrong.
- **A close-out that updates rows and not sections leaves the board lying, and it has now happened
  four times.** Run (8)'s own close-out set SD2/MA3/MA4 to "MR OPEN" in the work-board table while
  their `###` sections still described the work as unstarted, and filed SD7 as a row with no section
  at all. Run (7) left three items with BOTH an open section and a closed one, because the archive
  move copied without deleting — and two of those, SD5 and AU4, were recorded shipped on the
  strength of a PR being **opened**, not merged. Resolved 2026-09-01: #382 and #383 both merged.
  PF2's leftover open section was the dangerous one: the group file said DROPPED, do not
  re-propose, while an open section beside it still read as a live scoping task. Four checks, each
  one line, run them every close-out:
  ```bash
  # every work-board row has a section, and every section has a row
  awk '/^## Work board/{f=1} /^\*\*Not on this board/{f=0} f' docs/spikes/2026-features.md \
    | grep -oE '^\| [A-Z]+[0-9]+' | tr -d '| ' | sort > /tmp/wb
  grep -oE '^### ☐ [A-Z]+[0-9]+' docs/spikes/2026-features.md | sed 's/### ☐ //' | sort > /tmp/se
  comm -3 /tmp/wb /tmp/se        # must be empty
  # no item has two headings in one file (an archive move that copied instead of moving)
  grep -ohE '^#{2,3} (☐ |✅ |⛔ |☑ )?[A-Z]{2}[0-9]+' <file> | grep -oE '[A-Z]{2}[0-9]+' | sort | uniq -d
  # no closed section survives on the live board (#399 left one; the row check cannot see it)
  grep -c -e '^### ✅' -e '^### ⛔' -e '^### ☑' docs/spikes/2026-features.md   # must be 0
  # every row has a section in its group file (PF14 had none for five days)
  for id in $(cat /tmp/wb); do g=$(echo $id | tr -d '0-9' | tr 'A-Z' 'a-z'); \
    grep -q "^## $id " docs/spikes/2026-features/$g-*.md || echo "no group-file section: $id"; done
  ```
  And never tick an item off a PR number alone — `gh pr view N --json state,mergedAt`. An opened PR
  is not a merged one, and on this board the gap has been days.
- **Every sizing rule on this board points one way. SD2 went the other.** Eleven guardrails above
  exist because items came in bigger than written; SD2 came in smaller. Its row asked for a
  locations batch-load "mirroring the tags batch-load" — and that query already ran, one line
  above, inside `batchConvertToBasicModels`. The whole item was one record component and a copy.
  The tell was in the row's own wording: "mirrors X" is a claim that X's work is not already done
  for you, and it is worth one read of the call chain before sizing. Under-sizing wastes a session;
  over-sizing keeps a one-sitting item parked as "backend, needs a query" for weeks.
- **A shared checkout can be occupied, and one clean `git status` does not prove otherwise.**
  `edens.zac.backend`'s main checkout was clean when this run looked, and two minutes later held
  another session's uncommitted `MetadataService` work on `fix/bug-18-update-location-slug-check`.
  Worse, the `git checkout -b` run in between had silently moved that session onto a new branch.
  Check status twice, a beat apart, before branching in a repo you do not have sole use of — and if
  it is occupied, build in a worktree off `origin/main`. That is the case `CLAUDE.md` carves out.
  Maven does not care; `~/.m2` is shared.
- **A width-only breakpoint is a claim about orientation, not size.** MA3 §5.1 chose stacked
  vs side-by-side on `width >= 768px` and gave the stacked photo a flat `160px`. A landscape phone
  is under 768px wide and only ~360px tall, so it took the stacked branch and the photo ate 44.4% of
  the viewport, leaving the form 49.5px. Every `@media (width >= …)` in a full-height component is
  worth re-reading as "what does this do at 740x360?".
- **A component the admin API will not serve can still be verified — mount it.** The image editor
  cannot be opened locally: `/api/admin/**` 401s without a real session, and a local backend can
  point at production, so logging in to look at a layout is the wrong trade. Rendering the real
  component in a throwaway route under `app/`, with fixture props, gave real
  `getBoundingClientRect()` numbers at four viewports in a few minutes, and the route was deleted
  before the commit. Reach for this before reasoning about CSS from the stylesheet.
- **An item that only wires existing tested primitives into a new route is one sitting**, however
  many files it touches. SD1 was estimated at 2–3 and took 1. An item that deletes and rewrites
  (MA1) does not get this discount.
- **A conflicting PR does not run CI at all — and shows no red.** GitHub builds
  `refs/pull/N/merge` for a `pull_request` event, and a PR with conflicts has no merge ref, so the
  workflow never starts. #383 sat across two runs with **zero** checks ever having run, which reads
  on the PR page as "nothing to see" rather than as a problem. `gh pr checks <N>` printing
  "no checks reported" on an open PR means unverified, not passing. Check it before believing a
  board row that calls the work shipped.
- **Measure BOTH sides of a change, including the state you are replacing.** §5.1's rule was
  "measure it, do not reason from the stylesheet". §5.2 followed that, measured the defect, and
  still picked the wrong breakpoint — because the argument for 480px compared a measured new number
  against an _assumed_ old one. Forcing both states at ten widths reversed the conclusion. A
  half-measured comparison is as wrong as no measurement and much more convincing.
- **`strict: true` branch protection makes a multi-MR run a treadmill, and auto-merge is disabled
  on this repo** (`gh api repos/themancalledzac/edens.zac -q .allow_auto_merge` → `false`;
  `gh pr merge --auto` fails with `enablePullRequestAutoMerge`). Every merge puts the remaining
  PRs BEHIND. Merge one, `gh pr update-branch` the next, wait for CI, merge, repeat — and expect a
  work-board conflict whenever two MRs in a run each remove a different row from it. This rule
  prescribed `--auto` for four days after the close-out below it recorded that it does not work.
- **`gh` fails inside the agent sandbox** (`x509: OSStatus -26276`, a keychain trust error), so
  every `gh pr`/`gh api` call needs the sandbox disabled. It looks like a network outage; it is not.
- **A row blocked on the other repo needs a named owner there — a handoff doc or a backend row
  id — or nobody holds it.** The frontend-only rule is right, and it left MA1 and EM2 "blocked on
  backend" with no document the backend agent would ever read; EM2 said "row still owed" for five
  days. Three handoffs now live in `2026-features/`; a fourth BLOCKED-on-backend row without one is
  a row with no owner.
- **A grep for a design's vocabulary cannot answer whether the behaviour exists.** LY1 sat blocked
  for weeks on "neither design is built", proven by `FILLER|gapBox|endRowGap` returning 0 — while
  `padRowToWidth` shipped the gap-box behaviour under the name BLANK. Only running it can answer a
  behaviour question; record a command whose output IS the answer (#399).
- **`git checkout -b` fails under the agent sandbox, and fails dirty.** It cannot lock
  `.git/config` to write upstream tracking, so it updates the worktree and _then_ aborts — leaving
  the other branch's files staged on top of yours, including deletions. It looks like a bad script;
  it is the sandbox. Run branch-creating git commands with the sandbox disabled.
- **BLOCKED means someone else has to act. Work you have not done yet is COLD.** MA4 sat BLOCKED
  for two runs on a database column that was ours to add, with the full backend MR spec sitting
  complete in its own section the whole time. A blocker is a user decision, another team, another
  repo, or another item landing first — not the size of the remaining work. Misfiled this way an
  item becomes invisible: nobody picks up a BLOCKED row, and nobody re-reads it to discover it was
  never blocked.
- **When a long-open PR conflicts, check whether its intent was already satisfied.** #383's
  conflicts were not a disagreement — `main` had already made the exact edits it was trying to
  make, so the resolution was "take `main`" and its board diff went to zero. Its unique prose still
  had to be folded into the closed entry rather than dropped with the losing side.

## Work board

Open rows only. FE = this repo, BE = `edens.zac.backend`, OPS = console/infra work.

| Item | Scope                                                        | Repo    | Status                                                                                                                                                                                                                           |
| ---- | ------------------------------------------------------------ | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SD4  | `/explore` as a real drill-down explorer (Option C)          | FE      | ☐ BLOCKED — user, decision #10: reconcile with refactor-board H5 first                                                                                                                                                           |
| SD6  | Clickable people chips (needs a person route + slug)         | BE+FE   | ☐ BLOCKED — user, decision #17 (URL shape); `/person/[id]` is buildable here the day it is chosen                                                                                                                                |
| RC1  | Populate `parents` on public reads + `isFilm` backfill       | BE      | ☐ BE#301 **MERGED** 2026-09-04; no frontend half exists; closes on the `isFilm` re-measure (command in its section, needs a live backend)                                                                                        |
| RC2  | Similar-collections v1 (metadata-graph score + Related swap) | BE+FE   | ☐ BLOCKED — user: spike decisions D1–D4                                                                                                                                                                                          |
| RC3  | Collections_List render mode (embedded hub as card-row)      | BE+FE   | ☐ BLOCKED — the COLLECTION content block carries nothing about children (verified both sides 2026-09-02). Specced and handed off: [backend-handoff-RC3.md](2026-features/backend-handoff-RC3.md)                                 |
| RC4  | Suggested collections (admin suggestion rows)                | BE+FE   | ☐ BLOCKED — needs CT3 engine + RC1 metadata quality                                                                                                                                                                              |
| RC5  | CLIP/pgvector embedding tier                                 | BE+ML   | ☐ BLOCKED — user: spike decision D6 (infra commitment)                                                                                                                                                                           |
| CT1  | Collections-as-tags spec refresh against the typeless model  | docs    | ☐ COLD — produces a current D1–D12 matrix for CT2                                                                                                                                                                                |
| CT2  | Adjudicate the collections-as-tags decision matrix           | user    | ☐ BLOCKED — user; after CT1                                                                                                                                                                                                      |
| CT3  | Saved-filter engine (AND-tag query, `source` column, sync)   | BE+FE   | ☐ BLOCKED — on CT2                                                                                                                                                                                                               |
| CT4  | Blog-as-date surface (`/blog` stream, per-day entries)       | BE+FE   | ☐ BLOCKED — on CT2                                                                                                                                                                                                               |
| CT5  | Auto-tag: `POST /collections/{id}/auto-tag` + admin button   | BE+FE   | ☐ COLD — independent of CT2; backend-first, no handoff written yet                                                                                                                                                               |
| CT6  | Tag `type`/visibility model                                  | BE      | ☐ COLD — design confirm, then small schema work; backend-only, no handoff written yet                                                                                                                                            |
| AU1  | Self-serve password reset                                    | BE+FE   | ☐ COLD — plan verified current; the V55 half becomes a handoff when picked up                                                                                                                                                    |
| AU2  | Passkey list + revoke, enrollment-state UI                   | FE(+BE) | ☐ COLD for the admin UI — BE#257 shipped both admin endpoints (this row said they did not exist); the user-facing half is BLOCKED on decision #4                                                                                 |
| EM1  | SES production checklist (verify domain, DKIM, sandbox exit) | OPS     | ☐ COLD — ops; user drives the AWS console half                                                                                                                                                                                   |
| EM2  | New-recipient-only gallery send flow                         | BE+FE   | ☐ BLOCKED — backend: one field is both the stored list and the send list; handoff written 2026-09-05 ([backend-handoff-MA1-EM2.md](2026-features/backend-handoff-MA1-EM2.md))                                                    |
| EM3  | Contact-owner notification + `user_invite.created_by`        | BE      | ☐ COLD — two small backend items; the notification half is either/or with MA4's (decision #14)                                                                                                                                   |
| EM4  | Gallery-password design pass (precedes any BCrypt work)      | user    | ☐ BLOCKED — user; backend board PARKED BCrypt behind it                                                                                                                                                                          |
| MA1  | Manage rail restructure (per-field PATCH, delete edit sheet) | FE(+BE) | ☐ BLOCKED — on refactor-board F1 landing first (ordering decided 2026-09-05). Not an absent endpoint: the existing PUT is a partial update; the one backend ask (clear a nullable field) is in the MA1/EM2 handoff (backend #22) |
| MA2  | `staging` system collection                                  | BE+FE   | ☐ BLOCKED — user: `HIDDEN` vs `UNLISTED` seed visibility (decision #2)                                                                                                                                                           |
| MA3  | Mobile-first admin Phase 3 remainder                         | FE      | ☐ BLOCKED — user, decision #15: §5.2's full-screen grid and bottom bar need a light-surface respec. §5.1 #386, §5.2's filter bar #392 and §5.5 (shipped 2026-06-08) are closed                                                   |
| MA4  | Messages admin: notify channel                               | BE+FE   | ☐ BLOCKED — user, decision #14. Everything else shipped: retention BE#281, delete, read marker + server-side search BE#300 + #396                                                                                                |
| MA5  | Admin collections list at 100× (paged/filtered/sorted)       | BE+FE   | ☐ COLD — low priority until collection count grows                                                                                                                                                                               |
| MA6  | User change log + non-admin canonical mutation path          | BE+FE   | ☐ BLOCKED — user, decision #16: §10 of the logged-in-flow review                                                                                                                                                                 |
| PF14 | Site-wide dark mode behind a user preference                 | FE      | ☐ COLD — spun out of MA3 by decision #5; first sitting is a scoping pass (group file)                                                                                                                                            |
| PF7  | CloudFlare Phase 2 (origin lockdown, `CF-Connecting-IP`)     | OPS     | ☐ COLD — infra, plan and acceptance in the group file, ~1–2 weeks lead time                                                                                                                                                      |
| PF13 | Home page genuinely static (Cache Components / PPR)          | FE      | ☐ COLD — MR 1 merged #381; steps 2–5 are ours (group file's revised list); next is the cookie hoist out of `fetchBase`                                                                                                           |

**Not on this board, deliberately:** everything with a row on
[2026-summer-refactor.md](2026-summer-refactor.md) (H1's `/user` merge, F4's TaxonomyPage
consolidation, G3's `/user/selects`, F1's hook decomposition, C-group bugs); backend Bug #21
(dimensions default `0`) — tracked there via C9 and on the backend board; property-based layout
tests and function decomposition (debt, chapter 006); and three self-labeled unapproved ideas
(liked images, mobile text overlay, React 19 follow-ups), listed in the group files so they are
not rediscovered as new.

## NEXT RUN — set 2026-09-05 (13), from the full-board review

**This board is frontend-only. Do not open an MR or write a board row in `edens.zac.backend`.**
Backend asks are specced here and handed off; three handoff documents now sit in `2026-features/`
(RC3, MA4/RC1, MA1/EM2).

**Run (12) is entirely done.** MA4's frontend half merged as #396 and SD3's film stock as #397
(both 2026-09-03), RC3 became a handoff (#398), decision #6 was answered and LY1 closed (#399), and
BE#301 merged 2026-09-04. The review that produced this block (handoff #400, applied 2026-09-05 by
seven read-only slices and one apply pass) found what a session following the old block would have
got wrong: two of its three items were already merged, RC1 no longer had a frontend half, AU2's
premise was false, and MA1 was waiting on a question addressed to this board rather than on an
absent endpoint. Nothing in this run needs a user answer.

### This run

Every item is frontend and needs no other repo.

1. **AU2's admin half** — a passkey list with per-row Remove on `/admin/users/[id]`, against
   BE#257's `GET /api/admin/users/{id}/passkeys` and `DELETE …/{credentialId}`. `listPasskeys` and
   `deregisterPasskey` in `app/lib/api/users.ts`, a section on the user detail page, the
   last-passkey warning built from the response's `remaining` and `passwordLoginAvailable`.
   **Guardrail:** the page cannot be opened locally without the owner's login — mount with fixture
   props in a throwaway route, delete it before the commit. Close refactor-board H7 against it.
2. **PF13 step 1** — hoist the cookie forwarding out of `fetchBase` so a public read can enter a
   `use cache` scope (the group file's revised list; MR 1 of it shipped as #381). **Guardrail:**
   `getCollectionBySlug` keeps its cookie — its response varies by `gallery_access_<slug>` and the
   cache key is what keeps locked and unlocked payloads apart (refactor-board D11 pins that).
3. **PF14 scoping pass** — docs only; answers the three questions in its group-file section.
4. **CT1 spec refresh** — docs only; produces the current D1–D12 matrix so CT2 can be asked.

**Ask first, batched.** Decisions #1, #2, #3, #4 (narrowed), #10, #14, #15, #16 and #17 here, plus
the refactor board's seven (H1, F4, G3, `.srOnly`, G2b, the G8 CSS guard, and H7 — which is #4).
One sitting, one list.

**Not startable, and why:** RC1 (one live-backend measurement, then it closes); MA1 (F1 goes
first, and its clear-a-field ask is in the handoff); EM2 and RC3 (backend handoffs, no owner yet);
MA3 §5.2 (#15); MA2 (#2); MA6 (#16); SD4 (#10); SD6 (#17); RC2 and RC5 (#1); RC4 (CT3 + RC1);
CT2–CT4 (CT1, then CT2); EM4 (#3); EM1 and PF7 (ops, user-driven).

## Verified and holding — do not re-investigate

Re-run 2026-09-05 (13) by the full-board review. Every row records a command whose output IS the
number. The 2026-09-04 handoff found six rows here whose command did not measure its claim — a
`\|` that a markdown table turns into a literal pipe under `grep -E`, a `git grep -c` that prints
nothing on zero matches, a "read" recorded as a command, a glob that could not see the file the
claim was about — and those are rewritten or gone. Multi-pattern greps now use `-e` flags so nothing
here depends on how a `|` renders inside a table. Deleted rather than re-run, because the item
shipped or was dropped: SD2's, PF6's, MA4's two `read_at` rows, PF2's `curl` (which also counted
through the backend's unfiltered image search, see refactor-board D15), and LY1's symbol grep
(#399: a naming check cannot answer a behaviour question). Backend commands run in
`edens.zac.backend` after `git fetch -q origin`, against `origin/main` only.

| Claim                                                                         | Command                                                                                                                                        | Result                                                                                       |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| PF13: 19 segments export `dynamic`, and the flag rejects all 19               | `grep -rn 'export const dynamic' app --include='*.tsx' \| wc -l`, then `cacheComponents: true` + `next build`                                  | 19; build names exactly those 19 files                                                       |
| PF13: `getCollectionBySlug` is cookie-forwarding AND ISR-tagged               | `sed -n '/^export async function getCollectionBySlug/,/^}/p' app/lib/api/collections.ts \| grep -c -e fetchReadApi -e 'tags:'`                 | 2 — blocker holds, hazard live                                                               |
| MA1: no whole-collection PATCH (six `@PatchMapping`s exist, all sub-resource) | `git grep -n -e '@PatchMapping("/collections/{id}")' -e '@PatchMapping("/collections/{collectionId}")' origin/main -- src/main/java/ \| wc -l` | 0                                                                                            |
| MA1: the existing PUT is already a partial update                             | `git grep -n '@PutMapping("/collections/{id}")' origin/main -- src/main/java/`                                                                 | `AdminController.java:112`; backend board `#22` records the null-guard semantics             |
| CT5: no auto-tag endpoint                                                     | `git grep -n -i -e auto-tag -e autoTag -e auto_tag origin/main -- src/main/java/ \| wc -l`                                                     | 0                                                                                            |
| AU2: the WebAuthn controller has four endpoints, all POST                     | `git show origin/main:src/main/java/edens/zac/portfolio/backend/controller/auth/WebAuthnController.java \| grep -c '@PostMapping'`             | 4 (register/login × start/finish)                                                            |
| AU2/H7: the admin passkey list and revoke EXIST                               | `git grep -n passkeys origin/main -- '*AdminUserController.java' \| grep -c 'Mapping('`                                                        | 2 (`:419` GET, `:465` DELETE; BE#257)                                                        |
| MA4: delete shipped                                                           | `git grep -n '@DeleteMapping' origin/main -- '*MessagesControllerAdmin.java'`                                                                  | `@DeleteMapping("/{id}")` at `:85`                                                           |
| MA4: the read/search contract is on backend `main`                            | `git grep -n -e 'PatchMapping("/{id}/read")' -e 'Boolean unread' -e 'String q' origin/main -- '*MessagesControllerAdmin.java'`                 | `:46`, `:47`, `:70`                                                                          |
| RC1: `parents` populated on public reads                                      | `git grep -n populateParents origin/main -- src/main/java/`                                                                                    | `CollectionProcessingUtil.java:523`; `CollectionService.java:164` (`true`), `:928` (`false`) |
| RC1: migration head                                                           | `git ls-tree --name-only origin/main src/main/resources/db/migration/ \| sort -V \| tail -1`                                                   | `V62__backfill_content_image_is_film.sql`                                                    |
| RC3: the COLLECTION content block says nothing about children                 | `sed -n '/^export interface ContentCollectionModel/,/^}/p' app/types/Content.ts \| grep -c -e hasChildren -e children -e contentCount`         | 0                                                                                            |
| EM2: one writer, no notify list                                               | `git grep -n notifyEmails origin/main -- src/main/java/ \| wc -l`                                                                              | 0                                                                                            |
| SD6: no `/person` route and no slug on a person                               | `find app -type d -name 'person*'`, then `git grep -n 'record Person(' origin/main -- '*Records.java'`                                         | route absent; `Person(Long id, String name)`                                                 |
| No closed section survives on the live board                                  | `grep -c -e '^### ✅' -e '^### ⛔' -e '^### ☑' docs/spikes/2026-features.md`                                                                   | 0                                                                                            |

**`file:line` refs are not counted in this table.** The 2026-09-05 review re-resolved every ref on
this board and its group files (63 on the feature side: 13 drifted, 5 gone, all corrected in place).
A ref written during the session that edits its file is born stale — re-resolve by anchor when an
item is picked up, and never record "N/N correct" here, because the population is what drifts.

**Not re-checked this pass, and therefore unverified:** RC1's `isFilm` counts (0/5, 0/5, 0/7 vs
33/33). They are a 2026-08-30 measurement; the backend was down on 2026-09-05 (port 8080 is held by
a Docker proxy that accepts and times out). The command is on RC1's section.

## Decisions for Zac

Batch these at the start of a session. Each unblocks the named item; none blocks a COLD item.

| #      | Question                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Unblocks                   |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| 1      | Similar-collections spike D1–D6 (Related source mix, score location, hubs in slots, auto-promote threshold, suggestion surface, pgvector). Recommendations recorded in [2026-features/rc-similar-collections.md](2026-features/rc-similar-collections.md)                                                                                                                                                                                                                                                                                                                                                                                                                                               | RC2, RC5                   |
| 2      | Staging seed visibility: `HIDDEN` or `UNLISTED`?                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | MA2                        |
| 3      | Gallery passwords: what should they DO? (Design pass; BCrypt is parked behind it)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | EM4                        |
| 4      | **Narrowed 2026-09-05.** Passkey self-service: should a signed-in user see and remove their own passkeys on `/user`? The admin list/revoke is already built server-side (BE#257) and its UI is AU2's startable half; refactor-board H7 asks the same thing — one answer covers both                                                                                                                                                                                                                                                                                                                                                                                                                     | AU2 (user-facing half), H7 |
| ~~5~~  | ~~Does the dark-admin premise survive?~~ **ANSWERED 2026-08-31 (7): yes — site-wide preference, later.** The removal was correct; admin does not get its own dark wiring. MA3's remaining surfaces build on a light surface and proceed now. Dark mode becomes its own item, filed as PF14.                                                                                                                                                                                                                                                                                                                                                                                                             | —                          |
| ~~6~~  | ~~Lone-last-row: gap-box spacer or FILLER atom?~~ **ANSWERED 2026-09-02: neither — the gap-box behaviour already ships.** `padRowToWidth` has appended a BLANK spacer to an under-filled trailing row since the 2026-07-16 row-width normalization. Zac declined both the FILLER-atom rewrite (it changes no rendered output) and altering the solo-hero rule. LY1 closed as a correction.                                                                                                                                                                                                                                                                                                              | —                          |
| ~~7~~  | ~~Panel width vs page height~~ **ANSWERED 2026-08-31: keep the shared width; the height cost stands.** Asked narrowly, since a 'V' split makes a column uniform by construction and the predicate can only reject SIDE-BY-SIDE panel columns: those are still one group and still share a width. No code change — LY2 closed as pure adjudication.                                                                                                                                                                                                                                                                                                                                                      | —                          |
| ~~8~~  | ~~Error tracking: Sentry or CloudWatch?~~ **ANSWERED 2026-08-31 (7): CloudWatch.** Already on AWS, no new vendor, no third-party script on every page. Accepts the tradeoff — no grouping and no source maps unless wired — so PF6 must scope source-map upload or accept minified traces. Recorded in [PF6](2026-features/pf-performance-platform.md).                                                                                                                                                                                                                                                                                                                                                 | —                          |
| ~~11~~ | ~~`engines.node` vs the dev machine~~ **ANSWERED 2026-08-31: "whatever is best long term practice."** Read as: `engines.node` becomes an unbounded floor, a `.nvmrc` names the blessed version, and CI reads that file instead of a hardcoded literal — one source of truth, no upper bound to age out. Shape recorded in [PF11](2026-features/pf-performance-platform.md).                                                                                                                                                                                                                                                                                                                             | PF11                       |
| ~~9~~  | ~~Which host serves production?~~ **FULLY ANSWERED 2026-08-31 — AWS Amplify Hosting**, confirmed by the user after `curl` had narrowed it to CloudFront-fronted AWS running a live Next server (Vercel and static-S3 eliminated). Auto-deploys from `main` in ~15 min. Recorded in `CLAUDE.md`; shipped as PF9 (#365).                                                                                                                                                                                                                                                                                                                                                                                  | —                          |
| ~~12~~ | ~~Cache Components: adopt app-wide?~~ **ANSWERED 2026-08-31: adopt, full speed.** Step 1 (`Footer`'s `new Date()`) shipped as #375; the app-wide flag flip and the per-route conversion remain, and PF12 landing removes the reason to hold them                                                                                                                                                                                                                                                                                                                                                                                                                                                        | —                          |
| 10     | `/explore` direction: reconcile Option C with the H5 MenuDropdown review                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | SD4                        |
| 14     | Contact-message notification: a Discord/Slack webhook (MA4) or an owner email through SES (EM3 C7)? One, not both — the group file has said "pick one" since 2026-08-30 and neither board had filed the question                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | MA4, EM3                   |
| 15     | MA3 §5.2: respec the manage page's full-screen grid and morphing bottom bar on a light surface, or drop them? The 2026-06-08 spec targets a dark canvas that decision #5 removed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | MA3                        |
| 16     | MA6: the logged-in-flow review's §10 decisions (non-admin canonical mutation, `user_change_log`, admin review surface). Settle together with refactor-board H2b                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | MA6                        |
| 17     | SD6 route shape: `/person/[id]` now (frontend-only), or a backend `slug` column and `/person/[slug]` (matches tags and locations; needs a handoff)?                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | SD6                        |
| ~~13~~ | ~~Does Amplify already ship this app's server stdout/stderr to a CloudWatch log group?~~ **ANSWERED 2026-08-31 (9): yes.** Amplify Hosting already forwards this app's server stdout to a log group, so the server half was a formatting change inside `logger.ts` — no AWS SDK, no log group to create, no credentials, no execution-role permission, and `package.json` stays at five dependencies. The rider was answered too: the user will set `NODE_OPTIONS=--enable-source-maps` in the console, so `experimental.serverSourceMaps` is now on and server traces are readable with nothing published to browsers. Shipped as PF6 ([#391](https://github.com/themancalledzac/edens.zac/pull/391)). | —                          |

Collections-as-tags D1–D12 (item CT2) joins this list after CT1 rewrites the matrix in current
terms. Seven more product calls are batched on the refactor board (H1, F4, G3, `.srOnly`, G2b,
the G8 CSS guard, and H7 — which is decision #4 here) — put all of these to the user as one
sitting, not two lists. Two decisions that were not in any table for days (#14, #15) are here now;
a decision that blocks a row and is not in this table is the same defect as a row with no section.

## Group SD — Search & discovery

Context file: [2026-features/sd-search-discovery.md](2026-features/sd-search-discovery.md) —
**5 closed** (SD1 #357, SD2 backend #277, SD7 backend
[#293](https://github.com/themancalledzac/edens.zac.backend/pull/293), SD5 #382, SD3 2026-09-05 —
its last dimension shipped as #397 and the lens URL gap moved to refactor-board C17); their
write-ups are in that file's Closed section. Count re-derived 2026-09-05 with
`grep -c -e '^### ✅' -e '^### ⛔' -e '^### ☑' 2026-features/sd-search-discovery.md` → 5.

### ☐ SD4 · `/explore` as a real explorer — BLOCKED (user, decision #10)

`app/explore/ExploreDirectory.tsx` is the flat Option-A directory — it moved out of
`app/explore/page.tsx` in #367, which left the route a shell around a Suspense boundary. Option C
(cross-faceting explorer) and the
in-dropdown drill-down (§6.2 of the menu spec) were never built. The refactor board's H5 is a
second, newer design pass over `MenuDropdown` — reconcile before planning either, or two competing
designs will result.

### ☐ SD6 · Clickable people chips — BLOCKED (needs a person route and a slug)

Split out of SD5. People chips in the fullscreen viewer render inert, and unlike tags they cannot
simply be linked: `ContentPersonModel` is `IdNameModel` — `{id, name}` with **no slug** — and there
is no `/person` route to point at.

Two ways in, and the choice is decision #17 — a URL-shape call for the user, filed 2026-09-05 after
this row spent four days BLOCKED with the question in no table:

- **Frontend-only:** a `/person/[id]` route built like `TaxonomyPage` over
  `searchImages({ personIds })`. Works today, but the URL carries a bare id rather than a name.
- **Backend first:** a `slug` column on the person entity, mirroring `ContentTagModel`, then
  `/person/[slug]`. Matches how tags and locations already work; needs a backend MR.

Prefer the second for consistency unless the URL shape does not matter. Either way the frontend
change is the same shape as #382's tag branch. **Pinned by a test** in
`FullScreenModal.metadata.test.tsx` asserting people render WITHOUT a link, so whoever builds this
will see that test fail and know it is the contract changing rather than a break.

## Group RC — Related & similar collections

Context file: [2026-features/rc-similar-collections.md](2026-features/rc-similar-collections.md) —
carries the full 2026-08-30 spike content (the source spec is gitignored).

### ☐ RC1 · `parents` on public reads + `isFilm` backfill — BE#301 MERGED 2026-09-04; one measurement owed

**No frontend half exists.** `buildMetadataItems` (`app/utils/contentLayout.ts:468`) has read
`collection.parents` since the Related section was built, `CollectionModel.parents` is typed at
`app/types/Collection.ts:285`, and `tests/utils/contentLayout.test.ts` already pins "appends a
collection item per parent". Public pages show parents with no frontend change. Parents arrive
without `coverImageUrl` (the backend deliberately loads none), so they render as text chips inside
the Related row — the existing mixed-row fallback, not a defect. The row's "no frontend half until
it lands" was wrong in both halves: it had landed, and there was none.

**Open: re-measure `isFilm`.** The 0/5, 0/5, 0/7 vs 33/33 counts are a 2026-08-30 measurement. V62
infers film from a stock or a flagged body and V23 flags two bodies, so the three collections may
still read zero. Backend was down on 2026-09-05. When it is up:

```bash
for s in chamonix-film vienna-film gorge-50km-film dolomites-film; do
  curl -s "localhost:8080/api/read/collections/$s?page=0&size=50" \
    | jq -r --arg s "$s" '[.content[]|select(.contentType=="IMAGE")]
        | "\($s) \(map(select(.isFilm==true))|length)/\(length)"'
done
```

If any still reads zero, flagging a third body is a data call for Zac. Close RC1 on the numbers.

### ☐ RC2 · Similar-collections v1 — BLOCKED (user, decision #1)

The ~40-line weighted metadata-graph score (parent/child +5, siblings +5, co-children +3, image/
location/people/tag Jaccard, date decay) produced correct top-5s on live data. Backend
`GET /api/read/collections/{slug}/related?limit=5` or an enriched field; FE swaps the Related
section's source; >5 strong relations auto-promote to a card-row. Nothing stored — derived per
request, cached by the existing `collection-{slug}` tag. Ticketed on the spike's recommendations
as defaults; implementation waits for a reply-by-number on D1–D4. Full algorithm, weights and live
results in the group file.

### ☐ RC3 · Collections_List render mode — BLOCKED (backend field absent), specced and handed off

An embedded COLLECTION content row today renders as one parallax card; the goal is that an embedded
hub renders as a labeled card-row of its children instead.

**"No new entity" was right; "small" and "COLD" were not.** The frontend cannot make the
LIST-vs-CARD decision at all, because nothing it receives says whether the referenced collection has
children. Both sides were read on `origin/main` rather than one inferred from the other:

```bash
sed -n '/^export interface ContentCollectionModel/,/^}/p' app/types/Content.ts \
  | grep -c -e hasChildren -e children -e contentCount        # 0 — the -A 20 form this used to record stopped 34 lines short of the interface
# and, in edens.zac.backend:
git show origin/main:src/main/java/edens/zac/portfolio/backend/model/ContentModels.java \
  | grep -n 'record Collection' -A 30
```

→ `ContentCollectionModel` (`app/types/Content.ts:338-392`) and its backend record
(`ContentModels.java:236`, 21 components) both carry no `hasChildren`, no `children`, no
`contentCount`. The only frontend-only path is a `getCollectionBySlug` per embedded collection at
render time — a request per card for a layout hint.

**The backend ask is small and precedented**: `hasChildren` already exists, computed server-side and
serialized onto the admin manage DTO (`app/types/Collection.ts:381`). It is a serialization change,
not new logic. Full spec, including the child-summary shape, the visibility gates to consider, and
the frontend work waiting on it: [backend-handoff-RC3.md](2026-features/backend-handoff-RC3.md).

**Do not reuse `DisplayMode` for this.** `FIXED` shipped and reads like the per-row display hint the
old row described. It is a per-collection SORT key, read on the collection being viewed, not on
collections referenced from it — a category error, and one this row invited.

The Related section's card-row is the visual target but is inlined JSX in the TEXT branch, not a
component; `CoverCard` + a `LocationCollections`-style row is the reusable path. Related's own
source is untouched — changing it is RC2, blocked on decision #1.

### ☐ RC4 · Suggested collections — BLOCKED (needs CT3 + RC1)

Admin-only suggestion rows over the saved-filter engine; suggest, never auto-create. Blocked today
by metadata quality (RC1) and the absence of the engine (CT3), not by algorithms.

### ☐ RC5 · CLIP/pgvector tier — BLOCKED (user, decision #1/D6)

Per-image 768-D CLIP embeddings already computed in `edens.zac.ml`; persisting via pgvector is a
real infra commitment (extension on RDS + local container). Nothing earlier depends on it.

## Group CT — Collections-as-tags

Context file: [2026-features/ct-collections-as-tags.md](2026-features/ct-collections-as-tags.md)

### ☐ CT1 · Spec refresh pass — COLD, docs-only, and the gate for the rest of the group

The 2026-07-06 spec is the design for programmatic membership but is written against a type model
that no longer exists (`CollectionType` deleted in V52; `isClient`/`isBlog` booleans; parents
derived). The refresh: recast the §5 disposition table, re-audit backend V40–V52 changes, decide
whether the saved-filter model needs `DisplayMode FIXED` (it shipped on both sides and MA1 plans to
drop it), incorporate one-way siblings, and re-emit the D1–D12 decision
matrix in current terms. Output is a tracked doc in `2026-features/`; the user answers CT2 from it.

### ☐ CT2 · Adjudicate D1–D12 — BLOCKED (user), after CT1

### ☐ CT3 · Saved-filter engine — BLOCKED on CT2

Backend AND-tag query (current `tagIds` is OR), `collection_content.source` column, event-driven
sync + nightly reconcile; FE live-mode Save-as-Collection. The foundation for RC4 and CT4.

### ☐ CT4 · Blog-as-date surface — BLOCKED on CT2

No `/blog` route exists. Per-day date-keyed entries, chronological, "not only pictures."

### ☐ CT5 · Auto-tag endpoint + button — COLD, independent of CT2

`POST /collections/{id}/auto-tag` does not exist in the backend (verified, zero hits); the admin
"Auto-populate from images" button and optional public tag-chip display follow it. This is
collection tags Phase 2 (Phase 1 shipped as PR #167).

### ☐ CT6 · Tag `type`/visibility model — COLD

The principled version of the shipped workaround (collection pages hide both tag surfaces,
`81ca206`, because tags carry no type): a `type` column on `TagEntity` (explicitly not
generic key-value), migration, DTO threading, admin UI, backfill decision. From the 2026-08-02
filter-consolidation follow-ups.

## Group AU — Auth & accounts

Context file: [2026-features/au-auth-accounts.md](2026-features/au-auth-accounts.md) —
**2 closed** (AU3 no-work, AU4 #383); their write-ups are in that file's Closed section.

### ☐ AU1 · Self-serve password reset — COLD, plan verified current

The invite subsystem already IS a reset mechanism (hashed single-use tokens, expiry, redeem,
session mint, SES send). Missing: a public rate-limited trigger, a `purpose` column on
`user_invite` (backend V55), per-purpose TTL (1h reset vs 7d invite), reset email copy, `purpose`
on `InvitePreview`, a `/forgot-password` route, and flipping `app/invite/[token]/page.tsx:54`'s
expiry behavior from `notFound()` to a `/login` redirect. Plan:
`docs/superpowers/plans/2026-08-10-auth-password-reset.md`, re-verified 2026-08-30; essentials
copied into the group file.

### ☐ AU2 · Passkey list + revoke — admin UI COLD (backend shipped); self-service BLOCKED (decision #4)

**The admin endpoints exist.** BE#257 merged 2026-08-31: `GET /api/admin/users/{id}/passkeys`
(`AdminUserController.java:419`) and `DELETE /api/admin/users/{id}/passkeys/{credentialId}`
(`:465`), on `WebAuthnCredentialRepository.deleteByIdAndUserId` (`:108`). The backend board filed
the missing consumer as **FE-4** the same day; the refactor board's **H7** is the same finding.
This row's "no list, no delete" came from grepping `WebAuthnController.java`, which still has
exactly four mappings — the endpoints are on the users controller. Three records for one feature;
this row is the one that survives, and H7 closes against it.

```bash
git grep -n passkeys origin/main -- 'src/main/java/**/*Controller.java' | grep -c 'Mapping('   # 2
grep -rln passkeys app/                                                                        # nothing — no caller
```

**Startable now, frontend-only:** a passkey list with a per-row Remove on `/admin/users/[id]`,
through the BFF. Removing an account's last passkey is allowed and, when it has no password, leaves
it unable to log in until re-invited (`AdminUserController.java:436-456`; backend S-28) — the UI
says so before the delete. The response carries `remaining` and `passwordLoginAvailable` for
exactly that message.

**Still a decision (#4, narrowed):** whether a signed-in user gets a self-service list-and-remove on
`/user`. `/api/auth/webauthn/**` has register and login only, so that half is a backend handoff.
The enrollment-state UI (009) follows whichever list exists; `AccountCard.tsx` already drives
`registerPasskey`.

## Group EM — Email & client galleries

Context file: [2026-features/em-email-galleries.md](2026-features/em-email-galleries.md) —
1 shipped (EM5, #370); its write-up is in that file's Closed section.

### ☐ EM1 · SES production checklist — COLD, ops

Invite email is code-complete (`sendInviteEmail` + afterCommit hook, shipped 2026-07-26); the
blocker is operational. The §3 console checklist is all-open: domain identity in us-west-2,
sandbox smoke test, custom MAIL FROM + SPF, DMARC, configuration set + SNS bounce handling,
sandbox exit, flip `EMAIL_ENABLED` on EC2. User drives the console; sessions prep and verify.

### ☐ EM2 · New-recipient-only send flow — BLOCKED (backend), verified 2026-08-31

Saving gallery access re-emails the whole recipient list. The frontend premise was corrected last
pass and is correct — `InfoTab.tsx:303` renders a `Recipient email` input and
`useCollectionEdit.tsx:559` seeds it from `collection.recipientEmails`, so this reshapes a control
rather than adding one. That was never the constraint.

**The constraint is that one backend field is both the stored list and the send list.**
`recipient_emails` has exactly one writer, `CollectionRepository.saveGalleryAccess`, which
overwrites the whole array with what the request sent; `CollectionService.updateGalleryAccess`
then mails every address in that same array. So the frontend can only pick which half to break:

- send `[new]` — only the new address is mailed, and the stored list is reduced to that one address
- send `[...existing, new]` — the list survives and everyone is re-mailed, which is today

No third path exists. `sendGalleryPasswordEmail` has exactly one caller (that write path),
`CollectionAdminController` exposes exactly one `@PostMapping`, and `CollectionRepository.save`
writes neither column on UPDATE — its own docblock says both are owned exclusively by
`saveGalleryAccess`. All re-run against the backend's `origin/main` on 2026-08-31.

**MR 1 is backend:** separate the list to store from the list to notify — a `notifyEmails` on
`GalleryAccessRequest`, or append semantics on `emails` with the notify set derived from what was
actually new. Under the frontend-only rule this repo files no backend rows, so the ask is a handoff:
[backend-handoff-MA1-EM2.md](2026-features/backend-handoff-MA1-EM2.md), written 2026-09-05. Until
the backend agent picks it up, that document is the item's only owner — "the backend-board row is
still owed" had been true for five days with nobody able to file it. The frontend reshape follows
the backend MR unchanged.

**On MA1's sequencing.** The collision is unchanged — MA1 deletes `InfoTab.tsx` wholesale, so any
EM2 frontend built there is thrown away. MA1's "absent endpoint" turned out to be a question (see
MA1), so MA1 may move first after refactor-board F1; whichever lands first settles it.

### ☐ EM3 · Contact-owner notification + `created_by` — COLD, backend

C7 (notify the owner on contact-form submission) and C3 (`user_invite.created_by`) from the SES
spec, both still unbuilt.

### ☐ EM4 · Gallery-password design pass — BLOCKED (user, decision #3)

The backend board PARKED BCrypt on 2026-08-24: the design pass must first answer what gallery
passwords should do, reconciling admin re-share, the fingerprint-derived shared-unlock cookie, and
revocation-on-change. `docs/003` and `docs/000` still list BCrypt as ready-to-build — they are
wrong; do not start it.

## Group MA — Admin & manage surfaces

Context file: [2026-features/ma-admin-manage.md](2026-features/ma-admin-manage.md)

### ☐ MA1 · Manage rail restructure — BLOCKED on refactor-board F1 landing first; the backend ask is one field-clear semantics

The 2026-08-12 plan (Approach B): per-field optimistic PATCH commits replace the batch-save edit
sheet. Eleven FE tasks — `patchCollection` + `buildFieldPatch`, `commitField` in
`useCollectionEdit`, remove the staging buffer/dirty tracking/Save-Cancel cells,
`InlineEditableDate` + `InlineEditableLocations`, rating into `titleAside`,
`CollectionAdminRail` as `railExtras`, delete `CollectionEditSheet.tsx` + `InfoTab.tsx` +
`StructureTab.tsx` + 3 stylesheets, density-tier persistence, reset-to-chronological, dead-code
sweep (drop `FIXED` — coordinate with CT1, prune orphaned `CollectionUpdateRequest` fields), test
rewrite (`useCollectionEdit.buffer.test.tsx` pins the buffer policy this deletes). Prereqs merged
(`railExtras` threads through; 0244–0247 landed).

**"Blocked on an absent backend endpoint" was wrong, in a way that cost four days (corrected
2026-09-05).** No whole-collection `@PatchMapping` exists on the backend's `origin/main` — six
PATCHes, all sub-resource or unrelated — but the backend board has held this as **#22** since
2026-08-31, corrected 2026-09-01: both `PUT /collections/{id}` routes are already null-guarded
partial updates, and the row asks THIS board whether pointing `buildFieldPatch` at that PUT
unblocks MA1. Nobody answered. The frontend's `updateCollection` (`app/lib/api/collections.ts:252`)
already calls that PUT. **The answer:** setting a field works today, so MR 1 is frontend; what the
PUT cannot do is CLEAR a nullable field (null means "unchanged"), which the per-field commits need
for description, date and locations. That one ask is in
[backend-handoff-MA1-EM2.md](2026-features/backend-handoff-MA1-EM2.md).

**Ordering with refactor-board F1 (decided 2026-09-05): F1 lands first and leaves the update-form
region (`seedUpdateData` → `handleUpdate`) untouched for MA1.** MA1's Tasks 2–3 rewrite that region
in place and must not re-inline the five hooks F1 extracts; MA1's Task 11 rewrites
`useCollectionEdit.buffer.test.tsx`, which F1 must leave green. The file is 1,811 lines at
`699aa4f2`. **Collides with:** anything touching `InfoTab`/`StructureTab` (EM2, the roles section).
Wants its own sessions. Task 10's `TODO(A3)` sub-item was struck 2026-08-31 (4): the comment is
gone and its feature shipped (`saveTagAsCollection` at `useCollectionEdit.tsx:1441`).

### ☐ MA2 · `staging` system collection — BLOCKED (user, decision #2)

Re-specced against the typeless model (the old plan targets the deleted enum). Open: seed
migration (`HIDDEN` vs `UNLISTED` first), auto-parent beyond the upload path, the
`enforceVisibility()` slug-bypass carve-out, FE `STAGING_SLUG` beside `HOME_SLUG` in
`app/utils/collectionSlugs.ts` + manage-page badge. Backend-heavy: spec it here and hand it off, do
not build it in that repo.

### ☐ MA3 · Mobile-first admin Phase 3 remainder — BLOCKED (user, decision #15), only §5.2's respec remains

**Shipped: §5.1 as [#386](https://github.com/themancalledzac/edens.zac/pull/386), and §5.2's filter
bar as [#392](https://github.com/themancalledzac/edens.zac/pull/392). §5.5 CLOSED 2026-09-01 (10)
— it had already shipped 2026-06-08** as `b81b6ad`, three months before the row claiming otherwise
was last re-read. See the group file for the command that proves it.

**Nothing here is startable any more.** What is left is §5.2's full-screen grid and morphing bottom
bar, and that is a design call for the user, not an implementation: the 2026-06-08 spec writes it
against a dark canvas that decision #5 removed. MA3 moves COLD → BLOCKED for that reason.

**§5.2 is now two things, and only one of them is a build.** The filter-bar defect is closed. The
full-screen grid and morphing bottom bar are **not startable as specced**: the 2026-06-08 spec
writes §5.2 against a dark canvas ("rendered in manage mode on dark"), and decision #5 removed
admin-only dark and made a real dark mode site-wide (PF14). That half needs re-specifying on a
light surface before anyone sizes it — it is a design call, not an implementation task. The bottom
bar itself is a four-mode state machine (Select / Reorder / Add / Edit) across several components,
so it is several MRs even once respecified.

**What the filter bar turned out to be.** `.trailing` is `flex: 0 0 auto` and never shrinks; with
the manage view's density slider in it, it measures 220.7px. At 375px that left `.controls` 126.3px
— narrower than the single "Highly Rated" chip at 131px — so all six chips took a row each and the
bar stood 230.6px tall. Fixed by wrapping below 768px with `flex-basis: 100%` on `.controls`, which
is what forces `.trailing` onto its own row rather than letting it land beside arbitrary chips.
360/375 230.6 -> 113.8; 414 155.4 -> 113.8; 740x360 80.2 -> 76.2.

**A measurement beats a plausible reason, even a well-argued one.** The threshold was first set at
480px on the reasoning that giving `.trailing` its own row would cost more than it saved at
740x360 — §5.1's own lesson, applied. It was wrong: the comparison was against a number that had
been assumed rather than measured, and forcing both states at ten widths showed wrapping never
loses in the range. **§5.1's rule was "measure it"; the sharper version is "measure BOTH sides of
the change, including the state you are replacing."**

**§5.1's generalization still stands for the unbuilt work.** Re-read every `@media (width >= …)`
in a full-height admin component as "what does this do at 740x360?" — but note §5.2's filter bar
was a horizontal starvation, not an orientation problem, so a width-keyed rule was the right tool
there. Which axis is scarce is itself a thing to check, not assume.

**How to see any of this, since the manage page cannot be opened locally.** `/api/admin/**` 401s
without a real session and the local backend can point at production, so signing in to inspect a
layout is the wrong trade. Mount the real component in a throwaway route under `app/` with fixture
props, measure with `getBoundingClientRect()`, delete the route before committing. Note the folder
must NOT start with `_` — Next treats those as private and never routes them. Full method in the
group file.

**Reported, not fixed, by [#392](https://github.com/themancalledzac/edens.zac/pull/392):** with two
chip rows, `wrap-reverse` splits one dimension across rows and inverts its order — "Jul 19 · Jul 20
· Lens" above "Order · Highly Rated · Jul 18". `wrap-reverse` is deliberate and documented, so
changing it is its own call. It only became visible once the bar stopped being one chip per row.

**Decision #5 answered: the premise holds.** `app/(admin)/layout.tsx` was right to remove the
admin-only dark wiring — a real dark mode belongs to the whole site behind a user preference. So
these surfaces build on a **light** surface and need no theming work. Do not re-add admin-only dark
styling while building them; that is now PF14's job, site-wide.

### ☐ MA4 · Messages admin: notify channel — BLOCKED (user, decision #14)

**Everything else in this item has shipped.** Re-run, do not re-read:

| Piece                                        | State                                                   | Command                                                                                                                        |
| -------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Delete                                       | shipped both ends                                       | `git grep -n '@DeleteMapping' origin/main -- '*MessagesControllerAdmin.java'` → `:85`                                          |
| Retention TTL                                | shipped OFF as BE#281 (backend #26); configuration only | —                                                                                                                              |
| Read marker + `?q=`/`?unread=`, backend      | BE#300 merged 2026-09-01 (backend #30), V61             | `git grep -n -e 'PatchMapping("/{id}/read")' -e 'Boolean unread' -e 'String q' origin/main -- '*MessagesControllerAdmin.java'` |
| Mark read/unread + server-side search, front | **#396 merged 2026-09-03**                              | `grep -rln markMessageRead app/` → `app/lib/api/messages.ts`, `app/hooks/useMessageRead.ts`                                    |
| Notify channel                               | unbuilt, and a decision                                 | —                                                                                                                              |

What #396 built, on `/comments` only: `CommentsList` sends `q` and `unread` to `getAdminMessages`
(`app/lib/api/messages.ts:40`), debounced 300ms and guarded by a request counter so a slow early
keystroke cannot overwrite a later result; `markMessageRead` behind `useMessageRead`
(`app/hooks/useMessageRead.ts`), shaped like `useMessageDelete` — optimistic flip, rollback on
throw, and a row that stops matching the active read filter is removed and the total decremented.
`MessageRow` shows the Unread badge and the read button only when `onToggleRead` is passed, so the
hub's compact row is unchanged. The "N of M loaded" scope line is gone because `total` now counts
the filtered set.

**Deliberately not built, per the run-(12) guardrail: read state on the `/admin` hub's
`MessagesPanel`.** The cost the guardrail asked for, measured: it is a prop, not a typing change.
`AdminMessagesPayload.messages` is `AdminMessageView[]` and `AdminMessageView` already carries
`readAt` (`messages.ts:9`), so the cached payload has the field today. The work is `useMessageRead`
wired through the panel's write-through `setMessages`/`setTotal` (as `useMessageDelete` is) and
`onToggleRead` on the row. One real hazard: entries already in localStorage under
`adminPanel:v1:` predate `readAt`, and `undefined === null` is false, so they paint as read until
the background revalidation lands. Bump `STORAGE_PREFIX` (`useCachedPanelData.ts:20`) to `v2` in
the same change. Not a row; fold it in if the hub ever wants read state.

**The notify channel is a decision, not a build.** A Discord/Slack webhook here and EM3's
owner-notification email are the same feature twice; the group file has said "pick one" since
2026-08-30 and neither board filed the question. Filed as decision #14. Do not build either until
it is answered.

**Do not fake it with localStorage.** It is per-browser, so the read state is wrong the moment the
page opens on a phone. Read status is server state.

### ☐ MA5 · Admin collections list at 100× — COLD, low priority

Backend-paged/filtered/sorted admin list; filter by kind (client/blog/hub/filter-backed/
suggested); membership-source distinction once CT3 exists. Mechanical; schedule when the
collection count demands it.

### ☐ MA6 · User change log + non-admin mutation path — BLOCKED (user, decision #16)

The governing 2026-07-06 decision (logged-in users' edits mutate canonical values, admin gets
notify/accept/revert) is designed and 0% implemented — there is still no non-admin write path at
all. Needs the §10 decisions from the logged-in-flow review answered, and overlaps refactor-board
H2b per its sequencing note. Big; treat as a design adjudication first.

## Group PF — Performance & platform

Context file: [2026-features/pf-performance-platform.md](2026-features/pf-performance-platform.md) —
**11 closed** (PF5 #356, PF1 #358, PF4 #360 VOID, PF10 #361, PF3 #362, PF9 #365, PF11 #366,
PF8 #367, PF6 #391, PF12 settings-only, PF2 dropped by decision); their write-ups are in that
file's Closed section. Count re-derived 2026-09-05 with
`grep -c -e '^### ✅' -e '^### ⛔' -e '^### ☑' 2026-features/pf-performance-platform.md` → 11.
Re-run that command rather than incrementing the number by hand: `grep -c '^### ✅'` undercounts
because a dropped item is ⛔, and the `(✅|⛔)` form returned 0 for the EM and LY files, whose closed
entries use ☑. A command that was right until the thing it counted grew a second form, twice.

### ☐ PF14 · Site-wide dark mode behind a user preference — COLD

Spun out of MA3 by decision #5 (2026-08-31 (7)). `app/(admin)/layout.tsx` removed admin-only dark
wiring on the reasoning that a real dark mode belongs to the whole site behind a user preference —
the user confirmed that reasoning, which makes this the item that reasoning implies.

Not scoped yet. Whoever picks it up starts with: where the theme token definitions live, whether
the SCSS modules already use tokens uniformly enough to swap, and where a preference persists
(cookie for SSR correctness, not `localStorage`, or the first paint flashes). **Do not build an
admin-only variant** — that is the thing decision #5 rejected.

### ☐ PF13 · Make the home page genuinely static — COLD, MR 1 shipped 2026-08-31 (7); steps 2–5 are ours

**MR 1 MERGED as #381** (2026-09-01; it was recorded "shipped" while still open for two runs).
**Re-classified BLOCKED → COLD 2026-09-05:** both remaining gates are this repo's own code, and the
board's own rule says work we have not done is COLD. The group file carries the revised step list;
its step 1 is the cookie hoist out of `fetchBase`. **Re-verified 2026-09-01, and still true:** `getCollectionBySlug`
(`app/lib/api/collections.ts:106-124`) still calls `fetchReadApi`, not the `fetchPublicRead` #381
introduced — and it carries `next: { revalidate, tags: [collection-{slug}] }` at the same time, so
it is cookie-forwarding and ISR-cached at once. That is the per-principal response under a shared
cache tag this board flagged in run (7): still live, and now known to sit inside PF13's own
blocker rather than beside it. MR 1 was worth doing on its own terms rather than only as a Cache
Components prerequisite. `fetchPublicRead` is `fetchReadApi` without the cookie read; five public
reads moved onto it — `getAllCollections`, `getCollectionsByLocation`, `getAllTags`,
`getAllLocations`, `searchImages`. Next hashes request headers into the fetch cache key and
`getServerCookieHeader` forwards the whole cookie store, so **any** cookie was forking the entry:
every signed-in visitor held a private copy of data identical for everyone. Those entries now
collapse to one. +119/−14 across 4 files, 0 test files broken.

**What still blocks the flag, and it is two things, not one.** `getCollectionBySlug` deliberately
kept `fetchReadApi`: its response varies by the `gallery_access_<slug>` cookie, because the backend
nulls `content` when the cookie fails to validate and that null IS the signal the gate reads. On a
cookie-free path every viewer would share one entry — most likely the locked one — and entering the
right password would not clear the gate. `getScopedAllCollections` likewise reads `ezac_session`.
And `meServer()` (`auth.ts:101`) reads cookies independently of `fetchBase` entirely, so `core.ts`
was never the only thing in the way.

**A latent hazard found while doing it, not fixed, and worth its own decision.** `collection-{slug}`
is a per-principal response registered under a shared cache tag. It does not leak today, but only
because Next's cache key includes the headers — an implementation detail of the framework, not a
property this repo asserts, and no test pins it. If that ever changes, or if anyone "optimizes"
that read onto the public path, locked and unlocked payloads merge. Its docblock now says so.

Original sizing below, still accurate for what remains.

Created by PF4's closure (#360). The home page renders per request because `CollectionPageWrapper`
awaits `headers()` (`resolveSsrViewport`) and `cookies()` (`meServer`) — so no segment-config value
can prerender it. The collection fetch is already cached, so the prize is the render and the
per-request `/auth/me` round trip, not the Spring call.

**"Its own sitting or two" was wrong, and so was the guardrail "PPR the home page only."** Next
16.3.1 reaches PPR through the app-wide `cacheComponents` flag; the per-route `experimental_ppr`
opt-in is gone. Enabling it errors every segment exporting `dynamic`/`revalidate`/`fetchCache` —
**19 of this repo's 21 route segments.** The documented path is opt-OUT: flag on, delete all 19
`force-dynamic` exports, codemod `instant = false` onto the rest, convert one route at a time.

The hard blocker that sat ahead of all of it is **gone**: `Footer` called
`new Date().getFullYear()` in a server component in the root layout, and synchronous IO during
prerender is a build error `instant = false` cannot defer. #375 moved the year into a Client
Component, so `grep -c 'new Date' app/components/Footer/Footer.tsx` is now **0** and the flag flip
is unobstructed.

And `/[slug]` does not escape. `CollectionPageWrapper` is rendered by `app/page.tsx`,
`app/[slug]/page.tsx` and `app/all-client-galleries/page.tsx`; restructuring its awaits changes the
tree for all three. Three sittings, and **PF12 was worth doing first** — the mechanical step shifts
caching semantics app-wide, which is the wrong thing to land through a deploy CI does not gate.
PF12 is done, so that condition is cleared.
Full write-up and commands in
[2026-features/pf-performance-platform.md](2026-features/pf-performance-platform.md).

**Adopted 2026-08-31 (decision #12): full speed.** Step 1 shipped as **#375** — `Footer`'s year
now renders from a Client Component, so the root-layout prerender blocker is gone and every other
route can be converted. Next's docs offer two escapes for synchronous IO, Suspense plus
`connection()` or a Client Component; Suspense would have made the footer a streamed hole on every
page, so the year popped in after paint. Steps 2 and 3 remain, in order and unchanged.

### ☐ PF7 · CloudFlare Phase 2 — COLD, ops

Proxy DNS through CloudFlare, restrict 80/443 to CF ranges in `terraform/security.tf`, close 8080,
rate-limit page rule on `*/api/public/*`, re-key `RateLimitFilter` off `CF-Connecting-IP`, drop the
`X-Real-IP` injection in `route.ts`, verify the EC2 IP no longer answers directly. Plan:
`docs/superpowers/plans/007-cloudflare-phase2.md` (gitignored — essentials in the group file).

## Group LY — Layout decisions

Context file: [2026-features/ly-layout-decisions.md](2026-features/ly-layout-decisions.md) —
**2 closed** (LY2 #369, pure adjudication; LY1 2026-09-02, a correction — `padRowToWidth` already
ships the gap-box behaviour, so nothing was built). No open LY row remains; the group section stays
so a future layout decision has a home.

## Session log

_Newest first, local dates. One line per `/next` run: what shipped (PR numbers), what was filed,
what's next. Older entries move to
[2026-features/session-log.md](2026-features/session-log.md)._

- 2026-09-05 (13) — **no feature work; the full critical review the #400 handoff asked for, applied
  to both boards.** Seven read-only slices (feature groups ×2, refactor board, every PR merged
  since 2026-08-24, cross-repo facts on backend `origin/main`, an adversarial pass on Group D, a
  missed-items sweep) and one apply pass; #399 merged first so every slice ran against one
  baseline. **What a session following the old boards would have got wrong:** the refactor
  board's NEXT RUN listed three items that had merged the day before it was written (C11 #352, D10
  #353, E18 #354 — and E18's "genuinely open" Half B was never a bug, `collection` has derived
  from `currentState` since June); this board's NEXT RUN was wholly done (#396, #397, #398, #399,
  BE#301); RC1 had no frontend half; **AU2's premise was false** (the admin passkey list and revoke
  shipped as BE#257 on 2026-08-31 — the row grepped the wrong controller — and decision #4 was
  being asked on it); **MA1 was not blocked on an absent endpoint** but on a question the backend
  board's #22 had addressed to this board since 2026-09-01; MA4's section described #396 as
  unbuilt. **What neither board tracked:** the backend's open HIGH S-29 — the public image search
  has no visibility predicate, so `/search`, `/location` and `/tag` surface client-gallery-only
  images (refactor-board D15 now carries the frontend follow-through); the lens choice is not
  URL-shareable and the drift guard cannot see it (C17); `CollectionRolesSection`'s mount fetch has
  no unmount guard (C18); the gallery-access save never evicts `collection-{slug}` (D11); the
  refactor board's row table was missing seven open items. The security pass settled the cache-key
  question from framework source: Next hashes headers into the fetch-cache key, so the gallery gate
  holds — no cross-visitor leak, now to be pinned by a test. Counts and refs: 63 refs re-resolved
  on this side (13 drifted, 5 gone), six "verified and holding" commands rewritten so their output
  IS the number, four decisions filed that blocked rows without a table entry (#14–#17), three
  handoffs written or updated (RC3 corrected `title` → `name`; MA4/RC1 marked merged; MA1/EM2 new).
  Five stale `docs/00x` lines and the README's Next/React/Node/rating claims fixed in the same PR.
  Next: AU2's admin half, PF13 step 1, PF14 scoping, CT1 — and the decision sitting.

- 2026-09-02 (11) — **merged #383, #384 and #394; opened two backend MRs that are no longer ours.**
  Auto-merge is disabled on this repo, so the stacked pair was updated, waited on and merged by
  hand. MA3 §5.5 turned out to be **already shipped three months earlier** (`b81b6ad`, 2026-06-08)
  and closed as a correction rather than built — the row was written the same day the migration
  landed and had survived three planning passes on re-reading. MA4's backend half and RC1 were
  built as BE#300/BE#301 off this board's own instructions, then **handed to the backend agent
  after the owner ruled this board frontend-only**; BE#300 has since merged, BE#301 is still open.
  **The squash-merge of #394 silently dropped its second commit**, taking the frontend-only rule
  and the handoff doc with it — both recovered this pass, and the check for it hoisted into "how to
  use this doc". Deleted the two MA4 `read_at` rows (false once V61 landed) and fixed one drifted
  ref (`@DeleteMapping` `:55` → `:85`). Next: MA4's frontend half, RC3, SD3.
