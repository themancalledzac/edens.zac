# edens.zac — Forward Roadmap (post-2026-07-03 review)

Consolidated from the full-stack review (FE/BE code, mobile design, security, performance, docs, de-bloat). Items are grouped by theme and tagged **[S]**mall / **[M]**edium / **[L]**arge. "Part 01" items are being fixed on the 0195 branches now; everything here is what comes *after*.

## 1. Security (highest priority)
1. **Admin authZ — Phase 0** [M] — restore `role` on `AuthPrincipal`, gate `/api/admin/**` with `hasRole('ADMIN')`, repoint `/explore` off the admin metadata endpoint. **Ship first, own branch.** (See `admin-auth-path-forward.md`.) *Verified CRITICAL — unauthenticated admin access + account takeover.*
2. **Admin authZ — Phases 1-3** [M] — passkey/`mfaSatisfied` step-up for admin, reduced break-glass sessions, short admin session TTL + token rotation, `revokeAllForUser` on credential change, admin audit log, login failure ceiling.
3. **Proxy `x-real-ip` hardening** [S] — stop falling back to the client-controlled header.
4. **Security headers** [S] — CSP / HSTS / X-Frame-Options / Referrer-Policy via Next `headers()` or CloudFront.
5. **Pin image `remotePatterns`** [S] — replace `*.cloudfront.net` wildcard with the site distribution.
6. **Saves access-gate** [M] — if not fully landed in Part 01 (B4), finish: an authenticated user must not be able to save/read arbitrary image ids from gated galleries.

