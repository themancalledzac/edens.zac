# PF — Performance & platform

_Context file for board items PF1–PF9 on [2026-features.md](../2026-features.md). The LCP history:
the dominant issue (hero not in server HTML) closed via PR #161's server-side layout seeding; the
rest of the 002 chapter is this group._

## PF2 · Blur placeholders

Zero `blurDataURL` / `placeholder="blur"` hits in `app/`. Needs server-side generation (sharp) —
the open scoping question is WHERE: at backend upload time (persisted per image) vs at request
time in the FE. Scope that first; upload-time is the likely answer and makes this cross-repo.

## PF13 · Make the home page genuinely static (Cache Components / PPR) — COLD, real work

Created by PF4's closure. PF4 asked for a segment-config flip and there is no flip to make; the
question it was really asking — can the hottest page stop rendering per request? — is still open,
and the answer is a render-path change.

The home page renders per request because two things in `CollectionPageWrapper` need the request:

- `resolveSsrViewport()` reads the User-Agent through `headers()`, so the BoxTree composes
  server-side at the right width and the first client render matches (no hydration shift).
- `meServer()` reads `cookies()` for the principal, which decides whether the "Me" tile exists and
  is `no-store` by necessity. That fetch, not the collection fetch, is the per-visitor cost —
  measured at one `/api/auth/me` hit per render.

Making the page static means moving both behind Suspense boundaries so the shell prerenders and
only the personalized slots stream. That is the `next-cache-components` skill's territory
(`use cache`, `cacheLife`, `cacheTag`) and it touches the shared wrapper, so it lands on
`/[slug]` too. Size it as its own sitting or two, not a config change.

Worth knowing before anyone starts: the collection fetch is already cached (see PF4 below), so the
prize here is the render and the `/auth/me` round trip, not the Spring call.

## PF6 · External error tracking

Blocked on decision #8 (Sentry vs CloudWatch). Zero `Sentry` and zero `reportToService` hits in
`app/`, both re-run 2026-08-31. Error-boundary work rides the same MR.

**Premise correction, 2026-08-31.** This section said the #171 logger migration left a
`// Future: reportToService()` seam. It did not. `app/utils/logger.ts` is 14 lines of plain
`console.*` wrappers with no `TODO`, `Future` or `FIXME` marker in the file. Whoever picks this up
is adding a reporting path, not filling one in — there is no seam to slot into, and the estimate
should carry the cost of choosing where the call sites go. Found by running the grep rather than
re-reading the item; the claim had survived at least two passes.

## PF7 · CloudFlare Phase 2

Plan: `docs/superpowers/plans/007-cloudflare-phase2.md` (gitignored). ~1–2 weeks of elapsed lead
time, no code prerequisite left (Caddy already deleted in anticipation). The sequence:

1. Proxy DNS through CloudFlare (orange-cloud the EC2 origin)
2. Restrict 80/443 to CloudFlare IP ranges in `terraform/security.tf`; close 8080
3. Rate-limit page rule on `*/api/public/*`, cache bypassed
4. Re-key the backend `RateLimitFilter` off `CF-Connecting-IP`
5. Drop the `X-Real-IP` injection in the BFF `route.ts`
6. Verify the EC2 public IP no longer answers directly

Related backend item that should precede any second public endpoint: generalize the rate-limit
config (`application.properties:79-80` is contact-specific) into a per-path map — see AU1, which
needs it for the forgot-password trigger.

## PF12 · Gate the auto-deploy on CI — COLD, mostly console work

PF9 established that `main` auto-deploys to production inside ~15 minutes with no in-repo deploy
config. PF5 established that CI now runs on every PR. **Nothing connects them**: a merge to `main`
deploys whether or not CI passed, and CI's `push: [main]` run races the deploy rather than gating
it.

The fix is in the host's console (branch protection requiring the CI check, plus the host's own
"wait for checks" setting if it has one), not in this repo — which is why it is small but not a
code change. Worth doing precisely because the deploy is fast: a red merge is live before anyone
reads the CI email.

## Audit debt (no rows yet — re-derive before working)

From `006-frontend-audit.md`'s retained-unique findings, verified still true: no runtime schema
validation at the API boundary (no zod); `"exactOptionalPropertyTypes": false` at
`tsconfig.json:10`; the per-file a11y inventory (`<div onClick>`, `outline:none`,
unlinked labels, `window.confirm`) is untriaged AND its file paths are stale
(`ManageClient.tsx` deleted, `ImageMetadataModal` renamed). If picked up, re-derive the inventory
against current paths first — the findings may be live, the line numbers are not.

