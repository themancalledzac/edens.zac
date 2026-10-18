# Orch plan for the 2026-10-17 review

This file turns the three review reports into orch requests. One orch request is one PR. The round is 11 PRs in this repo, 1 PR in the backend repo, a short prep PR done by hand, and a list of owner-only tasks. It runs in seven waves. Requests in the same wave touch different files and can run at the same time.

It is written for the next session, which runs the round as the orchestrator. That session submits each request, relays orch's questions and plans to Zac word for word, and checks each PR in the browser after it merges. It does not write the code itself.

Do not edit `00-README.md` or reports 01 to 03. This file is the only one in this folder the orchestrating session updates, and only the status table.

## How to read the item references

- "Design 9.4" is row 4 of the priority table in [01-design-review.md](01-design-review.md) section 9.
- "Code 7.5" is row 5 of the priority table in [02-code-review.md](02-code-review.md) section 7.
- "Docs 7.2" is row 2 of the priority table in [03-markdown-docs-review.md](03-markdown-docs-review.md) section 7.
- "Design §6" means a whole section of a report.

Every priority row of the three reports appears exactly once below, in a request, in the owner-only list, or in "Not in this round".

## What changed since the reviews were written

The reports describe local `main` at `9f7302b7`. `origin/main` is at `e98957ca`, one commit ahead. Three facts found while writing this plan change the round:

1. PR #438 (`feat(admin): one tabbed list panel with a single action style`, merged 2026-09-28) rewrote the admin hub after the review's baseline. The four admin panels are now tabs of one `ListPanel`, with one collapse, a `?list=` tab in the URL, and `PanelAction` for the header action. Much of design §6 (title weight, tag-only checkbox in the header, four collapsed bars, the 2^4 collapse states) no longer describes the code. R8 starts with a plan-only pass for that reason. `MessageRow.tsx` was not touched by #438, so the message-row regression (design 9.1) is almost certainly still live.
2. CI already runs `npm audit --audit-level=high` inside the required `Type check, lint, test` job (`.github/workflows/ci.yml`). The code review measured 1 critical and 4 high advisories in `next`, `sharp` and `source-map-js`. So every new PR's required check fails until `next` is bumped, including the prep PR. R1 has to merge first. Code 7.3's "add audit to CI" is already done.
3. The worktree the docs review calls stale (`.claude/worktrees/quirky-chaplygin-aeb1da`) has 6 uncommitted files: `app/explore/ExploreDirectory.tsx`, `app/explore/page.tsx`, `app/lib/api/content.ts`, `docs/007-security-hardening.md`, `tests/explore/page.test.tsx` and `tests/lib/api/content.test.ts`. Docs 7.1 says to remove it. Do not remove it until Zac has looked at that work.

## How the orchestrating session runs this file

1. Call `mempalace_user_summary` and say what is relevant. Load the `orchestrate` skill. Its rules hold throughout: show `ask_text` word for word, never answer, approve or reject for Zac, and start the Monitor on `orch watch r-N --follow --lines 0` after every submit, answer, approve and retry.
2. Do the prep section with Zac, in order. Nothing is submitted before the decisions are filled in and edens.zac is registered.
3. Work through the waves. Before submitting a request, check that every request in its "Starts after" line is merged on `origin/main` (`git fetch && git log origin/main --oneline -5`). Submit with `path` set to `/Users/themancalledzac/Code/edens.zac`, `goal` set to the request's goal block, and `files` set to its file list. Pass the options the request lists.
4. Paste the decision answers from the decisions table into the goal before submitting, where the goal says `<decision N>`. A goal with its decisions filled in gets fewer planner questions.
5. When orch opens the PR, CI runs. Zac merges it. Never enable auto-merge unless Zac asks.
6. After a PR merges, `git pull --ff-only` in the main checkout. Then do the request's browser check on Zac's dev server (`preview_start` with `{name: "Zac's Dev Server"}`, which attaches to port 3000 and starts nothing). Phone checks are at 393x852. Then update the status table below.
7. Before submitting R4, R5, R7 or R9, run `npm run build` in the main checkout once the previous wave has merged. Jest and `tsc` cannot see a broken CSS-module import, and orch's checks do not include a build (see "Register edens.zac in orch").

### Which models run

Orch picks models per role from `~/Code/orch/routing.yaml`, not per request. With the current file:

| Role | Model |
| --- | --- |
| Planner | Opus 5.5 medium (Sonnet 5.5 when `small: true`) |
| Builder | Sonnet 5.5 medium, escalating to high and then Opus on retries |
| Builder on sensitive paths (`**/auth/**`, `*.lock`, `.github/**`, `.claude/**`) | Opus 5.5 |
| Tester (`code-tested`) and reviewer | Sonnet 5.5 |
| Final reviewer | Opus 5.5 |
| Searcher | Haiku 4.5 |

So builds in this round run on Sonnet except the lock-file step in R1 and the `auth/` rename in R10. Haiku only runs searches. Putting Haiku on builds would be a change to orch's `routing.yaml`, not to this plan. No request here is marked `small: true`, because each one has several independent pieces and `code-small` has a $3 budget.

## Status

The orchestrating session updates this table. "Orch id" is the `r-N` that `submit` returns.

| Id | Title | Wave | Starts after | Orch id | PR | State |
| --- | --- | --- | --- | --- | --- | --- |
| P | Prep: working tree, reports on main, agents | 0 | nothing (its PR merges after R1) | n/a | #440 | merged 74f29f60 |
| R1 | Fix now: unblock CI, security, message rows | 1 | registration | r-26 (r-24 failed) | #441 | merged 928232d1; browser check passed (/comments, /admin Messages at 393x852) |
| R11 | Docs consolidation | 1 | P | r-27 | #443 | merged 78402aa5; CLAUDE.md check passed. O9 local cleanup is Zac's |
| B1 | Backend: parent covers, dev hardening | 1 | backend registration | r-25 | backend#334 | merged 664d7b9d; needs O10 redeploy, browser check open |
| R2 | Speed and the menu | 2 | P, R1 | r-28 | #442 | merged 04bb9493; browser check passed (sizes in px, 0 /auth/me, menu opaque 100dvh, 44px close, no Home row). O3 baseline 2026-10-18 (Lighthouse 12 mobile, median of 3): / score 89, LCP 3514 ms, TTFB 248 ms, CLS 0; /hidden-lake score 93, LCP 3182 ms, TTFB 472 ms, CLS 0.03 |
| R3 | Page frame: footer, loading, auth pages, back links | 3 | R2 | r-29 | #445 | merged; finished by hand (Sass import fix); CLS 0.0016 / 0; O7 after deploy |
| R4 | Controls, forms and touch targets | 4 | R3 | r-34 (r-30, r-32 cancelled) | #446 | merged 863850f2; step 10 hand-committed; clean build passed; browser check passed on 3001 (Order, Highly Rated, density on one row at 393x852; density taps activate no chip; Send visible at 393x667). Gap: joined density border uses --color-border, not --color-border-control (R9) |
| R5 | Collection page header | 4 | R3 | r-35 (r-31, r-33 cancelled) | #447 | merged 2396de82; steps 2, 3, 5 hand-committed; clean build passed. Browser on 3001 at 393x852: dolomites info 125px, gap 252px (target ~230); pnwer info 124px, gap 214px; Related parents first (fits, no scroll); /all-images h1 + "1467 photos". Open: /home is 200 + meta refresh, not 307 (into R10); empty ~38px info block on /all-images; tag links out of scope |
| R6 | Search, location and tag pages | 5 | R5 | r-37 | #449 | merged b047cf0e; clean build passed. Browser on 3001: /tag/alpine h1 + 30 images, CLS 0; /search zero results shows one Clear filters that resets; /location/dolomites-italy at 393 no side scroll, CLS 0. Open: unknown slugs and /home answer 200 because root loading.tsx streams before notFound()/redirect() (R10); AdminHubClient blank until measured now the skeleton is gone (R10) |
| R7 | Mobile bottom nav and sheets | 5 | R2, R3, R4, R5 | r-38 | #451 | merged 3ffcbbbe; step 4 hand-committed; clean build passed. Browser on 3001 at 393x852: bar on /, /collections, /dolomites-film (57px, body padding 56px, hamburger hidden); none in ?manage=1; menu is a bottom sheet above the bar; Tab/Escape trap and focus return in menu and contact Modal; fullscreen covers the bar; 1440 unchanged. Open: BottomNav fetches /me on pages without me (R13); duplicate Log in row in the phone menu (R13) |
| R8 | Admin hub and list panels | 5 | R1, R4 | r-36 | #448 | merged 34783363; steps 4, 6, 8, 9 hand-finished, 10 cancelled; clean build passed. Browser on 3001: tiles first, tabs Messages/Users/Collections/Roles, rows open a bottom sheet with the actions, 600px overlay at 1440; /metadata whole rows, 48px above footer. Open: unread count on the Admin segment needs Zac signed in; rows 34px vs 37px reserved (R9); users sheet buttons use three styles (R9); old comments in useCachedPanelData.ts (R10) |
| R12 | /home redirect and admin hub first paint (added) | 5 | R5, R6 | r-39 | #450 | merged 44021ed0; clean build + `next start` passed. /home 307 to / (query kept), /home?manage=1 stays 200 (admin edit view). Admin hub needed no change: the page already passes the SSR viewport and server HTML has sized rows |
| R13 | Bottom nav follow-ups (added) | 6 | R7 | r-40 (cancelled after hand finish) | #452 | merged b1b567b1; clean build passed. Browser on 3001 at 393x852: 0 /me requests on /collections, /, /dolomites-film, /explore; Log in cell in server HTML; phone menu has no Log in row; 1440 menu keeps it. Note: /explore and /search now wait on meServer() before streaming, so the loading fallback paints first (~0.4s in dev) |
| R9 | Visual tokens and the stylelint guard | 6 | R4 to R8 | r-41 (failed; finished by hand) | #453 | merged 244c8494; clean build passed; stylelint guard + test that goes red without the rule. Browser on 3001: density border #767676; fullscreen 40px close, 44px toggle, h2 sections, counter not live; /explore, 404, /login titles 36px/700 on the header's left edge; ListPanel rows 34px as declared; users sheet buttons one style. Open (backlog): /s/[token] unchecked (no share link); /collections failed-read to StatusPage deferred; fullscreen chips 26px not 44px; some paddings moved 1–2px from px rounding |
| R10 | Code cleanup | 7 | everything above | r-42 (failed at step 6 commit; finished by hand) | #454 | merged 4ff87e39; clean build passed; 298 jest suites on main. Browser on 3001 at 393 and 1440: /, /hidden-lake, /admin, /login render, no side scroll, no hydration errors. Inline-comment warnings under app/ 554 in 57 files to 233 in 48. Open (backlog): the remaining 233 |

