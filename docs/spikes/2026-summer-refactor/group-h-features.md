# Group H — Feature requests (product roadmap detail)

_Out-of-band detail for the [2026 Summer Refactor board](../2026-summer-refactor.md). Unlike the
other files here, this one is **not** a shipped archive — it holds open product work. That does not
break the board's invariant, which is that any **cleanup MR** can be picked up cold with every
reference file closed. Nothing in this file is a cleanup MR._

**What is here and what is not.** Six feature requests were filed 2026-08-23 from a user design
review of `/user` plus an annotated screenshot. Three of them are on the live board under
`## Group H`, with board rows, because a board row has to be self-sufficient: **H1** (merge
`Following` into `Collections`) and **H2a** (the `/user` rail copy pass) are startable code MRs, and
**H3** (`Send a message` placement) is a user decision gating a small MR, the same shape as F4 and
G3.

The four below are a design review, an ops project, a second design review and a vision item. None
is an MR, none has a board row, and the live board reaches them from one line under "What to build
next (product roadmap, not cleanup)". Nothing here is duplicated on the live board — each item has
exactly one home, so there is no second copy to drift.

**How these were gathered.** Three parallel read-only explorer agents mapped the `/user` chip row and
rail, every email and messaging path across both repos, and `MenuDropdown`. Every ref below was read
fresh from disk on `main` at `ef77af2`; backend claims were checked against backend `origin/main`,
not a working branch. **Three agent claims were verified rather than trusted, and two of them
changed what the item says** — both are flagged inline under H5. A related bug found during the H4
research is filed on the live board as **C7**, not here, because open bugs belong in Group C.

---

### ⛔ H2b · A durable layout for labelled metadata sections — DESIGN REVIEW

H2a is a patch. The request is explicit that this component needs a hardened, long-term design,
because it is meant to carry several different groupings — collections, user, admin, a paragraph of
prose, and more. Not startable until reviewed.

What exists today, so the review starts from facts rather than a blank page:

- The primitive is `Card` — [Card.tsx:35](app/components/ui/Card/Card.tsx:35). Heading, rule, body,
  wired with `aria-labelledby` ([:42](app/components/ui/Card/Card.tsx:42)). Its docblock
  ([:18-34](app/components/ui/Card/Card.tsx:18)) records that it already replaced thirteen
  hand-rolled "section with a heading" implementations, so the consolidation this item proposes has
  a precedent that worked.
- Its only consumers are the three `/user` rail cards: `ShareCard.tsx:146/154/168`,
  `AdminCard.tsx:35`, `AccountCard.tsx:66`. No collection page and no admin page uses it.
- The admin hub uses a different primitive, `AdminPanel` (named at
  [Card.tsx:31-33](app/components/ui/Card/Card.tsx:31)), which owns a fixed footprint and a collapse
  affordance.
- **The container half is already solved.** The rail slot at
  [CollectionContentRenderer.tsx:441](app/components/Content/CollectionContentRenderer.tsx:441) is
  the same `railExtras` slot that `/admin/users/[id]` fills with `UserRolesSection`
  ([page.tsx:153](app/(admin)/admin/users/[id]/page.tsx:153)). Two unrelated pages already push
  arbitrary sections through one slot. What is unsettled is the content model, not the container.

The decision to make: does `Card` grow variants to cover prose and grouped lists, or do `Card` and
`AdminPanel` converge into one component with an optional collapse? Answer that before any code.
Note the 008 roadmap item "`/user` ↔ `/admin/users/[id]` layout unification" is the same question
arriving from the other direction — settle them together or they will produce two designs.

### ⛔ H4 · One email strategy — DESIGN + OPS

The four sub-requests are in four different states. That is the finding: this is not one project, and
treating it as one is what has kept it stalled.

**SES is already wired and switched off.** AWS SDK v2 `sesv2` at `pom.xml:129-131`, client bean in
`config/SesConfig.java`, sender at `services/EmailService.java:32`. The kill switch `email.enabled`
defaults false (`EmailService.java:46`); both public senders return
`SendResult(false, "email-disabled")` before any AWS call (`:69-72`, `:98-101`). Config at
`application.properties:132-134`. Two senders exist: `sendGalleryPasswordEmail` (`:67`) and
`sendInviteEmail` (`:97`). Covered by `src/test/java/…/services/EmailServiceTest.java`.

1. **Contact → forward. Unbuilt, but already specced.** A contact submission becomes a database row
   and nothing else. `ContactForm` → `submitContactMessage`
   ([ContactForm.tsx:30](app/components/ContactForm/ContactForm.tsx:30)) →
   [contactApi.ts:13,17](app/utils/contactApi.ts:13) → `MessagesControllerPublic.java:26,42` →
   `MessageService.create`, which is two lines — a repository insert, no email
   (`services/MessageService.java:17-18`). Storage: `V17__create_messages_table.sql:1-6`. Admin
   reads it at [comments/page.tsx:12](app/(admin)/comments/page.tsx:12) and
   [admin/page.tsx:61](app/(admin)/admin/page.tsx:61). The only reply path is manual — a `mailto:`
   link ([MessageRow.tsx:33](app/components/messages/MessageRow.tsx:33)) and a "Reply in Gmail" link
   (`:69,74`, built by [messageFormat.ts:16](app/utils/messageFormat.ts:16)). Adding an owner
   notification is spec'd as C7 in `docs/superpowers/specs/2026-07-06-email-ses-production.md:162`
   and is unbuilt. **The value here is notification latency, not capability** — a working manual
   reply path already exists.
