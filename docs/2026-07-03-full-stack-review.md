# Full-Stack Critical Review — 2026-07-03

Scope: a full critical review of both repos (`edens.zac` frontend, `edens.zac.backend` backend) covering the current `0195` branches, the `/user` redesign (mobile-first design review), auth/security, performance, documentation, and de-bloat/DRY. Run as parallel review agents, each finding adversarially verified against the code before any action.

This report is the index. Companion docs:

- [Admin Auth — Path Forward](2026-07-03-admin-auth-path-forward.md) — the security plan for the CRITICAL below.
- [Forward Roadmap](2026-07-03-forward-roadmap.md) — perf, de-bloat, features, ops, sequenced.
- `edens.zac.backend/SECURITY-EXPOSURE.md` — the public-repo Terraform-identifier exposure inventory.

---

## Headline

- **One verified CRITICAL** (pre-existing, not `0195`): `/api/admin/**` has no per-user authorization and the BFF proxy attaches the internal secret to every request → an anonymous client can read admin PII and chain invite→accept into account takeover. **Delivered as a plan, not a blind fix** — the root cause is that `users.role` was *deliberately* dropped (V37) before its replacement existed; closing it is a design decision + a migration that can't be verified without the (locally-unavailable) integration suite. See the admin-auth doc.
- **The April X-Forwarded-For rate-limit finding is FIXED** — verified: the proxy strips inbound `x-forwarded-for`/`cf-connecting-ip` and re-injects a sanitized `X-Real-IP` that `RateLimitFilter` keys on.
- **Part 01 shipped** (the "current MR" fixes) to PR #201 (FE) and PR #111 (BE), verified.
- **`dbLogin` shipped** — `scripts/db-tunnel.sh` + zsh wrappers; opens the SSH tunnel to the EC2 Postgres and (unlike the old `db_tunnel` alias) fixes the security-group IP rule first.
- **Docs overhauled** in both repos (this branch + the BE docs branch): stale READMEs/api/architecture docs rewritten to match code, DB-story contradictions resolved, the auth foundation documented, MySQL-era cruft culled, public-repo exposure flagged.

---

## Part 01 — shipped on the 0195 branches (verified)

### Frontend (PR #201, `0195-save-as-collection`)
| Fix | What |
|---|---|
| Single-fetch | `/user` derived saved ids from the saved-images response instead of a second `/user/saves` read (honors the single-fetch rule). |
| Heart desync | Hoisted **one** `MeProvider` + `SavesProvider` around all sections (was one per grid); `PersonalContentGrid` reverted to a Server Component. |
| Anon Follow | `LocationPage` mounts `FollowsProvider` only for logged-in viewers — anonymous visitors no longer get a Follow button that 401s. |
| Mobile design | `.sections` width matches the BoxTree row math (full-bleed mobile); `srOnly` h1 + `<h2>` section titles; `100dvh`; ≥40px tap targets + focus rings; message-modal width; `aria-controls` target always rendered (children still lazy). |
| Dead code | Removed the unreachable `SendMessageContext` plumbing (the button itself stays). |
| Race fix | `Saves`/`Follows` toggle reads membership from a ref → rapid double-clicks stay consistent (regression test proven by reverting). |
| Error surfacing | `saveTagAsCollection` throws on a null (204) result instead of silently no-oping; `personal.ts` logs via `logger`. |

Verified: `tsc` clean, full jest suite **2440** green, lint/format clean.

