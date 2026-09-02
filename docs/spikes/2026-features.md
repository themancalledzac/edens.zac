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
  datasource is a real hole rather than a convenience. Verified 2026-08-31 (7); **#383 is still
  OPEN** (merge-ready as of 2026-09-01), so this is not yet on `main`.
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
  strength of a PR being **opened**, not merged. Resolved 2026-09-01: #382 merged, #383 is open
  and no longer `DIRTY`.
  PF2's leftover open section was the dangerous one: the group file said DROPPED, do not
  re-propose, while an open section beside it still read as a live scoping task. Two checks, both
  one line, run them every close-out:
  ```bash
  # every work-board row has a section, and every section has a row
  awk '/^## Work board/{f=1} /^\*\*Not on this board/{f=0} f' docs/spikes/2026-features.md \
    | grep -oE '^\| [A-Z]+[0-9]+' | tr -d '| ' | sort > /tmp/wb
  grep -oE '^### ☐ [A-Z]+[0-9]+' docs/spikes/2026-features.md | sed 's/### ☐ //' | sort > /tmp/se
  comm -3 /tmp/wb /tmp/se        # must be empty
  # no item has two headings in one file (an archive move that copied instead of moving)
  grep -ohE '^#{2,3} (☐ |✅ |⛔ )?[A-Z]{2}[0-9]+' <file> | grep -oE '[A-Z]{2}[0-9]+' | sort | uniq -d
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
- **`strict: true` branch protection makes a multi-MR run a treadmill.** Every merge puts the
  remaining PRs BEHIND, each needing another update-and-CI cycle. Queue them with
  `gh pr merge <N> --squash --auto` instead of updating each by hand, and expect a work-board
  conflict whenever two MRs in a run each remove a different row from it.
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

| Item | Scope                                                        | Repo    | Status                                                                                                                                                                                                                                                     |
| ---- | ------------------------------------------------------------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SD3  | Filter-bar dimension gaps (film stock, row merge)            | FE      | ☐ COLD — badges #373 and year #376 shipped; focal length BUILT AND DROPPED (user, #379)                                                                                                                                                                    |
| SD4  | `/explore` as a real drill-down explorer (Option C)          | FE      | ☐ BLOCKED — reconcile with refactor-board H5 design review first                                                                                                                                                                                           |
| SD6  | Clickable people chips (needs a person route + slug)         | BE+FE   | ☐ BLOCKED — no `/person` route and `ContentPersonModel` carries no slug                                                                                                                                                                                    |
| RC1  | Populate `parents` on public reads + `isFilm` backfill       | BE      | ☐ HANDED OFF, [BE#301](https://github.com/themancalledzac/edens.zac.backend/pull/301) still OPEN as of 2026-09-02. No frontend half until it lands                                                                                                         |
| RC2  | Similar-collections v1 (metadata-graph score + Related swap) | BE+FE   | ☐ BLOCKED — user: spike decisions D1–D4                                                                                                                                                                                                                    |
| RC3  | Collections_List render mode (embedded hub as card-row)      | BE+FE   | ☐ COLD — small; no new entity                                                                                                                                                                                                                              |
| RC4  | Suggested collections (admin suggestion rows)                | BE+FE   | ☐ BLOCKED — needs CT3 engine + RC1 metadata quality                                                                                                                                                                                                        |
| RC5  | CLIP/pgvector embedding tier                                 | BE+ML   | ☐ BLOCKED — user: spike decision D6 (infra commitment)                                                                                                                                                                                                     |
| CT1  | Collections-as-tags spec refresh against the typeless model  | docs    | ☐ COLD — produces a current D1–D12 matrix for CT2                                                                                                                                                                                                          |
| CT2  | Adjudicate the collections-as-tags decision matrix           | user    | ☐ BLOCKED — user; after CT1                                                                                                                                                                                                                                |
| CT3  | Saved-filter engine (AND-tag query, `source` column, sync)   | BE+FE   | ☐ BLOCKED — on CT2                                                                                                                                                                                                                                         |
| CT4  | Blog-as-date surface (`/blog` stream, per-day entries)       | BE+FE   | ☐ BLOCKED — on CT2                                                                                                                                                                                                                                         |
| CT5  | Auto-tag: `POST /collections/{id}/auto-tag` + admin button   | BE+FE   | ☐ COLD — independent of CT2                                                                                                                                                                                                                                |
| CT6  | Tag `type`/visibility model                                  | BE      | ☐ COLD — design confirm, then small schema work                                                                                                                                                                                                            |
| AU1  | Self-serve password reset                                    | BE+FE   | ☐ COLD — plan written and verified current                                                                                                                                                                                                                 |
| AU2  | Passkey credential list + revoke, enrollment-state UI        | BE+FE   | ☐ BLOCKED — user: endpoint shape (admin, user-facing, or both)                                                                                                                                                                                             |
| EM1  | SES production checklist (verify domain, DKIM, sandbox exit) | OPS     | ☐ COLD — ops; user drives the AWS console half                                                                                                                                                                                                             |
| EM2  | New-recipient-only gallery send flow                         | BE+FE   | ☐ BLOCKED — backend: one field is both the stored list and the send list (verified 08-31)                                                                                                                                                                  |
| EM3  | Contact-owner notification + `user_invite.created_by`        | BE      | ☐ COLD — two small backend items                                                                                                                                                                                                                           |
| EM4  | Gallery-password design pass (precedes any BCrypt work)      | user    | ☐ BLOCKED — user; backend board PARKED BCrypt behind it                                                                                                                                                                                                    |
| MA1  | Manage rail restructure (per-field PATCH, delete edit sheet) | FE(+BE) | ☐ BLOCKED — backend `PATCH /collections/{id}` still absent (re-checked 08-31); it is MR 1                                                                                                                                                                  |
| MA2  | `staging` system collection                                  | BE+FE   | ☐ BLOCKED — user: `HIDDEN` vs `UNLISTED` seed visibility                                                                                                                                                                                                   |
| MA3  | Mobile-first admin Phase 3 remainder                         | FE      | ☐ BLOCKED — §5.1 #386 and §5.2's filter bar [#392](https://github.com/themancalledzac/edens.zac/pull/392) shipped; **§5.5 closed 2026-09-01, it had shipped 2026-06-08**; only §5.2's bottom bar remains and it needs a light-surface respec from the user |
| MA4  | Messages admin: retention TTL, mark-as-read, notify channel  | BE+FE   | ☐ **COLD — the FE half is now ours to build.** BE half MERGED as [BE#300](https://github.com/themancalledzac/edens.zac.backend/pull/300) 2026-09-01; `?q=`, `?unread=` and `PATCH /{id}/read` are on backend `main`. Notify channel untouched              |
| MA5  | Admin collections list at 100× (paged/filtered/sorted)       | BE+FE   | ☐ COLD — low priority until collection count grows                                                                                                                                                                                                         |
| MA6  | User change log + non-admin canonical mutation path          | BE+FE   | ☐ BLOCKED — user: §10 decisions in the logged-in-flow review                                                                                                                                                                                               |
| PF14 | Site-wide dark mode behind a user preference                 | FE      | ☐ COLD — spun out of MA3 by decision #5; admin does not get its own                                                                                                                                                                                        |
| PF7  | CloudFlare Phase 2 (origin lockdown, `CF-Connecting-IP`)     | OPS     | ☐ COLD — infra, plan written, ~1–2 weeks lead time                                                                                                                                                                                                         |
| PF13 | Home page genuinely static (Cache Components / PPR)          | FE      | ☐ BLOCKED — MR 1 **merged** #381; still gated on `getCollectionBySlug` + `meServer` cookies (re-verified 2026-09-01)                                                                                                                                       |

**Not on this board, deliberately:** everything with a row on
[2026-summer-refactor.md](2026-summer-refactor.md) (H1's `/user` merge, F4's TaxonomyPage
consolidation, G3's `/user/selects`, F1's hook decomposition, C-group bugs); backend Bug #21
(dimensions default `0`) — tracked there via C9 and on the backend board; property-based layout
tests and function decomposition (debt, chapter 006); and three self-labeled unapproved ideas
(liked images, mobile text overlay, React 19 follow-ups), listed in the group files so they are
not rediscovered as new.

## NEXT RUN — set 2026-09-02 (12)

**This board is frontend-only. Do not open an MR or write a board row in `edens.zac.backend`.**
The rule and its history are in "How to use this doc". Backend items get specced here and handed
off.

**Run (11) closed out.** #383 and #384 merged by hand — auto-merge is disabled on this repo and
`--auto` fails with `enablePullRequestAutoMerge`, so a stacked pair means update, wait, merge,
repeat. MA3 §5.5 closed as already-shipped (#394). MA4's backend half and RC1 were built, then
handed to the backend agent; **[BE#300](https://github.com/themancalledzac/edens.zac.backend/pull/300)
has since merged**, which is what makes item 1 below startable.

**Two corrections worth carrying, both about believing a record instead of checking it.**

§5.5's premise was false and had been for three months. `TextBlockCreateModal` was migrated onto
the primitives on 2026-06-08 by `b81b6ad`; the row was written the same day and survived three
planning passes because each one re-read it rather than re-running it. The "verified and holding"
table is the only part of this board that gets re-run, and §5.5 was never in it. An unverified
claim that gates an item belongs in that table, not in prose.

The squash-merge of #394 then dropped its second commit, taking the frontend-only rule and the
handoff doc with it. Both were recovered here. A merged PR does not necessarily carry every commit
that was on its branch — check, per the rule in "How to use this doc".

### This run

Every item is frontend and needs no other repo.

1. **MA4's frontend half.** Swap `CommentsList` off #384's client-side filter onto `?q=`, and add
   the read/unread toggle against `PATCH /{id}/read` and `?unread=`. The contract is on backend
   `main` and the refs are in MA4's section, derived 2026-09-02 after #384 rewrote that file.
   **Guardrail: `/comments` only. Leave `MessagesPanel` and `useCachedPanelData` alone and report
   what adding read state to the cached payload would cost** — that cache maps a closed key set to
   payload types, so a new field there is a typing change, not a prop.
2. **RC3 — Collections_List render mode.** Add a per-row display hint so an embedded hub renders as
   a labeled card-row of its children instead of one parallax card. No new entity. The Related
   section's card-row renderer in `CollectionContentRenderer.tsx` is the visual precedent.
   **Guardrail: do not touch what feeds the Related section.** Changing its source is RC2, which is
   blocked on decision #1.
3. **SD3 — film stock filter dimension.** One slice, matching how badges (#373) and year (#376)
   shipped. **Guardrail: focal length was built and then dropped by the owner in #379. Do not
   rebuild it**, and if the film-stock slice starts to look like it needs the same shape, report
   that rather than reviving the dropped one.

**Ask first, batched.** Decision #6 — lone-last-row: gap-box spacer or FILLER atom? — is the one
whose answer becomes a frontend MR, so ask it in the opening message and make LY1 item 4 if it
comes back. Decisions #1, #2, #3, #4 and #10 each unblock something too, and the refactor board has
six more; put all of them in the same sitting rather than a second list later.

**Not startable, and why:** MA3 (§5.2's bottom bar needs a light-surface respec — a design call,
not an implementation). PF13 steps 2–3 (`getCollectionBySlug` still cookie-forwarding and
ISR-tagged at once). MA1 and SD6, both re-verified blocked. RC1 until BE#301 merges, and the
`isFilm` re-measure after that is the backend agent's, not ours.

## Verified and holding — do not re-investigate

Re-run 2026-09-01 (10), with the command beside each. Every row below was re-run this pass, not
re-read — all held. Two rows have been deleted rather than re-run, because the items shipped and the claims
they pinned are now false by construction: SD2's ("`locations` not enriched") in run (8), and
PF6's ("no error tracking, no seam to fill") in run (9) — `logger.ts` is no longer 14 lines and
the reporting path exists. Skip these on the next reconciliation unless something in their
neighbourhood merges.

| Claim                                                           | Command                                                                                                       | Result                                                                      |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| PF13: 19 segments export `dynamic`, and the flag rejects all 19 | `grep -rn 'export const dynamic' app --include='*.tsx' \| wc -l`, then `cacheComponents: true` + `next build` | 19; build names exactly those 19 files                                      |
| MA1: `PATCH /collections/{id}` absent                           | `git grep -n '@PatchMapping' origin/main -- src/main/java/` in the backend                                    | 5 hits, all sub-resource or unrelated                                       |
| CT5: no auto-tag endpoint                                       | `git grep -c 'auto-tag' origin/main -- src/main/java/`                                                        | 0                                                                           |
| AU2: no passkey list/revoke                                     | `git show origin/main:...auth/WebAuthnController.java \| grep -cE '@(Get\|Post\|Put\|Patch\|Delete)Mapping'`  | 4 endpoints, register/login × start/finish                                  |
| MA4: delete already shipped                                     | `git grep -n '@DeleteMapping' origin/main -- '*MessagesControllerAdmin.java'` in the backend                  | `@DeleteMapping("/{id}")` at `:85` (was `:55`; BE#300 added PATCH above it) |
| PF2: image count for any backfill                               | `curl -s 'localhost:8080/api/read/content/images/search?page=0&size=1'` → `.totalElements`                    | 1424 images across 39 collections                                           |
| PF13: `getCollectionBySlug` is cookie-forwarding AND ISR-tagged | read `app/lib/api/collections.ts:106-124`                                                                     | `fetchReadApi` + `next: { revalidate, tags }` — blocker holds, hazard live  |
| MA1: `PATCH /collections/{id}` still absent                     | `git grep -n '@PatchMapping' origin/main -- 'src/main/java/**/CollectionController*.java'` in the backend     | no matches                                                                  |
| SD6: no `/person` route and no slug on a person                 | `find app -type d -name 'person*'`, then `grep -n 'ContentPersonModel' app/types/Metadata.ts`                 | route absent; `= IdNameModel` (id+name only)                                |
| Every `file:line` ref on this tracker resolves                  | resolve all 11 against `main`, matching anchor text                                                           | 11/11 correct, 0 drifted                                                    |

**One recorded command was imprecise rather than wrong, and is now fixed.** AU2's
`grep -n 'Mapping('` returns **5** lines, not the 4 the row claims — the fifth is the
class-level `@RequestMapping("/api/auth/webauthn")` at `:37`. The claim was right and the
command was sloppy, which is exactly the shape that gets a number disputed across three
passes. The row now records a command whose output IS the number.

**Both MA4 `read_at` rows were deleted 2026-09-02 (11) — BE#300 merged and V61 is on backend
`main`, so the claims are false by construction.** The prediction that they would go false was
recorded a run earlier and acted on here; that is the intended lifecycle for a row, not an
exception. The RC1 line below goes the same way when BE#301 merges.

**One ref drifted this pass, in the neighborhood of what merged, as usual.**
`@DeleteMapping("/{id}")` moved `:55` → `:85` because BE#300 inserted the PATCH endpoint above it.
Its recorded command was also imprecise — bare `DeleteMapping` matches the import line too, so it
returned 2 hits for 1 endpoint. Same shape as the AU2 correction: the command now names the
annotation, so its output IS the answer.

**Not re-checked this pass, and therefore unverified:** RC1's live data counts (`parents: null`
everywhere; `isFilm` 0/5, 0/5, 0/7 against `dolomites-film`'s 33/33). Those were measured against
live data on 2026-08-30 and need a live backend to re-run, so treat them as a week-old measurement
rather than a current fact.

## Decisions for Zac

Batch these at the start of a session. Each unblocks the named item; none blocks a COLD item.

| #      | Question                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Unblocks |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1      | Similar-collections spike D1–D6 (Related source mix, score location, hubs in slots, auto-promote threshold, suggestion surface, pgvector). Recommendations recorded in [2026-features/rc-similar-collections.md](2026-features/rc-similar-collections.md)                                                                                                                                                                                                                                                                                                                                                                                                                                               | RC2, RC5 |
| 2      | Staging seed visibility: `HIDDEN` or `UNLISTED`?                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | MA2      |
| 3      | Gallery passwords: what should they DO? (Design pass; BCrypt is parked behind it)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | EM4      |
| 4      | Passkey revocation shape: admin endpoint, user-facing list-and-remove, or both?                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | AU2      |
| ~~5~~  | ~~Does the dark-admin premise survive?~~ **ANSWERED 2026-08-31 (7): yes — site-wide preference, later.** The removal was correct; admin does not get its own dark wiring. MA3's remaining surfaces build on a light surface and proceed now. Dark mode becomes its own item, filed as PF14.                                                                                                                                                                                                                                                                                                                                                                                                             | —        |
| ~~6~~  | ~~Lone-last-row: gap-box spacer or FILLER atom?~~ **ANSWERED 2026-09-02: neither — the gap-box behaviour already ships.** `padRowToWidth` has appended a BLANK spacer to an under-filled trailing row since the 2026-07-16 row-width normalization. Zac declined both the FILLER-atom rewrite (it changes no rendered output) and altering the solo-hero rule. LY1 closed as a correction.                                                                                                                                                                                                                                                                                                              | —        |
| ~~7~~  | ~~Panel width vs page height~~ **ANSWERED 2026-08-31: keep the shared width; the height cost stands.** Asked narrowly, since a 'V' split makes a column uniform by construction and the predicate can only reject SIDE-BY-SIDE panel columns: those are still one group and still share a width. No code change — LY2 closed as pure adjudication.                                                                                                                                                                                                                                                                                                                                                      | —        |
| ~~8~~  | ~~Error tracking: Sentry or CloudWatch?~~ **ANSWERED 2026-08-31 (7): CloudWatch.** Already on AWS, no new vendor, no third-party script on every page. Accepts the tradeoff — no grouping and no source maps unless wired — so PF6 must scope source-map upload or accept minified traces. Recorded in [PF6](2026-features/pf-performance-platform.md).                                                                                                                                                                                                                                                                                                                                                 | —        |
| ~~11~~ | ~~`engines.node` vs the dev machine~~ **ANSWERED 2026-08-31: "whatever is best long term practice."** Read as: `engines.node` becomes an unbounded floor, a `.nvmrc` names the blessed version, and CI reads that file instead of a hardcoded literal — one source of truth, no upper bound to age out. Shape recorded in [PF11](2026-features/pf-performance-platform.md).                                                                                                                                                                                                                                                                                                                             | PF11     |
| ~~9~~  | ~~Which host serves production?~~ **FULLY ANSWERED 2026-08-31 — AWS Amplify Hosting**, confirmed by the user after `curl` had narrowed it to CloudFront-fronted AWS running a live Next server (Vercel and static-S3 eliminated). Auto-deploys from `main` in ~15 min. Recorded in `CLAUDE.md`; shipped as PF9 (#365).                                                                                                                                                                                                                                                                                                                                                                                  | —        |
| ~~12~~ | ~~Cache Components: adopt app-wide?~~ **ANSWERED 2026-08-31: adopt, full speed.** Step 1 (`Footer`'s `new Date()`) shipped as #375; the app-wide flag flip and the per-route conversion remain, and PF12 landing removes the reason to hold them                                                                                                                                                                                                                                                                                                                                                                                                                                                        | —        |
| 10     | `/explore` direction: reconcile Option C with the H5 MenuDropdown review                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | SD4      |
| ~~13~~ | ~~Does Amplify already ship this app's server stdout/stderr to a CloudWatch log group?~~ **ANSWERED 2026-08-31 (9): yes.** Amplify Hosting already forwards this app's server stdout to a log group, so the server half was a formatting change inside `logger.ts` — no AWS SDK, no log group to create, no credentials, no execution-role permission, and `package.json` stays at five dependencies. The rider was answered too: the user will set `NODE_OPTIONS=--enable-source-maps` in the console, so `experimental.serverSourceMaps` is now on and server traces are readable with nothing published to browsers. Shipped as PF6 ([#391](https://github.com/themancalledzac/edens.zac/pull/391)). | —        |

Collections-as-tags D1–D12 (item CT2) joins this list after CT1 rewrites the matrix in current
terms. Six more product calls are already batched on the refactor board (H1, F4, G3, `.srOnly`,
G2b, the CSS guard) — put all of these to the user as one sitting, not two lists.

## Group SD — Search & discovery

Context file: [2026-features/sd-search-discovery.md](2026-features/sd-search-discovery.md) —
**4 merged** (SD1 #357, SD2 backend #277, SD7 backend
[#293](https://github.com/themancalledzac/edens.zac.backend/pull/293), SD5 #382); their write-ups
are in that file's Closed section. Count re-derived 2026-09-01 with
`grep -cE '^### (✅|⛔)' 2026-features/sd-search-discovery.md` → 4.

### ☐ SD3 · Filter-bar dimension gaps — COLD, one slice per dimension

Still absent from `app/types/GalleryFilter.ts`: focal-length ranges (Wide/Normal/Tele), film-stock
secondary filter (conditional on Film + 2+ stocks), proportional row merging. Each is an
independent slice on the shared `FilterToolbar`.

The active-filter summary shipped as **#373** and **year chips as #376**. Two things the row had
wrong, both found by building: it listed "removable badges + Clear-all" as one slice when Clear-all
was already built, and it filed year chips beside the other three as though they were peers. Year
is the only one of the four that reaches collection tiles — a tile has no capture day but does have
a `collectionDate` — so it gave `/all-collections` its first working time filter rather than adding
a facet to pages that already had several. Sizing a dimension slice by "it's another dropdown"
misses which surface it unlocks.

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

Two ways in, and the choice is the blocker:

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

### ☐ RC1 · `parents` on public reads + `isFilm` backfill — HANDED OFF, BE#301 still open

Two data bugs verified live against all 39 collections on 2026-08-30: public reads return
`parents: null` everywhere (so `contentLayout.ts`'s Related section can only show curated
siblings), and `isFilm` is unset on `chamonix-film` (0/5), `vienna-film` (0/5), `gorge-50km-film`
(0/7) while `dolomites-film` is 33/33.

**MR open 2026-09-01 (10): [BE#301](https://github.com/themancalledzac/edens.zac.backend/pull/301),
filed on the backend board as #31 in the same pass.**

**`parents` is fully fixed.** `findAllParentCollectionsByChildId` now takes `listedOnly`, mirroring
`findSiblings`. Public reads apply two gates — `c.visibility = 'LISTED'` (a HIDDEN parent is a dead
link and a disclosure at once) and `cc.visible = true` (a membership the owner hid must not
resurface). Admin and the three internal callers pass `false` and are unchanged.

**The `isFilm` half is only partly closed, and this is the part to carry forward.** V62 restates
the two rules the ingest path already enforces — a film stock implies film, a flagged film body
implies film — and deliberately does NOT infer film from a `-film` slug. But **V23 flags exactly
two bodies** (Hasselblad 500cm, Nikon FM3A), which is almost certainly why `dolomites-film` reads
33/33 and the other three read zero. If those three were shot on a third body, the migration will
not touch them and **flagging that body is a data call for the user**.

**Re-measure after the deploy**, against a live backend. The 0/5, 0/5, 0/7 numbers are a
2026-08-30 measurement, not a current fact, and the local backend was down this pass.

### ☐ RC2 · Similar-collections v1 — BLOCKED (user, decision #1)

The ~40-line weighted metadata-graph score (parent/child +5, siblings +5, co-children +3, image/
location/people/tag Jaccard, date decay) produced correct top-5s on live data. Backend
`GET /api/read/collections/{slug}/related?limit=5` or an enriched field; FE swaps the Related
section's source; >5 strong relations auto-promote to a card-row. Nothing stored — derived per
request, cached by the existing `collection-{slug}` tag. Ticketed on the spike's recommendations
as defaults; implementation waits for a reply-by-number on D1–D4. Full algorithm, weights and live
results in the group file.

### ☐ RC3 · Collections_List render mode — COLD, small

An embedded COLLECTION content row today renders as one parallax card. Add a per-row display hint
(`render_mode: CARD | LIST`, or infer LIST when the referenced collection `hasChildren`) so an
embedded hub renders as a labeled card-row of its children. No new entity. The Related section's
card-row renderer in `CollectionContentRenderer.tsx` is the visual precedent.

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
derived). The refresh: recast the §5 disposition table, re-audit backend V40–V52 changes, verify
whether `DisplayMode FIXED` shipped, incorporate one-way siblings, and re-emit the D1–D12 decision
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

The principled version of the shipped D5 hack: a `type` column on `TagEntity` (explicitly not
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

### ☐ AU2 · Passkey list + revoke — BLOCKED (user, decision #4)

`WebAuthnController.java` has exactly four mappings (register/login × start/finish) — no list, no
delete. A compromised authenticator can only be handled by disabling the whole account. One gap
named in three docs (009, CURRENT-STATE §5, backend board decisions). The FE enrollment-state UI
follows the endpoint.

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
actually new. **The backend-board row is still owed**: that repo was mid-work in another session
on 2026-08-31 (dirty tree on a feature branch), so nothing was written there — file it in the next
backend session. The frontend reshape follows the backend MR unchanged.

**On MA1's sequencing, which this run was asked to report.** Nothing found argues for doing MA1
first, and one thing argues against: MA1 is blocked on an absent `PATCH /collections/{id}`, so both
items now wait on backend MRs and MA1's is the larger. The collision is unchanged — MA1 deletes
`InfoTab.tsx` wholesale, so any EM2 frontend built there is thrown away — but since EM2's frontend
can no longer go first, that ordering question is moot until the backend lands. Whichever backend
MR lands first should settle it.

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

### ☐ MA1 · Manage rail restructure — BLOCKED (backend endpoint absent)

The 2026-08-12 plan (Approach B): per-field optimistic PATCH commits replace the batch-save edit
sheet. Eleven FE tasks — `patchCollection` + `buildFieldPatch`, `commitField` in
`useCollectionEdit`, remove the staging buffer/dirty tracking/Save-Cancel cells,
`InlineEditableDate` + `InlineEditableLocations`, rating into `titleAside`,
`CollectionAdminRail` as `railExtras`, delete `CollectionEditSheet.tsx` + `InfoTab.tsx` +
`StructureTab.tsx` + 3 stylesheets, density-tier persistence, reset-to-chronological, dead-code
sweep (drop `FIXED`, prune orphaned `CollectionUpdateRequest` fields), test
rewrite (`useCollectionEdit.buffer.test.tsx` pins the buffer policy this deletes). Prereqs merged
(`railExtras` threads through; 0244–0247 landed). **Backend `PATCH /collections/{id}` does NOT
exist** — re-verified 2026-08-31 (4) with `git grep -n "@PatchMapping" origin/main -- src/`: five
hits, all sub-resource or unrelated (`/content/images`, `/content/gifs/{id}`, admin-user `/{id}`,
`/collections/{collectionId}/rating`, `/collections/{collectionId}/images`).

**Task 10 shrank — `TODO(A3)` is gone and its feature shipped (corrected 2026-08-31 (4)).** The
task list said "resolve `TODO(A3)` at `useCollectionEdit.tsx:1571`". Zero hits for `TODO(A3)`
anywhere in `app/` now: `c1dd1d4`'s inline-comment sweep deleted the comment on 2026-08-30, and
`b66c39a` had already built what it asked for — `saveTagAsCollection` is live at
`useCollectionEdit.tsx:1441`, wired through `StructureTab.tsx:167`, with its own
`SaveAsCollectionModal`. Nothing to resolve; the sub-item is struck from task 10. It is MR 1 of this item and belongs on the backend board. **Collides with:** anything touching
`InfoTab`/`StructureTab` (EM2, the roles section) and the refactor board's F1 — sequence
deliberately. Wants its own sessions.

### ☐ MA2 · `staging` system collection — BLOCKED (user, decision #2)

Re-specced against the typeless model (the old plan targets the deleted enum). Open: seed
migration (`HIDDEN` vs `UNLISTED` first), auto-parent beyond the upload path, the
`enforceVisibility()` slug-bypass carve-out, FE `STAGING_SLUG` beside `HOME_SLUG` in
`app/utils/collectionSlugs.ts` + manage-page badge. Backend-heavy: spec it here and hand it off, do
not build it in that repo.

### ☐ MA3 · Mobile-first admin Phase 3 remainder — BLOCKED, only §5.2's respec remains

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

### ☐ MA4 · Messages admin features — COLD, and the frontend half is startable now

**BE#300 merged 2026-09-01, so the backend half is done.** The contract is on backend `main`,
verified 2026-09-02 by re-running the command rather than trusting the PR page:

```bash
git grep -n 'PatchMapping("/{id}/read")\|Boolean unread\|String q' origin/main -- '*MessagesControllerAdmin.java'
```

→ `Boolean unread` at `:46`, `String q` at `:47`, `@PatchMapping("/{id}/read")` at `:70`.
`AdminMessageView` gained `readAt` as a fifth component, additively, so nothing breaks until the
frontend opts in.

The backend agent kept the board row rather than reverting it, so this is their `#30`. The
[handoff](2026-features/backend-handoff-MA4-RC1.md)'s revert instruction now applies to BE#301 only.

