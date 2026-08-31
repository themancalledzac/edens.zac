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
- **An item that only wires existing tested primitives into a new route is one sitting**, however
  many files it touches. SD1 was estimated at 2–3 and took 1. An item that deletes and rewrites
  (MA1) does not get this discount.

## Work board

Open rows only. FE = this repo, BE = `edens.zac.backend`, OPS = console/infra work.

| Item | Scope                                                              | Repo    | Status                                                                                    |
| ---- | ------------------------------------------------------------------ | ------- | ----------------------------------------------------------------------------------------- |
| SD2  | Enrich `locations` on collection blocks                            | BE      | ☐ COLD — small; makes the shipped `/collections` location filter work                     |
| SD3  | Filter-bar dimension gaps (focal length, film stock, year, badges) | FE      | ☐ COLD — sliceable; re-sized DOWN after SD1                                               |
| SD4  | `/explore` as a real drill-down explorer (Option C)                | FE      | ☐ BLOCKED — reconcile with refactor-board H5 design review first                          |
| SD5  | Verify people/location chip-click-to-filter                        | FE      | ☐ COLD — cheap verification task                                                          |
| RC1  | Populate `parents` on public reads + `isFilm` backfill             | BE      | ☐ COLD — unblocks RC2's public rendering; two verified data bugs                          |
| RC2  | Similar-collections v1 (metadata-graph score + Related swap)       | BE+FE   | ☐ BLOCKED — user: spike decisions D1–D4                                                   |
| RC3  | Collections_List render mode (embedded hub as card-row)            | BE+FE   | ☐ COLD — small; no new entity                                                             |
| RC4  | Suggested collections (admin suggestion rows)                      | BE+FE   | ☐ BLOCKED — needs CT3 engine + RC1 metadata quality                                       |
| RC5  | CLIP/pgvector embedding tier                                       | BE+ML   | ☐ BLOCKED — user: spike decision D6 (infra commitment)                                    |
| CT1  | Collections-as-tags spec refresh against the typeless model        | docs    | ☐ COLD — produces a current D1–D12 matrix for CT2                                         |
| CT2  | Adjudicate the collections-as-tags decision matrix                 | user    | ☐ BLOCKED — user; after CT1                                                               |
| CT3  | Saved-filter engine (AND-tag query, `source` column, sync)         | BE+FE   | ☐ BLOCKED — on CT2                                                                        |
| CT4  | Blog-as-date surface (`/blog` stream, per-day entries)             | BE+FE   | ☐ BLOCKED — on CT2                                                                        |
| CT5  | Auto-tag: `POST /collections/{id}/auto-tag` + admin button         | BE+FE   | ☐ COLD — independent of CT2                                                               |
| CT6  | Tag `type`/visibility model                                        | BE      | ☐ COLD — design confirm, then small schema work                                           |
| AU1  | Self-serve password reset                                          | BE+FE   | ☐ COLD — plan written and verified current                                                |
| AU2  | Passkey credential list + revoke, enrollment-state UI              | BE+FE   | ☐ BLOCKED — user: endpoint shape (admin, user-facing, or both)                            |
| AU3  | Enforce `UserStatus.DISABLED` in the auth path                     | BE      | ☐ COLD — confirm backend S-1 not already closed, then fix                                 |
| AU4  | Local admin dev-session affordance (post backend #243)             | FE+BE   | ☐ COLD — after refactor-board G6 lands the docs correction                                |
| EM1  | SES production checklist (verify domain, DKIM, sandbox exit)       | OPS     | ☐ COLD — ops; user drives the AWS console half                                            |
| EM2  | New-recipient-only gallery send flow                               | FE      | ☐ COLD — UI addition, plan written                                                        |
| EM3  | Contact-owner notification + `user_invite.created_by`              | BE      | ☐ COLD — two small backend items                                                          |
| EM4  | Gallery-password design pass (precedes any BCrypt work)            | user    | ☐ BLOCKED — user; backend board PARKED BCrypt behind it                                   |
| EM5  | Email-disabled warning callout in gallery admin                    | FE      | ☐ COLD — small                                                                            |
| MA1  | Manage rail restructure (per-field PATCH, delete edit sheet)       | FE(+BE) | ☐ BLOCKED — backend `PATCH /collections/{id}` does NOT exist (verified 08-31); it is MR 1 |
| MA2  | `staging` system collection                                        | BE+FE   | ☐ BLOCKED — user: `HIDDEN` vs `UNLISTED` seed visibility                                  |
| MA3  | Mobile-first admin Phase 3 remainder                               | FE      | ☐ BLOCKED — user: does the dark-admin premise survive its partial reversal?               |
| MA4  | Messages admin: retention TTL, read/delete/search, notify channel  | BE+FE   | ☐ COLD — sliceable                                                                        |
| MA5  | Admin collections list at 100× (paged/filtered/sorted)             | BE+FE   | ☐ COLD — low priority until collection count grows                                        |
| MA6  | User change log + non-admin canonical mutation path                | BE+FE   | ☐ BLOCKED — user: §10 decisions in the logged-in-flow review                              |
| PF2  | Blur placeholders (`blurDataURL`)                                  | FE      | ☐ COLD                                                                                    |
| PF3  | Narrow `priority`, scope `will-change`, add preconnect             | FE      | ☐ COLD — small batch                                                                      |
| PF6  | External error tracking                                            | FE      | ☐ BLOCKED — user: Sentry vs CloudWatch                                                    |
| PF7  | CloudFlare Phase 2 (origin lockdown, `CF-Connecting-IP`)           | OPS     | ☐ COLD — infra, plan written, ~1–2 weeks lead time                                        |
| PF8  | Small orphans: JSON-LD, `<Suspense>` wrappers, SaveHeart 44px      | FE      | ☐ COLD — all three re-verified absent 08-31                                               |
| PF9  | Record the deploy target (answered: CloudFront/AWS, auto-deploy)   | FE      | ☐ COLD — measured 08-31; only the recording is left                                       |
| PF11 | Reconcile `engines.node` (`>=20 <23`) with the dev machine (25.3)  | FE      | ☐ COLD — decision #11 answered 08-30; shape settled, ready to build                       |
| PF12 | Gate the auto-deploy on CI                                         | OPS     | ☐ COLD — console work; `main` deploys today regardless of CI                              |
| PF13 | Home page genuinely static (Cache Components / PPR)                | FE      | ☐ COLD — created by PF4's closure; render-path change, not a config flip                  |
| LY1  | Lone-last-row sizing: pick gap-box vs FILLER, then build           | FE      | ☐ BLOCKED — user: two competing designs, neither built                                    |
| LY2  | Admin panel width vs page height                                   | FE      | ☐ BLOCKED — user: adjudication; both outcomes already test-pinned                         |

**Not on this board, deliberately:** everything with a row on
[2026-summer-refactor.md](2026-summer-refactor.md) (H1's `/user` merge, F4's TaxonomyPage
consolidation, G3's `/user/selects`, F1's hook decomposition, C-group bugs); backend Bug #21
(dimensions default `0`) — tracked there via C9 and on the backend board; property-based layout
tests and function decomposition (debt, chapter 006); and three self-labeled unapproved ideas
(liked images, mobile text overlay, React 19 follow-ups), listed in the group files so they are
not rediscovered as new.

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
| 7      | Panel width vs page height (values pinned in `tests/(admin)/admin/page.collapseStates.test.ts`)                                                                                                                                                                                                                                                                             | LY2      |
| 8      | Error tracking: Sentry or CloudWatch?                                                                                                                                                                                                                                                                                                                                       | PF6      |
| ~~11~~ | ~~`engines.node` vs the dev machine~~ **ANSWERED 2026-08-30: "whatever is best long term practice."** Read as: `engines.node` becomes an unbounded floor, a `.nvmrc` names the blessed version, and CI reads that file instead of a hardcoded literal — one source of truth, no upper bound to age out. Shape recorded in [PF11](2026-features/pf-performance-platform.md). | PF11     |
| ~~9~~  | ~~Which host serves production?~~ **ANSWERED 2026-08-31 by `curl -sI https://zacedens.com/`** — CloudFront-fronted AWS running a live Next server, auto-deploying from `main` in ~15 min. Vercel and static-S3 both eliminated; see [PF9](2026-features/pf-performance-platform.md).                                                                                        | —        |
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

Verified absent from `app/types/GalleryFilter.ts`: focal-length ranges (Wide/Normal/Tele),
film-stock secondary filter (conditional on Film + 2+ stocks), year chips, active-filter summary
with removable badges + Clear-all, proportional row merging. Each is an independent slice on the
shared `FilterToolbar`.

### ☐ SD4 · `/explore` as a real explorer — BLOCKED (user, decision #10)

`app/explore/page.tsx` is the flat Option-A directory. Option C (cross-faceting explorer) and the
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

### ☐ AU3 · Enforce `UserStatus.DISABLED` — COLD after one check

CURRENT-STATE §5: "Disabling an account does not prevent it logging in" — backend S-1, explicitly
NOT parked with the gallery-password work. First step: confirm against the backend board's closed
ledger that S-1 has not shipped since 2026-07-28; then fix in the auth path.

### ☐ AU4 · Local admin dev-session affordance — COLD, after refactor-board G6

Backend #243 made `/api/admin/**` unconditionally gated in every profile, so local admin
development now needs a real admin session and no local login/dev-session affordance exists. G6
(refactor board) fixes the false `CLAUDE.md` rule; this item builds the missing capability —
likely a documented local bootstrap login flow. Scope it after G6's docs correction states the
new reality.

## Group EM — Email & client galleries

Context file: [2026-features/em-email-galleries.md](2026-features/em-email-galleries.md)

### ☐ EM1 · SES production checklist — COLD, ops

Invite email is code-complete (`sendInviteEmail` + afterCommit hook, shipped 2026-07-26); the
blocker is operational. The §3 console checklist is all-open: domain identity in us-west-2,
sandbox smoke test, custom MAIL FROM + SPF, DMARC, configuration set + SNS bounce handling,
sandbox exit, flip `EMAIL_ENABLED` on EC2. User drives the console; sessions prep and verify.

### ☐ EM2 · New-recipient-only send flow — COLD

Saving gallery access currently re-emails the whole recipient list. `InfoTab.tsx` has no recipient
field today, so this is a UI addition: read-only existing-recipients list + add-one input, only
the new address mailed.

### ☐ EM3 · Contact-owner notification + `created_by` — COLD, backend

C7 (notify the owner on contact-form submission) and C3 (`user_invite.created_by`) from the SES
spec, both still unbuilt.

### ☐ EM4 · Gallery-password design pass — BLOCKED (user, decision #3)

The backend board PARKED BCrypt on 2026-08-24: the design pass must first answer what gallery
passwords should do, reconciling admin re-share, the fingerprint-derived shared-unlock cookie, and
revocation-on-change. `docs/003` and `docs/000` still list BCrypt as ready-to-build — they are
wrong; do not start it.

### ☐ EM5 · Email-disabled warning callout — COLD, small

No `EMAIL_ENABLED`/email-disabled string exists anywhere in `app/` — the admin gallery UI gives no
hint that sends are off. One callout in the access section.

## Group MA — Admin & manage surfaces

Context file: [2026-features/ma-admin-manage.md](2026-features/ma-admin-manage.md)

### ☐ MA1 · Manage rail restructure — BLOCKED (backend endpoint absent)

The 2026-08-12 plan (Approach B): per-field optimistic PATCH commits replace the batch-save edit
sheet. Eleven FE tasks — `patchCollection` + `buildFieldPatch`, `commitField` in
`useCollectionEdit`, remove the staging buffer/dirty tracking/Save-Cancel cells,
`InlineEditableDate` + `InlineEditableLocations`, rating into `titleAside`,
`CollectionAdminRail` as `railExtras`, delete `CollectionEditSheet.tsx` + `InfoTab.tsx` +
`StructureTab.tsx` + 3 stylesheets, density-tier persistence, reset-to-chronological, dead-code
sweep (drop `FIXED`, prune orphaned `CollectionUpdateRequest` fields, resolve `TODO(A3)`), test
rewrite (`useCollectionEdit.buffer.test.tsx` pins the buffer policy this deletes). Prereqs merged
(`railExtras` threads through; 0244–0247 landed). **Backend `PATCH /collections/{id}` does NOT
exist** — verified 2026-08-31 against the backend's `origin/main`; the five `@PatchMapping`s there
are all sub-resource or unrelated. It is MR 1 of this item and belongs on the backend board. **Collides with:** anything touching
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
2 shipped (PF1 #358, PF5 #356); their write-ups are in that file's Closed section.

### ☐ PF2 · Blur placeholders — COLD

Zero `blurDataURL` / `placeholder="blur"` hits in `app/`. Needs server-side generation (sharp) at
upload or build time — scope the generation point first.

### ☐ PF3 · Priority narrowing, `will-change` scoping, preconnect — COLD

`priority` is row-scoped (`computePriorityRowIndex` deliberately extends eager loading — narrow to
the single LCP candidate); `will-change: transform` is unconditional in three modules
(`fullscreen-image.module.scss:125`, `CoverCard.module.scss:53`,
`ParallaxImageRenderer.module.scss:17`); no CloudFront `preconnect` in `app/layout.tsx`.

### ☐ PF10 · Image quality 65 — COLD, and NOT config-only

Split out of PF1. Next 16 defaults `images.qualities` to `[75]`, `next/image` sends 75 when no
`quality` prop is given, and the optimizer **rejects** rather than clamps anything else — so
`qualities: [65]` alone 400s every image. Needs `quality={65}` at the 8 `sizes=` call sites too.
Measured prize: **13.3%** (258,556 vs 298,282 bytes at `w=1920`).

### ☐ PF11 · Reconcile `engines.node` — COLD, one decision then one line

`engines.node` is `>=20 <23`; the dev machine runs 25.3.0; PF5's CI pins 22. Widen `engines` or
move dev to 22. `tests/ci/ciWorkflow.test.ts` keeps CI and `engines` from diverging further.

### ☐ PF12 · Gate the auto-deploy on CI — COLD, console work

`main` deploys to production in ~15 minutes whether or not CI passed (PF9), and CI's `push: [main]`
run races the deploy rather than gating it. Fix is branch protection + the host's wait-for-checks
setting, not repo code. Worth doing _because_ the deploy is fast.

### ☐ PF6 · External error tracking — BLOCKED (user, decision #8)

Zero `Sentry`/`reportToService` hits; the `// Future: reportToService()` placeholder waits on the
service pick.

### ☐ PF7 · CloudFlare Phase 2 — COLD, ops

Proxy DNS through CloudFlare, restrict 80/443 to CF ranges in `terraform/security.tf`, close 8080,
rate-limit page rule on `*/api/public/*`, re-key `RateLimitFilter` off `CF-Connecting-IP`, drop the
`X-Real-IP` injection in `route.ts`, verify the EC2 IP no longer answers directly. Plan:
`docs/superpowers/plans/007-cloudflare-phase2.md` (gitignored — essentials in the group file).

### ☐ PF8 · Small orphans batch — COLD

Three verified-absent smalls tracked nowhere else: JSON-LD structured data (zero
`application/ld+json` in `app/`), component-level `<Suspense>` wrappers (zero `<Suspense` in
`app/`), SaveHeart 44px tap target.

### ☐ PF9 · Record the deploy target — COLD (answered by measurement)

**Answered 2026-08-31 by `curl -sI https://zacedens.com/`.** Production is CloudFront-fronted AWS
(`via: … cloudfront.net`, `x-amz-cf-pop`, apex → `3.169.202.x`) running a **live Next server** —
the response carries `next.config.js`'s own security headers and the home page is `force-dynamic`,
neither of which a static S3 export can do. No `x-vercel-*`: Vercel is out. Amplify is the
remaining candidate and matches `next.config.js`'s own 2026-08-23 production note.

**`main` already auto-deploys** — PF1 merged 05:33 UTC and production was rejecting `w=3840` by
05:47. The row's "no `.github/`" premise was also invalidated by PF5 landing one in the same run.
**PF1's WebP verification is closed too**: production returns `content-type: image/webp`.

Left to do: record the host in `CLAUDE.md` and correct the three docs that disagree. No decision
needed. See the group file for the full evidence.

## Group LY — Layout decisions

Context file: [2026-features/ly-layout-decisions.md](2026-features/ly-layout-decisions.md)

### ☐ LY1 · Lone-last-row sizing — BLOCKED (user, decision #6)

Two incompatible designs exist and neither is built (zero `FILLER`/`gapBox`/`endRowGap` hits in
`app/utils`): the gap-box spacer (`005-end-row-gap.md`) vs the redesign spec's §13 FILLER atom.
Pick one, then TDD it. Note the BLANK-spacer post-pass in `buildRows` already handles row-width
normalization — read the group file so the chosen design composes with it.

### ☐ LY2 · Panel width vs page height — BLOCKED (user, decision #7)

The shared-width predicate fixed a real fill defect but costs page height in the `messages+roles`
collapse state (1607.0px vs 1567.7px baseline; +71% at narrow widths). Both values pinned exactly
in `tests/(admin)/admin/page.collapseStates.test.ts`. Bisect names `pinnedWidthSpread` causal; the
trade looks intrinsic. Pure adjudication.

## Session log

_Newest first, local dates. One line per `/next` run: what shipped (PR numbers), what was filed,
what's next. Older entries move to
[2026-features/session-log.md](2026-features/session-log.md)._

- 2026-08-30 — shipped **PF10 (#361)**: `qualities: [65]` plus `quality={IMAGE.quality}` at the
  eight optimized `<Image>` sites. 12.9% off a real CDN image at w=1920, measured through the
  optimizer. The row's "8 `sizes=` call sites" was the wrong work list — two of those were the
  BoxTree dimensions map, not an image prop, and it missed five real render sites. Corrected
  inventory and a guard test (`tests/config/imageQuality.test.ts`) in the group file.

- 2026-08-30 — **PF4 closed as VOID (#360)**, no behavior change. Its backend blocker really had
  cleared (asked production, not source), but the `@todo`'s recipe fails `next build` on
  `headers()`, and its premise — a live Spring fetch per visitor — measured false: 8 renders, 1
  backend fetch, `force-dynamic` present. `getCollectionBySlug`'s explicit
  `next: { revalidate, tags }` beats the `force-no-store` default the flag implies. The MR
  replaced the misleading comment; the real question refiled as **PF13** (Cache Components / PPR).
  Filed **PF11** from decision #11.

- 2026-08-31 — shipped **SD1 (#357)**, **PF5 (#356)**, **PF1 (#358)**; all merged and live in
  production. Filed **PF10** (image quality — split out of PF1, which could not do it), **PF11**
  (Node version drift) and **PF12** (gate the auto-deploy on CI). **Decision #9 answered by one
  `curl`**: production is CloudFront-fronted AWS running a live Next server, auto-deploying from
  `main` in ~15 minutes — Vercel and static-S3 eliminated. That also closed the 002 chapter's
  month-old "verify the host serves WebP" item (it does). **MA1 re-classified COLD → BLOCKED**: its
  stated prerequisite, backend `PATCH /collections/{id}`, does not exist on the backend's
  `origin/main`. **PF4 re-classified BLOCKED → COLD**: `blocks_per_page` is gone from backend
  `origin/main`. PF5 invalidated PF9's "no `.github/`" premise in the same run. Next: PF9, PF4, SD3.

- 2026-08-30 — board created from the three-agent sweep (specs ×22, plans ×38, numbered docs +
  handoffs + backend board), reconciled against code and git. Headline corrections: `/search` is
  NOT backend-blocked (all endpoints live in `ContentControllerProd.java`; four docs wrong);
  gallery-password BCrypt is PARKED behind a design pass (two docs wrong); Breadcrumb and the
  shared IntersectionObserver are shipped, not pending. 42 rows filed across 8 groups; 10 user
  decisions batched. Next: SD1 (`/search`), PF5 (CI), PF1 (image bytes) — with the decision batch
  asked first.