## Closed

### ✅ PF9 · Record the deploy target — PR #365, 2026-08-31

**Production is AWS Amplify Hosting.** The 08-31 `curl -sI https://zacedens.com/` had already
established CloudFront-fronted AWS running a live Next server and eliminated Vercel (no
`x-vercel-*`) and static S3 (the response carries `next.config.js`'s own security headers, and the
home page is `force-dynamic`). The user confirmed the remaining half — Amplify specifically, not a
hand-rolled Next server behind a self-managed CloudFront. Decision #9 is fully closed.

Recorded in `CLAUDE.md` as a Critical Rule, covering the three facts that change how work is done
here: `main` auto-deploys in ~15 minutes on Amplify's build hook, CI does not gate it, and build
and routing config lives in the Amplify console rather than the repo — so console-dependent
behavior cannot be reproduced by a local `next build`.

**The row's own premise was half wrong, and finding out was the useful part.** It said three docs
named three hosts. Two did: `README.md:24` said Hosting was `AWS (S3 + CloudFront)` — corrected —
and `docs/previous-work.md:148` already said Amplify. There is no third _doc_. The Vercel naming
lives in code: six `describe('Vercel BFF proxy …')` blocks in `tests/api/proxy/route.test.ts`,
while the route's own comments (`route.ts:72-80`) are already correct about the host. Filed on the
refactor board as **G7**, because a test-file rename is cleanup rather than a docs correction.

**Two CloudFront distributions, and conflating them is what made the wrong answer plausible.**
Amplify fronts the site with its own; `d2qp8h5pbkohe6.cloudfront.net` is the S3 image CDN pinned in
`next.config.js`. README's "Storage: S3 + CloudFront" row was true and its "Hosting" row was that
same fact miscopied. The new `CLAUDE.md` rule states the separation explicitly.

Rode along: `docs/002-performance.md` item 8 ("verify Amplify serves AVIF/WebP") closed by the same
production check — the optimizer returns `content-type: image/webp`.

Est 1 sitting, actual well under. Docs only, +5/−2 across 3 files. **Gating the deploy on CI was
kept out deliberately** — that is PF12, console work, and folding it in would have made this
unrevertable.

### ✅ PF11 · Reconcile the Node version — PR #366, 2026-08-31

`.nvmrc` (`24`) is now the one place the version is written down. `engines.node` went `">=20 <23"`
→ `">=22"`, CI switched to `node-version-file: .nvmrc`, and `tests/ci/ciWorkflow.test.ts` reads
`.nvmrc` instead of the workflow's inline pin.

**The floor is `>=22`, not the `">=20"` decision #11's recorded shape sketched.** The item said to
check the release schedule, and checking changed the answer:

- **Node 20 reached end-of-life 2026-04-30.** A `>=20` floor would declare support for a runtime
  that no longer gets security patches.
- **Next 16.3.1 declares `engines.node: ">=20.9.0"` itself**, so `>=20` sat below the repo's own
  framework floor.
- Node 22 is the oldest line still supported (maintenance through 2027-04-30); 24 is Active LTS
  until 2026-10-20 and EOL 2028-04-30, the longest runway available.

