# 007 · Security Hardening

> Public-endpoint defense, admin-perimeter gaps, and origin protection · 🟢 active

The contact form shipped as the site's first real public API endpoint — DB-backed, rate-limited, with a private admin reader — and it set the template every future public endpoint inherits. What remains in this chapter is closing the admin perimeter, generalizing the contact-specific rate-limit config before a second public endpoint lands, and the biggest single posture lever: putting CloudFlare in front of the EC2 origin.

> ⚠️ **Stale framing — `proxy.ts` no longer exists.** The [007-proxy-route-gating](superpowers/plans/007-proxy-route-gating.md) plan is written against an `app/utils/proxy.ts` middleware helper that has since been **deleted**, and there is **no `middleware.ts`** in the repo — none of that gating logic runs. Today the real perimeter is (a) the **BFF `INTERNAL_API_SECRET` channel gate** in `app/api/proxy/[...path]/route.ts` (the backend only accepts requests carrying the secret the proxy injects) plus its Origin allowlist on writes, and (b) admin-route gating **centralized in `app/(admin)/layout.tsx`**. Re-scope the plan to that reality before acting on it.

## Remaining work (deduped)

- **Re-verify admin-route gating against `app/(admin)/layout.tsx`** (not the deleted `proxy.ts`). Confirm every admin route (`all-collections` / `all-images` / `collection/manage/*` / `metadata` / `comments`) is gated there, and decide whether a `middleware.ts` perimeter is still wanted on top of the BFF secret ([007-proxy-route-gating](superpowers/plans/007-proxy-route-gating.md) — needs re-scoping).
- **Generalize the rate-limit config** — the `app.contact.rate-limit-*` props are contact-specific; refactor to a per-path map before adding a 2nd public endpoint.
- **CloudFlare Phase 2** — orange-cloud the EC2 origin, lock ports to CF ranges, trust `CF-Connecting-IP`, drop `X-Real-IP` injection. Biggest security-posture lever ([007-cloudflare-phase2](superpowers/plans/007-cloudflare-phase2.md)).
- **Housekeeping**: messages PII retention TTL; Comments page mark-as-read / delete / search; Dependabot's 7 frontend vulns (3 high / 3 moderate / 1 low); optional Discord/Slack notify channel as a second notification path.

> Note: the contact form itself **shipped** — [007-contact-messages](superpowers/plans/007-contact-messages.md) is the build record / reference, not open work.

## Sections

| Section                                                                 | Role                                       | Status |
| ----------------------------------------------------------------------- | ------------------------------------------ | ------ |
| [007 · Contact Messages](superpowers/plans/007-contact-messages.md)     | Build record / reference                   | 📘 ref |
| [007 · Admin Route Gating](superpowers/plans/007-proxy-route-gating.md) | Plan (needs re-scope — `proxy.ts` deleted) | 🟡     |
| [007 · CloudFlare Phase 2](superpowers/plans/007-cloudflare-phase2.md)  | Plan                                       | 🟢     |

## Blocked on / open

- Dependabot's 7 frontend vulnerabilities are independent of this chapter's work — track via GitHub Security, fix opportunistically.

---

_↑ [Back to the book](000-summary.md)._