2. **Reset password → the user's email. Does not exist at all.** The largest genuine gap of the
   four, and the only one that is a feature rather than a wiring job.
   [LoginForm.tsx:16](app/login/LoginForm.tsx:16) declares `'password' | 'passkey'` and there is no
   reset link on the login page. `AuthController.java:62,95,101` declares only `/login`, `/logout`,
   `/me`. Grepping the backend for `forgotPassword|resetPassword|password.?reset|/forgot` hits only
   comments describing the invite reuse (`AdminUserController.java:163`, `UserInviteService.java:49`).
   Today the sole recovery path is an admin regenerating an invite while the UI relabels it a reset
   ([GenerateInviteButton.tsx:32-33](app/(admin)/admin/users/GenerateInviteButton.tsx:32)).
   **A logged-out user cannot recover their own account.**
3. **User setup link via email. Already built — the blocker is operational, not code.**
   `sendInviteEmailAfterCommit` (`AdminUserController.java:457`, called from `:133`, `:180`, `:228`)
   registers an `afterCommit` hook (`:462-468`) so a rollback cannot mail a dead link, with an
   immediate-send fallback when there is no active transaction (`:458-460`). Link shape is
   `email.frontend-base-url` + `/invite/<rawToken>` (`AdminUserController.java:437-439`), 7-day
   expiry per the copy at `EmailService.java:237`. Clipboard copy still exists at
   [InviteLinkResult.tsx:26](app/components/InviteLinkResult/InviteLinkResult.tsx:26). This is what
   makes the roadmap's "invite links are clipboard-only" line stale — corrected in G1.
4. **Share a link via email. The UI exists and the endpoint does not.** Filed as **C7** on the live
   board. Copy-to-clipboard already works
   ([ShareCard.tsx:97](app/components/Personal/ShareCard.tsx:97), button `:177-178`), so the
   request's fallback option — "or just an easy copy button" — is already shipped.

Decisions to make:

- [ ] **Is self-serve password reset in scope,** or is admin-issued invite regeneration the permanent
      answer? Everything else in this item is small; this one is a feature with its own token
      lifecycle, rate limiting and abuse surface.
- [ ] **Does contact become a forward-to-owner email,** or stay a row the admin Comments page
      surfaces?
- [ ] **Ops, not code:** flip `EMAIL_ENABLED`, verify the domain identity, set MAIL FROM/SPF and
      DMARC, exit the SES sandbox. The checklist is already written at
      `docs/superpowers/specs/2026-07-06-email-ses-production.md:87-142`.

**Caveat: that spec is partly stale and must be re-audited before it is worked from.** Dated
2026-07-06, it asserts one public `EmailService` method (`:20`) and "invite email doesn't exist"
(`:34`, `:73`) — but its own C5 recommendation (`:161`) has since shipped. Its C7 (contact owner
notification, `:162`) and C3 (`user_invite.created_by`, `:159`) do still appear unbuilt.

Related open items already on record: `docs/003-client-gallery-security.md:16` — saving gallery
access re-emails the entire recipient list every time, not just newly-added recipients
(`services/CollectionService.java:1701-1703`) — and `:19`, that the `"email-disabled"` status string
is easy to miss and should be a visible callout. Both land in this item's blast area; fold them in.

### ⛔ H5 · `MenuDropdown` design review — DESIGN REVIEW

`MenuDropdown.tsx` is 454 lines, one exported component
([:112](app/components/MenuDropdown/MenuDropdown.tsx:112)) plus one module-private helper
`restoreFocus` ([:61](app/components/MenuDropdown/MenuDropdown.tsx:61)). SCSS is 262 lines. It can
render 17 items.

**Two of the five sub-questions rested on assumptions that turned out to be false. Both change the
question being asked, which is the reason to check before opening a review.**

- **"Do we even want this popout on desktop, or only mobile?"** — desktop already gets a different
  treatment. Eight `@media (width >= 768px)` blocks at
  [MenuDropdown.module.scss:36](app/components/MenuDropdown/MenuDropdown.module.scss:36) and `:76,
  94, 110, 128, 227, 238, 246`. Mobile is a full-viewport overlay (`:6-20`); desktop is a
  right-anchored `min(400px, …)` panel with a left drop shadow (`:36-45`). There is a behavioural
  branch too — click-outside closes only above 768
  ([MenuDropdown.tsx:212](app/components/MenuDropdown/MenuDropdown.tsx:212), `BREAKPOINTS.mobile` at
  [constants/index.ts:13](app/constants/index.ts:13)). So the question is whether to keep the
  desktop panel that exists, not whether to build one.
