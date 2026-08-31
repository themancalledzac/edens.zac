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
