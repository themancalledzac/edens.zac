# 2026 Summer Refactor — Living Checklist

_Formerly `docs/spikes/2026-08-22-frontend-cleanup-spike.md`; renamed 2026-08-23 as the standing
per-session tracker (a pointer stub remains at the old path for stale references)._

_Origin: full critical review of `main` on 2026-08-22, produced by 8 parallel review agents (API, security, utils/hooks, admin surface, public surface, tests, styles, organization/roadmap). Every dead-code claim was verified by grepping call sites; the parent session re-verified every high-severity claim against current code. Full-board re-review 2026-08-22/23 by 7 more agents — stamp archived in [lessons.md](2026-summer-refactor/lessons.md). A 9-agent split review re-verified both repos' boards on 2026-08-28; its corrections and new items were applied 2026-08-29._

**This file is a running to-do list, not a one-shot report.** Work is split into numbered MRs sized to land in a single sitting. Check the box when the MR merges, and put the PR number next to it. Keep the `file:line` references — they let any MR be picked up cold.

> **Two tiers. This file carries ONLY what is still open.**
>
> When an item closes, its write-up **moves** to its group's archive under
> [`2026-summer-refactor/`](2026-summer-refactor/) rather than staying here ticked. The group heading
> keeps a one-line pointer naming what shipped and where. Same split for the session log: the newest
> two entries stay here, everything older lives in
> [session-log.md](2026-summer-refactor/session-log.md). The long-form incident narratives behind
> the rules below live in [lessons.md](2026-summer-refactor/lessons.md).
>
> | Tier    | File                                             | Holds                                                                                                                            |
> | ------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
> | Live    | this file                                        | distilled working rules, the open MR board, the open-item classification, open item sections, the newest two session-log entries |
> | Archive | [`2026-summer-refactor/`](2026-summer-refactor/) | every closed item's full write-up and closed-row ledger, one file per group, plus the older session log and lessons.md           |
>
> **Why:** this file is `@`-referenced into a fresh session's opening context every run, so its
> length is a per-session cost paid forever. It reached 4,571 lines on 2026-08-28 before the split
> was re-applied (~1,980), and was restructured again 2026-08-29 — rules distilled with narratives
> moved to lessons.md, closed MR rows ledgered into the group files. Anything a session must read
> to start work belongs here; anything it would only read to understand a decision already made
> belongs in the archive.
>
> **The invariant that makes this safe:** an open item must be readable with every archive file
> closed. Where an open item depends on something shipped, copy the part it needs into the open item
> as a guardrail. Generalizable lessons get hoisted into "How to use this doc" **before** the item's
> section moves — that is what stops archiving from losing a rule.

> **Tracked in git since PR #271 (2026-08-23).** `.gitignore` negates exactly four paths under
> `docs/spikes/` — this file, `2026-summer-refactor/`, `2026-features.md`, `2026-features/` — a new doc goes INSIDE one of the two directories, never beside them
> (`git check-ignore -v` to confirm). The tracking history, the accepted public-repo trade-off, and
> the stale-local-main sync trap: [lessons.md](2026-summer-refactor/lessons.md).

> **A cross-board review handoff was written 2026-09-04:**
> [2026-features/2026-09-04-board-review-handoff.md](2026-features/2026-09-04-board-review-handoff.md).
> It records what was re-run and what had drifted at `main` @ `29bd30f0`, and it names claims on
> BOTH boards that were false — including three items marked COLD that had already shipped.
> **Applied 2026-09-05** (session log below): this board's row table, NEXT RUN, state table, refs
> and archives were brought into line with `main` @ `699aa4f2`.

## How to use this doc

Each rule below is the distilled form; the incident that earned it is in
[lessons.md](2026-summer-refactor/lessons.md) under the same heading order. Links in board files
are repo-root-relative by convention — they are checked against the repo root, not resolved from
`docs/spikes/`.

- One MR per numbered item (`A1`, `B3`, …). Do not bundle across items.
- **A status cell naming an open PR is a claim, not a fact.** Run `gh pr view <N> --json state,mergedAt`
  on every PR the board calls open — on 2026-08-24 all five "open" rows had merged hours earlier.
  Close the row AND the boxes in the same pass as the merge.
- **Verify checkboxes against the filesystem, not the heading.** B8 advertised three finished
  slices for three days. The check is one `ls` or one `git log --diff-filter=A -- <test path>` per bullet.
