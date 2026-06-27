# 001 · Design System Unification

> Collapsed the fractured UI surface (~30–38 button classes, 5 modal shells, 2 filter bars, 3 badge defs, 8 page scaffolds, 3 color families) into ~12 token-driven primitives in `app/components/ui/`, on one painted dark-safe surface — plus the IA/UX + a11y gaps that rode along. · ✅ **fully shipped to `main`** (PRs [#152](https://github.com/themancalledzac/edens.zac/pull/152) → [#160](https://github.com/themancalledzac/edens.zac/pull/160), 2026-06-01 → 06-03).

This epic is **done.** Per-phase detail lives in [previous-work.md](previous-work.md) ("Design System Unification — Chapter 001"). The eight detailed sub-plans and the 2026-05-31 genesis design review are archived in `_archive/shipped-plans-2026-06-10.tar.gz` + `_archive/handoffs-shipped-2026-06-10.tar.gz` (the substance is now realized in `app/components/ui/` + `globals.css`).

## What shipped — the canonical primitive set

Live in `app/components/ui/`, all token-driven on one painted surface:

`<Modal variant=overlay|sheet|fullscreen>` (portal, scrim, Esc, focus-trap + return, scroll-lock) · `<Button>`/`<IconButton>`/`<CloseButton>` · `<FilterToolbar>`/`<FilterChip>` · `<Dropdown<T>>` (promoted from `UnifiedMetadataSelector`) · `<Tile>`/`<NavLink>` (always a real `<a>`) · `<PageShell>`/`<CollectionHeader>` · `<Badge>` (curated public labels, no raw `CollectionType`) · the `<Field>` form set · `<StatusPage>` · `MetadataList<T>`.

Plus the foundation work that rode along: canvas painted from tokens (kills the OS-dark-mode invisible-text bug), one semantic color taxonomy + `--scrim-*` / `--duration-*` / `--focus-ring`, deep-linkable fullscreen (`?image=` + history + position counter, Back-closes-modal), a public taxonomy front door, footer + breadcrumb, and admin-route gating (`/all-collections`, `/all-images`). The final consumer migration decomposed the 1099-LoC ImageMetadataModal god-component → 203-LoC orchestrator + 2 hooks + 5 subcomponents (later renamed `MetadataModal`, #170).

## Remaining — only the deferred carve-outs (now owned by [006](006-code-health.md))

Everything in the original plan shipped. What's left was **intentionally deferred** out of Phase 4, not skipped:

- **`@custom-media` breakpoint bridge** — token-drive the ~100 hardcoded `768px` queries. Deferred for a postcss/Next 16 pipeline conflict.
- **Gap-rule + `rgb()`-slash syntax sweeps** — the two mechanical CSS sweeps (Phase 4 Tasks 6d/6e).

## Open product decisions — resolved in practice

- ~~Light vs intentional-dark theme~~ → **light kept** (canvas now painted from tokens).
- ~~Persistent nav vs hamburger-only~~ → **persistent footer added** without removing the hamburger.

---

_↑ [Back to the book](000-summary.md). Full per-phase build record: [previous-work.md](previous-work.md). The 11-agent genesis review (2026-05-31) is in `_archive/handoffs-shipped-2026-06-10.tar.gz`._