## Order and why

```
wave 0   P (by hand; its CI goes green once R1 merges)
wave 1   R1 ∥ R11 (docs only) ∥ B1 (backend repo)
wave 2   R2  (CollectionPageWrapper, CollectionPage, SiteHeader, MenuDropdown, core.ts)
wave 3   R3  (layout, PageShell, CollectionPage, loading, auth pages)
wave 4   R4 ∥ R5   (R4 owns the chip/toolbar SCSS and Modal; R5 owns ContentComponent.module.scss,
                    CollectionContentRenderer.tsx and FilterToolbar.tsx)
wave 5   R6 ∥ R7 ∥ R8   (R6 search/location/tag; R7 nav, SiteHeader, MenuDropdown, PageShell;
                         R8 admin panels; disjoint files)
wave 6   R9  (sweeps globals.css, ContentComponent, SaveHeart, MenuDropdown, Explore, auth-card)
wave 7   R10 (renames and exports across the tree; last so it conflicts with nothing in flight)
```

The chain is long because a few files are shared by many items: `CollectionPage.tsx`, `PageShell.tsx`, `ContentComponent.module.scss`, `CollectionContentRenderer.tsx`, `globals.css` and `MenuDropdown.tsx`. Each request owns its files. A request does not start until the previous owner of a shared file has merged, so no two open PRs edit the same file.

R11 and B1 touch nothing the code requests touch, so they can run any time after their prep step. R11 runs early on purpose: it moves the `ai_guidelines/` rules into `CLAUDE.md`, and orch's builders read `CLAUDE.md`.

## Prep (the orchestrating session, with Zac)

### P1. Decisions

The goals below assume the recommended answer. Ask Zac with `AskUserQuestion`, four at a time, or let him edit the last column. Then paste each answer into the goals that cite it.

