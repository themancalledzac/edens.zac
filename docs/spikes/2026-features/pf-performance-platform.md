# PF — Performance & platform

_Context file for board items PF1–PF9 on [2026-features.md](../2026-features.md). The LCP history:
the dominant issue (hero not in server HTML) closed via PR #161's server-side layout seeding; the
rest of the 002 chapter is this group._

## PF1 · Image bytes — DONE, PR #358

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

## PF4 · Restore ISR on the home page

`app/page.tsx:22` is `export const dynamic = 'force-dynamic'`; the restore recipe sits in the
`@todo` at `:19-20`. Blocked on the backend `blocks_per_page` schema fix — every visitor currently
pays a live Spring fetch on the hottest page. When picking this up, first check the backend
board/HEAD for the fix's status rather than trusting this row.

## PF5 · Frontend CI

No `.github/workflows` directory exists (verified). Every `tsc --noEmit` / `jest` / `eslint` claim
in this repo's history is local-only. One GitHub Actions workflow running the standard
verification on PRs. From the 2026-07-25 open-PR review's one durable finding. Est: 1 sitting.
Watch: `npm ci` needs the repo's Node version pinned; check `package.json` engines and mirror the
local toolchain.

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

## PF9 · Pin the deploy target

Three docs name three different production hosts (Amplify, S3+CloudFront, Vercel); the repo has no
`amplify.yml`, no `.github/`, no deploy script. One answer from the user (decision #9), then:
record it in `CLAUDE.md`, and unblock the "verify AVIF/WebP actually served" half of the image
work. This blocked 002's verification item for a month.

## Audit debt (no rows yet — re-derive before working)

From `006-frontend-audit.md`'s retained-unique findings, verified still true: no runtime schema
validation at the API boundary (no zod); `"exactOptionalPropertyTypes": false` at
`tsconfig.json:10`; the per-file a11y inventory (`<div onClick>`, `outline:none`,
unlinked labels, `window.confirm`) is untriaged AND its file paths are stale
(`ManageClient.tsx` deleted, `ImageMetadataModal` renamed). If picked up, re-derive the inventory
against current paths first — the findings may be live, the line numbers are not.

## Closed

_Nothing yet._
