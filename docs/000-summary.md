# 📚 docs/ — The Book

> **Updated 2026-06-10.** The master index of every planning doc, organized as **chapters → sections**. Reconciled against `origin/main` (HEAD `5d95fb5`).
>
> **Structure:** this book (`000`) → **chapter files** (`001`–`009`, each an overview + remaining-work list) → **sections** (the MR-level plans/specs under `superpowers/plans/`, `superpowers/specs/`, `spikes/`). **All go-forward plans live in `superpowers/plans/`.**
>
> **2026-06-10 consolidation:** the shipped sub-plans and the finished handoff runbooks (`0148`/`0167`/`0171`/`0172`/`design-review-2026-05-31`) were archived to `_archive/*.tar.gz` and removed from the tree (78 → 49 docs). Shipped detail lives in [previous-work.md](previous-work.md); **this index now tracks only forward work.** _Rule going forward: when a section ships, archive its plan in the same cycle and leave a one-line `previous-work.md` pointer — don't let a shipped runbook outlive its merge._

**Legend:** 🟢 active · 🟡 partial · ⛔ blocked (backend) · 📘 reference/living spec · 🔭 future vision · 🗒️ idea

---

## 🧭 Start here

| File                                   | What it is                                                                          |
| -------------------------------------- | ----------------------------------------------------------------------------------- |
| [previous-work.md](previous-work.md)   | Shipped-feature log — "what got built and when."                                    |
| The 9 chapters below                   | Each is an epic; open the chapter file for its remaining-work list + sections.       |
| [../ai_guidelines/](../ai_guidelines/) | Canonical project conventions (API, CSS, lint, TS, testing) — referenced by `CLAUDE.md`. |

---

## 📖 Chapters

### [001 · Design System Unification](001-design-review.md) ✅ **fully shipped**

