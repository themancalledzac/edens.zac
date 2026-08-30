# Session log — 2026 Summer Refactor

_Archive of shipped work from the [2026 Summer Refactor board](../2026-summer-refactor.md). Nothing here is open work. Sections are verbatim as they were when the item merged._

One line per `/next` run, oldest first. The newest two entries stay on the live board; everything older lives here. Three consecutive entries ending in the same `Next:` means that item is being avoided, not scheduled.

_Label scheme: same-day runs are numbered "(1)", "(2)", … in run order. The two unnumbered "2026-08-28" entries below predate the numbering and are that day's first two runs; later entries count from them, which is why the live board's numbering that day starts at "(2)". History is not renumbered._

---

- 2026-08-22 — merged A5 (#260), A6 (#261), A7b (#262), A8 (#263) and synced main; the incoming
  prompt claimed #262/#263 were still open, they were not. Shipped C1 (#264) and D1 (#265), both
  merged and deployed via Amplify. Filed D6 (Origin allowlist, split out of D1). Hoisted the
  prove-the-test-fails rule into "How to use this doc" after it caught two would-be-worthless tests.
  Next: D2, then B8's first slice.
- 2026-08-22 (2) — shipped D2 (#266, merged) and B8's first slice (#267, merged). Reported on
  unifying D1/D2: the doc's reason ("a route handler cannot resolve a session") is WRONG —
  `meServer()` works in a route handler. Corrected in D2's section below; the real argument is 3
  extra auth round trips per collection save and turning a loud failure quiet.
  Next: G2's CLAUDE.md commit, then E1.
- 2026-08-22 (3) — `0251-collections-panel` (PR #253) is a SEPARATE agent's branch. Cleanup work
  moved to a worktree at `.claude/worktrees/cleanup` so the primary checkout is never disturbed;
  per the global rule that is the sanctioned two-branches-at-once case. `node_modules` cloned with
  `cp -Rc`. Shipped G2's CLAUDE.md wording (#268) and E1 (#269). Split C6 out of E1 — the board
  called E1 a correctness fix, but the plan scopes it as a pure refactor, and the password-strip
  divergence is a separate item that may need a backend field first.
  Next: C6's decision (check whether it is a backend item), or D6 / D3-D5 to finish Group D.
  _(That "Next" named two items and a range, which is not a next. Resolved in the entry below:
  C6 is backend-blocked, so D6 is next. One item per entry from here on.)_
- 2026-08-23 — reconciled: #266, #267, #268, #269 all MERGED (the previous entry left them
  unverified). Local `main` was 7 behind. Answered C6 and it is **backend-blocked** —
  `ContentCollectionModel` carries no `isPasswordProtected`, so the public card path has nothing to
  strip on; marked ⛔ so nobody opens an empty frontend MR. Moved the D6 section out from under the
  Group E heading, where it was unfindable. Re-verified D6's two line refs.
  Next: D6.
- 2026-08-22 — shipped D6 (PR #270). Origin allowlist extracted to `app/utils/originAllowlist.ts`
  and applied to `/api/revalidate`'s POST; the pinned proxy suite passed unchanged, 22/22, which was
  the whole safety argument for the extraction. Held both guardrails: no `principal.isAdmin` change
  (cost reported in the D6 section instead — the short version is three to four extra `/api/auth/me`
  round trips per save to close a gap that is unreachable until Phase C ships client users), and D5
  not bundled even though it edits the same file. Estimate ±60 vs actual +75 src / +230 test — the
  same "estimates count source only" lesson as A4/A6/D2, now four for four.
  Next: D5.
- 2026-08-22 — brought PR #253 (`0251-collections-panel`, open and untouched since 08-15) current
  with main. Clean merge, one compile break from A4's `formatDisplayDateRange` deletion, fixed at
  `3242531`. 220 suites / 4143 tests green; hub fixtures needed no re-derivation. The PR is still
  blocked on the same unanswered design question it opened with — whether four tall panels belong
  on the admin hub. Not a cleanup item; it needs a decision, not a sitting.
- 2026-08-23 — PR #270 (D6) merged. Wrote `2026-08-22-frontend-cleanup-HANDOFF.md` next to this
  file for a review-only session on a different model, and mirrored its durable parts into MemPalace
  (`mempalace_user_search(query="frontend cleanup spike review")`) because this directory is
  gitignored and a handoff that dies with the machine is not a handoff. The handoff's findings that
  belong here: **E10 and D7 have sections but no board row**, and **D7 is filed under the Group E
  heading** — the exact unfindability bug this log recorded fixing for D6 on 08-23, recurring. Also
  **A1 is ✅ on the board while G3 says it blocks A1's last item**; unreconciled. Corrected C5's
  proxy-log ref, which D6 drifted from :153 to :140.
  Next: D5 — but D4 is ±3 lines and closes a live abuse vector, so consider taking it first.
  _(The two entries above this one were appended later with 08-22 dates from a late-night session;
  the log was reordered causally on 2026-08-23 and a stray blank line removed.)_
- 2026-08-22/23 — full-board review session (7 parallel read-only agents; no MRs opened). Merged
  main into #253's branch (clean; 223 suites / 4,066 tests green) and pushed. Verdicts: the D1/D2/D6
  gates are SOUND under adversarial review (one new trivial item filed, D8); ZERO regressions from
  A5/A6/C1/E1/D2 reached main; PR #253 is technically merge-ready, awaiting only the four-panel
  decision. 27 refs checked (4 drifted, 1 gone) — corrected in place. Estimates recalibrated;
  every open item stamped COLD or ⛔ on the board. D3 and D4 UNBLOCKED against production
  (no headers injected; distribution `d2qp8h5pbkohe6.cloudfront.net`). C5's token-leak bullet
  DISPROVEN and reframed. D7 moved under Group D and shrank to "rides #253"; E10 marked AWAITS #253.
  E5 lost two bullets (one false, one already done). Board rows added for D7/D8/E10. Removed the
  cleanup worktree (D6 branch merged, tree clean). Blocked set: C6 backend; D7/E10 await #253;
  E9-srOnly, F4, G2b scope, G3 are user decisions; G2c rides its refactors. Everything else is COLD.
  Next: D4.
- 2026-08-23 — **PR #253 MERGED (79fbca5).** D7 closed outright (both token fixes rode the branch);
  E10 unblocked — all four panels are on main. Primary checkout back on `main`; the worktree era is
  over, cleanup MRs branch off main in the primary checkout directly. The user accepted the review's
  recommendations wholesale. Renamed this file `2026-summer-refactor.md` as the standing per-session
  tracker (pointer stub left at the old date-stamped path; MemPalace drawers updated to the new
  name). The `layoutpreview/` screenshot harness is now purposeless — delete on sight. Blocked set
  is down to: C6 backend; E9-srOnly, F4, G2b scope, G3 user decisions; G2c rides its refactors.
  Next: D4.
- 2026-08-23 — shipped D4 (PR #272, open). **D4 had been the `Next:` of the two entries above this
  one and was about to become a third — the leak the log exists to catch — so it was executed on
  the spot rather than handed off again.** One line, ±1 estimated and ±1 actual. Re-verified the
  distribution against seven production pages instead of the homepage the 08-23 capture used;
  all seven serve `d2qp8h5pbkohe6.cloudfront.net` exclusively. Held the bundling guardrail:
  `poweredByHeader: false` stayed with D3 even though D3 edits the same file. Reconciled first:
  zero PRs open, everything through #271 merged, local `main` was 2 behind — and because #271's
  `.gitignore` negation had not been pulled yet, this file read as untracked and `git check-ignore`
  called it ignored. Recorded that trap in the header note. Verified all six of D5's `file:line`
  refs, zero drift, and wrote D5's two guardrails into its section. Filed the still-present
  `layoutpreview/` harness as a real A9 bullet — the 08-23 "delete on sight" log line did not stick
  because it was only a log line.
  Next: D5.
- 2026-08-23 — shipped D5 (PR #273). #272 was already merged on arrival, so the sitting was the
  work itself. **The item's own guardrail would have produced a broken fix if followed to the
  letter.** "The reject is one prefix check" reads as `startsWith('api/')` on the raw joined path,
  and that check is walked past by `api/../actuator/env`, because `fetch` normalizes dot segments
  while parsing the URL. Verified the normalization before writing anything, then ran the same one
  check against the normalized path instead of the raw string — still one check, still not
  allowlisting or rewriting the builder. Three more spellings (`%2e%2e`, backslash, multi-hop) are
  caught by that and would not have been by a segment blocklist; `..%2F` correctly still forwards.
  Wrote the eight reject tests first and confirmed all eight red against the unpatched handler
  before touching `route.ts`. `/cdn` removal was exactly the four places listed, and the matcher
  guardrail held — the D5 section now carries a table of what changing each remaining entry would
  do, so the next session with a tidying mindset has the answer without opening the array.
  Next: D3 (security headers + `poweredByHeader: false`), started in the same session as its own MR.
- 2026-08-23 — shipped D3 (PR #274), same session as D5 (#273) but a separate MR off `main`, so the
  two could merge in either order. **They did conflict here, exactly as the entry above predicted,
  and the resolution was to keep both entries — the log is append-only, so a same-session pair
  always collides in this one spot.** #273 landed first; #274 was rebased onto it. Five headers plus
  `poweredByHeader: false`, CSP report-only. Verified against a running server on the "Verify
  Preview" config rather than against the config object; the headers are real. **The console being
  clean was not enough and the gap was closable in one step:** the backend was down, so all three
  routes rendered error boundaries and no image or video ever loaded, leaving `img-src`/`media-src`
  unexercised — injected a CloudFront `<img>` and `<video>` into the live page plus an `example.org`
  control, and only the control reported. Without the control the silence would have proven nothing.
  Folded the D4 CloudFront host into one `CLOUDFRONT_HOST` const shared by `remotePatterns` and the
  CSP, with a test pinning that they agree. Held scope: no `Permissions-Policy`, and
  `'unsafe-inline'` stays until a nonce moves the CSP into `proxy.ts`.
  Next: D8 (the last open Group D item), then Group B or C.
- 2026-08-23 — reconciled: #272, #273 and #274 are all MERGED, zero PRs open, `main` at `840c0b8`.
  The board needed no status corrections for once — D3/D4/D5 were marked ✅ in the same commits as
  their fixes, so the record landed with the code instead of trailing it. Re-verified D8's ref
  (`originAllowlist.ts:21`), zero drift; none of the three MRs touched that file. Filed **D9** from
  a finding made while setting up D8: the two `localhost` literals in `allowedOrigins()` are
  redundant with `DEV_LAN_ORIGIN`, verified by running the regex, and deleting them is invisible to
  all 19 tests in that file — so it is a decision to write down, not a cleanup to do. Hoisted two
  session lessons into "How to use this doc": verifying a negative by observation needs a positive
  control (from D3), and an item that specifies the _mechanism_ of a fix can specify a broken one
  (from D5). `app/(admin)/admin/layoutpreview/` is STILL untracked — third session running; it is an
  A9 bullet and nobody has deleted it.
  Next: D8.
- 2026-08-23 — D8 shipped as PR #276; `main` was already at `eb45705` when the session opened (#275
  had merged on its own, so "merge it" was a reconciliation, not a merge). **The board's own spec
  was the bug this time.** "Guard the throw" is not sufficient to normalize `NEXT_PUBLIC_APP_URL`:
  `new URL()` does not throw on a non-special scheme, it returns the literal string `"null"` — which
  is what browsers send from sandboxed iframes — so the prescribed fix would have added `"null"` to
  the allowlist and opened the exact class of hole D6 was built to close. Caught by checking Node's
  actual behavior across twelve env-value shapes before writing the guard. **Second consecutive
  session where an item specified the mechanism of its own fix and specified a broken one** (D5 was
  the first, already hoisted into "How to use this doc"); the lesson is paying rent, so treat a
  board item's prescribed mechanism as a hypothesis to test, never a spec to transcribe. Both
  guardrails held — the incoming `origin` argument untouched, the D9 literals reported on rather
  than changed. That report found something D9 had wrong: the literals are a strict _subset_ of
  `DEV_LAN_ORIGIN` (the regex is case-insensitive, the Set match is not), so "two independent
  expressions of the same intent" overstates them. **Do not run Prettier on this file** — it is not
  Prettier-clean on `main`, so `--write` realigns every board table and buries the real diff under
  ~140 lines of churn. Caught and reverted here; the file has always been committed unformatted.
  `app/(admin)/admin/layoutpreview/` is STILL untracked — fourth session running.
  Next: D9, the decision, as its own MR.
- 2026-08-23 — D9 decided and shipped as PR #277, stacked on #276 rather than waiting for it to
  merge, because both edit the same function; retarget to `main` after #276 lands. **Group D is now
  closed.** Decision was delete, and the argument that settled it was not the redundancy — it was
  that the failure "keep" would protect against is loud. A tightened regex breaks the dev server on
  the next request and reddens tests in the same second; defense in depth is priced for silent
  failures. **The D9 entry's own premise turned out to be wrong, and only checking it revealed
  that:** it claimed no test would catch a wrong redundancy argument, but simulating the feared
  future (dropping bare `localhost` from `DEV_LAN_ORIGIN`) turned `allows both local dev ports` red
  at once. The entry mistook tests that pass because the reasoning is right for tests that cannot
  tell. **That is the same failure mode as D5 and D8 one level up** — those two had board items
  prescribing a broken mechanism; this one had a board item asserting a false fact about coverage.
  The rule generalizes: verify a board item's _claims_, not just its refs, before acting on them.
  Refs have been drift-checked every session; claims had not been.
  Next: Group B or C — Group D is done.
- 2026-08-24 — reconciled: **#276 and #277 both MERGED** (01:19Z, seconds apart); #277 was retargeted
  from the D8 branch to `main` before merging, so the stack resolved cleanly. `main` at `237ea03`.
  **Group D is closed — all nine items.** No status corrections needed; D8/D9 were marked in the
  same commits as their fixes.
  Audited C4 before handing it off rather than trusting its bullets, and it **understated itself a
  second time**: it only ever examined `revalidateMetadataCache`, so it missed `collection-home`,
  a dead revalidate target in `revalidateCollectionCache` two lines above. Five dead tags across two
  functions, not four in one. Full register-vs-revalidate table now in the item so the next MR does
  not re-derive it. Also filed **E11** for the tag-registry idea, specifically to keep it OUT of C4.
  The stale-index trap fired once and was caught: MemPalace still indexes a second
  `revalidateMetadataCache` in `manageUtils.ts` that A-group deleted — the palace is a June snapshot,
  so grep before believing it about file existence.
  `app/(admin)/admin/layoutpreview/` — **re-attempted the delete and was denied again**, with bypass
  permissions active. Now confirmed reproducible rather than a D4-session fluke, so it is genuinely
  a user action; A9 updated to say stop trying. Fifth session carrying it.
  Next: C4, dead-revalidate half only.

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

- 2026-08-23 — **Not a `/next` run: six feature requests filed from a user design review of `/user`.**
  Filed as Group H. Only H1, H2a and H3 got board rows; H2b/H4/H5/H6 are a design review, an ops
  project, a second design review and a vision item, so they went to
  [group-h-features.md](group-h-features.md) with a pointer under "What to
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
[session-log.md](session-log.md). Three consecutive entries ending in the same `Next:` means
that item is being avoided, not scheduled — make it real work or drop it from the board.

- 2026-08-24 — **ten items shipped as parallel agents**, PRs #294–#304, plus #305 (this board) and
  #297 (restores a test #294 dropped). Merged so far: #294, #295, #302. Four board claims disproved,
  two estimate biases named, three standing traps hoisted into "how to use this doc". Filed E13 and
  E14. Corrected H1's test ref (drifted `:238-262` → `:252-276`). Settled two blocked questions by
  looking: the repo has **no CI at all**, and the class-key guard would span 104 files / 401 reads.
  Next: **E3**, once #296 merges.

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

- 2026-08-24 (6) — **shipped E15 (#314)**, stacked on #313. +22 src net / 14 test call sites.
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

- 2026-08-24 (5) — **shipped E13 (#313)**. `main` at 0b0f255. +36 src net / +165 test; the src
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

- 2026-08-24 (7) — **close-out run: E13 (#313) confirmed in `main`, E15 re-landed as #315.**
  **The headline is a merge failure, not an item.** #314 reported `MERGED` and E15 was NOT in
  `main`: it had been stacked on `0313-…`, #313 merged to `main` at 21:17:42, and #314 merged into
  the retired `0313-…` branch 33 seconds later, inside GitHub's auto-retarget window. The board read
  ✅ while `createHeaderRow` still had both boolean params. Caught by
  `git merge-base --is-ancestor`, re-landed as **#315** (clean merge, no conflicts). Hoisted into
  "how to use this doc": **a `MERGED` badge is not a claim about `main`.**
  **Drift sweep, scoped to the five files E13/E15 touched: 17 refs checked, 4 wrong, all fixed.**
  Two were mine from the same session — E15's new 20-line interface shifted `contentLayout.ts`
  refs I had written from a pre-edit read (`:557→:552`, `:511→:505`) — one was a subagent's ref
  taken while I was editing (`metadataUtils.ts:611→635`), and one was pre-existing
  (`useCollectionEdit.tsx:432→433`, which a prior session had already corrected once). Second
  lesson hoisted: **a ref written during the session that edits that file is born stale**; anchor on
  declarations, not body lines.
  **E13 grew the docblock G4 was filed about, 30 → 37 lines, and re-introduced G4's named
  anti-pattern** by describing E16 inside it. Trimmed to 24 — below where it started. Named the
  general case: an item that adds a caller to a documented helper grows that helper's docblock, and
  no estimate on this board budgets for it (39 of E13's 45 src lines were comment).
  **Two cheap questions closed by looking.** E16's tag half is settled OUT of scope — grepping every
  `next: { tags: [...] }` shows `collections-location-${slug}` is the only slug-keyed tag, so a tag
  rename cannot strand one. And a new finding fell out: the rename path revalidates **nothing**, not
  even flat `content-tags`, so E16 gains a near-free slice 1 that helps all three entity types.
  C7's premise re-verified against backend `32f0451` (moved from `4abb28e` mid-session) — still no
  `/email` route, and its refs did not drift across the backend's advance. C9's premise re-verified
  against E15's new signature: unchanged.
  **B9 is at 0 failures in 16 full-suite runs** (3 more today). Recommend closing it as
  unreproducible rather than carrying it a fourth time.
  **Fixed the log itself:** the E13 entry and the G4/E4 entry were both numbered `(4)`; the E13 and
  E15 entries are now `(5)` and `(6)`. The apparent date disorder further down is NOT a defect — the
  header already explains it (local dates, ordering verified against merge timestamps), so it was
  left alone. Note for future entries: the `(N)` labels do not track position, since `(3)` sits
  below `(2)`. They disambiguate same-day entries, nothing more.
  Next: **E16**, slice 1 first.

- 2026-08-24 (8) — **shipped E16 in two slices, #316 and #317, both merged; F5 (#318) is open.**
  E16 slice 1 put one unconditional `revalidateMetadataCache()` on `MetadataList`'s rename AND
  delete paths (+9 src / +72 test); slice 2 added `onRenamed`/`onDeleted` callbacks wired by
  `MetadataPageClient` to fix the old-slug 404 (+31 src / +209 test). The generic shape survived:
  the `entityType` branch was reported instead of built, and the report found a **stronger reason
  than the guardrail's own** — a string prop cannot narrow `T`, so the branch needs a double cast
  while a callback keeps the generic binding. Slice 2 then proved it by type-checking with no cast.
  F5 cleared all three of its bullets plus a fourth found while testing: the location link's
  `stopPropagation` was dead because `.metadataOverlay` already stops every click inside it.
  **That one is a process lesson, not a code one — the first test written for the guard PASSED with
  the guard deleted.** Red-checking is what exposed it. A guard test that was never watched failing
  is not known to test anything.
  **Estimate rule from (7) narrowed the same day, by its own next item.** E16 came in 2.3x over on
  tests and I generalized that to the whole board; F5 then came in UNDER (+20 net against +60–120).
  The corrected rule: the overrun tracks items that ADD a caller or prop, not items that DELETE
  one. Both halves are now recorded, because the wrong generalization is the more useful artifact.
  **Reconcile pass: 3 drifted refs, all inside the neighborhood of what merged** — the third
  principle held exactly. `MetadataList.handleUpdate` moved 53 → 74 (two refs) and `handleDelete`
  74 → 97, the last being the nastiest kind: `:74` still resolved to real code, just to the wrong
  function. **Also corrected a row I had written myself this session** — F5 was marked ✅ while
  #318 is still open.
  **Two items settled by looking rather than by deciding.** B9 is **CLOSED not-reproducible** (not
  fixed, nothing changed): it asked for a repro under different conditions, so the suite was run
  across `--maxWorkers=100%`, `=2` and `=1`, 6 runs, all green — serial being the telling one,
  since a cross-worker fixture leak cannot hide without workers. CI remains untried and is named in
  the item as where to restart. And **H1 was unblocked** — its row still said "do C8 first" after
  C8 had merged, so it had been reading as unavailable for nothing.
  Next: **E8**, with the `pageType` union quarantined — "decides nothing" is the same shape of
  claim E10 got wrong about `width: 600` / `height: 1100`, which moved 15 tests when perturbed.

- 2026-08-24 (9) — **merged F5 (#318) and shipped E8 (#319); filed E17; F2 is next.** E8 came in at
  −49 src / +90 test against −120 / +150–250. **The src estimate missed for the first time in four
  items**, and both causes were stale bullet premises rather than bad estimating: it budgeted for
  extracting `ReorderOverlay` into a file that already existed, and quoted the `MenuDropdown` config
  array at ~60 lines saved when an array entry per item costs most of that back (28 net). The bullet
  also undercounted the menu items (nine, not eight) and the shared `buildWrapperClassName` sites
  (three, not two). **The test half contradicts F5's rule and the reason is the useful part:** the
  +90 has nothing to do with E8 being a deletion — the reorder overlay's render gates had no
  coverage at all, so lifting a shared node out of two branches with differing gates was untested in
  both directions. **Third revision of the sizing rule, now in "how to use this doc": the test half
  tracks whether the touched behavior was already pinned, not the sign of the src diff.** Both new
  gate tests were red-checked (deleting the cover gate fails exactly 1; neutralizing the shared node
  fails exactly 4). **`pageType` quarantine paid off** — it is inert, but proving it took an
  E10-style perturbation (all six `'collectionsCollection'` callers → `'default'`, zero of 4374
  tests moved), and removing it is a 10-file sweep, not the two-liner the board implied. Promoted to
  **E17** with the evidence rather than left inside a shipped section. **Reconcile pass: 6 drifted
  claims + 1 board/section contradiction, all in the neighborhood of what merged** — third principle
  held again. B6's section was still `☐` while its own board row said ✅ and its file is deleted;
  F5's row and section both still said "#318 OPEN"; H3's `MenuDropdown.tsx:343` → `:373` (E8 moved
  it); `useCollectionEdit` 1,748 → 1,747. **Two inventory claims found unrepairable, not just
  stale** — F2's "twenty props copied ~10 times" is really 16 across 3 sites, and G2c's comment
  inventory has no recorded counting method, so it can only be re-derived. New rule hoisted: write
  the command beside any count that drives an estimate. Verified still-correct: `Component.tsx:284`,
  `MetadataList.tsx:74`. (`Component.tsx:284` has since moved to `:246` — F2 shipped the day after
  and cut 39 lines out of that file. Verifying a ref does not make it durable; it makes it correct
  as of that commit. G2c's counting method was NOT unrecoverable after all — see G2c.) **H5 unblocked** — it waited on E8. **Separately: 8 row/section status
  contradictions found and fixed** (B8, C6, E12, E16, E4, G2, H2a, H3), every one a section marker
  that was never updated when its row was — all eight PRs confirmed merged via `gh` before flipping.
  The worst was **C6 reading `☐` while its row said ⛔ BACKEND-BLOCKED**, i.e. a blocked item
  advertising itself as available. **Trap worth its own line: the first two integrity checks I wrote
  silently passed.** Both extracted the row marker with a regex that missed, so section and row both
  compared as empty-equals-empty and the sweep reported a clean board. It only surfaced because a
  hand spot-check of six items disagreed with the sweep. **A verification that can pass by matching
  nothing is worse than no verification** — the same failure shape as a test that passes because the
  fixture left the field `undefined`. Assert the check found something before trusting that it found
  nothing. Next: **F2**, with `EditModeLayer` quarantined out of the context migration.

- 2026-08-24 (10) — **shipped F2 (#321) and E17 (#322); filed F6; F3's `ReorderMove` bullet is
  next.** F2: −47 src / +142 test against −100 / +150–250. E17: **+3 src (−2 code, +5 comment) /
  +9 test against −15 src.** **Both src estimates missed, and E17's names a failure mode the board
  has not had before: a line count cannot see a narrowed type.** Swapping a four-value union for a
  boolean is a SAME-LINE edit at every declaration and every call site — `<PageShell
pageType="collectionsCollection">` is one line before and one line after — so the only deletions
  available were the three from removing the prop outright. **Apply it forward to F3**, which is
  nine bullets of moves and renames and is currently sized "~neutral": moving a file or renaming a
  directory is a net-zero line count by construction, so F3 will score ~0 no matter how much value
  it delivers. Its worth is the `ReorderMove` edge it unblocks, not its diff. E8's test-half rule
  held on both: F2's +142 landed just under its band because the prop threading was genuinely
  unpinned, and E17's +9 was near zero because `MenuDropdown.test.tsx` already had both
  Update-gating cases. **No fourth revision needed.**
  **Reconcile pass, scoped to the merge neighborhood — three corrections and one recovery.** H3's
  `MenuDropdown.tsx:373`/`:369` → `:374`/`:368` (E17 added a docblock line; and `:369` was already
  wrong by two when written, since the file has two `<Disclosure>` and the doc pointed at the
  first). `Component.tsx:284` → `:246`, which retires a claim entry (9) had made 24 hours earlier —
  **"verified still-correct" is a statement about a commit, not a durable property**, and F2 cut 39
  lines out of that file the next day. **G2c's counting method was RECOVERED, not lost:** #320
  declared the inventory unrepairable for want of a recorded method; reproducing candidate methods
  found that "runs of consecutive `//`-only lines" matches 6 of 11 files exactly, which identifies
  it. Five counts corrected, the `awk` recorded beside them, and a calibration worth keeping — the
  two files F2/E17 just rewrote are both still exact, so this inventory drifts on comment edits, not
  code edits, and does NOT need re-checking after every merge. Also caught one of my own before it
  landed: I wrote F3's `ReorderMove` importer list from memory, then grepped — it was wrong in both
  directions (`CollectionContentRenderer.tsx` does not import it; `useContentReordering.ts` does).
  Four files, zero test files. **F6 filed with a row and a section**, because F2's `EditModeLayer`
  report was prose inside a shipped section and would have been invisible to anyone reading the
  board. It is BLOCKED on F3's `ReorderMove` bullet — an ordering, not a decision. **G3 re-verified
  and stays a user decision:** both its facts still hold (still 65 lines, still no reader of a
  `collection` search param, still nothing linking to it), so there is no fact left to check and the
  delete-or-rebuild call is genuinely the user's. **F2 was NOT verified in a browser** — the Spring
  backend was down, so every grid page died in its error boundary; Group F's ":3000 verify" is
  outstanding on F2 and should ride the next session that has the stack up.

- 2026-08-24 (11) — **shipped F3's `ReorderMove` bullet (#324) and verified the other eight; F6 is
  unblocked and next.** The move itself was the smallest item this board has shipped: four files,
  zero test files, +16/−9 src, and 245/4399 tests identical to the stashed `main` baseline. `~neutral`
  was the right sizing call, and the entire +7 net is the docblock explaining why the type now lives
  in `app/types/`. **The one real decision was NOT leaving a re-export in `collectionEditUtils.ts`**,
  which already re-exports `toggleRelation` and so had a precedent for keeping the old path alive. A
  re-export would have left the dependency edge nominally intact — F6's whole blocker — while looking
  done. Repointing all four importers is what actually makes the edge one-way.

  **The eight-bullet audit is the more useful half, and it found a pattern worth naming: in every one
  of the four inaccurate bullets, the MOVE is still right and the JUSTIFICATION has rotted.**
  Bullet 3's rename is fine but "leaves `app/styles/` holding only `globals.css`" is false —
  `auth-card.module.scss` is shared by `/login` and `/invite/[token]` and stays. Bullet 7's two
  lowercase directories are real but there is a third, `ui/`, which must NOT be renamed because it is
  a namespace of 23 PascalCase folders, not a component. Bullet 9 says two `manageUtils` labels;
  there are three. Bullet 5's functions are exactly where claimed, but `auth.ts` is the wrong home —
  it would mix three fetch perimeters in one file, and a new `invites.ts` is the better destination.
  **So the failure mode is not "the board goes stale", it is "the one-line reason ages faster than
  the fact."** Checking the fact and skipping the reason would have passed all four of these.

  **Method note, since G2c asked for one.** The eight were verified by a subagent and then the four
  corrections were re-checked by hand before being written down — which caught the subagent quoting
  23 `ui/` subdirectories as 25, and caught me grepping the `manageUtils` line numbers against my own
  modified working tree instead of `main`. **Line numbers destined for the board must be read from
  `git show main:<path>`, not the working tree.** Both slips were cheap; both would have been
  uncheckable a week later.

  **Board correction: the test baseline is 245 / 4399, not the 245 / 4398 F2's close-out recorded.**
  The extra test came from #322 or #323. Verified by stashing #324 and re-running. Quote 4399.

  **Second sighting of the `.next-verify` `tsc` error** (stale generated type for the deleted
  `app/(admin)/admin/layoutpreview/page.tsx`). It is gitignored build-artifact rot, it is not ours,
  and it is now expected noise — stop re-investigating it.

- 2026-08-24 (12) — **shipped F6 (#325). The src estimate missed in the WRONG DIRECTION for the
  first time on this board: −20 predicted, +53 actual.** Not a magnitude error — a sign error, and
  the cause is a lesson F2 wrote down one item earlier and F6 did not read. **Moving a declaration
  is not deleting it.** The twelve members came out of `SharedRendererProps` and went straight into
  a new `EditRendererProps` in the same file; `EditModeLayer` traded twelve JSX props for a
  twelve-line provider value plus a docblock, a wrapper and an import. F2's close-out says it
  plainly — "the win is 'declared once instead of three times', not 'deleted'" — and F6 is the same
  shape. **The rule now on the board: an item that MOVES a declaration is ≥ 0 src before docblocks;
  only removing a declaration's last caller goes negative.** The estimate also double-counted
  `ContentBlockWithFullScreen`'s −13, which #321 had already banked — that file changed by zero
  lines here.

  **The test half went +218 against +40–60, and E8's rule was applied correctly to the wrong count
  of bare surfaces.** The board named `Component`'s merge as unpinned and sized for it. It missed
  that `EditModeLayer`'s provider was equally bare — **verified by deleting the provider outright
  and watching all 245 suites / 4399 tests still pass.** Two bare surfaces, one of them sized. The
  new 24-test file is red-checked twice: provider deleted fails 14, a single member dropped fails
  exactly that member's test.

  **Three of F6's own premise measurements were wrong, all found before writing code.** The sole-
  caller count is 12, not 13 (the filing's own table reads "8 reorder + 4 cover/select = 13"). There
  are 6 call sites, not 7 — `CollectionRailContext` mentions the component with no JSX call site.
  And **`onImageLoadError` has zero callers anywhere**, which is why the shared set landed at 4
  rather than the advertised 3; reaching 3 means deleting dead plumbing, not moving a prop. **A
  measurement trap worth keeping: `grep 'prop={'` misses JSX boolean shorthand**, and four of the
  six call sites pass `enableFullScreenView` that way — they read as passing nothing.

  **Unpredicted by the filing: `Component` is a CONSUMER of one of the twelve, not just a
  forwarder.** `currentCollectionId` drives `isPublicView`, which decides whether a failed image
  reflows away or stays for an admin to delete. The consumer/provider overlap the filing called a
  hazard is real.

  **Browser verification did not run, second session running** — backend down, `ECONNREFUSED` on
  `meServer()`. The ":3000 verify" is outstanding on **F2 and F6 together**; they share a chain, so
  one session with the stack up clears both.

- 2026-08-25 — **close-out. F6 was NOT on `main` and the board said it was.** #325 merged into its
  stale stacked base `0324-…` 13 minutes after #324 took that base to `main`, so F6 landed on a dead
  branch while `gh pr view` reported `MERGED`. Caught by `git merge-base --is-ancestor 9953f19 main`;
  the tell was that `main`'s `SharedRendererProps` still had all sixteen members. Re-opened as
  **#326** against `main`. **This is the SECOND time — E15/#314 did the same thing on 2026-08-24 —
  and the repeat is the finding.** The rule was already written here, in detail, with the precedent
  and the fix. It did not prevent anything because **every clause of it is addressed to the session
  that MERGES, not the one that OPENS**, so an authoring session files it as someone else's
  checklist. The rule now has a preventive half aimed at the author: **do not open a PR on this board
  against anything but `main`.** Generalizes past this board — a trap rule has to name the actor who
  can prevent it, not only the one who can detect it.

  **Step 3 paid out twice, and both payouts were cross-repo.** Checking the two backend-dependent
  items against the backend's `origin/main` rather than trusting the board changed both.
  **C6 was BLOCKED and is actually COLD** — backend #209 shipped `isPasswordProtected` on
  `ContentModels.Collection` (`:250`, plus both `with*` copies), which is the exact field C6 said to
  wait for, and the backend's board even recorded it as "unblocked the frontend's C6". It has been
  available for days while reading as blocked. **C7 is still blocked but no longer on a decision** —
  the route genuinely does not exist, but the backend settled build-vs-hide on 2026-08-24 (the
  frontend's `ShareEmailResult` is field-for-field `EmailService.SendResult`, which already exists)
  and it is their next item. **Rule earned: a BACKEND-BLOCKED item can never be cleared by this
  board's drift sweep, because the sweep scopes to files THIS repo's merges touched. Re-check them
  deliberately, and read the sibling repo's session log — it records decisions its code does not yet
  show.**

  **Six drifted refs corrected, all in the neighborhood of what shipped, as the third principle
  predicts** — and the most valuable one was invisible for an instructive reason. **F1's section
  boundaries were verified 2026-08-22 and #313 edited the file on 2026-08-24**, inserting at `:68`
  and `:748`, so every boundary is +1 or +5. What hid it: **F1's stated line count (1,747) is
  correct**, because the count was refreshed after #313 and the refs were not. A right-looking
  inventory number next to stale refs reads as a verified item. Also fixed: F3 b9's logger labels
  (`:224/:278/:304` → `:225/:279/:305`), `collectionEditUtils.ts:28` → `:30`, F2's
  `Component.tsx:246` → `:254`, F6's `EditModeLayer.tsx:250` → `:279`, and **one fully dead ref** —
  the B8 coverage bullet still points at `manageUtils.test.ts:1859`, a file B1/#290 deleted, in a
  sentence that says to wait for B1.

  **Filed F7** (delete `onImageLoadError`, the dead prop F6 found with zero callers) with a row and a
  section. Next: **C6**, because step 3 just specified it and it has been silently available.

- 2026-08-25 (2) — **shipped C6 (#327). Its premise was false, and the board had quoted the backend
  one sentence too short.** C6 justified the cover strip as "defense-in-depth against a stale cache
  re-exposing a cover the backend already strips". **The backend has never stripped.**
  `ContentModels.java:231-234` says `isPasswordProtected` is "a render hint, not a gate ...
  `coverImage` is deliberately still populated alongside it", the three BE-H5 tests are named
  `retainsCoverImage`, and backend #209's commit message says the old test banner "sent the frontend
  down a wrong branch". The previous session's close-out quoted the "render hint, not a gate" half
  and stopped exactly before the clause that falsifies the item. **New rule: when an item's
  rationale asserts what the OTHER repo does, quote that repo in full — including the sentence after
  the one that supports you.** Distinct from C6's own "grep the type" rule, which asks whether the
  data exists rather than what it means.

  **Shipped anyway, as a deliberate divergence rather than a fix.** The strip is a frontend product
  choice, and both docblocks now say so instead of citing a backend behaviour that does not exist.
  The backend shipped the field so the frontend could draw a LOCKED TILE with the cover visible;
  that UI is still unbuilt and is the open half of C6, recorded in the archive as a product question
  with no MR row.

  **The "two-line change" was not two lines, for a reason the board could not have seen from the
  item.** `convertCollectionContentToParallax` is reached only through `processContentBlocks`, and
  two of that function's five callers are admin manage surfaces. An unconditional strip would have
  silently hidden protected child covers in edit mode. Threading an explicit `showProtectedCovers`
  parameter — deliberately NOT inferred from `filterVisible`, though the two agree at every call
  site today — is what took it from ±2 to +60 −16 src. **Before believing an item's size, check
  whether the function it names is exported or funnel-fed; a funnel means the parameter has to
  travel and every caller has to be classified.**

  **Unification analysed and DECLINED**, per the guardrail. 8 of 17 `buildParallaxCard` options
  differ, and `CollectionModel.tags` (`string[]`) vs `ContentCollectionModel.tags`
  (`ContentTagModel[]`) is a hard type conflict. Only the two-line strip predicate actually
  duplicates. A merge relocates the divergence into the call sites (+25 call-site lines to delete
  ~30 body lines). No follow-up MR filed. Full table in
  [group-c-bugs.md](group-c-bugs.md).

  Housekeeping: `0324-…` and `0325-…` deleted local and remote now that #326 landed F6 on `main`
  (`git merge-base --is-ancestor 9953f19 origin/main` confirmed before deleting, not the badge).
  #327 was opened against `main` directly, per the preventive half of the stacked-PR rule.
  Next: **F7**.

- 2026-08-25 (3) — **shipped F7 (#328). `SharedRendererProps` is three members; F6's 16 → 3 is
  complete.** Premise re-verified before writing code: zero callers across all six
  `ContentBlockWithFullScreen` call sites, and the live half (`Component`'s wrapper → `failedImageIds`
  → row reflow) correctly identified. `Component.reflowOnError.test.tsx` passes untouched.

  **A type-system trap the item could not see.** `RendererContextValue extends SharedRendererProps`,
  so deleting the member from the parent deleted it from the context type too — and `Component`
  assigns into exactly that type. The item's "`RendererContextValue` keeps `onImageLoadError`" reads
  as "leave it alone" but actually meant "re-declare it". **When an item says one interface keeps a
  member another loses, check whether the first inherits it from the second.**

  **Estimate missed direction on BOTH halves — third item running with the same bias.** Est −15 src
  / −20 test; actual **−3 src / +8 test**. Code lines are negative; the additions are docblocks
  explaining why a deleted thing was deleted and why its namesake survived. **A deletion that needs
  explaining is not a net subtraction.** F2 and F6 wrote the moves version of this; it applies to
  real deletions too. Counter-check when sizing: will the next reader need to be told why the code
  is shaped this way? If yes, budget the comment.

  **Vacuity check on a reworked assertion, which the board's rule does not currently cover.** The
  threading test asserted the leaf's handler `not.toBe` a caller's raw handler; with the caller-facing
  prop deleted that passes trivially. Rewritten to pin that the leaf receives a function though the
  grid is rendered without one, then confirmed red by removing `Component`'s provision. **The
  prove-it-fails rule is usually applied to NEW tests. It applies at least as much to a test whose
  assertion changed shape** — that is precisely when an assertion goes tautological unnoticed.

  Rename declined: with the caller-facing prop gone there is only one meaning left to hold, and a
  rename would have churned the one test this item said must not be edited.

- 2026-08-25 (4) — **close-out. Shipped C6 (#327), F7 (#328) and the C6 board repair (#329).
  UNBLOCKED C7 — the backend route shipped and nobody had told this board.** Verified against
  backend `origin/main` at `1b4960e`: `UserShareControllerProd` declares `@PostMapping("/email")` at
  `:115`, landed in their PR #213. **The BACKEND-BLOCKED re-check cadence C6 added one entry ago is
  what caught it, on its first run** — that rule has now paid for itself twice in two sessions.

  **C7 collapsed to zero source lines, and the route there included one wrong turn worth keeping.**
  The contract matches field-for-field, `handleEmail` already branches on `result.sent`, and #295
  already tested the api layer. I then filed the backend's new **409** as unhandled, because
  `handleEmail`'s fallback string reads that way — and it is wrong. `run` hands the error to
  `mapError`, which has returned dedicated 409 copy all along. **Caught before it reached the board
  as work, by one grep.** Estimate went ±40 src / +30 test → **0 src / ~+30 test**, and the test is
  for coverage that was always absent: `mapError`'s 401/403/409 branches have no test at all. Rule
  hoisted: a fallback string at a call site is not evidence the error is unhandled.

  **Two consecutive items got their cross-repo premise wrong in opposite directions.** C6 asserted
  backend behaviour that never existed; C7 asserted behaviour that existed but described half of it.
  Both were written from a paraphrase rather than from the sibling's source. Rule hoisted.

  **Drift sweep, scoped to the merge neighborhood — one ref moved, one held.**
  `Component.tsx`'s `priority={rowIndex <= priorityRowIndex}` was `:254`, now **`:248`** (F7 cut 6
  lines above it); corrected in place. `EditModeLayer`'s four `exhaustive-deps` suppressions still
  verify at `:135`/`:205`/`:212`/`:219`. The third principle held: the only drift was inside what
  merged.

  **The user rejected historical narration in docblocks mid-session**, which turned out to be an
  open board item — G4, raised by the same user a day earlier. #327 and #328 had shipped fresh
  violations of a standard they had just read. G4 now carries the finding, a ban on board labels in
  code comments, and the note that a refactor's own MR is where this rot enters. Next: **C7**.

- 2026-08-25 (5) — **closed C7. Zero source lines, as forecast: two tests, and two corrections to
  the board's own C7 entry.** Added the missing `mapError` branch tests — `ApiError(409)` through
  `handleEmail`, `ApiError(403)` through `toggleCollection` — and verified them the way the item
  asked, by stubbing `mapError` to `return fallback` and watching exactly three tests fail while the
  other eight held.

  **That stub run is what exposed the first correction: "`mapError`'s status branches have ZERO test
  coverage" was wrong about 401.** A 401 test had been there all along; it was one of the three that
  failed. The earlier pass grepped for the copy strings as `mapError` writes them, but the test
  asserts on the fragment `/session has expired/i`, so the grep found nothing and "nothing matches"
  became "nothing covers it". **A grep for a full copy string cannot find a test that asserts on
  part of it** — that is the same shape as this section's own 409 lesson, where reading one hop too
  few produced a confident wrong finding. Two sessions running, the mistake is trusting a search
  whose negative result was never checked against the thing it claimed to disprove.

  **Second correction: the guardrail's premise. `handleCopy` is not a `run(...)`** — it is a
  clipboard try/catch that sets `setError` directly and never reaches `mapError`. The three `run(...)`
  callers are `handleReset`, `handleEmail` and `toggleCollection`. **Unification reported and
  DECLINED on its merits**, not just on the guardrail: `run` + `mapError` already _is_ the shared
  reducer, the only unshared thing is one fallback string per call site, and replacing those with
  keys saves nothing while making a swapped key type-check. The guardrail was right; its reasoning
  needed repair.

  **The live click was not run, deliberately.** There is no local database — port 5432 is an SSH
  tunnel to the production EC2 box and `~/portfolio-db/` does not exist — so running the backend
  locally would write to production. It would also have proved nothing: `EMAIL_ENABLED` is unset, so
  compose's `false` wins and the click only exercises the `sent:false` path, which is already
  covered. Recorded as open in C7 rather than quietly dropped.

- 2026-08-25 (6) — **started E2 and shipped bullet 1: `throwFromResponse` now lives once in
  `core.ts`.** The four copies in `auth.ts`, `personal.ts`, `share.ts` and `selects.ts` were
  confirmed byte-identical first — brace-matched extraction and diff, not eyeballing — so the fold
  is mechanical and `tests/lib/api` passed unchanged at 290.

  **The bullet's own wording was wrong about two of the six, and that is the finding.** "Exists six
  times ... keep one copy" counts the inline handlers in `collections.ts` and `users.ts` as copies.
  They are not: `validateClientGalleryAccess` overrides the backend's message on 404 with
  `'Gallery not found'`, and `acceptInvite` falls back to `API error: <status>` where the shared
  helper stringifies the whole body. **Neither divergence was pinned** — the 404 test asserted
  status only, and every `acceptInvite` test supplied a `{ message }` object, so the divergent
  branch was never reached. Folding either would have changed user-facing copy with a green suite.
  That is E3's unguarded-rewrite hazard again, one item later, wearing a different disguise: there
  the danger was jest's automocker aliasing two names, here it is a dedup bullet that counted
  look-alikes as duplicates.

  **Both are now characterized, and the guards were verified by mutation** — rewriting each handler
  to match `core.ts` fails exactly those two tests and nothing else. The shared helper also had no
  direct tests anywhere despite four callers; `core.test.ts` now pins its contract, with the
  stringify case written as the explicit counterpart to `users.ts`'s fallback so the two read as a
  difference rather than drift. **Whether to unify the last two is a behaviour call with an owner
  attached, not a cleanup**, and it is left open rather than taken on the board's say-so.

  **Generalizing, because this is the third premise repair in three sessions** (C6's backend claim,
  C7's "zero coverage", now E2's "six times"): every one was a counting or search claim nobody
  re-ran. The cheap defence is already proven — diff the things you are about to call identical,
  and mutate the code to confirm the test that supposedly guards it actually fails. Next: E2's
  remaining three bullets, `clientFetch` first.

- 2026-08-25 (7) — **E2 bullet 2: `clientFetch` / `clientFetchJson` land in `core.ts`; 17 call
  sites collapse from a nine-line block each to one or two lines. Net −57 src.** The "~60 lines"
  estimate was right — the first estimate on this board that has been, and worth saying because
  every other one has been wrong in the same direction.

  **The count was wrong again, though, and in the now-familiar way: "~14 functions" is really 22**
  (excluding `core.ts`'s own three skeletons, which are the next bullet). **Five were deliberately
  left raw, and they turned out to share one shape** — a non-OK status that is _data_, not an error.
  `me()` and `meServer()` return `null` on 401; `getInvitePreview` maps 410 and every other failure
  to a status object; the two divergent handlers from bullet 1 own their error copy. Sending any of
  them through a helper that throws would mean catching an exception to recover a value the response
  already handed us. That exception list is written into `clientFetch`'s docblock rather than left
  to be rediscovered — the omission is the kind of thing a later reader "tidies up".

  **The new guard was mutation-checked, and this one matters more than the count.** Deleting
  `credentials: 'same-origin'` and `cache: 'no-store'` from `clientFetch` fails exactly one test —
  the one written for it — and **none of the other 4,444**. A dropped `credentials` does not break a
  suite; it logs the user out in a browser, and a dropped `cache` serves them a stale answer. The
  whole reason this collapse is safe is that the defaults are now asserted in one place instead of
  being retyped correctly 17 times.

  Next: E2's remaining two bullets — fold `fetchAdminGetApi` into `fetchBase`, then the
  `Content-Type`-on-GET / double-`throwApiError` / identity-map cleanup.

- 2026-08-26 — **shipped C7 (#331). E2 bullets 1–2 written, orphaned as #332, recovered as #333.
  Re-stamped every open item COLD/BLOCKED. Next: E2 bullets 3–4, as one MR.**

  **The orphaning is the entry's real content, because this board had already written the rule that
  prevents it — twice.** #332 was opened with `--base 0331-…`; #331 merged to `main` first, so #332
  merged into the retired base and `main` never saw `clientFetch` or the `throwFromResponse` dedup.
  Third occurrence after E15/#314 and F6/#325. **The preventive clause added after the second one
  was already in "How to use this doc", and the authoring session never opened that section** — it
  navigated by the board to C7 and E2 and worked from there. So the rule's content was fine and its
  placement was not: a preamble is read by sessions that do not need it and skipped by the one that
  does. Rewritten as a mechanical constraint — `gh pr create --base main`, and a `--base` that is
  not `main` is itself the bug. Caught here only because reconciliation checks `main` rather than
  the badge; `gh pr view` reported `MERGED` for all of #327–#332.

  **Bullets 3–4 verified, and every claim in them is true** — three skeletons, `fetchAdminGetApi`
  really is `fetchReadApi` with a different channel constant, `ENDPOINT_TYPE_TO_CHANNEL` really is
  an identity map, the GET `Content-Type` is real. Worth recording after three consecutive false
  premises, so the lesson does not calcify into "assume the board lies". **But they are entangled
  and the board presents them as independent:** `fetchBase` does not set the default
  `Content-Type`, so the fold in 3 drops it as a side effect, and four assertions in `core.test.ts`
  pin that header. Merged into one MR with the header question to be decided first.

  **Six of eleven open items are blocked on the user, and none on work.** That is the board's
  bottleneck, not any refactor — one sitting on H1, C9, F4, G3, E3's guards and E9's `.srOnly`
  unblocks more than the next three items combined. Put to the user as a batch rather than one at a
  time.

- 2026-08-26 (2) — **closed E2 with bullets 3–4 (#334). Three fetch skeletons in `core.ts` are one;
  the GET `Content-Type` is gone; the identity map is gone. −58 src, +6 tests.**

  **The entanglement the previous session mapped was real and the one-MR call was right.** The fold
  drops the header as a side effect, so shipping bullet 3 alone would have meant editing three test
  assertions for a reason its own description did not contain.

  **The header decision was made first, from three checks, not from taste.** All 32 call sites are
  bodyless GETs; the file's write wrappers already set `Content-Type` only where there is a body;
  and the BFF proxy reads `content-type` only to size-cap writes. Full reasoning in the item.

  **The board said four assertions pinned the header; three did.** The fourth (`core.test.ts:533`)
  is a POST whose header comes from its wrapper, not the skeleton. Same species of error as C7's and
  E2's earlier miscounts — a number read off a grep rather than off the code path — and the fifth
  time on this board. **The pattern is now specific enough to state as a rule: any count in a bullet
  is a hypothesis until the code path is walked.** Cheap to check, and checking it has changed the
  work every time.

  **The three assertions were rewritten as absence assertions rather than deleted**, and
  `fetchReadApi` — 16 callers, zero direct tests in `core.test.ts` — got four of its own. Both new
  guards were mutation-checked: re-adding the header fails exactly seven tests, re-pointing the read
  channel fails exactly four.

  **The wrappers were kept and the deletion cost written down, as the guardrail required.** 32 call
  sites across 16 source files — but also 12 test files that mock them by name, which the earlier
  estimate missed. Deleting them would trade named-function assertions for channel-string ones and
  export `fetchBase`, letting a wrong constant route an admin read through the public channel.
  Recommendation recorded: keep both permanently.

  Next: E6 or E7, both COLD.

- 2026-08-27 — **E2 CLOSED (#334 merged). Reconciliation pass: B8 was 8 of 9, not 5 of 6 — three
  bullets had shipped unticked. 17 drifted refs corrected across four items. Next: F3's `getUserPage`
  bullet.**

  **The board's biggest error this round was not a drifted line, it was three finished slices reading
  as available.** B8's `share.ts`, `messages.ts` and `collectionStorage.ts` bullets all shipped in
  #295/#296 on 2026-08-24 and were never ticked — while B8's own heading already named both PRs.
  `share.ts` was a credible "next" pick until `ls tests/lib/api/share.test.ts` returned a 520-line
  suite whose docblock opens "B8 coverage gap". The existing rule about unswept checkboxes is aimed
  at the merging session; this is its fourth occurrence, so the preventive half is now written into
  "How to use this doc": **verify boxes against the filesystem, not against the heading.**

  **Drift was exactly where the third principle says it is — in the neighborhood of what shipped.**
  Every corrected ref traces to E2's own `clientFetch` conversion (#333) shortening `personal.ts`,
  `share.ts`, `auth.ts` and `selects.ts`, or to E3 (#306) cutting `collectionStorage.ts`. Corrected:
  five refs in F3's `getUserPage` bullet, six in its invite bullet, four inventory counts
  (`share.ts` 217→161, `collectionStorage.ts` 286→274, `user.ts` 20→19, `useContentReordering`
  198→197), one in G2c's ride-along list (`core.ts` 7→5 comment blocks — my own rewrite caused that
  one), and one in H1's data-source map. `users.ts` did not drift at all, and `core.ts:91` survived
  two rewrites of its own file.

  **The state table claimed to cover every open item and was missing six** (A9, B8, E5, E10, F3, G4).
  B8 and F3 are stamped COLD from this session's sweep; the other four are marked UNSTAMPED rather
  than guessed, because a wrong COLD is the specific failure that table exists to prevent.

  **Nothing was unblockable this round.** All seven BLOCKED items are blocked on genuine product or
  policy calls by the user, each with its question already written down — none on a checkable fact.

  Next: F3's `getUserPage` bullet, alone. Guardrail in the item.

- 2026-08-27 (2) — **shipped F3's `getUserPage` bullet (#336); costed and REJECTED the invite
  bullet without touching it. Guardrail honored. Baseline re-measured: 246 / 4451, not 4399.**

  **The estimate was exactly right for once, and the reason is worth keeping.** `2 src / 7 test`
  was written during the 2026-08-27 ref sweep, hours before the work. Every other F3 bullet sized
  before its neighbours shipped has drifted. Sizing is accurate when it is done in the same session
  as the doing, and stale otherwise — which argues for sizing the bullet you are about to pick, not
  the eight you are not.

  **What the diff does not show.** Net is +12 src, and all of it is the docblock explaining why
  `getUserPage` lives beside saves and follows plus the `users.ts`-vs-`personal.ts` note that
  replaces the naming trap the old filename created. The actual change is that six test files each
  used to mock `@/app/lib/api/user` AND `@/app/lib/api/personal` separately; they now mock one
  module. Twelve declarations became six. **A line count cannot see that, same as #324.**

  **The invite bullet was costed rather than done, per the guardrail, and costing it changed the
  answer.** Not "invites.ts is fine, just do it" — the measurement turned up two things the bullet
  did not know. `invites.ts` holds the same three perimeters `auth.ts` was rejected for, so it
  relocates the mix rather than reducing it. And `createUser:42` + `upgradeUser:109` both issue
  invite URLs and both stay in `users.ts`, so the split leaves the file named `invites.ts` not being
  where most invites come from. **The recommended shape is a 2-function split (redemption:
  `getInvitePreview` + `acceptInvite`), not the bullet's 3.** Full numbers in the item.

  **Two board rules earned this session.** (1) The recorded test baseline aged out inside three
  merges for the second consecutive time — **re-measure the baseline, never quote it**; 4399 was
  right on 08-24 and is wrong now. (2) Four remaining bullets budget for "update the refs"; the two
  checked here (`share.ts:7,81`, `core.ts:157`) are bare `{@link}` names with no module path and
  needed **no edit at all**. Check whether a ref names a module before budgeting for it.

  **A tripwire left in place deliberately.** `tests/lib/components/CollectionPageWrapper.test.tsx`
  mocks `personal` but never mocked `user`, so its factory now silently covers `getUserPage` too. It
  passes only because that file has no `home`-slug test and `getUserPage()` runs solely under
  `slug === HOME_SLUG && me`. Adding one will fail until `getUserPage: jest.fn()` joins the factory.
  Recorded rather than pre-fixed — an unused mock member is its own small lie.

- 2026-08-28 — **shipped E7 as a handoff guard (#337), rejected its hook. Swept all four UNSTAMPED
  items: E5 CLOSED, E10 down to one bullet, A9 down to one, G4 re-shaped. Next: E6.**

  **The four UNSTAMPED items were the whole story, and every one of them was wrong.** E5 was
  COMPLETE — all four "open" bullets shipped in `699441b`, inside PR #299, the very PR its row
  credited. E10 was 5-of-7 shipped in #304 plus one bullet that was never a task (a recorded
  rejection carrying an open checkbox, which is what made the item look unfinished). A9 was 2-of-3
  done, including the `layoutpreview` delete **this board re-filed for five sessions after the user
  had already done it.** G4's count reproduced (49 vs ~48, method recoverable) but ~23 are false
  positives and ~17 board-label blocks were never counted at all.

  **That is the fifth shipped-but-unticked occurrence and the pattern is now unmistakable: the board
  is least accurate about the items it has most recently shipped against.** Two rows named the exact
  PR that finished their open bullets. Hoisted the one-command fix — `git show --stat <sha>` the
  credited PR against the bullet list before trusting a checkbox.

  **Holding the stamp back in August was right.** Those four were marked UNSTAMPED rather than
  guessed COLD; had they been guessed, four sessions would have opened them expecting finished work.
  The state is only useful if someone later sweeps it, which is what this run did.

  **E7 shipped, but not what the item asked for.** The waste was real — the parent recomputed
  `contentBlocks` on every filter change after the edit layer took the grid — but the fix is a
  four-line guard, not the shared hook. The hook is rejected with measurement: 9–11 parameters, four
  of them pure behavior switches, because the two "identical" pipelines consume different
  `allContent` and pass opposite arguments. **Second rejection-by-measurement in two days** (F3's
  `invites.ts` was the first), so the test behind both is now a rule: write the shared signature
  first, and if a third of its parameters only switch behavior between callers, the callers are not
  duplicates.

  **Drift sweep found 3 refs, all in the neighborhood of what merged** — H1's three
  `userSpaceData.ts` refs, each off by exactly +3 because #336 turned one import line into five. The
  cheap scoped check is still holding; no drift escaped it.

  **Baseline moved three times in two days** (245/4399 → 246/4451 → 246/4454 → **245/4454**) and
  every reading was correct when taken. Two were measured on a branch whose base had since changed.
  Hoisted: never quote a baseline, re-measure it.

  **A9's remaining bullet is a false instruction, not dead config.** `CLAUDE.md:22` says "`npm` and
  `npx` are not on PATH"; `npm --version` prints 11.8.0 and all three resolve under
  `/opt/homebrew/bin`. Every command this session ran the long way because of it. **A false
  instruction that still produces working commands is invisible indefinitely** — which is why it
  survived three confirmations without anyone editing the line.

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
