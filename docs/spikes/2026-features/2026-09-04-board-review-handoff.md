# Handoff — critical review of the 2026 feature and refactor boards

**Written 2026-09-04 for the agent running the review. Baseline: `main` @ `29bd30f0`.**

You are reviewing a month of frontend work tracked across two boards. This document is what the
last session knew, what it verified, and what it could not. Everything here was re-run on
2026-09-04 unless a line says otherwise.

Read this first, then §11 for a suggested plan. Do not start by reading the boards — several of
their claims are known false and are listed in §6.

---

## 1. What you are reviewing

Two tracking boards, both tracked in git, both live:

| Board    | File                                                  | Carries                                 | Open items                                        |
| -------- | ----------------------------------------------------- | --------------------------------------- | ------------------------------------------------- |
| Feature  | [2026-features.md](../2026-features.md)               | designed-but-unbuilt product capability | 30 rows                                           |
| Refactor | [2026-summer-refactor.md](../2026-summer-refactor.md) | cleanup, refactors, bug fixes           | 21 items (see §5.2 — the row table shows only 14) |

Each has a directory of per-group context files beside it. They are the durable record: most of
the original design work lives in `docs/superpowers/`, which is **gitignored** — unversioned,
local-disk only. Never plan from a `docs/superpowers/` path.

Scale of the corpus, measured today:

```bash
cat docs/spikes/2026-features.md docs/spikes/2026-summer-refactor.md \
    docs/spikes/2026-features/*.md docs/spikes/2026-summer-refactor/*.md | wc -l   # 10,789
gh pr list --state merged --limit 200 --json number,mergedAt \
  -q '[.[] | select(.mergedAt >= "2026-08-01")] | length'                          # 158
```

158 PRs merged since 2026-08-01, against 10,789 lines of tracking documentation. Two days had
extreme throughput: 49 PRs on 2026-08-24 and 28 on 2026-08-31. Most of the integrity defects in §6
were created on those days.

## 2. Verified baseline as of 2026-09-04

Everything in this table was run today, not read.

| Fact               | Command                                                                | Value                                                                                         |
| ------------------ | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Test suite         | `npx jest`                                                             | 260 suites, **4,737** tests, all passing                                                      |
| Types              | `npx tsc --noEmit`                                                     | clean                                                                                         |
| CI                 | `.github/workflows/ci.yml`                                             | exists (shipped as PF5, #356). Type check, lint, Stylelint, Jest on every PR and push to main |
| Branch protection  | —                                                                      | `strict: true`, `enforce_admins` on. Nobody pushes straight to `main`                         |
| Auto-merge         | —                                                                      | **disabled on this repo.** `gh pr merge --auto` fails with `enablePullRequestAutoMerge`       |
| Production         | —                                                                      | AWS Amplify, auto-deploys from `main`, ~15 min                                                |
| Backend migrations | `git ls-tree --name-only origin/main src/main/resources/db/migration/` | latest is **V62**                                                                             |

**Do not quote the test count in a board row.** Every recorded suite/test number on these boards
aged out within days, and each was correct when taken. Re-measure it.

## 3. Start here — six things that will waste your time if you don't know them

**1. Three refactor items marked COLD have already shipped, and they are the top three of that
board's "NEXT RUN" list.** Verified today:

| Item                                         | Board says          | Actually                                                                       |
| -------------------------------------------- | ------------------- | ------------------------------------------------------------------------------ |
| C11 (`mapError` 429 branch)                  | ☐ COLD, NEXT RUN #1 | shipped `8cb7a66d`, 2026-08-30. `ShareCard.tsx:50` returns the rate-limit copy |
| D10 (`getApiBaseUrl` raw env var)            | ☐ COLD, NEXT RUN #2 | shipped `68fbb59b`, 2026-08-30. `core.ts:88` uses `configuredAppOrigin()`      |
| E18 Half A (four unwired revalidation paths) | ☐ COLD, NEXT RUN #3 | shipped `c1dd1d41`, 2026-08-30, with `locationCacheRevalidation.test.tsx`      |

The NEXT RUN list was written on 2026-08-31, the day _after_ those three merged. A session
following that list redoes merged work. **E18 Half B is genuinely open** — `handleUpdate`
(`useCollectionEdit.tsx:767`) still passes `collection.locations` at `:784`, the static server
seed, rather than live state.

**2. The feature board is two days and two PRs stale.** #396 (MA4's frontend half) and #397 (SD3's
film stock) merged 2026-09-03 and touched nothing on the board. MA4's section is the densest
concentration of now-false text on either board — see §6.1.

