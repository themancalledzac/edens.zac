# PF — Performance & platform

_Context file for board items PF1–PF9 on [2026-features.md](../2026-features.md). The LCP history:
the dominant issue (hero not in server HTML) closed via PR #161's server-side layout seeding; the
rest of the 002 chapter is this group._

## PF2 · Blur placeholders

Zero `blurDataURL` / `placeholder="blur"` hits in `app/`. Needs server-side generation (sharp) —
the open scoping question is WHERE: at backend upload time (persisted per image) vs at request
time in the FE. Scope that first; upload-time is the likely answer and makes this cross-repo.

## PF3 · Priority narrowing, `will-change` scoping, preconnect

- `priority`/preload is row-scoped: `Component.tsx`'s `computePriorityRowIndex` deliberately
  extends eager loading through the first content row. Narrow toward the single LCP candidate.
- `will-change: transform` is unconditional in three modules:
  `app/styles/fullscreen-image.module.scss:125`, `CoverCard.module.scss:53`,
  `ParallaxImageRenderer.module.scss:17`. Scope to near-viewport.
- No CloudFront `<link rel="preconnect">` in `app/layout.tsx` (006 straggler routed to 002).

Three small independent slices; can land as one MR or three.

## PF4 · Restore ISR on the home page — likely UNBLOCKED, one live check first

`app/page.tsx:22` is `export const dynamic = 'force-dynamic'`; the restore recipe sits in the
`@todo` at `:19-20` (both refs re-verified 2026-08-31). Every visitor pays a live Spring fetch on
the hottest page.

**The stated blocker appears to have cleared.** The row says it waits on the backend
`blocks_per_page` schema fix. Re-run against the backend's `origin/main` on 2026-08-31:

```bash
git grep -c "blocks_per_page\|blocksPerPage" origin/main -- src/   # → zero hits
```

The column reference is gone from backend source. **This was not checked by re-reading the row —
the command was run.** What that does NOT prove is that the *deployed* backend carries that
version, which is the only thing standing between here and flipping the flag.

So: before restoring ISR, confirm the deployed backend serves the home collection without the
column reference — now cheap, since PF9 pinned production. If it does, this is a two-line change
plus a live check, well under a sitting.

## PF6 · External error tracking

Blocked on decision #8 (Sentry vs CloudWatch). Zero `Sentry`/`reportToService` hits in `app/`; the
logger migration (#171) left the `// Future: reportToService()` seam. Error-boundary work rides
the same MR.

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

## PF8 · Small orphans batch

Three verified-absent smalls tracked nowhere else (previous-work.md tail + 000 next-steps):

- JSON-LD structured data — zero `application/ld+json` in `app/`
- Component-level `<Suspense>` wrappers in pages — zero `<Suspense` in `app/`
- SaveHeart 44px tap target (`app/components/Content/SaveHeart.tsx`)

One MR, or ride-alongs on adjacent work.

## PF9 · Record the deploy target — COLD, and mostly answered

**Answered by measurement 2026-08-31.** The row said three docs name three hosts (Amplify,
S3+CloudFront, Vercel) and no in-repo config settles it. One `curl -sI https://zacedens.com/` does:

```
via: 1.1 <id>.cloudfront.net (CloudFront)
x-amz-cf-pop: DEN53-P3
x-frame-options: DENY
content-security-policy-report-only: default-src 'self'; …
cache-control: private, no-cache, no-store, max-age=0, must-revalidate
```

Apex resolves to `3.169.202.x` (CloudFront range), no CNAME.

- **Vercel is eliminated** — no `x-vercel-*` header, and the response is served from
  `cloudfront.net`.
- **A static S3 export is eliminated** — the security headers are `next.config.js`'s own
  `headers()` output, and the home page is `force-dynamic`. Both require a live Next server.
- That leaves **AWS Amplify**, whose hosting is CloudFront-fronted and auto-builds from `main`.
  Consistent with `next.config.js`'s own note, "Amplify injects none of these — verified against
  production on 2026-08-23".

**Deploys are already automatic, and fast.** PF1 merged at 05:33 UTC; by 05:47 production was
rejecting `w=3840`, which only post-PF1 code does. So `main` → production is live inside ~15
minutes with no `.github/` deploy workflow — Amplify's own build hook.

**What is actually left** is only the recording: state the host in `CLAUDE.md` and correct the three
docs that disagree. Small, COLD, no decision needed. The one residual the user may want to confirm
is Amplify specifically versus a hand-rolled Next server behind CloudFront; nothing on this board
depends on which.

## PF10 · Lower image quality to 65 — COLD, and NOT config-only

Split out of PF1, which could not do it. The 002 chapter's "set `quality` ~65" predates Next 16's
API and is impossible as a config change. Two facts, read from the installed source rather than
recalled:

- `next/image` sends **75** whenever no `quality` prop is given —
  `node_modules/next/dist/shared/lib/get-img-props.js:459`, `qualityInt || 75`.
- The optimizer **rejects rather than clamps** anything outside `images.qualities` —
  `node_modules/next/dist/server/image-optimizer.js:657`, HTTP 400. `imageConfigDefault.qualities`
  is `[75]`.

So `qualities: [65]` on its own **400s every image on the site**. The work is therefore
`qualities: [65]` in config *plus* `quality={65}` at the `next/image` call sites — a render-path
change with tests attached, which is why it is not PF1.

**Measured prize: 13.3%.** At `w=1920`, q65 is 258,556 bytes against q75's 298,282. Measured
2026-08-30 through the optimizer on a local dev server with `qualities: [65, 70, 75]` temporarily
allowed; q70 was 278,238 if a middle setting is preferred.

Call sites to thread the prop through (8 `sizes=` declarations as of 2026-08-31,
`grep -rn 'sizes=' app/ --include='*.tsx'`): `CollectionContentRenderer.tsx:412` and `:670`,
`Component.tsx:246`, `BoxRenderer.tsx:159-160`, `CoverCard.tsx:64`, `CollectionHeader.tsx:46`,
`LocationCollections.tsx:26`, `MediaPreview.tsx:106`. A single shared default would be better than
eight literals — scope that first.

## PF11 · Reconcile the Node version — COLD, one decision then one line

`package.json` `engines.node` is `>=20 <23`. The dev machine runs **25.3.0**. PF5's CI now pins
**22** — the top of the declared range — so CI tests a runtime nobody develops on, and development
happens on one the repo says it does not support.

Nothing is broken by this today (npm only warns without `engine-strict`), which is exactly why it
will sit. Either `engines` is stale and should widen to include 25, or the dev environment should
drop to 22. `tests/ci/ciWorkflow.test.ts` already asserts the CI pin satisfies `engines`, so the two
cannot silently diverge further — whichever way it is resolved, that test keeps them honest.

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

