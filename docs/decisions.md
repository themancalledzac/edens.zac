# Decisions

Dated one-liners: answered decisions, parked and rejected items. Open work is in `docs/backlog.md`. Shipped work is in git; git history and PR bodies are the changelog.

## Process and records

- 2026-10-17: The refactor and feature boards ran #254 to #437 and were deleted; open rows moved to `docs/backlog.md`, answers to this file.
- 2026-10-17: Git history and PR bodies are the changelog; no hand-kept changelog, no session logs.
- 2026-10-17: The review round of 2026-10-17 is tracked in `docs/reviews/2026-10-17/04-orch-plan.md`.
- 2026-10-18: CI's audit runs on production dependencies only, `npm audit --omit=dev --audit-level=high` (PR #441), because `braces` has no fixed version.

## Answered, feature board

- 2026-08-31: Dark mode is a site-wide user preference, later (filed as PF14); admin gets no separate dark wiring, and MA3's remaining surfaces build on a light surface.
- 2026-09-02: Lone last row: neither a FILLER atom nor a change to the solo-hero rule; `padRowToWidth` already appends a BLANK spacer to an under-filled trailing row (LY1 closed as a correction).
- 2026-08-31: Panel width versus page height: keep the shared width, the height cost stands (LY2 closed).
- 2026-08-31: Error tracking is CloudWatch, not Sentry; server stdout reaches CloudWatch through Amplify with a `logger.ts` formatting change, client errors post to `/api/client-errors` (PF6, #391); `NODE_OPTIONS=--enable-source-maps` is set in the Amplify console.
- 2026-08-31: `engines.node` is an unbounded floor, a `.nvmrc` names the blessed version, CI reads that file (PF11).
- 2026-08-31: Production host is AWS Amplify Hosting, auto-deployed from `main` (PF9, #365).
- 2026-08-31: Cache Components: adopt app-wide, full speed; step 1 (`Footer`'s `new Date()`) shipped as #375, the flag flip and per-route conversion remain as PF13.
- 2026-09-06: The canonical host is the apex; `www` 301s to it; canonical tag, `og:url` and sitemap use apex URLs, the redirect stays with PF7.
- 2026-08-31: Amplify already ships server stdout to a CloudWatch log group, so server logging needed no AWS SDK or credentials.
- 2026-08-31: PF2 blur placeholders dropped by the owner.

## Answered 2026-09-08

- F4: merge `TaxonomyPage` into `LocationPageClient`; tag pages take filters, the collections strip, the header cover and follow seeding.
- H1: `/user` shows one list of all associations plus a `following` filter, no tile marker, count is the union (shipped #418).
- H7: passkey management on `/admin/users/[id]` is yes, and builds as AU2's admin half.
- G8: extend the CSS-module class guard repo-wide (shipped #415).

## Answered 2026-08-30 and 2026-09-06

- 2026-08-30: G5 closed with no frontend code; the backend blessed bare arrays in its own rules.
- 2026-08-30: C9 was a backend defect, not a rendering decision.
- 2026-08-30: E6's last bullet folded into F1.
- 2026-09-06: G3 delete `/user/selects` (shipped #411).
- 2026-09-06: G2b is split by tree, `app/` first, then `tests/`; the lint rule flips to `error` only after both.
- 2026-09-06: E9 builds the shared `.srOnly` partial, with `.skipLink` folded in (shipped #410).
- 2026-08-22: G2 the inline-comment rule is kept and enforced; why-comments belong in the docblock of the function they explain, and an over-large docblock means split the function. Do not propose relaxing it again.

## Parked or rejected

- E7: a shared hook for the edit-grid handoff was rejected (9 to 11 parameters); the waste was fixed in #337.
- F3: moving the invite functions was costed and rejected (worse boundary); do not reopen the 3-function version.
- LY1: the FILLER atom was declined; the gap-box behaviour already ships.
- H2b: a durable layout for labelled metadata sections is a design review, not a row.
- H4: one email strategy is design plus ops, not one project; SES is wired and switched off (see EM1).
- H5: the `MenuDropdown` design review has no row; it feeds decision #10.
- H6: composable page components and drag-to-resize is vision, not scheduled.
- AU, deferred by design: ABAC Phase A (admin MFA, admin-from-anywhere; `mfa_satisfied` has no frontend consumer) and Phase T (client tagging and moderation, the write path behind MA6) are vision, not approved; the old ABAC spec is stale; the backend per-user rating-override stack should be deleted when someone is in that area, and the frontend half was removed deliberately and must not be restored.
- LY parked ideas: mobile text overlay, the WFC mosaic, the obsolete Pattern Tree; property-based layout tests are debt, not a feature row.
- Unapproved ideas, not rows: liked images, mobile text overlay, React 19 follow-ups.
- WAF or API Gateway in front of the public Spring endpoint: not warranted (2026-07-04). The real risk was missing app-layer authorization on `/api/admin/**`, now closed by `hasRole('ADMIN')`; a WAF does not know the app's authorization model. CloudFlare Phase 2 (PF7) remains the origin-protection tool, as a separate concern.
