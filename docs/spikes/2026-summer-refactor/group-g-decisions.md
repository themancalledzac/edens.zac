# Group G — Decisions and docs (shipped)

_Archive of shipped work from the [2026 Summer Refactor board](../2026-summer-refactor.md), plus
superseded measurement history for the open G2 and G4. **G5 closed 2026-08-30; G6 shipped 2026-08-31 (#351); G7 shipped 2026-09-05 (#404).** G2, G3, G4 and G8 are open on the live board._

## Closed rows

| MR  | Scope                                    | Outcome                      |
| --- | ---------------------------------------- | ---------------------------- |
| G1  | Docs corrections                         | +106 / −72 (est. ±50) · #303 |
| G7  | Rename the "Vercel BFF proxy" test names | ~7 test lines, 0 src · #404  |

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

### ✅ G2 · Inline-comment rule — the per-file G2c inventory (superseded measurement; G2 is open on the live board)

_Moved from the live board 2026-08-29. G2 itself is open there. This table's filter was never
recorded, so treat every row as approximate; re-take the whole inventory in one pass (with the
command written beside it) when G2c is picked up._

**Counting method RECOVERED 2026-08-24 — #320 called this inventory unrepairable and it was not.**
The number is **runs of consecutive `//`-only lines** (a 3-line `//` comment counts once), plus
`{/* */}` counted separately as "JSX". Recovered by reproducing it, not by finding it written
down: the method that matched 6 of 11 files exactly is the method.

**Re-derived against `main` at `dbc706a`. Six of eleven were exact; five had drifted:**

> ⚠ **`useCollectionEdit.tsx` gained one docblock in #339 (raw `/**`count 27 → 28), and this table
cannot be updated for it, because the table does not record how its numbers were counted.** The raw
count is 28 and the table says 16, so the 16 is a filtered subset — but the filter is not written
down anywhere in G4, so there is no way to know whether the new`adoptSaveResponse` docblock falls
> inside it. **This is the same defect G4 exists to fix, in G4's own measurement.** Before this table
> is used to size anything, record the command that produces it; until then treat every row as
> approximate rather than re-deriving one row and trusting the rest.

| File                            | Doc claim  | Actual                             | Rides                           |
| ------------------------------- | ---------- | ---------------------------------- | ------------------------------- |
| `useFullScreenImage.tsx`        | ~86 lines  | **80** lines / 37 blocks           | own decomposition; pair with F5 |
| `CollectionPageClient.tsx`      | 24         | 24 ✓ (still 24 on 08-28)           | **nothing — see below**         |
| `useCollectionEdit.tsx`         | 19         | **16** ⚠ stale — see above         | F1                              |
| `CollectionContentRenderer.tsx` | 16 + 4 JSX | 16 + 4 JSX ✓                       | E8/F2                           |
| `EditModeLayer.tsx`             | 13         | **17** (re-run 2026-08-29: **16**) | F1                              |
| `CollectionPageWrapper.tsx`     | 9          | 9 ✓                                | —                               |
| `ClientGalleryDownload.tsx`     | 8          | **7**                              | E9                              |
| `CameraSettingsSection.tsx`     | 7          | **8**                              | —                               |
| `MenuDropdown.tsx`              | 7          | 7 ✓                                | E8                              |
| `UserManagementPanel.tsx`       | 5          | 5 ✓                                | —                               |
| `Component.tsx`                 | 5          | 5 ✓ (re-run 2026-08-29: **6**)     | F2                              |

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

### ✅ G4 · Docblock standard — measurement history (G4 is open on the live board) (baselines, the intersection pass, and the 2026-08-28 sweep's spent findings)

_Moved from the live board 2026-08-29. G4 itself is open there with the standard and the current
counts. This is the record of how the numbers were taken and what each pass found._

_Raised by the user 2026-08-24 off PR #301's `revalidateLocationCaches` docblock: 30 lines of prose
for a function that maps two location arrays to a set of tags._

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

**What was left after #310.** 45 blocks still carried backward-looking language, all of them short
enough that the line-count smell never fires on them: "used to" ×20, "no longer" ×11, "previously"
×7, a bare date ×6, "the old" ×2, "PR #N" ×1. Several are false positives of the scan —
`collectionEditUtils`' "listing a collection that is not there" and `CollectionPageClient`'s "ids
that are not on screen" describe DATA state, not code history, and a regex cannot tell those apart.
That is the same reason the no-lint-rule decision holds. A re-scan on 2026-08-25 (a looser regex
than #310's, so not directly comparable) reported **48** against #310's 45 — after #329's removals.
The pile is not shrinking on its own.

**The sweep will not converge while new docblocks keep adding to the pile, and 2026-08-25 proved
it.** C6 (#327) and F7 (#328) shipped fresh backward-looking docblocks — "was removed once
measured", "whatever an earlier version of this comment said", plus board labels (`F6`, `F7`, `C6`)
and backend PR numbers written into interfaces and test headers. The user caught it on read:
_"comments like this that explain 'previous issues or previous state' should NOT EXIST"_ and
_"F6 means NOTHING in this context ... we are only dealing with what the code IS and what it DOES"_.
Removed in #329, which also took two pre-existing blocks with it (the `reorderImagesBeforeCollections`
parenthetical in `processContentBlocks`, and `EditRendererProps`' previous-design paragraph). That
read produced the two additions to the standard that now sit in the live item.

**Why this is happening, and why the existing rule does not catch it.** `CLAUDE.md` already forbids
inline comments and sends every "why" into the docblock, with one escape hatch: _if the docblock
gets too big, split the function._ That escape hatch assumes a big docblock means the function does
too much. Here it does not. `revalidateLocationCaches` is small and does one thing; its docblock is
long because it is carrying **decision-record content that belongs in the PR and on this board**.
The rule has no answer for that case, which is the gap this item closes.

**Worked example, and a rot prediction that came true and is SPENT.** #301's docblock contained a
paragraph beginning "Image-level location edits are not covered, and that is a known gap" — roughly
six lines duplicating tracked item E13. The prediction was that the docblock would go false the
moment E13 shipped. It did, and it was caught: E13 (#313) shipped and rewrote the docblock in the
same pass. `collectionEditUtils.ts:230` now describes two live call sites, is 24 lines (down from
the 30 that filed the item), and the "slugs must come from the saved response" trap the section
wanted preserved is intact at `:239-242`. A tracker entry duplicated into a docblock is a comment
with an expiry date on it — and this one expired on schedule.

**From the 2026-08-28 sweep, resolved and recorded:** the row's "#327/#328 ADDED to the pile" was
STALE — #329 cleaned them and it held; every source file those two PRs touched is clean of anchor
terms except `useCollectionEdit.tsx:644`'s docblock, which matches `previously` (noted on the live
item). The one `contentLayout.ts` hit ("used to hold photos-per-row steady", block start `:85`) is
employed-to, and `git log -L` traces it to `10fb626`, not #327. The recorded per-term table summed
to 47 rather than the 45 it stated — term overlap (`collectionSlugs.ts:43` and
`listPanelShape.ts:97` each match two terms); the union is the right number.

---

### ✅ G5 · Bare-array API responses — CLOSED 2026-08-30 with zero frontend code

Filed 2026-08-29 from the cross-repo contract review: 17 backend read endpoints return top-level
JSON arrays, the frontend consumes 13 of them directly as `T[]` across ~14 call sites in 6 files
with no unwrap layer, and the wrap-vs-bless decision lived only on the backend's board.

**Answered by the backend, and it had already merged before this board noticed.** Backend
[#243](https://github.com/themancalledzac/edens.zac.backend/pull/243) landed 2026-08-30 and blessed
bare arrays in its own `.claude/CLAUDE.md`:

> A list endpoint MAY return a top-level JSON array. Wrapping it in an object is not required
> (decided 2026-08-30: the frontend consumes bare arrays directly, and 17 endpoints already ship
> this way). Prefer an object when the response carries anything besides the list itself, such as
> paging or a total.

Its commit message says the same: "closes MR 20 without touching the 17 endpoints." **So the
frontend ships nothing.** No tolerant parse, no phased migration, no test churn. The four-step plan
this item carried is dead and was archived with it rather than left as an open box.

**The premise and arithmetic were sound — only the decision was missing.** Re-verified 2026-08-30
immediately before closing: 14 call sites in 6 files, of which `/user/selects` appears twice, giving
13 distinct endpoints. `adminHome.ts:12`, `roles.ts:27/:73/:90`, `users.ts:56/:203/:219`,
`personal.ts:97/:115/:134`, `selects.ts:32/:53`, `content.ts` (the two fetch calls are at `:39` and
`:56`; the board's `:42`/`:58` pointed at the `next:` options object below each — a small anchoring
miss, now moot).

**The lesson, hoisted: read the other repo's board and HEAD before stamping BLOCKED-on-user.** This
row sat blocked on a decision that was already made and written down in the other repository. It
cost nothing to check and would have cost a session to schedule around.

---

### ✅ G6 · HIGH — `CLAUDE.md`'s "Localhost Admin Needs No Login" rule was FALSE — PR #351, 2026-08-31

Filed 2026-08-30 while reading the backend repo to settle G5. **Recommended next MR.** This is not
a docs nicety: the rule instructs every agent _not to investigate_ a breakage that is now real.

`CLAUDE.md:14` (Critical Rules) currently claims local `/admin` is reachable anonymously "at every
layer", enumerating four, and ends: _"Do not 'fix' any of those as a security hole and do not ask
the user to log in for you."_ **The fourth layer is no longer true.** Backend
[#243](https://github.com/themancalledzac/edens.zac.backend/pull/243) merged 2026-08-30 and removed
the `app.admin.enforce-authz` toggle that let local dev fall through to `permitAll`.

Verified in backend source, not from the commit message:

- `SecurityConfig.java:75-76` — `.requestMatchers("/api/admin/**").hasRole("ADMIN")`, with no
  profile condition, and a 401 authentication entry point.
- `SecurityConfig.java:41-42` docblock — "Both write tiers sat behind `app.admin.enforce-authz`
  until 2026-08-30, which let local dev fall through to `permitAll`. **That toggle is gone and the
  gate is unconditional in every profile.**"
- `/api/edit/**` went the same way, to `hasRole("USER")`.

**Why this is worse than an ordinary stale doc.** The frontend's own three layers still pass
anonymously by design — `proxy.ts` passes the route group, the BFF's anonymous-admin reject is
production-only, and `requireAdmin()` returns early on `isLocalEnvironment()`. So the admin page
still _renders_ locally; it is the data fetch behind it that now gets a 401. An agent hitting that
will read the Critical Rule, see "do not fix this, do not ask the user to log in", and conclude the
401 must be something else. **A false instruction that forbids investigation is strictly worse than
one that merely misleads** — this is the same class A9 just closed, with the failure mode inverted:
A9's stale line produced working commands and so stayed invisible; this one produces a confusing
failure and actively deflects the diagnosis.

- [ ] Correct the fourth clause of `CLAUDE.md:14` — the local backend now requires an admin session
      on `/api/admin/**`. Keep the first three layers' description, which is still accurate and is
      still worth protecting from well-meaning "security fixes".
- [ ] Say what a local session now requires, so the rule answers the question it raises instead of
      leaving the next agent to rediscover it.
- [ ] Check whether `tests/utils/admin.test.ts` encodes the old backend assumption anywhere. The
      frontend gates it covers are unchanged, so this is expected to be a no-op — confirm rather
      than assume.
- [ ] **Guardrail: do not "fix" the three frontend layers.** They are deliberate and the rule is
      right about them. Only the backend clause is false. If the local flow turns out to need a
      frontend change too, report what it would cost rather than making it in this MR.

Est: ~4 docs lines, 0 src. The verification is reading the backend config, which is done and
recorded above.

**Cross-repo note.** The consequence is logged on the backend board's session log too, so the trail
runs both ways. A backend security change silently falsifying a frontend standing instruction is a
class of breakage neither board was watching for — see the rule now in "How to use this doc".

**Shipped 2026-08-31 as PR #351.** Premise re-verified against the backend's `origin/main` at
close, by running the check rather than re-reading it: `SecurityConfig.java:75-77` gates
`/api/admin/**` on `hasRole("ADMIN")` and `/api/edit/**` on `hasRole("USER")`, with no profile
condition, and the four surviving `app.admin.enforce-authz` references in backend source are all
prose in docblocks describing the removal — it appears in no properties file.

Both checklist bullets landed, and the third was confirmed rather than assumed: `tests/utils/admin.test.ts`
does not encode the old backend assumption (it mocks `meServer` and asserts only `requireAdmin`'s
branching), 6/6 pass unchanged. The guardrail held — the three frontend layers were left alone, with
the cost of changing them reported in the PR body (~10 src / 20 test) and a recommendation not to.

Two decisions worth carrying forward:

- **The heading was kept, not renamed**, as "Localhost Admin Needs No Login — Frontend Only". Five
  sites cite the rule by that name (`clearCache.ts`, `proxy/[...path]/route.ts`,
  `revalidate/route.ts`, and two test docblocks); renaming would have dangled all five for no gain.
- **The prose was cut roughly in half at close**, after the user objected to docblock bloat
  elsewhere in the same session. The rule that produced the cut is now global, in
  `~/.claude/CLAUDE.md`, not repo-local — see the 2026-08-31 session-log entry.

---

### ✅ G7 · Test names called the BFF proxy "Vercel"; production is Amplify — PR #404, 2026-09-05

Seven `describe` strings renamed from `Vercel BFF proxy …` to `BFF proxy …` — six in
`tests/api/proxy/route.test.ts` and one in `route.logHygiene.test.ts`. The board's count was right.

Naming only. The `x-vercel-forwarded-for` read order and the `x-vercel-ip-*` strip list were left
untouched, as the item instructed: they are host-agnostic and correct on both hosts.

---

### ✅ G3 · `/user/selects` — DELETED in #411

**The user's call: delete `/user/selects`.** Selects already live in the gallery star flow, which is
why the page renders raw IDs nobody follows. Scope is below and every ref was re-resolved at HEAD
`056b2f50` on 2026-09-06.

**Unreachable, re-confirmed 2026-09-06.** `app/user/selects/page.tsx` is 65 lines.
It renders literal `Collection 42` and `Image 117` headings linking to `/?collection=42`, and
nothing in the app handles that param:

```bash
grep -rn "collection'" app --include='*.ts' --include='*.tsx' | grep -E "searchParams|\.get\("
grep -rn '/user/selects' app tests
```

The first returns nothing. The second is the trap this item has always warned about: every hit is inside
`app/lib/api/selects.ts`, which names `/api/proxy/api/read/user/selects` — the backend route, not a
link to the page. No page in `app/` links to `/user/selects`, and there is no test for the page.

**The delete is bigger than 65 lines.** It also orphans two things:

| Also deleted                                | Size     | Why it goes                                                                                                      |
| ------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------- |
| `app/user/selects/page.module.scss`         | 48 lines | imported only by the page                                                                                        |
| `listAllSelectsServer` (`selects.ts:45-63`) | 19 lines | the page is its only app caller; its describe at `tests/lib/api/selects.test.ts:118-152` (35 lines) goes with it |

Four refs, all re-resolved 2026-09-06 — the old `selects.ts:45-62` was one line short of the
function's closing brace:

```bash
wc -l app/user/selects/page.tsx app/user/selects/page.module.scss
grep -n 'listAllSelectsServer' app/lib/api/selects.ts
grep -n 'describe(' tests/lib/api/selects.test.ts
```

→ 65 / 48; the docblock opens at `:45` and the function runs `:51-63`; the describe opens at `:118`
and the file ends at `:152`.

The other three exports of `selects.ts` (`addSelect`, `removeSelect`, `listSelectIdsServer`) have
live callers and stay.

- [x] ~~**Delete the page, its SCSS module, `listAllSelectsServer` and that function's describe
      block.**~~ **Shipped in #411.** The greps were re-run at HEAD first and every claim above held:
      no page links to `/user/selects`, `?collection=` is still unhandled, 65 / 48 lines, and the
      page was `listAllSelectsServer`'s only app caller.
- [x] ~~**`SelectGroup` (`app/types/Selects.ts:9-12`) goes with it.**~~ **Shipped in #411**, and the
      module docblock's "listed on their `/user` page" sentence was corrected in the same commit.
      `app/types/Selects.ts` stays for `PINNED_SELECT` and `MaybePinned`.
      **One ref the row did not have:** deleting the describe left `loggerErrorMock` and the
      `logger` import unused in `tests/lib/api/selects.test.ts` — eslint caught it. The
      `jest.mock('@/app/utils/logger')` factory stays, because `listSelectIdsServer`'s failure path
      still logs; only the unused handle and import went.
- [x] ~~**Tell the feature board.**~~ **Done in #411.** G3 went first, so PF15's `app/robots.ts`
      bullet was re-pointed: `grep -rn 'index: false' app` now returns exactly one,
      `app/all-client-galleries/page.tsx:7`.
- [ ] Status wording reconciled 2026-08-22: A1 is COMPLETE as shipped — the `/user/selects` deletion
      was pulled OUT of A1 (see A1's closing note in the archive). Deciding G3 performs that final
      deletion (or its rebuild); it does not reopen A1.

---

### ✅ G8 · Extend the panel `styles.<key>` guard repo-wide? — USER DECISION

Filed as a row 2026-09-05; it had sat in the state table alone as "CSS guard" with no id, the only
blocked question the shell checks could not see. `tests/components/panelStyleReferences.test.ts`
proves every `styles.<key>` in six panel directories resolves to a class in the module it imports;
nothing checks the rest of `app/components/`. Sizing, re-run 2026-09-05 with the commands in the
CSS rule: **107** files import a CSS module and **411** distinct `styles.<key>` names — both
re-verified 2026-09-06. The third figure was wrong: it is **10 import statements across 9 files**,
not 10 files. `CollectionContentRenderer.tsx` carries two of them (`cbStyles` at `:43` and
`variantStyles` at `:45`), so counting statements double-counts that file.

```bash
grep -rnE "^import [A-Za-z]+ from '.*\.module\.scss'" app --include='*.tsx' --include='*.ts' \
  | grep -v ':import styles from' | wc -l
```

→ **10**. Pipe the same output through `cut -d: -f1 | sort -u | wc -l` for the file count → **9**.
The bindings are `cbStyles` ×5, `modalStyles` ×4 and `variantStyles` ×1. A guard sized off a
`styles.` regex skips all of them silently.

- [x] ~~**BLOCKED — user:** extend the guard, or keep it panels-only.~~ **DECIDED 2026-09-08:
      extend. SHIPPED the same day as #415.**

**SHIPPED 2026-09-08 as #415**, and it paid on the first run.

`tests/components/panelStyleReferences.test.ts` became
`tests/components/styleClassReferences.test.ts`, covering all 106 files under `app/` that import a
`.module.scss` (108 import statements).

**It found a live regression, which is the whole reason to keep this write-up.** `ff3a3e9c`
(2026-08-04, the cover-picker move) took 95 lines out of `InfoTab.module.scss` and swept
`.checkboxRow` and `.checkboxLabel` along with them. `InfoTab.tsx:101-109` still used both, so the
Kind checkboxes rendered with no flex row, no gap and no pointer cursor **for a month**. Both classes
were restored byte-identical to what that commit removed. **This is the second instance of the same
bug class** — the first was `.loadError` leaving `RoleDetailView.tsx` dangling, which is what got the
panels-only guard filed. Two instances from two unrelated SCSS deletions is the argument the
panels-only scoping could not make for itself.

**The specifier-vs-binding warning in the row was correct and load-bearing.** Ten import statements
across nine files bind to `cbStyles`, `modalStyles` or `variantStyles`. A test asserts those ten stay
covered and that the alternate-binding set is exactly those three.

**Two figures on the row were stale at HEAD: 107 files → 106** (#411 deleted one) **and 411 distinct
keys → 451.** The key count was low for the same reason the guard had to be rewritten — the board's
`styles.` regex could not see the keys behind the renamed bindings.

**Two guards on the collection itself**, because a collector that silently returns nothing is worse
than no test: a floor on the file count (a floor, not an exact number, or it reddens on every new
component) and the alternate-binding assertion.

**The blind spot is unchanged and is now written into the test's docblock:** a dynamic `styles[key]`
lookup is invisible, because the key is not in the source.

---

## G4's history sweep — the runnable form

_Recorded 2026-09-08 (2). The live board describes this method in prose, which is how the count got
disputed across three passes: each pass reimplemented it slightly differently. Run **this**, not a
rewrite of it, and record the HEAD you ran it at._

```js
// node this from the repo root
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
const root = path.join(process.cwd(), 'app');
const files = readdirSync(root, { recursive: true, encoding: 'utf8' })
  .filter(f => f.endsWith('.ts') || f.endsWith('.tsx'))
  .map(f => path.join(root, f));
const TERMS = {
  'used to': /\bused to\b/i,
  'no longer': /\bno longer\b/i,
  previously: /\bpreviously\b/i,
  'the old': /\bthe old\b/i,
  'PR #n': /PR #\d+/i,
  'bare date': /\b20\d\d-\d\d-\d\d\b/,
};
let total = 0;
const hits = new Set();
const per = {};
for (const k of Object.keys(TERMS)) per[k] = 0;
for (const f of files) {
  for (const m of readFileSync(f, 'utf8').matchAll(/\/\*\*[\S\s]*?\*\//g)) {
    total++;
    let hit = false;
    for (const [k, re] of Object.entries(TERMS))
      if (re.test(m[0])) {
        per[k]++;
        hit = true;
      }
    if (hit) hits.add(`${f}:${m.index}`);
  }
}
console.log(total, hits.size, per);
```

Results, so that a future run can tell drift from a different command:

| HEAD       | Date           | Blocks | Backward-looking | Split                                        |
| ---------- | -------------- | ------ | ---------------- | -------------------------------------------- |
| `699aa4f2` | 2026-09-05     | 1,494  | 54               | —                                            |
| `fcc6ebd3` | 2026-09-08     | 1,497  | 54               | 22 / 14 / 7 / 8 / 4 / 1                      |
| `5537c4aa` | 2026-09-08 (2) | 1,500  | 54               | 22 / 14 / 7 / 8 / 4 / 1 — reproduced exactly |

**The numerator has not moved in three measurements taken across two weeks.** Only the denominator
does, on any addition or deletion under `app/`. Treat a change in the 54 as a real event and a
change in the total as noise.

**The board-label sweep is a different sweep and must NOT be run with a bare
`\b[A-H][0-9]{1,2}\b`.** That returns 18; the recorded figure is 17 and the recorded figure is
right. `contentRatingUtils.ts:35` contains `H5★` — a five-star horizontal rating — and the live
section flags it as the false positive to watch. Verified 2026-09-08 (2) by running the crude
version, disbelieving the board, and being wrong.
