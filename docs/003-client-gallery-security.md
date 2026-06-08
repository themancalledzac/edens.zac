# 003 · Client Gallery Security

> Deliver private client galleries behind a password gate, harden the auth + send flow, and smooth the download UX · one branch handoff (📘) + one gate-hardening plan (🟡) + one active send-flow plan (🟢).

This chapter merges the client-gallery security work: a password-gated `CLIENT_GALLERY` collection type, the cookie-based auth that replaced `sessionStorage`, the admin "Set Password & Send" flow, and the image/ZIP download UX. The [frontend handoff](superpowers/plans/003-client-gallery-handoff.md) is the branch-level record of what shipped (with a 10-item critical analysis of the seams); the [password plan](superpowers/plans/003-client-gallery-password.md) is the gate-hardening design; the [recipient-send plan](superpowers/plans/003-gallery-recipient-send.md) fixes the "everyone gets re-emailed on every save" noise.

> ✅ **RESOLVED (code-checked 2026-06-01):** the handoff (was 015) was correct — the **httpOnly cookie gate AND the admin password input both shipped** on `main`. `ClientGalleryGate` mounts only when there is no valid `gallery_access_<slug>` cookie; `app/lib/api/collections.ts` confirms the backend sets an `HttpOnly; Secure; SameSite=Strict` cookie on `/access` success (no `sessionStorage` in the auth path). `ManageClient.tsx:1434+` has the full "Gallery Access" section (password set/clear, recipient email, `isPasswordProtected`). The password plan's "still open" status was **stale** — corrected below. There is **no frontend `GALLERY_SECRET`** work: token signing is backend-owned (Spring `ClientGalleryAuthService`).
>
> **Real open security item:** the gallery password is stored/compared in **PLAINTEXT, not BCrypt** (`ManageClient.tsx:1464` admin field intentionally shows it for re-share; backend `ClientGalleryAuthService`). Decouple "admin can re-share" from "stored hashed." Backend-side fix.

## Remaining work (deduped)

The cookie gate + admin password input + basic recipient send already shipped (see RESOLVED above). What is genuinely left:

- **Fix plaintext password storage/comparison → BCrypt** (backend `ClientGalleryAuthService`). _Highest-value security item._
- **New-recipient-only send flow** — today `saveGalleryAccess` re-emails the whole saved list on every save; only email newly-added recipients (see [003-gallery-recipient-send](superpowers/plans/003-gallery-recipient-send.md)).
- **Proxy `Set-Cookie` regression test** — the `getSetCookie()` + per-cookie `append` forwarding is currently uncovered.
- **SSR cookie-timing hardening** — the `router.refresh()` race: on first SSR after unlock the cookie may not be in the jar yet. Works across browsers but isn't spec-guaranteed.
- **Email-disabled warning callout** — replace the easy-to-miss `"email-disabled"` status string with a visible warning callout.
- **Download-All UX** — replace `window.location.href` + a blind 4-second "Preparing ZIP…" timer with `<a download>` / `Blob` + real progress. _Partial: [PR #167](https://github.com/themancalledzac/edens.zac/pull/167) (`0165`, `2e27c8a`) now rejects an empty selection instead of firing an ambiguous ZIP request; the timer/progress rework remains._
- **Extract `<GalleryAccessSection>`** out of the 1200+-line `ManageClient.tsx` so the gallery-access tests stop mocking 5+ hooks (also tracked in [006 · cleanup](superpowers/plans/006-cleanup-and-refactor.md)).

_Shipped — dropped from the list: httpOnly cookie gate, admin password set/clear input, basic recipient send, `isPasswordProtected` plumbing, the cookie-replaces-`sessionStorage` migration._

## Sections

| Section                                                                                                   | Role      | Status |
| --------------------------------------------------------------------------------------------------------- | --------- | ------ |
| [Client Gallery Security & Downloads — Frontend Handoff](superpowers/plans/003-client-gallery-handoff.md) | reference | 📘     |
| [Client Gallery Password Logic](superpowers/plans/003-client-gallery-password.md)                         | plan      | 🟡     |
| [Gallery Access: New Recipient Send](superpowers/plans/003-gallery-recipient-send.md)                     | plan      | 🟢     |

## Blocked on / open

- **Longer-horizon identity** — per-user gallery accounts, magic-link invitations, per-user revoke, and CloudFront signed URLs all live in the ABAC vision ([009 · Access Control](superpowers/specs/009-abac-access-control.md), chapter 009), not this chapter. Today, password is shared (revoke = rotate + re-email everyone) and gallery image URLs remain public CloudFront URLs once copied.

---

_↑ [Back to the book](000-summary.md)._