### Backend (PR #111, `0195-save-as-collection-be`)
| Fix | What |
|---|---|
| B1 | Tag-view image **ordering** restored (the shared `findImagesByIds` IN-query is unordered; the resolver now re-keys by id and re-streams in order). |
| B2 | `@NotNull`/`@Valid` on the new request records; nonexistent id → **404** (was a 409 FK violation). |
| B3 | **V41** unique index on `collection.slug` — guards the double-submit tag-convert race (matches V8's unique slug indexes). |
| B4 | **Saves access-gate** — closes an authenticated cross-tenant image disclosure: `add()` and the saved-images read now require the image to be visible to the caller (LISTED or explicit `user_collection` grant). *Two flagged defaults below.* |
| B5 | Tag→collection promote defaults to LISTED+UNLISTED (excludes HIDDEN, skips password-gated); `includeHidden` opt-in. |
| B6 | `CollectionVisibility.visibleScope(isLocal)` extracted (was triplicated). |
| B7 | Camera-upsert tests, anon-DELETE 401 tests, two-user isolation test. |

Verified: unit tests pass, spotless + checkstyle clean, `test-compile` clean. **Integration tests are Testcontainers/CI-gated** — Docker is unavailable in the review environment, so the V41 apply, the HIDDEN-exclusion, and the saves-visibility/isolation cases were written and compile but must go green in CI before merge.

**Two B4 policy defaults — please confirm (secure defaults applied):**
1. UNLISTED-only images are **not** saveable (LISTED or explicit grant only).
2. **No admin bypass** (there's no role on `AuthPrincipal` yet — tied to the admin-auth work).

---

## Security

The full findings and phased plan are in the [admin-auth path-forward doc](2026-07-03-admin-auth-path-forward.md). Summary of severities:

- **CRITICAL** — unauthenticated admin access + account takeover (plan delivered).
- **HIGH** — B4 saves cross-tenant disclosure (**fixed** in Part 01).
- **MEDIUM** — break-glass sessions can enroll passkeys (no `mfaSatisfied` gate); no revoke-all on credential change; long admin session lifetimes. → admin-auth Phases 1–2.
- **LOW** — proxy `x-real-ip` fallback; `next.config` `*.cloudfront.net` wildcard; no committed security headers. → roadmap / ship with the security branch.
- **FIXED** — X-Forwarded-For rate-limit keying.
- **WAF/API-Gateway** — not warranted at this scale; the gap is app-layer authorization, which a WAF does not fix.
- **Public-repo exposure** — code/secrets are clean (`${ENV}` placeholders, `ProdSecretGuard` fails startup on a default prod secret); the one item is real AWS resource identifiers already committed in `terraform/*.tf` (burned in history) — see `SECURITY-EXPOSURE.md`.

## Performance

Full ranked recommendations in the [roadmap](2026-07-03-forward-roadmap.md#2-performance-biggest-wins-ranked). The load-time story: every route is `force-dynamic` (deliberate, an Amplify constraint), so TTFB dominates and is driven by (1) a per-tile N+1 on parent/home collection reads, (2) an unconditional `meServer()` backend hop on every anonymous view, (3) a server-side double-hop through the app's own proxy domain, and (4) fat RSC payloads (500 full image models serialized when ~30 render). None of the client JS is heavy. The highest-leverage fixes are backend query-batching + the `meServer` short-circuit + compression; the slow-connection wins are payload trimming, image `qualities`/`sizes`, narrowed LCP priority, and CloudFront preconnect. Preload/prefetch options are catalogued in the roadmap. Note: no prod Lighthouse/Server-Timing baseline exists yet — measure before/while acting.

## De-bloat / DRY

Both codebases are fundamentally disciplined; the rot is concentrated. Full list in the [roadmap](2026-07-03-forward-roadmap.md#3-de-bloat--dry-keep-the-app-lean-as-it-grows). Highlights: FE — a `throwFromResponse` helper copied to 4 places (partly consolidated), dead `useCollectionData` + `core.ts` mutation family kept alive only by tests, a 6.3 MB raw photo in `public/` with an ineffective preload; BE — ~39 dead DAO methods, a write-only rating-override vertical with no reader, MySQL-era scripts (culled in this docs pass), an unused `thymeleaf` dep. Guardrails proposed per repo.

## Documentation (this pass)

Rewritten to match code and to make the two repos agree:

- **FE:** README (versions, routes, collection types, directional-prominence, removed 4 broken screenshot links), `ai_api.md` + `ai_main.md` (real endpoints/BFF/auth, Postgres not MySQL), `ai_quick_reference.md`, `CLAUDE.md` (de-duped commands), `docs/000-summary` + `previous-work.md` reconciled, chapter status fixes (004/005/007/009).
- **BE:** README (endpoint families, env vars, V41, DB story), `.env.example`, `.claude/{CLAUDE,api-patterns,architecture,database}.md`, sanitized `ai_ec2.md`, slimmed the false `.cursor` rules; **created `.claude/auth.md`** (auth foundation) + `SECURITY-EXPOSURE.md`; **deleted** 7 dead files.

### Cross-repo alignment — remaining discrepancy to reconcile
`ContentType`: the frontend union includes **`PANEL`** (shipped FE-side in #197), but the backend enum serves only `IMAGE/TEXT/GIF/COLLECTION`. Either PANEL is a FE-only rendering construct (document it as such) or the backend needs to emit it — worth a decision.

## Local DB access (`dbLogin`)

`scripts/db-tunnel.sh` (public-safe, env-driven) + `dbLogin`/`dbLogout`/`dbInfo`/`dbPsql` in `~/.zshrc`. `dbLogin` ensures the EC2 security group allows SSH from your current IP, opens an idempotent `localhost:5432` tunnel, and prints psql/JDBC/GUI connection info — so Postman/TablePlus/psql "just work" without the AWS-account friction the old alias hit on IP changes.

## Future goals

See the [Forward Roadmap](2026-07-03-forward-roadmap.md): security (admin authZ first), performance (the ranked list), de-bloat, docs, parked product ideas (public `/search` route, `STAGING` state, auto-tagging), and ops.