**3. The refactor board's row table is missing seven open items.** C12, C13, C14, C15, C16, G7 and
H7 each have a `###` section and no row. An eighth (the CSS guard) has neither. The feature board
has a shell check for exactly this; the refactor board never got it. Run it there:

```bash
grep -oE '^### [☐◐] [A-Z][0-9]+' docs/spikes/2026-summer-refactor.md | sed 's/^### [☐◐] //' | sort
```

**4. `--auto` is prescribed by a rule and known broken.** Feature board rule 31 says to queue
merges with `gh pr merge <N> --squash --auto`; its own run-(11) close-out 50 lines below records
that auto-merge is disabled here. The rule was never updated. Merges are manual: update, wait, merge.

**5. The local backend writes to PRODUCTION.** Port 5432 is an autossh tunnel to the production
EC2. There is no local database. Never exercise a destructive feature against localhost, and never
build a dev-only auth bypass. An agent cannot obtain an admin session on its own.

**6. One HIGH finding from an audit agent in this project was fabricated.** On 2026-08-04, an agent
reported that `styles.srOnly` was undefined in `Collections.module.scss`; it was defined at line 12.
Ten of eleven spot-checked HIGH findings that session were real, which is what made the one
confident invention dangerous. Its tell was a specific, checkable claim plus an unfalsifiable
excuse for why the file might look different now. **Spot-check every HIGH finding against source
before relaying it.** I did that for the four biggest claims in this document; three held and one
found an error of my own (§6.4).

## 4. What shipped

158 PRs since 2026-08-01. The shape of the month:

- **2026-08-04 → 08-22** — scattered, ~19 PRs.
- **2026-08-23 / 08-24 — 68 PRs.** The refactor board's Group D (security), Group E
  (consolidations) and much of Group F (structural) landed here.
