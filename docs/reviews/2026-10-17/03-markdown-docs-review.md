# Markdown docs review: what to keep, merge and delete

Reviewed 2026-10-17 at `main` @ `9f7302b7` (2026-09-15). Covers all 60 tracked markdown files (16,280 lines): README, CLAUDE.md, `ai_guidelines/`, `docs/000-009`, `docs/previous-work.md`, `docs/browser-diagnostics.md`, `docs/user-flow/`, `app/utils/rowCombination.md`, `.claude/agents/`, `.claude/agent-memory/`, and the two `docs/spikes/` boards with their group files. Also lists the gitignored local markdown on disk. For Zac, who decides and then does the consolidation.

## Thesis

Six tracked markdown files should survive, about 750 lines in total: `README.md` (trimmed and corrected), `CLAUDE.md` (grown to hold every Claude-facing rule), `app/utils/rowCombination.md` (history cut), `docs/browser-diagnostics.md` (unchanged), and two new files, `docs/backlog.md` (every open item, one row each) and `docs/decisions.md` (every answered or rejected decision, one line each). The other 54 files are deleted: they are shipped-work narrative that git holds, generic tutorial, rules repeated in two to four places, or boards whose counts and statuses drifted within a day of their last edit. The review found 57 false, stale or self-contradicting claims across the set, listed in section 2.

First three moves, in this order so no link dangles: write `docs/backlog.md` and `docs/decisions.md` from section 5 (the only content that is not recoverable from git); grow `CLAUDE.md` with the roughly 120 live lines from `ai_guidelines/` plus 11 process rules from the boards, and fix the four code docblocks that cite a board path; then delete everything else, drop the four `.gitignore` negations, and trim README and `rowCombination.md`. Section 6 has the decisions this needs from you before step three, the biggest being whether the backend's new `DevLocalAdminFilter` makes `CLAUDE.md:14` wrong.

## Contents

