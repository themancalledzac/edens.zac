# EM — Email & client galleries

_Context file for the EM items on [2026-features.md](../2026-features.md) — 1 shipped (EM5,
#370); its write-up is in the Closed section below._

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
address is mailed.

**The 2026-08-30 verification was wrong, corrected 2026-08-31 (4).** It read "`InfoTab.tsx` has no
recipient field at all — `recipientEmails` exists only in `app/types/Collection.ts` and
`useCollectionEdit.tsx` — so this is a UI addition, not a modification." Both halves mislead.
`InfoTab.tsx:303` renders a `Recipient email` input (`multiple`, comma-separated) and
`useCollectionEdit.tsx:559` seeds it from `collection.recipientEmails` on load, so the stored list
already reaches the form. The mistake looks like a grep for the symbol `recipientEmails`, which
InfoTab never names because it reads the hook's `galleryEmail` instead — the field was there, under
another name.

So EM2 reshapes an existing control rather than adding one: split the single round-tripping input
into a read-only existing-recipients list plus an add-one field, and narrow the send to the new
address. Same deliverable, different starting point, and the "addition, not modification" sizing
should not be trusted.

**BLOCKED on the backend, verified 2026-08-31 (5) — and the frontend was never the constraint.**
Two passes argued about whether `InfoTab` had a recipient field. It does, and it does not matter.
`recipient_emails` has exactly one writer, `CollectionRepository.saveGalleryAccess`, which
overwrites the whole array with what the request sent; `CollectionService.updateGalleryAccess` then
mails every address in that same array. One field is both the stored recipient list and the send
list, so the frontend can only choose which half to break: send `[new]` and the stored list is
reduced to one address, or send the merged list and everyone is re-mailed, which is today.

No third path exists. `sendGalleryPasswordEmail` has one caller (that write path),
`CollectionAdminController` exposes one `@PostMapping`, and `CollectionRepository.save` writes
neither column on UPDATE — its docblock states both are owned exclusively by `saveGalleryAccess`.
All re-run against the backend's `origin/main`.

**MR 1 is backend:** split the list to store from the list to notify — a `notifyEmails` on
`GalleryAccessRequest`, or append semantics on `emails` with the notify set derived from what was
new. Under the frontend-only rule this repo does not file rows on the backend board, so the ask is
written as a handoff instead: [backend-handoff-MA1-EM2.md](backend-handoff-MA1-EM2.md) (2026-09-05).
Until the backend agent picks it up, that document is the item's only owner. The frontend reshape
follows the backend MR, unchanged from the description above.

**Collision, unchanged:** MA1 deletes `InfoTab.tsx`, so any EM2 frontend built there is thrown
away. MA1's backend blocker turned out to be a question rather than an absent endpoint (see the MA1
section and the same handoff), so MA1 may move first; whichever lands first settles the ordering.

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

## Closed

### ☑ EM5 · Email-disabled warning callout — SHIPPED (#370)

The admin gallery access section now warns, after a save, that the client was not emailed and the
password has to be passed on by hand. Keyed on the backend's `reason === 'email-disabled'` through
a shared `isEmailDisabled` helper in `app/utils/emailSendReason.ts`, surfaced as
`galleryEmailDisabled` on `useCollectionEdit` and rendered by `InfoTab`.

**No config read, by design.** `email.enabled` is a Spring property with no DTO or controller
behind it, so a pre-emptive banner is not buildable from this repo. What it would cost, since the
question will come back: a backend field on some existing admin read (or a new endpoint), the DTO
and controller change to carry it, plus the FE read — a backend item, not a frontend one. The
post-send callout needs none of that, which is why it is the shape that shipped.

**The row's premise was half wrong and the correction is worth keeping.** It said zero
email-disabled handling existed in `app/`. True of the literal strings, misleading in substance:
`ShareCard` already rendered "Email is not switched on right now — copy the link and send it
yourself" — but on `sent === false` alone, without looking at the reason. So every send failure
blamed the switch, including ones where email was on and something else broke, sending the owner
to check a setting that was already correct. That is now keyed on the reason too, with the other
failures getting their own sentence. Grepping for a string found the gap in one surface and missed
the bug in the other; the behavior was what needed reading.

Landed +2 tests on the helper's wire spelling, +4 on the callout's presence and absence, and +1 on
`ShareCard`'s non-disabled branch.
