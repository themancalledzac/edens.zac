# EM — Email & client galleries

_Context file for board items EM1–EM5 on [2026-features.md](../2026-features.md)._

## EM1 · SES production checklist (ops)

The 2026-07-06 SES spec's §1 is now factually wrong (it asserts invite email does not exist;
`EmailService.sendInviteEmail` + `AdminUserController.sendInviteEmailAfterCommit` with a
`TransactionSynchronization` afterCommit hook shipped 2026-07-26, commit `352dafb`). What remains
is the entire §3 console checklist, all still open:

1. Domain identity verification in us-west-2
2. Sandbox smoke test
3. Custom MAIL FROM + SPF
4. DMARC
5. Configuration set + SNS for bounce/complaint handling
6. Sandbox exit request
7. Flip `EMAIL_ENABLED` on EC2 (defaults false — this is the actual switch)

The user drives the AWS console; a session preps exact console steps and verifies each. This is
refactor-board H4's operational half. The open product question there — is self-serve reset in
scope, or is admin-issued invite regeneration permanent? — is answered by AU1 being on this board:
reset is in scope.

## EM2 · New-recipient-only gallery send flow

Saving the gallery access form re-emails the password to every address in the box. Plan
(`docs/superpowers/plans/003-gallery-recipient-send.md`, gitignored): a read-only
existing-recipients list plus a separate add-one-recipient input and button, so only the new
address is mailed. Verified 2026-08-30: `InfoTab.tsx` has no recipient field at all —
`recipientEmails` exists only in `app/types/Collection.ts` and `useCollectionEdit.tsx` — so this
is a UI addition, not a modification. **Collision warning:** MA1 deletes `InfoTab.tsx`; if both
are scheduled, sequence deliberately or build EM2 against MA1's rail.

## EM3 · Contact-owner notification + `user_invite.created_by`

Two small backend items from the SES spec, both still unbuilt: C7 — notify the owner when a
contact-form message arrives (today messages sit unnoticed until the admin panel is opened; MA4's
Discord/Slack channel is the richer alternative — pick one, don't build both); C3 — record who
issued each invite. File on the backend board when picked up.

## EM4 · Gallery-password design pass — user decision, parks BCrypt

The backend board formally PARKED the BCrypt fix on 2026-08-24: "Do not act on this yet." The
design pass must answer what gallery passwords should DO, reconciling: admin re-share flows, the
fingerprint-derived shared-unlock cookie, and the revocation-on-change property. **`docs/003` and
`docs/000` still list BCrypt as ready-to-build — they are wrong.** When the design pass lands, the
BCrypt implementation un-parks with it. Related item recorded in 003 and left there: the
Download-All UX rewrite is NOT buildable as specced (the backend 302s to a presigned S3 URL, so
`fetch`+blob hits S3 CORS — the current `window.location.href` + timer is a documented deliberate
constraint, `useDownloadNavigation.ts:19-24`); what remains is a UX question, folded into this
design pass.

## EM5 · Email-disabled warning callout

Zero `EMAIL_ENABLED`/email-disabled strings exist in `app/` — the admin gallery access UI gives no
hint that saving will NOT send email while the flag is off. One callout in the access section,
driven by a config read the BFF can expose. Small; good first-MR material.

## Closed

_Nothing yet._