- **2026-08-25 → 08-30 — ~30 PRs.** C-group bugs, the E-group tail, and the feature board was
  created (#355) on 08-30.
- **2026-08-31 — 28 PRs.** The feature board's first real run: search (#357), CI (#356), image
  perf (#358/#361/#362), JSON-LD (#367), filter badges (#373), year chips (#376).
- **2026-09-01 → 09-04 — 13 PRs.** Cookie-forwarding fix (#381), tag chips (#382), messages search
  (#384), CloudWatch logging (#391), then the last run: #396, #397, #398.

The last four PRs, all mine, with their state today:

| PR                                                            | Item                                                               | State                                               |
| ------------------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------- |
| [#396](https://github.com/themancalledzac/edens.zac/pull/396) | MA4 frontend half — server-side `?q=`/`?unread=`, mark read/unread | MERGED 2026-09-03                                   |
| [#397](https://github.com/themancalledzac/edens.zac/pull/397) | SD3 film-stock filter dimension                                    | MERGED 2026-09-03                                   |
| [#398](https://github.com/themancalledzac/edens.zac/pull/398) | RC3 blocked + backend handoff spec                                 | MERGED 2026-09-04                                   |
| [#399](https://github.com/themancalledzac/edens.zac/pull/399) | LY1 closed as already-shipped                                      | **OPEN**, green, mergeable, rebased onto main today |

All three merged PRs were checked for dropped commits (`git merge-base --is-ancestor` per branch
commit, then a per-file diff against main). All landed intact.

## 5. What is open

### 5.1 Feature board — 30 rows

**Startable now, nothing in the way:** CT1 (docs-only spec refresh), AU1's frontend half, PF14
(unscoped), MA5 (deprioritized, not blocked), and **RC1's frontend half** — newly unblocked, see
§6.3.

**Blocked on Zac (6 filed decisions):** RC2/RC5 (#1, similar-collections D1–D6), MA2 (#2, staging
visibility), EM4 (#3, gallery passwords), AU2 (#4, passkey revocation shape), LY1 (#6 — **answered
2026-09-02, closure is in the open #399**), SD4 (#10, `/explore` direction).

**Blocked on the backend, with a written handoff:** RC3 ([backend-handoff-RC3.md](backend-handoff-RC3.md)),
and MA4/RC1 ([backend-handoff-MA4-RC1.md](backend-handoff-MA4-RC1.md)).

**Blocked on the backend, with NO handoff and no owner in either repo:** MA1 (`PATCH /collections/{id}`
absent) and EM2 (one backend column is both the stored list and the send list). EM2's group file has
said "the backend-board row is still owed" for four days. This is the gap the frontend-only rule
opened and nobody has closed.

**Marked COLD but not buildable from this repo:** CT5, CT6, EM3, and the backend halves of AU1 and
MA2. All are backend-only work with no handoff doc. "COLD" reads as startable and they are not.

### 5.2 Refactor board — 21 items, not the 14 the row table shows

Corrected open set: **B8, C9, C11\*, C12, C13, C14, C15, C16, D10\*, E7, E9, E18\*, F1, F3, F4, G2,
G3, G4, G7, H1, H7**, plus the CSS guard as a decision with no work item.

\* C11, D10 and E18 Half A have shipped — see §3.1.

**Blocked on Zac (8 decisions):** F4, G3, G2b, E9 `.srOnly`, H1, CSS guard, C15, H7.

**The largest open item is F1** — decomposing `useCollectionEdit.tsx`. It is not blocked; it is
being deferred, and deferral is what breaks it. Its boundary line ranges have been invalidated
three times by other merges, and today all eight of its anchors have drifted again (the file is
1,811 lines, not the recorded 1,751). One published boundary, `:1220`, is _known wrong_ — it sits
mid-`handleLocationsChange` — and is still on the live board. A fifth invalidation is queued: MA1
rewrites the same file along different lines.

### 5.3 The sequencing collision worth deciding before anything else

MA1 deletes `InfoTab.tsx`, `StructureTab.tsx` and `CollectionEditSheet.tsx` wholesale, adds
`commitField` to `useCollectionEdit`, and rewrites `useCollectionEdit.buffer.test.tsx`.

F1 decomposes that same file and its stated guardrail is to _preserve_ the facade so the buffer
suite does not churn. F1 and MA1 are directly opposed. Open items touching the files MA1 deletes:
F1, E18, E7, G4, G2c. Neither board owns the ordering decision.

MA1 is currently backend-blocked, so E18 Half B should land first — but nothing says so.

## 6. Verified drift — what is stale and by how much

All of this was re-derived today.

### 6.1 The feature board's MA4 and SD3 sections are comprehensively false

MA4's section still says the read column is absent ("migrations run to V60" — it is V62), that
`GET /api/admin/messages` takes only `limit` and `offset` (it takes `q` and `unread`, stated
correctly 400 lines earlier in the same section), that the backend MR spec is "ready to lift" (it
shipped), and that a backend row is still owed (the same section says three paragraphs earlier
that it is filed as `#30`). Its group file, `ma-admin-manage.md:180`, still says "Mark-as-read —
blocked. There is no read column on `messages`."

SD3's section still lists the film-stock filter as absent. `selectedFilmTypes` is at
`GalleryFilter.ts:43` and `filmType` is in `FILTER_PARAM_KEYS`.

### 6.2 Counts that drifted

| Claim                                    | Recorded                           | Actual today                                |
| ---------------------------------------- | ---------------------------------- | ------------------------------------------- |
| `useCollectionEdit.tsx` lines            | 1,751                              | **1,811**                                   |
| Test-suite lines / source lines          | 57,306 / 36,685                    | **60,551 / 38,502**                         |
| Files importing a CSS module             | 105                                | **107**                                     |
| Distinct `styles.<key>` names            | 402                                | **411**                                     |
| `app/components/` entries                | 36                                 | **38**                                      |
| Closed rows across refactor archives     | 55                                 | **57**                                      |
| G4 docblock inventory                    | 1,413 blocks / 49 backward-looking | **1,494 / 54**                              |
| `processContentBlocks` callers repo-wide | 5                                  | **6** (SD1 added `SearchPageClient.tsx:84`) |
| Backend `@PatchMapping` hits             | 5                                  | **6** (BE#300 added one)                    |
| `ContentModels.Collection` components    | 20                                 | **21**                                      |
| Backend migration head                   | V60                                | **V62**                                     |

**48 `file:line` refs have drifted** across the two boards and their group files — 5 on the feature
board itself, 43 in the group files and the refactor board. The feature board's claim of "11/11
correct, 0 drifted" undercounts the population as well as the drift: that file alone carries 24
distinct refs. All eight of F1's boundary anchors are among the drifted.

### 6.3 RC1 became unblocked today, four minutes before #398 merged

Backend PR #301 merged 2026-09-04T20:55:34Z. The board still says "BE#301 still OPEN as of
2026-09-02. No frontend half until it lands." Verified on backend `origin/main`:

- `V62__backfill_content_image_is_film.sql` is present; head is V62.
- `CollectionProcessingUtil.populateParents(model, listedOnly)` at `:523`.
- Public reads pass `true` (`CollectionService.java:164`), admin passes `false` (`:928`).

**Consequences:** RC1's frontend half is startable — the Related section can show real parents for
the first time. And the `isFilm` re-measure is owed against live data; the 0/5, 0/5, 0/7 vs 33/33
counts are a 2026-08-30 measurement. V23 still flags exactly two camera bodies, so if those three
collections still read zero after deploy, flagging a third body is a data call for Zac.

### 6.4 An error of mine, shipped in #398

`backend-handoff-RC3.md` says `ContentModels.Collection` has "Twenty components". It has 21. The
finding is unaffected — none of the 21 describe children, and the RC3 blocker holds — but the count
is wrong. Corrected in this change.

Worth naming because of how it happened: I wrote a document warning that unverified counts rot, and
put an unverified count in it. Counting by eye off a `sed` window is not a measurement. The command
that produces the number:

```bash
git show origin/main:src/main/java/edens/zac/portfolio/backend/model/ContentModels.java \
  | sed -n '237,257p' | sed 's/^ *//' | nl | tail -1
```

**A second one, caught while writing this document, and it is the more useful lesson.** §6.3
originally cited `CollectionProcessingUtil.populateParents` at `:529`. It is at `:523`. I had
verified `:523` myself earlier in the session, then took `:529` from a subagent's report without
re-checking, because the report was detailed and mostly right. That is the §3.6 failure mode
operating on me rather than on an audit finding: a confident, checkable number from an agent,
accepted because everything around it was correct. Re-run the number, including when it comes from
an agent you have already found reliable.

### 6.5 Commands that do not measure what their row claims

These sit inside the feature board's "Verified and holding — do not re-investigate" table, which
exists specifically to prevent this.

- **AU2's passkey command has an escaping defect** — `grep -cE '@(Get\|Post\|Put\|Patch\|Delete)Mapping'`.
  Under `-E`, `\|` is a literal pipe, so copy-pasted as written it matches nothing and returns 0.
  The board rewrote this command specifically so "its output IS the number", then wrote it in
  table escaping that breaks it. The claim itself holds: the real count is 4.
- **PF13's `getCollectionBySlug` row records a read, not a command** — "read
  `app/lib/api/collections.ts:106-124`". The table's whole reason for existing is rule 11,
  "re-run a recorded number; never re-read it".
- **CT5's `git grep -c 'auto-tag'` cannot output 0** — `git grep -c` prints nothing and exits 1 on
  no match, so the recorded "0" is an empty output read as a number. It is also a bare string grep:
  `autoTag` or `auto_tag` would return the same.
- **MA1 has two rows for one claim with different commands and different results** — "5 hits" and
  "no matches". The second globs `CollectionController*.java` only, so it never searches
  `CollectionAdminController.java`, where an admin whole-collection PATCH would most plausibly live.
- **PF2's row needs a running local backend** that the board records as down, so it cannot have
  been re-run every pass as the preamble claims. The item is also DROPPED, so the row pins a number
  nothing consumes.
- **`grep -cE '^### (✅|⛔)'` misses `☑`**, so the group-count command returns 0 for the EM and LY
  files whose closed entries use that mark.

### 6.6 Structural defects the existing checks cannot see

Both of the feature board's shell checks pass today. They miss:

- **PF14 has no group-file section at all.** `grep -c 'PF14' docs/spikes/2026-features/pf-performance-platform.md`
  → 0. The check compares the main board against itself, so an item can satisfy it while violating
  the two-tier rule outright.
- **PF13 is COLD in its group file and BLOCKED on the board.** The group heading is `##`, not
  `###`, and lives in a different file, so the duplicate-heading check misses it.
- **`group-e-consolidations.md` carries two `E6` headings**, and the stale one says the item is
  still open and blocked. It has not been since 2026-08-30.
- **Every refactor group file header says "Nothing here is open work"** while carrying open sections
  for B8, E6, E7, E9, F1, F3, G2, G4 and H1.
- **E7's section tells you to fix C10 first.** C10 merged 2026-08-30 as #346.
- **`group-g-decisions.md` names G6 as open.** It shipped as #351.

### 6.7 The two boards disagree about a backend fact

This is the highest-value cross-check available to you.

Refactor **H7** says backend #257 added `GET /api/admin/users/{id}/passkeys` and
`DELETE .../{credentialId}`. Feature **AU2** says there is no passkey list or revoke, verified
2026-09-01 against `WebAuthnController.java` (4 endpoints, register/login × start/finish).

They are reconcilable — H7 names `AdminUserController`, AU2 greps `WebAuthnController` — but nobody
has reconciled them, and Zac is being asked decision #4 ("admin endpoint, user-facing, or both?")
whose "admin endpoint" branch H7 says is already built. H7 also points at feature-board **AU4**,
which is closed; the live pointer is AU2.

## 7. Decisions waiting on Zac

Fourteen across the two boards, and both boards independently instruct that they be put to him in
one sitting. Neither list is current: the feature board says "six more on the refactor board" and
there are eight.

| Board    | Decision                                                                   | Unblocks        | Age                                |
| -------- | -------------------------------------------------------------------------- | --------------- | ---------------------------------- |
| Refactor | F4 — should tag pages gain filters, the collections strip, follow seeding? | F4, touches C15 | 13 days                            |
| Refactor | G3 — delete `/user/selects` or rebuild it?                                 | G3              | 13 days                            |
| Refactor | G2b — does the inline-comment migration cover `.ts` util/lib files?        | G2b             | 13 days                            |
| Refactor | E9 — SCSS `%placeholder` for the six `.srOnly` copies?                     | ~50 lines       | 12 days                            |
| Refactor | H1 — three questions about merging Following into Collections on `/user`   | H1              | 11 days                            |
| Refactor | CSS guard — extend the panel `styles.<key>` guard repo-wide?               | a new guard     | 5 days                             |
| Refactor | C15 — should `/location/{slug}` read the location endpoint's own `images`? | C15             | 4 days                             |
| Refactor | H7 — is passkey management on `/admin/users/[id]` wanted?                  | H7              | 4 days                             |
| Feature  | #1 — similar-collections D1–D6                                             | RC2, RC5        | ~5 days                            |
| Feature  | #2 — staging seed visibility, `HIDDEN` or `UNLISTED`?                      | MA2             | ~5 days                            |
| Feature  | #3 — what should gallery passwords DO?                                     | EM4             | ~11 days                           |
| Feature  | #4 — passkey revocation shape                                              | AU2             | ~5 days                            |
| Feature  | #10 — `/explore` direction vs the H5 MenuDropdown review                   | SD4             | ~5 days                            |
| Feature  | #6 — lone-last-row                                                         | LY1             | **answered; closure open in #399** |

Three notes for whoever runs that sitting:

- **G2b is not a decision.** The board says so itself: "the evidence says yes … this is a confirm,
  not an open design question." It has cost 13 days of blocked status for a yes.
- **H7 and feature #4 are the same feature** and must be asked together, after §6.7 is reconciled.
  Asking them apart risks two answers.
- **C15 costs nothing to leave open** — "the props are wrong on paper and right in practice." Rank
  it last.

Four more decisions block items but were **never filed in either decisions table**, contrary to
both boards' batching rules: MA3's §5.2 light-surface respec, MA6's §10 decisions, SD6's route
shape (`/person/[id]` now vs a backend slug column), and MA4's notify channel (Discord/Slack vs
EM3's email).

## 8. Concerns worth raising, beyond individual rows

**8.1 The boards' verification discipline is strong and its weakest point is the table meant to
enforce it.** Five of eleven rows in "Verified and holding" have a command that does not measure
the claim (§6.5). The discipline reads as rigorous, which is exactly what stops anyone re-checking.

**8.2 COLD vs BLOCKED is still misfiled after the rule that named it.** Rule 33 was written
2026-09-01 because MA4 sat BLOCKED on work that was ours. Today PF13 is BLOCKED on our own
`getCollectionBySlug` and `meServer`, and SD6 is BLOCKED while its own section says the
frontend-only path "works today". Both are COLD-plus-a-question.

**8.3 The frontend-only rule left orphans.** Settled 2026-09-01, it is correct. But it created a
class of item that is blocked on the backend with no handoff doc and no row in either repo: MA1 and
EM2 today, plus five rows marked COLD that cannot be built here (§5.1). Either every such item gets
a handoff doc, or the boards need a status that says "specced, waiting on the other repo, nobody
holds it."

**8.4 Deferral is what breaks F1.** Its correctness depends on no other item landing, so every
merge invalidates it. Four invalidations so far, a fifth queued behind MA1. Either schedule it or
re-describe it in terms that do not rot — anchors and function names, never line ranges.

**8.5 A drift-guard test guards only what its fixture sets, and one is still blind.** `lenses` is
the one real filter dimension that `serializeFilterToParams` never emits and `FILTER_PARAM_KEYS`
never lists, so a lens selection is not URL-shareable. `contentFilter.filterParamKeys.test.ts`
passes green because `EVERY_CRITERION` never sets `lenses` — the identical hole that hid the `year`
omission before #376, and that film stock had to close by hand in #397. Command that finds it:

```bash
sed -n '/^export interface ContentFilterCriteria/,/^}/p' app/utils/contentFilter.ts \
  | grep -oE '^  [a-zA-Z]+\??:' | tr -d ' ?:' | sort > /tmp/crit
sed -n '/^export function serializeFilterToParams/,/^}/p' app/utils/contentFilter.ts \
  | grep -oE 'criteria\.[a-zA-Z]+' | sed 's/criteria\.//' | sort -u > /tmp/ser
comm -23 /tmp/crit /tmp/ser
```

→ `cameraMatchMode lensMatchMode lenses peopleMatchMode tagMatchMode`. The four `*MatchMode`
entries are deliberate; `lenses` is the defect. The durable fix is to derive the fixture from the
type, or assert that command's output.

**8.6 Velocity and integrity are correlated here.** 68 PRs landed across two days in late August,
and most of §6.6's structural defects date from them. Worth a recommendation on cadence, not just
on individual rows.

**8.7 Cross-repo refs are outside every drift sweep.** Both boards say so. Nothing watches for a
backend change silently falsifying a frontend standing instruction — which is exactly what BE#301
did to RC1 today, and what BE#300 did to MA4 two days ago.

## 9. Repo state you will trip over

- **#399 is open, green, rebased and mergeable.** It closes LY1. Merge it or it will go stale.
- **Three files are uncommitted on `main`**: `CLAUDE.md`, `ai_guidelines/ai_lint.md`,
  `ai_guidelines/ai_quick_reference.md` — a docs consolidation carried across sessions, not mine
  and not part of any board item. Leave it or land it deliberately.
- **33 stale local branches and 2 old stashes.** Housekeeping noise, not review material.
- **`git checkout -b` fails under the agent sandbox, and fails dirty** — it updates the worktree
  and then aborts, leaving the other branch's files staged on top of yours. Run branch-creating git
  commands with the sandbox disabled.
- **`edens.zac.backend` keeps `.claude/worktrees/` copies of its whole source tree.** An unscoped
  `grep -rn` there returns roughly three hits for every real one. Always
  `git grep <pattern> origin/main -- src/`.
- **Backend PR numbers collide with frontend ones.** Frontend #300/#301 merged 2026-08-24; backend
  #300/#301 are the MA4/RC1 work. The feature board's convention is a `BE#` prefix — honour it.

## 10. How to work here

The feature board carries 34 hard-won rules and the refactor board 38. Read them; they are the most
valuable prose in either file. The ones that recur most:

- One MR per item slice. `--base main`. Never bundle.
- Every MR: scoped `eslint --fix` → `prettier --write` → `tsc --noEmit` → full `jest`. SCSS also
  needs `next build` or a resolution assertion — jest and tsc cannot see a CSS-module failure.
- Re-run a recorded number, never re-read it. Record the command beside the number.
- A "blocked on backend" claim is a claim. Grep the backend controller.
- Check whether a row's work already shipped before sizing it. This has resized five items now.
- Never tick an item off a PR number alone: `gh pr view N --json state,mergedAt`.
- A squash-merge can silently drop a commit: `git merge-base --is-ancestor <sha> origin/main`.
- A conflicting PR runs no CI at all and shows no red. "No checks reported" means unverified.
- Prove every regression test fails without its fix. Stash, watch it go red, restore.
- A component the admin API will not serve can still be verified — mount it in a throwaway route
  (not `_`-prefixed) with fixture props, measure, delete the route before committing.
- A verified feature can still be the wrong feature. Ask before adding another way to narrow a list.

## 11. Suggested review plan

The proven method in this project is a read-only fan-out followed by one apply pass — the parent
cannot hold eight reports plus a 2,000-line board and still edit carefully. Slices, in priority
order:

1. **Reconcile what shipped against what the boards claim.** §3.1 and §6.1 are the known cases;
   there are 158 merged PRs and only some have been reconciled. This is the slice that prevents
   redoing merged work.
2. **Fix the refactor board's missing rows and import the feature board's two shell checks**, plus
   a third that catches §6.6 — every board row has a group-file section.
3. **Re-run every recorded command; repair the six in §6.5 so their output IS the number.**
4. **Reconcile §6.7** (the passkey disagreement) before anything is put to Zac.
5. **Re-derive F1's boundaries from anchors, not offsets**, and decide MA1-vs-F1 ordering. Or
   schedule F1 and stop paying for the deferral.
6. **Batch all 14 decisions into one sitting**, with the three notes in §7.
7. **Adversarial pass on the merged security work** (Group D, D1–D9, all shipped 2026-08-24).
   Attack it, do not confirm it. The public-repo concern that gated the tracker is resolved — all
   three items it named shipped — but the closure was never re-tested.

Two standing cautions for the fan-out: spot-check every HIGH finding against source (§3.6), and
gate on the compiler and the test suite rather than on an agent reporting success — this repo has
had a tool-instability window where edits reported success and wrote corrupted bytes that were
committed and pushed.
