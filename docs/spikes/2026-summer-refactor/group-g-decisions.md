# Group G — Decisions and docs (shipped)

_Archive of shipped work from the [2026 Summer Refactor board](../2026-summer-refactor.md). Nothing here is open work. Sections are verbatim as they were when the item merged._

### ✅ G1 · Docs corrections — PR #303

The book is wrong in six places.

- [ ] 0204 impersonation removal, 0211 passkey fixes, and 0246 admin-panel-collapse all say "pending" — all are merged.
- [ ] 007 still lists "Dependabot's 7 frontend vulns" — PR #254 cleared all 27.
- [ ] 002 says `thumbnailUrl` is never read — the GIF poster shipped in three places.
- [ ] 006's dead-code list drifted: `getAllCollectionsAdmin` is now live (RoleDetailView) and the logger placeholder line is gone. The error-tracking item itself stands.
- [ ] `previous-work.md`'s newest recorded PR is **#235** (recounted 2026-08-22, worse than the
      "stops before #243" this line used to claim): it is missing #236–#252 AND the cleanup wave's
      #254–#270 — ~27 merged PRs — which violates the book's own archive rule. All five other doc
      errors above re-verified still current 2026-08-22.
- [ ] **The email claim is stale in two places, found 2026-08-23 researching H4.** This board's own
      roadmap item 5 below, and `docs/009-backend-and-vision.md:29`, both say invite links are
      clipboard-only until SES ships. Invite email is **built**: `sendInviteEmail`
      (`EmailService.java:97`) wired through `sendInviteEmailAfterCommit`
      (`AdminUserController.java:457`, called from `:133`, `:180`, `:228`) with an `afterCommit`
      hook so a rollback cannot mail a dead link. The remaining blocker is operational —
      `EMAIL_ENABLED` defaults false at `EmailService.java:46` — not code. Correct both. While
      there, note `docs/superpowers/specs/2026-07-06-email-ses-production.md` is itself partly stale:
      it asserts one public `EmailService` method (`:20`) and "invite email doesn't exist" (`:34`,
      `:73`), but its own C5 recommendation (`:161`) has since shipped.
