# 0172 · Batch Execution Handoff — Land #173, prune, then ship React 19 + Entity-Edit DRY + Inline-JSX Win #3

> **Created 2026-06-06.** Self-contained, copy-paste-executable handoff for the next agent. Supersedes the base note in [0171-next-batch-handoff.md](0171-next-batch-handoff.md) (which has the full MR specs — read it). Detailed plans live in `docs/superpowers/plans/006-*.md`.

---

## TL;DR sequence

1. **Step 0** — confirm reconciliation PR [#173](https://github.com/themancalledzac/edens.zac/pull/173) is merged, sync local `main`, prune stale wave branches.
2. **Then** branch the 3 MRs off the **real** post-#173 `main` and execute them (mostly parallel).
3. Land **MR A (React 19) first** if a real file overlap with MR B appears.

**Do not start the MRs until #173 is merged and `main` actually contains `app/components/Metadata/`.**

---

## Why Step 0 exists (read this — it's the trap that bit the last session)

The `0167`–`0170` refactor wave (PRs #169–#172) was merged as a **stacked PR chain where #170/#171/#172 merged into their _parent branches_, not `main`**. Only #169 (`0167`→`main`) reached `main`. So the metadata rename / logger migration / config refactor were **NOT on `main`** even though every PR showed "Merged."

PR **[#173](https://github.com/themancalledzac/edens.zac/pull/173)** (`reconcile-wave-to-main`, commit `63f57e6`) fixes this: it merges the stack tip + `origin/main`, lands the whole wave on `main`, and auto-merged the #168 footer fix with no conflict. It's verified — `tsc` clean, **1729 jest tests green, 92 suites**.

> **Rule learned:** verify a wave is on `main` by checking `main`'s **content/HEAD** (`gh api repos/themancalledzac/edens.zac/branches/main`, look for `app/components/Metadata/`), **never** trust a PR's "Merged" badge for stacked PRs.

---

## Tooling (`npm`/`npx` are NOT on PATH)

```bash
cd /Users/themancalledzac/Code/edens.zac
NODE=/opt/homebrew/bin/node
$NODE node_modules/.bin/prettier  --write <files>
$NODE node_modules/.bin/eslint    --fix   <files>
$NODE node_modules/.bin/stylelint --fix   <scss files>   # SCSS only
$NODE node_modules/.bin/tsc --noEmit          # must be clean
$NODE node_modules/.bin/jest                  # full suite must be green (baseline 1729 / 92 suites)
$NODE node_modules/.bin/next build            # MR A only — catches RSC/runtime breaks
```

**Sandbox notes (this environment):**
- Git writes to `.git` internals and any **network** op (SSH `git fetch`/`push`, `gh`, `npm install`, `npx` downloads) fail under the command sandbox. Run those with the sandbox disabled (`dangerouslyDisableSandbox: true`) and explain why. Offline `tsc`/`jest`/`prettier`/`eslint` run fine sandboxed.
- The remote is **SSH** (`git@github.com:...`), so even `git fetch origin` needs sandbox-off (it reads `~/.ssh`).

**Commit discipline:**
- End every commit body with: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
- **Stage files explicitly + audit before each commit. NEVER `git add -A`** — Cursor's format-on-save reformats unrelated tracked files repo-wide during sessions (bit the wave). `git status` and stage only your intended paths.
- `docs/*` are untracked planning artifacts (gitignored by design) — don't commit them into MRs.

**MemPalace** (per global protocol): User Wing `edens-zac`. The batch decision is filed under `decisions` / topic `edens-zac next batch after refactor wave`; the stacked-merge discovery under `discoveries` / topic `edens-zac refactor wave stacked-merge mistake`. Search before each new investigation batch; capture decisions/discoveries as you go.

---

## Step 0 — Land #173, sync `main`, prune (do first, in order)

```bash
# 0.1 Confirm #173 merged (sandbox OFF — network)
gh pr view 173 --json state,mergedAt,mergeCommit --jq '.state + " " + (.mergedAt//"-")'
#   → must print "MERGED ...". If "OPEN", STOP and ask the user to merge #173.

# 0.2 Sync main (sandbox OFF — SSH fetch)
git fetch origin
git checkout main && git merge --ff-only origin/main    # or: git branch -f main origin/main (if not checked out)

# 0.3 Confirm the wave content is actually on main
git ls-tree --name-only main app/components/ | grep -i metadata
#   → must show app/components/Metadata  (NOT ImageMetadata). If ImageMetadata still present, STOP.

# 0.4 Prune merged local branches (safe: -d refuses anything NOT merged into main)
git branch -d reconcile-wave-to-main \
              0170-inline-jsx-config 0169-logger-migration \
              0168-metadata-rename   0167-test-core-fail-fix
#   Any branch -d REFUSES → it's not fully in main; leave it and report, do NOT -D blindly.

# 0.5 (optional) delete the merged remote branches via GitHub if the user wants the list tidy:
#   gh api -X DELETE repos/themancalledzac/edens.zac/git/refs/heads/0167-test-core-fail-fix   (etc.)
#   Leave .worktrees/dependabot-vulns and all pre-0160 branches alone — out of scope.
```

---

## Parallel-execution strategy (node_modules + worktrees)

`node_modules` lives at the **repo root** and is gitignored; worktrees (under `.worktrees/`, also gitignored) won't have it. The three MRs touch **disjoint files** → safe to parallelize, with one wrinkle: **MR A changes dependencies, B and C don't.**

Recommended setup — three worktrees off the fresh `main` (run worktree/branch creation sandbox-off; `.git` writes):

```bash
for mr in 0171-react-19-upgrade 0172-entity-edit-dry 0173-textblock-config-lift; do
  git worktree add -b "$mr" ".worktrees/$mr" main
done
# B and C don't change deps → share root node_modules (offline, safe):
ln -s ../../node_modules .worktrees/0172-entity-edit-dry/node_modules
ln -s ../../node_modules .worktrees/0173-textblock-config-lift/node_modules
# A changes deps → must NOT share root node_modules (its npm install would corrupt B/C).
#   Give A a private copy, then install React 19 into it (sandbox-off for the install):
cp -R node_modules .worktrees/0171-react-19-upgrade/node_modules
```

Run tooling inside a worktree with `cd .worktrees/<mr> && $NODE node_modules/.bin/<tool>`.

**Dispatch model:**
- **MR B and MR C** → fully autonomous parallel subagents (offline; symlinked `node_modules`; `tsc`+`jest` only). Use `superpowers:dispatching-parallel-agents`. One agent per MR, scoped to its worktree path, told exactly which files + the verify/commit steps below.
- **MR A** → drive directly (not fire-and-forget): the `npm install`, `npx` codemods, and `next build` need network → sandbox-off prompts the user, so keep it under direct control. A subagent can do the **offline** code parts (version bump, breaking-change hand-fixes, `ai_typescript.md`), then you finalize the network/build/smoke steps. Run A's `npm install` only **after** B and C have finished if you took the symlink shortcut for them.

**Holding vs opening PRs:** branch off real `main` (Step 0 done) → open each MR's PR against `main` directly. No stacking. (The whole reason Step 0 exists is to avoid the stacked-PR trap — do not base any MR PR on another unmerged branch.)

---

## MR A — Full React 19 runtime upgrade · branch `0171-react-19-upgrade` · **P0**

**Plan:** `docs/superpowers/plans/006-dependency-upgrade.md`. **Decision (2026-06-06):** full runtime upgrade, NOT the `@types/react`-18 downgrade stopgap. Unblocked because `@types/react`/`@types/react-dom` are already `^19`, Next 15 recommends React 19, and the old blockers (`@react-spring/parallax`, `react-zoom-pan-pinch`) were removed in the #111 cleanup. Only `react`/`react-dom` runtime lag at `^18.3.1`.

**Do:**
1. Bump `react` + `react-dom` to `^19` in `package.json`; update the lockfile (`npm install`).
2. Prefer official codemods over hand-fixing: `react/19/migration-recipe` and `types-react-codemod preset-19 ./app` (invoke via `$NODE`-resolved bin; confirm exact invocation — `npx` not on PATH; needs network). If network/codemod is unavailable, **hand-fix** the breaking changes instead and note it.
3. Hand-check breaking changes the codemods miss:
   - **Implicit `children` removed** — components rendering `{children}` without `PropsWithChildren`/explicit `children`.
   - **`ref` as a prop** — `forwardRef` still works; check no reliance on removed string refs / `element.ref` access.
   - **`useRef()` now requires an argument**; `createContext` ergonomics; removed `propTypes`/`defaultProps` on function components.
   - `ai_guidelines/ai_typescript.md` note: if React-19 `SubmitEvent<HTMLFormElement>` typing misbehaves at runtime, prefer `FormEvent<HTMLFormElement>`.
4. Fold in the two dep-plan tails: bump **`lucide-react`** (0.399 → latest, better tree-shaking); and the unexplained `// eslint-disable-next-line react-hooks/exhaustive-deps` in `app/.../useFullScreenImage.tsx` — add a justifying comment or fix the deps.

**Verify (stricter):** `tsc --noEmit` clean · full `jest` green · **`next build` succeeds** · manual smoke (home grid, a collection page, the manage page, fullscreen, the metadata modal) via `/run` or the preview workflow. Then update the `ai_guidelines/ai_typescript.md` "React 18 Runtime / @types/react 19 Mismatch" section — the mismatch is resolved.

**Commits:** `chore(deps): upgrade React 18 → 19 (runtime + codemods)` · `chore(deps): bump lucide-react; document useFullScreenImage exhaustive-deps disable`

---

## MR B — Entity-edit DRY wins · branch `0172-entity-edit-dry` · P1 (flagship)

**Plan:** `docs/superpowers/plans/006-entity-edit-dry-wins.md` — fully spec'd; follow it. Its naming-cleanup dependency is satisfied (the rename is now on `main` via #173).

> **⚠️ The plan's paths are pre-rename — translate as you go:**
> - `app/components/ImageMetadata/imageMetadataUtils.ts` → **`app/components/Metadata/metadataUtils.ts`**
> - `app/components/ImageMetadata/hooks/useImageMetadataState.ts` → **`Metadata/hooks/useMetadataState.ts`**
> - `app/components/ImageMetadata/hooks/useImageMetadataSubmit.ts` → **`Metadata/hooks/useMetadataSubmit.ts`**
> - `selectedImageIds` → **`selectedIds`** · the rename landed as **`useMetadataState`** (not `useContentMetadataState`).
> **Line numbers in the plan are stale** (rename + logger migration shifted them) — grep for functions, don't trust line refs.

Three independent wins (~115 LoC saved, all under existing test coverage):
1. **`buildAssociationDiff<T>`** — collapse `buildTagsDiff` ≈ `buildPeopleDiff` in `metadataUtils.ts` + the inline GIF collections-diff in `useMetadataSubmit.ts` into one generic helper.
2. **Shared `toggleRelation`** — promote `manageUtils.ts`'s `toggleRelation` to new **`app/utils/collectionToggle.ts`**; adopt in the image-side `handleCollectionToggle` (with the flat-array adapter the plan describes). Keep the engine pure.
3. **`useToggleTriple`** — new **`app/hooks/useToggleTriple.ts`** deriving `(savedIds, pendingAddIds, pendingRemoveIds)`; replace the 3× duplicated `useMemo` triple (image collections + `ManageClient` children + `ManageClient` siblings).

**Out of scope (anti-consolidation — the plan documents why):** unifying `ImageUpdateState`/`CollectionUpdateRequest`, `visibility` semantics, people-save paths, or a `useEntityEditState` wrapper.

**Verify:** `tsc` clean · full `jest` green (+5–10 new util/hook cases). **Commits:** the plan's 3-commit sequence (one per win).

---

## MR C — Inline-JSX Win #3 · branch `0173-textblock-config-lift` · P1 (small, isolated)

**Plan:** `docs/superpowers/plans/006-inline-jsx-config-cross-file.md` Win #3 (Wins #1/#2 shipped in #172, now on `main`).

**Do:** in `app/components/TextBlockCreateModal/TextBlockCreateModal.tsx`, lift the two inline `<select>`/`<option>` ladders (text **format** and **align**) to module-scope `const` arrays + `.map()` render. With `as const`, derive the union types (`'plain'|'markdown'|'html'`, `'left'|'center'|'right'`) from the constants instead of duplicating — check whether those unions live in the file or `app/types/Content.ts` (if the latter, the consts move there).

**Verify:** `tsc` clean · full `jest` green. **Commit:** `refactor(text-block): lift format + align option ladders to module scope`

---

## Ordering caveat (the only one)

The three MRs touch disjoint files **except**: React 19's breaking-change fixes *may* touch files MR B also edits (`app/components/Metadata/hooks/*`, `ManageClient.tsx`). If a real overlap appears, **land MR A first**, then rebase B onto the new `main`. **MR C is safely parallel regardless.**

## Definition of done (per MR)

`tsc --noEmit` clean · full `jest` green · `prettier` + `eslint --fix` (and `stylelint --fix` for SCSS) on touched files · no new `any` · explicit staging + audit (no `git add -A`) · PR opened against **`main`**. MR A additionally: `next build` + manual smoke. On merge of each: update [previous-work.md](previous-work.md), the relevant `006-*` plan statuses, and [000-summary.md](000-summary.md).

## After this batch (NOT in scope here)

- **Thin-component extraction sweep** — two-phase (audit → behavior-preserving), file-parallel, strong `/agent-teams` fit → `006-thin-component-extraction.md`. `ManageClient` (~1719 LoC) gets its own decomposition MR.
- **External error tracking** (Sentry vs CloudWatch) — needs a service decision → `006-error-boundaries-and-logging.md`.
- **DRY consolidation** (5 merges) → `006-dry-consolidation.md`; re-render memoization → `002-performance-rerender.md`.
- **`force-dynamic` removal** — ⛔ backend `blocks_per_page` blocked.
- **Perf/LCP (P4)** — deferred to the end per the 2026-06-02 sequencing decision.

---
_↑ [Back to the book](000-summary.md) · base MR specs in [0171-next-batch-handoff.md](0171-next-batch-handoff.md)._
