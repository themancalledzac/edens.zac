# 📚 docs/ — The Book

> **Updated 2026-08-24.** The master index of every planning doc, organized as **chapters → sections**. Reconciled against `origin/main` (HEAD `53aaac4`).
>
> **⚠️ Read this before trusting any collection doc.** The **typeless-collection migration** shipped 2026-07 ([#233](https://github.com/themancalledzac/edens.zac/pull/233)/[#234](https://github.com/themancalledzac/edens.zac/pull/234)/[#235](https://github.com/themancalledzac/edens.zac/pull/235), backend `V50`–`V52`). `CollectionType` and `collection.type` **no longer exist**. A collection is a named, slugged, ordered grouping of any mix of content with two stored discriminators, `isClient` and `isBlog`; `PARENT` and `HOME` are derived; `PORTFOLIO` / `ART_GALLERY` / `MISC` are gone with **no successor concept**. Full record → [previous-work.md § Typeless Collection Migration](previous-work.md#2026-07-typeless-collection-migration-233235). Canonical model wording → [`ai_guidelines/ai_api.md` § ContentCollection Kind](../ai_guidelines/ai_api.md).
>
> **Structure:** this book (`000`) → **chapter files** (`001`–`009`, each an overview + remaining-work list) → **sections** (the MR-level plans/specs under `superpowers/plans/`, `superpowers/specs/`, `spikes/`). **All go-forward plans live in `superpowers/plans/`.**
>
> **2026-06-10 consolidation:** the shipped sub-plans and the finished handoff runbooks (`0148`/`0167`/`0171`/`0172`/`design-review-2026-05-31`) were archived to `_archive/*.tar.gz` and removed from the tree (78 → 49 docs). Shipped detail lives in [previous-work.md](previous-work.md); **this index now tracks only forward work.** _Rule going forward: when a section ships, archive its plan in the same cycle and leave a one-line `previous-work.md` pointer — don't let a shipped runbook outlive its merge._

**Legend:** 🟢 active · 🟡 partial · ⛔ blocked (backend) · 📘 reference/living spec · 🔭 future vision · 🗒️ idea

---

## 🧭 Start here

| File                                                             | What it is                                                                                                |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| [previous-work.md](previous-work.md)                             | Shipped-feature log — "what got built and when." Current through #293.                                    |
| [spikes/2026-summer-refactor.md](spikes/2026-summer-refactor.md) | The live cleanup board — one row per MR, grouped A–H. The only tracked file under `spikes/`.              |
| The 9 chapters below                                             | Each is an epic; open the chapter file for its remaining-work list + sections.                            |
| [../ai_guidelines/](../ai_guidelines/)                           | Canonical project conventions (API, CSS, lint, TS, testing) — referenced by `CLAUDE.md`.                  |
| [handoffs/](handoffs/)                                           | Session handoff runbooks (gitignored, local-only).                                                        |
| [user-flow/](user-flow/)                                         | Tracked as-built user-flow map (mermaid + SVG) — **crawl is pre-typeless (2026-06-29)**; re-crawl needed. |

---

## 📖 Chapters

### [001 · Design System Unification](001-design-review.md) ✅ **fully shipped**

~12 token-driven primitives in `app/components/ui/` on one painted dark-safe surface, plus the IA/UX & a11y gaps that rode along. All phases shipped (#152→#160). Only the two deferred CSS carve-outs remain (`@custom-media` bridge + gap-rule/`rgb()` sweeps), now owned by [006](006-code-health.md). _Per-phase detail → [previous-work.md](previous-work.md); the 8 sub-plans are archived._

### [002 · Performance & LCP](002-performance.md) 🟢 / ⛔

One perf epic (~9 ordered tasks). **SSR BoxTree partial ship ([#161](https://github.com/themancalledzac/edens.zac/pull/161))** eliminated the blank-on-load CLS void. Remaining: hero-byte cuts, narrow priority, blur placeholder, `will-change` scoping, render micro-opts — deferred to after the refactor wave (P4), partly gated on backend `blocks_per_page`. The GIF poster is done: `thumbnailUrl` lands as `poster=` on all three video sites.
**Sections:** [LCP critical review](superpowers/specs/002-lcp-critical-review.md) 📘 · [LCP & Lighthouse](superpowers/plans/002-lcp-and-lighthouse.md) · [re-render perf](superpowers/plans/002-performance-rerender.md) · [cache & revalidation](superpowers/plans/002-cache-and-revalidation.md) ⛔

### [003 · Client Gallery Security](003-client-gallery-security.md) 🟡

Cookie gate + admin password input shipped. Left: fix the **plaintext password** (→ BCrypt, backend), new-recipient-only send, Set-Cookie test, cookie-timing race, Download-All UX.
**Sections:** [security handoff](superpowers/plans/003-client-gallery-handoff.md) 📘 · [password logic](superpowers/plans/003-client-gallery-password.md) · [recipient send](superpowers/plans/003-gallery-recipient-send.md) · [select/download design](superpowers/specs/2026-06-02-client-gallery-select-download-design.md) 📘

### [004 · Content Discovery & Filtering](004-content-discovery.md) 🟢 / ⛔

One reusable filter-bar/chip across Search/Location/Person/Tag/Collection; the `/search` route; collection tags; Collection IA. **Unified filter-visibility gate ✅ shipped** (35/35 plan tasks) · **Collection IA A1/A3 ✅ shipped** ([#198](https://github.com/themancalledzac/edens.zac/pull/198)/[#200](https://github.com/themancalledzac/edens.zac/pull/200)/[#199](https://github.com/themancalledzac/edens.zac/pull/199)) — A2 dynamic Home + Track D automation deferred by design. Remaining: auto-tag endpoint + public-page tag display; the `/search` route (⛔ backend); Breadcrumb mount-or-drop; A3 Spot-1.
**Sections:** [public search page](superpowers/plans/004-public-search-page.md) ⛔ · [location filter bar](superpowers/plans/004-location-filter-bar.md) 🟡 · [collection tags](superpowers/plans/004-collection-tags.md) 🟡 · [collection IA & user-flow (living spec)](superpowers/specs/2026-06-29-collection-ia-and-user-flow-design.md) 📘 · [collections-as-tags design](superpowers/specs/2026-07-06-collections-as-tags-design.md) 📘 _(D1–D12 awaiting review; supersedes IA D7/D8)_ · [menu-dropdown nav & discovery](superpowers/specs/2026-06-10-menu-dropdown-nav-design.md) ✅ _Option A shipped · Option C open_ · [liked images](superpowers/plans/004-liked-images.md) 🗒️

### [005 · Layout](005-layout.md) 📘 / ✅

The V3 row-composition engine shipped. **✅ Directional prominence shipped** (#182 + #183/#184 area-to-value follow-ons) — one orientation-agnostic prominence `P` → `Hv`/`Vv` retired the vertical penalty, the arFactor cap, and the competing wide-pano mechanisms; the motivating hero-isolation bug's reachability item is superseded per the area-to-value spec. **✅ #185 related-collections row redesign shipped.** **🟡 Shaped blocks** (`Content` min/max width & height, pinned heights, the admin-hub panel model) shipped in [#246](https://github.com/themancalledzac/edens.zac/pull/246) (`0246-admin-panel-collapse`, merged 2026-08-12); Phase C reverted, collapsed-panel design reversed on review, and one open trade-off — shared panel width vs. shorter page. Two open items remain: that adjudication, and reconciling the duplicate lone-last-row designs (gap-box vs redesign §13 FILLER atom).
**Sections:** [directional prominence](superpowers/plans/2026-06-09-directional-prominence.md) ✅ _shipped_ · [redesign spec](superpowers/specs/005-row-composition-redesign.md) 📘 · [flowcharts](superpowers/specs/005-row-composition-flowcharts.md) 📘 · [retrospective](spikes/005-row-composition-retrospective.md) 📘 · [reorder audit](spikes/005-image-reorder-audit.md) 📘 · [end-row gap](superpowers/plans/005-end-row-gap.md) 🟢 · [mobile text overlay](superpowers/plans/005-mobile-text-overlay.md) 🗒️ · [pattern-tree](spikes/005-pattern-tree-exploration.md) 🗒️ · [WFC mosaic](spikes/005-wfc-mosaic-exploration.md) 🗒️ · [admin-hub panel shape model & caching](superpowers/specs/2026-08-10-admin-hub-panel-shape-design.md) 🟡 _(A + B shipped in #246 · C reverted · height trade-off open)_

### [006 · Code Health](006-code-health.md) 🟢 / 🟡

Refactor + tests + observability + deps. **Shipped & archived** (→ [previous-work.md](previous-work.md)): React 19 upgrade, DRY consolidation, thin-component extraction, entity-edit DRY, inline-JSX config, dependency upgrade, camera optimistic-create race. **What's left:** external error tracking (Sentry/CloudWatch), function decomposition, property-based + complex-hook tests, and the inherited 001 CSS sweeps.
**Sections:** [error boundaries & logging](superpowers/plans/006-error-boundaries-and-logging.md) 🟡 · [cleanup & refactor (Wave B)](superpowers/plans/006-cleanup-and-refactor.md) 🟢 · [function decomposition](superpowers/plans/006-function-decomposition.md) 🟢 · [property-based tests](superpowers/plans/006-property-based-tests.md) 🟢 · [test coverage gaps](superpowers/plans/006-test-coverage-gaps.md) 🟡 · [React 19 follow-ups](superpowers/plans/006-react19-followups.md) 🗒️ · [frontend audit (index)](superpowers/specs/006-frontend-audit.md) 📘

### [007 · Security Hardening](007-security-hardening.md) 🟢

Cross-cutting hardening surfaced by the (shipped) contact form. **✅ Admin route gating shipped** (0203 F4 — all-collections/all-images/collection-manage/metadata are in the proxy matcher) **and the anonymous admin-API hole is closed** (0203, `is_admin` + `hasRole(ADMIN)`). **✅ The `/explore` over-gate regression is fixed** (2026-07-06 — public again, Explore nav shows logged-out). **✅ Group D closed** (#265–#277, nine items: anonymous cache-purge routes gated, shared Origin allowlist, image optimizer pinned to one CloudFront host, proxy restricted to `api/**`, security headers). **✅ All 27 Dependabot alerts cleared** (#254). Open: the CloudFlare Phase 2 migration.
**Sections:** [contact messages](superpowers/plans/007-contact-messages.md) 📘 · [CloudFlare Phase 2](superpowers/plans/007-cloudflare-phase2.md) 🟢

### [008 · Collection / Admin](008-collection-admin.md) ✅ / 🟢

**✅ Consolidated Edit Mode & Mobile-First Admin ([#181](https://github.com/themancalledzac/edens.zac/pull/181), `0179`, merged 2026-06-10)** — the dark `/manage` route collapsed into in-place light edit mode on `/[slug]` (`?manage=1`, local-dev); the 2,027-line **`ManageClient` deleted** for one `useCollectionEdit` hook + one `EditBar`; edit layer dynamically imported (public bundle ships zero admin code). **✅ Admin panel shipped**: comments panel (#197), user management (invite #187, merge UI, email-edit #202), 0203 authz + **0204 root-view model** (impersonation removed, #204 + BE #114, both merged 2026-07-06 — cross-ref [007](007-security-hardening.md)). **✅ Typeless collection migration shipped** (#233/#234/#235 — enum deleted, kind is `isClient`/`isBlog`, parent-ness server-derived; see the banner at the top of this file). **✅ Admin hub became a layout surface** (#244/#245/#246 shaped blocks + collapsible panels, #252 `ListPanel`, #253 collections list) and **✅ `/user` ↔ `/admin/users/[id]` unified** on one `UserSpace` (#239/#243/#251). Still open: the **`staging` system collection** (partly shipped; **re-specced** against the typeless model — the old enum-based plan is stale), + the mobile-first **Phase 3** surface rebuilds.
**Sections:** [mobile-first admin](superpowers/plans/2026-06-08-mobile-first-admin.md) ✅🟢 _(Phase 3 ongoing)_ · [mobile-first admin design](superpowers/specs/2026-06-08-mobile-first-admin-design.md) 📘 · [staging collection](superpowers/plans/008-staging-collection.md) ⚠️ _stale — pre-typeless; superseded by [008](008-collection-admin.md)'s Remaining-work list_ · [logged-in user-flow review](superpowers/specs/2026-07-06-logged-in-user-flow-review.md) 📘 _(user change-log panel — cross-ref, 009-owned)_

### [009 · Backend Contract & Auth Vision](009-backend-and-vision.md) 📘 / 🔭

The API-contract reference (still-missing endpoints that block frontend work) + the long-horizon ABAC access-control vision. **✅ Phase C (User Concept) shipped** (2026-06-22 plan; Selects live; Rating control shipped-then-removed `fa5516b`) · **✅ Person→User identity merge shipped** (Phases 1+2 — the `users` table + `is_admin` path that fed 0203). Still-missing: search/locations/lenses/auto-tag endpoints. **2026-07-06:** passkey login proven never-worked e2e (spike); the `0211` fixes merged on both sides ([#210](https://github.com/themancalledzac/edens.zac/pull/210) + BE), not yet verified against a deployed environment · `gallery_access` is gone (V36) — `user_collection` is the whole access model. **2026-07-26:** the backend built invite email (`sendInviteEmail` via an `afterCommit` hook); `EMAIL_ENABLED` still defaults false, so nothing sends yet.
**Sections:** [ABAC access control](superpowers/specs/009-abac-access-control.md) 🔭 · [user concept](superpowers/specs/009-user-concept.md) ✅ _shipped_ _(the original backend-handoff contract doc is archived — absorbed into 009's still-missing list)_ · [logged-in user-flow review](superpowers/specs/2026-07-06-logged-in-user-flow-review.md) 📘 · [email/SES production posture](superpowers/specs/2026-07-06-email-ses-production.md) 📘 _(as-is section stale — invite email shipped since)_ · [passkey login diagnosis](spikes/2026-07-06-passkey-login-diagnosis.md) ✅ _fixes merged_

---

## 🔜 Next steps (as of 2026-08-24, post-summer-refactor-board)

> **Sequencing decision (2026-06-02):** perf/LCP is **deferred to the END** of the refactoring phases — optimization rides on top of clean structure. `/todoist-done <desc>` marks items complete in Todoist.

1. **Finish the summer refactor board** — the open rows in [`spikes/2026-summer-refactor.md`](spikes/2026-summer-refactor.md). Groups A, C (except C6, backend-blocked) and D are closed; B, E, G and the new H feature requests carry the remainder.
2. **Track B leftovers** — mount-or-drop `Breadcrumb.tsx` decision; verify people/location chip-click-to-filter. → [004](004-content-discovery.md).
3. **A3 Spot-1** — Save-as-Collection on the tag-view page itself (`TODO(A3)` in `useCollectionEdit.tsx`). → [004](004-content-discovery.md) / [008](008-collection-admin.md).
4. **Turn email on** — the code is built; `EMAIL_ENABLED` defaults false pending SES domain verification and sandbox exit. → [009](009-backend-and-vision.md).
5. **Client-gallery BCrypt** — P1-4 from the security handoff; reconcile BE shipped-state first. → [003](003-client-gallery-security.md).
6. **Standing queue**: mobile-admin Phase 3 · `staging` collection ([008](008-collection-admin.md) — seed migration + non-upload auto-parenting) · CloudFlare Phase 2 ([007](007-security-hardening.md)) · 006 tail (Sentry/CloudWatch, decomposition, property tests) · the admin-hub panel-width vs page-height adjudication ([005](005-layout.md)) · perf ⛔ backend-blocked · SaveHeart 44px tap target.
7. **Deferred by design**: A2 dynamic Home · Track D automation (auto-related, CLIP auto-tag — BE ML design doc exists, 0% built) · ABAC vision · liked-images.

**Infra / DevOps:** Cloudflare CDN/edge ([007](superpowers/plans/007-cloudflare-phase2.md) · Todoist `6XQm4Ccw7Ghq2f4G`) · backend startup messages (`6g8xfM6Xv7XRc3gq`) · OAuth/Amplify-Cognito investigation ([009 ABAC](superpowers/specs/009-abac-access-control.md) · `6XjcFJH6W6JhVCgp`).
**Content / docs:** GitHub main-page README (`6g8xcP35w3Jmj7WH`) · backend README (`6g8xcR63JjC9X62q`). _(frontend README done, PR #111.)_

**✅ Everything shipped to date** — the full PR-by-PR log (design system, the refactor + React 19 waves, SSR BoxTree, the `0179` admin overhaul, layout value model, auth, identity merge, Collection IA, admin panel, the typeless migration, the admin-hub/roles/sharing wave, and the summer refactor board) lives in **[previous-work.md](previous-work.md)**, current through #293. No P0/P1 blockers open.

---

## 🧩 Backend blockers (see [009](009-backend-and-vision.md))

Keystone **`GET /api/read/content/images/search`** (unblocks [004 search](superpowers/plans/004-public-search-page.md)) · public `locations` · public `lenses` · `POST /collections/{id}/auto-tag`.

---

## 🗄️ Archive & history

- [previous-work.md](previous-work.md) — the shipped-feature log (the durable record; mine git for deeper detail).
- **Archive-rule miss, corrected 2026-07-28.** The typeless-collection migration (#233/#234/#235) shipped without a `previous-work.md` entry, so the book kept describing a model the code had deleted — the exact failure the 2026-06-10 rule above exists to prevent. Backfilled as [§ Typeless Collection Migration](previous-work.md#2026-07-typeless-collection-migration-233235). Its spec (`superpowers/specs/2026-07-26-typeless-collection.md`, unit ids `U0`–`U6`, cited from backend `V52`) is local-only and was never tracked; the `previous-work.md` entry is the durable record.
- **Second archive-rule miss, corrected 2026-08-24.** The same failure, wider: `previous-work.md`'s newest entry was #235 while 58 PRs (#236–#293) had merged. The book still called `0204`, `0211` and `0246` unmerged, still listed the GIF poster and the parallax-card consolidation as open, and still said no email sends. Backfilled as [§ Summer Refactor Board](previous-work.md#2026-08-summer-refactor-board-254293) and [§ Admin Hub, Roles and Sharing](previous-work.md#2026-08-admin-hub-roles-and-sharing-236253). **Twice is a pattern, not an accident.** The rule needs a cheaper trigger than remembering it: the merge is the moment to write the line, not the end of a wave.
- `_archive/shipped-2026-07-06.tar.gz` — the third consolidation pass (24 files): the `0182`–`0204` wave's shipped sub-plans/specs, all 3 `handoffs/` runbooks, and the original `009-backend-handoff.md` (absorbed into 009).
- `_archive/shipped-plans-2026-06-10.tar.gz` — the 24 shipped sub-plans/specs removed in the 2026-06-10 pass (the `001-*` design set, the shipped `006-*` refactor plans, the shipped admin date-plans).
- `_archive/handoffs-shipped-2026-06-10.tar.gz` — the 5 finished handoff/spec runbooks (`0148` fullscreen fix, `0167`/`0171`/`0172` refactor-wave handoffs, the `design-review-2026-05-31` genesis review).
- `_archive/shipped-docs-2026-06-01.tar.gz` + `_archive/todo-archive-2026-06-01.tar.gz` — the first consolidation pass (25 docs + the old `todo/` logs, mined into `previous-work.md`).

> **Note:** the `_archive/*.tar.gz` bundles above are **no longer tracked** — removed from the repo, and `docs/_archive/` is now gitignored. They remain retrievable from git history (`git show 9352046:docs/_archive/<file>`) should a shipped plan ever need excavating.
