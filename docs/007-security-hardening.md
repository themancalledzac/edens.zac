# 007 · Security Hardening

> Public-endpoint defense, admin-perimeter gaps, and origin protection · 🟢 active

The contact form shipped as the site's first real public API endpoint — DB-backed, rate-limited, with a private admin reader — and it set the template every future public endpoint inherits. The admin perimeter is now closed (0203: the anonymous `/api/admin/**` hole + the unguarded proxy routes + `/metadata`), and the one page that sweep over-gated (`/explore`) is public again as of 2026-07-06. What remains in this chapter is generalizing the contact-specific rate-limit config before a second public endpoint lands, and the biggest single posture lever: putting CloudFlare in front of the EC2 origin.

## Remaining work (deduped)

- ✅ **Anonymous admin-API authorization hole — CLOSED (2026-07-04, 0203 cycle).** `/api/admin/**` was `permitAll` in every profile (prod's only gate was the transport-level `InternalSecretFilter`), so an anonymous request through the BFF reached admin PII reads and the invite→accept account-takeover chain. Now gated by `hasRole('ADMIN')` behind the `app.admin.enforce-authz` toggle, inside the `InternalSecretFilter` perimeter (two-layer prod defense). Details: [2026-07-04-0203-admin-authz-implementation](superpowers/plans/2026-07-04-0203-admin-authz-implementation.md).
- ✅ **Unguarded admin routes added to `proxy.ts`** (`all-collections` / `all-images` / `collection/manage/*`) — resolved by 0203 F4, alongside the metadata gate below. Plan [007-proxy-route-gating](superpowers/plans/007-proxy-route-gating.md) archived as superseded.
- ✅ **`/metadata` gated behind admin auth** — resolved by 0203 F4, same matcher sweep as above.
- ✅ **`/explore` login-walled in prod (regression) — FIXED (2026-07-06).** `/explore` was built deliberately public (`f9cd9c1`, chapter 001) but got swept into the `ezac_session` matcher by 0203 F4 (`9df92d8`). Fixed by removing `/explore` from the `proxy.ts` matcher + runtime check (with a do-not-re-add comment), un-gating the MenuDropdown Explore item so logged-out visitors can find the page, and deleting the dead `/collection/:slug/edit` matcher entry (no such route exists — editing is `/[slug]?manage=1`) flagged by the 0203 review. Pinned by tests: `tests/proxy.test.ts` (anonymous prod passthrough + `config.matcher` assertions) and `tests/components/MenuDropdown.test.tsx` (Explore visible logged-out).
- ✅ **0204 impersonation removal — MERGED (2026-07-06).** [#204](https://github.com/themancalledzac/edens.zac/pull/204) on the frontend, BE #114 the same day. Admin=root-view model replaces the dev-only "log in as" flow via `/admin/users/[id]`; see [008](008-collection-admin.md) for the full detail.
- ✅ **Frontend dependency vulnerabilities — CLEARED (2026-08-18).** All 27 Dependabot alerts resolved by `npm audit fix` in [#254](https://github.com/themancalledzac/edens.zac/pull/254): `next` 16.2.7 → 16.3.1, `sharp` 0.34.5 → 0.35.3, plus postcss, nanoid, immutable, fast-uri, js-yaml, brace-expansion, form-data, `@babel/core` and ws. Only the lockfile changed; `npm audit` now reports 0.
- ✅ **Frontend security items D1–D9 — CLOSED (2026-08-23/24).** The 2026 summer refactor board's Group D, nine MRs: `POST /api/revalidate` and `clearCacheAction` were anonymously invokable cache purges and are now gated on an `ezac_session` cookie and an admin principal; the Origin allowlist moved into `app/utils/originAllowlist.ts` and covers both; the image optimizer is pinned to the one production CloudFront distribution instead of `*.cloudfront.net`; the proxy forwards only `api/**`, closing a path that reached Spring's actuator pre-authenticated as the BFF. Per-item detail in [previous-work.md](previous-work.md#2026-08-summer-refactor-board-254293).
- **Generalize the rate-limit config** — the `app.contact.rate-limit-*` props are contact-specific; refactor to a per-path map before adding a 2nd public endpoint.
- **CloudFlare Phase 2** — orange-cloud the EC2 origin, lock ports to CF ranges, trust `CF-Connecting-IP`, drop `X-Real-IP` injection. Biggest security-posture lever ([007-cloudflare-phase2](superpowers/plans/007-cloudflare-phase2.md)).
- **Housekeeping**: messages PII retention TTL; Comments page mark-as-read / delete / search; optional Discord/Slack notify channel as a second notification path.

> Note: the contact form itself **shipped** — [007-contact-messages](superpowers/plans/007-contact-messages.md) is the build record / reference, not open work.

## Sections

| Section                                                                | Role                     | Status |
| ---------------------------------------------------------------------- | ------------------------ | ------ |
| [007 · Contact Messages](superpowers/plans/007-contact-messages.md)    | Build record / reference | 📘 ref |
| [007 · CloudFlare Phase 2](superpowers/plans/007-cloudflare-phase2.md) | Plan                     | 🟢     |

## Blocked on / open

- None. The frontend dependency alerts that used to sit here are cleared (#254); keep tracking new ones via GitHub Security and fix them opportunistically, the way #254 did.

## Decisions

- **AWS API Gateway / WAF in front of the public Spring endpoint — not warranted (2026-07-04).** Settled during the 0203 admin-authz cycle: the real risk was missing app-layer authorization (the anonymous `/api/admin/**` hole, now closed via `hasRole('ADMIN')` + `app.admin.enforce-authz` behind the `InternalSecretFilter` perimeter), which a WAF/API Gateway would not have caught. A WAF filters malformed traffic; it does not know the app's authZ model. CloudFlare Phase 2 stays the right origin-protection tool (DDoS / rate-limit / real-IP) but is a separate concern. Detail: [2026-07-04-0203-admin-authz-implementation](superpowers/plans/2026-07-04-0203-admin-authz-implementation.md).

---

_↑ [Back to the book](000-summary.md)._
