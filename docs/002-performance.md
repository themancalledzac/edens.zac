# 002 · Performance & LCP

> Make the homepage paint fast — get the hero into server HTML, cut its bytes, and stop wasting render work · one analysis (📘) + two active plans (🟢) + one backend-blocked plan (⛔).

This chapter collects every performance thread into one merged epic: the homepage Largest Contentful Paint (LCP) is dominated by the fact that the hero image is never in the server HTML, sitting on top of an uncached, possibly-slow backend. The [LCP critical review](superpowers/specs/002-lcp-critical-review.md) is the "why" — it segments where LCP time actually goes and ranks the bottlenecks. The plans below are the "how": image-byte and render-path work that can land independently, plus the cache restoration that waits on the backend.

## ✅ Shipped — SSR BoxTree / blank-load CLS fix ([PR #161](https://github.com/themancalledzac/edens.zac/pull/161), `0160`, 2026-06-03)

The single biggest LCP/CLS win in this chapter landed: the collection BoxTree is now **server-rendered** instead of computed client-only after a `contentWidth` measurement pass.

- `feat(gallery): SSR the BoxTree with UA-derived viewport defaults` (`ce23436`) — the server emits a real first paint using `userAgent()`-derived desktop/mobile defaults, so rows are no longer empty (`rows.length === 0`) until the client measures.
- `refactor(gallery): derive contentWidth from constants` (`0d40093`) and `fix(gallery): pin SSR layout across hydration to eliminate the blank flash` (`0d4dc65`) — the server layout holds across hydration so there's no reflow.
- `fix(gallery): reserve 100dvh on the measuring skeleton` (`ce3b7a1`) — the empty-state skeleton reserves viewport height.

This closes the review's **§5 "blank-on-load void"** and delivers the higher-payoff **§1b** path of item 3 below (seed layout server-side) rather than the narrower dedicated-hero §1a path. The layout utils (`contentLayout`/`rowCombination`/`rowStructureAlgorithm`/`contentRatingUtils`) were confirmed pure (no DOM) and therefore RSC-safe.

## Remaining work (deduped)

One ordered Performance epic, roughly highest-leverage first:

1. **Baseline LCP measurement** — prod Lighthouse + `view-source` to confirm the hero isn't in the HTML. Dev-server LCP is unreliable; this de-risks everything below.
2. **Cut hero image bytes** — set explicit `quality` (~65), tighten `deviceSizes`/`imageSizes`; confirm the Pano's intrinsic vs displayed size.
3. ~~**SSR the hero**~~ — ✅ **shipped via the SSR-BoxTree work above** (#161 took the §1b "seed layout server-side" path: the whole first paint is now server HTML, not just a dedicated hero image).
4. **Narrow `priority`/preload scope** — stop spreading `fetchpriority="high"` + preload to every leaf in row 0; target the single LCP candidate. Now actionable since the hero reaches the HTML.
5. **Blur placeholder** — `placeholder="blur"` / `blurDataURL` generated server-side via sharp. _The blank-load **gap** is already closed by the SSR skeleton (#161); this remains as a quality polish for streaming-in images._
6. **GIF poster** — use the unused `ContentGifModel.thumbnailUrl` as a poster/placeholder (currently never read in `contentRendererUtils.ts`).
7. **Scope `will-change: transform`** — currently applied globally to parallax images; restrict to near-viewport only to avoid memory pressure.
8. **Verify Amplify serves AVIF/WebP** — `formats` config is active but untested after deploy.
9. **Render micro-opts** — memoize `handleFullScreenImageClick` (`useCallback`), share an IntersectionObserver, drop the redundant `document.querySelector` DOM probe in `useFullScreenImage`, and the admin-only inline-arrow callbacks in `ReorderOverlay`.

> ⛔ **Backend-blocked:** removing `force-dynamic` from `app/page.tsx` (to restore ISR `revalidate = 3600`) waits on the backend `blocks_per_page` schema fix. Until then the most-visited page blocks on a live, possibly-slow Spring fetch on every visit — an LCP floor no image work can lower.

## Sections

| Section                                                                               | Role | Status |
| ------------------------------------------------------------------------------------- | ---- | ------ |
| [Critical Review: Homepage LCP](superpowers/specs/002-lcp-critical-review.md)         | spec | 📘     |
| [LCP Fix & Lighthouse Score](superpowers/plans/002-lcp-and-lighthouse.md)             | plan | 🟢     |
| [Performance — Re-render Optimization](superpowers/plans/002-performance-rerender.md) | plan | 🟢     |
| [Frontend Cache & Revalidation](superpowers/plans/002-cache-and-revalidation.md)      | plan | ⛔     |

## Blocked on / open

- **Backend `blocks_per_page` schema fix** gates the cache plan (restore ISR on `app/page.tsx`). Cross-repo dependency on `edens.zac.backend`.
- The hero-SSR approach (review §1a vs §1b) is a deliberate decision — §1a (dedicated server hero, BoxTree owns below-the-fold) is the lower-risk path; §1b (seed `contentWidth` server-side) is higher payoff but risks a hydration reflow.

---

_↑ [Back to the book](000-summary.md)._
