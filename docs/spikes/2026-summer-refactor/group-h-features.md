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
  ([page.tsx:153](<app/(admin)/admin/users/[id]/page.tsx:153>)). Two unrelated pages already push
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
`application.properties:132-134`. Three senders exist (re-derived 2026-08-29; backend #213 added
the third): `sendGalleryPasswordEmail` (`:72`), `sendInviteEmail` (`:102`) and `sendShareLinkEmail`
(`:134`). Covered by `src/test/java/…/services/EmailServiceTest.java`.

1. **Contact → forward. Unbuilt, but already specced.** A contact submission becomes a database row
   and nothing else. `ContactForm` → `submitContactMessage`
   ([ContactForm.tsx:30](app/components/ContactForm/ContactForm.tsx:30)) →
   [contactApi.ts:13,17](app/utils/contactApi.ts:13) → `MessagesControllerPublic.java:26,42` →
   `MessageService.create`, which is two lines — a repository insert, no email
   (`services/MessageService.java:17-18`). Storage: `V17__create_messages_table.sql:1-6`. Admin
   reads it at [comments/page.tsx:12](<app/(admin)/comments/page.tsx:12>) and
   [admin/page.tsx:61](<app/(admin)/admin/page.tsx:61>). The only reply path is manual — a `mailto:`
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
   ([GenerateInviteButton.tsx:32-33](<app/(admin)/admin/users/GenerateInviteButton.tsx:32>)).
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

### ✅ H2a · `/user` rail copy pass + chip-style the Admin links — PR #302

Copy and control changes across the three rail cards, from the annotated screenshot. Startable today
and the smallest of the six.