- **"I wish clicking About added an about-me component to the page."** — About is already an inline
  panel, not a route. `Disclosure` at
  [MenuDropdown.tsx:328-335](app/components/MenuDropdown/MenuDropdown.tsx:328), body `<About />` at
  `:334`. There is no `app/about/` route anywhere. And
  [About.tsx:10](app/components/About/About.tsx:10) is 33 lines, presentational, no props and no
  client hooks — it can be dropped into any page as-is. This is a much shorter step than it reads,
  and it is the natural first slice of H6.

The other three sub-questions:

- **Ordering and space.** Items in source order with their visibility conditions: Close `:286`
  (always), Home `:299` (`pathname !== '/'`), Me `:308` (logged in), Log out `:313` (logged in),
  Log in `:322` (logged out), About `:328`, Contact `:337`, Explore `:347`, Collections `:353` (all
  always), Create `:360`, Update `:372` (also `pageType === 'collection'`), Metadata `:384`,
  Comments `:392`, Admin `:400` (all `isAdmin`), Clear Cache `:414` (`isLocalEnvironment()`),
  Instagram `:431`, GitHub `:441` (always).
  **Only one item is dev-gated** — Clear Cache (`:412`). The five admin items are gated on the
  `isAdmin` principal ([:129](app/components/MenuDropdown/MenuDropdown.tsx:129)), not the
  environment, so a real admin sees all of them in production. Counts: an anonymous production
  visitor on a non-home page sees 7 text rows plus 2 social icons; a production admin on a
  collection page sees 13 text rows. The length problem is real and it is worst for the site owner,
  which is the case the review should optimise for.
- **Swipe to close.** No touch handling in `MenuDropdown`. The repo has exactly one gesture
  implementation and it is not reusable: `useFullScreenImage.tsx:591-593` registers
  touchstart/move/end with `{ passive: false }`, torn down at `:596-598`, threshold
  `INTERACTION.swipeThreshold = 50` at [constants/index.ts:130](app/constants/index.ts:130), plus
  synthetic-click suppression after a gesture at
  [FullScreenModal.tsx:166](app/components/FullScreenModal/FullScreenModal.tsx:166). The logic is
  inlined in that hook. Swipe-to-close costs a `useSwipe` extraction first — price it as two items,
  not one.
- **A full deep dive.** Prior art exists and should be read before re-deriving it:
  `docs/superpowers/specs/2026-06-10-menu-dropdown-nav-design.md:13` already argues the menu is the
  site's only nav surface and should host discovery, and
  `docs/superpowers/plans/004-public-search-page.md:174-175` plans a Search item for it.

**Do E8 first or the same code gets written twice.** E8 already owns the mechanical half — eight
copies of the menu-item block collapsing into one config array (~60 lines), plus the `pageType`
union whose two values decide nothing. G2c further says MenuDropdown's 7 in-body comment blocks ride
E8 rather than migrating standalone. H5 is the design question only, and it is much easier to answer
against a config array than against eight copies.

One live defect for the review to absorb: auth items pop in after the `me` fetch resolves
(`MenuDropdown.tsx:128,305,320`), recorded as item 9 of
`docs/superpowers/specs/2026-07-06-logged-in-user-flow-review.md:101-102` and still unfixed. Item 8
of that same doc — buttons vs links — is now stale; every destination is a `NavLink` anchor.

Coverage: `tests/components/MenuDropdown.test.tsx` is 732 lines and roughly 35 cases, dense on auth
gating, focus trapping, disclosures and Escape. **Nothing asserts the desktop/mobile branch and
nothing exercises click-outside.** Any change to the desktop treatment is therefore unpinned, and
this item must add those tests before touching layout — written against current behaviour first, so
they are seen to pass, then seen to fail against the change.

### ⛔ H6 · Composable page components and drag-to-resize — VISION, NOT SCHEDULED

Recorded so it is not lost. Do not schedule against this board.

The idea: let the page owner add and remove components on the page they are looking at — an about-me
block, a collection list, quick user settings, a search bar — and, once things can be added, resize
them too, dragging an image larger and having the surrounding content reflow around it.

Why it is not startable: it needs a persisted per-page layout model, and the layout engine has no
concept of a user-set size. Rows are derived from content ratings through the prominence model in
`rowCombination.ts` and `rowStructureAlgorithm.ts`. A user-set size is a second, higher-priority
input the engine does not accept, and persistence for it does not exist at any layer — not in the
DTOs, not in the backend, not in the URL.

Two precursors that stand on their own, if this ever starts:

- `About.tsx:10` is already props-free and presentational, so rendering it inline on an arbitrary
  page is the smallest possible first slice of "add a component to this page." H5 reaches the same
  conclusion from the other direction.
- The `railExtras` slot at `CollectionContentRenderer.tsx:441` already accepts arbitrary sections
  from two unrelated pages (`app/user/page.tsx:76`, `app/(admin)/admin/users/[id]/page.tsx:153`).
  That is a working slot mechanism to build on rather than inventing one.

Revisit after the search work (roadmap item 1) lands.