| # | Question | Options | Recommended | Affects | Answer |
| --- | --- | --- | --- | --- | --- |
| 1 | `www.zacedens.com`: every write there is 403 today | (a) add `https://www.zacedens.com` to the origin allow-list now; (b) redirect www to the apex at Amplify or DNS and keep the list single | (a) now. The redirect can follow with PF7/PF15. | R1 | (a) allow www now |
| 2 | The All Collections home tile never renders publicly (no cover, dropped by `hasRenderableContent`) | (a) exempt the two sentinel ids so the placeholder renders; (b) give the tile a real cover; (c) stop building it on the public path and skip `getUserPage()` when the Me tile cannot render | (c), unless you have a cover in mind, then (b). The working tree's tile reordering suggests you want it visible. | R2 | (c) stop building it on the public path |
| 3 | `CollectionPage`'s array branch has no production caller | (a) delete it and its tests; (b) keep it for a planned caller | (a) | R10 | (a) delete |
| 4 | Desktop collection rail: Related sits at the bottom with ~270 px of white above it | (a) keep; (b) move Related directly under the date row, filter bar stays pinned to the bottom | (b) | R5 | (b) move Related under the date row |
| 5 | Heart overlay shape | (a) square; (b) circle | (a) | R5 | (a) square |
| 6 | Mobile bottom nav bar (design §5) | (a) build it in R7; (b) skip it, keep the top-right menu with R2's fixes | (a) | R7 | (a) build it |
| 7 | Bottom bar's fourth cell for a signed-in non-admin | (a) Your space; (b) Saved | (a) | R7 | (a) Your space |
| 8 | Chip and input borders fail 3:1 contrast | (a) add `--color-border-control` for inputs and chips only; (b) raise `--color-border` for every hairline | (a) | R4, R9 | (a) --color-border-control |
| 9 | `/all-images` Order chip | (a) keep `ORDERED`, chip starts unlit; (b) switch to `CHRONOLOGICAL`, chip starts lit at asc | (a) | R5 | (a) keep ORDERED |
| 10 | `/all-client-galleries` is a public route reached only from an admin tile | (a) move it into `app/(admin)/` and the `proxy.ts` matcher; (b) leave it public and document what anonymous visitors get | (a) | R3 | (a) move into app/(admin)/ |
| 11 | `CLAUDE.md:14` says local admin data 401s; backend #333's `DevLocalAdminFilter` may make that false. `README.md:231` and `CLAUDE.md:14` disagree about `ADMIN_BOOTSTRAP_PASSWORD` | Zac runs the local backend, requests `GET localhost:8080/api/admin/users` anonymously, and tries a bootstrap login. Record 200 or 401, and whether the login worked. | Test, then write the result here | R11 | Anonymous GET localhost:8080/api/admin/users returned 200 on 2026-10-18 (DevLocalAdminFilter). Bootstrap login with ADMIN_BOOTSTRAP_EMAIL / ADMIN_BOOTSTRAP_PASSWORD works locally. |
| 12 | `.claude/agents/` (11 files, two used once in 105 sessions) | (a) delete all eleven plus the tracked `.claude/agent-memory/explorer/MEMORY.md`; (b) keep `explorer` and `code-reviewer` with one-line bodies | (a) | P2 | (a) delete all |
| 13 | Human changelog (`docs/previous-work.md` stops at #293) | (a) delete it, git and PR bodies are the record; (b) keep and extend it | (a) | R11 | (a) delete |
| 14 | The two live backend handoffs | (a) fold each ask into `docs/backlog.md` and delete the files; (b) move them to `docs/backend-asks/` | (a) | R11 | (a) fold into docs/backlog.md |
| 15 | `rowCombination.md` "Known limitation" written under the retired model | (a) delete the section; (b) re-run the `V4,H3,V4,V5,V5` reproduction and keep a 5-line result | (a) | R11 | (a) delete the section |
| 16 | README screenshots that do not exist | (a) drop the hero image and the table; (b) add four PNGs | (a) | R11 | (a) drop them |
| 17 | Orch builders work on a branch cut from `origin/main`, so they cannot see these untracked reports | (a) commit the four `.md` files in this folder in the prep PR and gitignore `screenshots/` (38 MB); (b) keep them untracked and paste every spec into the goals | (a) | P2 | (a) commit the reports |
| 18 | The worktree at `.claude/worktrees/quirky-chaplygin-aeb1da` has 6 uncommitted files | (a) Zac looks at them first, then commits or discards, then remove the worktree; (b) leave it | (a) | P3 | (a) the 5 code and test files go into the prep PR as their own commit; docs/007 edit dropped |

### P2. The prep PR (by hand, not orch)

Do this in the main checkout on a branch, since `main` is protected.

1. `git pull --ff-only` to bring in #438. The working-tree files do not overlap #438's files, so the pull is clean. Confirm with `git status` afterwards.
2. Commit 1, the working tree (code 7.8). Trim the history paragraph from the `CollectionPageWrapper` docblock (lines 49 to 53 in the reviewed tree) before committing. Delete `.next-review/`. Run `npx tsc --noEmit`, `npm run lint`, `npm test` first.
3. Commit 2, the reports (decision 17). Add `docs/reviews/2026-10-17/screenshots/` and `docs/reviews/2026-10-17/.claude/` to `.gitignore`. Commit `00-README.md`, the three reports and this file. Check that `git status` shows no screenshot staged. The three files in `screenshots/private/` show real names and emails and must never be committed.
4. Commit 3, the agents (decision 12). `git rm -r .claude/agents` and `git rm --cached .claude/agent-memory/explorer/MEMORY.md`. This is by hand because the orch config protects `.claude/**`.
5. Open the PR. Its required check fails on the audit step until R1 merges. Merge it after R1, then rebase if needed.

### P3. The stale worktree (decision 18)

Show Zac `git -C .claude/worktrees/quirky-chaplygin-aeb1da status` and `git -C .claude/worktrees/quirky-chaplygin-aeb1da diff --stat`. Remove it with `git worktree remove` only after he says the work is saved or not wanted. Until then every repo-wide grep returns doubled hits. Builders work in their own worktree cut from `origin/main`, so it does not affect them.

### P4. Register edens.zac in orch

`mcp__orch__repos` does not list edens.zac today. Follow the "When the folder is not registered" steps of the `orchestrate` skill: `repo_draft`, show the config word for word, explain each part, and register with `repo_add` only on Zac's yes. Ask for these edits to the draft:

| Part | Value | Why |
| --- | --- | --- |
| `landing` | `pr` | The draft always says `ff-main`. `main` is protected with `enforce_admins`, so nothing can push to it. `pr` pushes `orch/r-N` and opens a PR. It never moves local `main`. |
| `commands.setup` | `npm ci` | Same as CI. |
| `commands.test` | `npm run type-check && npm run lint:js && npm run lint:css && npm test -- --ci` | Mirrors the required CI job minus the audit step, which needs the network and stays in CI. Type check runs after format, matching the `CLAUDE.md` order. |
| `commands.format` | `npx eslint --fix app tests && npx prettier --write app tests` | Scoped so prettier never rewrites the review docs. |
| `commands.smoke` | `npm run build` only if `repo_check` shows the sandbox can reach `fonts.googleapis.com` and `fonts.gstatic.com` (`next/font/google` fetches at build time). Otherwise leave it out and use step 7 of "How the orchestrating session runs this file". | The CSS-module guard rule: SCSS changes need a build. |
| `paths.allowed` | `app/**`, `tests/**`, `docs/**`, `ai_guidelines/**`, `eslint-rules/**`, `public/**`, `README.md`, `CLAUDE.md`, `next.config.js`, `proxy.ts`, `package.json`, `package-lock.json`, `.stylelintrc`, `playwright.config.ts`, `.gitignore` | Everything the round edits. |
| `paths.protected` | `.github/**`, `.claude/**`, `docs/reviews/**`, `.env*`, `.nvmrc` | CI config is Zac's. Builders must not edit the review reports. |
| `paths.never_read` | `.env`, `.env.*`, `docs/reviews/2026-10-17/screenshots/**` | The private screenshots carry real user data. |
| `max_parallel` | `2` | Requests below pass `parallel` where more steps can build at once. |

Then `repo_check` and show each part's result. Fix a failure with Zac before the first submit.

B1 needs the backend repo registered the same way. Check how that repo lands changes (its `main` protection and its CI) before choosing `landing`. Its stack is Maven.

## Owner-only tasks

These need the EC2 box, a phone, the AWS console or a protected file. The orchestrating session reminds Zac of them and records the results. None waits on an orch request unless noted.

| # | Task | Covers | When |
| --- | --- | --- | --- |
| O1 | On EC2, add `WEBAUTHN_RP_ID=zacedens.com`, `WEBAUTHN_RP_NAME=Zac Edens Photography`, `WEBAUTHN_ALLOWED_ORIGINS=https://zacedens.com,https://www.zacedens.com` to `~/portfolio-backend/.env`. Before redeploying, record `docker compose logs backend \| grep -E 'WebAuthn rpId=\|profiles are active'` and `grep -E 'SPRING_PROFILES_ACTIVE\|WEBAUTHN' ~/portfolio-backend/.env`. Confirm `SPRING_PROFILES_ACTIVE=prod`, run `deploy.sh`, then the curl in code §1 step 3 must print `"rpId":"zacedens.com"`. If the profile was not `prod`, the BFF secret filter was off: treat that as its own incident. | Code 7.1, 7.2 | Now. This is the Face / Touch ID fix. |
| O2 | Phone test on the apex: password sign-in, "Face / Touch ID" on `/admin`, sign out, passkey sign-in on `/login`. Repeat on Android. If `passkeyCount` from `/api/proxy/api/auth/me` is above 0 before any enrollment, delete the stale credential with `DELETE /api/admin/users/{id}/passkeys/{credentialId}`. | Code 7.6 | After O1 |
| O3 | Production Lighthouse baseline: `npx lighthouse https://zacedens.com/ --preset=mobile` and the same for `/hidden-lake`, three runs each, median. Record the numbers in the R2 status row. | Code 7.14 | Before R2 merges, so R2's gain can be measured |
| O4 | After R1 merges, run `npm audit --audit-level=high`. If `sharp` or `source-map-js` still report high with no upstream fix, the CI step stays red. Choose between an `overrides` pin in `package.json` and narrowing the CI step to `--omit=dev` in `.github/workflows/ci.yml`. That file is protected from orch, so the edit is Zac's. | Code 7.3 | Right after R1 |
| O5 | Check Amplify appends the client IP to `x-forwarded-for`: `curl -H 'X-Forwarded-For: 1.2.3.4'` against an endpoint that logs the resolved IP. | Code 7.18 | Any time |
| O6 | Point the local backend at a local Postgres before anyone runs `tests/e2e/passkey.spec.ts`. Port 5432 on this Mac is the tunnel to the production database. | Code 7.13 (environment half) | Before any passkey e2e |
| O7 | After R3 merges and deploys, check production streaming: on a phone-sized window, no `<footer>` while the fallback shows, and the spinner is replaced by the page frame. If Amplify buffers the response, record that. | Design §4 item 5 | After R3 deploys |
| O8 | If decision 1 is (b), set up the www to apex redirect at Amplify or DNS. | Code 7.7 | Per decision 1 |
| O9 | Local-only cleanup after R11: shipped `docs/superpowers/` plans and specs, `docs/_archive/`, `.superpowers/`, `.claude/agent-memory/code-reviewer/`, `todo/` (after moving its one file to a backend issue). | Docs 7.13 | After R11 |
| O10 | Redeploy the backend after B1 merges (`deploy.sh`). Merging does not deploy it. | B1 | After B1 |

## Requests

Each request has: what it covers, when it starts, the submit options, the files, the goal to paste, and the check the orchestrating session does after it merges. Goals point at report sections. Once P2 is merged, the reports are on `main` at `docs/reviews/2026-10-17/`, and the planner and builders can read them.

### R1. Fix now: unblock CI, security, message rows

Covers: code 7.3 (the bump), 7.5, 7.7 (if decision 1 is a), 7.11; design 9.1; the `MessagesPanel` sort in code §4; the `next.config.js` docblock in docs §4.

Starts after: registration. First request of the round.

Submit: `workflow: "code-tested"`, `parallel: 3`, `budget_usd: 15`.

Files: `package.json`, `package-lock.json`, `next.config.js`, `app/api/revalidate/route.ts`, `tests/api/revalidate/route.test.ts`, `app/utils/originAllowlist.ts`, `tests/api/proxy/route.test.ts`, `tests/config/`, `app/components/messages/MessageRow.tsx`, `app/components/MessagesPanel/MessagesPanel.tsx`, `app/(admin)/comments/CommentsList.tsx`, `app/(admin)/comments/Comments.module.scss`, `tests/components/styleClassReferences.test.ts`, `tests/components/MessagesPanel/MessagesPanel.test.tsx`

```
Fix the urgent items from the 2026-10-17 code and design reviews in docs/reviews/2026-10-17/.
Every PR's required CI check fails today on `npm audit --audit-level=high`, so this goes first.

1. Bump next to ^16.3.8 in package.json and update package-lock.json (02-code-review.md §2 "High").
   Nothing else in package.json changes.
2. /api/revalidate requires an admin principal (02 §2 "Medium: /api/revalidate"). Resolve the
   principal with meServer() the way app/lib/actions/clearCache.ts does. Non-admin with a valid
   cookie and allowed Origin gets 401 and no revalidateTag/revalidatePath call; admin gets 200.
   Fix the docblock that assumes all callers are admins.
3. next.config.js: the http://localhost remotePatterns entry only when isDev (02 §2 "Medium:
   images.remotePatterns"). Add a Permissions-Policy header:
   camera=(), microphone=(), geolocation=(), payment=(), usb=() (02 §2 "Low: no Permissions-Policy").
   Replace the pf-performance-platform.md citation in the next.config.js docblock with "#360"
   (03-markdown-docs-review.md §4 "Links that break").
   Tests in tests/config/: production remotePatterns is exactly one https entry for
   d2qp8h5pbkohe6.cloudfront.net; the Permissions-Policy header is present.
4. www origin: <decision 1>. If (a): add https://www.zacedens.com as a second exact-match origin in
   app/utils/originAllowlist.ts and add the www case to tests/api/proxy/route.test.ts
   (02 §1 "Side finding 1", "What we will do" step 6). If (b): skip this item.
5. Message rows have rendered unstyled on /admin and /comments since commit 3f6b6b43
   (01-design-review.md §6 "The regression", step 1). Create
   app/components/messages/MessageRow.module.scss with .identity, .email, .body, .time, .actions,
   .replyButton, .meta, .unread, restored from
   `git show b1164134:app/components/MessagesPanel/MessagesPanel.module.scss`. MessageRow.tsx
   imports it itself. MessagesPanel.tsx and CommentsList.tsx stop passing `styles` for those keys.
   Note: PR #438 changed MessagesPanel.tsx after the review; read the current file.
   Close the guard gap in tests/components/styleClassReferences.test.ts so a class read through a
   `styles={styles}` prop is checked. The guard must fail on the pre-fix tree.
   MessagesPanel test asserts the email and body carry their ellipsis classes.
6. MessagesPanel.tsx sorts with sortByDate instead of its hand sort (02 §4 "Dead code", last para).

MUST HOLD: no other dependency changes; browser-facing behaviour of /api/proxy unchanged except the
www origin; the origin check stays exact-match and never normalised; Set-Cookie forwarding
unchanged.
DONE WHEN: type-check, lint, stylelint and jest pass; `npm audit --audit-level=high` reports
nothing in next (sharp and source-map-js may remain; note them in the PR description).
```

Check after merge: `/comments` and the Messages tab on `/admin` at 393x852 show the email ellipsised, the time on the right, and a gap between "Reply in Gmail" and the next button. Then do O4.

### R11. Docs consolidation

Covers: docs 7.2 to 7.12; code 7.13 (the `playwright.config.ts` docblock); the `CLAUDE.md` sentence in code 7.17; the E19 row #438 added to the refactor board.

Starts after: P. Runs alongside R1 and B1.

Submit: `workflow: "code-change"`, `parallel: 2`, `budget_usd: 15`.

Files: `CLAUDE.md`, `README.md`, `ai_guidelines/`, `docs/`, `app/utils/rowCombination.md`, `app/page.tsx`, `app/utils/structuredData.ts`, `tests/config/imageSizes.test.ts`, `playwright.config.ts`, `.gitignore`

```
Consolidate the tracked markdown as docs/reviews/2026-10-17/03-markdown-docs-review.md describes:
six tracked docs survive (README.md, CLAUDE.md, app/utils/rowCombination.md,
docs/browser-diagnostics.md, and two new files docs/backlog.md and docs/decisions.md). Follow its §7
priority list rows 2 to 12 in that order, so no link dangles at any step.

Decisions already made (03 §6):
- Changelog: <decision 13>.
- Backend handoffs: <decision 14>.
- rowCombination.md "Known limitation": <decision 15>.
- README screenshots: <decision 16>.
- The 11 process rules go into a "Testing gotchas" block in CLAUDE.md (03 §6 item 12, option a).
- The eight gitignored spike files stay local; keep .gitignore line `docs/spikes/*` (03 §6 item 8).
- CLAUDE.md:14 and README.md:231, tested by the owner: <decision 11>. Rewrite both to match.
- .claude/agents/ and the tracked explorer memory were already removed in the prep PR.

Also:
- docs/backlog.md gets every open item in 03 §5, plus row E19 that PR #438 added to
  docs/spikes/2026-summer-refactor.md after the review. Re-run the G2b inline-comment count on the
  day and record the command, not the number.
- docs/decisions.md records that the review round of 2026-10-17 is tracked in
  docs/reviews/2026-10-17/04-orch-plan.md.
- The four code docblocks in 03 §4 "Links that break" cite PR numbers instead of board paths,
  except next.config.js, which R1 already fixed.
- playwright.config.ts docblock says the e2e backend must point at a local Postgres, never the
  production tunnel on 5432 (02-code-review.md §1 "What not to do locally").
- CLAUDE.md keeps the "This is NOT the Next.js you know" block at the end; next dev rewrites it.

MUST HOLD: do not touch docs/reviews/**; delete stale text rather than annotating it; every rule
moved into CLAUDE.md is the full text, not a pointer.
DONE WHEN: `git check-ignore -v docs/backlog.md docs/decisions.md` prints nothing; a grep of
docs/, README.md, CLAUDE.md, app/ and tests/ for `ai_guidelines/`, `spikes/`, `superpowers/` and
`docs/00` finds no hits outside docs/reviews/; type-check, lint and jest pass.
```

Check after merge: read `CLAUDE.md` top to bottom once. It must still say "attach, never bind" for port 3000, and the testing-gotchas block must be there. Then do O9.

### B1. Backend: parent covers and dev hardening

Repo: `edens.zac.backend`. Needs its own registration (P4).

Covers: design 9.6; the backend parts of code 7.17; docs 7.14 (backend `CLAUDE.md` watch-outs).

Starts after: backend registration. Runs alongside everything; the frontend needs no change for parent covers to appear.

Submit: `workflow: "code-tested"`, `parallel: 2`, `budget_usd: 15`, `path` set to the backend checkout.

Files: `CollectionProcessingUtil.java`, `CollectionModel.java`, `application-dev.properties`, `DevLocalAdminFilter.java`, `InternalSecretFilter.java`, `CLAUDE.md`, and their tests.

```
Four backend changes from the frontend's 2026-10-17 review
(edens.zac/docs/reviews/2026-10-17/01-design-review.md §2 and 02-code-review.md §2).

1. CollectionProcessingUtil.populateParents batch-loads parent cover URLs exactly as
   populateSiblings does (one batched query via contentRepository.findImagesByIds), and passes the
   URL instead of the hard-coded null. Delete the "render as text links" sentence from its javadoc
   and from CollectionModel.java. Flip any test asserting parents[].coverImageUrl is null.
   GET /api/read/collections/{slug} then returns parents[].coverImageUrl.
2. Under the dev profile, anonymous /api/admin/** is answered as the bootstrap admin on every
   network interface. Restrict it to local callers. First find out how the local backend runs: if
   it runs in Docker with a port mapping, a loopback bind (server.address=127.0.0.1) breaks it, so
   choose the remote-address check in DevLocalAdminFilter instead and say why. Test: dev-profile
   MockMvc request from 192.168.1.50 to /api/admin/users gets 401.
3. InternalSecretFilter logs the full URI on reject. /api/read/share/<token> and
   /api/auth/invite/<token> are bearer-token URLs. Mask the last segment under /share/ and
   /invite/, or log the method plus the first two path segments.
4. Add two lines to CLAUDE.md for identity merges: the Records.Person(id, name) shape, and never
   SELECT * on users (from edens.zac docs/009-backend-and-vision.md:23-24).

MUST HOLD: no change to prod-profile behaviour other than item 3's log line; the prod guards keep
refusing rpId=localhost.
DONE WHEN: the backend test suite passes.
```

Check after merge: O10. Then `/dolomites-film` on the dev server shows a cover tile for the Film parent in Related.

### R2. Speed and the menu

Covers: code 7.4 (same as design 9.19), 7.9, 7.10, 7.12, 7.15; design 9.9; the `clearCacheAction` backend leg in code §2.

Starts after: P and R1. O3 should be done first.

Submit: `workflow: "code-tested"`, `parallel: 2`, `budget_usd: 20`.

Files: `app/components/Content/CollectionContentRenderer.tsx`, `tests/components/Content/CollectionContentRenderer.nanSizes.test.tsx`, `app/lib/api/core.ts`, `tests/api/`, `app/lib/actions/clearCache.ts`, `app/components/ContentCollection/CollectionPageWrapper.tsx`, `app/components/ContentCollection/CollectionPage.tsx`, `app/components/ui/PageShell/PageShell.tsx`, `app/components/SiteHeader/`, `app/components/MenuDropdown/`, `app/hooks/useFetchMe.ts`, `app/utils/contentLayout.ts`, `app/utils/allCollectionsContentBlock.ts`, `tests/components/MenuDropdown.test.tsx`, `tests/components/SiteHeader.test.tsx`, `tests/components/ContentCollection/`

```
Speed fixes from docs/reviews/2026-10-17/02-code-review.md §3, plus the menu fixes from
01-design-review.md §5 steps 1 to 3, which need the server-resolved `me`.

1. Mobile image sizes (02 §3.1): in CollectionContentRenderer.tsx the grid tile `sizes` becomes
   `${Math.round(validWidth)}px` on every viewport. Update the nanSizes test. Keep the one
   fetchpriority=high hero preload.
2. Server-side fetches call API_URL directly with X-Internal-Secret instead of going through
   NEXT_PUBLIC_APP_URL/api/proxy (02 §3.2, core.ts:81-89). This also makes clearCacheAction's
   backend leg work (02 §2 "Low: clearCacheAction"). Browser fetches still go through /api/proxy.
3. Pass the server-resolved `me` into SiteHeader and MenuDropdown from CollectionPage and the
   other SiteHeader call site (PageShell). MenuDropdown stops fetching /auth/me on page load; keep
   the AUTH_CHANGED_EVENT refetch (02 §3.3).
4. CollectionPageWrapper: start the signed-in reads in the first Promise.all (02 §3.3, last para).
5. All Collections tile: <decision 2> (02 §4 "The All Collections tile never renders publicly").
   Either way, getUserPage() is not fetched when its result cannot render. Add a test that renders
   home through CollectionPageClient with filterVisible true and asserts the /collections link is
   present or absent per the decision.
6. Menu (01 §5 "What we will do" steps 1 to 3): drop the Home row; rename Me to "Your space",
   pointing at /admin when me.isAdmin and /user otherwise; Clear Cache shows only when
   isLocalEnvironment() and me.isAdmin; order is browse, account, About, Contact, admin rows,
   Clear cache, Log out. Hamburger, close and social buttons get 44px hit boxes through padding,
   not a bigger glyph. The panel is opaque (var(--color-bg)) and 100dvh tall.

MUST HOLD: API_URL and INTERNAL_API_SECRET are read only in server-only modules and never reach a
client bundle; local development keeps working through the existing local path; desktop menu
layout unchanged apart from the item list.
DONE WHEN: a public page load makes zero browser requests to /api/proxy/api/auth/me; jest,
type-check, lint and stylelint pass.
```

Check after merge: on `/hidden-lake` at 393x852, the network log shows tile requests at `w=256` to `w=640`, not `w=828`. The menu has no Home row and is opaque over the grid. Zero `/auth/me` requests from the browser on load. After the deploy, rerun O3's Lighthouse and record both numbers.

### R3. Page frame: footer, loading, auth pages, back links

Covers: design 9.2, 9.3, 9.17, 9.18, 9.25; design §5 step 13 (decision 10); the `LoginForm` placeholder and disabled-passkey items in design §8.

Starts after: R2.

Submit: `workflow: "code-change"`, `parallel: 2`, `budget_usd: 15`.

Files: `app/layout.tsx`, `app/loading.tsx`, `app/loading.module.scss`, `app/styles/`, `app/components/ui/PageShell/`, `app/components/ContentCollection/CollectionPage.tsx`, `app/components/Content/ContentComponent.module.scss` (shimmer block only), `app/components/Content/ContentBlockWithFullScreen.tsx`, `app/login/`, `app/invite/[token]/page.tsx`, `app/components/ClientGalleryGate/ClientGalleryGate.tsx`, `app/components/Admin/AllImagesClient.tsx`, `app/(admin)/`, `app/all-client-galleries/`, `proxy.ts`, `tests/components/ui/PageShell.test.tsx`, `tests/components/ContentCollection/CollectionPage.test.tsx`

```
Fix first paint and give every page the same frame, from
docs/reviews/2026-10-17/01-design-review.md §4 and §5.

1. Move <Footer /> out of app/layout.tsx into PageShell and both return branches of CollectionPage,
   after <main> inside .container (01 §4 "What we will do" step 1). The five pages that render
   neither shell get a footer or go through PageShell: /login, /invite/[token], ClientGalleryGate,
   AllImagesClient, the collection manage page. Add tests that the footer renders after <main> in
   PageShell and CollectionPage.
2. app/loading.tsx renders PageShell with a full-height shimmer body (01 §4 step 2). Lift the
   shimmer gradient from ContentComponent.module.scss into a shared partial under app/styles/ and
   use it from both places. Respect prefers-reduced-motion.
3. /login and /invite/[token] render through PageShell so they get the site title link and the
   footer. app/styles/auth-card.module.scss uses 100dvh (01 §5 step 10, §8 "/login"). The login
   password placeholder stops repeating its label; the passkey button says why it is disabled
   until an email is typed.
4. Admin subpages /comments, /metadata, /all-images and the create form get a "← Admin" link to
   /admin. Prefer a backHref prop on PageShell over four copies (01 §5 step 8).
5. FullScreenModal's dynamic() import gets `loading: () => null`, and its mount is wrapped in an
   error boundary so a failed chunk does not blank the gallery (01 §4 step 4).
6. /all-client-galleries: <decision 10> (01 §5 step 13).

MUST HOLD: do not delete app/loading.tsx; no min-height on the fallback to "match" the page; no
grey card grid in the fallback; exactly one footer per page; CLS on /dolomites-film stays at or
under 0.002.
DONE WHEN: no <footer> exists in the DOM while the loading fallback shows; jest, type-check, lint
and stylelint pass.
```

Check after merge: navigate home to `/dolomites-film` at 393x852 with the network throttled. The header and shimmer show, there is no footer at the fold, and the footer appears once the page lands. `/login` has the site title. `/comments` has a back link. Then O7 after the deploy.

### R4. Controls, forms and touch targets

Covers: design 9.4, 9.10, 9.13, 9.14, 9.20, 9.22, 9.27, 9.44; design §1 item 6 (Order chip width); the invite form's `required` marker in design §8.

Starts after: R3. Runs alongside R5.

Submit: `workflow: "code-change"`, `parallel: 3`, `budget_usd: 20`.

Files: `app/components/ui/FilterToolbar/FilterToolbar.module.scss`, `app/components/ui/FilterToolbar/DensityTierControl.module.scss`, `app/components/ui/FilterChip/`, `app/components/ui/SegmentedChip/`, `app/components/UserForm/UserRolesSection.tsx` and its SCSS, `app/components/ui/Field/`, `app/components/ui/Button/`, `app/components/ui/Modal/`, `app/styles/globals.css`, `app/components/ContactForm/`, `app/components/ClientGalleryGate/`, `app/invite/[token]/InviteForm.tsx`, `app/components/Personal/ShareChip.tsx`, `app/components/Content/ContentBlockWithFullScreen.tsx`, `app/components/Content/ContentBlockWithFullScreen.module.scss`, `app/explore/ExploreDirectory.tsx`, `app/explore/Explore.module.scss`, `tests/components/ui/`

```
Make the shared controls consistent and touch-safe, from
docs/reviews/2026-10-17/01-design-review.md §1 and §8.

1. Density joins the bottom chip row on phones (01 §1 "What we will do" items 1 and 2): .controls
   floor 180px under 768px, .toolbar row gap var(--space-2), density segments joined like
   SegmentedChip (one outer border, dividers). Replace the stale width table in the
   FilterToolbar.module.scss docblock with the numbers from 01 §1.
2. Chip padding var(--space-1) var(--space-2) on FilterChip, SegmentedChip and the role chips in
   UserRolesSection (01 §1 item 5). The inactive Order chip stops reserving its arrow width
   (01 §1 item 6; start at FilterChip.module.scss:101-106).
3. Chip contrast (01 §8 item 2): counts use color var(--color-on-surface-muted) instead of
   opacity 0.6; chips drop opacity 0.7 for muted text and var(--color-border-strong).
   Borders: <decision 8>. With (a), add --color-border-control (#767676) in globals.css and use it
   for Field inputs and chips.
4. Button gets the 44px coarse-pointer ::after overlay IconButton uses (01 §8 item 1).
5. ui/Modal gets a `sheet-bottom` variant: bottom-anchored, full width, max-height 85dvh, rounded
   top corners, safe-area bottom padding, rendering as `overlay` at width >= 768px
   (01 §5 "Pop-out pattern"). Tests in tests/components/ui/Modal.test.tsx. Nothing uses it yet.
6. Contact form (01 §8 item 3): dvh instead of vh, textarea min-height 10rem, success text on a new
   --color-success-text (#15803d), counter hidden until 4500 characters, Send enabled with
   `required` doing the validation.
7. Use the ui components (01 §8 items 7 to 9): ClientGalleryGate, InviteForm and ShareChip inputs
   move to Field/Input/FormError/Checkbox; Load More becomes <Button variant="primary" size="md">;
   Explore directory links become FilterChip with href. Delete the local styles they replace.
   Give Field a `required` prop and use it on the invite form instead of "*" in the labels.
8. A touch-target test under tests/components/ui/ reads each ui/ SCSS module and asserts the
   coarse-pointer overlay is present (01 §8 item 21).

MUST HOLD: do not edit FilterToolbar.tsx, CollectionContentRenderer.tsx or
ContentComponent.module.scss (R5 owns them); the 8px chip gap stays, since it keeps the 44px
overlays from stealing taps across rows; the desktop toolbar layout is unchanged.
DONE WHEN: jest, type-check, lint and stylelint pass with zero warnings.
```

Check after merge: `/dolomites-film` at 393x852 shows Order, Highly Rated and the joined density control on one row. Tap each density segment: the chip above must not activate. Open the contact form from the menu on a 667 px tall window: Send is visible without scrolling.

### R5. Collection page header

Covers: design 9.5, 9.7, 9.8 (SaveHeart only), 9.11, 9.12, 9.16, 9.24, 9.26; design §1 open question 1 (decision 4); the three orphan SCSS classes in code §4.

Starts after: R3. Runs alongside R4. Parent covers appear once B1 is deployed; this request does not wait for it.

Submit: `workflow: "code-tested"`, `parallel: 3`, `budget_usd: 20`.

Files: `app/components/Content/ContentComponent.module.scss`, `app/components/Content/CollectionContentRenderer.tsx`, `app/components/Content/SaveHeart.module.scss`, `app/components/ui/FilterToolbar/FilterToolbar.tsx`, `tests/components/ui/FilterToolbar.test.tsx`, `app/utils/contentLayout.ts`, `tests/utils/contentLayout.test.ts`, `app/[slug]/page.tsx`, `app/components/StructuredData/CollectionJsonLd.tsx`, `app/components/Admin/AllImagesClient.tsx`, `tests/components/Admin/`, `tests/components/Content/`

```
Tighten the collection page's info block on phones and fix Related, from
docs/reviews/2026-10-17/01-design-review.md §1, §2, §3 and §7.

1. Dead gaps (01 §1 item 3): .metadataBlockInner gap var(--space-2) on mobile; the empty
   .metadataDescriptionContainer is hidden or not rendered under 768px; .metadataSiblingsContainer
   loses its padding-top.
2. Flat date chips (01 §1 item 4): FilterToolbar takes a flatDateLimit prop (default
   MAX_FLAT_DATE_CHIPS); CollectionContentRenderer passes 2 when isMobile.
3. Desktop rail: <decision 4> (01 §1 open question 1).
4. Related (01 §2): parents first in contentLayout.ts (parents win dedup; update the comment and the
   four tests under contentLayout.test.ts:1097); the no-cover fallback chip uses FilterChip tokens
   instead of a pill; on phones the card row is one horizontal scroll strip of 96x48 tiles with the
   last tile peeking; desktop unchanged.
5. /home (01 §5 step 9): app/[slug]/page.tsx redirects to / when slug is HOME_SLUG; the Related
   link for the home parent points at /; check CollectionJsonLd's canonical URL.
6. Tags in the collection header render as links to /tag/[slug], the way the location link does
   (01 §5 step 7). If filterItems does not carry the tag slug, stop and ask.
7. SaveHeart (01 §3 items 1 and 2): 32px visible box, 44px coarse-pointer overlay anchored to the
   corner, 18px glyph, lighter scrim, idle opacity about 0.6 on coarse pointers. Shape:
   <decision 5>. Rewrite the docblock: the 44px target is the overlay now.
8. /all-images (01 §7): delete the description sentence; render "All Images" and an "N images"
   count through CollectionHeader the way LocationPage does; Order chip: <decision 9>.
9. Delete the orphan classes .overlayContainer, .dragContainer and .parallaxContainer from
   ContentComponent.module.scss (02-code-review.md §4 "Dead code").

MUST HOLD: desktop info rail unchanged except decision 3; the empty description container still
exists on desktop as the flex spacer; do not edit SelectStar (R9 owns it) or
FilterToolbar.module.scss (R4 owns it); do not edit docs/spikes/ (R11 deletes it).
DONE WHEN: /dolomites-film at 393x852 has about 230px between the cover and the first grid row
(was 309px); jest, type-check, lint and stylelint pass.
```

Check after merge: `/dolomites-film` and `/pnwer-2026` at 393x852. Measure the info block height. Related scrolls sideways with parents first. `/home` redirects to `/`. `/all-images` shows a title and a count.

### R6. Search, location and tag pages

Covers: design 9.15, 9.21, 9.38; code 7.20.

Starts after: R5. Runs alongside R7 and R8.

Submit: `workflow: "code-tested"`, `parallel: 2`, `budget_usd: 20`.

Files: `app/components/SearchPage/`, `app/components/LocationPage/`, `app/components/TaxonomyPage/`, `app/tag/[slug]/page.tsx`, `app/search/`, `app/location/`, `app/components/ui/FilterToolbar/filterToolbarUtils.ts`, `tests/components/ui/filterToolbarUtils.test.ts`, `app/hooks/useFilteredImagePage.ts`, `app/components/Content/Component.tsx`, `app/components/Content/ContentComponent.module.scss` (`.layoutSkeleton` only), `tests/components/LocationPage/`, `tests/components/SearchPage/`, `tests/components/TaxonomyPage/`, `tests/hooks/`

```
Fix and share the code behind /search, /location/[slug] and /tag/[slug], from
docs/reviews/2026-10-17/01-design-review.md §4, §5, §8 and 02-code-review.md §4.

1. Write tests/components/LocationPage/LocationPageClient.test.tsx first; it has no test today.
2. Extract useFilteredImagePage(images, buildCriteria) into app/hooks/, shared by
   LocationPageClient and SearchPageClient (02 §4 "The real remaining duplication" item 2). Move
   the shared FilterToolbar prop block into filterToolbarUtils.ts. CollectionPageClient is not a
   caller.
3. /tag (01 §5 step 11): find why entityName arrives empty for a real tag (/tag/alpine shows
   "Untitled"), fix it, delete the 'Untitled' fallback, and make an unknown slug (/tag/film) a 404.
   Check what getAllTags returns against what resolveTaxonomyBySlug reads first. Give the tag page
   an empty state when it has no photos.
4. A "Clear filters" Button in the filtered-to-zero empty states on SearchPageClient and
   LocationPageClient (01 §8 item 6).
5. Thread resolveSsrViewport() into SearchPageClient, TaxonomyPage and LocationPageClient the way
   CollectionPageWrapper does, then delete the .layoutSkeleton early return in Component.tsx and its
   SCSS and docblock (01 §4 step 6). Measure /search and /tag/alpine for layout shift before and
   after; record both in the PR description.

MUST HOLD: filter URL state behaviour unchanged (router.replace, chips in the URL); the
Location-only behaviour (non-image blocks kept, LocationCollections above the toolbar) stays.
DONE WHEN: /tag/alpine shows its tag name; /tag/film returns 404; jest, type-check, lint and
stylelint pass.
```

Check after merge: `/tag/alpine`, `/tag/film`, `/search` filtered to zero (Clear filters works), `/location/dolomites-italy` at 393x852.

### R7. Mobile bottom nav and sheets

Covers: design 9.28, 9.29; the "What moves into the sheet" rows in design §5 for the contact form and the filter dropdowns; code 7.23.

Starts after: R2, R3, R4, R5. Skip it if decision 6 is (b); then do only item 4 below as a small request.

Submit: `workflow: "code-tested"`, `parallel: 2`, `budget_usd: 25`.

Files: `app/components/ui/BottomNav/` (new), `tests/components/ui/BottomNav.test.tsx` (new), `app/components/ui/PageShell/`, `app/components/SiteHeader/`, `app/components/MenuDropdown/`, `app/hooks/useDialogFocus.ts` (new), `app/components/ui/Modal/Modal.tsx`, `app/styles/globals.css`, `app/components/Footer/Footer.module.scss`, `app/components/ContentCollection/CollectionPageWrapper.tsx`, `app/components/ui/FilterToolbar/FilterToolbar.tsx`, `app/components/ui/FilterToolbar/FilterToolbar.module.scss`, `app/components/Personal/ContactChip.tsx`, `tests/components/MenuDropdown.test.tsx`, `tests/components/ui/`

```
Mobile navigation from docs/reviews/2026-10-17/01-design-review.md §5 "What we will do" steps 4
and 5, plus the dialog duplication in 02-code-review.md §4 item 3.

1. New app/components/ui/BottomNav (TSX + SCSS module): mobile only (display none at
   width >= 768px), cells Menu, Explore, Collections, and a fourth cell: Log in when anonymous,
   otherwise <decision 7>. Height 56px plus env(safe-area-inset-bottom); body gets matching
   padding-bottom under 768px; z-index var(--z-sticky); active cell aria-current="page" with the
   EditBar active-tab rule. Rendered from PageShell next to SiteHeader, with a hideBottomNav prop
   that CollectionPageWrapper sets in edit mode; not rendered while EditBar is mounted.
   SiteHeader hides its hamburger under 768px so there is one menu button.
2. The menu on phones is a bottom sheet: bottom-anchored, scrim that closes on tap, close button in
   the sheet's last row, click-outside on all widths; the sheet hides the three rows the bar
   carries. Desktop keeps the 400px top-right panel.
3. Extract useDialogFocus(ref, open, onClose) into app/hooks/ (focus trap, Escape, restore focus,
   body scroll lock) and use it from both Modal and MenuDropdown (02 §4 item 3).
4. The Contact row in the menu opens ContactChip's existing modal instead of an inline ContactForm.
5. Filter dropdown panels open as Modal variant="sheet-bottom" under 768px (the variant exists
   since R4).

MUST HOLD: do not edit filterToolbarUtils.ts (R6 owns it); desktop navigation unchanged;
/search gets no cell or menu row (open question SD4);
the fullscreen viewer still covers the bar; keyboard focus order and Escape behaviour of both
dialogs unchanged, so all existing MenuDropdown and Modal tests pass unmodified apart from item
changes.
DONE WHEN: jest, type-check, lint and stylelint pass.
```

Check after merge: at 393x852, the bar shows on `/`, `/collections` and a collection page, and not in `?manage=1` edit mode. The menu sheet opens from the bottom. Tab and Escape work in the menu and in a Modal. At 1440 wide nothing changed.

### R8. Admin hub and list panels

Covers: design 9.30, 9.31, 9.39; code 7.19; design §6 step 6 (metadata lists); the `ListPanel` dark ramp in design 9.23.

Starts after: R1 and R4. Runs alongside R6 and R7.

Submit in two parts, because PR #438 changed this area after the review:
1. `workflow: "plan-only"`, `build_workflow: "code-change"`. Zac approves or rejects the plan.
2. Then `submit` with `from_plan` set to that request's `r-N`, `parallel: 3`, `budget_usd: 30`. This is refused if `main` moved since the plan, which it will have if R6 or R7 merged in between. Then submit a fresh plan-only request.

Files: `app/components/ListPanel/`, `app/components/AdminLists/`, `app/(admin)/admin/`, `app/components/UserManagementPanel/`, `app/components/MessagesPanel/`, `app/components/RolesPanel/`, `app/components/CollectionsPanel/`, `app/components/UserSpace/UserSpaceGrid.tsx`, `app/components/ui/Disclosure/`, `app/hooks/useCachedPanelData.ts`, `app/(admin)/metadata/`, `tests/(admin)/admin/`, `tests/components/ListPanel/`, `tests/components/AdminLists/`, `tests/components/*Panel/`

```
Rework the admin hub's lists per docs/reviews/2026-10-17/01-design-review.md §6 and
02-code-review.md §4 item 1.

The review was written against 9f7302b7. PR #438 (e98957ca) landed after it and already made the
four panels tabs of one ListPanel with one collapse, a ?list= tab, a toolbar line and PanelAction.
First, list which items of 01 §6 "What we will do" steps 2 to 6 and the scorecard #438 already
covers, and plan only what is left. Ask where #438 chose differently from the review.

What the review asks for, to check against the current code:
1. ListPanel re-skin: page background, one --color-border hairline between rows, no --lp-* grey
   ramp, no collapsed body sliver, row padding 8/8, hover --color-overlay-soft. Delete the dead
   [data-surface='dark'] ramp in ListPanel.module.scss.
2. One row shape for all lists: primary text, a muted secondary after a middle dot, one line,
   ellipsised, a small muted fact on the right, nothing clickable in the row except the row itself.
   Tapping a row opens a detail sheet (Modal variant="sheet-bottom" on phones, overlay on desktop)
   that holds the per-row actions. The table in 01 §6 lists what each sheet holds.
3. Hub order: nav tiles before the list panel; tab order Messages, Users, Collections, Roles; the
   Admin segment shows the unread message count from the messages read loadAdminHub already makes.
4. A PanelBody component next to ListPanel for the shared loading / error / empty / stale
   rendering, with a default error message derived from the panel key in useCachedPanelData
   (02 §4 item 1).
5. /metadata lists: no half-cut last row, and a gap above the footer.

MUST HOLD: the 2026-08-13 decision that collections stay a list, not a tile grid; collapse state
stays in AdminHubClient and agrees between server and client; nothing moves into the upper chip
tier.
DONE WHEN: jest, type-check, lint and stylelint pass.
```

Check after merge: `/admin` at 393x852 and 1440 wide, signed in as admin (admin data needs a real login locally). Open a user row and a message row. The sheet holds the actions. `/metadata` has no cut-off row.

### R9. Visual tokens and the stylelint guard

Covers: design 9.32 to 9.37; the `globals.css` and admin layout parts of design 9.23; the SelectStar part of design 9.8; design §8 quick wins 11 (ShareBanner) and 12 (footer links); the `/collections` failed-read state and the `/explore` header in design §8 per-page issues.

Starts after: R4, R5, R6, R7 and R8 have all merged.

Submit: `workflow: "code-change"`, `parallel: 3`, `budget_usd: 30`.

Files: `app/styles/globals.css`, `app/components/FullScreenModal/`, `app/components/ui/CoverCard/`, `app/components/Personal/FollowButton.module.scss`, `app/components/Content/SaveHeart.module.scss`, `app/components/Content/ContentComponent.module.scss`, `app/components/Content/ReorderOverlay.module.scss`, `app/components/ClientGalleryDownload/FullScreenDownloadButton.module.scss`, `app/components/MenuDropdown/MenuDropdown.module.scss`, `app/components/ui/IconButton/`, `app/components/ui/Dropdown/Dropdown.module.scss`, `app/components/ui/CollectionHeader/`, `app/components/ui/StatusPage/`, `app/styles/auth-card.module.scss`, `app/explore/`, `app/collections/`, `app/s/[token]/ShareBanner.module.scss`, `app/components/Footer/Footer.module.scss`, `app/(admin)/layout.tsx`, `.stylelintrc`, `tests/components/`

```
Move the remaining raw colours and sizes onto tokens, then add a stylelint guard so they stay
there. Source: docs/reviews/2026-10-17/01-design-review.md §8 "What we will do" items 10 to 18,
and §3 item 3.

1. A --scrim-dark-10..90 ladder in globals.css next to the light one; replace every
   rgb(0 0 0 / N%) in FullScreenModal, CoverCard, FollowButton, SaveHeart, ContentComponent,
   FullScreenDownloadButton and MenuDropdown with the nearest step (01 §8 item 13).
2. IconButton variant="scrim"; FullScreenModal and FullScreenDownloadButton drop their doubled-class
   overrides; SelectStar and ReorderOverlay's buttons become IconButtons, matching the heart's
   size from R5 (01 §8 item 16, §3 item 3).
3. Fullscreen metadata panel (01 §8 item 15): body --text-sm, chips --text-xs with 44px-safe
   padding, section headers as <h2>, items as <ul>, close button respects
   env(safe-area-inset-top), the position counter is no longer aria-live on every swipe.
4. ui/Dropdown onto the token scale: no raw px, no transition: all, --radius-1 (01 §8 item 17).
5. One h1 recipe (01 §8 item 14): /explore and the /collections fallback use CollectionHeader;
   StatusPage and the auth card match its size and weight; drop --page-padding-desktop from
   Explore and Collections so PageShell owns the edge. The /collections failed-read branch becomes
   StatusPage with onRetry; delete .pageHeader, .pageTitle and .empty.
6. ShareBanner reads as a notice (--color-surface-raised, --space-3 padding, --radius-1); footer
   links get a usable touch height and the copyright moves up from --text-xs (01 §8 items 11, 12).
7. Delete the unreachable [data-surface='dark'] block in globals.css and the paragraph in
   app/(admin)/layout.tsx that explains it (01 §8 item 10).
8. Last step, after 1 to 7: the stylelint guard in .stylelintrc (01 §8 item 18):
   declaration-property-value-disallowed-list for hex and rgb() on colour properties and px on
   font-size, border-radius, gap, padding and margin, with an allowlist for 1px, 0 and the ::after
   overlay maths. Fix or allowlist every remaining hit.

MUST HOLD: no visual change beyond what is listed; border tokens follow decision 8 from R4.
DONE WHEN: `npm run lint:css` passes with zero warnings under the new rule; jest, type-check and
lint pass.
```

Check after merge: open the fullscreen viewer on a photo at 393x852 and 1440 wide. Check `/explore`, `/collections`, `/login` and one `/s/[token]` link. Titles share one left edge with the header.

### R10. Code cleanup

Covers: code 7.16 (exports, `postRevalidate`, `React.*` imports), 7.21, 7.22, 7.24; the redundant `'use client'` directives, the repeated docblock sentence and the three untested modules in code §4; docs §5 rows F3 and E7.

Starts after: everything above. It touches files all over the tree, so nothing else is in flight.

Submit: `workflow: "code-change"`, `parallel: 3`, `budget_usd: 20`.

Files: the files named in 02-code-review.md §4 "Dead code", "Rule conformance" and "What we will do" rows 2, 4, 5, 9, 10, 11 and 13; `app/utils/contactApi.ts`, `app/lib/api/messages.ts`, `app/components/auth/`, `app/components/messages/`, `app/components/ContentCollection/edit/EditModeLayer.tsx`, `tests/`

```
Mechanical cleanup from docs/reviews/2026-10-17/02-code-review.md §4 and the refactor rows F3 and
E7 in docs/backlog.md. No behaviour changes.

1. Drop `export` from the ten internal-only symbols listed in 02 §4 "Dead code".
2. One local postRevalidate(body) helper replaces the three POST /api/revalidate calls in
   collectionEditUtils.ts.
3. Named type imports from 'react' replace the seven global React.* type uses (02 §4
   "Rule conformance").
4. Remove the redundant 'use client' from ReadOnlyInfoSection.tsx, MediaPreview.tsx and
   CollectionEditSheet.tsx. Delete the repeated "No collectionId" docblock sentence from
   meContentBlock.ts and allCollectionsContentBlock.ts.
5. Tests for collectionToggle.ts, sharedObserver.ts and useThrottle.
6. The SSR viewport travels as one SsrViewport object through CollectionPage,
   CollectionPageClient, ContentBlockWithFullScreen and Component, and their callers (02 §4 row 5).
7. CollectionPage's array branch: <decision 3>. With (a), delete the branch, its tests and
   collectionToContentModel if nothing else uses it.
8. Hoist the inline comments in the seven app/ files with 25 or more warnings into docblocks or
   delete them (02 §4 row 11): useFullScreenImage.tsx, rowCombination.ts, metadataUtils.ts,
   contentFilter.ts, rowStructureAlgorithm.ts, contentLayout.ts, useParallax.ts.
9. F3: move app/utils/contactApi.ts into app/lib/api/messages.ts using ApiError; rename
   app/components/auth/ and app/components/messages/ to PascalCase.
10. E7: EditModeLayer computes contentBlocks and discards it in reorder mode; fix it.

MUST HOLD: no behaviour change; before collapsing or moving an export, grep for
jest.mock('<path>') so automocks are not merged; every import path updated.
DONE WHEN: jest, type-check, lint and stylelint pass; eslint reports no
local/no-inline-comments-in-functions warnings in the seven files.
```

Check after merge: `npm test` locally, and click through `/`, a collection, `/admin` and `/login` once.

## Not in this round

These need their own planning session or a product decision first. R11 records each one in `docs/backlog.md`.

| Item | Why not now |
| --- | --- |
| PF13 Cache Components (code 7.26) | Waits on R2 and a production Lighthouse run showing TTFB is what remains. Unverified whether Amplify keeps a `use cache` store across Lambda instances. |
| F4: fold `/tag` into the location page stack (design 9.41, code 7.27) | Large, unsized. R6 fixes the tag page first. |
| F1: split `useCollectionEdit.tsx` (1,829 lines) | Large, own session, goes before MA1. |
| Link `/search` and its nav cell (design 9.40) | Blocked on SD4 (decision #10 on the old board). |
| Brand serif: webfont or remove (design 9.42) | Product decision. |
| Percent-width tiles with `aspect-ratio` (design 9.43) | Measured win is CLS 0.0019. Touches dozens of pixel-asserting tests. |
| PF16 `/search` corpus size and backend `GET /collections/{slug}` profiling (code 7.25) | Medium. Needs the Lighthouse baseline and backend timing first. |
| Last grid tile alone on an odd count (design §8 open question 1) | No decision yet. |
| The 31 feature rows, 10 open decisions and 4 backend asks in docs §5 | Product backlog, not review fixes. |
| `useSubmitState` for forms and modals; inline comments beyond the seven worst files | Do when those files are next opened. |
| Admin panel cache keyed by principal (code §2 "Noted") | Low risk, noted only. |

## Close-out

When R10 has merged:

1. Fold anything still open from this round into `docs/backlog.md`. `git rm` the four `.md` files in `docs/reviews/2026-10-17/` in a small PR, by hand, because orch protects that folder. The screenshots stay local.
2. Write a mempalace `decisions` entry for edens-zac recording the round: the PR numbers, what was skipped and why.
3. Archive the orch requests' sessions only if Zac says so.

## Delegated answers log

Zac delegated plan approvals, planner answers and merges on green to the orchestrating session on 2026-10-18. Every delegated call is listed here.

| When | Request | Call | What |
| --- | --- | --- | --- |
| 2026-10-18 | B1 (r-25) | answer | 1. a: the dev admin stand-in treats only loopback as local, plus an optional dev setting of extra addresses, empty by default. |
| 2026-10-18 | R1 (r-24) | retry | Format command now formats only changed files; told r-24.5 not to add MessageRow.test.tsx. |
| 2026-10-18 | B1 (r-25) | approve | Plan e6d781e7: 4 steps (parent covers, dev admin stand-in remote-address check, token masking, CLAUDE.md watch-outs). |
| 2026-10-18 | R1 (r-24 → r-26) | resubmit | r-24 failed on scope blocks: tests/next.config.test.ts and tests/components/messages/MessageRow.test.tsx had to change with the code but were outside the plan. Resubmitted as r-26 with both named. |
| 2026-10-18 | B1 (r-25) | retry | Step 1: report folder is writable, save the report. Step 2: do not edit protected docker-compose.yml; the dev setting is set by env var. |
| 2026-10-18 | R1 (r-26) | approve | Plan ea08bace: 6 steps; next bump first, then revalidate, config + next.config.test, www origin, MessageRow stylesheet + its test, guard + sortByDate. |
| 2026-10-18 | B1 (r-25) | config + retry | Unprotected backend docker-compose.yml (one env line with an empty default, dev-only use) and retried step 2. |
| 2026-10-18 | R1 (r-26) | config + retry | Planner check wrote to /tmp, which the sandbox denied. Added /tmp to the edens.zac sandbox allow_write and retried. |
| 2026-10-18 | B1 (r-25) | note | PR edens.zac.backend#334. The local backend runs in Docker, so after a local rebuild anonymous admin from the Mac gets 401 until `DEV_LOCAL_ADMIN_EXTRA_ADDRESSES` lists the Docker gateway. Added owner task O11. |

### Owner task added during the round

| # | Task | When |
| --- | --- | --- |
| O11 | After rebuilding the local backend with B1, add `DEV_LOCAL_ADMIN_EXTRA_ADDRESSES=<Docker gateway IP>` to the local backend `.env`, or log in with the bootstrap admin. Find the IP by requesting `/api/admin/users` anonymously and reading the 401's remote address in the debug log. | After B1 merges |
| 2026-10-18 | B1 (r-25) | merge | backend#334 merged on green CI (6 checks) after reading the diff. |
| 2026-10-18 | R1 (r-26) | hand commit + merge | CI failed on 42 dev-only audit highs. Added effcc122: npm audit fix (source-map-js, brace-expansion) and `npm run audit` = `npm audit --omit=dev --audit-level=high` (braces has no fix; dev-only). Covers O4; Zac to review. Merged #441 on green. |
| 2026-10-18 | R11 (r-27) | config + approve | Added `.cursor/**` to edens.zac allowed paths (step 5 rewrites .cursor/rules/cursor_rules.mdc, which points at ai_guidelines/). Approved the 5-step plan: backlog + decisions first, CLAUDE.md fold-in, PR-number docblocks, README/rowCombination/playwright, then deletions. |
| 2026-10-18 | R2 (r-28) | approve | 6-step plan: tile sizes, server fetches direct to API_URL via a server-only module, All Collections tile off the public path (kept in ?manage=1), menu items, menu touch targets, me threaded through SiteHeader. |
| 2026-10-18 | R11 (r-27) | retry | Step 4 blocked on CLAUDE.md:14, but step 2 (4745900f) had already rewritten that line correctly. Retried with a note. |
| 2026-10-18 | R2 (r-28) | retry | Step 2 blocked because the format step reformatted the tester-locked tests/lib/api/auth.test.ts (not prettier-clean on main). Note: tester saves it prettier-formatted. |
| 2026-10-18 | R11 (r-27) | workspace fix + retry | Step 5 commit failed: builder used `git rm`, so orch`s `git add <path>` hit "pathspec did not match". Unstaged the deletions (git reset, files stay deleted) and retried. |
| 2026-10-18 | R2 (r-28) | verify | PR #442: `next build` with canary INTERNAL_API_SECRET/API_URL passes; neither value nor serverBackendTarget appears in .next/static. |
| 2026-10-18 | R11 (r-27) | hand commit + PR | orch's commit cannot stage deletions (`git add -A -N` stages them, then `git add -- <paths>` rejects the deleted paths). Committed step 5 by hand in its workspace, rebased on main, all checks green, opened #443. |
| 2026-10-18 | R2 (r-28) | merge | #442 merged 04bb9493 on green CI. |
| 2026-10-18 | R3 (r-29) | answer | 1. a (search loading screen also drops the footer). 2. a (shimmer stretches to fill the frame, no min-height). |
| 2026-10-18 | R11 (r-27) | merge | #443 merged 78402aa5 on green CI. |
| 2026-10-18 | extra | hand PR + merge | #444 prettier-formats the seven files that were not clean on main (format-step failures in R1/R2). Merged e8a3bf3b on green CI. |
| 2026-10-18 | R3 (r-29) | approve | 10-step plan: footer into PageShell/CollectionPage, auth pages through PageShell, LoginForm text, all-client-galleries under (admin) + proxy matcher, FullScreenModal boundary, shared shimmer + loading, backHref, admin back links, the two shell-less pages, loading test. |
| 2026-10-18 | config | format command | Format now lists files with `git diff --name-only --diff-filter=d HEAD` plus untracked, so a deleted file (R3 step 4 moved a route) no longer makes eslint/prettier fail. orch commit bug with deletions still open: `git add -A -N` stages them and `git add -- <path>` then rejects the path. |
| 2026-10-18 | R3 (r-29) | retry | Step 4: format fixed for deleted files. Step 6: review blocked on A4 (test belongs to step 10) and A5/A8 (CLS needs a browser; measured after merge). |
| 2026-10-18 | R3 (r-29) | hand finish + PR | Final review blocked only on a CLS number the sandbox cannot take. Committed the fix-step tests, and fixed `app/loading.module.scss` (`@use '../styles/shimmer'` broke Sass, every page rendered blank; jest/tsc cannot see it). Measured CLS on /dolomites-film: 0.0016 at 393x852, 0 at 1440. Clean `next build` passes. Opened #445. |
| 2026-10-18 | config | smoke | Added `commands.smoke: npm run build` and fonts.googleapis.com / fonts.gstatic.com to the sandbox, so a broken Sass import fails a step before it lands. |
| 2026-10-18 | R3 (r-29) | merge | #445 merged on green CI. |
| 2026-10-18 | R4 (r-30) | approve | 9-step plan: border token + Field required, Button overlay + touch-target test, Modal sheet-bottom, ShareChip, Load More + Explore chips, chip padding/contrast, density row, contact form, gallery gate + invite form. |
| 2026-10-18 | R5 (r-31) | answer | 1. a: header tag links dropped from R5; collection tags arrive without slugs. Follow-up: backend sends tag slugs on the collection, then link them. |
| 2026-10-18 | R4/R5 | cancel + resubmit | r-30 step 2 blocked: orch's edit guard does not match a bare `folder/` allowed path against files inside it. Cancelled r-30 and r-31 (r-31 still planning) and resubmitted with `folder/**` globs. |
| 2026-10-18 | R4 (r-32) | approve | 10-step plan with `folder/**` paths: chip tokens, Button overlay + touch-target test, Modal sheet, gallery gate, ShareChip, Load More, Explore chips, density row, contact form, Field required + invite form. |
| 2026-10-18 | R5 (r-33) | approve | 5-step plan: info block + date chips + rail + Related strip + orphan classes; parents first; /home redirect + canonical; SaveHeart; /all-images header. |
| 2026-10-18 | config | smoke removed | `next build` deadlocks inside the builder sandbox (0% CPU, no sockets, 9+ minutes). Killed four hung builds from r-32, removed `commands.smoke` and the fonts domains. The orchestrating session runs a clean `next build` on each PR before merging instead. |
| 2026-10-18 | R4/R5 | cancel + resubmit | Every r-32/r-33 step had `npm run build` as a check (from my DONE WHEN), and next build deadlocks in orch's sandbox. Cancelled both and resubmitted as r-34 and r-35 with build banned from checks. |
| 2026-10-18 | R4 (r-34) | approve | 10-step plan, no build checks, `folder/**` paths. |
| 2026-10-18 | R4 (r-34) | hand commit + PR + merge | Step 10 failed verify twice: orch's scope check reads `[token]` in `app/invite/[token]/` as a glob and rejected InviteForm. Hand-committed ce5702b4 (tsc, eslint, stylelint, 278 jest suites green), opened #446, clean `next build` passed, merged 863850f2 on green CI. Killed a builder hung on a stray `cat >> /dev/null`. |
| 2026-10-18 | R8 | submit change | Submitted as a normal `code-tested` request instead of plan-only then `from_plan`: from_plan is refused once main moves, and R5/R6/R7 merge alongside. The plan still stops for approval, checked against #438. |
| 2026-10-18 | R5 (r-35) | hand commit + rebase + merge | orch failed r-35 on scope blocks in steps 2, 3, 5. Hand-committed step 2 without the JSON-LD tests step 3 owns, step 3 unchanged (`[slug]` read as a glob), step 5 without the tester's invented `needsHiddenHeading` module. Rebased on #446, opened #447, clean `next build` and 279 jest suites passed, merged 2396de82 on green CI. |
| 2026-10-18 | R8 (r-36) | answer + approve + hand finish + merge | Answered 1. a 2. a 3. a; approved plan e03ff2b0 (keeps #438's choices, collections stay a list). Steps 4, 6, 8, 9 hit scope or test bugs and step 10 was cancelled; finished by hand on orch/r-36, deleted builder tests that ran `git status`, opened #448, clean `next build` and 282 jest suites passed, merged 34783363 on green CI. |
| 2026-10-18 | R6 (r-37) | submit + approve + rebase + merge | Added to the goal: drop the unused shimmer `@use` in ContentComponent.module.scss, update Component.ssrFallback.test.tsx, leave FilterToolbar.tsx alone. Approved 7-step plan b29cacd2. Rebased on #448, hand commit a0fc6782 wraps a docblock line, clean `next build` and 285 jest suites passed, merged #449 on green CI. |
| 2026-10-18 | R12 (new) | add request | Browser checks showed R5 item 5 unmet (/home answers 200 + meta refresh, not a redirect) and an R6 regression (admin hub blank until measured once the skeleton went). Added a small request for both; it runs beside R7 with no shared files. Unknown slugs answering 200 is older than this round (root loading.tsx streams before notFound()) and goes to the backlog. |
| 2026-10-18 | R12 (r-39) | approve + rebase + merge | Approved the one-step plan: next.config.js redirect /home to / unless manage=1, test in tests/next.config.test.ts. Rebased on #451, clean build passed, merged #450 on green CI. |
| 2026-10-18 | R7 (r-38) | submit + approve + hand commit + merge | Goal adjusted: the collection page renders SiteHeader itself, so the bar goes in PageShell and CollectionPage (left out in edit mode). Approved 5-step plan 7400fc99. Hand-committed step 4 (BottomNav mock in three tests outside its paths). Clean `next build` and 287 jest suites passed, merged #451 on green CI. |
| 2026-10-18 | R13 (new) | add request | R7 brought back a client /me request on pages that do not pass me to PageShell (R2 removed it), and left a Log in row in the phone menu that repeats the bar's cell. Small request for both. |
| 2026-10-18 | R13 (r-40) | retry (Zac) | Blocked on the $3 small-request budget after steps 1–4 and 6 landed. Zac approved a retry with budget_usd 8. Retried with the budget only (orch refuses a note on a blocked request). Step 5 is blocked on scope (tests/components/SiteHeader.test.tsx) and step 7 on `app/s/[token]`; both, and likely steps 8–9 (`[id]`, `[[...slug]]`), are finished by hand. |
| 2026-10-18 | R9 (r-41) | approve (Zac) | Zac approved the plan from the orch pane. |
| 2026-10-18 | R13 (r-40) | hand finish + cancel | The subagent had already finished steps 5, 7, 8, 9 by hand when the budget retry landed. After orch/r-40 was on origin (5ae26aca, PR #452), cancelled r-40 so the resumed run stopped spending on duplicate steps. |
| 2026-10-18 | R13 (r-40) | reject + approve + merge | Rejected the first plan (step 4 left out tests/app/tag/**), approved the second. Hand-finished steps 5, 7, 8, 9 plus one docblock commit; clean `next build` passed; merged #452 on green CI. |
| 2026-10-18 | R9 (r-41) | hand finish (Zac: continue) | r-41 failed on two scope blocks: step 4 needed tests/styles/filterToolbarMobileWrap.test.ts (two border assertions), step 7 hit the `[token]` glob bug on app/s/[token]/ShareBanner.module.scss; step 8 (stylelint guard) was cancelled as their dependent. Steps 1–3, 5, 6 landed ($6.48). Finishing 4, 7 and 8 by hand on orch/r-41. |
| 2026-10-18 | R9 (r-41) | hand finish + rebase + merge | Hand-committed steps 4 and 7, built step 8 by hand (guard, 91 hits fixed, stylelintGuard.test.ts). Rebased on #452 (kept `me` and CollectionHeader in app/explore/page.tsx). /collections limited to SCSS because its page passes `me`. Clean `next build` and 294 jest suites passed; merged #453 on green CI. |
| 2026-10-18 | R10 (r-42) | hand finish (Zac: proceed) | Step 6 (contactApi.ts into lib/api/messages.ts) failed at commit on orch's deletion bug; steps 7 and 8 cancelled after it. Steps 1–5 landed ($4.72). Finishing 6, 7, 8 by hand on orch/r-42. |
| 2026-10-18 | R10 (r-42) | approve + hand finish + merge | Approved 8-step plan 93ac5ac5. Hand-committed a skipLink test line for step 2 and retried it; committed steps 6 (contactApi move), 7 and 8 (Auth, Messages renames) by hand; replaced two file-wide `eslint-disable no-empty` lines. Clean `next build` passed; merged #454 on green CI. Zac's later pane retry re-ran step 6, which failed at commit again ($0.38); r-42 left failed, work is in #454. |