- **Open every PR here with `--base main` — no exceptions.** A stacked PR whose base merges
  un-deleted lands on a dead branch while `gh` says MERGED (#314, #325, #332). Truth is
  `git merge-base --is-ancestor <sha> origin/main`, never the badge; delete base branches on merge.
- **A `file:line` ref written during the session that edits that file is born stale.** Re-resolve
  every ref against the tree as it stands when you commit, and anchor on declarations, not body lines.
- **A fallback error string at a call site is not an unhandled error.** Follow the error to the
  mapper that renders it before filing anything — C7's `mapError` already covered 401/403/409.
- **Read the sibling repo's source and tests, never a paraphrase** — including a paraphrase on this
  board, and including the sentence after the one that supports you (C6 died on the next clause).
- **Read the OTHER repo's board and HEAD before stamping an item BLOCKED-on-user.** Two of this
  board's nine user-blocked rows were answered on 2026-08-30 by facts already sitting in
  `edens.zac.backend`: G5's wrap-vs-bless was decided in its `.claude/CLAUDE.md` and its HEAD commit
  message, and C9's premise turned out to be a backend defect. A question the other repo already
  answered costs the user nothing and eats a session if nobody looks.
- **A backend change can silently falsify a frontend standing instruction, and nothing watches for
  it.** Backend #243 made `/api/admin/**` unconditionally gated and thereby made `CLAUDE.md`'s
  "Localhost Admin Needs No Login" Critical Rule false until G6 (#351) corrected it — a rule that
  told agents _not to investigate_ the breakage it was causing. When either repo changes an auth perimeter, a
  response shape, or a local-dev affordance, grep the other repo's `CLAUDE.md` and guidelines for
  claims about it in the same pass.
- **A "should we tolerate this bad state?" item is often a "why does this bad state exist?" item.**
  C9 was costed as a rendering decision for a week; one look at where the value is produced turned
  it into a backend bug and closed the frontend side at zero code. Trace the value to its writer
  before costing a way to live with it.
- **A guard that must release on a prop change must be DERIVED from that prop, never reset by an
  effect.** An effect runs after paint, so a reset-on-exit renders the broken frame once every time.
  C10's own fix sketch offered the two as equivalent; they are not.
- **When an item is a wrong sentence, grep the sentence.** A9 tracked one file and the false claim
  lived in three, because the board recorded where the defect was FILED, not where it APPEARED.
  Five re-verifications of "this claim is false" never re-checked how many places carried it.
- **A filename glob with a middle wildcard silently excludes the unsuffixed base file.**
  `CollectionPageWrapper.*.test.tsx` matches `.meTile` and `.allCollectionsTile` but not
  `CollectionPageWrapper.test.tsx`. Enumerate movers by the import they carry, not their name shape.
- **A suite count that rises without a new assertion is not coverage.** Directory-walking generators
  (`tests/components/panelStyleReferences.test.ts` uses `readdirSync` + `it.each`) mint a case per
  file, so any MOVE into a watched directory changes the total. Say which of a delta is generated.
- **Cross-repo `file:line` refs are outside every drift sweep here.** Re-verify them by hand against
  that repo's `origin/main` whenever such an item is picked up.
- Every MR ends with the standard verification: scoped `eslint --fix` → `prettier --write` → `tsc --noEmit` → full `jest`.
- **Prove every regression test fails without its fix.** Stash the source change, watch the test go
  red, restore. A green test proves nothing until you have watched it fail.
- **A silent result is evidence only if the channel can speak.** Include a case that SHOULD trigger
  the thing, in the same run (D3's clean CSP console had loaded no images at all).
- **Verify a prescribed mechanism before implementing it.** D5's "one prefix check" was walked past
  by `api/../actuator/env`; one `new URL(...).pathname` in node caught it before any code.
- **An item's test-coverage claims are claims — check them like refs.** D9's "no test would catch
  it" was false; one sed and one jest run settled it.
- **An audit's method is a claim too — state what its pattern cannot match** and walk that blind
  set by hand (C4's literal grep called the template-built `collection-home` dead).
- **A prescribed fix can be right on the happy path and wrong on the error path — read the failure
  branch first.** Error paths run late, hold stale closures, and are the least covered code (C3).
- **Collapsing two exports into one reference merges their jest automocks.**
  `grep -rn "jest.mock('<module path>')" tests/` first; on hits, keep two delegating functions and
  say why in the docblock. The tell is that nothing fails (E3's `update === set`).
- **When a row names a merged PR, `git show --stat <sha>` it against the bullet list BEFORE trusting
  any checkbox.** The PR credited in the status cell is usually the one that silently finished the
  "open" bullets — five occurrences. Never carry a checkbox forward on the strength of its row.
- **An item that hands work to the USER needs its verification check written in** ("done when
  `find app -iname '*layoutpreview*'` is empty"), or it becomes immortal — A9 re-filed for five sessions.
- **Never quote a recorded suite/test baseline. Re-measure by stashing the tree and running the
  suite.** Every recorded number on this board aged out within days, and each was correct when taken.
- **The mock-declaration count is the unit of value for a MOVE item.** Grep
  `jest.mock('<source>')` and the destination in `tests/`, count the overlap: high overlap pays
  (#336 merged twelve declarations into six), zero is cosmetic, a split with overlap costs.
- **Write the shared signature before consolidating.** If over ~a third of its params only switch
  behavior between callers, they are not duplicates — record the measurement and the smaller
  alternative and stop (killed F3's invites.ts, E7's hook, E6 bullet 1). A costed rejection is a
  finished outcome.
- **Size the duplicated region, not the file.** "Halves the file (~100 lines)" halved 286 total
  lines; the real dedup was 46 code lines (E3). When an item says "halves", measure what collapses.
- **An item on an unmerged board branch is invisible to the session doing its work.** Merge board
  PRs before starting the items they define, or check `git diff main...<board-branch>` first (#307).
- **Work in the primary checkout — no worktrees while one branch is in play.** The worktree traps,
  should two concurrent branches ever return, are recorded in lessons.md. The one exception is
  `CLAUDE.md`'s: another session is using the checkout (the backend repo, twice). Then, and only
  then, a worktree off `origin/main`.
- **Grep an item's symbols for test call sites before sizing it.** Zero hits: trust the source-only
  number (D4 ±1). Any hits: budget test churn on top (A4, A6, D2, D6 all came in over).
- **Re-read any outside-world value from more than one sample** — hosts, headers, distributions
  (D4's pin would have missed a second CloudFront distribution). Seven pages took a minute.
- **Where a written plan exists, the plan's scope beats this board's one-liner** (E1: the plan was
  right about WHY the item mattered; the board was not). Read the plan first.
- **Before filing a fix for a "missing" field check, grep the type** — confirm the data exists
  (C6: the model simply has no `isPasswordProtected`).
- **Closing an item and moving its write-up are one act, in the same close-out commit.** First
  hoist any generalizable lesson here, then copy anything an open item needs inline as a guardrail,
  then move the section and leave a one-line group pointer. Skipping the move is how this file hit
  4,571 lines, paid by every future session.
- **`2026-summer-refactor/` is the board's reference set:** shipped write-ups + non-cleanup detail.
  Invariant: board + live sections must let any cleanup MR start cold with every reference file
  closed — an item with a row keeps its detail live; decisions/design/ops/vision get no row and
  live in a reference file.
- **Jest and tsc cannot see CSS-module failures** — dangling file imports and dangling
  `styles.<key>` both stay green; only `next build` fails. Guards:
  `tests/styles/scssImportResolution.test.ts` (files), `tests/components/panelStyleReferences.test.ts`
  (keys, panels only). Any MR touching SCSS verifies by `next build` or a resolution assertion.
  **Sizing commands, recorded 2026-08-30 so the number stops drifting** — files importing a CSS
  module: `grep -rlE "from '.*\.module\.(scss|css)'" app --include='*.ts' --include='*.tsx' | wc -l`
  → **105**; distinct key names: `grep -rhoE '\bstyles\.[A-Za-z_][A-Za-z0-9_]*' app --include='*.ts' --include='*.tsx' | sort -u | wc -l`
  → **402**. Both were recorded as 104/401 and were wrong when written. **A `styles.<key>` regex is
  not the whole surface: 10 files import a module under another name** (`cbStyles` ×5,
  `modalStyles` ×4, `variantStyles` ×1) and a guard sized off this pair would skip them silently.
  (The repo-wide key-guard decision is in the blocked-questions table.)
- **A test that cannot fail is this board's most common defect.** Prove it with a control: run the
  old test against broken source. After ANY copy change, sweep `queryBy…` +
  `not.toBeInTheDocument()` against renamed strings — they pass vacuously (E5, B5, H2a).
- **`new Response(...)` in a test mock throws under jsdom**, making N parallel fetches record one
  call. Resolve a plain `{ ok: true }`, the repo convention.
- **Before escalating any question to the user, grep the source and the crediting PR for the
  answer.** "Report what it would cost" guardrails land in docblocks and PR bodies, not here —
  E3 sat blocked four days past its own answer.
- **Re-derive drifted refs from anchors, never by adding an offset.** A multi-hunk merge has
  multiple offsets, a Prettier collapse is a hunk, and generic punctuation (`);`) is not an anchor
  (F1, three times).
- **Never cite this tracker by line number — reference sections by heading.** The tracker moves
  constantly; a `2026-summer-refactor.md:NNNN` ref dangled past EOF within a day of being written.
- **An open item must be readable without opening the archive.** Copy the part it needs inline as a
  guardrail (B1 restated exactly what E11's drift test cannot see).
- **A new reference file must go INSIDE `docs/spikes/2026-summer-refactor/`, never beside it.**
  `.gitignore` negates exactly four paths (both boards and their directories); a doc beside them vanishes silently.
  `git check-ignore -v <path>` before assuming any new doc is safe.
- **A claim that two test suites are duplicates is really a claim about their SOURCE.** Read the
  source both suites call (B3's "triplet" was two real functions plus unrelated logic; B7's spies
  watched a listener that is never registered).
- **Duplication claims are the weakest class on this board — budget for checking, not acting.**
  One in five survived intact; expect the work to be merging rather than deleting.
- **A red-then-green test is the gate, but not the same as having watched the bug.** Where an
  observation is cheap — a page to open, a button to click — spend the minute and record that you
  did; where it is not, say so in the item (C1's fixture encoded the fix's own error).
- **Write the command beside any count you write.** A number with no recorded method can only be
  re-derived, not verified (F2, G2c). Before calling a count unrepairable, try two or three
  plausible metrics — reproducing most of the table IS the method.
- **A line count cannot see a narrowed type, a moved file, or a reversed dependency edge.** If an
  item's win is not diff-measurable, say so in the estimate column instead of writing a number that
  will later read as a miss (E17: sized −15, shipped +3, nothing went wrong).

## MR board

Open rows only. The 60 closed rows live as one-line ledgers under a "Closed rows" heading in each
group's archive file in [`2026-summer-refactor/`](2026-summer-refactor/); the estimate-bias
scorecard below keeps the est/actual pairs that still matter.

Three checks, run every close-out (imported from the feature board 2026-09-05, after this table
was found seven rows short of its own sections):

```bash
# every row has a section, and every section has a row
grep -oE '^\| [A-Z][0-9]+ +\|' docs/spikes/2026-summer-refactor.md | tr -d '| ' | sort > /tmp/rows
grep -oE '^### [☐◐⛔] [A-Z][0-9]+' docs/spikes/2026-summer-refactor.md | awk '{print $3}' | sort > /tmp/secs   # awk, not sed: BSD sed mangles a multibyte bracket
comm -3 /tmp/rows /tmp/secs                                   # must be empty
# no closed section survives on the live board
grep -c -e '^### ✅' -e '^### ☑' docs/spikes/2026-summer-refactor.md   # must be 0
# no archive file carries two headings for one item (keyed on the status mark; H2a/H2b share a stem by design)
grep -ohE '^#{2,3} [☐◐⛔✅☑] [A-H][0-9]+[a-z]?' docs/spikes/2026-summer-refactor/group-*.md \
  | grep -oE '[A-H][0-9]+[a-z]?' | sort | uniq -d                  # must be empty
```

| MR  | Scope                                                                                    | Status                                                                                                                                                          |
| --- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B8  | Fill the required-coverage gaps                                                          | ◐ 5 of 6 — #266, #267, #295, #296; only the optional bullet is open (`sharedObserver` 116 / `useParallax` 169 / `useContentReordering` 197 lines, all untested) |
| C9  | Dimensionless cover renders no header, missing cover does                                | ☐ UNBLOCKED 2026-08-31 — backend #249 writes `null`; closes at zero FE code once the surviving pre-#249 `0 x 0` rows are counted (a live-data query, not code)  |
| C12 | `.metadataToggle` is under the 44px tap target                                           | ☐ COLD — 36px, 40px at ≥768px (`fullscreen-image.module.scss:208`, `:229-231`); +3 src, no test pins the size                                                   |
| C13 | Byline says "Zac Eden" in three literals across two files                                | ☐ COLD — `app/[slug]/page.tsx:38`, `app/page.tsx:8`, `:11`; +3 src literal, +8 via `AUTHOR_NAME`                                                                |
| C14 | `getCollectionsByLocation` sends `page`/`size`; the endpoint reads neither               | ☐ COLD — two renamed params at `collections.ts:157`; +2 src / +15 test. Cheapest item on the board                                                              |
| C15 | `LocationPage` props typed image-only; the backend field they name is mixed content      | ☐ COLD — re-scoped 2026-09-05: the backend answered the blocking question (it is dropping the array), so this is type hygiene only                              |
| C16 | `imageWidth`/`imageHeight` non-nullable; backend writes `null`                           | ☐ COLD — widen `Content.ts:156-157`, run `tsc`, fix what it surfaces                                                                                            |
| C17 | Lens selection is not URL-shareable                                                      | ☐ COLD — no `lens` key in the serializer, parser or `FILTER_PARAM_KEYS`; the drift guard's fixture never sets it. +6 src / +20 test                             |
| C18 | `CollectionRolesSection`'s mount fetch has no unmount guard                              | ☐ COLD — 60 of the suite's 96 `act()` warnings trace here; +8 src / +20 test; check `UserRolesSection` for the same shape                                       |
| D11 | Gallery-access save never evicts `collection-{slug}`; the cache-key contract is unpinned | ☐ COLD — one `revalidateCollectionCache` call per handler + a test against the real `generateCacheKey`. +2 src / +30 test                                       |
| D12 | Client error reports log the share and invite tokens                                     | ☐ COLD — `logger.ts` sends `window.location.href`; on `/s/<token>` and `/invite/<token>` that is the credential. +6 src / +20 test                              |
| D13 | Report-only CSP has no `report-uri`; apex host silently 403s every write                 | ☐ COLD — a `POST /api/csp-report` route and the directive; apex → www redirect rides PF7. ~+40 src / +30 test                                                   |
| D14 | Proxy body-cap tests that cannot fail; `client-errors` cap counts UTF-16 units           | ☐ COLD — one `content-length` test, `Buffer.byteLength`, one normalized-path check, two headers on the strip list. +10 src / +30 test                           |
| D15 | Public routes surface client-gallery images through the unfiltered backend search        | ⛔ BLOCKED — backend S-29 (HIGH, open there). No frontend mitigation exists; the frontend owes a cache purge when the fix deploys                               |
| E7  | Edit-grid handoff (was `useFilteredContentBlocks` hook)                                  | ◐ waste FIXED #337; hook REJECTED; one path open (`EditModeLayer.tsx:281` reorder branch, unsized)                                                              |
| E9  | Download icon/hook, auth-card SCSS, `.srOnly`                                            | ◐ PR #300 — both COLD bullets shipped; srOnly ⛔ user call                                                                                                      |
| F1  | Decompose `useCollectionEdit.tsx` (1,811 lines)                                          | ☐ COLD — largest open item; anchors re-derived 2026-09-05; goes BEFORE feature-board MA1 and leaves the update-form region alone (see section)                  |
| F3  | File moves and renames                                                                   | ◐ five shipped (#324 #336 #343 #348 #349); invite REJECTED; four bullets open                                                                                   |
| F4  | `TaxonomyPage` ← `LocationPageClient`                                                    | ⛔ USER DECISION                                                                                                                                                |
| G2  | Inline-comment enforcement + migration (decided: keep the rule)                          | ◐ wording #268; G2a COLD, G2b ⛔ scope confirm, G2c ⛔ rides refactors; inventory re-taken 2026-09-05 (448 `.tsx` / 441 `.ts` lines, 14 JSX)                    |
| G3  | `/user/selects` decision                                                                 | ⛔ USER DECISION — delete or rebuild                                                                                                                            |
| G4  | Docblock standard — length, structure, and no history                                    | ◐ intersection pass #310; 1,494 blocks / 54 hits; 17 label docblocks + 4 inline; read, don't regex                                                              |
| G7  | Test names call the BFF proxy "Vercel"; production is Amplify                            | ☐ COLD — seven `describe` strings across two files; ~7 test lines, 0 src                                                                                        |
| G8  | Extend the panel `styles.<key>` guard repo-wide?                                         | ⛔ USER DECISION — 107 files / 411 keys; 10 files import a module under another name, so a `styles.` regex skips them                                           |
| H1  | Merge `Following` into `Collections` on `/user`                                          | ☐ BLOCKED (user) — count semantics, followed-tile marker, and the 500-row catalog fetch                                                                         |
| H7  | Passkey management on `/admin/users/[id]`                                                | ⛔ USER DECISION — the same feature as feature-board AU2 / decision #4; ask together, close this row against AU2                                                |

### NEXT RUN — updated 2026-09-05

**C11 (#352), D10 (#353) and the whole of E18 (#354) shipped 2026-08-30.** The previous block
listed them as its three items the day after they merged; the 2026-09-04 handoff caught it. E18's
Half B was never a bug — the hook's `collection` has derived from `currentState` since `86a0f192`,
and #354 pinned the two-save case — so the item closed whole. Nothing in this run needs a user
answer.

**Do C9's check first, ahead of everything below.** It is a count, not code: how many
`content_image` rows still carry `image_width = 0 OR image_height = 0` from before backend #249.
A read-only query through the production tunnel (the user runs it), or a scan of the public
`/api/read/content/images/search` output for `imageWidth === 0`. Zero rows → close C9 with no
frontend change. Some rows → a backend backfill goes in a handoff; still no frontend change.

**In order, one MR each, all under 40 lines of source:**

1. **C14** — rename `page`/`size` to `collectionPage`/`collectionSize` at
   `app/lib/api/collections.ts:157`; test asserts `collectionPage=1` in the fetched URL. +2 src / +15 test.
2. **C17** — the `lens` URL key, its parser and seed lines, the failing-first round-trip test, and
   the `Required<ContentFilterCriteria>` fixture that makes the drift guard fail on the next omitted
   field. +6 src / +20 test. Fold `hasAnyActiveFilter`'s missing `selectedFilmTypes` in.
3. **C13** — three "Zac Eden" literals (`app/[slug]/page.tsx:38`, `app/page.tsx:8`, `:11`). Read
   `AUTHOR_NAME` from `app/utils/structuredData.ts` at all four routes rather than fix three strings. +8 src.
4. **D11** — `void revalidateCollectionCache(collection.slug)` after both `saveGalleryAccess` calls
   in `useCollectionEdit.tsx`, plus `tests/lib/api/fetchCacheKey.test.ts` against the real
   `IncrementalCache.prototype.generateCacheKey`. +2 src / +30 test.
5. **D12** — `logger.ts` reports `pathname` with `/s/*` and `/invite/*` collapsed to a placeholder;
   jsdom test that the posted body never contains the token. +6 src / +20 test.
6. **G7** — seven `describe('Vercel BFF proxy …')` → `'BFF proxy …'`. Do not touch the `x-vercel-*`
   header handling. ~7 test lines.
7. **C12** — `.metadataToggle.metadataToggle` to 44px, drop the `≥768px` step
   (`fullscreen-image.module.scss:208`, `:229-231`); check the doubled block at `:544`. +3 src.
   SCSS: verify by `next build` or a resolution assertion.
8. **C18** — an `isCurrent()`-style guard on `CollectionRolesSection`'s mount effect (the shape
   `useFetchMe.ts:46` already uses); read `UserRolesSection.tsx:90-104` for the same gap. +8 src / +20 test.

**If the sitting has room:** C16 (widen the two dimension types, run `tsc`, fix what it surfaces —
run C9's check BEFORE this, since its churn may land in files C9 reads), C15 (type hygiene only now
— widen or record images-only; the product question closed on the backend's side), D14, and F3's
`fullscreen-image.module.scss` rename (do it before E9 is ever scheduled; they share a file).

**Refs between MRs:** C14, C17, C13, D11, D12, G7, C12 and C18 touch disjoint files. C17 and C15
both read `contentFilter.ts` — re-derive C15's refs if C17 lands first.

**Deliberately NOT in this run:** F1 (its own session; it now goes BEFORE feature-board MA1, see
the F1 section), E7's reorder path (unsized; size it first), G2a (~60 lines of flat-config rule,
wants a session with `eslint` in the loop), D13 (needs a route and a decision on the apex host),
B8's optional bullet (+400–600 test), and everything ⛔.

### State of the open items (re-stamped 2026-09-05)

Every open item is COLD or BLOCKED, and every BLOCKED one names its question and who answers it. An
item blocked on an unwritten question reads as available and then eats a session. (The 2026-08-26
stamp missed six items, and all four swept later turned out wrong — **UNSTAMPED is a useful state:
use it rather than guessing, then actually sweep it.** The shipped-but-unticked history behind that
is in [lessons.md](2026-summer-refactor/lessons.md).)

| Item    | State              | If blocked: the question, and who answers it                                                                                                                                                                                                                                                          |
| ------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **C9**  | COLD               | —— backend #249 writes `null`; closes at zero FE code **if** no pre-#249 `0 x 0` rows survive. Nobody has run the count                                                                                                                                                                               |
| **C12** | COLD               | —— `.metadataToggle` still steps 36 → 40px against a 44px tap target; SaveHeart's identical gap closed in #367                                                                                                                                                                                        |
| **C13** | COLD               | —— three literals, two files; consolidation onto `AUTHOR_NAME` is the better answer now                                                                                                                                                                                                               |
| **C14** | COLD               | —— two renamed params. **Cheapest item on the board**                                                                                                                                                                                                                                                 |
| **C15** | COLD               | —— was BLOCKED on "switch to the location endpoint's own `images` array?"; the backend closed that (FE-1: the array is being dropped, the page stays on `searchImages`). Type hygiene remains                                                                                                         |
| **C16** | COLD               | —— widen two declarations; the value is in what `tsc` then complains about                                                                                                                                                                                                                            |
| **C17** | COLD               | —— `lenses` is the one non-`*MatchMode` criterion the URL layer never carries                                                                                                                                                                                                                         |
| **C18** | COLD               | —— no unmount guard on two mount-effect fetches                                                                                                                                                                                                                                                       |
| **D11** | COLD               | —— two one-line evictions and one framework-contract test                                                                                                                                                                                                                                             |
| **D12** | COLD               | —— report the pathname, not the href                                                                                                                                                                                                                                                                  |
| **D13** | COLD               | —— a report route plus the directive; the apex redirect is a PF7 line                                                                                                                                                                                                                                 |
| **D14** | COLD               | —— tests that can fail, a byte-length cap, a normalized-path check                                                                                                                                                                                                                                    |
| **D15** | BLOCKED — backend  | Backend S-29 (HIGH, open on the backend board): the public image search has no visibility predicate. The frontend cannot filter — the payload carries no collection membership. When the backend fix deploys, the frontend purges `search-images` and the location/tag tags. Owner: the backend agent |
| **E7**  | COLD               | —— the waste shipped as a handoff guard (#337); the hook is REJECTED with measurement. One wasted path open (`EditModeLayer.tsx:281` reorder branch)                                                                                                                                                  |
| **B8**  | COLD               | —— 5 of 6 shipped; the one open bullet (`sharedObserver`/`useParallax`/`useContentReordering`) is explicitly optional                                                                                                                                                                                 |
| **F3**  | COLD               | —— five bullets shipped; the invite bullet is COSTED and REJECTED (do not re-open the 3-function version). **Four bullets open**                                                                                                                                                                      |
| **G4**  | COLD               | —— 1,494 blocks / 54 backward-looking hits (re-run 2026-09-05, method in the section); ~23 false positives; 17 label docblocks + 4 label inlines must be read block-by-block, not regexed                                                                                                             |
| **G7**  | COLD               | —— six `describe('Vercel BFF proxy …')` names in `tests/api/proxy/route.test.ts` plus one in `route.logHygiene.test.ts`; production is Amplify (feature-board PF9, #365)                                                                                                                              |
| **F1**  | COLD               | —— largest open item; no unanswered question, just size. Goes before feature-board MA1                                                                                                                                                                                                                |
| **H1**  | BLOCKED — **user** | Does the merged `Collections` count include follows (12 + 2 = 14), and does a followed-but-not-owned tile get a visual marker? Also: accept a 500-row catalog fetch on every `/user` load, or ask the backend to return followed collections on the user-page read?                                   |
| **H7**  | BLOCKED — **user** | Is passkey management on `/admin/users/[id]` wanted? Backend #257 built both routes; this repo calls neither. **Same feature as feature-board AU2 and its decision #4 — ask once, close this row against AU2**                                                                                        |
| **F4**  | BLOCKED — **user** | Stated in the item                                                                                                                                                                                                                                                                                    |
| **G3**  | BLOCKED — **user** | Delete `/user/selects` or rebuild it                                                                                                                                                                                                                                                                  |
| **E9**  | BLOCKED — **user** | `.srOnly`: SCSS `%placeholder`, yes or no? Both COLD bullets shipped in #300                                                                                                                                                                                                                          |
| **G2**  | BLOCKED — **user** | G2b: does the migration (and the `error` flip) cover `.ts` util/lib files? Evidence says yes (the global rule covers every language; #268's standard covers plain function bodies) — a confirm, not a design question. G2c rides other refactors. G2a is COLD                                         |
| **G8**  | BLOCKED — **user** | Extend the panel `styles.<key>` guard repo-wide? **Re-measured 2026-09-05: 107 files, 411 distinct keys** (commands in the CSS rule). 10 files import a CSS module under a name other than `styles`, so a `styles.<key>` regex silently skips them                                                    |

**Seven of the twenty-six rows are blocked on the user** (re-counted 2026-09-05; C15 came off the
list when the backend answered its question from the other side, and H7 is the same question as
feature-board decision #4), and one (D15) on the backend. The 2026-08-30 session cleared three
blocked rows by asking two questions and reading one other repo; 2026-08-31 (3) cleared C9 the same
way; 2026-09-05 cleared C15 the same way again. **Read the other repo's board before adding a row to
the blocked list** — it has now paid five times.

The seven that remain — H1, F4, G3, E9's `.srOnly`, G2b, G8, H7 — are genuine product or policy
calls. None of them blocks the current run. Put them to the user as one batch with the feature
board's decisions (#1, #2, #3, #4, #10, #14–#17), not as a second list.

**Shipped write-ups are not on this page.** Closed items live in
[`2026-summer-refactor/`](2026-summer-refactor/), one file per group (each with a "Closed rows"
ledger), plus the session log and lessons.md. An open item's row plus its live section is its whole
live record.

**Two structural estimate biases, confirmed 2026-08-23 across ten items.** Stop recalibrating
item by item; both causes are known and neither is going away.

1. **Group E "consolidations" come out flat or positive on source, never negative.** Scorecard:
   B6 0 vs −150, B5 −145 vs −350/−450, E5 0 vs −50, E9 +16 vs −100, E12 +72 vs +30, E10 −79
   code-only vs −60, **E4 +44 vs −80**, **G4 −50 vs −300/−500**. The cause is the same every time:
   **extracted units need docblocks the inline
   copies never had**, and this repo's no-inline-comment rule means that context has nowhere else to
   go. E9 is the clearest case — excluding docblocks its call sites drop 265 → 215 code lines and the
   two extracted files add exactly 50 back. Break-even by construction. When sizing a consolidation,
   quote the code-only delta and the raw delta separately, or the number will look like a failure.
   1b. **An extraction also buys a required test suite, and no Group E estimate has counted one.**
   Bias 1 names the docblock cost. E4 showed a second, additive one: `CLAUDE.md` requires tests for
   every new utility function, so extracting a shared module is never just moving code — it commits
   you to a new suite. Test actuals where a module was extracted: E1 +659, E9 +393, E12 +293, E4
   +177, E5 +139. None were predicted. **A consolidation's honest estimate is three numbers: code
   delta, docblock delta, new-test delta**, and only the first is ever negative.

2. **Group B estimates over-count preamble.** The estimates counted repeated _text_ and assumed
   repetition meant redundancy — one failure mode. B5 found the opposite one: the board counted
   whole preambles at 122–169 lines each (886 total) when only 460 of those lines were duplicated
   builders — the rest is per-file imports, `jest.mock` blocks and `jest.MockedFunction` casts that
   legitimately stay per-file. Count the duplicated _construct_, not the block it sits in.

---

## Group A — Pure deletions — ✅ FULLY CLOSED

All nine items merged (#255–#263); A9's last bullet — the `CLAUDE.md` PATH correction — closed
2026-08-30 (#347). Full write-ups and closed rows:
[group-a-deletions.md](2026-summer-refactor/group-a-deletions.md). **Nothing in Group A is open.**

---

## Group B — Test-suite reductions — shipped except B8's optional bullet

B1–B7 and B9 closed — write-ups, estimate corrections and closed rows:
[group-b-tests.md](2026-summer-refactor/group-b-tests.md). The suite is **57,306 lines against 36,685 source lines** (re-measured 2026-08-30:
`find tests -type f \( -name '*.ts' -o -name '*.tsx' \) -exec cat {} + | wc -l`, same for `app`).
The board carried 51,446/37,211 — stale by ~5,900 test lines, and nobody re-ran it because the
number reads as measured. **Do not quote this figure without re-running the command beside it.** Hygiene is otherwise excellent: zero skips, zero `.only`, zero snapshots, zero stale
TODOs.

### ◐ B8 · Fill the required-coverage gaps — 5 of 6 shipped (#266, #267, #295, #296); only the optional bullet is open

The project rule requires tests for these and they had none. The five shipped slices are in the
[archive](2026-summer-refactor/group-b-tests.md).

- [ ] If being thorough: `sharedObserver` (116), `useParallax` (161), `useContentReordering` (197,
      **was `198`; corrected 2026-08-27**). **Re-verified 2026-08-28: all three are still untested** —
      no `tests/utils/sharedObserver.test.ts`, no `tests/hooks/useParallax.test.ts`, and no suite for
      `useContentReordering`. This is the ONLY open B8 bullet, and it is explicitly optional.
      Est +400–600. `collectionToggle` came OFF this list 2026-08-22: `collectionEditUtils.ts:30`
      (**was `:28`; corrected 2026-08-25**) re-exports `toggleRelation`, and its coverage lives in
      `tests/components/ContentCollection/edit/collectionEditUtils.test.ts` since B1's merge.

---

## Group C — Bug fixes — C1–C8, C10 and C11 shipped; C9, C12–C18 open

C1–C8 merged (#264, #281, #282, #279, #283, #327, #331, #291); **C10 merged 2026-08-30 (#346)**;
**C11 merged 2026-08-30 (#352)** and sat on this board as COLD for six days.
Full write-ups and closed rows: [group-c-bugs.md](2026-summer-refactor/group-c-bugs.md). C4's
`collections-location-${slug}` report became E12.

**C14, C15 and C16 were filed 2026-08-31 (3) from a backend-side cross-repo review** — they were
found by an agent reading `edens.zac.backend`, not this repo. Every backend `file:line` below was
re-resolved by hand against `edens.zac.backend`'s `origin/main` at `9a8f70f` on the day of filing,
per this board's cross-repo rule. Re-verify them the same way before acting; they are outside every
drift sweep here.

### ☐ C12 · `.metadataToggle` is under the 44px tap target

Filed 2026-08-31 from feature-board PF8 (#367), which raised `SaveHeart` from 36px / 40px to 44px
at every width. `.metadataToggle` (`app/styles/fullscreen-image.module.scss:208`) is the control
SaveHeart was originally built to mirror and still carries the identical gap: 36px, rising to 40px
at `≥768px`. It is the fullscreen viewer's metadata toggle, so it is a touch control on a
touch-first surface.

PF8 named only SaveHeart, so this was deliberately left out of #367 rather than missed. SaveHeart's
docblock was updated in that PR to stop claiming the two are sized alike and to record this gap.

- [ ] `.metadataToggle` to 44px, dropping the `≥768px` step the way #367 did. Check the doubled
      selector (`.metadataToggle.metadataToggle`) and the second doubled block at `:544` that cites
      it by name. Est +3 src, no new tests — no suite pins either size.

### ☐ C13 · The byline says "Zac Eden" in three literals across two files; every other route says "Zac Edens"

Filed 2026-08-31, spotted while adding JSON-LD in #367; **re-scoped 2026-09-05 — three literals,
not one.** `app/[slug]/page.tsx:38` builds its fallback description as
`` `${title} — photography by Zac Eden` ``, and the home page's `metadata.description` and
`openGraph.description` (`app/page.tsx:8`, `:11`) both say "Photography portfolio by Zac Eden".
`/search`, `/tag/[slug]` and `/location/[slug]` say "Zac Edens", and the domain is `zacedens.com`,
so the outlier is the singular. It reaches users: these are the meta and OG/Twitter descriptions.

```bash
grep -rn 'Zac Eden\b' app --include='*.ts' --include='*.tsx' | grep -v Edens | wc -l   # 3
```

`app/utils/structuredData.ts` already hardcodes `AUTHOR_NAME = 'Zac Edens'` for the JSON-LD author.

- [ ] Read `AUTHOR_NAME` at all four routes rather than fix three strings — with three literals the
      consolidation is the smaller change. Est +8 src.

### ☐ C14 · `getCollectionsByLocation` sends `page` and `size`; the location endpoint reads neither

Filed 2026-08-31 (3) from the backend cross-repo review. **Live, mild. Cheapest item on the board.**

`app/lib/api/collections.ts:157` builds the query string as
`` `/collections/location/${encodeURIComponent(slug)}?page=${page}&size=${size}` ``. The backend's
handler takes four differently-named params — `collectionPage`, `collectionSize`, `imagePage`,
`imageSize` (`CollectionControllerProd.getLocationPage`, backend
[#258](https://github.com/themancalledzac/edens.zac.backend/pull/258) tree). Spring binds none of
`page`/`size` and drops them silently, so every request gets the defaults.

**Why nothing looks broken.** The backend's `collectionSize` default is `35` and
`PAGINATION.collectionPageSize` is also `35` (`app/constants/index.ts:175`), so today the ignored
value and the applied value happen to agree. The defect is that
`getCollectionsByLocation(slug, page, size)` at `app/lib/api/collections.ts:149-152` advertises two
parameters that do nothing: any caller asking for page 1 silently gets page 0. There is no such
caller yet — `app/location/[slug]/page.tsx:81` calls it with the slug alone — so this is a trap for
the next one, not a bug a user can see.

**Do not copy the fix to the two sibling calls.** `?page=&size=` is correct at
`collections.ts:84` (`/collections`) and `:114` (`/collections/${slug}`); only the location route
renamed its params. Check each route's own handler rather than sweeping the pattern.

- [ ] Rename the two query params to `collectionPage` and `collectionSize` in
      `getCollectionsByLocation`. Recommended test: assert the fetched URL contains
      `collectionPage=1` when the function is called with page 1 — today it contains `page=1`, so
      the test fails before the fix and passes after. Est +2 src / +15 test.

### ☐ C15 · `LocationPage` props are typed image-only; the backend field they name is now mixed content — COLD, type hygiene only

Filed 2026-08-31 (3) from the backend cross-repo review. **Re-scoped 2026-09-05: the product
question this sat BLOCKED on was answered on the backend board without anyone here reading it.**
Backend FE-1/BE-2 closed as won't-do — "the array is being dropped, so the location page stays on
`searchImages({ locationId })`" — so "switch to the endpoint's own `images`" is off the table.
What is left is the type mismatch below, and a watch: the backend's MR 19 "teach `searchImages`
to return GIFs" (COLD there) will put GIFs into `/search`, `/location` and `/tag` through
`ContentImageModel[]`-typed props the day it lands. Refs re-derived 2026-09-05 after #397 shifted
`contentFilter.ts`.

**What the backend changed.** [#258](https://github.com/themancalledzac/edens.zac.backend/pull/258)
widened `LocationPageResponse.images` from `List<ContentModels.Image>` to `List<ContentModel>`. The
orphan queries were renamed `findOrphanContentByLocationName`/`countOrphanContentByLocationName`
and now predicate on `content_type IN ('IMAGE', 'GIF')` instead of joining `content_image`. A
location-tagged GIF serializes into that array with `contentType: "GIF"`.

**What this repo declares.** Both props are still image-only:

- `app/components/LocationPage/LocationPage.tsx:14` — `images: ContentImageModel[]`
- `app/components/LocationPage/LocationPageClient.tsx:29` — `images: ContentImageModel[]`

**Why it is dormant.** Neither prop is fed by
that endpoint. `app/location/[slug]/page.tsx:81-82` fetches two things in parallel:
`getCollectionsByLocation(location.slug)` and `searchImages({ locationId: location.id })`.
`getCollectionsByLocation` (`app/lib/api/collections.ts:149-165`) hands the body to
`parseCollectionArrayResponse` (`:56-69`), which returns `data.content ?? data.collections ??
data.items` — it takes `.collections` and throws `.images`, `.location`, `.totalCollections` and
`.totalImages` away. The `images` prop comes from `searchImages`
(`app/lib/api/content.ts:128-153`), which hits `/api/read/content/images/search` and returns
images only, untouched by #258. **No GIF can reach this page today**, whatever the prop says.

**What would actually happen if one did.** Nothing crashes and no tile renders blank.
`LocationPageClient.tsx:56-58` already narrows before rendering, so the GIF is dropped from the
grid. But the _unfiltered_ array still feeds the count and all three filter helpers:

- `LocationPage.tsx:41` — `count={images.length}` on `CollectionHeader`
- `LocationPageClient.tsx:45` — `extractFilterOptions(images)`
- `LocationPageClient.tsx:47` — `computeFilterVisibility(images)`
- `LocationPageClient.tsx:65` — `computeFilterCounts(images, ...)`

So the symptom is an off-by-one header — "12 photos" over 11 tiles — plus filter counts that
include a row the grid does not show. Not a crash, not a wrong aspect ratio.

**Copy the precedent; do not invent one.** `CollectionPageClient.tsx:318-360` already solves this
exact shape. It holds mixed `allContent`, derives `allImages = allContent.filter(isImageContent)`
at `:323` purely to compute filter dimensions, and passes the mixed set to the renderer. Everything
downstream of `LocationPageClient` already accepts mixed content — `filterContent`
(`app/utils/contentFilter.ts:163`), `extractFilterOptions` (`:311`), `computeFilterCounts`
(`:542`), `processContentBlocks` (`app/utils/contentLayout.ts:408-414`) and
`ContentBlockWithFullScreen` (`app/components/Content/ContentBlockWithFullScreen.tsx:26`).
**Only `computeFilterVisibility` (`contentFilter.ts:465`) is image-typed**, which is why the
precedent narrows for that one call and nothing else. `normalizeContentToRendererProps`
(`app/utils/contentRendererUtils.ts`) already has a GIF branch emitting `isGif`/`thumbnailUrl`, so
the renderer needs nothing new.

**Fix shape, when it is wanted.** Widen both props to `ViewableContent`
(`app/types/Content.ts:443` — exactly `ContentImageModel | ContentParallaxImageModel |
ContentGifModel`, the right union for a page showing stills and GIFs and nothing else). Keep an
`isImageContent` narrowing for the `computeFilterVisibility` call. Delete the
`contentType === 'IMAGE'` filter at `LocationPageClient.tsx:56-58`. **Leave `coverImage` at
`LocationPage.tsx:15` as `ContentImageModel | null`** — a GIF makes a poor header cover, and
`app/location/[slug]/page.tsx:87` picks it from the `searchImages` result either way.

- ~~BLOCKED — user: should `/location/{slug}` switch to the location endpoint's own `images`?~~
  **Answered on the backend board (FE-1, won't-do): the array is being dropped; the page stays on
  `searchImages`.** Off the table here.
- [ ] Widen the props as above as type hygiene, or record that the page is deliberately images-only
      and close this item. Est +6 src / +25 test. Either way, add the watch: when the backend's
      `searchImages` starts returning GIFs, the narrowing at `LocationPageClient.tsx:56-58` is the
      only thing between a GIF and an image-typed grid on three routes.

### ☐ C16 · `imageWidth` / `imageHeight` are declared non-nullable and the backend now writes `null`

Filed 2026-08-31 (3) from the backend cross-repo review. **Type accuracy only. No runtime change,
and that is verified rather than assumed.**

Backend [#249](https://github.com/themancalledzac/edens.zac.backend/pull/249) changed both defaults
in `ImageProcessingService.applyMetadataToEntity` from `0` to `null`
(`parseIntegerOrDefault(metadata.get("imageWidth"), null)`). The wire type was already `Integer`,
so only the value moved, and only when the image-header read fails — RAW or HEIC with no
`ImageReader` plugin.

`app/types/Content.ts:156-157` declares `imageWidth?: number; imageHeight?: number`, which cannot
hold the value the backend now sends.

**Nothing renders differently.** `getContentDimensions` (`app/utils/contentTypeGuards.ts:86`) gates on
`if (block.imageWidth && block.imageHeight)`; `0` and `null` are both falsy, so both land on the
same fallback chain (`width`/`height`, then 1300 at 3:2). This is a declaration that is false, not
a bug a user can reach.

- [ ] Widen to `imageWidth?: number | null; imageHeight?: number | null`, then run `tsc --noEmit`
      and fix whatever the widening surfaces — the value of this item is entirely in what the
      compiler then complains about. Est +2 src, unknown call-site churn until the compiler is run.
      **This is C9's sibling, not a duplicate of it:** C9 is about the header that disappears, this
      is about the type. See the C9 update below — the same backend PR unblocked it.

### ☐ C17 · Lens selection is not URL-shareable

Filed 2026-09-05 from the full-board review (the 2026-09-04 handoff's §8.5).
`ContentFilterCriteria.lenses` is the only non-`*MatchMode` field `serializeFilterToParams`
(`app/utils/contentFilter.ts`) never emits, `parseFilterFromParams` never reads, and
`FILTER_PARAM_KEYS` never lists. A lens picked on `/search`, `/location/[slug]` or a collection
page filters the live view and vanishes on reload or share — all three surfaces seed from
`useFilterUrlState`. `buildCollectionCriteria`'s docblock records the drop as known;
`searchFilters.ts:29` and `tests/components/SearchPage/searchFilters.test.ts:96` pin it as current
behaviour.

```bash
sed -n '/^export interface ContentFilterCriteria/,/^}/p' app/utils/contentFilter.ts \
  | grep -oE '^  [a-zA-Z]+\??:' | tr -d ' ?:' | sort > $TMPDIR/crit
sed -n '/^export function serializeFilterToParams/,/^}/p' app/utils/contentFilter.ts \
  | grep -oE 'criteria\.[a-zA-Z]+' | sed 's/criteria\.//' | sort -u > $TMPDIR/ser
comm -23 $TMPDIR/crit $TMPDIR/ser
# → cameraMatchMode lensMatchMode lenses peopleMatchMode tagMatchMode
```

The guard did not catch it because `EVERY_CRITERION` in
`tests/utils/contentFilter.filterParamKeys.test.ts` never sets `lenses` — the same hole that hid
`year` before #376 and that film stock had to close by hand in #397. A guard keyed on "every field"
guards only what its fixture sets.

- [ ] Add `'lens'` to `FILTER_PARAM_KEYS`; `params.append('lens', l)` per lens in the serializer;
      `getAll('lens')` in the parser; seed `selectedLenses` from `initialCriteria.lenses` in
      `seedFilterState`, `LocationPageClient` and `CollectionPageClient`. Delete the two docblock
      sentences that describe the gap and flip `searchFilters.test.ts:96` to assert the round-trip.
- [ ] Test that fails before the fix, in `contentFilter.filterParamKeys.test.ts`: serialize
      `{ lenses: ['FE 35mm'] }`, expect `params.get('lens')` to be `'FE 35mm'` and
      `parseFilterFromParams(params).lenses` to round-trip.
- [ ] Durable guard: type the fixture `Required<ContentFilterCriteria>` so a field added without a
      fixture value is a `tsc` error; then `it.each` over every key except the four `*MatchMode`s,
      asserting that the single-field criteria emits at least one URL key. That second test is the
      one that would have failed on `lenses` today and on `year` before #376.
- [ ] Ride-along: `hasAnyActiveFilter` (`contentFilter.ts:962-973`) omits `selectedFilmTypes`.
      Unobservable today — its consumers (`CollectionPageClient`, `EditModeLayer`) never render the
      film toggle — and a bug the day one does. Its key-enumerating test at
      `contentFilter.test.ts:1226-1232` omits it too. Est +6 src / +20 test for the whole item.

### ☐ C18 · `CollectionRolesSection`'s mount fetch has no unmount guard

Filed 2026-09-05 from the full jest run (260 suites, 4,737 tests, green — with 96 React `act()`
warnings, 60 of which trace here). `app/components/ContentCollection/edit/sections/CollectionRolesSection.tsx:53-60`
runs `listCollectionRoles(collectionId).then(setGrants).catch(…)` and
`listRoles().then(setAllRoles).catch(…)` in its mount effect with no cancellation: `setGrants`,
`setAllRoles` and `setError` fire whether or not the component is still mounted, and a fast
`collectionId` change can land the previous collection's roles on the new one. `useFetchMe.ts:46`
already shows the repo's shape for this (`if (isCurrent()) …`).

- [ ] Add the guard (a `let current = true` flag cleared in the effect's cleanup, or the
      `isCurrent()` pattern), gate all three setters on it, and add a test that unmounts before the
      promise resolves and asserts no state update — it fails today with the `act()` warning as
      the symptom. Est +8 src / +20 test.
- [ ] `app/components/UserForm/UserRolesSection.tsx:90-104` has the same `useEffect`-fetch-then-set
      shape (4 of the 96 warnings). Read it; fix it in the same MR if it lacks the guard.

### ☐ C9 · A dimensionless cover renders no header — UNBLOCKED 2026-08-31: backend Bug #21 shipped

Found by B4 (#289) while merging the duplicated `createHeaderRow` describes. Both test copies
encoded it correctly, so it is behaviour as written rather than a regression.

The two paths, both re-verified 2026-08-30 (`contentLayout.ts:644-646` and `:650-652`, byte-identical
since E15 changed the signature):

- `coverImage` absent (`undefined` **or** `null`) → `createTextOnlyHeaderRow`, a one-item TEXT row
  when metadata exists. A collection with a description and no cover renders a header.
- `coverImage` present but missing `imageWidth`/`imageHeight` → `null` unconditionally, metadata
  ignored. The same collection with a broken cover renders nothing.

**The user answered on 2026-08-30, and the answer re-routed the item rather than settling it: never
fall back.** Verbatim: _"why would a cover image ever have no image width or height? This seems more
like an edge case BUG or underlying issue from the backend... we should NEVER HAVE AN IMAGE WITHOUT
height/width... we should NEVER be caught in this situation."_ So the frontend adds no fallback, and
the existing pins stay as they are — `tests/utils/contentLayout.test.ts:1329`/`:1341` and
`:1355-1367` already fail if either branch flips.

**What the answer turned this into, chased down the same session.** The premise "this should never
happen" is not true today, and the frontend is not where it is fixable:

- `ImageProcessingService.applyMetadataToEntity:465-468` writes
  `parseIntegerOrDefault(metadata.get("imageWidth"), 0)` — **the default is `0`, not null**. So a
  photo whose dimensions cannot be determined is persisted as `0 x 0`, not as a null.
- The backend already tries hard first: `ensureDimensions`/`ensureDimensionsFromPath` read width
  and height off the image header when EXIF lacks them (`putDimensionsFromHeader:399-420`). **That
  fallback fails soft in three places** — null input stream, no `ImageReader` for the format, or a
  swallowed `IOException` — and each one lands on `0`. The realistic trigger is the no-reader
  branch: RAW or HEIC without a plugin.
- `0` is falsy in JS, so `!coverBlock.imageWidth` catches it exactly like `undefined` and the
  header disappears.
- **The sibling path gets it wrong the other way.** `parallaxCard.ts:135-136` falls back to a
  1000px square via `raw.imageWidth ?? SQUARE_FALLBACK_SIDE` — but `??` catches only
  null/undefined, so a `0` sails through the fallback built for exactly this case. One sentinel,
  two consumers, two different wrong answers.

**UNBLOCKED 2026-08-31 (3). Backend Bug #21 shipped as
[#249](https://github.com/themancalledzac/edens.zac.backend/pull/249) and this item's own condition
for closing is met.** Verified by reading the backend's `origin/main`, not the commit message: both
defaults in `ImageProcessingService.applyMetadataToEntity` now read
`parseIntegerOrDefault(metadata.get("imageWidth"), null)`. The backend fixed the sentinel only and
deliberately left the frontend fallbacks alone, which is what this item asked for. So
`parallaxCard.ts:135-136`'s `?? SQUARE_FALLBACK_SIDE` now catches the value it was written for.

**One thing the backend PR does not do, and it decides whether this closes at zero code: there is
no backfill.** #249 changed what new writes persist. Any row written as `0 x 0` before it is still
`0 x 0`, and `??` still sails past those. Settle that before ticking the box.

- [ ] **Check for surviving `0 x 0` rows before closing.** If none exist, close this item with
      **zero frontend code** as designed and delete nothing else. If some do, the question is a
      backend backfill — still not a frontend fallback. Do not pre-empt either with a frontend
      guard; that is the fallback the user explicitly rejected on 2026-08-30.
- [ ] Leave the existing pins alone — `tests/utils/contentLayout.test.ts:1329`/`:1341` and
      `:1355-1367` already fail if either branch flips, and they stay correct under both outcomes.

**Lesson, hoisted to "How to use this doc":** a "should we handle this bad state?" item is often a
"why does this bad state exist?" item wearing a costume. Ask where the value is produced before
costing a way to tolerate it.

---

## Group D — Security — D1–D10 CLOSED; D11–D15 filed 2026-09-05 from an adversarial re-review

D1–D9 merged 2026-08-24 and **D10 merged 2026-08-30 (#353)** while this board still called it COLD
— full write-ups and closed rows: [group-d-security.md](2026-summer-refactor/group-d-security.md).
D7's one residual bullet moved to E10. The 2026-09-05 adversarial pass attacked the whole merged set
(18 traversal spellings, 17 malformed origins, header injection, the live headers on both hosts,
the admin gate including `?manage=1`, secrets) and found **no HIGH**; what held is recorded under
"Verified fine". It also answered the cache-key question the feature board's PF13 left open: Next
16.3.1 hashes request headers into the fetch-cache key (`incremental-cache/index.js:284-305`,
only `traceparent`/`tracestate` excluded), so the gallery gate's locked and unlocked payloads never
share an entry. D11 pins that. The five items below are what it found.

### ☐ D11 · Gallery-access save never evicts `collection-{slug}`; the cache-key contract is unpinned

`getCollectionBySlug` forwards cookies AND tags its fetch `collection-{slug}` with
`revalidate: 3600`. That is safe only because Next hashes the `Cookie` header into the cache key —
reproduced against the real `IncrementalCache.generateCacheKey`: four cookie strings on one URL,
four distinct hashes. Two consequences, one item:

- `handleSaveGalleryAccess` and `handleClearPassword` (`useCollectionEdit.tsx:851`, `:884`) call
  `saveGalleryAccess` and never `revalidateCollectionCache(slug)`. A visitor who unlocked before a
  password change or clear keeps getting the cached unlocked body under their old cookie for up to
  `TIMING.revalidateCache` (3600s). Bounded, needs prior legitimate access — and the one place the
  gate's "backend nulls `content`" contract is silently overridden by the cache. The admin edit
  path already evicts every variant (`revalidateTag` is per entry, independent of the key).
- Nothing pins the framework side. `tests/lib/api/core.test.ts:51` pins that `fetchReadApi` sends
  the cookie; a `next` release that stopped hashing `cookie` the way it skips `traceparent` would
  merge locked and unlocked payloads, and no test here would go red.

- [ ] `void revalidateCollectionCache(collection.slug)` after both `saveGalleryAccess` calls (and
      children when `propagateToChildren`). Test: a save posts the `collection-<slug>` tag; today it
      posts nothing.
- [ ] `tests/lib/api/fetchCacheKey.test.ts`: call `IncrementalCache.prototype.generateCacheKey`
      from the installed Next with and without a `Cookie` header on one URL, assert the hashes
      differ. Est +2 src / +30 test.

### ☐ D12 · Client error reports log the share and invite tokens

`logger.ts:113` sends `url: window.location.href` with every client error report. On `/s/<token>`
and `/invite/<token>` the URL is the credential — the share token grants a rolling 30-day view and
the invite token creates an account — and `app/s/[token]/ShareSession.tsx:34` and `app/error.tsx:16`
both fire on those pages. `app/invite/[token]/page.tsx` sets `referrer: 'no-referrer'` specifically
to keep that token off the wire; the log line undoes the control. Path: `logger.error` → `write` →
`reportToServer` → POST `/api/client-errors` → `console.error` → CloudWatch.

- [ ] Send `window.location.pathname` with `/s/*` and `/invite/*` collapsed to `/s/[token]` and
      `/invite/[token]`. Pin with a jsdom test on `logger.error` asserting the posted body never
      contains the token. Est +6 src / +20 test.

### ☐ D13 · Report-only CSP has no `report-uri`; the apex host silently 403s every write

`next.config.js:38-49`'s `Content-Security-Policy-Report-Only` ends at `connect-src 'self'` with no
reporting directive (verified live on `https://www.zacedens.com/`). Violations go to visitors'
devtools consoles and nowhere else, so production traffic can never satisfy the docblock's
graduation condition ("rename once a pass over the real pages leaves it quiet").

Found alongside: `https://zacedens.com` (apex) serves the site with a 200 and no redirect to `www`,
and `isAllowedWriteOrigin` admits exactly the one origin `NEXT_PUBLIC_APP_URL` names — so the other
host gets a silent 403 on every write (`/api/proxy` writes, `/api/revalidate`, `/api/client-errors`).
Fails closed; availability only. The redirect belongs at the DNS/Amplify layer and is recorded on
feature-board PF7 (the CloudFlare pass), not here.

- [ ] A `POST /api/csp-report` route writing one clipped JSON line (CSP reports are
      `application/csp-report` and carry no usable `Origin`, so `/api/client-errors`' origin gate
      cannot be reused as-is), and `report-uri /api/csp-report` on the policy;
      `tests/next.config.test.ts` gains the assertion. Same cost model as PF6. Est ~+40 src / +30 test.

### ☐ D14 · Proxy body-cap tests that cannot fail; `client-errors` cap counts UTF-16 units; two small proxy gaps

- The declared-length early reject in `app/api/proxy/[...path]/route.ts:131-133` has no test
  that can fail: `NextRequest` never sets `content-length` for a string or `Uint8Array` body, and
  no proxy test sets the header by hand, so deleting the branch leaves all 35 tests green.
  `tests/api/client-errors/route.test.ts` shows the pattern that bites (`contentLength: '900000'`).
- `/api/client-errors`' cap compares `raw.length`, UTF-16 units: 4,096 astral characters is
  `length === 8192` and 16,384 bytes.
- The production admin/edit early reject (`route.ts:99-111`) reads the raw joined path while
  `isProxyableApiPath` reads the normalized one; `api/../api/admin/users` passes the prefix check
  and would be forwarded anonymously. Not reachable over HTTP (CloudFront and Next normalize first;
  verified live with `curl --path-as-is`), and `api/..;/actuator/env` is forwarded but Spring's
  firewall answers 400. Two lines close both.
- The strip list omits `forwarded` and `true-client-ip`. The backend reads only `X-Real-IP`, so no
  effect today.
- The `getSetCookie()` re-emit block (`route.ts:158-163`) is redundant on Node 25 and its test
  cannot detect deletion. Keep or drop; if kept, make the test's mock lack `getSetCookie`.

- [ ] One proxy test with `headers: {'content-length': '17000'}` and a 2-byte body asserting 413
      with `fetch` never called; `Buffer.byteLength(raw)` in `/api/client-errors`; compute
      `normalized` once and run both proxy checks on it, rejecting `;`; add the two headers to the
      strip list. Est +10 src / +30 test.

### ⛔ D15 · Public routes surface client-gallery images through the unfiltered backend search — BLOCKED on backend S-29

**Backend S-29 (HIGH, open on the backend board since 2026-08-22, never worked):**
`GET /api/read/content/images/search` returns every image in the database with no
collection-visibility and no gallery-password predicate. `SecurityConfig` falls through to
`permitAll()` for `/api/read/**`, and `ContentRepository.appendSearchConditions` filters on tag,
person, camera, lens, location, rating, film, B&W and capture date only — zero `visibility`,
`gallery_password` or `collection_content` terms. The payload carries unsigned CloudFront URLs.
The user confirmed on 2026-09-02 that client galleries hold images published nowhere else.

**Three public frontend routes issue that query, anonymously, and cache the result:**

| Route              | Call (`searchImages`, `app/lib/api/content.ts:128`)                 | Effect                                                           |
| ------------------ | ------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `/search`          | `app/search/SearchResults.tsx:12` — `{ size: SEARCH_RESULT_LIMIT }` | the first 200 images in the database by capture date, unfiltered |
| `/location/[slug]` | `app/location/[slug]/page.tsx:82` — `{ locationId }`                | every image at the location, default 50                          |
| `/tag/[slug]`      | `app/tag/[slug]/page.tsx:48` — `{ tagIds }`                         | every image with the tag, default 50                             |

All three go through `fetchPublicRead` with `next: { revalidate: 3600, tags: ['search-images'] }`,
so private images are also held in the Next data cache and served through Amplify's CloudFront.
**The frontend cannot filter:** the search path never populates `ContentImageModel.collections`,
and `applyVisibilityScope` (`contentFilter.ts:1087-1127`) only ever looks at collection tiles. SD1
shipped `/search` (#357) with no note that the corpus is unfiltered; neither board tracked this
until 2026-09-05.

- [ ] **Backend fix (S-29) — the backend agent's; do not build it here.** The frontend's part, when
      it deploys: `revalidateTag('search-images')` plus the location and tag tags, or a deploy that
      clears the data cache — otherwise the old response lives on for up to 3600s.
- [ ] Decide whether `/search` should stop requesting an unfiltered 200-image corpus with no
      criteria. It only shrinks the window; it does not close it.

---

## Group E — Consolidations

Behavior-preserving refactors. E1–E5, E8 and E10–E17 shipped, **E6 closed 2026-08-30** (its last
bullet folded into F1), and **E18 shipped 2026-08-30 as #354** — both halves and the ride-along in
one commit, while this board called it COLD for six days and the 2026-09-04 handoff still called
Half B "genuinely open" (the hook's `collection` derives from `currentState`, so the premise was
false). Full write-ups and closed rows:
[group-e-consolidations.md](2026-summer-refactor/group-e-consolidations.md). E7 and E9 are open
below.

### ◐ E7 · Edit-grid handoff — the waste is FIXED (#337); the hook is REJECTED; one path open

The parent's double pipeline was fixed by a four-line handoff guard (#337, +22 src / +87 test). The
shared-hook proposal was REJECTED with measurement — a hook serving both sites takes 9–11
parameters, four of them pure behavior switches. The close-out and full rejection analysis are in
the [archive](2026-summer-refactor/group-e-consolidations.md). **Guardrail: the parent's remaining
filter work (`filteredContent:357` → `filteredImages:362` → `filteredAvailableOptions:404`; re-derived 2026-09-05) is NOT
waste — it drives filter-chip greying while editing. Only `contentBlocks`-shaped work is dead
while the layer is mounted.** (The #337 guard's exit-path bug was C10, merged #346.)

- [ ] **A fourth wasted path inside the layer.**
      `EditModeLayer.tsx:281` renders `content={reorderActive ? edit.displayContent : contentBlocks}`,
      so in reorder mode the layer's OWN `contentBlocks` is computed and discarded in favour of
      `useCollectionEdit`'s separately-processed `displayContent`. Same shape as the bug #337
      fixed, one level down. Unsized.
      Not a checkbox, a count (moved to "Verified fine" 2026-09-05): `useCollectionEdit.tsx:563-575`
      (`processedContent`) is a third `processContentBlocks` caller in the collection-page path, and
      repo-wide there are **six** — `SearchPageClient.tsx:84` (SD1), `TaxonomyPage.tsx:13`,
      `LocationPageClient.tsx:83` plus the three collection-page callers. Say which number you mean.

### ◐ E9 · Download icon/hook, auth-card SCSS, `.srOnly` — PR #300; srOnly ⛔

Both COLD bullets shipped in #300 — write-ups in the
[archive](2026-summer-refactor/group-e-consolidations.md).

- [ ] `.srOnly` is copy-pasted in 6 modules (was 7 — one copy fell to A8's sweep; re-counted 6 on
      2026-08-29). This is documented policy, but an SCSS `%placeholder` honors the
      no-global-utility rule and collapses ~50 lines. ⛔ Needs the G2-style USER decision, not a
      violation report.

---

## Group F — Structural

Bigger, optional, sequenced last. Do each individually and verify on :3000. F2, F5, F6 and F7
shipped — full write-ups, closed rows, F3's shipped bullets and F1's boundary-drift history:
[group-f-structural.md](2026-summer-refactor/group-f-structural.md). F1, F3 and F4 remain open.

### ☐ F1 · Decompose `useCollectionEdit.tsx` (1,811 lines as of #370)

- [ ] Split along the pattern the file already established (`useContentReordering`,
      `useCoverImageSelection`, …): `useAdminCollectionState`, `useCollectionPeople` +
      `useGalleryAccess`, `useCollectionRelations`, `useContentOps`, `useManageBar` — **five hooks,
      not six: the update-form region stays put for MA1** (below). **Boundaries are anchor →
      anchor, never line ranges; re-derive each with `grep -n` before splitting.** They were
      invalidated four times by line drift (three merges, one formatter — history in the archive),
      and all eight anchors had moved again by 2026-09-05 (#354, #370). At `699aa4f2`:
  - state — `const [currentState` (`:320`) → the line before `const [editTab` (`:430`).
  - update form — `const seedUpdateData` (`:447`) → `handleUpdate`'s dependency array
    `[collection, currentState, updateData, router, adoptSaveResponse]` (`:827`). **Not extracted by
    F1: MA1 rewrites this region into `commitField`.**
  - people + gallery — `const [collectionPeople` (`:478`) → `handleClearPassword`'s closing
    `}, [collection]);` (`:893`). The old boundary stopped at `handleSaveAccess`'s deps (`:876`)
    and left `handleClearPassword` outside.
  - content ops — `const handleMediaUpload` (`:901`) → the line before
    `const handleLocationsChange` (`:1264`). The old `:1220` end sat mid-`handleLocationsChange`,
    which is a RELATIONS concern and starts the next region.
  - relations — `const handleLocationsChange` (`:1264`; `const currentTags` at `:1278`) → the line
    before `const enterSelect` (`:1453`).
  - manage bar — `const enterSelect` (`:1453`) → end of the hook body. `enterReorder` (`:1468`)
    sits inside this region now — it no longer straddles; the old "straddle" was an artefact of
    stale line numbers. It reads `processedContent` (content ops), which is the cross-region
    dependency to design for.

  Keep the `UseCollectionEditResult` facade so the six suites (`test`, `buffer`, `handlers`,
  `bulkRemove`, `escapeSelection`, `delete`), `locationCacheRevalidation.test.tsx` and
  `collectionEditFixtures.ts`'s ~70-member result builder do not churn. No file over ~450 lines.

- [ ] This also dissolves `EditModeLayer`'s FOUR `exhaustive-deps` suppressions (`:136`, `:206`,
      `:213`, `:220` — re-verified 2026-09-05).

**Ordering with feature-board MA1 (decided 2026-09-05): F1 lands first and does NOT extract the
update-form region (`const seedUpdateData` → `handleUpdate`'s dependency array).** MA1's Tasks 2–3
rewrite that region into `commitField`; extracting `useCollectionUpdateForm` now is work MA1
deletes. F1 extracts the other five hooks and leaves `handleUpdate`, `updateData` and the buffer in
place; MA1 must not re-inline them, and must leave `useCollectionEdit.buffer.test.tsx` green until
its own Task 11 rewrites it. With E18 closed and E7's remaining bullet in `EditModeLayer.tsx`, the
open items touching the files MA1 deletes are F1, G4 and G2c — and the last two ride whichever
lands.

**Absorbed from E6 on 2026-08-30 (user decision), and it is a behaviour change, not a refactor.**
E6's last bullet — three copies of "refetch → adopt → storage-write → revalidate → clear selection"
in `handleMetadataSaveSuccess:1032`, `handleGifSaveSuccess:1063` and `handleDeleteSuccess:1084` —
was put to the user as "bug or intentional?" and answered **"leave it for the big hook rewrite"**.
F1 has to touch all three functions anyway. Carry these facts, measured on 2026-08-28 and
re-verified 2026-08-30:

- The GIF path **omits `revalidateMetadataCache` entirely** and adopts FIRST; the metadata path
  adopts LAST through `mergeNewMetadata` and calls `updateImagesInCache`; the delete path adopts
  first and keeps the revalidate. Only `handleDeleteSuccess` carries the loud missing-slug guard
  (`:1085-1091`); all three `setError` in their catch blocks (`:1057`/`:1078`/`:1109`).
- A shared helper needs `revalidateMetadata`, `failLoudly` and `adoptFirst`/`transform` — **three
  of roughly six parameters existing purely to switch behaviour between callers.** That is why the
  standalone consolidation was rejected; inside F1 the same change is a split, not a parameterised
  merge.
- **User-visible consequence, unfixed until F1:** after saving a GIF the public page can serve stale
  metadata until `TIMING.revalidateCache` (3600s) expires. Two of the three
  `refreshCollectionAfterOperation` callers (`handleMediaUpload:901` at `:914`,
  `handleTextBlockSubmit:952` at `:964`) skip server-cache revalidation the same way; only
  `useCaptureDateSelection.ts:70` follows up. (E18 closed the location-tag half of this class.)

### ◐ F3 · File moves and renames — `ReorderMove` (#324), `getUserPage` (#336), logger labels (#343), `CollectionPageWrapper` (#348) and the `AdminPanel/` fold (#349) SHIPPED; invite move REJECTED; four bullets open

Shipped close-outs, the mock-declaration lesson and the full invite cost report:
[group-f-structural.md](2026-summer-refactor/group-f-structural.md). Each open bullet below carries
its verification date; do them one or two at a time — bundling buries the interesting change in a
rename sweep nobody reviews carefully.

- [ ] `contactApi.ts` → `lib/api/` (fold into the tracked Wave B ApiError item). **STILL ACCURATE
      (re-verified 2026-08-29).** Still at `app/utils/contactApi.ts`, 61 lines, and it does hand-roll a result
      union instead of `ApiError` — `ContactResult` at `:6-8`, where every other `lib/api/` module
      throws `ApiError` from `core.ts`. The Wave B item is real and unshipped
      (`docs/006-code-health.md:30`). **Destination note the bullet does not have:**
      `app/lib/api/messages.ts` already exists but holds only the admin side (`getAdminMessages`,
      `deleteAdminMessage`, `markMessageRead` since #396); `submitContactMessage` posts to the public
      `/api/proxy/api/public/messages`, so it belongs in that file rather than a new one. 1 src / 3
      test.
- [ ] `fullscreen-image.module.scss` → `FullScreenModal.module.scss`. **PARTLY ACCURATE — the move
      is fine, the original justification was wrong.** `app/styles/` holds THREE files:
      `auth-card.module.scss`, `fullscreen-image.module.scss`, `globals.css`; after the move it
      holds two, not one. `auth-card.module.scss` has a reason to stay — shared by
      `app/login/page.tsx` and `app/invite/[token]/page.tsx`, documented in
      `tests/styles/scssImportResolution.test.ts:3`. **Do the rename; drop the "only `globals.css`"
      clause.** 2 src / 0 test — importers are `FullScreenModal.tsx` and `useFullScreenImage.tsx`
      (re-verified 2026-08-29); `tests/styles/breakpointConsistency.test.ts` walks `app/`
      recursively (`:18` — **was quoted `:17`; corrected 2026-08-29**) so it needs no update, but
      its docblock (`:2`) names the file in prose and goes stale on rename — no code edit.
      **Collision found 2026-08-30: one of E9's six `.srOnly` copies lives in this very file.**
      Whichever of the two ships second inherits the other's churn. Not a blocker; do the rename
      first if both are ever scheduled, since it is the smaller diff.
- [ ] Rename the lowercase `auth/` and `messages/` component directories. **PARTLY ACCURATE — both
      are lowercase, but the bullet omits a third and needs to say why.** `app/components/` has
      **38 entries** (`ls app/components | wc -l`, re-run 2026-09-05 — SD1 and #396 added two) and
      THREE are lowercase: `auth/`, `messages/`, `ui/`. The other 35 are PascalCase, the documented convention. **`ui/` should
      stay lowercase and the bullet must say so**, or whoever picks this up will "fix" it: `ui/` is
      a namespace holding 23 PascalCase component folders (`ui/Button/Button.tsx`,
      `ui/Modal/Modal.tsx`, …), not a component. `auth/` and `messages/` hold exactly one file each
      — `auth/MeProvider.tsx`, `messages/MessageRow.tsx` — so they are components misfiled as
      namespaces. 9 src / 9 test combined.
- [ ] `collectionEditUtils.ts` log labels are consistent-stale no more, but still inconsistent
      (found 2026-08-28 while shipping #343): `:437` logs under `'replayMoves'` (the call is `:437`, the label string sits on `:438`) — the FUNCTION
      name, where the other three (`:225`/`:279`/`:305`) now use the MODULE name. Not stale
      (`replayMoves` exists at `:432`; re-verified 2026-08-29), so #343 left it. **The open
      question is which convention this repo wants**: `useCollectionEdit.tsx` logs under
      `'useCollectionEdit'` (module), so module-name is dominant, but nothing writes it down. 1 src
      / 0 test if the answer is "module". Low value alone — fold it into whichever MR next touches
      this file.
- ~~Invite functions from `users.ts` → `auth.ts`.~~ **COSTED 2026-08-27 and REJECTED — no longer a
  checkbox.** The move relocates the three-perimeter mix rather than reducing it, and it splits
  invite issuance across two files (`createUser:42` and `upgradeUser:109` both return fresh
  `inviteUrl`s and plainly stay in `users.ts`) — a worse boundary than the one it replaces. The
  version that WOULD pay, recorded so no one re-litigates the 3-function version: split public
  invite REDEMPTION (`getInvitePreview:158` + `acceptInvite:240`, both unauthenticated, both driven
  by `app/invite/[token]/`) from everything else, leaving `regenerateInvite:87` beside issuance.
  Two functions, one perimeter per file. Not proposed as a task. Full cost report:
  [group-f-structural.md](2026-summer-refactor/group-f-structural.md).

### ⛔ F4 · `TaxonomyPage` ← `LocationPageClient` — USER DECISION

- [ ] Tag pages are location pages minus filters. Consolidating deletes `TaxonomyPage` and gives tag pages filters for free. Candidate, not a defect.
- [ ] Re-scoped 2026-08-22: the delta is bigger than "minus filters". Both render the byte-identical
      `ContentBlockWithFullScreen` call under the same frame, but LocationPage also carries
      `LocationCollections`, a cover on the header, and `FollowsProvider` seeding — and TaxonomyPage
      is a 32-line SERVER page, so consolidation converts tag pages to a client page. Product call
      for the user: should tag pages gain filters, the collections strip, and follow seeding? Not
      startable until answered.

---

## Group G — Decisions and docs

G1 shipped (#303) and **G5 closed 2026-08-30 with zero frontend code** — the backend blessed bare
arrays in its own `CLAUDE.md` (#243), which was the decision G5 was waiting on. Write-ups and closed
rows: [group-g-decisions.md](2026-summer-refactor/group-g-decisions.md), which also holds G2's
superseded per-file inventory and G4's measurement history. **G6 shipped 2026-08-31 as PR #351.**
G2, G3 and G4 are open below.

### ◐ G2 · Inline-comment rule — DECIDED 2026-08-22: keep and enforce; G2a COLD, G2b/G2c ⛔

The review recommended relaxing the rule; the user overruled it. The standard: no why-comments inline. The why belongs in the docblock of the function it explains. If a function's docblock would get too big because there is too much going on in the function, split the function — do not comment inline. CLAUDE.md now carries this wording. Do not propose relaxing the rule again.

- [x] **Commit the CLAUDE.md wording — PR #268.** Landed on its own, as instructed. The rule now
      covers plain function bodies (not just component bodies) and closes the "but this is
      why-context" exception explicitly. This is the standard G2a's ESLint rule has to enforce.

Inventory at decision time: 15 JSX `{/* */}` comments + 504 `//` lines in 226 blocks across 56 files (AST sweep of comments inside function/component bodies; module-scope headers and `eslint-`/`@ts-` directives excluded). Line refs drift as MRs land — regenerate the sweep before each migration MR.

**⛔ Scope call found 2026-08-22: that inventory was a `.tsx`-only sweep.** Recorded then: `.tsx` =
506 lines / 228 blocks / 55 files, `.ts` adding 416 / 174 / 35, `app/**` total 922 / 402 / 90.

> **⚠ Every `//` figure in this item is UNCHECKED as of 2026-08-30 and must not be quoted.** An
> attempt to re-derive them found the recorded `awk` block-counter is a _different metric_ from the
> AST sweep that produced the recorded numbers, and three filter variants bracket neither: raw awk
> gives `.ts` 603/239; excluding `eslint-`/`@ts-`/`prettier-` directives gives `.ts` 603, `.tsx`
> 532; additionally requiring ≥2-space indent as a proxy for "inside a body" gives `.tsx` 494,
> `.ts` 450. **The `.ts` gap runs in opposite directions depending on the filter**, which proves the
> original filter was neither. Only the JSX half reproduces exactly: `grep -rho '{/\*' app --include='*.tsx' | wc -l` → **14** (was 15).
> **Re-taken 2026-09-05 in one pass, ≥2-space-indent variant, command recorded — this is G2b/G2c's
> baseline:** `.tsx` **448** lines in 48 files, `.ts` **441** lines in 36 files, JSX **14**.
> `grep -rhE '^[[:space:]]{2,}//' app --include='*.tsx' | grep -Ev 'eslint-|@ts-|prettier-' | wc -l`
> (and `--include='*.ts'`); files with `-rlE … | wc -l`. Both down from the 494/450 the 2026-08-30
> note recorded for the same variant. Sizing G2b off the current figures would be sizing off nothing. The decided standard (#268:
> "plain function bodies") covers `.ts` too; the inventory said otherwise. USER decides: does G2b's
> migration (and the `error` flip) cover `.ts` util/lib files, roughly doubling it? **The evidence
> says yes** — the user's global rule covers every language and #268's wording covers plain function
> bodies — so this is a confirm, not an open design question. If yes, ten more heavy files join
> G2c's ride-along list, **three counts corrected 2026-08-30**: `metadataUtils.ts` (38 blocks — and
> it lives at `app/components/Metadata/`, **not** `app/utils/` as this list implies),
> `rowCombination.ts` (**31, not 15 — the largest single error on this list**),
> `contentLayout.ts` (15), `contentFilter.ts` (**16, not 13**), the proxy `route.ts` (10), `userSpaceData.ts`
> (10), `useMetadataState.ts` (9), `useParallax.ts` (8), `core.ts` (5 — **was `7`; corrected
> 2026-08-27**), `rowStructureAlgorithm.ts` (6).

- [ ] **G2a · Enforcement first.** ESLint: (1) `no-restricted-syntax` with selector `JSXExpressionContainer > JSXEmptyExpression` bans `{/* */}` in JSX; (2) a small local flat-config rule reports `//` and `/* */` comments whose range falls inside a function body under `app/**` (allow `eslint-`, `@ts-`, `prettier-` directives; docblocks above declarations untouched). Land as `warn` immediately; flip to `error` when G2b merges.
      **Feasibility verified empirically 2026-08-22** on the repo's ESLint 9.36 + typescript-eslint
      8.29: the selector flags `{/* */}` (and bare `{}` — acceptable bonus) and not real
      expressions; a commented-out `no-restricted-syntax` stub already sits at
      `eslint.config.mjs:78-85` (re-verified 2026-08-29); the local rule is ~50–60 lines inline in
      flat config, no new deps. COLD — startable today.
- [ ] **G2b · Mechanical migration — light files (~45 files with 1–5 blocks).** Hoist each comment into the docblock of the function it explains. A comment explaining a mid-function statement with no declaration to attach to is the split signal: extract a named helper/hook so the docblock has a home.
- [ ] **G2c · Heavy files ride their refactors — do NOT migrate standalone.** Their comment volume
      is itself the too-big-function evidence, and the split gives every extracted function a
      docblock home. Plus the ten `.ts` heavies above if the user rules `.ts` in scope. The
      counting method, recovered 2026-08-24 (record it beside any re-take):

  ```bash
  awk '/^[[:space:]]*\/\//{if(!p)n++;p=1;next}{p=0}END{print n+0}' <file>   # blocks
  grep -c '{/\*' <file>                                                      # JSX
  ```

  The per-file inventory taken with it is archived as approximate in
  [group-g-decisions.md](2026-summer-refactor/group-g-decisions.md) — its filter was never
  recorded; re-take the whole inventory in one pass when G2c is picked. Two of its eleven files
  (`CollectionPageClient.tsx`, 24 blocks; `CollectionPageWrapper.tsx`, 9) now ride nothing, so
  G2c is partly schedulable work, not pure ride-along.

### ⛔ G3 · `/user/selects` — delete or rebuild — USER DECISION

- [ ] `app/user/selects/page.tsx` (65 lines; re-verified 2026-08-29) is an orphan page: it renders raw IDs and links to `/?collection=`, which nothing reads (re-verified 2026-08-22: no reader of a `collection` search param exists anywhere). Either delete it — Selects live in the gallery star flow — or rebuild it properly.
- [ ] **Both facts re-verified 2026-08-24 against `main` at `dbc706a`; nothing has changed.** Still
      65 lines. `grep -rn "collection'" app --include='*.ts' --include='*.tsx' | grep -E "searchParams|\.get\("`
      → no results, so still no reader. No page in `app/` links to `/user/selects` (the only hits
      are `lib/api/selects.ts`, which names the BACKEND endpoint path — a different thing that a
      grep for the string will keep suggesting is a caller). E17 touched this file (#322 dropped its
      `pageType="default"`), which is the only reason it came up; that edit does not bear on the
      decision. **The question is unchanged and is genuinely a product call, not a fact: delete or
      rebuild? Answerer: the user.**
- [ ] Status wording reconciled 2026-08-22: A1 is COMPLETE as shipped — the `/user/selects` deletion
      was pulled OUT of A1 (see A1's closing note in the archive). Deciding G3 performs that final
      deletion (or its rebuild); it does not reopen A1.

### ◐ G4 · Docblock standard — length, structure, and no history — ~31 real history blocks + 21 label blocks

Raised by the user 2026-08-24 off PR #301's 30-line `revalidateLocationCaches` docblock. The
intersection pass shipped as #310 (net −50 lines, the 19 long-and-historical blocks cleared).
Baselines, the #310 tables and the spent findings are archived in
[group-g-decisions.md](2026-summer-refactor/group-g-decisions.md).

**The standard.** A docblock says what the thing does, what its arguments mean, and any constraint a
caller must respect. It describes the code as it is now, for someone reading it for the first time.
It is not a decision log, not a changelog, and not a place to record what the code used to be.

**Two additions to the standard (2026-08-25, from a user read of #327/#328).** First, **board item
labels are not allowed in code comments at all** — a reader at the call site has no board in front
of them, and the name of the MR that changed a line does not help them use it. Second, **a
refactor's own MR is the most likely place for this rot to enter**, because the author has the
before-state fresh in mind and mistakes it for context the reader needs. Check your own new
docblocks against the standard before opening the PR.

**Current history inventory (re-run 2026-09-05; method recorded).** Scan every `.ts`/`.tsx` under
`app/`, extract `/\*\*.*?\*/` non-greedy across newlines, test each block case-insensitively
against `\bused to\b`, `\bno longer\b`, `\bpreviously\b`, `\bthe old\b`, `PR #\d+`,
`\b20\d\d-\d\d-\d\d\b`: **1,494 blocks total, 54 backward-looking** (used-to 22, no-longer 14,
previously 7, bare date 8, the-old 4, PR-number 1; was 1,413/49 on 2026-08-29 and this board
carried two different totals for it). **~23 of the 54 are false positives** — the
employed-to reading ("Used to categorize images"), `@throws … no longer exists` runtime state,
dates inside code examples — so **~31 are genuine. And the regex MISSES pure history with no anchor
term** (`contentRatingUtils.ts:35`'s retired-model note, `contentLayout.ts:96`'s "bit-for-bit what
it was before"), so 26 is a floor. **Every hit needs reading; this item cannot be finished by
running the regex.**

**The board-label sweep has never been run and is the actual unswept work — and it grew while
"all re-verified 2026-08-29" sat on it: 21 blocks, re-taken 2026-09-05** (labels `A1`–`H7` inside
`/** */` blocks and `//` lines under `app/`). **17 docblocks** carry board labels —
`originAllowlist.ts:14` (D10 — **added by D10's own commit `68fbb59b`**, this item's "the
refactor's own MR is where the rot enters" demonstrated) and `:47` (D9), `contentFilter.ts:975`
(D7), `contentLayout.ts:589` (E14/E15), `contentTypeGuards.ts:173` (D3), `Badge.tsx:27` (D6),
`useMetadataSubmit.ts:118` (E12) and `:224` (E13), `collectionEditUtils.ts:284` (C4),
`useCollectionEdit.tsx:186` (D3), `:194` (D3/D4), `:1113` (E13), `:1515` (D4, formerly an inline),
`StructureTab.tsx:34` (D4), `clearCache.ts:37` (D1/D2), `core.ts:112` (E2),
`api/revalidate/route.ts:7` (D6/D8) — plus **4 inline `//` comments**: `CollectionPageClient.tsx:341`
and `:387` (D7), `useCoverImageSelection.ts:51` (D3), `EditModeLayer.tsx:250` (D3). The `TODO(A3)`
and D4 inlines at `useCollectionEdit.tsx:1571`/`:1586` are gone (#354's comment sweep).
Watch one false positive: `contentRatingUtils.ts:35`'s `H5★` is a five-star horizontal rating, not
item H5. The worst single offender is `collectionEditUtils.ts:284-293` — board label, PR number,
and history in one block. One caveat on "every #327/#328 file is clean of anchor terms":
`useCollectionEdit.tsx:644`'s docblock matches `previously` (a #327-touched file); the others are
clean. The one `contentLayout.ts` hit (block start `:85`, "used to hold photos-per-row steady") is
employed-to, traced by `git log -L` to `10fb626`, not #327.

**What to cut, by kind:**

- [ ] **History.** "used to", "no longer", "the old X", "previously", bare dates, PR numbers. The
      git log holds this and does not go stale. Delete outright.
- [ ] **Tracked gaps.** If a paragraph describes known missing work, it belongs on this board. Cut
      it and leave at most one sentence naming the limitation, with no rationale.
- [ ] **Rejected-alternative essays.** "This deliberately does not live inside X because…" is PR
      content. One clause is fine — "kept separate from `revalidateCollectionCache`, which has no
      location data in scope" — the paragraph is not.
- [ ] **Restating the signature in prose** when `@param` already says it.

**What to keep — this item is not an instruction to strip rationale.** Constraints a caller can get
wrong stay, in full. #301's own "slugs must come from the saved response, never from the edit
buffer, because an unsaved location is `{ id: 0, slug: '' }`" is exactly right and survives any
rewrite: it is a live trap, not a historical note. The test is **tense and audience** — does this
sentence help someone using the function _now_, or does it explain the past to someone who was
there? Cut on that test, not on line count. Line count is the smell; it is not the rule.

**Scope.** Docs-only, zero source change — safe to split across sittings and safe to do alongside
anything. **Do NOT add a lint rule for this in the same MR.** `eslint-plugin-jsdoc` can cap length
but cannot tell history from a live constraint, so a rule would either be trivially satisfied or
would fire on the docblocks worth keeping. Decide whether a rule is wanted after the manual pass
has established what the standard looks like in this codebase.

---

### ⛔ G8 · Extend the panel `styles.<key>` guard repo-wide? — USER DECISION

Filed as a row 2026-09-05; it had sat in the state table alone as "CSS guard" with no id, the only
blocked question the shell checks could not see. `tests/components/panelStyleReferences.test.ts`
proves every `styles.<key>` in six panel directories resolves to a class in the module it imports;
nothing checks the rest of `app/components/`. Sizing, re-run 2026-09-05 with the commands in the
CSS rule: **107** files import a CSS module, **411** distinct `styles.<key>` names — and **10 files
import a module under another name** (`cbStyles` ×5, `modalStyles` ×4, `variantStyles` ×1), so a
guard sized off the `styles.` regex would skip them silently.

- [ ] **BLOCKED — user:** extend the guard to every `.module.scss` importer (one generator test,
      a case per file, dynamic `styles[key]` lookups still invisible), or keep it panels-only and
      record why. If extended, enumerate importers by the import specifier, not the binding name.

### ☐ G7 · Test names still call the BFF proxy "Vercel"; production is Amplify

Filed 2026-08-31 from feature-board PF9 (#365), which recorded AWS Amplify as the production host.
`tests/api/proxy/route.test.ts` carries **six** `describe('Vercel BFF proxy …')` blocks, plus
`route.logHygiene.test.ts`'s `describe('Vercel BFF proxy — 502 log hygiene')`.

**The route itself is already correct** — `app/api/proxy/[...path]/route.ts:72-80` says the
`x-vercel-forwarded-for` hop is "harmless, absent on Amplify" and that `x-real-ip` is "spoofable on
Amplify". The header handling is deliberate and must not change: it reads the Vercel header first
and falls back to the last `x-forwarded-for` hop, which is the correct order on both hosts. This is
a naming fix only.

Worth doing because the names were actively misleading: PF9's row asserted "three docs name three
hosts" and these strings were the third, which sent a session looking for a doc that does not
exist.

- [ ] Rename the seven `describe` strings to "BFF proxy". Do **not** touch
      `x-vercel-forwarded-for` handling or the `x-vercel-ip-*` strip list — those are host-agnostic
      by design. Est ~7 test lines, 0 src.

## Group H — Feature requests

Filed 2026-08-23 from a user design review of `/user` plus an annotated screenshot. Six requests
came in; only H1 remains board work. H2a and H3 shipped (#302) — write-ups and closed rows in
[group-h-features.md](2026-summer-refactor/group-h-features.md). The other four (H2b, H4, H5, H6)
are a design review, an ops project, a second design review and a vision item — no rows, detail in
the same file, reached from "What to build next".

**H7 was added 2026-08-31 (3)** from the backend cross-repo review and did not come from that
design review.

### ☐ H7 · Passkey management on the admin user page — the backend routes exist, nothing calls them

Filed 2026-08-31 (3) from the backend cross-repo review. **A product item, not a defect.** Nothing
is broken and nothing is drifting; two endpoints were built and the UI for them was not.

Backend [#257](https://github.com/themancalledzac/edens.zac.backend/pull/257) added
`GET /api/admin/users/{id}/passkeys` and `DELETE /api/admin/users/{id}/passkeys/{credentialId}`
(`AdminUserController`, row types in `UserRequests.java`). The delete deregisters one authenticator
without disabling the account, which is the whole point of it — today the only recovery for a lost
key is heavier.

This repo has `registerPasskey` in `app/lib/api/auth.ts` and neither a list nor a deregister call.
`/admin/users/[id]` has nowhere to show or revoke an authenticator.

- [ ] **BLOCKED — user: is this wanted?** If yes, add `listPasskeys`/`deregisterPasskey` to
      `app/lib/api/users.ts` and a section on the admin user detail page. Sized after the design,
      not before. **This is feature-board AU2's admin half and its decision #4** (AU4 is closed;
      the earlier pointer was stale). AU2's section carries the endpoint refs and the last-passkey
      warning; when AU2's admin UI ships, close this row against it.

### ☐ H1 · Merge `Following` into `Collections` on `/user` — BLOCKED (user): count semantics, tile marker, catalog fetch

`Collections` should show owned, tagged and followed collections in one list. Unfollowing a
collection that has no other association removes it from the page. **Blocked on three product
answers, stated in the Work list below.** The unblock/re-block history is in the
[archive](2026-summer-refactor/group-h-features.md).

**The premise checks out — there is no dedup anywhere.** Established by reading both membership
paths in the loader, not by comparing what renders on screen (a source-level finding; it does not
need redoing). All refs below re-derived 2026-08-29:

`Collections` membership is decided at
[userSpaceData.ts:75](app/components/UserSpace/userSpaceData.ts:75) (`isContentCollection` over the
`getUserPage()` content blocks, split at [:68](app/components/UserSpace/userSpaceData.ts:68)).
`Following` membership is decided at
[userSpaceData.ts:281](app/components/UserSpace/userSpaceData.ts:281), by intersecting the followed
id list against a separate catalog read. The two sets never see each other. Own a collection and
follow it, and it renders in both tabs today.

Where the data comes from:

- Followed ids: `listFollowedCollectionIdsServer()` —
  [personal.ts:132](app/lib/api/personal.ts:132), hitting `GET /api/proxy/api/read/user/follows`
  ([personal.ts:24](app/lib/api/personal.ts:24)). Type `FollowedCollectionIds = number[]` at
  [Personal.ts:14](app/types/Personal.ts:14). Called at `userSpaceData.ts:251`.
- Followed tiles: `getAllCollections(0, 500)` at `userSpaceData.ts:259-260`, filtered at `:281`,
  wrapped by `toCollectionBlocks` at [:90](app/components/UserSpace/userSpaceData.ts:90).
- Chip labels are data, not literals: `Collections` `userSpaceData.ts:305`, `Images` `:311`,
  `Saved` `:317`, `Following` `:324`. Mapped to `ToolbarSection[]` at
  [UserSpace.tsx:117](app/components/UserSpace/UserSpace.tsx:117), rendered at
  [FilterToolbar.tsx:255-257](app/components/ui/FilterToolbar/FilterToolbar.tsx:255).

Work:

- [ ] Union the two sets in `userSpaceData.ts`, deduping by collection id. `collectionBlocks`
      (`:75`) and `followedBlocks` (`:281`) are built from different sources, so the union must key
      on `id`, never on object identity.
- [ ] Delete the `following` section descriptor (`userSpaceData.ts:324`) and its key from the tab
      union.
- [ ] Decide whether the merged count includes follows (12 + 2 = 14) and whether a
      followed-but-not-owned tile carries a visual marker. The request does not say, and the answer
      changes the tile component, not just the loader.

**Two things this item must handle rather than inherit.**

1. **The catalog read is deferred, and merging un-defers it.** `getAllCollections(0, 500)` runs only
   when the `following` tab renders (`userSpaceData.ts:259-260`). Merging makes a 500-row catalog
   fetch run on every `/user` load. That deferral is deliberately pinned by
   `tests/components/UserSpace/userSpaceData.selfCatalog.test.ts` (deferral describe at `:71-79`,
   the assertion at `:77`), so that test goes red and the cost has to be accepted on purpose rather
   than discovered later. The cheaper path is to have the backend return followed collections on
   the user-page read instead of intersecting client-side — price that before writing the union.
2. **The stale-count bug was C8, and C8 shipped first (#291), as its sequencing note required.**
   H1 now uses the client-delta plumbing C8 built: deleting the `Following` chip relocates any
   staleness onto the merged `Collections` count, and H1 needs the tile itself to vanish on
   unfollow — strictly harder than fixing a number, because tiles are server-built.

**Claim to verify before shipping, not while shipping.** This item assumes a stale `?tab=following`
bookmark degrades to `collections` rather than erroring, via the `resolveTabKey` fallback at
[userSpaceData.ts:62](app/components/UserSpace/userSpaceData.ts:62) (`TAB_KEYS` at `:30`,
`DEFAULT_TAB` at `:34`). That is a claim about code that is about to change. Confirm the fallback
still fires once the key is removed from the union — the board's record is that unverified item
claims have been wrong twice.

Tests that will need updating (anchors re-derived 2026-08-29): `tests/app/user/page.test.tsx`
(`labels all four sections with their counts` at `:255`, `gives every section a ?tab= link` at
`:269`), `tests/components/UserSpace/UserSpace.sectionSwitch.test.tsx`,
`tests/components/UserSpace/userSpaceData.test.ts` (the describes at `:81`, `:160`, `:229` and
`:289` all assert on `sections.following`),
`tests/components/UserSpace/userSpaceData.selfCatalog.test.ts:77`,
`tests/components/ui/FilterToolbar.test.tsx:508`. Six files touch this chip row — distrust the
estimate accordingly.

## Product roadmap

Lives on [2026-features.md](2026-features.md), not here. This board carries cleanup, refactors and
bug fixes only. The list this section used to hold was stale on every line by 2026-09-05: `/search`
shipped (SD1, #357); the `blocks_per_page` fix is gone from the backend and the real question is
PF13; error tracking is decided (CloudWatch, PF6, #391); BCrypt waits on EM4; email go-live is EM1
and EM3; passkey UI is AU2, the same feature as H7 here; the staging collection is MA2; CloudFlare
Phase 2 is PF7; the `/user` ↔ `/admin/users/[id]` unification is H2b.

Two debt items from the old list have no row anywhere: property-based layout tests and the `001`
CSS sweeps. The feature board excludes them by name ("debt, chapter 006"); file them here as G-group
rows when someone wants them, or leave them in `docs/006`.

Non-MR design items H2b, H4, H5 and H6 live in
[group-h-features.md](2026-summer-refactor/group-h-features.md). H5 has been unblocked since E8
shipped (#319); its own `MenuDropdown` line map is stale (the file is 427 lines, Explore at `:294`).
H2b overlaps the `/user` ↔ `/admin/users/[id]` layout unification — settle those two together.

## Session log

_Newest first. **Dates are local (America/Los_Angeles), not UTC** — earlier entries mixed the two,
which is why a "08-23" entry can sit between two "08-24" ones. The ordering was verified correct
against real merge timestamps on 2026-08-24; only the labels were inconsistent. Use local dates.
Same-day runs are numbered "(1)", "(2)", … in run order; 2026-08-28's first two runs predate the
numbering, so that day's numbered entries start at "(2)"._

- 2026-09-05 — no MRs; **the full critical review the #400 handoff asked for, applied.** Seven
  read-only slices and one apply pass across both boards (the feature board's entry has the
  cross-board summary). **On this board, four open items had already shipped:** C11 (#352), D10
  (#353) and E18 (#354) on 2026-08-30 — items 1, 2 and 3 of the NEXT RUN block written the next
  day — and E18's "genuinely open" Half B was never a bug (`collection` derives from `currentState`
  since `86a0f192`; #354 pinned the two-save case). **Seven open items had a section and no row**
  (C12–C16, G7, H7) and the CSS guard had neither; all 26 open rows are in the table now, and the
  feature board's shell checks are adapted here. **C15 unblocked from the other side:** the backend
  answered its question (FE-1, won't-do — the array is being dropped), so it is type hygiene, not a
  product call. **Filed:** C17 (lens not URL-shareable, drift guard blind), C18
  (`CollectionRolesSection` unmount guard, 60 of 96 `act()` warnings), D11–D14 from an adversarial
  pass on the merged security work that found no HIGH and settled the cache-key question from
  framework source, D15 (the backend's open HIGH S-29 reaches three public routes here — no
  frontend mitigation exists), and G8 (the CSS guard as a row). **F1 re-derived from anchors** (all
  eight had drifted; the "straddle" was a line-number artefact) and **ordered before feature-board
  MA1**, leaving the update-form region for MA1. Counts re-measured: 60,551/38,502 suite/source
  lines, 88 style files, 38 components, 57 closed rows (60 after this pass), G4 1,494/54, G2's
  inventory re-taken (448/441/14). C13 is three literals, not one. "What to build next" replaced by
  a pointer. Next: C9's `0 x 0` count, then C14, C17, C13, D11, D12, G7, C12, C18.

- 2026-08-31 (3) — no MRs; **docs-only, filed from a review run in `edens.zac.backend`, not here.**
  A backend-side agent compared both repos and produced five frontend-owed findings. Filed as
  **C14** (`getCollectionsByLocation` sends `page`/`size`; the location endpoint reads
  `collectionPage`/`collectionSize` and drops both), **C15** (the `LocationPage` props are
  image-typed while backend #258 widened `LocationPageResponse.images` to mixed content), **C16**
  (`imageWidth`/`imageHeight` declared non-nullable; backend #249 now writes `null`) and **H7**
  (backend #257's two passkey routes have no consumer here). The fifth was **already shipped as G6
  (#351)** and is recorded under "Verified fine" instead of filed twice.
  **The headline is a box that was ready to tick and nobody knew: C9 is UNBLOCKED.** It had sat
  BLOCKED-on-backend since 2026-08-30 waiting for Bug #21; Bug #21 shipped as backend #249 the same
  week, and C9's own stated closing condition ("when the backend defaults to `null` instead of `0`")
  is met. Verified in that repo's `origin/main`, not from the commit message. One caveat found while
  checking and written into the item: **#249 added no backfill**, so pre-#249 `0 x 0` rows would
  still slip past `parallaxCard`'s `??`. C9 now leads the next run — an item that may already be
  done is cheaper than the cheapest one that is not.
  **This is the second consecutive run where reading the other repo closed a blocked row for free**
  (2026-08-30 did it three times). The rule was already hoisted; what this run adds is that it works
  in the pull direction too — the backend shipped our blocker and had no way to tell us.
  **One archived claim corrected rather than annotated.** `group-e-consolidations.md`'s E13 bullet
  said a location-tagged GIF "can never appear on `/location/{slug}`" because the orphan queries
  joined `content_image`. Backend #258 replaced that join with a `content_type IN ('IMAGE','GIF')`
  predicate, so the reason is false. The conclusion survives only because this repo discards the
  field — rewritten to say so, and to say it collapses if C15 is answered "yes".
  **Correction to what the backend board believed, carried into C15:** it recorded the GIF widening
  as live-breaking against a `ContentImageModel[]` prop. `/location/[slug]` never reads
  `LocationPageResponse.images` — `parseCollectionArrayResponse` takes `.collections` and throws the
  rest away, and the grid is fed by a separate `searchImages({ locationId })` call. The item is
  dormant, and the worst case if a GIF did arrive is an off-by-one header count, not a crash.
  **Stale count fixed in passing:** "six of the fifteen rows are blocked on the user" had been wrong
  by three rows since C12/C13/G7 were filed without updating it. Now eight of twenty-two.
  Next: C9's check, then C11 + C14 together, then D10, E18.

## Verified fine — do not re-investigate

- **Admin and edit routes being auth-gated in dev is already handled — do not file it again.** The
  backend cross-repo review of 2026-08-31 (3) reported it as a new frontend-owed finding: backend
  [#243](https://github.com/themancalledzac/edens.zac.backend/pull/243) removed
  `app.admin.enforce-authz` rather than pinning it true, so `/api/admin/**` and `/api/edit/**` are
  gated in every profile and local dev is no longer login-free on the write surface. That is
  **G6**, shipped as **#351** on 2026-08-31 — `CLAUDE.md`'s Critical Rule was corrected in the same
  pass. Write-up in [group-g-decisions.md](2026-summer-refactor/group-g-decisions.md); the
  dev-session affordance follow-up is AU4 on [2026-features.md](2026-features.md). No frontend code
  change was ever needed; developers needed to know, and now the rule says so.
- `app/[slug]/page.tsx`'s double `getCollectionBySlug` is deduped by Next request memoization; it is not a single-fetch violation. `meServer` is wrapped in React `cache()`.
- The admin hub's count-fetch and lazy panel fetch are different queries by design.
- BFF proxy internals — body buffering, cookie re-emission, size caps, origin allowlist, sanitized IP order — all check out and are test-pinned.
- `rowCombination.ts` has no retired-model survivors; the prominence model is the only model present. `rowStructureAlgorithm` and `affineHeight` are clean.
- No `any` types, no `import React` namespace, no raw `<img>` anywhere in `app/`. No hydration risks found.
- The gap rule is honored across all 88 style files (87 SCSS + `globals.css`; re-counted 2026-09-05
  with `find app -name '*.scss' | wc -l` — SD1 added `app/search/loading.module.scss`), stylelint
  exits 0, and all `!important` uses are defensible.
- All 23 `ui/` primitives have live consumers. `useCachedPanelData`'s generation-counter design is sound. The localStorage admin cache is wiped on logout by design.
- Suite-wide: no skipped or focused tests, no snapshots, no stale TODOs. (`app/` carries one
  scoped TODO comment — `route.ts:77` `TODO(CloudFlare Phase 2)`, feature-board PF7; the
  `TODO(A3)` went with #354 — the clean claim is about `tests/`.) Re-run 2026-09-05: `tsc`,
  `eslint app/ --max-warnings 0`, `stylelint`, and `jest` (260 suites / 4,737 tests) all clean;
  the 96 `act()` warnings are C18.
- The merged cleanup wave through #270 introduced no regression (2026-08-22 spot review of
  A5/A6/C1/E1/D2: overlay gate traced to every render site, adapter defaults diff-checked against
  pre-consolidation source, the C1 seed-effect state machine walked against all three failure
  modes, exactly one callable action in `clearCache.ts`).
- The D1/D2/D6 gates under adversarial attack (2026-08-22): no bypass found. Details in
  [group-d-security.md](2026-summer-refactor/group-d-security.md).
- PR #253's diff, technical review 2026-08-22: merge-ready. The error path is sound (a dead backend
  reaches the alert+Retry branch, never the empty state), a11y checks out, and the only diff-level
  notes were the E10 skip-list bullet and a stale `AdminHubClient` seed docblock (fixed on the
  branch).
- X-Forwarded-For / spoofed-IP handling in the BFF proxy (moved here from the Group D heading
  when Group D was archived). `forwardHeaders` strips all client-controllable IP headers and
  re-derives `X-Real-IP` from trusted hops, pinned by `tests/api/proxy/route.test.ts:441-463`.
  Also clean: no `dangerouslySetInnerHTML` or `eval`, no secret leakage into `NEXT_PUBLIC_*`, no
  committed `.env`, no open redirects, CSRF origin-allowlist on writes, SSRF-safe URL building,
  size caps with post-buffer recheck, correct `Set-Cookie` forwarding, careful share/invite/
  gallery-gate flows.
- Checked 2026-08-30 while fixing C10 and found sound: `liveEditContent`
  (`CollectionPageClient.tsx:309`) already gates on `editMode` and releases correctly on manage-mode
  exit — it is the precedent C10's fix copied. `filterState` deliberately survives the exit (it is
  URL-synced), so filters set while managing carrying into the public view is intended, not a leak.
- The six agent allowlists carrying `Bash(npm…)`/`Bash(npx…)` are correct (re-verified 2026-08-30,
  A9's close-out): every script name they reference exists in `package.json`,
  `Bash(npm run lint:*)` covers `npm run lint:fix`, and `.claude/agents/README.md`'s capability
  table matches all six frontmatter blocks. **Known gap, not a defect:** neither `scss-reviewer` nor
  `code-reviewer` can run stylelint — a scoping call, recorded in the A9 archive.
- G5's premise and arithmetic (14 call sites in 6 files, `/user/selects` appearing twice → 13
  distinct endpoints) reconciled exactly on 2026-08-30 immediately before the item closed. The
  count was right; only the decision was missing.
- Numbers re-measured 2026-09-05, with the command beside each so the next pass re-runs rather
  than re-reads: `sharedObserver` 116 / `useParallax` 169 / `useContentReordering` 197 (`wc -l`),
  all three still untested; `.srOnly` in 6 SCSS modules (`grep -rl srOnly app --include='*.scss' | wc -l`);
  `contactApi.ts` 61 lines with `ContactResult` at `:6-8`; `app/styles/` holding three files;
  23 `ui/` primitives (`ls app/components/ui | wc -l`); 60 closed rows across the archives after
  this pass's three; `processContentBlocks` has **six** callers repo-wide
  (`grep -rn 'processContentBlocks(' app | grep -v 'export function' | wc -l`). H1's thirteen
  `userSpaceData.ts` anchors hold. **The 2026-08-30 line that said `useCollectionEdit.tsx`'s
  1,751 lines and F1's anchors "need no re-checking soon" was stale within a day** — a count in a
  file three open items edit never is; it is deleted rather than refreshed.
- Adversarial re-review of the merged security work, 2026-09-05 (D1–D10 plus the proxy, the
  origin allowlist, the headers, the admin gate, the error reporter, the gallery cookie, secrets):
  no HIGH. Held under attack: 18 path-traversal spellings through `isProxyableApiPath` (only the
  `;` family forwards, and Spring's firewall answers 400, verified live); header injection
  (`Headers.set` throws on CR/LF; a client `X-Internal-Secret` is overwritten); 17 malformed or
  lookalike origins through `isAllowedWriteOrigin` in production mode, all rejected; the live
  headers on both hosts (every CSP directive read; `frame-ancestors 'none'`, HSTS 2 years, no
  `unsafe-eval`); anonymous `/api/proxy/api/admin/**` → 401 before any backend hop; `?manage=1`
  behind `requireAdmin()`; `revalidate`'s session-then-Origin ordering; `NEXT_PUBLIC_*` limited to
  `APP_URL` and `ENV`; no tracked `.env`. **The cache-key contract:** Next 16.3.1 hashes request
  headers into the fetch-cache key (`incremental-cache/index.js:284-305`; reproduced — four cookie
  strings, four hashes), so a locked and an unlocked gallery payload never share an entry. D11 pins
  it. The findings are D11–D14; D15 is the backend's S-29 seen from here.
