# Handoff: 2026-10-17 review round, stopped mid-wave 4

Written 2026-10-18 by the first orchestrating session, which stopped because its context grew too large. Read this file, then the status table and "Delegated answers log" at the end of [04-orch-plan.md](04-orch-plan.md). Wave definitions, the remaining R6–R10 goals and owner tasks are in that file.

## Where things stand

| Id | What | State |
| --- | --- | --- |
| P | Prep | #440 merged |
| R1 | Unblock CI, security, message rows | #441 merged, browser-checked |
| R11 | Docs consolidation | #443 merged |
| B1 | Backend parent covers, dev hardening | edens.zac.backend#334 merged; not deployed (O10) |
| R2 | Speed and the menu | #442 merged, browser-checked; Lighthouse baseline in the status table |
| R3 | Page frame | #445 merged, browser-checked (CLS 0.0016 phone / 0 desktop) |
| extra | Prettier cleanup of 7 files | #444 merged |
| R4 | Controls, forms, touch targets | **orch r-34**: plan approved, waiting to execute |
| R5 | Collection page header | **orch r-35**: plan approved by Zac, building |
| R6–R10 | | not started |

`main` is at `3cd5a60b` plus whatever R4/R5 merge. The main checkout is on `main`, with uncommitted status-table edits in `04-orch-plan.md`. Commit them in the next small PR that touches docs. `docs/reviews/**` is protected from orch, so that PR is by hand.

## What Zac delegated

For the rest of this round, the orchestrating session may:
- approve orch plans that match their goal,
- answer planner questions with the recommended option,
- merge each PR once its required CI is green and the diff has been read (merge commit).

Log every such call in the "Delegated answers log" table. Zac wants no interruptions until everything is ready for his review.

## How to run the next session (thin, so context stays small)

The first session ran out of room because it read full `orch status` JSON (5–20k tokens each), step reports, logs and diffs, and reacted to every monitor event. Do this instead:

- **Use the CLI summary, not the MCP status JSON.** Run `orch status r-N | head -40` and `orch watch r-N | tail`, with the Bash sandbox off, because orch writes under `~/.orch`. Only open a step report when a step fails.
- **Give each request to a subagent.** One `general-purpose` subagent per request (R4, R5, then R6/R7/R8, R9, R10) should:
  - approve the plan if it matches the goal,
  - retry on known failures,
  - read the PR diff,
  - run the clean build (below),
  - merge on green CI,
  - do the browser check from `04-orch-plan.md`.

  It returns a five-line summary. The main session only starts subagents and updates the status table.
- **Don't watch with Monitor.** A subagent can block on `orch watch r-N --follow` itself.

## Known orch problems and their workarounds

1. **`npm run build` deadlocks inside orch's sandbox.** It sits at 0% CPU and the builder times out after 30 minutes.
   - Never put it in a goal's DONE WHEN, a check, or `commands.smoke`. The R6–R8 goals below already say so.
   - Before merging each PR, run a clean build yourself in a clean orch worktree with the sandbox off. The main checkout has stale `.next*/types` folders that break `tsc`.
   - This matters because only `next build` or the dev server catches a broken Sass `@use` path. R3 shipped one that blanked every page, and jest, tsc, lint and orch's reviewers all passed it.
