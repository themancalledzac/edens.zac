# 007 · Security Hardening

> Public-endpoint defense, admin-perimeter gaps, and origin protection · 🟢 active

The contact form shipped as the site's first real public API endpoint — DB-backed, rate-limited, with a private admin reader — and it set the template every future public endpoint inherits. What remains in this chapter is closing the admin perimeter (routes still reachable with no auth check), generalizing the contact-specific rate-limit config before a second public endpoint lands, and the biggest single posture lever: putting CloudFlare in front of the EC2 origin.

## Remaining work (deduped)

- **Add the unguarded admin routes to `proxy.ts`** (`all-collections` / `all-images` / `collection/manage/*`) — they have no admin-token check today. Highest priority ([007-proxy-route-gating](superpowers/plans/007-proxy-route-gating.md)).
- **Gate `/metadata` behind admin auth** — same class of fix; the route-gating groundwork shipped with [001](001-design-review.md) (admin gating already on `/all-collections` + `/all-images`).
- **Generalize the rate-limit config** — the `app.contact.rate-limit-*` props are contact-specific; refactor to a per-path map before adding a 2nd public endpoint.
- **CloudFlare Phase 2** — orange-cloud the EC2 origin, lock ports to CF ranges, trust `CF-Connecting-IP`, drop `X-Real-IP` injection. Biggest security-posture lever ([007-cloudflare-phase2](superpowers/plans/007-cloudflare-phase2.md)).
- **Housekeeping**: messages PII retention TTL; Comments page mark-as-read / delete / search; Dependabot's 7 frontend vulns (3 high / 3 moderate / 1 low); optional Discord/Slack notify channel as a second notification path.

> Note: the contact form itself **shipped** — [007-contact-messages](superpowers/plans/007-contact-messages.md) is the build record / reference, not open work.

## Sections

| Section                                                                            | Role                     | Status |
| ---------------------------------------------------------------------------------- | ------------------------ | ------ |
| [007 · Contact Messages](superpowers/plans/007-contact-messages.md)                | Build record / reference | 📘 ref |
| [007 · Admin Route Gating (proxy.ts)](superpowers/plans/007-proxy-route-gating.md) | Plan                     | 🟢     |
| [007 · CloudFlare Phase 2](superpowers/plans/007-cloudflare-phase2.md)             | Plan                     | 🟢     |

## Blocked on / open

- Dependabot's 7 frontend vulnerabilities are independent of this chapter's work — track via GitHub Security, fix opportunistically.

---

_↑ [Back to the book](000-summary.md)._
