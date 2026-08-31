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
- **Backend items get a row on the backend board when picked up**
  (`edens.zac.backend/ai_docs/reviews/2026-08-22-backend-cleanup-spike.md`). This board is the
  product-level view across both repos; the backend board is where a backend session tracks its MR.
  File the row there in the same pass that starts the work — a cross-repo item filed on one board
  only is invisible where it lands.
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
- **An item that only wires existing tested primitives into a new route is one sitting**, however
  many files it touches. SD1 was estimated at 2–3 and took 1. An item that deletes and rewrites
  (MA1) does not get this discount.

## Work board

Open rows only. FE = this repo, BE = `edens.zac.backend`, OPS = console/infra work.

| Item | Scope                                                             | Repo    | Status                                                                                    |
| ---- | ----------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------- |
| SD2  | Enrich `locations` on collection blocks                           | BE      | ☐ COLD — small; makes the shipped `/collections` location filter work                     |
| SD3  | Filter-bar dimension gaps (film stock, row merge)                 | FE      | ☐ COLD — sliceable; badges #373, year #376, focal length #379 shipped, two slices left    |
| SD4  | `/explore` as a real drill-down explorer (Option C)               | FE      | ☐ BLOCKED — reconcile with refactor-board H5 design review first                          |
| SD5  | Verify people/location chip-click-to-filter                       | FE      | ☐ COLD — cheap verification task                                                          |
| RC1  | Populate `parents` on public reads + `isFilm` backfill            | BE      | ☐ COLD — unblocks RC2's public rendering; two verified data bugs                          |
| RC2  | Similar-collections v1 (metadata-graph score + Related swap)      | BE+FE   | ☐ BLOCKED — user: spike decisions D1–D4                                                   |
| RC3  | Collections_List render mode (embedded hub as card-row)           | BE+FE   | ☐ COLD — small; no new entity                                                             |
| RC4  | Suggested collections (admin suggestion rows)                     | BE+FE   | ☐ BLOCKED — needs CT3 engine + RC1 metadata quality                                       |
| RC5  | CLIP/pgvector embedding tier                                      | BE+ML   | ☐ BLOCKED — user: spike decision D6 (infra commitment)                                    |
| CT1  | Collections-as-tags spec refresh against the typeless model       | docs    | ☐ COLD — produces a current D1–D12 matrix for CT2                                         |
| CT2  | Adjudicate the collections-as-tags decision matrix                | user    | ☐ BLOCKED — user; after CT1                                                               |
| CT3  | Saved-filter engine (AND-tag query, `source` column, sync)        | BE+FE   | ☐ BLOCKED — on CT2                                                                        |
| CT4  | Blog-as-date surface (`/blog` stream, per-day entries)            | BE+FE   | ☐ BLOCKED — on CT2                                                                        |
| CT5  | Auto-tag: `POST /collections/{id}/auto-tag` + admin button        | BE+FE   | ☐ COLD — independent of CT2                                                               |
| CT6  | Tag `type`/visibility model                                       | BE      | ☐ COLD — design confirm, then small schema work                                           |
| AU1  | Self-serve password reset                                         | BE+FE   | ☐ COLD — plan written and verified current                                                |
| AU2  | Passkey credential list + revoke, enrollment-state UI             | BE+FE   | ☐ BLOCKED — user: endpoint shape (admin, user-facing, or both)                            |
| AU4  | Local admin dev-session affordance (post backend #243)            | FE+BE   | ☐ COLD — unblocked 08-31: G6 landed as #351, so the corrected rule now states the reality |
| EM1  | SES production checklist (verify domain, DKIM, sandbox exit)      | OPS     | ☐ COLD — ops; user drives the AWS console half                                            |
| EM2  | New-recipient-only gallery send flow                              | BE+FE   | ☐ BLOCKED — backend: one field is both the stored list and the send list (verified 08-31) |
| EM3  | Contact-owner notification + `user_invite.created_by`             | BE      | ☐ COLD — two small backend items                                                          |
| EM4  | Gallery-password design pass (precedes any BCrypt work)           | user    | ☐ BLOCKED — user; backend board PARKED BCrypt behind it                                   |
| MA1  | Manage rail restructure (per-field PATCH, delete edit sheet)      | FE(+BE) | ☐ BLOCKED — backend `PATCH /collections/{id}` still absent (re-checked 08-31); it is MR 1 |
| MA2  | `staging` system collection                                       | BE+FE   | ☐ BLOCKED — user: `HIDDEN` vs `UNLISTED` seed visibility                                  |
| MA3  | Mobile-first admin Phase 3 remainder                              | FE      | ☐ BLOCKED — user: does the dark-admin premise survive its partial reversal?               |
| MA4  | Messages admin: retention TTL, read/delete/search, notify channel | BE+FE   | ☐ COLD — sliceable                                                                        |
| MA5  | Admin collections list at 100× (paged/filtered/sorted)            | BE+FE   | ☐ COLD — low priority until collection count grows                                        |
| MA6  | User change log + non-admin canonical mutation path               | BE+FE   | ☐ BLOCKED — user: §10 decisions in the logged-in-flow review                              |
| PF2  | Blur placeholders (`blurDataURL`)                                 | FE      | ☐ COLD                                                                                    |
| PF6  | External error tracking                                           | FE      | ☐ BLOCKED — user: Sentry vs CloudWatch                                                    |
| PF7  | CloudFlare Phase 2 (origin lockdown, `CF-Connecting-IP`)          | OPS     | ☐ COLD — infra, plan written, ~1–2 weeks lead time                                        |
| PF13 | Home page genuinely static (Cache Components / PPR)               | FE      | ☐ BLOCKED — step 2 attempted 08-31 (6) and stopped; `cookies()` in `fetchBase` gates it   |
| LY1  | Lone-last-row sizing: pick gap-box vs FILLER, then build          | FE      | ☐ BLOCKED — user: two competing designs, neither built                                    |

**Not on this board, deliberately:** everything with a row on
[2026-summer-refactor.md](2026-summer-refactor.md) (H1's `/user` merge, F4's TaxonomyPage
consolidation, G3's `/user/selects`, F1's hook decomposition, C-group bugs); backend Bug #21
(dimensions default `0`) — tracked there via C9 and on the backend board; property-based layout
tests and function decomposition (debt, chapter 006); and three self-labeled unapproved ideas
(liked images, mobile text overlay, React 19 follow-ups), listed in the group files so they are
not rediscovered as new.

## NEXT RUN — set 2026-08-31 (6)

The last run shipped one of three and stopped on the second, which is the outcome the guardrail
was written to produce: PF13 step 2 is not the mechanical item this board described.

1. **PF13 MR 1 — hoist cookie forwarding out of `fetchBase`.** The newly-identified prerequisite,
   and worth doing whether or not Cache Components is ever adopted: `getServerCookieHeader()` is
   awaited inside `fetchBase` (`app/lib/api/core.ts:269`), so every server-side read is
   request-bound, including the six that only ever want cached public data. Pass the header in, or
   split the cacheable reads onto a cookie-free path. **Guardrail: this is the data layer for the
   whole site — its own review, and the full suite.**

2. **Re-do PF13 step 1.** The footer year still evaluates during prerender. Either Suspense plus
   `connection()`, or stop deriving the year at runtime at all. Small; it unblocks nothing on its
   own, so it can ride along with something else.

3. **SD3 · film-stock secondary filter.** The remaining cheap slice, conditional on Film + 2+
   stocks. Warm from #373, #376 and #379 — the same shape a fourth time. **Guardrail: one
   dimension per MR**, and check stock coverage against live data before sizing it, the way #379
   did. The data question inverts here: film collections are exactly the ones #379 found carry no
   EXIF, so film stock is the one dimension whose data lives where focal length's did not.

**Re-derive refs between MRs?** 1 and 2 are disjoint from each other and from 3.

**Not scheduled, and why.** PF13 steps 2 and 3 as previously written are off the board until MR 1
lands — the flag flip cannot be verified against its own guardrail while every read is
request-bound. EM2 and MA1 are still waiting on backend MRs.

## Verified and holding — do not re-investigate

Re-run 2026-08-31 (5), with the command beside each. Skip these on the next reconciliation unless
something in their neighbourhood merges.

| Claim                                                           | Command                                                                                                       | Result                                    |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| PF13: 19 segments export `dynamic`, and the flag rejects all 19 | `grep -rn 'export const dynamic' app --include='*.tsx' \| wc -l`, then `cacheComponents: true` + `next build` | 19; build names exactly those 19 files    |
| LY1: no FILLER/gap-box symbol exists                            | `grep -rn 'FILLER\|gapBox\|endRowGap' app/utils \| wc -l` (case-sensitive)                                    | 0 (case-insensitive: 2, both prose)       |
| PF6: no error tracking, no seam to fill                         | `grep -rn 'Sentry' app`, `grep -rn 'reportToService' app`, `wc -l app/utils/logger.ts`                        | 0, 0, 14                                  |
| PF2: no blur placeholders                                       | `grep -rn 'blurDataURL\|placeholder="blur"' app \| wc -l`                                                     | 0                                         |
| MA1: `PATCH /collections/{id}` absent                           | `git grep -n '@PatchMapping' origin/main -- src/main/java/` in the backend                                    | 5 hits, all sub-resource or unrelated     |
| CT5: no auto-tag endpoint                                       | `git grep -c 'auto-tag' origin/main -- src/main/java/`                                                        | 0                                         |
| AU2: no passkey list/revoke                                     | `git show origin/main:...auth/WebAuthnController.java \| grep -n 'Mapping('`                                  | 4 mappings, register/login × start/finish |
| SD2: `locations` not enriched                                   | `git show origin/main:...SyntheticCollectionResolver.java \| grep -n 'withTags\|withLocations'`               | `withTags` at `:109`, no `withLocations`  |

**Not re-checked this pass, and therefore unverified:** RC1's live data counts (`parents: null`
everywhere; `isFilm` 0/5, 0/5, 0/7 against `dolomites-film`'s 33/33). Those were measured against
live data on 2026-08-30 and need a live backend to re-run, so treat them as a week-old measurement
rather than a current fact.

## Decisions for Zac

Batch these at the start of a session. Each unblocks the named item; none blocks a COLD item.

| #      | Question                                                                                                                                                                                                                                                                                                                                                                    | Unblocks |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1      | Similar-collections spike D1–D6 (Related source mix, score location, hubs in slots, auto-promote threshold, suggestion surface, pgvector). Recommendations recorded in [2026-features/rc-similar-collections.md](2026-features/rc-similar-collections.md)                                                                                                                   | RC2, RC5 |
| 2      | Staging seed visibility: `HIDDEN` or `UNLISTED`?                                                                                                                                                                                                                                                                                                                            | MA2      |
| 3      | Gallery passwords: what should they DO? (Design pass; BCrypt is parked behind it)                                                                                                                                                                                                                                                                                           | EM4      |
| 4      | Passkey revocation shape: admin endpoint, user-facing list-and-remove, or both?                                                                                                                                                                                                                                                                                             | AU2      |
| 5      | Does the dark-admin premise survive? (`(admin)/layout.tsx` deliberately removed the admin-only dark wiring)                                                                                                                                                                                                                                                                 | MA3      |
| 6      | Lone-last-row: gap-box spacer or FILLER atom?                                                                                                                                                                                                                                                                                                                               | LY1      |
| ~~7~~  | ~~Panel width vs page height~~ **ANSWERED 2026-08-31: keep the shared width; the height cost stands.** Asked narrowly, since a 'V' split makes a column uniform by construction and the predicate can only reject SIDE-BY-SIDE panel columns: those are still one group and still share a width. No code change — LY2 closed as pure adjudication.                          | —        |
| 8      | Error tracking: Sentry or CloudWatch?                                                                                                                                                                                                                                                                                                                                       | PF6      |
| ~~11~~ | ~~`engines.node` vs the dev machine~~ **ANSWERED 2026-08-31: "whatever is best long term practice."** Read as: `engines.node` becomes an unbounded floor, a `.nvmrc` names the blessed version, and CI reads that file instead of a hardcoded literal — one source of truth, no upper bound to age out. Shape recorded in [PF11](2026-features/pf-performance-platform.md). | PF11     |
| ~~9~~  | ~~Which host serves production?~~ **FULLY ANSWERED 2026-08-31 — AWS Amplify Hosting**, confirmed by the user after `curl` had narrowed it to CloudFront-fronted AWS running a live Next server (Vercel and static-S3 eliminated). Auto-deploys from `main` in ~15 min. Recorded in `CLAUDE.md`; shipped as PF9 (#365).                                                      | —        |
| ~~12~~ | ~~Cache Components: adopt app-wide?~~ **ANSWERED 2026-08-31: adopt, full speed.** Step 1 (`Footer`'s `new Date()`) shipped as #375; the app-wide flag flip and the per-route conversion remain, and PF12 landing removes the reason to hold them                                                                                                                            | —        |
| 10     | `/explore` direction: reconcile Option C with the H5 MenuDropdown review                                                                                                                                                                                                                                                                                                    | SD4      |

Collections-as-tags D1–D12 (item CT2) joins this list after CT1 rewrites the matrix in current
terms. Six more product calls are already batched on the refactor board (H1, F4, G3, `.srOnly`,
G2b, the CSS guard) — put all of these to the user as one sitting, not two lists.

## Group SD — Search & discovery

Context file: [2026-features/sd-search-discovery.md](2026-features/sd-search-discovery.md) —
1 shipped (SD1, #357); its write-up is in that file's Closed section.

### ☐ SD2 · Backend: enrich `locations` on collection blocks — COLD

`SyntheticCollectionResolver.java` batch-loads tags only (`:109` `.withTags(...)`); it never
enriches `locations`, so the shipped `/collections` location filter matches against nothing. FE
matching (`collectionRefMatchesCriteria`) is wired and waiting. Mirror the tags batch-load.
Cross-repo: file on the backend board when picked up. Est: 1 sitting.

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

### ☐ SD5 · Verify chip-click-to-filter — COLD, cheap

Open verification task from 004: do people/location chips on public pages actually apply filters?
One browser pass; file findings or close.

## Group RC — Related & similar collections

Context file: [2026-features/rc-similar-collections.md](2026-features/rc-similar-collections.md) —
carries the full 2026-08-30 spike content (the source spec is gitignored).

### ☐ RC1 · `parents` on public reads + `isFilm` backfill — COLD, backend, unblocks RC2

Two data bugs verified live against all 39 collections on 2026-08-30: public reads return
`parents: null` everywhere (so `contentLayout.ts`'s Related section can only show curated
siblings), and `isFilm` is unset on `chamonix-film` (0/5), `vienna-film` (0/5), `gorge-50km-film`
(0/7) while `dolomites-film` is 33/33. Both are prerequisites for every RC item and for CT5-quality
suggestions. Cross-repo: file on the backend board when picked up.

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

Context file: [2026-features/au-auth-accounts.md](2026-features/au-auth-accounts.md)

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

### ☐ AU4 · Local admin dev-session affordance — COLD, after refactor-board G6

Backend #243 made `/api/admin/**` unconditionally gated in every profile, so local admin
development now needs a real admin session and no local login/dev-session affordance exists. G6
(refactor board) fixed the false `CLAUDE.md` rule; this item builds the missing capability —
likely a documented local bootstrap login flow.

**Unblocked 2026-08-31: G6 shipped as PR #351.** The corrected rule now states the reality this
item has to build against — the admin shell renders locally while its data 401s, and a real
session comes from `ADMIN_BOOTSTRAP_EMAIL` / `ADMIN_BOOTSTRAP_PASSWORD` (`docker-compose.yml`,
`AdminBootstrap.java`) plus `POST /api/auth/login`. So the affordance is a documented or scripted
version of that flow, not a new mechanism.

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
`app/utils/collectionSlugs.ts` + manage-page badge. Backend-heavy; file there when picked up.

### ☐ MA3 · Mobile-first admin Phase 3 remainder — BLOCKED (user, decision #5)

Open surfaces: §5.1 image-editor mobile layout (pinned photo), §5.2 manage-page full-screen grid +
morphing bottom bar, §5.5 text-block editor migration onto the primitives. But
`app/(admin)/layout.tsx` deliberately removed the admin-only dark wiring (a real dark mode belongs
to the whole site behind a user preference) — settle whether the premise survives before
scheduling.

### ☐ MA4 · Messages admin features — COLD, sliceable

From 007's "Housekeeping": PII retention TTL on messages, mark-as-read / delete / search on the
Comments page, optional Discord/Slack notify channel. Three independent slices.

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
**9 closed** (PF5 #356, PF1 #358, PF4 #360 VOID, PF10 #361, PF3 #362, PF9 #365, PF11 #366,
PF8 #367, PF12 settings-only); their write-ups are in that file's Closed section. Count re-derived
2026-08-31 (5) with `grep -c '^### ✅' 2026-features/pf-performance-platform.md` — the previous
"5 shipped" had been stale since PF3 and PF10 closed, so re-run that command rather than
incrementing this number by hand.

### ☐ PF2 · Blur placeholders — COLD

Zero `blurDataURL` / `placeholder="blur"` hits in `app/`. Needs server-side generation (sharp) at
upload or build time — scope the generation point first.

### ☐ PF13 · Make the home page genuinely static — COLD, re-sized 2026-08-31

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

### ☐ PF6 · External error tracking — BLOCKED (user, decision #8)

Zero `Sentry` and zero `reportToService` hits in `app/` (both re-run 2026-08-31).

**Premise correction, 2026-08-31: there is no placeholder to fill in.** This row and the group
file both said the #171 logger migration left a `// Future: reportToService()` seam. It does not
exist — `app/utils/logger.ts` is 14 lines of plain `console.*` wrappers with no `TODO`, `Future`
or `FIXME` marker anywhere in it. The item is "add error tracking", not "wire up the existing
hook", so size it accordingly.

### ☐ PF7 · CloudFlare Phase 2 — COLD, ops

Proxy DNS through CloudFlare, restrict 80/443 to CF ranges in `terraform/security.tf`, close 8080,
rate-limit page rule on `*/api/public/*`, re-key `RateLimitFilter` off `CF-Connecting-IP`, drop the
`X-Real-IP` injection in `route.ts`, verify the EC2 IP no longer answers directly. Plan:
`docs/superpowers/plans/007-cloudflare-phase2.md` (gitignored — essentials in the group file).

## Group LY — Layout decisions

Context file: [2026-features/ly-layout-decisions.md](2026-features/ly-layout-decisions.md) —
1 closed (LY2, #369, adjudication only); its write-up is in that file's Closed section.

### ☐ LY1 · Lone-last-row sizing — BLOCKED (user, decision #6)

Two incompatible designs exist and neither is built — `grep -rn "FILLER\|gapBox\|endRowGap"
app/utils` returns **0** (re-run 2026-08-31). Note the case-insensitive form returns 2, both the
word "filler" inside prose comments (`rowCombination.ts:1055`, `contentRatingUtils.ts:58`) rather
than a symbol; use the case-sensitive command above so this does not get re-disputed. The two
designs: the gap-box spacer (`005-end-row-gap.md`) vs the redesign spec's §13 FILLER atom.
Pick one, then TDD it. Note the BLANK-spacer post-pass in `buildRows` already handles row-width
normalization — read the group file so the chosen design composes with it.

## Session log

_Newest first, local dates. One line per `/next` run: what shipped (PR numbers), what was filed,
what's next. Older entries move to
[2026-features/session-log.md](2026-features/session-log.md)._

- 2026-08-31 (6) — shipped **SD3 focal-length ranges (#379)**; **PF13 step 2 attempted and stopped
  as blocked**, which is what its guardrail was for. **SD3's open data question is answered, yes**:
  207 of 281 sampled images carry `focalLength` (74%), near-uniformly `'24 mm'`, and the gap is
  film rather than focal length — `dolomites-film` 0/30, `lisbon-film` 0/23 — so the dimension
  self-hides on film pages through the existing gate. The parser was restored from `266c56c`
  rather than rewritten; it had been deleted as an orphan because lens NAMES beat lens types, not
  because the bucketing was wrong. **PF13's stop produced two corrections, both found by building
  rather than reading.** #375 did not clear the root-layout prerender blocker: the `new Date()`
  moved into a Client Component, which still server-renders during prerender — proven by
  hardcoding the year and watching `/_not-found` start building, one variable changed. And
  `instant = false` does not make unconverted routes safe: `/search` failed the prerender carrying
  both it and a Suspense boundary, while `/collections` 500'd calling the backend mid-build and `/`
  timed out at 60s × 3. **The real blocker was nowhere in the row** — `cookies()` sits inside
  `fetchBase`, so no read can enter a `use cache` scope, and the six tagged fetches would silently
  stop caching. Both lessons hoisted into "How to use this doc". Next: PF13 MR 1 (hoist the cookie
  forwarding), then SD3's film-stock slice.

- 2026-08-31 (5) — shipped **PF13 step 1 (#375)**, **SD3 year chips (#376)**, and closed **PF12**
  by applying branch protection. **Decision #12 answered: adopt Cache Components, full speed**, so
  #375 joined the run and steps 2–3 are now the next run. **EM2 went BLOCKED, and the blocker was
  nowhere near where two passes had been looking** — both prior passes argued about whether
  `InfoTab` had a recipient field; it does, and it never mattered. `recipient_emails` has one
  writer, which overwrites the whole array while mailing every address in it, so the frontend can
  preserve the stored list or narrow the send, never both. **PF12's own premise was half wrong**:
  branch protection was settable as expected, but Amplify has no wait-for-checks setting to pair
  with it — the branch API exposes `enableAutoBuild` and nothing else, so the "console half" the
  row promised does not exist, and protection alone closes the hole. **SD3's browser pass earned
  its keep twice**: `year` was missing from `FILTER_PARAM_KEYS` while its own drift-guard test
  passed (the fixture omitted `years`), and `/all-collections` printed "No images match your
  filters" above three matching tiles. Filed one follow-up: a pre-existing setState-in-render
  warning on every collection page, confirmed on `main` before filing. Next: PF13 steps 2 and 3,
  then an SD3 slice. Close-out landed as **#377**.
  **Reconciliation this pass re-ran eight recorded counts and all eight held** (PF13's 19/21,
  LY1's 0 case-sensitive / 2 case-insensitive, PF6's zero Sentry + zero `reportToService` + 14-line
  `logger.ts`, PF2's zero `blurDataURL`), plus four backend facts (MA1's absent
  `PATCH /collections/{id}`, CT5's zero auto-tag hits, AU2's exactly four WebAuthn mappings, SD2's
  `withTags` still at `:109`). **Two refs did move, both inside the neighbourhood of what merged**:
  `Footer.tsx:29` is GONE — #375 removed the `new Date()` the PF13 section still described in the
  present tense as a live blocker — and `contentFilter.ts:670` drifted to `:689` because #376's own
  `year` key pushed `FILTER_PARAM_KEYS` down. **This close-out also mis-filed its own log entry**,
  labelling it `(4)` beside the existing `(4)` and placing it below rather than above; both fixed
  here. **A third stale thing, and this one was outside any recent neighbourhood**: the PF group's
  "5 shipped" had been wrong since PF3 (#362) and PF10 (#361) closed, and PF4's VOID closure was
  never counted either — the real figure is 9. It is now written with the command that derives it.
  **The estimate lesson did not take.** Entry (4) named "shared primitives plus their test
  fixtures" as the failure mode after three misses; SD3's year chips were sized as "one slice" and
  landed 17 files across 8 app and 6 test files, which is the same miss a fourth time with the rule
  already written down. The rule is not the gap — applying it at scheduling time is, so the run
  entries now carry the size call, not just the guardrail.

- 2026-08-31 (4) — shipped **LY2 (#369)**, **EM5 (#370)**, **SD3's badge slice (#373)**; **PF13
  (#372) re-specified rather than built**. **Decision #7 answered** — the shared-width rule holds;
  asking it narrowly is what closed it, since `pinnedWidthSpread` turned out to constrain only
  side-by-side panel columns, never a stack (a `'V'` split hands both children the full width).
  **PF13's guardrail was unsatisfiable and the run stopped on it**: `cacheComponents` is app-wide
  in Next 16.3.1, enabling it errors 19 of 21 route segments, and `Footer.tsx:29`'s `new Date()`
  blocks every prerender regardless — re-sized to 3 sittings behind PF12, filed as **decision
  #12**. **Two premises were wrong and both were found by reading behavior, not grepping strings**:
  EM5's row said no email-disabled handling existed, but `ShareCard` already had the copy keyed on
  `sent === false` alone, so it blamed the email switch for every failure; and SD3's "removable
  badges + Clear-all" was half-built, since Clear-all is the trailing ×. **Estimates missed the
  same way three times** — EM5 "one callout" landed 12 files, SD3 "one slice" landed 8, both
  through shared primitives and their test fixtures; hoisted as a new sizing rule. **Reconciliation
  found three stale things**: LY1's `rowCombination.ts:1049` → `:1055` (drift from #369's own
  docblock), MA1's `TODO(A3)` sub-task gone AND its feature already shipped (`b66c39a`), and EM2's
  "no recipient field" premise false (`InfoTab.tsx:303`). **PF12's premise verified live** — no
  branch protection, no rulesets. Next: ask decision #12, then EM2, SD3 year chips, PF12.