## 2. Performance (biggest wins ranked)
1. **BE: kill the parent-collection N+1** [M] — home/PARENT reads do ~5 queries per tile (referenced-collection + cover + cover-tags). Batch-load referenced collections and covers in `ContentModelConverter`. Largest single TTFB win; the homepage is the hottest path.
2. **BE: batch `UserPageAssembler`** [S] — swap the per-image `convertImageEntityToModel` for the existing `batchConvertImageEntitiesToModels` (already used correctly by saves). Fixes /user + logged-in home N+1.
3. **FE: short-circuit `meServer()`** [S] — return null without a backend round-trip when there's no `ezac_session` cookie (every anonymous view currently pays a proxy→Spring→Postgres hop to get a 401).
4. **FE: drop the server-side proxy double-hop** [M] — server fetches go Lambda→CloudFront→proxy-Lambda→Caddy→Spring; hit `API_URL` directly with `X-Internal-Secret` from server code.
5. **BE: response compression** [S] — `server.compression.enabled=true`; verify edge gzip/zstd.
6. **FE: narrow LCP priority** [S] — `priority`/`fetchPriority` is spread across the whole first row (2-3 competing high-priority preloads); scope to the single LCP leaf.
7. **FE: image quality/sizes** [S] — add `images.qualities`, tighten `deviceSizes`, fix mobile `sizes` (currently `100vw` even in 2-up rows → ~2× over-fetch).
8. **FE: stop fetching 500 blocks/page** [M] — request `contentPerPage`-sized page 0, lazy-load the rest; only ~30 blocks render initially but full models for 500 are serialized into the RSC payload.
9. **BE: list-DTO trim** [M] — tile/list contexts don't need per-image `collections[]`/EXIF/film arrays.
10. **HTTP caching + preconnect** [S] — `Cache-Control: public, max-age, stale-while-revalidate` on public reads; `<link rel=preconnect>` to CloudFront (GIF/MP4 bypass the optimizer).
11. **Measure first** [S] — add Server-Timing / request-duration logs to Spring + Postgres slow-query logging; record a prod Lighthouse baseline (the docs' "step 1" never happened). Verify the Next data cache actually persists on Amplify.
12. **Preload/prefetch** [M] — once reads are cacheable, add intent-based (`pointerdown`) tile prefetch; evaluate PPR / Cache Components for an instant static shell; wire the existing `collectionStorage` read-side for SPA-grade repeat navigation.

## 3. De-bloat / DRY (keep the app lean as it grows)
**Frontend:** delete dead `useCollectionData` hook + `core.ts` mutation family (`fetchPut/Patch/Post/FormDataApi`, 0 callers since 2025-09) + dead `content.ts`/`selects.ts` client twins; consolidate the 4th `throwFromResponse` copy into `core.ts` (Part 01); extract a `useOptimisticIdSet` hook shared by Saves/Follows/Selects contexts; delete orphaned SCSS (`Content`/`admin`/`forms` modules); replace the 6.3 MB `public/_DSC0145.jpg` + its ineffective preload with a CloudFront/optimized asset; decide `/user/selects` (fold in or delete); remove the `next.config.js` no-op webpack override; wire `knip`/`ts-prune` into CI (tests keep dead exports warm).
**Backend:** delete ~39 dead DAO methods (hand-written SQL, no compiler to flag them); resolve the write-only **rating-override vertical** (6 files + V34 migration, no reader — confirm in-flight or delete); delete MySQL/RDS-era scripts (`migrate-from-rds.sh`, `mysql-init.sql`, `backup-database.sh`, `restore-database.sh`); remove unused `thymeleaf` dep; delete dead `/{slug}/meta` + `GET /content/people` endpoints; make `createChildCollection` delegate to `createCollection`; add a `CollectionModel.syntheticParent(...)` factory (triplicated) + `CollectionVisibility.visibleScope(bool)` (Part 01); introduce a `@CurrentUser` argument resolver to kill the 10 duplicated `principal == null → 401` checks; refresh stale `testRequests/` + `todo/TODO.md`.
**Guardrails:** delete-the-query-when-you-replace-it (BE); second-copy-triggers-extraction for `lib/api` (FE); new endpoint requires a named FE caller in the same PR; era-exit checklist (sweep `scripts/`/`testRequests/`/pom repos when infra moves); asset budget for `public/` (>200 KB → CloudFront).

## 4. Documentation (Part 02 — see docs branches)
- FE: rewrite README (Next 16/React 19, prominence-not-penalty, real routes, fix broken screenshot links); reconcile the `docs/000-summary` index (froze 2026-06-10; ~9 plans + 5 specs shipped un-archived); rewrite `ai_api.md` + `ai_main.md` (Postgres not MySQL, `/api/admin` not `/api/write`, real `ContentType`/`CollectionType`, add the auth/BFF layer); dedupe run/verify commands (3 copies); document the personal layer + tag-views + send-message; re-enable the archive-on-ship discipline.
- BE (public repo): rewrite README (endpoint table ~50% wrong, env-var names wrong, "V1-V5"→V40); fix the DB story (Postgres-in-Docker on EC2 via SSH tunnel — now also documented by `db-tunnel.sh`); document the auth foundation (currently nowhere public); **scrub** `ai_ec2.md` + terraform real AWS identifiers out of the public repo; cull MySQL-era scripts.
- Cross-repo: align FE `ai_api.md` ↔ BE contract; the FE "missing backend endpoints" list is mostly wrong (search/locations/lenses/ZIP shipped) — only `POST /collections/{id}/auto-tag` is genuinely absent.

## 5. Features / product (parked ideas worth revisiting)
- Public `/search` route (backend `searchImages()` is already live and consumed by tag/location pages — only the route UI is unbuilt; the doc "blocked on backend" is stale).
- `STAGING` collection state (planned, unshipped).
- Mobile-first admin Phase 3.
- WFC/mosaic display mode (spike parked).
- GIF poster frames via the unused `thumbnailUrl`.
- Auto-tagging (`POST /collections/{id}/auto-tag`) — the one genuinely-missing backend endpoint the FE roadmap references.

## 6. Ops / tooling
- `db-tunnel.sh` / `dbLogin` shipped (this pass) — local DB browsing without opening 5432.
- Right-size the EC2/JVM after measuring (Postgres + Spring share one burstable box; `-Xmx384m`).
- Consider CloudFront in front of the API for edge caching once public reads are cacheable.
