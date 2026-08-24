# Session log — 2026 Summer Refactor

_Archive of shipped work from the [2026 Summer Refactor board](../2026-summer-refactor.md). Nothing here is open work. Sections are verbatim as they were when the item merged._

One line per `/next` run, oldest first. The newest entry stays on the live board; everything older lives here. Three consecutive entries ending in the same `Next:` means that item is being avoided, not scheduled.

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
  control (from D3), and an item that specifies the *mechanism* of a fix can specify a broken one
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
  than changed. That report found something D9 had wrong: the literals are a strict *subset* of
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
  The rule generalizes: verify a board item's *claims*, not just its refs, before acting on them.
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