1. [Inventory](#1-inventory)
2. [False or stale claims](#2-false-or-stale-claims)
3. [Overlap map](#3-overlap-map)
4. [Target structure and migration](#4-target-structure-and-migration)
5. [Open backlog](#5-open-backlog)
6. [Discrepancies that need a decision](#6-discrepancies-that-need-a-decision)
7. [Priority list](#7-priority-list)
8. [Appendix: verification notes](#appendix-verification-notes)

## 1. Inventory

Every tracked markdown file. `git ls-files | grep '\.md$'` returns exactly these 60. Lines are `wc -l`; dates are the file's last commit on `main`.

| Path | Lines | Last commit | Purpose | Verdict |
| --- | ---: | --- | --- | --- |
| [README.md](../../../README.md) | 267 | 2026-09-05 | GitHub landing page: stack, features, setup, local admin login | TRIM to ~120, fix tree, env vars, routes, screenshots |
| [CLAUDE.md](../../../CLAUDE.md) | 70 | 2026-09-15 | Always-loaded project rules for Claude Code | KEEP, grow to ~175 |
| [ai_guidelines/ai_main.md](../../../ai_guidelines/ai_main.md) | 67 | 2026-06-06 | Core principles, stale project context | DELETE (line 53 to CLAUDE.md, line 57 to backlog) |
| [ai_guidelines/ai_quick_reference.md](../../../ai_guidelines/ai_quick_reference.md) | 133 | 2026-09-05 | Naming, import order, structure, mistakes list | MERGE INTO CLAUDE.md (~40 lines) |
| [ai_guidelines/ai_test.md](../../../ai_guidelines/ai_test.md) | 170 | 2026-08-30 | Test patterns, mocks, fixture gotchas | MERGE INTO CLAUDE.md (~10 lines) |
| [ai_guidelines/ai_lint.md](../../../ai_guidelines/ai_lint.md) | 95 | 2026-09-05 | Lint order and the autofix gotcha | MERGE INTO CLAUDE.md (~20 lines) |
| [ai_guidelines/ai_api.md](../../../ai_guidelines/ai_api.md) | 191 | 2026-07-27 | API patterns, collection kind model | MERGE INTO CLAUDE.md (~15 lines) |
| [ai_guidelines/ai_typescript.md](../../../ai_guidelines/ai_typescript.md) | 275 | 2026-07-27 | TS rules, React 19 types, upgrade history | MERGE INTO CLAUDE.md (~25 lines) |
| [ai_guidelines/ai_css.md](../../../ai_guidelines/ai_css.md) | 64 | 2026-06-06 | Gap-not-padding rule | MERGE INTO CLAUDE.md (6 lines) |
| [docs/000-summary.md](../../../docs/000-summary.md) | 109 | 2026-09-15 | Index of the chapter docs | DELETE |
| [docs/001-design-review.md](../../../docs/001-design-review.md) | 29 | 2026-07-28 | Design-system epic, fully shipped | DELETE (2 CSS sweeps to backlog) |
| [docs/002-performance.md](../../../docs/002-performance.md) | 49 | 2026-09-05 | Perf epic, mostly shipped | DELETE (open items to backlog, dedupe vs PF rows) |
| [docs/003-client-gallery-security.md](../../../docs/003-client-gallery-security.md) | 39 | 2026-09-05 | Gallery password epic | DELETE (lines 16-20 to backlog) |
| [docs/004-content-discovery.md](../../../docs/004-content-discovery.md) | 57 | 2026-09-05 | Search and filter epic | DELETE (open items already on board as CT5, SD4, SD6) |
| [docs/005-layout.md](../../../docs/005-layout.md) | 43 | 2026-08-24 | Layout epic, shipped | DELETE |
| [docs/006-code-health.md](../../../docs/006-code-health.md) | 90 | 2026-09-05 | Refactor and test epic | DELETE (open items to backlog) |
| [docs/007-security-hardening.md](../../../docs/007-security-hardening.md) | 39 | 2026-08-24 | Security epic | DELETE (3 rows to backlog, WAF decision to decisions) |
| [docs/008-collection-admin.md](../../../docs/008-collection-admin.md) | 50 | 2026-08-24 | Admin epic, staging collection spec | DELETE (lines 21-30 to backlog under MA2) |
| [docs/009-backend-and-vision.md](../../../docs/009-backend-and-vision.md) | 51 | 2026-09-15 | Backend contract, ABAC vision | DELETE (endpoints to backlog, watch-outs to backend repo) |
| [docs/previous-work.md](../../../docs/previous-work.md) | 182 | 2026-08-24 | Changelog through #293 | DELETE (git history) |
| [docs/browser-diagnostics.md](../../../docs/browser-diagnostics.md) | 97 | 2026-08-04 | DevTools console runbook | KEEP as is |
| [docs/user-flow/README.md](../../../docs/user-flow/README.md) | 157 | 2026-07-28 | June crawl of live collections, pre-typeless target model | DELETE with `.mmd` and `.svg` |
| [app/utils/rowCombination.md](../../../app/utils/rowCombination.md) | 267 | 2026-08-11 | Row composer design notes, next to the code | TRIM to ~150 |
| [.claude/agents/README.md](../../../.claude/agents/README.md) | 150 | 2026-02-22 | Subagent catalog | DELETE |
| [.claude/agents/code-reviewer.md](../../../.claude/agents/code-reviewer.md) | 95 | 2026-02-22 | Agent definition, used in 1 session | DELETE |
| [.claude/agents/debugger.md](../../../.claude/agents/debugger.md) | 95 | 2026-02-22 | Agent definition, never used | DELETE |
| [.claude/agents/doc-writer.md](../../../.claude/agents/doc-writer.md) | 67 | 2026-02-22 | Agent definition, never used | DELETE |
| [.claude/agents/explorer.md](../../../.claude/agents/explorer.md) | 71 | 2026-02-22 | Agent definition, used in 1 session | DELETE |
| [.claude/agents/implementer.md](../../../.claude/agents/implementer.md) | 55 | 2026-02-22 | Agent definition, never used | DELETE |
| [.claude/agents/linter-fixer.md](../../../.claude/agents/linter-fixer.md) | 59 | 2026-02-22 | Agent definition, never used | DELETE |
| [.claude/agents/refactor-rename.md](../../../.claude/agents/refactor-rename.md) | 83 | 2026-02-22 | Agent definition, never used | DELETE |
| [.claude/agents/scaffolder.md](../../../.claude/agents/scaffolder.md) | 115 | 2026-02-22 | Agent definition, never used | DELETE |
| [.claude/agents/scss-reviewer.md](../../../.claude/agents/scss-reviewer.md) | 106 | 2026-02-22 | Agent definition, never used | DELETE |
| [.claude/agents/test-writer.md](../../../.claude/agents/test-writer.md) | 66 | 2026-02-22 | Agent definition, never used | DELETE |
| [.claude/agent-memory/explorer/MEMORY.md](../../../.claude/agent-memory/explorer/MEMORY.md) | 60 | 2026-03-13 | Explorer agent memory, tracked despite `.gitignore:155` | DELETE and `git rm --cached` |
| [docs/spikes/2026-summer-refactor.md](../../../docs/spikes/2026-summer-refactor.md) | 1207 | 2026-09-08 | Refactor board: 50 rules, open-row table, open sections, run log | MERGE INTO backlog.md (7 rows) and decisions.md |
| [docs/spikes/2026-features.md](../../../docs/spikes/2026-features.md) | 1066 | 2026-09-08 | Feature board: 36 rules, 31-row board, decisions table | MERGE INTO backlog.md (31 rows) and decisions.md |
| [docs/spikes/2026-summer-refactor/group-a-deletions.md](../../../docs/spikes/2026-summer-refactor/group-a-deletions.md) | 299 | 2026-08-30 | Archive, 9 shipped write-ups | DELETE |
| [docs/spikes/2026-summer-refactor/group-b-tests.md](../../../docs/spikes/2026-summer-refactor/group-b-tests.md) | 377 | 2026-09-08 | Archive, 10 shipped write-ups | DELETE |
| [docs/spikes/2026-summer-refactor/group-c-bugs.md](../../../docs/spikes/2026-summer-refactor/group-c-bugs.md) | 766 | 2026-09-08 | Archive, 18 shipped write-ups | DELETE |
| [docs/spikes/2026-summer-refactor/group-d-security.md](../../../docs/spikes/2026-summer-refactor/group-d-security.md) | 697 | 2026-09-08 | Archive, 15 shipped write-ups | DELETE |
| [docs/spikes/2026-summer-refactor/group-e-consolidations.md](../../../docs/spikes/2026-summer-refactor/group-e-consolidations.md) | 1745 | 2026-09-08 | Archive, 18 shipped write-ups, E7 rejection | DELETE (E7 rejection to decisions) |
| [docs/spikes/2026-summer-refactor/group-f-structural.md](../../../docs/spikes/2026-summer-refactor/group-f-structural.md) | 713 | 2026-09-05 | Archive, 4 shipped, F1 and F3 history | DELETE (F3 rejection to decisions) |
| [docs/spikes/2026-summer-refactor/group-g-decisions.md](../../../docs/spikes/2026-summer-refactor/group-g-decisions.md) | 466 | 2026-09-08 | Archive, 6 shipped, G2 and G4 measurement history, G4 sweep script at line 409 | DELETE (sweep script command to the G4 backlog row) |
| [docs/spikes/2026-summer-refactor/group-h-features.md](../../../docs/spikes/2026-summer-refactor/group-h-features.md) | 357 | 2026-08-30 | Archive, 2 shipped, 4 parked design items, H1 history | DELETE (H2b, H4, H5, H6 to decisions) |
| [docs/spikes/2026-summer-refactor/lessons.md](../../../docs/spikes/2026-summer-refactor/lessons.md) | 553 | 2026-09-08 | 45 incident narratives behind the board rules | MERGE INTO CLAUDE.md (11 rules, no stories) |
| [docs/spikes/2026-summer-refactor/session-log.md](../../../docs/spikes/2026-summer-refactor/session-log.md) | 1374 | 2026-09-08 | 54 run entries, 2026-08-22 to 2026-09-06 | DELETE |
| [docs/spikes/2026-features/2026-09-04-board-review-handoff.md](../../../docs/spikes/2026-features/2026-09-04-board-review-handoff.md) | 458 | 2026-09-05 | One-time review handoff, applied 2026-09-05 | DELETE |
| [docs/spikes/2026-features/au-auth-accounts.md](../../../docs/spikes/2026-features/au-auth-accounts.md) | 145 | 2026-09-05 | AU1, AU2 context; AU3, AU4 closed | MERGE INTO backlog.md (AU1, AU2 rows) |
| [docs/spikes/2026-features/backend-handoff-MA1-EM2.md](../../../docs/spikes/2026-features/backend-handoff-MA1-EM2.md) | 123 | 2026-09-06 | Live backend ask: clear-a-field on PUT, `notifyEmails`, `passwordLoginAvailable` on GET | MERGE INTO backlog.md (3 backend-ask rows) |
| [docs/spikes/2026-features/backend-handoff-MA4-RC1.md](../../../docs/spikes/2026-features/backend-handoff-MA4-RC1.md) | 184 | 2026-09-05 | Handoff; MA4 half shipped (backend #300), RC1 `isFilm` re-measure owed | DELETE (RC1 row carries it) |
| [docs/spikes/2026-features/backend-handoff-RC3.md](../../../docs/spikes/2026-features/backend-handoff-RC3.md) | 100 | 2026-09-05 | Live backend ask: child summary on the COLLECTION content block | MERGE INTO backlog.md (1 backend-ask row) |
| [docs/spikes/2026-features/ct-collections-as-tags.md](../../../docs/spikes/2026-features/ct-collections-as-tags.md) | 95 | 2026-09-05 | CT1 to CT6 context | MERGE INTO backlog.md (6 rows) |
| [docs/spikes/2026-features/em-email-galleries.md](../../../docs/spikes/2026-features/em-email-galleries.md) | 115 | 2026-09-05 | EM1 to EM4 context; EM5 closed | MERGE INTO backlog.md (4 rows) |
| [docs/spikes/2026-features/ly-layout-decisions.md](../../../docs/spikes/2026-features/ly-layout-decisions.md) | 84 | 2026-09-04 | LY1, LY2 closed; 2 parked ideas | DELETE (parked ideas to decisions) |
| [docs/spikes/2026-features/ma-admin-manage.md](../../../docs/spikes/2026-features/ma-admin-manage.md) | 223 | 2026-09-05 | MA1 to MA6 context, mostly shipped-work narrative | MERGE INTO backlog.md (6 rows) |
| [docs/spikes/2026-features/pf-performance-platform.md](../../../docs/spikes/2026-features/pf-performance-platform.md) | 745 | 2026-09-08 | PF7, PF13, PF14, PF16 context; 11 closed | MERGE INTO backlog.md (4 rows) |
| [docs/spikes/2026-features/rc-similar-collections.md](../../../docs/spikes/2026-features/rc-similar-collections.md) | 151 | 2026-09-05 | RC1 to RC5 context, spike algorithm, D1 to D6 | MERGE INTO backlog.md (5 rows) |
| [docs/spikes/2026-features/sd-search-discovery.md](../../../docs/spikes/2026-features/sd-search-discovery.md) | 323 | 2026-09-05 | SD4, SD6, SD8 context; 5 closed | MERGE INTO backlog.md (3 rows) |
| [docs/spikes/2026-features/session-log.md](../../../docs/spikes/2026-features/session-log.md) | 301 | 2026-09-06 | 14 run entries, 2026-08-30 to 2026-09-05 | DELETE |

Totals: 60 files, 16,280 lines. Surviving after the change: 4 existing files plus 2 new ones, about 750 lines.

### Local-only markdown on disk (gitignored, not part of the PR)

| Directory | Count | Newest | What it is | Recommendation |
| --- | ---: | --- | --- | --- |
| `docs/handoffs/` | 9 | 2026-09-15 | Session handoff runbooks, `CURRENT-STATE.md`, `archive/` | Keep local. Delete anything older than `CURRENT-STATE.md` once its branch merged. |
| `docs/superpowers/plans/` | 39 | 2026-09-09 | MR-level plans the chapters link to | Delete the ones the chapters mark shipped (at least 20). Keep open ones local until built. |
| `docs/superpowers/specs/` | 23 | 2026-09-09 | Design specs the chapters link to | Same. Only the ABAC vision, the email/SES checklist and the staging spec hold un-built content. |
| `docs/spikes/` (8 loose files) | 8 | unverified | Research spikes (005 layout explorations, passkey diagnosis, graph navigation, cleanup spike and handoff) | Keep local. Once `docs/000-009` are deleted, nothing tracked links to them (see section 6). |
| `docs/_archive/` | 1 tar.gz | 2026-07-06 | Archived shipped plans | Delete. `docs/000-summary.md:110` says it is in git at `9352046`. |
| `todo/` | 1 | unverified | `backend-requirements-downloads.md` | Promote to a backend-repo issue, then delete. |
| `.superpowers/` | 97 | unverified | `brainstorm/` and `sdd/` task briefs and reports per plan | Delete. Execution scratch from finished runs. |
| `.claude/agent-memory/code-reviewer/` | 10 | 2026-07 | Review notes May to July | Delete with the agents. |
| `.claude/worktrees/quirky-chaplygin-aeb1da/` | full tree | 2026-09-15 | Stale worktree on `claude/quirky-chaplygin-aeb1da`, same commit as `main` | `git worktree remove` first; every grep doubles until it is gone. |

## 2. False or stale claims

Every claim found that the code or git contradicts. "Unverified" rows are marked as such and stay that way until someone checks.

| # | File:line | Claim | What the code or git says |
| --- | --- | --- | --- |
| 1 | [README.md:11](../../../README.md#L11), [:257](../../../README.md#L257), [:261](../../../README.md#L261) | Four `docs/screenshot-*.png` images | None tracked, none on disk. `git ls-files \| grep screenshot` is empty. The hero image and the Screenshots table render broken on GitHub. |
| 2 | [README.md:118](../../../README.md#L118) | `all-collections/` route | Deleted in 0243. The route is `app/collections/page.tsx`; [collectionSlugs.ts:49](../../../app/utils/collectionSlugs.ts#L49) records that the route no longer exists. |
| 3 | [README.md:113-116](../../../README.md#L113) | Admin and public route tree | Missing `(admin)/comments/`, `(admin)/metadata/`; `admin/users/` is `admin/users/[id]/`. Public tree omits `/search`, `/login`, `/user`, `/collections`, `/s/[token]`, `/invite/[token]`, `/all-client-galleries`, all present as `page.tsx`. |
| 4 | [README.md:125](../../../README.md#L125) | `ImageMetadata/` component directory | Renamed to `app/components/Metadata/` in #170. |
| 5 | [README.md:128](../../../README.md#L128) | `useCollectionData` hook | Deleted in the dead-code sweep (#255 to #263). No such file under `app/hooks/`. |
| 6 | [README.md:185-192](../../../README.md#L185) | Env vars `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_CLOUDFRONT_URL`, `NEXT_PUBLIC_BASE_URL` | Read nowhere in `app/`, `proxy.ts` or `next.config.js`. The code reads `API_URL` ([route.ts:9](../../../app/api/proxy/%5B...path%5D/route.ts#L9)), `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_ENV`, `INTERNAL_API_SECRET`. The CloudFront host is hardcoded at [next.config.js:15](../../../next.config.js#L15). No `.env.example` exists. |
| 7 | [README.md:231](../../../README.md#L231) vs [CLAUDE.md:14](../../../CLAUDE.md#L14) | README: "`ADMIN_BOOTSTRAP_PASSWORD` does not help". CLAUDE.md: log in with `ADMIN_BOOTSTRAP_EMAIL` / `ADMIN_BOOTSTRAP_PASSWORD` | They contradict each other. Which is right is unverified; the behaviour is backend-owned. |
| 8 | [CLAUDE.md:16](../../../CLAUDE.md#L16) | "Never modify legacy Pages Router files" | No `pages/` directory exists. [ai_main.md:14-18](../../../ai_guidelines/ai_main.md#L14) says the legacy directories were removed. |
| 9 | [ai_main.md:39](../../../ai_guidelines/ai_main.md#L39) | "Next.js 15 with App Router (migrating from Pages Router)" | `package.json` has `next ^16.2.6`. The same file's lines 14-18 say the migration is done. |
| 10 | [ai_main.md:40](../../../ai_guidelines/ai_main.md#L40) | "MySQL RDS" | PostgreSQL on EC2 ([README.md:22](../../../README.md#L22), [:234-236](../../../README.md#L234)). |
| 11 | [ai_main.md:49](../../../ai_guidelines/ai_main.md#L49) | "Frontend typically runs on 3001" | [CLAUDE.md:13](../../../CLAUDE.md#L13) and `.claude/launch.json`: 3000 is the user's server, 3001 the fallback. |
| 12 | [ai_main.md:9](../../../ai_guidelines/ai_main.md#L9), [:43](../../../ai_guidelines/ai_main.md#L43), [:62](../../../ai_guidelines/ai_main.md#L62) | "Legacy Preservation", "Transitioning from legacy Catalog/Image", "Legacy system must remain operational" | No legacy code exists. |
| 13 | [ai_main.md:57](../../../ai_guidelines/ai_main.md#L57) | About image hardcoded at `MenuDropdown.tsx:135` | Still hardcoded, at [MenuDropdown.tsx:274](../../../app/components/MenuDropdown/MenuDropdown.tsx#L274) and [About.tsx:18](../../../app/components/About/About.tsx#L18). Item open, line wrong. |
| 14 | [ai_quick_reference.md:118](../../../ai_guidelines/ai_quick_reference.md#L118) | `app/components/ImageMetadata/sections/CameraSettingsSection.tsx` | Path is `app/components/Metadata/sections/CameraSettingsSection.tsx` since #170. |
| 15 | [ai_quick_reference.md:8](../../../ai_guidelines/ai_quick_reference.md#L8), [:77](../../../ai_guidelines/ai_quick_reference.md#L77) | `useCollectionData` | Deleted. |
| 16 | [ai_quick_reference.md:67-68](../../../ai_guidelines/ai_quick_reference.md#L67) | `(admin)/` tree shows only `collection/manage/` | The group has five routes. |
| 17 | [ai_test.md:49](../../../ai_guidelines/ai_test.md#L49) | `GridSection` component | Does not exist. |
| 18 | [ai_test.md:143](../../../ai_guidelines/ai_test.md#L143) | `ContentImageModel.location` is `{ id; name } \| null` | The field is `locations: LocationModel[]` ([Content.ts:168](../../../app/types/Content.ts#L168)). No `location` field. |
| 19 | [ai_test.md:147-154](../../../ai_guidelines/ai_test.md#L147) | Component-test backlog checklist | `tests/components/` holds many component tests now. Planning residue. |
| 20 | [ai_test.md:15-83](../../../ai_guidelines/ai_test.md#L15) | Example tests import `fetchCollectionBySlug` and `processContentLayout` | Neither is exported. [core.ts:308](../../../app/lib/api/core.ts#L308) is `fetchReadApi`. `processContentLayout` not found under `app/utils/`; unverified beyond a grep for the export. |
| 21 | [ai_lint.md:66](../../../ai_guidelines/ai_lint.md#L66) | `.stylelintrc.cjs` | Does not exist. `.stylelintrc` does. |
| 22 | [ai_api.md:8](../../../ai_guidelines/ai_api.md#L8) | Write endpoints `/api/write/collections/*` | [core.ts:5-7](../../../app/lib/api/core.ts#L5) defines `READ`, `ADMIN`, `EDIT`. The write channel was deleted (#255 to #263). The code uses `edit/collections/`. |
| 23 | [ai_api.md:10](../../../ai_guidelines/ai_api.md#L10) | "Legacy system: Catalog/Image entities (maintain compatibility)" | No legacy system. |
| 24 | [ai_api.md:39-50](../../../ai_guidelines/ai_api.md#L39) | `fetchCollectionBySlug` in `app/lib/api/collections.ts` | No such export. |
| 25 | [ai_api.md:142-148](../../../ai_guidelines/ai_api.md#L142) | `enum ContentBlockType { IMAGE, TEXT, CODE, GIF }` | No such enum. The discriminator is the `ContentType` union at [Content.ts:29](../../../app/types/Content.ts#L29). |
| 26 | [ai_api.md:160](../../../ai_guidelines/ai_api.md#L160) | `url.searchParams.set('type', 'BLOG')` | Collections are typeless. |
| 27 | [ai_api.md:188-191](../../../ai_guidelines/ai_api.md#L188) | `app/utils/environment.ts` exports `API_URL` and `IS_DEVELOPMENT` | It exports only `isLocalEnvironment` ([environment.ts:1](../../../app/utils/environment.ts#L1)). `API_URL` is read at [route.ts:9](../../../app/api/proxy/%5B...path%5D/route.ts#L9). |
| 28 | [ai_typescript.md:210-220](../../../ai_guidelines/ai_typescript.md#L210) | tsconfig sets `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, `noUnusedLocals`, `noUnusedParameters` | [tsconfig.json:8](../../../tsconfig.json#L8) sets only `strict`. The two `noUnused*` flags are not implied by `strict` and are not set. |
| 29 | [ai_typescript.md:39](../../../ai_guidelines/ai_typescript.md#L39) | `import { type Collection, type ContentBlock } from '@/app/types/Collection'` | Neither name is exported. The model is `CollectionModel` ([Collection.ts:223](../../../app/types/Collection.ts#L223)). |
| 30 | [ai_typescript.md:243-244](../../../ai_guidelines/ai_typescript.md#L243), [:259-260](../../../ai_guidelines/ai_typescript.md#L259) | `react ^19.2.7`, `@types/react ^19.2.10`, `lucide-react ^1.17.0` | `package.json`: `^19.2.8`, `^19.2.18`, `^1.41.0`. |
| 31 | [ai_typescript.md:251](../../../ai_guidelines/ai_typescript.md#L251) | "one `forwardRef` (`Tile.tsx`, still valid in 19)" | Converted to ref-as-prop in #177. No `forwardRef` remains under `app/`. |
| 32 | [docs/000-summary.md:7](../../../docs/000-summary.md#L7) | "All go-forward plans live in `superpowers/plans/`" | `docs/superpowers/` is gitignored ([.gitignore:162](../../../.gitignore#L162)). Every chapter's Sections table links into it; every link is broken on a clone. Three linked plans are missing even locally: `2026-06-09-directional-prominence.md`, `2026-07-04-0203-admin-authz-implementation.md`, `007-proxy-route-gating.md`. |
| 33 | [docs/000-summary.md:3](../../../docs/000-summary.md#L3) | Reconciled against HEAD `53aaac4` (2026-08-24) | `main` is `9f7302b7` (2026-09-15). 31 PRs merged after #293, up to #437, are recorded nowhere in `docs/`. |
| 34 | [docs/000-summary.md:19](../../../docs/000-summary.md#L19) | `previous-work.md` is "current through #293" | `main` is at #437. |
| 35 | [docs/000-summary.md:80](../../../docs/000-summary.md#L80) | "Groups A, C (except C6, backend-blocked) and D are closed; B, E, G and H carry the remainder" | C6 shipped as #327 on 2026-08-24. Group F has three open items and is not mentioned. |
| 36 | [docs/000-summary.md:95](../../../docs/000-summary.md#L95) | `GET /api/read/content/images/search` is a backend blocker | [docs/004-content-discovery.md:29](../../../docs/004-content-discovery.md#L29) says `/search` shipped 2026-08-31 and was never backend-blocked. |
| 37 | [docs/000-summary.md:104](../../../docs/000-summary.md#L104) | Index has drifted twice, "twice is a pattern" | It has drifted a third time (rows 33 to 36). |
| 38 | [docs/003-client-gallery-security.md:7](../../../docs/003-client-gallery-security.md#L7), [:9](../../../docs/003-client-gallery-security.md#L9) | `ManageClient.tsx:1434` and `:1464` | `ManageClient` was deleted in 0179; line 21 of the same doc admits it. |
| 39 | [docs/004-content-discovery.md:42](../../../docs/004-content-discovery.md#L42), [:52](../../../docs/004-content-discovery.md#L52) | Search plan blocked until the backend ships the search endpoint | Line 29 of the same doc says `/search` shipped and was never blocked. |
| 40 | [docs/005-layout.md:16](../../../docs/005-layout.md#L16) | Add a "vertical penalty" comment to `contentRatingUtils.ts` | [contentRatingUtils.ts:38](../../../app/utils/contentRatingUtils.ts#L38) already says the penalty was retired. |
| 41 | [docs/006-code-health.md:37-38](../../../docs/006-code-health.md#L37) | `_chunkSize` on `createHeaderRow` and `_deletedIds` on `handleDeleteSuccess` still open, hook at `app/hooks/useCollectionEdit.tsx` | `_chunkSize` removed in E14 ([contentLayout.ts:594](../../../app/utils/contentLayout.ts#L594) docblock). `_deletedIds` absent from [useCollectionEdit.tsx](../../../app/components/ContentCollection/edit/useCollectionEdit.tsx), which is also the real path. Both shipped. |
| 42 | [docs/006-code-health.md:71](../../../docs/006-code-health.md#L71) | Filter chips on `/all-collections` are inert | Route deleted. |
| 43 | [docs/005-layout.md:26-31](../../../docs/005-layout.md#L26), [docs/006-code-health.md:52](../../../docs/006-code-health.md#L52), [docs/009-backend-and-vision.md:30](../../../docs/009-backend-and-vision.md#L30), [:40](../../../docs/009-backend-and-vision.md#L40), [docs/000-summary.md:52](../../../docs/000-summary.md#L52), [:72](../../../docs/000-summary.md#L72), [docs/user-flow/README.md:29](../../../docs/user-flow/README.md#L29) | Links to `spikes/005-*.md`, `spikes/2026-07-06-passkey-login-diagnosis.md`, `spikes/2026-07-26-collection-graph-navigation.md`, `spikes/2026-08-22-*.md` and a superpowers spec | All gitignored by [.gitignore:163](../../../.gitignore#L163) (`docs/spikes/*`) or `:162`. Broken on every clone. |
| 44 | [rowCombination.md:212](../../../app/utils/rowCombination.md#L212) | Link to `../../docs/superpowers/plans/2026-06-09-directional-prominence.md` | File does not exist locally and the directory is gitignored. |
| 45 | [rowCombination.md:208-267](../../../app/utils/rowCombination.md#L208) | "Known limitation" reproduction with a `cv` column, "should not be assumed fixed" | Written 2026-06-10 under the retired `cv` model. [docs/005-layout.md:13](../../../docs/005-layout.md#L13) says #184 resolved the motivating hero-isolation bug; `tests/utils/rowCombination.composition.test.ts` asserts two verticals equalize into full-height columns. Whether the exact `V4,H3,V4,V5,V5` row still misbehaves is unverified. |
| 46 | [.claude/agents/README.md:3](../../../.claude/agents/README.md#L3), [:8](../../../.claude/agents/README.md#L8) | Agents are spawned "via the `Task` tool" | The tool is `Agent`. |
| 47 | [.claude/agents/README.md:120](../../../.claude/agents/README.md#L120) | "Subagents cannot spawn sub-subagents" | Current Claude Code docs list `Agent` among the tools a subagent may be given. Unverified against the docs in this review. |
| 48 | [.claude/agent-memory/explorer/MEMORY.md:3](../../../.claude/agent-memory/explorer/MEMORY.md#L3), [:18-19](../../../.claude/agent-memory/explorer/MEMORY.md#L18), [:30](../../../.claude/agent-memory/explorer/MEMORY.md#L30) | "Next.js 15", `TEMPLATE_MAP`, `rowOptimizer.ts`, `reorderWithinRows` | All deleted in the V3 cutover (#145). The explorer agent would load and trust this. |
| 49 | [2026-summer-refactor.md:256](../../../docs/spikes/2026-summer-refactor.md#L256), [:338](../../../docs/spikes/2026-summer-refactor.md#L338), [:936-1036](../../../docs/spikes/2026-summer-refactor.md#L936); [group-h-features.md:328](../../../docs/spikes/2026-summer-refactor/group-h-features.md#L328) | H1 (merge Following into Collections) is COLD with 3 open boxes | Shipped as #418 (`8050a267`, 2026-09-09). `userSpaceData.ts:40,207,296` carry the `following` filter. |
| 50 | [2026-summer-refactor.md:254](../../../docs/spikes/2026-summer-refactor.md#L254), [:286](../../../docs/spikes/2026-summer-refactor.md#L286), [:336](../../../docs/spikes/2026-summer-refactor.md#L336), [:762-797](../../../docs/spikes/2026-summer-refactor.md#L762) | G2d (exempt docblocks above `it()`) is COLD, first in NEXT RUN | Shipped as #417 (`13c5ea8b`, 2026-09-09). [no-inline-comments-in-functions.js:27](../../../eslint-rules/no-inline-comments-in-functions.js#L27) has `TEST_CALLEES`. |
| 51 | [2026-summer-refactor.md:253](../../../docs/spikes/2026-summer-refactor.md#L253), [:335](../../../docs/spikes/2026-summer-refactor.md#L335) | G2b: 2,893 inline-comment warnings across 248 files (`app/` 842, `tests/` 2,051) | Re-run at HEAD: 2,259 across 179 files (`app/` 604, `tests/` 1,655). #437 hoisted part of them. |
| 52 | [2026-summer-refactor.md:255](../../../docs/spikes/2026-summer-refactor.md#L255), [:333](../../../docs/spikes/2026-summer-refactor.md#L333), [:817](../../../docs/spikes/2026-summer-refactor.md#L817) | G4: 1,500 docblocks, 54 backward-looking | Re-implementation of the prose method at HEAD: 1,582 and 51. Direction confirmed; exact figures unverified (the archive's own script at [group-g-decisions.md:409](../../../docs/spikes/2026-summer-refactor/group-g-decisions.md#L409) was not run). |
| 53 | [2026-summer-refactor.md:407-414](../../../docs/spikes/2026-summer-refactor.md#L407) | Suite size 61,143 test lines against 38,508 app lines | 62,633 against 38,838 at HEAD. Stale a fourth time; the board itself says not to quote it. |
| 54 | [2026-features.md:401-432](../../../docs/spikes/2026-features.md#L401), [:306-309](../../../docs/spikes/2026-features.md#L306) | Decision #4 (self-service passkeys on `/user`) fully open, "a second backend handoff" | #437 shipped [PasskeyChip.tsx](../../../app/components/Personal/PasskeyChip.tsx) (enrollment chip, hides when `MeResponse.passkeyCount > 0`) on backend #332. Only list-and-remove is still open. |
| 55 | [2026-features.md:122-132](../../../docs/spikes/2026-features.md#L122) and [CLAUDE.md:14](../../../CLAUDE.md#L14) | "Never build a dev-only auth bypass"; "The backend is not open", its data 401s | Backend `f569f40a` (#333, 2026-09-19) added `DevLocalAdminFilter`, which authenticates anonymous `/api/admin/**` as the bootstrap admin under the `dev` profile. If the local container runs `dev`, "its data 401s" is false. Which profile local compose runs is unverified. See section 6. |
| 56 | [2026-features.md:294-300](../../../docs/spikes/2026-features.md#L294) | "Not on this board, deliberately: H1, G3, D13, B10" | G3, D13, B10 closed 2026-09-08; H1 shipped #418. Stale cross-reference. |
| 57 | [2026-summer-refactor.md:1046](../../../docs/spikes/2026-summer-refactor.md#L1046) | "the `/user` ↔ `/admin/users/[id]` unification is H2b" | #437 consolidated `/user` and `/admin` (the hub), not `/admin/users/[id]`. H2b at [group-h-features.md:29](../../../docs/spikes/2026-summer-refactor/group-h-features.md#L29) is about labelled metadata layout. Whether #437 satisfies H2b's intent is unverified. |

Board claims that still hold (checked at HEAD, no action): F1 `useCollectionEdit.tsx` is 1,829 lines; F3's two moves (`app/utils/contactApi.ts`, lowercase `auth/` and `messages/`); B8's three untested modules; E7's `EditModeLayer.tsx:281` reorder branch; F4's 32-line `TaxonomyPage`; PF15 no `robots.ts`/`sitemap.ts`/canonical; PF16 `SEARCH_RESULT_LIMIT = 200` at `searchFilters.ts:13`; PF13 `getCollectionBySlug` on `fetchReadApi`, no `cacheComponents`; PF14 no dark mode; SD6 no `/person` route; CT5, AU1, RC3, EM2, MA1 unchanged on both repos; H7 blocker holds. All 24 PR numbers the boards cite as shipped have merge commits on `main`.

## 3. Overlap map

Each rule or section that lives in more than one file, and the single file that owns it after the change.

| Rule or content | Appears in | Owner after |
| --- | --- | --- |
| Core rules (App Router, Server Components, no `any`, tests required) | [CLAUDE.md:11](../../../CLAUDE.md#L11), [:16-19](../../../CLAUDE.md#L16); [ai_main.md:5-10](../../../ai_guidelines/ai_main.md#L5) verbatim | `CLAUDE.md` |
| Lint order eslint, prettier, tsc and the `no-useless-undefined` gotcha | [CLAUDE.md:33-38](../../../CLAUDE.md#L33); [ai_lint.md:9-36](../../../ai_guidelines/ai_lint.md#L9); both boards' "every MR ends with" rule; each `.claude/agents/*.md` body | `CLAUDE.md` (full text, not a pointer) |
| Naming, import order, common mistakes | [CLAUDE.md:40-44](../../../CLAUDE.md#L40); [ai_quick_reference.md:5-24](../../../ai_guidelines/ai_quick_reference.md#L5), [:120-133](../../../ai_guidelines/ai_quick_reference.md#L120); [agents/README.md:128-138](../../../.claude/agents/README.md#L128); each agent body | `CLAUDE.md` |
| Test run commands | [CLAUDE.md:21-31](../../../CLAUDE.md#L21); [ai_test.md:158-169](../../../ai_guidelines/ai_test.md#L158) | `CLAUDE.md` |
| `next/navigation` and `matchMedia` mock pattern, fixture gotchas | [ai_test.md:98-123](../../../ai_guidelines/ai_test.md#L98), [:136-145](../../../ai_guidelines/ai_test.md#L136); [agents/README.md](../../../.claude/agents/README.md); `test-writer.md` | `CLAUDE.md` |
| No inline comments | `~/.claude/CLAUDE.md` (global); [ai_quick_reference.md:122](../../../ai_guidelines/ai_quick_reference.md#L122); [2026-summer-refactor.md:644-761](../../../docs/spikes/2026-summer-refactor.md#L644) (G2) | Global `CLAUDE.md`; project `CLAUDE.md` keeps the one-line copy that non-owner sessions see |
| Docblock standard (no history, no board labels, no rejected-alternative essays) | `~/.claude/CLAUDE.md` (global); [2026-summer-refactor.md:798-885](../../../docs/spikes/2026-summer-refactor.md#L798) (G4) | Global `CLAUDE.md` |
| Work in the primary checkout, no worktrees | `~/.claude/CLAUDE.md` (global); [CLAUDE.md:12](../../../CLAUDE.md#L12); [lessons.md:314](../../../docs/spikes/2026-summer-refactor/lessons.md#L314); [2026-summer-refactor.md:133-136](../../../docs/spikes/2026-summer-refactor.md#L133) | `CLAUDE.md:12` |
| Amplify auto-deploy from `main`, branch protection | [CLAUDE.md:15](../../../CLAUDE.md#L15); [README.md:79](../../../README.md#L79); [2026-features.md:224-229](../../../docs/spikes/2026-features.md#L224) and decision #9 | `CLAUDE.md:15`; README keeps one sentence |
| Local admin login and "the local backend writes to production" | [CLAUDE.md:14](../../../CLAUDE.md#L14); [README.md:219-237](../../../README.md#L219); [2026-features.md:122-132](../../../docs/spikes/2026-features.md#L122) | `README.md` owns the human walkthrough; `CLAUDE.md:14` keeps the one-line rule and links to it |
| BoxTree and greedy-fill description | [README.md:87-100](../../../README.md#L87); [rowCombination.md](../../../app/utils/rowCombination.md) | `rowCombination.md`; README keeps three lines and a link |
| Vertical penalty retired | [README.md:100](../../../README.md#L100); [rowCombination.md:9](../../../app/utils/rowCombination.md#L9); [contentRatingUtils.ts:38](../../../app/utils/contentRatingUtils.ts#L38); [docs/005-layout.md:16](../../../docs/005-layout.md#L16) | The code docblock; `rowCombination.md` says it once |
| Collection kind model (typeless, `hasChildren`) | [ai_api.md:119-138](../../../ai_guidelines/ai_api.md#L119) (named canonical at [000-summary.md:5](../../../docs/000-summary.md#L5)); [docs/user-flow/README.md:99-151](../../../docs/user-flow/README.md#L99); [docs/004-content-discovery.md:11-13](../../../docs/004-content-discovery.md#L11) | `CLAUDE.md` |
| Each open work item | A board row, a board `###` section, and a group-file `##` section (31 feature items × 3; MA1's two write-ups disagree in detail) | `docs/backlog.md`, one row |
| Open items in chapters vs board rows | [docs/002-performance.md:21-29](../../../docs/002-performance.md#L21) vs PF1/PF3/PF8/PF10; 004 vs CT5/SD4/SD6; 007 CloudFlare vs PF7; 008 staging vs MA2; 009 `EMAIL_ENABLED` vs EM1; 001:19-20 CSS sweeps vs 006:27 | `docs/backlog.md` |
| Board process rules | 50 on [2026-summer-refactor.md:48-224](../../../docs/spikes/2026-summer-refactor.md#L48), 36 on [2026-features.md:36-255](../../../docs/spikes/2026-features.md#L36); 12 are the same rule twice; the "three checks" and "four checks" shell blocks ([:234-244](../../../docs/spikes/2026-summer-refactor.md#L234), [:169-182](../../../docs/spikes/2026-features.md#L169)) are the same idea | `CLAUDE.md` gets the 11 in section 4; the rest die with the boards |
| Changelog | [docs/previous-work.md](../../../docs/previous-work.md); both `session-log.md` files; [docs/000-summary.md](../../../docs/000-summary.md); the 2026-09-04 handoff | Git history and PR bodies |
| Answered decisions | [2026-features.md:401-432](../../../docs/spikes/2026-features.md#L401) decisions table; 2026-09-08 and 2026-08-30 answers in board sections; parked items in group files | `docs/decisions.md` |

## 4. Target structure and migration

### Files after the change

| File | Purpose | Approx lines |
| --- | --- | ---: |
| `README.md` | GitHub landing page for humans: what it is, stack, how to run it, how to log in locally | 120 |
| `CLAUDE.md` | Every rule Claude Code needs, always loaded. Absorbs the live `ai_guidelines/` rules and 11 board process rules | 175 |
| `app/utils/rowCombination.md` | Design rationale for the row composer, next to the code. History and the broken link removed | 150 |
| `docs/browser-diagnostics.md` | DevTools runbook. Unchanged | 97 |
| `docs/backlog.md` (new) | Section 5 of this report: one row per open item with id, one line, blocked-on, size, pointer. No sections, no session log, no counts | 150 |
| `docs/decisions.md` (new) | Dated one-liners: the 9 answered decisions, the 2026-09-08 and 2026-08-30 answers, every rejected or parked item, the no-WAF decision, and one line recording that the boards ran #254 to #437 and were deleted 2026-10-17 | 70 |

### Migration table

| Source | Destination |
| --- | --- |
| `README.md` | Keep. Fix lines 113-139 tree, 118 route, 125 `Metadata/`, 128 hooks, 185-192 env vars. Add or drop the four screenshots. Reconcile line 231 with `CLAUDE.md:14`. Cut 87-100 to three lines plus a link to `rowCombination.md`. |
| `CLAUDE.md` | Keep. Drop line 16's Pages Router clause and the lines 46-60 guidelines table. Replace the pointers at 33-38 and 40-44 with the full text. Absorb the rows below. |
| `ai_guidelines/ai_main.md:53` | `CLAUDE.md` (no-trivial-helpers rule) |
| `ai_guidelines/ai_main.md:57` | `docs/backlog.md` (About image hardcoded at `MenuDropdown.tsx:274`, `About.tsx:18`) |
| `ai_guidelines/ai_main.md` rest | DELETE |
| `ai_guidelines/ai_quick_reference.md:5-24, 97-133` | `CLAUDE.md` (naming, import order, inline-JSX config rule, mistakes list; fix the `Metadata/` path, drop `useCollectionData`) |
| `ai_guidelines/ai_quick_reference.md` rest | DELETE |
| `ai_guidelines/ai_test.md:98-123, 136-145` | `CLAUDE.md` (mock pattern, fixture gotchas; fix `locations`) |
| `ai_guidelines/ai_test.md` rest | DELETE |
| `ai_guidelines/ai_lint.md:9-36` | `CLAUDE.md` (replaces the pointer at 33-38) |
| `ai_guidelines/ai_lint.md` rest | DELETE |
| `ai_guidelines/ai_api.md:119-138` | `CLAUDE.md` (collection kind model) |
| `ai_guidelines/ai_api.md` rest | DELETE |
| `ai_guidelines/ai_typescript.md:5-10, 98-133, 223-235` | `CLAUDE.md` (`unknown` over `any`, React 19 event types and never `import React`, enum-not-string-literal rule) |
| `ai_guidelines/ai_typescript.md` rest | DELETE |
| `ai_guidelines/ai_css.md` | `CLAUDE.md` (6-line gap rule) |
| `docs/000-summary.md`, `001`, `005` | DELETE (001:19-20 CSS sweeps to backlog if still wanted) |
| `docs/002-performance.md:21-29` | `docs/backlog.md`, deduped against PF1/PF3/PF8/PF10 |
| `docs/003-client-gallery-security.md:16-20` | `docs/backlog.md` (5 rows) |
| `docs/004-content-discovery.md` open items | Already on the board as CT5, SD4, SD6. DELETE. |
| `docs/006-code-health.md` open: CSS sweeps, CloudWatch alerting, Wave B cleanup list, decomposition targets, hook/component test gaps | `docs/backlog.md` (test gaps merge with B8) |
| `docs/007-security-hardening.md:16-18` rate-limit map, CloudFlare Phase 2, housekeeping | `docs/backlog.md` (CloudFlare merges with PF7) |
| `docs/007-security-hardening.md:35` no-WAF decision | `docs/decisions.md` |
| `docs/008-collection-admin.md:21-30` staging spec | `docs/backlog.md` under MA2, or a backend issue |
| `docs/009-backend-and-vision.md:11-13, 29` three endpoints, `EMAIL_ENABLED` | `docs/backlog.md` (`EMAIL_ENABLED` merges with EM1) |
| `docs/009-backend-and-vision.md:23-24` identity-merge watch-outs (`Records.Person(id,name)` shape; never `SELECT *` on `users`) | Backend repo `CLAUDE.md`. Not this repo. |
| `docs/002-009` rest | DELETE |
| `docs/previous-work.md` | DELETE. One line in `docs/decisions.md` records the board PR range. |
| `docs/browser-diagnostics.md` | KEEP |
| `docs/user-flow/` (README, `.mmd`, `.svg`) | DELETE |
| `app/utils/rowCombination.md:31-34, 56-57, 115-122` | DELETE ("replaces the retired X" sentences) |
| `app/utils/rowCombination.md:208-267` | DELETE, or re-run the reproduction and keep a 5-line result (section 6) |
| `app/utils/rowCombination.md:212` | Replace the link with "#182" |
| `.claude/agents/*.md` (11 files) | DELETE |
| `.claude/agent-memory/explorer/MEMORY.md` | `git rm --cached`, delete locally |
| `docs/spikes/2026-summer-refactor.md` open rows F1, F3, F4, G2b, G2c, G4, E7, B8 | `docs/backlog.md` |
| `docs/spikes/2026-summer-refactor.md` 2026-09-08 and 2026-08-30 answers (F4, H1, H7, G8, G2b scope, E9, G5, E6 to F1, C9) | `docs/decisions.md` |
| `docs/spikes/2026-features.md` 31 open rows, 10 open decisions | `docs/backlog.md` |
| `docs/spikes/2026-features.md:401-432` 9 answered decisions (#5 to #9, #11 to #13, #18) | `docs/decisions.md` |
| `docs/spikes/2026-summer-refactor/lessons.md` and board rules: the 11 rules below | `CLAUDE.md` |
| `docs/spikes/2026-summer-refactor/group-a` to `group-g`, both `session-log.md`, the 2026-09-04 handoff | DELETE |
| `docs/spikes/2026-summer-refactor/group-h-features.md` H2b, H4, H5, H6; `group-e` E7 hook rejection; `group-f` F3 invite-move rejection; `ly-layout-decisions.md` parked ideas; PF2 drop; LY1 FILLER decline; G2 relax overruled; AU "deferred by design" list | `docs/decisions.md`, one line each |
| `docs/spikes/2026-features/au-, ct-, em-, ma-, pf-, rc-, sd-*.md` | `docs/backlog.md` rows only; DELETE the files |
| `docs/spikes/2026-features/backend-handoff-MA1-EM2.md`, `backend-handoff-RC3.md` | `docs/backlog.md` "backend asks" rows (one paragraph each); DELETE the files unless section 6 says keep |
| `docs/spikes/2026-features/backend-handoff-MA4-RC1.md` | DELETE (RC1 row carries the re-measure) |

### The 11 process rules that move into CLAUDE.md

One or two lines each, no incident story.

1. Jest and tsc cannot see CSS-module failures. `tests/styles/scssImportResolution.test.ts` and the repo-wide `styles.<key>` guard (#415) are the gates. Any SCSS MR also runs `next build`. ([lessons.md:380](../../../docs/spikes/2026-summer-refactor/lessons.md#L380))
2. `new Response(...)` in a jest mock throws under jsdom. Resolve a plain `{ ok: true }`. ([lessons.md:410](../../../docs/spikes/2026-summer-refactor/lessons.md#L410))
3. Collapsing two exports into one merges their `jest.mock` automocks. Grep `jest.mock('<path>')` first. ([lessons.md:216](../../../docs/spikes/2026-summer-refactor/lessons.md#L216))
4. A regression test must be watched failing without its fix. ([lessons.md:163](../../../docs/spikes/2026-summer-refactor/lessons.md#L163))
5. A drift-guard test keyed on "every field" needs its fixture updated in the same change that adds a field. ([2026-features.md:112-115](../../../docs/spikes/2026-features.md#L112))
6. A numeric API parameter no test exercises against the real backend needs a live check or a pinned bound. ([2026-features.md:68-72](../../../docs/spikes/2026-features.md#L68))
7. Grep the backend's `origin/main` (`git grep <p> origin/main -- src/`), never its checkout; `.claude/worktrees/` copies triple every hit. ([2026-features.md:73-76](../../../docs/spikes/2026-features.md#L73))
8. Mount a component the admin API will not serve in a throwaway route under `app/` with fixture props; the folder must not start with `_`. ([2026-features.md:204-209](../../../docs/spikes/2026-features.md#L204))
9. `gh` fails inside the agent sandbox (keyring), and `git checkout -b` fails dirty there; run both with the sandbox disabled. ([2026-features.md:230-231](../../../docs/spikes/2026-features.md#L230), [:241-244](../../../docs/spikes/2026-features.md#L241))
10. Three SCSS partial traps on `@use`; Turbopack reads `loadPaths`, not `includePaths`. ([lessons.md:533](../../../docs/spikes/2026-summer-refactor/lessons.md#L533), [2026-summer-refactor.md:1079-1081](../../../docs/spikes/2026-summer-refactor.md#L1079))
11. An extraction costs docblocks plus a required new test suite; quote code delta, docblock delta and test delta separately. ([2026-summer-refactor.md:371-394](../../../docs/spikes/2026-summer-refactor.md#L371))

### `.gitignore` change

[.gitignore:163-167](../../../.gitignore#L163) today:

```
docs/spikes/*
!docs/spikes/2026-summer-refactor.md
!docs/spikes/2026-summer-refactor/
!docs/spikes/2026-features.md
!docs/spikes/2026-features/
```

After the deletion, drop lines 164 to 167. Keep line 163 so the eight loose spike files stay local. `docs/backlog.md` and `docs/decisions.md` sit at `docs/` root, which no rule ignores. Check with:

```
git check-ignore -v docs/backlog.md docs/decisions.md
```

It must print nothing. [.gitignore:155](../../../.gitignore#L155) (`.claude/agent-memory/`) stays; the tracked explorer file is removed with `git rm --cached`.

### Links that break and what to change

Code docblocks. All four cite a board path for PF measurements and are also G4 violations (board labels in docblocks). Replace each with the PR number and delete the path.

| File:line | Change |
| --- | --- |
| [next.config.js:109](../../../next.config.js#L109) | Cite #360 (PF4) instead of `pf-performance-platform.md` |
| [app/page.tsx:24](../../../app/page.tsx#L24) | Cite #360 (PF4) |
| [app/utils/structuredData.ts:6](../../../app/utils/structuredData.ts#L6) | Cite #367 (PF8) |
| [tests/config/imageSizes.test.ts:7](../../../tests/config/imageSizes.test.ts#L7) | Cite #358 (PF1) |

Docs. Most vanish with their file; the rest need an edit.

| File:line | Change |
| --- | --- |
| [CLAUDE.md:33-38](../../../CLAUDE.md#L33), [:40-44](../../../CLAUDE.md#L40), [:46-60](../../../CLAUDE.md#L46) | Point at `ai_guidelines/`. Replace with the full text; drop the table. |
| [rowCombination.md:212](../../../app/utils/rowCombination.md#L212) | Replace the gitignored-plan link with "#182". |
| [docs/000-summary.md:7](../../../docs/000-summary.md#L7), [:20](../../../docs/000-summary.md#L20), [:52](../../../docs/000-summary.md#L52), [:72](../../../docs/000-summary.md#L72), [:80](../../../docs/000-summary.md#L80) | Gone with the file. |
| [docs/005-layout.md:26-31](../../../docs/005-layout.md#L26), [docs/006-code-health.md:52](../../../docs/006-code-health.md#L52), [docs/009-backend-and-vision.md:30](../../../docs/009-backend-and-vision.md#L30), [:40](../../../docs/009-backend-and-vision.md#L40) | Gone with the files. These were the only tracked links to the eight gitignored spikes. |
| [docs/previous-work.md:9](../../../docs/previous-work.md#L9) | Gone with the file. |
| [docs/user-flow/README.md:29](../../../docs/user-flow/README.md#L29) | Gone with the file. |
| `docs/spikes/2026-features/backend-handoff-*.md` lines 3, 32, 33 | Link `../2026-features.md`. Gone with the folder, or rewritten if the two handoffs are kept. |
| README | Unverified whether it links `ai_guidelines/` or `docs/`. Grep before deleting. |

No reference to the boards exists in `CLAUDE.md`, `README.md`, `ai_guidelines/` or `.claude/agents/`.

## 5. Open backlog

This becomes `docs/backlog.md`. Size is the board's own estimate where one exists. "Blocked on" names who has to act. H1 (#418) and G2d (#417) are out: shipped.

### Refactor items (7, plus one optional)

| Id | One line | Blocked on | Size |
| --- | --- | --- | --- |
| F1 | Split `useCollectionEdit.tsx` (1,829 lines) into five hooks along the anchors in the board section; leave the update-form region for MA1; keep the `UseCollectionEditResult` facade | nothing; goes before MA1, not in the same run as F4 | large, own session |
| F4 | Merge `TaxonomyPage` into `LocationPageClient` so tag pages get filters, the collections strip, header cover and follow seeding (decided 2026-09-08) | nothing; size first (cover source, `LocationCollections` on a tag, what the server page gave for free) | medium, unsized |
| F3 | Two moves left: `app/utils/contactApi.ts` to `app/lib/api/messages.ts` using `ApiError`; rename `app/components/auth/` and `messages/` to PascalCase (`ui/` stays) | nothing | small (1 src/3 test; 9 src/9 test) |
| G2b | Hoist the remaining inline comments into docblocks: 2,259 across 179 files at HEAD (`app/` 604, `tests/` 1,655); `app/` first; then flip the rule to `error` | nothing (G2d shipped #417) | large, two MRs |
| G2c | Heavy files ride their refactors; `CollectionPageClient.tsx` and `CollectionPageWrapper.tsx` ride nothing and are schedulable | nothing | medium |
| G4 | Read the ~50 backward-looking docblocks under `app/` and delete history, board labels, rejected-alternative essays; no lint rule. Includes the four docblocks in section 4. | nothing | medium, docs-only |
| E7 | `EditModeLayer.tsx:281` computes `contentBlocks` and discards it in reorder mode; size and fix | nothing | small, unsized |
| B8 (optional) | Tests for `sharedObserver`, `useParallax`, `useContentReordering` | nothing | +400 to 600 test lines |

### Feature items (31)

| Id | One line | Blocked on | Size |
| --- | --- | --- | --- |
| AU2 | Admin passkey list and revoke on `/admin/users/[id]`; last-passkey warning. Self-service list/remove on `/user` is still decision #4 (enrollment chip shipped #437) | backend: `passwordLoginAvailable` on the GET (handoff §4); user: decision #4 for the self-service half | medium |
| AU1 | Self-serve password reset over the invite subsystem; `/forgot-password` route; backend `purpose` column | nothing; backend half becomes a handoff when picked | medium, BE+FE |
| SD4 | `/explore` as a drill-down explorer (Option C) | user: decision #10, reconcile with H5 MenuDropdown review | large |
| SD6 | Clickable people chips; `/person/[id]` or backend slug + `/person/[slug]` | user: decision #17 | small FE, or small BE + FE |
| SD8 | Lens filter on `/location/[slug]` | user: is the facet wanted | small |
| RC1 | Re-measure `isFilm` on the four film collections; flag a third body if still zero | live backend | tiny |
| RC2 | Similar-collections v1 (metadata-graph score, Related section swap) | user: decision #1 D1 to D4 | medium BE + small FE |
| RC3 | Embedded hub renders as a card-row; needs `hasChildren` or child summary on the COLLECTION content block | backend: handoff RC3 | small BE + medium FE |
| RC4 | Suggested collections (admin rows) | CT3 and RC1 | medium |
| RC5 | CLIP/pgvector tier | user: decision #1 D6 | large, infra |
| CT1 | Rewrite the collections-as-tags spec against the typeless model; emit D1 to D12 | nothing | docs, one sitting |
| CT2 | Adjudicate D1 to D12 | user, after CT1 | decision |
| CT3 | Saved-filter engine (AND-tag query, `source` column, sync) | CT2 | large BE + FE |
| CT4 | `/blog` date-keyed stream | CT2 | medium |
| CT5 | `POST /collections/{id}/auto-tag` + admin button | nothing; backend first, no handoff yet | small BE + small FE |
| CT6 | Tag `type`/visibility column | nothing; design confirm | small BE |
| EM1 | SES production checklist (domain, DKIM, sandbox exit, `EMAIL_ENABLED`) | user drives the AWS console | ops |
| EM2 | New-recipient-only gallery send | backend: `notifyEmails` on `GalleryAccessRequest` (handoff §2) | small BE + small FE |
| EM3 | Contact-owner notification + `user_invite.created_by` | user: decision #14 (either this or MA4's webhook) | small BE |
| EM4 | Gallery-password design pass; BCrypt parked behind it | user: decision #3 | design |
| MA1 | Manage rail: per-field PATCH commits, delete the edit sheet | F1 first; backend: clear-a-nullable-field on PUT (handoff §1) | large, own sessions |
| MA2 | `staging` system collection (spec: `docs/008-collection-admin.md:21-30` before deletion) | user: decision #2 (`HIDDEN` vs `UNLISTED`) | medium BE + small FE |
| MA3 | Manage page full-screen grid and bottom bar on a light background | user: decision #15 (respec or drop) | several MRs once specced |
| MA4 | Contact-message notify channel (webhook) | user: decision #14 | small |
| MA5 | Backend-paged admin collections list | nothing; low priority | medium |
| MA6 | User change log + non-admin mutation path | user: decision #16 | large, design first |
| PF13 | Home page static via Cache Components: hoist cookies out of `fetchBase`, keep `getCollectionBySlug` cookie-varying, flip the flag, convert 19 segments | nothing | three sittings |
| PF14 | Site-wide dark mode behind a user preference | nothing; scope first | unscoped |
| PF15 | `app/robots.ts`, `app/sitemap.ts`, canonical + `og:url` pointing at the apex (decided #18) | nothing for the two files; read `NEXT_PUBLIC_APP_URL` from Amplify before the canonical | small |
| PF16 | `/search` fetches 200 images with no criteria (234 KB); pick a smaller default or require a criterion | nothing | small |
| PF7 | CloudFlare Phase 2 (proxy DNS, lock origin to CF ranges, `CF-Connecting-IP`, www to apex redirect) | user, ops | 1 to 2 weeks lead |

### Open user decisions (10)

#1 similar-collections D1 to D6; #2 staging visibility; #3 gallery passwords; #4 self-service passkey list/remove on `/user` (enrollment already shipped); #10 `/explore` direction; #14 webhook or email for contact notifications; #15 MA3 §5.2 respec or drop; #16 MA6 §10; #17 person URL shape; SD8 facet wanted or not.

### Open backend asks (4, none acted on as of backend `origin/main` `f569f40a`, 2026-09-19)

Clear-a-nullable-field semantics on `PUT /collections/{id}`; `notifyEmails` on `GalleryAccessRequest`; `passwordLoginAvailable` on `GET /{id}/passkeys`; child summary on the COLLECTION content block.

### Still-open items from docs/000-009 not already on the board

| Source | Item | Blocked on | Size |
| --- | --- | --- | --- |
| [001:19-20](../../../docs/001-design-review.md#L19), [006:27](../../../docs/006-code-health.md#L27) | Two deferred CSS sweeps | nothing | small |
| [002:21-29](../../../docs/002-performance.md#L21) items 1, 2, 4, 5, 7, 9 | Perf tasks the chapter says are "largely shipped" as PF1/PF3/PF8/PF10. Dedupe against those rows; carry only what is not covered | nothing | unsized |
| [003:16-20](../../../docs/003-client-gallery-security.md#L16) | Five small client-gallery items (not on any board) | nothing | small each |
| [006](../../../docs/006-code-health.md) | CloudWatch alerting | user, ops | small |
| [006](../../../docs/006-code-health.md) | Wave B cleanup list; decomposition targets | nothing | medium |
| [006](../../../docs/006-code-health.md) | Hook and component test gaps (merge with B8) | nothing | medium |
| [007:16-18](../../../docs/007-security-hardening.md#L16) | Rate-limit generalization (backend); housekeeping | backend | small |
| [009:11-13](../../../docs/009-backend-and-vision.md#L11) | Three missing backend endpoints | backend | small each |
| [ai_main.md:57](../../../ai_guidelines/ai_main.md#L57) | About image hardcoded at `MenuDropdown.tsx:274` and `About.tsx:18` | nothing | small |
| [README.md:11](../../../README.md#L11) | Add the four screenshots or drop the references | user | tiny |

### Parked and rejected (goes to `docs/decisions.md`, one line each)

PF2 blur placeholders (dropped by user 2026-08-31); E7 shared hook (rejected, 9 to 11 params); F3 invite move (rejected, worse boundary); LY1 FILLER atom (declined, gap-box already ships); G2 relaxing the inline rule (overruled); H2b, H4, H5, H6 (design/vision, no rows); AU "deferred by design" list; LY parked ideas; liked images, mobile text overlay, React 19 follow-ups (unapproved ideas named in group files); no WAF ([007:35](../../../docs/007-security-hardening.md#L35)).

## 6. Discrepancies that need a decision

Each is a question with options and a recommendation.

1. Does the backend's `DevLocalAdminFilter` make [CLAUDE.md:14](../../../CLAUDE.md#L14) wrong? Backend #333 (`f569f40a`, 2026-09-19) authenticates anonymous `/api/admin/**` as the bootstrap admin under the `dev` profile. The feature board's rule at [2026-features.md:122-132](../../../docs/spikes/2026-features.md#L122) said never to build exactly that. Options: (a) run the local backend, hit `/api/admin/**` anonymously, and rewrite the line to match what happens; (b) leave the line and note the backend change. Recommendation: (a), in the same PR. Whoever edits the line has to see a 200 or a 401 first.

2. Delete the eleven `.claude/agents` files, or keep them? Usage from 105 session transcripts: `explorer` 1 session, `code-reviewer` 1 session, the other eight 0; built-in `general-purpose` 31, `Explore` 14. Every agent body restates the import order, naming and mocking conventions, so those rules exist in four places. Options: (a) delete all eleven, rely on the built-in `Explore` agent and the `code-review` skill, and let subagents get the conventions from `CLAUDE.md`, which they receive by default; (b) keep `explorer` and `code-reviewer` only, strip their bodies to a role line. Recommendation: (a).

3. `.claude/agent-memory/explorer/MEMORY.md` is tracked although [.gitignore:155](../../../.gitignore#L155) ignores the directory, and its content is from February (row 48). Options: (a) `git rm --cached` and delete locally; (b) rewrite it. Recommendation: (a). It goes with the agents.

4. The stale worktree at `.claude/worktrees/quirky-chaplygin-aeb1da` (branch `claude/quirky-chaplygin-aeb1da`, same commit as `main`). Options: (a) `git worktree remove` it before anything else; (b) leave it. Recommendation: (a). Confirm its tree is clean first. Every grep across the repo returns doubled hits until it is gone.

5. Keep a human changelog or not? `docs/previous-work.md` stops at #293; `main` is at #437; both session logs end 2026-09-06. Options: (a) delete all of it and let git and PR bodies be the record, with one line in `docs/decisions.md` noting the board PR range; (b) keep `previous-work.md` and extend it to #437. Recommendation: (a). If you want (b), the chapters still go; keeping both is what produced the drift.

6. The two live backend handoffs (`backend-handoff-MA1-EM2.md`, `backend-handoff-RC3.md`). The backend has not acted on either. Options: (a) fold each ask into `docs/backlog.md` as a paragraph and delete the files; (b) move both to `docs/backend-asks/` and delete `backend-handoff-MA4-RC1.md`. Recommendation: (a). The handoffs are 100 to 180 lines of justification around a 5-line ask, and the backend agent reads the backend repo's board, not this one.

7. [README.md:231](../../../README.md#L231) says `ADMIN_BOOTSTRAP_PASSWORD` does not help; [CLAUDE.md:14](../../../CLAUDE.md#L14) says to log in with it. Options: (a) test it against the local backend and fix whichever is wrong; (b) delete the README sentence and trust `CLAUDE.md`. Recommendation: (a), done together with item 1 since both need the local backend running.

8. The eight gitignored spike files under `docs/spikes/`. Today four tracked docs link to them (row 43). After the chapters are deleted nothing tracked does. Options: (a) keep them local and untouched, keep `.gitignore:163`; (b) `git add` them (538 to ~1,000 lines each). Recommendation: (a). They are research, not reference.

9. `rowCombination.md:208-267`, the "Known limitation" written under the retired `cv` model (row 45). Options: (a) delete the section; (b) re-run the `V4,H3,V4,V5,V5` reproduction against the current composer and keep a 5-line result. Recommendation: (a) unless the re-run takes under an hour, in which case (b) closes a real question.

10. README screenshots (row 1). Options: (a) drop the hero image and the Screenshots table; (b) add four PNGs under `docs/`. Recommendation: (a) for this PR; (b) can follow when there is time to take them.

11. The identity-merge watch-outs at [docs/009-backend-and-vision.md:23-24](../../../docs/009-backend-and-vision.md#L23) are backend facts recorded nowhere else. Options: (a) add two lines to the backend repo's `CLAUDE.md` in a backend PR; (b) carry them in `docs/decisions.md` here. Recommendation: (a). A frontend doc is the wrong place for a rule about `SELECT *` on `users`.

12. Where do the 11 process rules go now that `ai_guidelines/` is deleted? Options: (a) a "Testing gotchas" block in `CLAUDE.md`; (b) a new `docs/testing.md`. Recommendation: (a). They are short and Claude needs them loaded.

## 7. Priority list

Ordered so no link dangles at any step. One docs PR; the only code edits are the four docblocks.

| # | Item | Section | Size | Files |
| --- | --- | --- | --- | --- |
| 1 | Remove the stale worktree; confirm clean and pushed first | [6.4](#6-discrepancies-that-need-a-decision) | S | `.claude/worktrees/quirky-chaplygin-aeb1da` |
| 2 | Write `docs/backlog.md` from section 5; re-run the G2b count on the day and record the command, not the number | [5](#5-open-backlog) | M | `docs/backlog.md` |
| 3 | Write `docs/decisions.md` from the answered-decisions and parked lists | [4](#4-target-structure-and-migration) | S | `docs/decisions.md` |
| 4 | Grow `CLAUDE.md`: absorb the `ai_guidelines/` rows and the 11 process rules; drop line 16's Pages Router clause and the 46-60 table; replace the 33-38 and 40-44 pointers with full text | [4](#4-target-structure-and-migration) | M | `CLAUDE.md` |
| 5 | Resolve `CLAUDE.md:14` against backend #333 and `README.md:231` against the bootstrap vars, with the local backend running | [6.1](#6-discrepancies-that-need-a-decision), [6.7](#6-discrepancies-that-need-a-decision) | S | `CLAUDE.md`, `README.md` |
| 6 | Fix the four code docblocks to cite PR numbers | [4](#4-target-structure-and-migration) | S | `next.config.js`, `app/page.tsx`, `app/utils/structuredData.ts`, `tests/config/imageSizes.test.ts` |
| 7 | Trim `rowCombination.md`: cut history sentences and the Known-limitation section, replace line 212 with "#182" | [4](#4-target-structure-and-migration) | S | `app/utils/rowCombination.md` |
| 8 | Trim README: fix tree, routes, env vars, hooks, `Metadata/`; drop screenshots; cut BoxTree to a link; keep one admin-login paragraph | [2](#2-false-or-stale-claims) rows 1-7 | M | `README.md` |
| 9 | `git rm` the 52 deleted files: `ai_guidelines/`, `docs/000-009`, `docs/previous-work.md`, `docs/user-flow/`, `docs/spikes/` (both boards and both folders), `.claude/agents/`; `git rm --cached .claude/agent-memory/explorer/MEMORY.md` | [1](#1-inventory) | S | as listed |
| 10 | Drop `.gitignore:164-167`; run `git check-ignore -v docs/backlog.md docs/decisions.md` (expect nothing) and `git status` (expect the two new files untracked, then add them) | [4](#4-target-structure-and-migration) | S | `.gitignore` |
| 11 | Grep `docs/`, `README.md`, `CLAUDE.md`, `app/`, `tests/` for `ai_guidelines/`, `spikes/`, `superpowers/`, `docs/00`; expect zero hits | [4](#4-target-structure-and-migration) | S | none |
| 12 | Open the PR; CI runs type check, lint, test | | S | |
| 13 | After merge, local-only cleanup: shipped `docs/superpowers/` plans and specs, `docs/_archive/`, `.superpowers/`, `.claude/agent-memory/code-reviewer/`, `todo/` (after promoting its one file to a backend issue) | [1](#1-inventory) | S | local disk only |
| 14 | Backend PR: two watch-out lines in the backend `CLAUDE.md`; act on the four backend asks | [6.11](#6-discrepancies-that-need-a-decision) | S | backend repo |

## Appendix: verification notes

What was checked and how:

- The 60-file inventory is `git ls-files | grep '\.md$'` at `9f7302b7`. Line counts are `wc -l`; dates are `git log -1 --format=%cs -- <file>`.
- Every path cited in sections 2 to 4 was confirmed to exist on disk (44 paths checked with `ls`). The line numbers for rows 2, 5 to 13, 14, 18, 21, 22, 25, 27, 32 to 34, 41, 44, 46, 48 and the four code docblocks were re-read at HEAD.
- Shipped claims on the boards: 24 PR numbers in a sample were matched to merge commits with `git log main`. `gh` was not usable (keyring error in the sandbox), so no GitHub-side check was made.
- G2b count: the `no-inline-comments-in-functions` rule was re-run at HEAD. Suite size: `find tests -name '*.ts*' | xargs wc -l` and the same for `app`.
- Agent usage counts come from the 105 session transcripts under `~/.claude/projects/-Users-themancalledzac-Code-edens-zac/`.
- Backend claims (`DevLocalAdminFilter`, `hasChildren`, `notifyEmails`, `Records.Person`, `AdminUserController.java:475`) were checked with `git grep` on the backend repo's `origin/main` at `f569f40a`, not its checkout.
- Local-only directories (`docs/handoffs`, `docs/superpowers`, `.superpowers`) were listed by name and date only, not read.

Not verified:

- Which Spring profile the local backend compose runs, so whether `CLAUDE.md:14` is now false (row 55).
- Which of `README.md:231` and `CLAUDE.md:14` is right about `ADMIN_BOOTSTRAP_PASSWORD` (row 7).
- Whether `processContentLayout` exists under any name (row 20); only a grep for the export was run.
- The exact G4 figures (row 52); the archive's own script was not run.
- Whether the `V4,H3,V4,V5,V5` row in `rowCombination.md:208-267` still misbehaves (row 45).
- Whether #437 satisfies H2b's intent (row 57).
- The `buildContentRows` four-argument signature at `docs/browser-diagnostics.md:87-92`.
- The `LENS_ADD_NEW_FIELDS` constant name in `CameraSettingsSection.tsx` (the file exists).
- The "subagents cannot spawn sub-subagents" claim (row 47) was not checked against the current Claude Code docs.
- RC1 `isFilm` re-measure needs a live backend and was not run.
- The G4 board-label sweep count (a naive regex returned 25 lines; the board warns it over-counts).
- Whether README links into `ai_guidelines/` or `docs/`; step 11 of the priority list catches it.
- Newest dates for `todo/` and `.superpowers/`.