- [ ] Delete the passkey hint sentence at
      [AccountCard.tsx:69](app/components/Personal/AccountCard.tsx:69) ("Sign in faster with Face /
      Touch ID on this device."). Keep the `Add Face / Touch ID` button
      ([:70-78](app/components/Personal/AccountCard.tsx:70), label `:77`) and move it onto the email
      row ([:67](app/components/Personal/AccountCard.tsx:67)), right-aligned.
- [ ] Delete the Share description sentence at
      [ShareCard.tsx:155-158](app/components/Personal/ShareCard.tsx:155).
- [ ] Rename `Create a link` → `Link to share` at
      [ShareCard.tsx:160](app/components/Personal/ShareCard.tsx:160).
- [ ] Delete the Admin description sentence at
      [AdminCard.tsx:36](app/components/Personal/AdminCard.tsx:36).
- [ ] Restyle the four Admin links to the filter-chip look. They render `NavLink` today
      ([AdminCard.tsx:41](app/components/Personal/AdminCard.tsx:41), destinations as data at
      [:16-21](app/components/Personal/AdminCard.tsx:16)), whose only styling is
      [NavLink.module.scss:1](app/components/ui/NavLink/NavLink.module.scss:1) — colour inherit,
      hover underline, no border, no padding, no background.

**The real scope is the chip swap, not the copy edits.** `FilterChip`'s link variant
([FilterChip.tsx:86-99](app/components/ui/FilterChip/FilterChip.tsx:86)) already renders exactly what
`AdminCard` needs: a `next/link` anchor with chip styling and an optional count. So `AdminCard.tsx:41`
can swap `NavLink` → `FilterChip href=…` without touching the chip component. Styling lives at
[FilterChip.module.scss:1](app/components/ui/FilterChip/FilterChip.module.scss:1) (`.chip`), with
`.active` `:62`, `.count` `:92`, `.trailing` `:100`.

Two traps:

1. `FilterChip` passes `scroll={false}`
   ([FilterChip.tsx:93](app/components/ui/FilterChip/FilterChip.tsx:93)). That is right for `?tab=`
   navigation and wrong for a cross-page jump to `/admin` — it will land the user mid-page. Add a
   prop before the swap, not after.
2. `FilterChip` is imported by exactly one file today
   ([FilterToolbar.tsx:5](app/components/ui/FilterToolbar/FilterToolbar.tsx:5)). A second consumer
   promotes it to a shared primitive. Budget for that and for churn in
   `tests/components/ui/FilterChip.test.tsx:64-96`.

**There is no `AdminCard` test file** — confirmed absent, not merely unfound. H2a adds one. Note the
prove-it-fails rule needs care here: a brand-new test file has never been seen to fail, so write each
assertion against current behaviour first, watch it pass, then change the source and watch it fail
the other way. A new test written only against the new copy proves nothing.

### ✅ H3 · `Send a message` placement — PR #302; direction decided 2026-08-23

**Decided: keep it, move it into the metadata stack, and make it an ordinary clear button — not a
filled or "bright" box.** The user's words: it should be "a `Button` that is clear what it's
intended purpose is, and is in a position according to its importance or likelihood of being used."
So this is Option A of the original pair, with the loud treatment explicitly rejected. Do it in the
same pass as H2a, which restyles the same rail.

**The two entry points already share a form, so this is placement, not plumbing.**
`SendMessageButton` ([SendMessageButton.tsx:27](app/components/SendMessageButton/SendMessageButton.tsx:27),
43 lines) opens `ContactForm` at
[:38](app/components/SendMessageButton/SendMessageButton.tsx:38). The menu's Contact disclosure opens
the same component at [MenuDropdown.tsx:374](app/components/MenuDropdown/MenuDropdown.tsx:374)
(the `Disclosure` wrapping it opens at `:368`; was `:343` before E8 reshaped the menu, `:373`/`:369`
before E17 added a docblock above `isCollectionPage`. Re-verified against `main` at `dbc706a` on
the anchor `<ContactForm onSubmit={handleContactSubmit} />`. Note the `:369` was already wrong by
two when it was written — there are two `<Disclosure>` in this file, at `:359` and `:368`, and the
one wrapping `ContactForm` is the second). On
`/user` the email field is hidden and autofilled from the principal via `lockedEmail={me?.email}`.

Why it floats top-right in the screenshot: it is not in the rail. It renders in its own top bar at
[user/page.tsx:66-68](app/user/page.tsx:66), while the three cards ride `railExtras` at
[:76](app/user/page.tsx:76).

Work:

- [ ] Move `SendMessageButton` out of the top bar (`user/page.tsx:66-68`) and into `railExtras`
      (`:76`) with the three cards.
- [ ] **It is currently `variant="ghost" size="sm"`** — the quietest button the design system has,
      which is the opposite of the brief. Promote it to a normal-weight variant. `outline` matches
      what `ShareCard` and `AccountCard` already use for their actions, so the rail stays coherent
      without anything shouting.
- [ ] **Reconsider the label.** "Send a message" does not say who receives it, and this sits on the
      viewer's _own_ page, which makes the recipient genuinely ambiguous. Something naming the
      destination reads clearer. Same string appears twice — button
      [:28](app/components/SendMessageButton/SendMessageButton.tsx:28) and modal heading
      [:34](app/components/SendMessageButton/SendMessageButton.tsx:34) — change both.

**Open sub-question the brief surfaces but does not settle: ordering by importance depends on who is
looking.** For a signed-in client or follower, messaging the owner is plausibly the most-used thing
on the page, which argues for first position. For the site owner viewing their own `/user`, it is
close to useless — the form would prefill their own address, and they read incoming messages through
Admin → Comments instead, which argues for last or hidden. A single fixed position cannot be right
for both. Decide: one fixed slot, or order the rail on `isAdmin`. Cheapest defensible default is
first for non-admins, last for admins, since the rail is already assembled per-viewer.

The docblock at
[SendMessageButton.tsx:13-19](app/components/SendMessageButton/SendMessageButton.tsx:13) says the
button "sits in the collection header's filter-bar area". That stops being true the moment it moves —
update it in the same commit rather than leaving a stale description behind.

---

## Closed rows

| MR  | Scope                                              | Outcome                       |
| --- | -------------------------------------------------- | ----------------------------- |
| H2a | `/user` rail copy pass + chip-style the Admin links | +319 / −117 (est. −25 src) · #302 |
| H3  | `Send a message` into the rail as a plain button   | rode H2a · #302               |

### ☐ H1 · Merge `Following` into `Collections` — history moved from the live board (2026-08-29)

_The item is open on the live board, BLOCKED on the user. These paragraphs are its resolved
history._

**UNBLOCKED 2026-08-24 — the board row still said "do C8 first" after C8 had shipped.** C8
(the stale Following-chip count) is merged, so H1's only stated dependency is gone and the item
is COLD. Caught by the standing check for a blocker that cleared without anyone clearing the
row; worth repeating each run, because a row that reads blocked is skipped rather than read.
(H1 was later re-classified BLOCKED — not on C8, but on its own unanswered product questions:
count semantics, the followed-tile marker, and the 500-row catalog fetch.)

**How the no-dedup premise was established, recorded because the method matters.** It was
established by reading both membership paths in the loader, not by comparing what renders on
screen. Two sets that look identical in the browser prove nothing about whether the same source
decides them, and a same-session review of five "duplicate" claims elsewhere on this board found
only one that survived intact. This one is a source-level finding, so it does not need redoing.

**The original sequencing note, now satisfied.** The stale-count bug was C8, and C8 shipped FIRST
(#291), exactly as this note required: H1 deletes the `Following` chip, so doing H1 first would not
have removed the staleness, it would have relocated it onto the merged `Collections` count. H1 also
needs the tile itself to vanish on unfollow, which is strictly harder than fixing a number, because
tiles are server-built and the provider had no way to express a removal. C8 built the client-delta
plumbing that H1 now uses.

**Ref-drift record.** The three premise refs drifted +3 and were corrected 2026-08-28 (were
`:72`/`:65`/`:278`). Cause: #336 merged `getUserPage`'s import into the existing `personal` import
at `userSpaceData.ts:14`, turning one line into five — the sixth shipped-file drift on this board.
That sweep fixed only the three premise refs; the rest of the section stayed +3/+8 stale until the
full re-derive of 2026-08-29 (now on the live item).
