# 0171 · Next-Batch Handoff — React 19 + Entity-Edit DRY + Inline-JSX Win #3

> **Created 2026-06-06.** Self-contained handoff for the next agent. **3 MRs, mostly parallel** (disjoint files). Follows the in-review refactor wave ([#169](https://github.com/themancalledzac/edens.zac/pull/169)–[#172](https://github.com/themancalledzac/edens.zac/pull/172), see [0167-refactor-wave-handoff.md](0167-refactor-wave-handoff.md)).
>
> **Base — CORRECTED 2026-06-06:** the wave was merged as a **stacked PR chain where #170/#171/#172 landed in their _parent branches_, not `main`** — only #169 (`0167`→`main`) reached `main`. The rename/logger/config content was therefore **NOT on `main`**. Reconciliation PR **[#173](https://github.com/themancalledzac/edens.zac/pull/173)** (`reconcile-wave-to-main`) merges the stack tip + `origin/main` (footer #168 auto-merged, no conflict; tsc clean; 1729 jest green) to land the whole wave on `main`. **Branch each batch MR off `main` only AFTER #173 is merged.** Verify with main's _content_ (look for `app/components/Metadata/`), never the PR "Merged" badge — that's what misled here.

**Legend:** all three are unblocked. React 19 is the only P0.

---

## ⚠️ Ordering caveat (the only one)

The three MRs touch **disjoint files** and the user chose to run them **in parallel** — with one exception: **MR A (React 19)** is a broad upgrade whose breaking-change fixes *may* touch files MR B also edits (`app/components/Metadata/hooks/*`, `ManageClient.tsx`). If a real overlap appears, **land MR A first**, then rebase B. **MR C (TextBlockCreateModal) is safely parallel** regardless.

## Tooling (`npm`/`npx` are NOT on PATH)

```bash
cd /Users/themancalledzac/Code/edens.zac
NODE=/opt/homebrew/bin/node
$NODE node_modules/.bin/prettier --write <files>
$NODE node_modules/.bin/eslint --fix <files>
$NODE node_modules/.bin/tsc --noEmit       # must be clean
$NODE node_modules/.bin/jest                # full suite must be green (baseline 1729)
$NODE node_modules/.bin/next build          # MR A only — catches RSC/runtime breaks
```
Commit trailer: end every commit with the repo's `Co-Authored-By:` trailer. **Stage files explicitly + audit** before each commit — a background formatter (Cursor format-on-save) reformats unrelated tracked files repo-wide during sessions, so never `git add -A` (this bit the wave; see [0167 handoff](0167-refactor-wave-handoff.md)). **MemPalace** (per global protocol): User Wing `edens-zac`; the batch decision is filed under `decisions` / topic `edens-zac next batch after refactor wave`.

---

## MR A — Full React 19 runtime upgrade  ·  `0171-react-19-upgrade`  ·  **P0**

**Plan:** [006-dependency-upgrade.md](superpowers/plans/006-dependency-upgrade.md). **Decision (2026-06-06):** the user chose the **full runtime upgrade**, not the `@types/react`-18 downgrade stopgap.

**Why it's unblocked:** `@types/react`/`@types/react-dom` are already `^19`; Next 15 ships & recommends React 19 types; the old React-19 blockers (`@react-spring/parallax`, `react-zoom-pan-pinch`) were removed in the PR #111 cleanup sprint. Only `react`/`react-dom` runtime lag at `^18.3.1`.

**Do:**
1. Use the **`next-upgrade` skill** / the official [React 19 upgrade guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide). Bump `react` + `react-dom` to `^19` in `package.json`; update the lockfile.
2. Run the official codemods rather than hand-fixing: `npx codemod@latest react/19/migration-recipe` (and `npx types-react-codemod@latest preset-19 ./app`). _(npx isn't on PATH — invoke via `$NODE` or the package's bin; confirm the exact invocation first.)_
3. Hand-check the breaking changes the codemods don't cover:
   - **Implicit `children` removed** — components typed without `PropsWithChildren`/explicit `children` that still render `{children}`.
   - **`ref` as a prop** — `forwardRef` still works; verify no reliance on the removed string refs / `element.ref` access.
   - **`useRef()` now requires an argument**; `createContext` ergonomics; removed `propTypes`/`defaultProps` on function components.
   - The `ai_typescript.md` note: if React-19 `SubmitEvent<HTMLFormElement>` typing causes runtime trouble, prefer `FormEvent<HTMLFormElement>`.
4. Also fold in the two small dep-plan tails: **`lucide-react`** update (0.399 → latest, better tree-shaking) and the unexplained `// eslint-disable-next-line react-hooks/exhaustive-deps` at `useFullScreenImage.tsx` (add a reason or fix the deps).

**Verify (stricter than the others):** `tsc --noEmit` clean · full `jest` green · **`next build` succeeds** · manual smoke via the `/run` or preview workflow (home grid, a collection, the manage page, fullscreen, the metadata modal). Update `ai_guidelines/ai_typescript.md` "React 18 Runtime / @types/react 19 Mismatch" section — the mismatch is resolved.
**Commit(s):** `chore(deps): upgrade React 18 → 19 (runtime + codemods)` · `chore(deps): bump lucide-react; document useFullScreenImage exhaustive-deps disable`

---

## MR B — Entity-edit DRY wins  ·  `0172-entity-edit-dry`  ·  P1 (flagship)

**Plan:** [006-entity-edit-dry-wins.md](superpowers/plans/006-entity-edit-dry-wins.md) — **fully spec'd; follow it.** Its documented dependency (the naming cleanup) is now satisfied by [#170](https://github.com/themancalledzac/edens.zac/pull/170).

> **⚠️ The plan's paths are pre-rename — translate as you go (#170 landed):**
> - `app/components/ImageMetadata/imageMetadataUtils.ts` → **`app/components/Metadata/metadataUtils.ts`**
> - `app/components/ImageMetadata/hooks/useImageMetadataState.ts` → **`Metadata/hooks/useMetadataState.ts`**
> - `app/components/ImageMetadata/hooks/useImageMetadataSubmit.ts` → **`Metadata/hooks/useMetadataSubmit.ts`**
> - `selectedImageIds` → **`selectedIds`**
> The plan also says the rename target would "likely" be `useContentMetadataState` — it actually landed as **`useMetadataState`**. **Line numbers in the plan are stale** (rename + logger migration shifted them) — grep for the functions, don't trust line refs.

Three independent wins (~115 LoC saved, all under existing test coverage):
1. **`buildAssociationDiff<T>`** — collapse `buildTagsDiff` ≈ `buildPeopleDiff` in `metadataUtils.ts` + the inline GIF collections-diff in `useMetadataSubmit.ts` into one generic helper.
2. **Shared `toggleRelation`** — promote `manageUtils.ts`'s `toggleRelation` to new `app/utils/collectionToggle.ts`; adopt in the image-side `handleCollectionToggle` (with the flat-array adapter the plan describes). Keep the engine pure.
3. **`useToggleTriple`** — new `app/hooks/useToggleTriple.ts` deriving `(savedIds, pendingAddIds, pendingRemoveIds)`; replace the 3× duplicated `useMemo` triple (image collections + ManageClient children + ManageClient siblings).

**Out of scope (anti-consolidation — the plan documents why):** unifying `ImageUpdateState`/`CollectionUpdateRequest`, `visibility` semantics, people-save paths, or a `useEntityEditState` wrapper.
**Verify:** `tsc` clean · full `jest` green (+5–10 new util/hook cases). **Commits:** the plan's 3-commit sequence (one per win).

---

## MR C — Inline-JSX **Win #3**  ·  `0173-textblock-config-lift`  ·  P1 (small, isolated)

**Plan:** [006-inline-jsx-config-cross-file.md](superpowers/plans/006-inline-jsx-config-cross-file.md) Win #3 (Wins #1/#2 already shipped in [#172](https://github.com/themancalledzac/edens.zac/pull/172)).

**Do:** in `app/components/TextBlockCreateModal/TextBlockCreateModal.tsx`, lift the two inline `<select>`/`<option>` ladders (text **format** and **align**) to module-scope `const` arrays + `.map()` render. With `as const`, derive the union types (`'plain'|'markdown'|'html'`, `'left'|'center'|'right'`) from the constants instead of duplicating — check whether those unions live in the file or `app/types/Content.ts` (if the latter, the consts move there).
**Verify:** `tsc` clean · full `jest` green. **Commit:** `refactor(text-block): lift format + align option ladders to module scope`

---

## After this batch (NOT in scope here)

- **Thin-component extraction sweep** — two-phase (audit → behavior-preserving refactor), file-parallel, a strong `/agent-teams` fit. → [006-thin-component-extraction.md](superpowers/plans/006-thin-component-extraction.md). `ManageClient` (1719 LoC) spins out to its own decomposition MR.
- **External error tracking** (Sentry vs CloudWatch) — the remaining half of [006-error-boundaries-and-logging.md](superpowers/plans/006-error-boundaries-and-logging.md) now the logger migration is done; **needs a service decision** before scoping.
- **DRY consolidation** (5 merges) → [006-dry-consolidation.md](superpowers/plans/006-dry-consolidation.md); re-render memoization → [002-performance-rerender.md](superpowers/plans/002-performance-rerender.md).
- **`force-dynamic` removal** — ⛔ backend `blocks_per_page`.
- **Perf/LCP (P4)** — deferred to the end per the 2026-06-02 sequencing decision.

## Definition of done (per MR)

`tsc --noEmit` clean · full `jest` green · `prettier`+`eslint --fix` on touched files · no new `any` · explicit staging + audit (no `git add -A`). MR A additionally: `next build` + manual smoke. On merge: update [previous-work.md](previous-work.md) + the relevant 006 plan statuses + [000-summary.md](000-summary.md).

---
_↑ [Back to the book](000-summary.md)._
