# 2026 Feature Board — session log archive

_Oldest first. The live tracker keeps only the newest two entries; older ones move here in the
same close-out that adds them._

- 2026-08-30 — board created from the three-agent sweep (specs ×22, plans ×38, numbered docs +
  handoffs + backend board), reconciled against code and git. Headline corrections: `/search` is
  NOT backend-blocked (all endpoints live in `ContentControllerProd.java`; four docs wrong);
  gallery-password BCrypt is PARKED behind a design pass (two docs wrong); Breadcrumb and the
  shared IntersectionObserver are shipped, not pending. 42 rows filed across 8 groups; 10 user
  decisions batched. Next: SD1 (`/search`), PF5 (CI), PF1 (image bytes) — with the decision batch
  asked first.

- 2026-08-31 — shipped **SD1 (#357)**, **PF5 (#356)**, **PF1 (#358)**; all merged and live in
  production. Filed **PF10** (image quality — split out of PF1, which could not do it), **PF11**
  (Node version drift) and **PF12** (gate the auto-deploy on CI). **Decision #9 answered by one
  `curl`**: production is CloudFront-fronted AWS running a live Next server, auto-deploying from
  `main` in ~15 minutes — Vercel and static-S3 eliminated. That also closed the 002 chapter's
  month-old "verify the host serves WebP" item (it does). **MA1 re-classified COLD → BLOCKED**: its
  stated prerequisite, backend `PATCH /collections/{id}`, does not exist on the backend's
  `origin/main`. **PF4 re-classified BLOCKED → COLD**: `blocks_per_page` is gone from backend
  `origin/main`. PF5 invalidated PF9's "no `.github/`" premise in the same run. Next: PF9, PF4, SD3.

- 2026-08-31 — shipped **PF4 (#360)**, **PF10 (#361)**, **PF3 (#362)**; also closed refactor-board
  **G6 (#351)** and opened-then-closed **#363**. **PF4 closed as VOID**: its backend blocker really
  had cleared (asked production, not source), but the `@todo`'s recipe fails `next build` on
  `headers()`, and its premise measured false — 8 renders, 1 backend fetch, with `force-dynamic`
  present, because `getCollectionBySlug`'s explicit `next: { revalidate, tags }` beats the
  `force-no-store` default the flag implies. Real question refiled as **PF13**. **PF10** shipped
  `qualities: [65]` + `quality={IMAGE.quality}` at eight sites for a measured 12.9% at w=1920; the
  row's "8 `sizes=` call sites" was the wrong work list (two were the BoxTree dimensions map, and
  it missed five real render sites — same count, different set). **PF3** narrowed `priority` to one
  LCP candidate, scoped `will-change` to elements actually animating (3 CSS rules → 1), and added a
  CloudFront `preconnect`: home went 2 eager / 2 preloads / 0 preconnect → 1 / 1 / 1. Filed
  **PF11** from decision #11 and **PF13** from PF4's closure. **#363 was closed on the user's
  call**: a docblock-length rule scoped to one repo belongs in `~/.claude/CLAUDE.md`, where the
  inline-comment ban it completes already lives — moved there instead. Next: PF9, PF11, PF8.

- 2026-08-31 (3) — shipped **PF9 (#365)**, **PF11 (#366)**, **PF8 (#367)**; PF group is now 5
  shipped. **Decision #9 fully closed**: the user confirmed AWS Amplify Hosting, recorded in
  `CLAUDE.md`. **PF9's own premise was half wrong** — two docs named two hosts, not three; the
  Vercel naming is six test `describe` strings, filed on the refactor board as **G7**. **PF11
  diverged from its recorded shape with cause**: `">=20"` would have named a runtime that reached
  EOL on 2026-04-30, and Next 16.3.1 already floors at `>=20.9.0`, so the floor is `">=22"` with
  `.nvmrc` at `24`. **PF8 was the estimate lesson** — three "smalls" landed +455/−108 across 14
  files, and splitting two pages around Suspense boundaries broke two test suites for purely
  structural reasons. Two follow-ups filed on the refactor board: **C12** (`.metadataToggle` has
  SaveHeart's old 36/40 tap-target gap) and **C13** (a "Zac Eden" byline where three other routes
  say "Zac Edens"). **Two items were found rotted by re-running their numbers, both far from
  anything that merged**: LY2's collapse-state heights had moved to different states entirely (the
  row named the one state that is now fine), and PF6's `// Future: reportToService()` seam does not
  exist. Both corrected; the lesson is hoisted into "How to use this doc". **EM5 re-specified** —
  the backend exposes no email-enabled flag, so it is a post-send callout on
  `reason === 'email-disabled'`. Next: ask decision #7, then EM5, PF13, SD3.
