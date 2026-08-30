# PF — Performance & platform

_Context file for board items PF1–PF9 on [2026-features.md](../2026-features.md). The LCP history:
the dominant issue (hero not in server HTML) closed via PR #161's server-side layout seeding; the
rest of the 002 chapter is this group._

## PF1 · Image bytes (config-only)

`next.config.js` has no `quality`, `deviceSizes`, or `imageSizes` keys — verified 2026-08-30, only
`remotePatterns` is configured. Set explicit `quality` (~65 per the 002 chapter) and tighten the
size arrays to the widths the layout actually requests. Note the 002 chapter's step 1 (a prod
Lighthouse + view-source baseline) was never taken — take it in the same MR so the win is
measured, not asserted. Verification of served formats is PF9-gated (need to know the host).

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