2. **Allowed paths need `folder/**`.** A bare `folder/` matches nothing, and the builder gets blocked. Pass files to `submit` as `folder/**` too.
3. **Planners leave existing tests out of a step's allowed paths.** orch never widens allowed paths on retry, so a missed test means cancelling and resubmitting. Every goal says to put pinning tests in the step that breaks them.
4. **orch's commit can fail on file deletions.** Its `git add -A -N` stages them, then `git add -- <paths>` rejects the deleted path. R11's deletion step was committed by hand. R3's route move landed after the format command was fixed, so moves can work. The real fix is a change in `~/Code/orch`; see Follow-ups.
5. **Reviewers block on CLS or browser numbers the sandbox can't take.** Goals say not to ask for them. If a reviewer blocks anyway:
   - take the measurement in the browser on the 3001 preview,
   - commit the reviewed step by hand,
   - open the PR yourself (that's how R3 finished).
6. **Workspaces can keep stray staged files from earlier attempts.** Builders can't unstage them, because their sandbox blocks `.git/index.lock`. Restore them by hand with `git -C <worktree> restore --staged --worktree -- <files>`.
7. **orch opens PRs as drafts.** Run `gh pr ready N` before `gh pr merge N --merge`.
8. **The 3001 preview loops on reloads if `node_modules` changes under it.** Restart the preview.

Current edens.zac orch config:
- `landing: pr`
- format runs only on changed, non-deleted files under `app/` and `tests/`
- no smoke command
- sandbox may write `/tmp`
- `.cursor/**` is allowed

The backend config allows `docker-compose.yml` and `.claude/CLAUDE.md`.

## Next steps, in order

1. **R5 (r-35).** Zac approved its plan. Let it build. Header tag links are out of scope: collection tags arrive without slugs.
2. **R4 (r-34).** It has been approved and is waiting to execute. If it never leaves "approve stage", ask Zac to check the orch service.
3. **After R4 and R5 merge:**
   - Run the clean build.
   - Browser-check at 393x852:
     - `/dolomites-film`: the cover-to-first-row gap is about 230px, and Related scrolls sideways with parents first.
     - `/home` redirects to `/`.
     - `/all-images` shows a title and a count.
     - Tap each density segment.
     - The contact form's Send button is visible on a 667px-tall window.
4. **Wave 5, in parallel:**
   - R6 starts after R5.
   - R8 starts after R4. Use `plan-only` with `build_workflow: "code-tested"`, then `from_plan`.
   - R7 starts after R4 and R5.
   - Use the goals in the appendix and the file lists in `04-orch-plan.md`, rewritten as `folder/**`.
5. **R9**, then **R10**. Their goals are in `04-orch-plan.md`. Add the same three paragraphs the appendix goals carry (allowed paths, no build, existing tests). R10 decision 3 is (a): delete the array branch.
6. **Close-out** per `04-orch-plan.md`.

## Owner tasks for Zac

| Task | What |
| --- | --- |
| O1 + O2 | Face / Touch ID env fix on EC2, then a phone test |
| O4 | Review the CI audit scope change. #441 made `npm run audit` skip dev deps, because braces has no fix. |
| O5, O6 | Not started |
| O7 | After the R3 deploy, check that streaming shows no footer during loading on a phone |
| O9 | Local doc cleanup |
| O10 | Redeploy the backend with `deploy.sh` |
| O11 (new) | After rebuilding the local Docker backend, set `DEV_LOCAL_ADMIN_EXTRA_ADDRESSES` to the Docker gateway, or log in |
| Cleanup | Remove the stale worktree `.claude/worktrees/quirky-chaplygin-aeb1da` (its work is in #440), plus `.next-review/` and `.next-r28/`. Removal was denied to the agent. |

## Follow-ups outside this round

- **orch bug:** `adapters/git.py` `add()` should skip paths already staged as deleted, or `git rm --cached` them. The repro is in this round's log.
- **orch bug:** the step scope check reads `[` and `]` in route folders (`app/[slug]/`, `app/invite/[token]/`) as glob characters and rejects files in them. R4 and R5 steps were finished by hand for this.
- **Backend:** send tag slugs on collection reads, so the frontend can link header tags (dropped from R5).

## Appendix: wave 5 goals (ready to paste)

### R6

```
Fix and share the code behind /search, /location/[slug] and /tag/[slug], from
docs/reviews/2026-10-17/01-design-review.md §4, §5, §8 and 02-code-review.md §4.

1. Write tests/components/LocationPage/LocationPageClient.test.tsx first; it has no test today.
2. Extract useFilteredImagePage(images, buildCriteria) into app/hooks/, shared by
   LocationPageClient and SearchPageClient (02 §4 "The real remaining duplication" item 2). Move
   the shared FilterToolbar prop block into filterToolbarUtils.ts. CollectionPageClient is not a
   caller.
3. /tag (01 §5 step 11): /tag/alpine showed "Untitled". PR #440 fixed getAllTags, which mapped a
   tagName field the backend never sends (it sends name), so check whether that already fixed it
   before changing anything. Then delete the 'Untitled' fallback, and make an unknown slug
   (/tag/film) a 404. Give the tag page an empty state when it has no photos.
4. A "Clear filters" Button in the filtered-to-zero empty states on SearchPageClient and
   LocationPageClient (01 §8 item 6).
5. Thread resolveSsrViewport() into SearchPageClient, TaxonomyPage and LocationPageClient the way
   CollectionPageWrapper does, then delete the .layoutSkeleton early return in Component.tsx and its
   SCSS (only the .layoutSkeleton block of ContentComponent.module.scss) and docblock (01 §4 step
   6). The shimmer partial app/styles/_shimmer.scss stays; app/loading.module.scss still uses it.

Allowed paths: write a folder as `folder/**`; orch's edit guard does not match a bare `folder/`
against the files inside it. Sass partials under app/styles/ are imported with a path relative to
the importing file (from app/components/X/ it is '../../styles/name'); a wrong path blanks every
page. Do not run `npm run build` yourself: it deadlocks inside this sandbox. The orchestrating
session runs a clean build on the PR before merging.

Before planning, find existing tests that pin behaviour this changes and put each in the allowed
paths of the step that breaks it; orch will not widen a step's allowed paths later. Do not ask a
reviewer for a browser measurement; the orchestrating session checks layout and CLS in the browser
after merge.

MUST HOLD: filter URL state behaviour unchanged (router.replace, chips in the URL); the
Location-only behaviour (non-image blocks kept, LocationCollections above the toolbar) stays; no
inline comments inside function bodies (docblocks only); do not touch files that are not part of a
step.
DONE WHEN: /tag/alpine shows its tag name; /tag/film returns 404; jest, type-check, lint, stylelint pass.
```

### R7

```
Mobile navigation from docs/reviews/2026-10-17/01-design-review.md §5 "What we will do" steps 4
and 5, plus the dialog duplication in 02-code-review.md §4 item 3.

1. New app/components/ui/BottomNav (TSX + SCSS module): mobile only (display none at
   width >= 768px), cells Menu, Explore, Collections, and a fourth cell: Log in when anonymous,
   otherwise "Your space" (decided 7a; /admin for admins, /user otherwise, matching the menu since
   #442). Height 56px plus env(safe-area-inset-bottom); body gets matching padding-bottom under
   768px; z-index var(--z-sticky); active cell aria-current="page" with the EditBar active-tab rule.
   Rendered from PageShell next to SiteHeader, with a hideBottomNav prop that CollectionPageWrapper
   sets in edit mode; not rendered while EditBar is mounted. SiteHeader hides its hamburger under
   768px so there is one menu button. BottomNav reads the server-resolved me that PageShell already
   passes to SiteHeader.
2. The menu on phones is a bottom sheet: bottom-anchored, scrim that closes on tap, close button in
   the sheet's last row, click-outside on all widths; the sheet hides the three rows the bar
   carries. Desktop keeps the 400px top-right panel.
3. Extract useDialogFocus(ref, open, onClose) into app/hooks/ (focus trap, Escape, restore focus,
   body scroll lock) and use it from both Modal and MenuDropdown (02 §4 item 3).
4. The Contact row in the menu opens ContactChip's existing modal instead of an inline ContactForm.
5. Filter dropdown panels open as Modal variant="sheet-bottom" under 768px (the variant exists
   since R4).

Allowed paths: write a folder as `folder/**`; orch's edit guard does not match a bare `folder/`
against the files inside it. Sass partials under app/styles/ are imported with a path relative to
the importing file (from app/components/X/ it is '../../styles/name'); a wrong path blanks every
page. Do not run `npm run build` yourself: it deadlocks inside this sandbox. The orchestrating
session runs a clean build on the PR before merging.

Before planning, find existing tests that pin behaviour this changes and put each in the allowed
paths of the step that breaks it; orch will not widen a step's allowed paths later. Do not ask a
reviewer for a browser measurement; the orchestrating session checks layout and CLS in the browser
after merge.

MUST HOLD: do not edit filterToolbarUtils.ts (R6 owns it); desktop navigation unchanged; /search
gets no cell or menu row (open question SD4); the fullscreen viewer still covers the bar; keyboard
focus order and Escape behaviour of both dialogs unchanged, so all existing MenuDropdown and Modal
tests pass unmodified apart from item changes; no inline comments inside function bodies; do not
touch files that are not part of a step.
DONE WHEN: jest, type-check, lint, stylelint pass.
```

### R8

```
Rework the admin hub's lists per docs/reviews/2026-10-17/01-design-review.md §6 and
02-code-review.md §4 item 1.

The review was written against 9f7302b7. PR #438 (e98957ca) landed after it and already made the
four panels tabs of one ListPanel with one collapse, a ?list= tab, a toolbar line and PanelAction.
First, list which items of 01 §6 "What we will do" steps 2 to 6 and the scorecard #438 already
covers, and plan only what is left. Where #438 chose differently from the review, keep #438's
choice and say so in the plan.

What the review asks for, to check against the current code:
1. ListPanel re-skin: page background, one --color-border hairline between rows, no --lp-* grey
   ramp, no collapsed body sliver, row padding 8/8, hover --color-overlay-soft. Delete the dead
   [data-surface='dark'] ramp in ListPanel.module.scss.
2. One row shape for all lists: primary text, a muted secondary after a middle dot, one line,
   ellipsised, a small muted fact on the right, nothing clickable in the row except the row itself.
   Tapping a row opens a detail sheet (Modal variant="sheet-bottom" on phones, overlay on desktop)
   that holds the per-row actions. The table in 01 §6 lists what each sheet holds. MessageRow got
   its own stylesheet in #441; build on it.
3. Hub order: nav tiles before the list panel; tab order Messages, Users, Collections, Roles; the
   Admin segment shows the unread message count from the messages read loadAdminHub already makes.
4. A PanelBody component next to ListPanel for the shared loading / error / empty / stale
   rendering, with a default error message derived from the panel key in useCachedPanelData
   (02 §4 item 1).
5. /metadata lists: no half-cut last row, and a gap above the footer (the footer moved into
   PageShell in #445).

Allowed paths: write a folder as `folder/**`; orch's edit guard does not match a bare `folder/`
against the files inside it. Sass partials under app/styles/ are imported with a path relative to
the importing file (from app/components/X/ it is '../../styles/name'); a wrong path blanks every
page. Do not run `npm run build` yourself: it deadlocks inside this sandbox. The orchestrating
session runs a clean build on the PR before merging.

Before planning, find existing tests that pin behaviour this changes and put each in the allowed
paths of the step that breaks it; orch will not widen a step's allowed paths later. Do not ask a
reviewer for a browser measurement; the orchestrating session checks layout and CLS in the browser
after merge.

MUST HOLD: the 2026-08-13 decision that collections stay a list, not a tile grid; collapse state
stays in AdminHubClient and agrees between server and client; nothing moves into the upper chip
tier; no inline comments inside function bodies; do not touch files that are not part of a step.
DONE WHEN: jest, type-check, lint, stylelint pass.
```