Verified against `nodejs/Release`'s `schedule.json`, not recalled. The board's own note ("24 is
Active LTS and 22 is in Maintenance") was correct as far as it went and simply had not noticed 20
aging out four months earlier — **a version-schedule claim goes stale on the calendar's schedule,
not the repo's, so re-check it every time rather than trusting a recent-looking sentence.**

`setup-node` resolves a bare major from `.nvmrc` through
`^(?:node(js)?\s+)?v?(?<version>[^\s]+)$` — confirmed in the action's source, because its README
does not document the accepted formats.

The test gained two guards beyond the swap: the workflow must carry no inline `node-version:`
literal, and `engines.node` must have no upper bound. Both exist so the two-literal shape cannot
come back quietly. Net +3 tests. `.nvmrc` needs no ignore entry — it is outside both `eslint .`
and the `format` script's glob.

Est 1 sitting, actual well under: +30/−14 across 4 files. The dev machine's Node and every other
CI step were left alone.

### ✅ PF8 · Small orphans batch — PR #367, 2026-08-31

Three unrelated smalls, +455/−108 across 14 files — **by far the largest of the three "small"
items, and the estimate to carry forward is that a batch item costs the sum of its parts plus the
tests, not the size of its largest part.**

**JSON-LD.** `ImageGallery` on `/[slug]`, one type on one route per the guardrail.
`buildCollectionJsonLd` is a pure function (`app/utils/structuredData.ts`) so it is testable;
`CollectionJsonLd` is an async server component that emits the tag. It refetches the collection
rather than threading it down, which is free — `getCollectionBySlug` carries its own
`next: { revalidate, tags }` and the route already called it twice against one fetch.

Four deliberate suppressions: password-protected collections (structured data is crawlable without
the password, and the backend still returns `title` and `coverImage` on a locked response — the
same reasoning `generateMetadata` already applies to the OG image), `?manage=1`, read failures, and
a guessed `url` when `NEXT_PUBLIC_APP_URL` is unset. `serializeJsonLd` escapes `<` so a title
containing `</script>` cannot close the tag it sits in.

**Full coverage is not a frontend follow-up, which is the finding the guardrail asked for.** Three
blockers, none of them in this repo: per-image `ImageObject` needs real `width`/`height`, and
backend Bug #21 leaves dimensions at `0`; `BreadcrumbList` needs `parents`, which public reads
return as `null` (that is RC1); a `WebSite` `SearchAction` needs a query param `/search` does not
have, because it fetches the whole corpus once and filters client-side. A second type on the same
page also forces a `@graph` with `@id` cross-references — a design decision, not another script
tag. Only `CollectionPage` on `/tag/[slug]` and `/location/[slug]` is genuinely additive, roughly
one builder plus tests per route.

**Suspense.** `/explore` and `/search` each awaited a backend read in front of the whole response,
so one slow fetch held the site header too. Both now return a synchronous shell with the data
behind a boundary: `/explore` → `ExploreDirectory`, `/search` → `SearchResults` with the fallback
factored out of the existing `loading.tsx` into a shared `SearchLoadingBody` so the streaming and
navigation placeholders cannot drift.

`CollectionPageWrapper` was left alone on purpose — its two personalized reads behind boundaries is
**PF13's** whole subject, and doing it here would have collided. Worth knowing for PF13: every
route in the app is already `force-dynamic`, so none of this is the `useSearchParams` prerender
deopt; it is straightforwardly moving a blocking await inside a boundary.

**SaveHeart.** 36px, rising to 40px at `≥768px`, against a 44px minimum. Now 44px at every width
with the media query removed — the width under the minimum was the touch-only one. Its docblock had
claimed it mirrored `.metadataToggle`'s sizing, which is no longer true and now says so;
`.metadataToggle` still steps 36 → 40 and has the same gap, filed on the refactor board as **C12**.

**Trap for the next session that splits a page around a Suspense boundary.** Two suites broke, both
for the same structural reason and neither obviously: `tests/explore/page.test.tsx` rendered the
route and awaited it, which no longer reaches the data; `tests/app/slug-page.manage.test.tsx`
rendered the route and asserted on the mocked wrapper, which an unmocked async sibling now
suspends in front of. The fix in both cases is to test the extracted async component as the unit
and stub the sibling. Budget for it — the test-side cost of a Suspense split is roughly the whole
cost of the split.

**Verification note, stated because it is a real limit.** The populated JSON-LD node was never seen
end-to-end: the local backend was down, so the browser pass exercised only the degradation path
(`/film` returns 200 and emits zero `application/ld+json`). That path is genuinely verified and the
builder is unit-tested; the happy path is covered by tests only. `/explore` painting its heading
with the directory pending, `/search` painting its fallback heading, and the served CSS carrying
`width: 44px; height: 44px` with no `≥768px` override were all confirmed in the browser.

### ✅ PF3 · Priority narrowing, will-change scoping, preconnect — PR #362, 2026-08-31

Three separate changes, each verified against a build rather than reasoned about.

**Priority narrowing.** `priority` was per-row: `BoxRenderer` passed one boolean down the whole
BoxTree, so every block in the priority rows got `fetchPriority="high"` and its own preload. A
four-across first row therefore issued four competing high-priority requests when only one can be
the LCP — the other three take bandwidth from it.

`computePriorityContentId` (in `componentUtils.ts`) now scans the priority rows in render order
and returns the id of the **first block that actually renders an image**. `BoxRenderer` takes
`priorityContentId` in place of `priority` and each leaf compares its own id.

Skipping non-image leaves is the part that matters. Marking "the first leaf" would hand the flag
to a BLANK spacer whenever `buildRows`' width-normalization pass put one first, leaving the real
LCP image lazy — strictly worse than the fan-out being replaced. Blanks, admin panels and text
blocks are skipped; IMAGE, GIF and COLLECTION all count, since all three render an `<Image>`.

**`will-change` scoping.** Deliberately _not_ unified into a mixin — a mixin would still apply
unconditionally, which is the actual defect. Each of the three was scoped where it lives:

| Declaration                                          | Was                          | Now                                                                |
| ---------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------ |
| `CoverCard.module.scss` `.cardImage`                 | Unconditional                | Set by `useParallax` while the card is visible, cleared on cleanup |
| `ParallaxImageRenderer.module.scss` `.parallaxImage` | Unconditional                | Same — both are `.parallax-bg`, driven by the same hook            |
| `fullscreen-image.module.scss` `.zoomLayer`          | Whole time the modal is open | `.zoomLayerActive`, applied only while `isZoomed`                  |

The two parallax rules moved into the hook because the hook is the only thing that knows when the
element is animating; it already gates its scroll listener on `isVisible` from an
IntersectionObserver, so the promotion reuses a signal that was there. This is the one with real
weight: `/collections` requests up to 500 cards, and as a stylesheet rule every one of them held a
GPU compositor layer for the whole session, nearly all offscreen and none animating. The
reduced-motion branch clears it too.

The fullscreen layer trades one frame for the rest of the gesture: the first frame of a pinch is
unpromoted now, everything after it is not. Worth it against holding a promoted layer for the
whole time someone is simply looking at a photo.

Built CSS confirms it: **3** `will-change` rules before, **1** after — `.zoomLayerActive`.

**Preconnect.** `app/layout.tsx` had no `<head>` at all. It now carries a CloudFront `preconnect`
plus a `dns-prefetch` fallback. `crossOrigin="anonymous"` is required: image requests are
anonymous-CORS, and a preconnect whose CORS mode does not match opens a connection the image
request cannot reuse. The host is `CDN_ORIGIN` in `app/constants`, duplicated from
`next.config.js`'s `CLOUDFRONT_HOST` because that file cannot be imported from `app/` without
dragging the bundle analyzer into the client bundle — `tests/config/cdnHost.test.ts` asserts the
two agree, along with the CSP and the optimizer's `remotePatterns`.

**Measured**, both arms built and served against the same mock backend and the same home payload:

|                                  | Before | After |
| -------------------------------- | ------ | ----- |
| `loading="eager"` images         | 2      | **1** |
| `rel="preload" as="image"`       | 2      | **1** |
| `rel="preconnect"`               | 0      | **1** |
| `will-change` rules in built CSS | 3      | **1** |

Production before the change, for reference: home 2 eager / 2 preloads, `/collections` **4 eager /
4 preloads**, 0 preconnect on both. `/collections` is where the narrowing pays most, and the unit
tests pin that a four-item row now yields exactly one id.

### ✅ PF10 · Image quality 65 — PR #361, 2026-08-31

`images.qualities: [65]` in `next.config.js`, `IMAGE.quality` in `app/constants/index.ts`, and
`quality={IMAGE.quality}` at every optimized `<Image>`. Guard test:
`tests/config/imageQuality.test.ts`.

**The row's work list was wrong.** It said "8 `sizes=` declarations" and listed them. That grep
conflates three unrelated things:

- `BoxRenderer.tsx:159-160` and `Component.tsx:246` pass `sizes={sizesMap}` — the BoxTree
  dimensions map. Nothing to do with `next/image`.
- `LocationCollections.tsx:26` passes `sizes` to `CoverCard`, which forwards it to its own
  `<Image>` — the same call site as `CoverCard.tsx:64`, counted twice.
- It missed five real render sites that carry no `sizes` prop at all: `FullScreenModal.tsx:210`,
  `About.tsx:15`, `CollectionsPanel.tsx:100`, `EditModeLayer.tsx:338`, and the
  `<Image {...imageProps} />` spread at `CollectionContentRenderer.tsx:690`.

The right unit is the `<Image>` render site. There are ten; two (`MediaPreview.tsx:46` and `:101`)
are `unoptimized` and bypass the optimizer entirely, so **eight** needed the prop. Same number as
the row, different set — which is exactly the way this could have shipped broken.

**Why a miss breaks rather than slows.** Verified against a running optimizer, same image, w=1920:

```
q=65  →  200, 408,696 bytes, image/webp
q=75  →  400, 44 bytes
```

75 is what `next/image` sends when the prop is absent. So a forgotten `quality` is a broken image
in production. That is what the guard test is for, and why `qualities` is `[65]` alone rather than
`[65, 75]`: the permissive list would let a miss degrade silently into no savings, whereas CI now
fails loudly instead.

**Measured saving**, same image, WebP as a browser receives it:

| Width | q75     | q65     | Saving    |
| ----- | ------- | ------- | --------- |
| 1920  | 469,408 | 408,696 | **12.9%** |
| 1080  | 139,786 | 122,736 | **12.2%** |

Consistent with the 13.3% recorded pre-build on a different image.

**One judgment call worth a second opinion.** `FullScreenModal` is the surface where someone is
deliberately looking closely at a photograph, and it now gets the same 65 as a thumbnail. That is
what the item specified and it is applied uniformly, but if any surface deserves its own tier this
is the one. Making it so is cheap now: add a second constant, extend `qualities` to both values,
and the guard test keeps them in agreement.

The stale claim "Quality is not settable here in Next 16" was corrected in `next.config.js` — the
_allowlist_ is settable; only a _default_ is not.

### ✅ PF4 · Restore ISR on the home page — closed as VOID, PR #360, 2026-08-31

No behavior change shipped. The MR replaced the `@todo` in `app/page.tsx` with what the
measurements actually showed, because the comment was sending each new reader down the same
dead end. All three of the item's premises were tested; none held.

**1. The backend blocker really is gone.** Not inferred from source this time — asked of
production:

```
GET https://zacedens.com/api/proxy/api/read/collections/home?page=0 → 200, full block payload
```

**2. The `@todo`'s recipe cannot build.** Applying `export const revalidate = 3600; export const
dynamic = 'error'` and running `next build`:

```
Error occurred prerendering page "/".
Route / with `dynamic = "error"` couldn't be rendered statically because it used `headers()`.
```

`CollectionPageWrapper` awaits `resolveSsrViewport()` (which calls `next/headers`) and
`meServer()` (which calls `cookies()`). `force-static` is not the escape hatch either: it makes
both return empty, which costs the mobile SSR viewport and the logged-in "Me" tile.

**3. The stated benefit does not exist.** "Every visitor pays a live Spring fetch" is false. The
Next 16 docs say `force-dynamic` is "equivalent to `fetchCache = 'force-no-store'`"
(`node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md:97-99`), which
is what made the claim look right. That default governs only _unannotated_ fetches, and
`getCollectionBySlug` is annotated — `next: { revalidate: 3600, tags: ['collection-home'] }` —
so it keeps its cache entry.

Measured with a mock backend counting hits per path, behind a real `next build` + `next start`:

| Arm                             | Page renders | `/api/read/collections/home` | `/api/auth/me` |
| ------------------------------- | ------------ | ---------------------------- | -------------- |
| `force-dynamic` present (today) | 8            | **1**                        | 8              |
| `force-dynamic` removed         | 6            | **1**                        | 6              |

Identical. The collection fetch is cached either way; `/auth/me` is per-render by design.

**`force-dynamic` was kept.** It is strictly redundant — `headers()` already forces the route
dynamic — but it is the safer default: an unannotated fetch added to this tree later would
otherwise be silently cached with per-viewer data. Removing it buys nothing measurable and adds
that footgun.

**Harness note for whoever re-runs this.** Next persists its fetch cache under `<distDir>/cache`
and `next build` does not clear it. Reusing one `NEXT_BUILD_DIR` across both arms leaked the
first arm's warm cache into the second and reported _zero_ backend fetches — a clean-looking
number that was pure artifact. Use a separate `distDir` per arm.

**What survives** is the underlying question, refiled as PF13: the page still renders per request,
and making it not do so is a Cache Components / PPR change to the shared wrapper.

### ✅ PF1 · Image bytes — PR #358, merged 2026-08-31

Set `deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048]` and `imageSizes: [128, 256, 384]`.
Guard test: `tests/config/imageSizes.test.ts`.

**The source ceiling is 2500px.** Every image the backend exports is 2500px on its long edge,
measured 2026-08-30 against the live CloudFront origin across six files spanning 2019–2026
(`DSC_0045` 2500×2000, `DSC_9873-Pano` 2500×2500, `DSC_8842` 2500×2500, `000024950001` 2024×1994,
`DSC_0104` 2500×1663, `DSC_9897` 2500×1663).

Next never enlarges, so the default `deviceSizes` entries above that ceiling were the same file
under three cache keys, not higher quality:

| Requested width | Bytes returned |
| --------------- | -------------- |
| 1200            | 153,038        |
| 1920            | 298,282        |
| 2048            | 328,916        |
| 2560            | 685,082        |
| 3200            | 685,082        |
| 3840            | 685,082        |

Removing them makes 2048 the top candidate, which is the whole win. Home page HTML, before → after:
srcSet candidates `640…2048, 3840` → `640…2048`; srcSet attribute bytes 6,324 → 5,535; fallback
`src` **w=3840 (685 KB) → w=2048 (329 KB)**. The fallback `src` is what anything without srcset
support fetches, crawlers and social preview bots included. For real browsers the cap engages
above 2048 device px — e.g. `/hidden-lake`'s largest slot is 944 CSS px, so a DPR-3 device needs
2832 and selected 3840, now selects 2048. Cost is a 1.22× upscale from the 2500px source.

**Do not thin the middle.** A browser picks the smallest candidate ≥ what it needs, so deleting an
intermediate width rounds those requests UP and costs bytes. 828 stays for that reason alone. A
max-gap-ratio guard cannot express this: deleting 828 leaves a 750→1080 gap of 1.44×, smaller than
the ladder's own inherent 1200→1920 gap of 1.60×. The test asserts "defaults minus what exceeds
the ceiling" instead.

`imageSizes` drops 32/48/64/96 — the smallest `sizes` any component declares is 140px, so nothing
below 128 is selectable even at 1×.

**Quality is not config-only in Next 16**, contrary to the 002 chapter's "set quality ~65".
`imageConfigDefault.qualities` is `[75]`; `next/image` sends 75 whenever no `quality` prop is given
(`get-img-props.js:459`); and the optimizer _rejects rather than clamps_ anything outside
`images.qualities` (`image-optimizer.js:657`, HTTP 400). So `qualities: [65]` alone would 400 every
image on the site. Lowering it needs `quality={65}` at the call sites — a render-path change.
Measured prize: **q65 is 13.3% smaller than q75** (258,556 vs 298,282 bytes at w=1920). Not
ticketed; open a row if wanted.

**No Lighthouse baseline was taken.** A dev-server run measures unminified bundles and a cold
optimizer, and a production run is PF9-gated — three docs name three hosts and there is no deploy
config, so there is nowhere agreed to point it. The byte measurements above cover what this change
alters and are reproducible against the live CDN. The PF9-gated question is unchanged: whether the
host actually serves the WebP the optimizer emits.

### ✅ PF5 · Frontend CI — PR #356, merged 2026-08-31

`.github/workflows/ci.yml` — one job on `pull_request` and pushes to `main`, running `type-check`,
`lint:js`, `lint:css` and `test`. Guard test `tests/ci/ciWorkflow.test.ts`. Est 1 sitting, actual 1.

One job rather than four because `npm ci` dominates the wall clock; every check is `if: always()`
so one run reports all four verdicts. Stylelint included beyond the row's stated "tsc/jest/eslint"
because `npm run lint` in this repo means both linters and it was already green.

**Node drift, unresolved and worth a decision.** CI pins **22**, the top of `engines.node`
(`>=20 <23`). The dev machine runs **25.3.0**, which that range excludes. CI now tests the runtime
the repo claims to support while development happens on one it does not. Not changed here because
widening `engines` is a call, not a cleanup. Filed as PF11.

**Guard mutation-proved:** dropping the type-check step and pinning Node 25 each red their test.

**The deploy-automation report the row asked for is now obsolete, and that is the finding.** It was
written assuming nothing deployed automatically. Production disproved that at close-out — see PF9.