~12 token-driven primitives in `app/components/ui/` on one painted dark-safe surface, plus the IA/UX & a11y gaps that rode along. All phases shipped (#152→#160). Only the two deferred CSS carve-outs remain (`@custom-media` bridge + gap-rule/`rgb()` sweeps), now owned by [006](006-code-health.md). _Per-phase detail → [previous-work.md](previous-work.md); the 8 sub-plans are archived._

### [002 · Performance & LCP](002-performance.md) 🟢 / ⛔

One perf epic (~9 ordered tasks). **SSR BoxTree partial ship ([#161](https://github.com/themancalledzac/edens.zac/pull/161))** eliminated the blank-on-load CLS void. Remaining: hero-byte cuts, narrow priority, blur placeholder, GIF poster, `will-change` scoping, render micro-opts — deferred to after the refactor wave (P4), partly gated on backend `blocks_per_page`.
**Sections:** [LCP critical review](superpowers/specs/002-lcp-critical-review.md) 📘 · [LCP & Lighthouse](superpowers/plans/002-lcp-and-lighthouse.md) · [re-render perf](superpowers/plans/002-performance-rerender.md) · [cache & revalidation](superpowers/plans/002-cache-and-revalidation.md) ⛔

### [003 · Client Gallery Security](003-client-gallery-security.md) 🟡

Cookie gate + admin password input shipped. Left: fix the **plaintext password** (→ BCrypt, backend), new-recipient-only send, Set-Cookie test, cookie-timing race, Download-All UX.
**Sections:** [security handoff](superpowers/plans/003-client-gallery-handoff.md) 📘 · [password logic](superpowers/plans/003-client-gallery-password.md) · [recipient send](superpowers/plans/003-gallery-recipient-send.md) · [select/download design](superpowers/specs/2026-06-02-client-gallery-select-download-design.md) 📘

### [004 · Content Discovery & Filtering](004-content-discovery.md) 🟢 / ⛔

One reusable filter-bar/chip across Search/Location/Person/Tag/Collection; the `/search` route; collection tags. **Collection-tags FE Phase 1 merged ([#167](https://github.com/themancalledzac/edens.zac/pull/167)).** Remaining: auto-tag endpoint + public-page tag display; the `/search` route (⛔ backend); and the unified filter-visibility gate.
**Sections:** [public search page](superpowers/plans/004-public-search-page.md) ⛔ · [location filter bar](superpowers/plans/004-location-filter-bar.md) 🟡 · [collection tags](superpowers/plans/004-collection-tags.md) 🟡 · [unified filter-visibility gate](superpowers/plans/2026-06-10-unified-filter-visibility-gate.md) 🟢 _new_ · [menu-dropdown nav & discovery](superpowers/specs/2026-06-10-menu-dropdown-nav-design.md) 🟡 _in-design_ · [liked images](superpowers/plans/004-liked-images.md) 🗒️

### [005 · Layout](005-layout.md) 📘 / 🟢

The V3 row-composition engine shipped — most sections are durable reference. Two open items: **(1) directional prominence — the unified value-model refactor (in progress on this branch, `0182`)** retiring the vertical penalty + arFactor cap + the two competing wide-pano mechanisms in favor of one orientation-agnostic `P` → `Hv`/`Vv`; and **(2) reconcile the duplicate lone-last-row designs** (gap-box vs redesign §13 FILLER atom).
**Sections:** [**directional prominence**](superpowers/plans/2026-06-09-directional-prominence.md) 🟢 _next_ · [redesign spec](superpowers/specs/005-row-composition-redesign.md) 📘 · [flowcharts](superpowers/specs/005-row-composition-flowcharts.md) 📘 · [retrospective](spikes/005-row-composition-retrospective.md) 📘 · [reorder audit](spikes/005-image-reorder-audit.md) 📘 · [end-row gap](superpowers/plans/005-end-row-gap.md) 🟢 · [mobile text overlay](superpowers/plans/005-mobile-text-overlay.md) 🗒️ · [pattern-tree](spikes/005-pattern-tree-exploration.md) 🗒️ · [WFC mosaic](spikes/005-wfc-mosaic-exploration.md) 🗒️

### [006 · Code Health](006-code-health.md) 🟢 / 🟡

Refactor + tests + observability + deps. **Shipped & archived** (→ [previous-work.md](previous-work.md)): React 19 upgrade, DRY consolidation, thin-component extraction, entity-edit DRY, inline-JSX config, dependency upgrade, camera optimistic-create race. **What's left:** external error tracking (Sentry/CloudWatch), function decomposition, property-based + complex-hook tests, and the inherited 001 CSS sweeps.
**Sections:** [error boundaries & logging](superpowers/plans/006-error-boundaries-and-logging.md) 🟡 · [cleanup & refactor (Wave B)](superpowers/plans/006-cleanup-and-refactor.md) 🟢 · [function decomposition](superpowers/plans/006-function-decomposition.md) 🟢 · [property-based tests](superpowers/plans/006-property-based-tests.md) 🟢 · [test coverage gaps](superpowers/plans/006-test-coverage-gaps.md) 🟡 · [React 19 follow-ups](superpowers/plans/006-react19-followups.md) 🗒️ · [frontend audit (index)](superpowers/specs/006-frontend-audit.md) 📘

### [007 · Security Hardening](007-security-hardening.md) 🟢

Cross-cutting hardening surfaced by the (shipped) contact form: **gate the unguarded admin routes in `proxy.ts`** + the CloudFlare Phase 2 migration.
**Sections:** [contact messages](superpowers/plans/007-contact-messages.md) 📘 · [admin route gating](superpowers/plans/007-proxy-route-gating.md) 🟢 · [CloudFlare Phase 2](superpowers/plans/007-cloudflare-phase2.md) 🟢

### [008 · Collection / Admin](008-collection-admin.md) ✅ / 🟢

**✅ Consolidated Edit Mode & Mobile-First Admin ([#181](https://github.com/themancalledzac/edens.zac/pull/181), `0179`, merged 2026-06-10)** — the dark `/manage` route collapsed into in-place light edit mode on `/[slug]` (`?manage=1`, local-dev); the 2,027-line **`ManageClient` deleted** for one `useCollectionEdit` hook + one `EditBar`; edit layer dynamically imported (public bundle ships zero admin code). Still open: the **`STAGING` system collection** (backend-heavy) + the mobile-first **Phase 3** surface rebuilds.
**Sections:** [mobile-first admin](superpowers/plans/2026-06-08-mobile-first-admin.md) ✅🟢 _(Phase 3 ongoing)_ · [mobile-first admin design](superpowers/specs/2026-06-08-mobile-first-admin-design.md) 📘 · [staging collection](superpowers/plans/008-staging-collection.md) 🟢 _next_

### [009 · Backend Contract & Auth Vision](009-backend-and-vision.md) 📘 / 🔭

The API-contract reference (still-missing endpoints that block frontend work) + the long-horizon ABAC access-control vision.
**Sections:** [backend handoff](superpowers/specs/009-backend-handoff.md) 📘 · [ABAC access control](superpowers/specs/009-abac-access-control.md) 🔭

---

## 🔜 Next steps (as of 2026-06-10, post-`0179`)

> **Sequencing decision (2026-06-02):** perf/LCP is **deferred to the END** of the refactoring phases — optimization rides on top of clean structure. `/todoist-done <desc>` marks items complete in Todoist.

1. **Directional prominence** — the unified layout value-model refactor; **in progress on `0182-directional-prominence`** (the prior panorama attempts — arFactor ramp + `isFullWidthHero` — are consolidated onto it as the starting point, to be retired by the rewrite). → [005](005-layout.md). _Convention: branch number = the MR number it becomes._
2. **Mobile-first admin Phase 3** — rebuild the remaining editor surfaces on the dark/white-framed token foundation laid in `0179`. → [008](008-collection-admin.md).
3. **`STAGING` system collection** — backend-heavy auto-parent for invisible collections. → [008](008-collection-admin.md).
4. **006 tail** — external error tracking (Sentry/CloudWatch), function decomposition, property-based + complex-hook tests, the inherited 001 CSS sweeps (`@custom-media` bridge, gap-rule/`rgb()`). → [006](006-code-health.md).
5. **Then perf (P4)** — hero-byte cuts, `will-change` scoping, blur placeholder. Still gated on the backend `blocks_per_page` fix for `force-dynamic` removal. → [002](002-performance.md).
6. **Security tail** — gate the unguarded admin routes in `proxy.ts`; CloudFlare Phase 2. → [007](007-security-hardening.md).

**Infra / DevOps:** Cloudflare CDN/edge ([007](superpowers/plans/007-cloudflare-phase2.md) · Todoist `6XQm4Ccw7Ghq2f4G`) · backend startup messages (`6g8xfM6Xv7XRc3gq`) · OAuth/Amplify-Cognito investigation ([009 ABAC](superpowers/specs/009-abac-access-control.md) · `6XjcFJH6W6JhVCgp`).
**Content / docs:** GitHub main-page README (`6g8xcP35w3Jmj7WH`) · backend README (`6g8xcR63JjC9X62q`). _(frontend README done, PR #111.)_

**✅ Everything shipped to date** — the full PR-by-PR log (design system, the refactor + React 19 waves, SSR BoxTree, the `0179` admin overhaul, collections parent-column, contact form, client-gallery gating, etc.) lives in **[previous-work.md](previous-work.md)**. No P0/P1 blockers open.

---

## 🧩 Backend blockers (see [009](009-backend-and-vision.md))

Keystone **`GET /api/read/content/images/search`** (unblocks [004 search](superpowers/plans/004-public-search-page.md)) · public `locations` · public `lenses` · collection-download ZIP · secure content-gating for password-protected galleries · `POST /collections/{id}/auto-tag`.

---

## 🗄️ Archive & history

- [previous-work.md](previous-work.md) — the shipped-feature log (the durable record; mine git for deeper detail).
- `_archive/shipped-plans-2026-06-10.tar.gz` — the 24 shipped sub-plans/specs removed in the 2026-06-10 pass (the `001-*` design set, the shipped `006-*` refactor plans, the shipped admin date-plans).
- `_archive/handoffs-shipped-2026-06-10.tar.gz` — the 5 finished handoff/spec runbooks (`0148` fullscreen fix, `0167`/`0171`/`0172` refactor-wave handoffs, the `design-review-2026-05-31` genesis review).
- `_archive/shipped-docs-2026-06-01.tar.gz` + `_archive/todo-archive-2026-06-01.tar.gz` — the first consolidation pass (25 docs + the old `todo/` logs, mined into `previous-work.md`).

> **Note:** the four `_archive/*.tar.gz` bundles above are **no longer tracked** — removed from the repo, and `docs/_archive/` is now gitignored. They remain retrievable from git history (`git show 9352046:docs/_archive/<file>`) should a shipped plan ever need excavating.