#### The frontend half — what it touches

Two surfaces render messages and both need the change:

- `app/(admin)/comments/CommentsList.tsx` — #384's search. `matchesQuery` at `:22` and the `useMemo`
  filter at `:50` are what `?q=` replaces. The `searching` scope line (`:63`, `:78`) exists only to
  admit the filter is partial, and goes with it.
- `app/components/MessagesPanel/MessagesPanel.tsx` — the `/admin` hub panel.

`app/lib/api/messages.ts` needs `q`/`unread` on `getAdminMessages` (`:17`) plus a new
`markMessageRead`; `AdminMessageView` (`:3`) gains `readAt`.

**Those refs were derived 2026-09-02, after #384 rewrote `CommentsList.tsx`.** Do not trust any
`CommentsList` ref written before that date.

**`useMessageDelete` is the precedent for the toggle, not a thing to extend.** It owns optimistic
update plus rollback-on-throw for one row-level mutation. Mark-read is that same shape.

**The trap:** `MessagesPanel` reads through `useCachedPanelData`, whose cache keys are a closed set
mapped to payload types deliberately — a free-form key hands the value back as `unknown`. Adding
`readAt` to the cached payload touches that typing.

---

From 007's "Housekeeping". **The row oversized this by naming work that was already done.** Checked
against the backend's `origin/main`:

| Piece            | State                                                                                                                                                                                                                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Delete**       | **already shipped, both ends, before this item was ever picked up.** `@DeleteMapping("/{id}")` at `MessagesControllerAdmin.java:85` (was `:55` before BE#300); frontend `deleteAdminMessage` + `useMessageDelete` with optimistic rollback; the button has been rendering on both surfaces. Nothing to build. |
| **Search**       | **shipped #384.** Client-side over the loaded set — see below.                                                                                                                                                                                                                                                |
| **Mark-as-read** | **MERGED, [BE#300](https://github.com/themancalledzac/edens.zac.backend/pull/300)** 2026-09-01, with `?unread=` and `?q=` folded in; backend board `#30`. **FE half is now COLD** — swap #384's client-side filter onto `?q=`, add the read toggle. Refs above.                                               |
| Retention TTL    | **shipped 2026-08-31 (8)**, backend #281, filed as backend board #26                                                                                                                                                                                                                                          |
| Notify channel   | untouched, still open                                                                                                                                                                                                                                                                                         |

**Re-classified BLOCKED → COLD, 2026-09-01 (10).** This item spent two runs marked BLOCKED on the
`messages` table having no read column. That is not a blocker: the migration is one we write, and
the full backend MR spec has been sitting complete in this very section the whole time. **An item
is only BLOCKED when someone else has to act** — a user decision, another team, or another item
landing first. Work we have not done yet is COLD, however much of it there is. The column is still
absent, re-verified 2026-09-01 (no `read_at`/`is_read` in any migration; latest is V60) — that is
the starting state, not an obstacle.

**What the missing column means.** `V17__create_messages_table.sql` is the whole schema — `id`,
`email`, `message`, `created_at`. Four columns, all load-bearing, nothing to repurpose. Verified no
later migration touches the table:
`git grep -n -iE "alter table (public\.)?messages|read_at|is_read|unread" origin/main -- src/main/resources/db/migration/`
→ **no matches** (re-run 2026-08-31 (7); migrations run to V60).

**Backend MR spec, ready to lift.** `V61__messages_read_at.sql` adding
`read_at TIMESTAMP NULL` plus an index; `readAt` on `MessageEntity` and in `MESSAGE_ROW_MAPPER` and
the SELECT lists; a `markRead(long id, boolean read)` on `MessageRepository` writing `NOW()` or
NULL so mark-unread falls out of the same method; `readAt` as a fifth component on
`AdminMessageView` (additive — the frontend keeps working until it opts in); and
`@PatchMapping("/{id}/read")` returning 204/404 to match the existing delete, which is already the
shape `useMessageDelete` expects.

**Cross-repo filing was DECLINED in run (7) and is now DONE.** That pass could not write to the
backend board because another session held the checkout. Run (8) filed the TTL there as **#26** from
a worktree, so the decline is closed. The mark-as-read spec above is still owed a backend row —
file it as its own item, not folded into #26.

**Retention TTL — shipped OFF, and the first opt-in only reports.**
`app.messages.retention.days` defaults to `0` (the nightly job returns before touching the
database); `app.messages.retention.dry-run` defaults to `true` (logs the count it would delete,
deletes nothing). Set `days`, read the count from the logs, then set `dry-run=false`. Two properties
rather than one because the deletion is irreversible — the contact form is the only writer, nothing
archives what a purge removes — and a local backend can point at production, so the reporting mode
is how you find out safely from the environment that actually holds the rows. Both guards
mutation-proved. **A retention TTL has no frontend half**: it is configuration, not a control, so
MA4's BE+FE scope applies to mark-as-read and the notify channel only.

**Do not fake it with localStorage.** It is per-browser, so the read state is wrong the moment the
page opens on a phone. Read status is server state.

**What #384's search does and does not do.** It filters the messages already loaded, because
`GET /api/admin/messages` takes only `limit` and `offset` — no query parameter, no WHERE clause in
`MessageRepository.findAll`. The count line says `N of M loaded` and adds `K not yet loaded` so the
box never looks exhaustive; the page loads 50 at a time against a server cap of 200. If that gets
annoying, the fix is a `?q=` param — which is the same WHERE-clause work as the `?unread=` filter
mark-as-read will want, so **fold both into one backend MR** rather than filing two.

**Unverified, and it decides nothing yet:** how many messages actually exist. It comes from `total`
on the admin list endpoint, which 401s without a session. `/comments` prints it in its own header
for anyone who logs in. Under ~200 the client-side filter is free; above ~2000, do it server-side.

### ☐ MA5 · Admin collections list at 100× — COLD, low priority

Backend-paged/filtered/sorted admin list; filter by kind (client/blog/hub/filter-backed/
suggested); membership-source distinction once CT3 exists. Mechanical; schedule when the
collection count demands it.

### ☐ MA6 · User change log + non-admin mutation path — BLOCKED (user)

The governing 2026-07-06 decision (logged-in users' edits mutate canonical values, admin gets
notify/accept/revert) is designed and 0% implemented — there is still no non-admin write path at
all. Needs the §10 decisions from the logged-in-flow review answered, and overlaps refactor-board
H2b per its sequencing note. Big; treat as a design adjudication first.

## Group PF — Performance & platform

Context file: [2026-features/pf-performance-platform.md](2026-features/pf-performance-platform.md) —
**11 closed** (PF5 #356, PF1 #358, PF4 #360 VOID, PF10 #361, PF3 #362, PF9 #365, PF11 #366,
PF8 #367, PF6 #391, PF12 settings-only, PF2 dropped by decision); their write-ups are in that
file's Closed section. Count re-derived 2026-08-31 (9) with
`grep -cE '^### (✅|⛔)' 2026-features/pf-performance-platform.md`. Re-run that command rather
than incrementing the number by hand: the older `grep -c '^### ✅'` undercounts, because a
dropped item is marked ⛔ rather than ✅ and PF2 is one. Same failure mode as AU2's
`grep -n 'Mapping('` — a command that was right until the thing it counted grew a second form.

### ☐ PF14 · Site-wide dark mode behind a user preference — COLD

Spun out of MA3 by decision #5 (2026-08-31 (7)). `app/(admin)/layout.tsx` removed admin-only dark
wiring on the reasoning that a real dark mode belongs to the whole site behind a user preference —
the user confirmed that reasoning, which makes this the item that reasoning implies.

Not scoped yet. Whoever picks it up starts with: where the theme token definitions live, whether
the SCSS modules already use tokens uniformly enough to swap, and where a preference persists
(cookie for SSR correctness, not `localStorage`, or the first paint flashes). **Do not build an
admin-only variant** — that is the thing decision #5 rejected.

### ☐ PF13 · Make the home page genuinely static — BLOCKED, MR 1 shipped 2026-08-31 (7)

**MR 1 MERGED as #381** (2026-09-01; it was recorded "shipped" while still open for two runs).
**Steps 2–3 re-verified still blocked, 2026-09-01:** `getCollectionBySlug`
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
1 closed (LY2, #369, adjudication only); its write-up is in that file's Closed section.

### ✅ LY1 · Lone-last-row sizing — CLOSED 2026-09-02, the behaviour already shipped

**Decision #6 had a false premise.** The row said "two competing designs, neither built", on the
evidence of `grep -rn "FILLER\|gapBox\|endRowGap" app/utils` returning 0. That grep is a NAMING
check, not a behaviour check, and the gap-box design ships — under the name BLANK.

`padRowToWidth` (`app/utils/rowCombination.ts:683`) appends a horizontal BLANK sibling to an
under-filled trailing row so the real item renders at its proportional width share instead of
stretching to full width. That is the gap-box design as written. It landed in the 2026-07-16
row-width normalization, which is why a grep for the other design's vocabulary missed it.

```bash
npx jest tests/utils/rowCombination.blankPadding.test.ts   # → 14 passed
```

Among those 14: "pads an under-filled single-item row with one blank right sibling" and "renders
the real item at its natural proportional share S/rowWidth".

**The row's stated defect was also wrong about the mechanism.** "A lone image renders full-width
regardless of its rating" — rating has nothing to do with it. The only lone item that still fills
the row is one passing `isSoloHero`, which gates on aspect-ratio extremeness, and that full-width
row is deliberate.

**Zac's answer, 2026-09-02: close it, build nothing.** He declined the FILLER-atom rewrite — moving
the same behaviour from a post-pass into `compose()`/`buildAtomic`, changing no rendered output —
and declined altering the solo-hero panorama rule. **Do not re-propose either design.**

The lesson, and the reason this sat blocked for weeks: this board already carries "a fix is not
verified by the absence of the string it moved". This is that rule in reverse — a FEATURE was
recorded as unbuilt because the string naming it was absent. A grep for a design's vocabulary
cannot answer whether the behaviour exists. Only running it can, which is why the row above now
records a command whose output IS the answer.

## Session log

_Newest first, local dates. One line per `/next` run: what shipped (PR numbers), what was filed,
what's next. Older entries move to
[2026-features/session-log.md](2026-features/session-log.md)._

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

- 2026-09-01 (10) — **no new feature work; a merge-readiness and reconciliation pass.** Run (9)'s
  three MRs all merged ([#391](https://github.com/themancalledzac/edens.zac/pull/391),
  [#392](https://github.com/themancalledzac/edens.zac/pull/392), backend
  [#293](https://github.com/themancalledzac/edens.zac.backend/pull/293)), and run (7)'s four-PR
  backlog was cleared: **#381 and #382 merged**, #383 and #384 made merge-ready and left for the
  user. **The find that justifies the pass: #383 had never run CI, once, in two runs.** Not red —
  absent. GitHub builds `refs/pull/N/merge` for a `pull_request` event and a conflicting PR has no
  merge ref, so the workflow never starts and the PR page shows nothing rather than a failure. Its
  conflicts also turned out to be **stale intent rather than disagreement** — #389 had already
  removed the AU4 sections #383 was written to remove, so resolving to `main` took its board diff
  to zero and its unique prose was folded into the closed entry instead of dying with the losing
  side. **Everything the board claimed, held.** All eight recorded counts re-run (PF13 19, LY1 0/2,
  PF group 11, SD group 4, Sentry 0, migrations still V60) and all **11** `file:line` refs resolved
  — 0 drifted, which is what the neighbourhood rule predicts, since nothing that merged touched a
  file the tracker cites. Four fact-blocked items were re-checked and **all four still hold**
  (PF13, MA1, MA4's missing column, SD6) — now recorded so the next pass can skip them. **One
  re-classification: MA4 was BLOCKED and should have been COLD** — its "blocker" is a migration we
  write ourselves, which is not a blocker, and the spec has been sitting complete in its own
  section. **SD7 merged but did NOT unblock SD6**: `Records.Person` is `{id, name}` with no slug,
  which is exactly what SD6 waits on. Four working rules hoisted, including the CI-never-ran trap,
  "measure both sides of a change", and that `git checkout -b` fails _dirty_ under the agent
  sandbox. Next: merge #383/#384, then MA4 mark-as-read with `?q=`, MA3 §5.5, RC1.
