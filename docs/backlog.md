# Backlog

Every open item, one row each. Ids are the ones PR bodies and commit messages use. "Blocked on" names who has to act. Shipped work is in git and PR bodies; answered and rejected items are in `docs/decisions.md`.

## Refactor

- **F1** — Split `useCollectionEdit.tsx` (1,829 lines) into five hooks along its section anchors; leave the update-form region for MA1; keep the `UseCollectionEditResult` facade. Blocked on: nothing; goes before MA1, never in the same run as F4. Size: large, own session.
- **F4** — Merge `TaxonomyPage` into `LocationPageClient` so tag pages get filters, the collections strip, the header cover and follow seeding (decided 2026-09-08). Blocked on: nothing; size it first (cover source, `LocationCollections` on a tag, what the 32-line server page gave for free). Size: medium, unsized.
- **F3** — Two moves left: `app/utils/contactApi.ts` to `app/lib/api/messages.ts` using `ApiError`; rename `app/components/auth/` and `messages/` to PascalCase (`ui/` stays). Blocked on: nothing. Size: small (1 src / 3 test; 9 src / 9 test).
- **G2b** — Hoist the remaining inline comments into the docblock of the function they explain, `app/` first, then `tests/`, then flip `local/no-inline-comments-in-functions` from `warn` to `error`. Re-run the count with `npx eslint app tests --format json | node -e "const r=JSON.parse(require('fs').readFileSync(0));let n=0,f=0;for(const x of r){const c=x.messages.filter(m=>m.ruleId==='local/no-inline-comments-in-functions').length;n+=c;if(c)f++}console.log(n+' warnings in '+f+' files')"`. Blocked on: nothing. Size: large, two MRs (G2b-app, G2b-tests).
- **G2c** — Heavy files ride their refactors; `CollectionPageClient.tsx` and `CollectionPageWrapper.tsx` ride nothing and are schedulable. Blocked on: nothing. Size: medium.
- **G4** — Read the ~50 backward-looking docblocks under `app/` and delete history, board labels and rejected-alternative essays; no lint rule, read them, do not regex. Includes the docblocks in `next.config.js`, `app/page.tsx`, `app/utils/structuredData.ts` and `tests/config/imageSizes.test.ts` that cite a deleted board file; cite #360 (PF4), #360, #367 (PF8) and #358 (PF1) instead. Sweep command (save as an `.mjs` file, run with `node` from the repo root; run it as written, a rewrite changes the count):

  ```js
  import { readdirSync, readFileSync } from 'node:fs';
  import path from 'node:path';
  const root = path.join(process.cwd(), 'app');
  const files = readdirSync(root, { recursive: true, encoding: 'utf8' })
    .filter(f => f.endsWith('.ts') || f.endsWith('.tsx'))
    .map(f => path.join(root, f));
  const TERMS = {
    'used to': /\bused to\b/i,
    'no longer': /\bno longer\b/i,
    previously: /\bpreviously\b/i,
    'the old': /\bthe old\b/i,
    'PR #n': /PR #\d+/i,
    'bare date': /\b20\d\d-\d\d-\d\d\b/,
  };
  let total = 0;
  const hits = new Set();
  const per = {};
  for (const k of Object.keys(TERMS)) per[k] = 0;
  for (const f of files) {
    for (const m of readFileSync(f, 'utf8').matchAll(/\/\*\*[\S\s]*?\*\//g)) {
      total++;
      let hit = false;
      for (const [k, re] of Object.entries(TERMS))
        if (re.test(m[0])) {
          per[k]++;
          hit = true;
        }
      if (hit) hits.add(`${f}:${m.index}`);
    }
  }
  console.log(total, hits.size, per);
  ```

  The board-label sweep is a different sweep: a bare `\b[A-H][0-9]{1,2}\b` over-counts, because `contentRatingUtils.ts` has `H5★` (a five-star horizontal rating). Blocked on: nothing. Size: medium, docs-only.

- **E7** — `EditModeLayer.tsx:281` computes `contentBlocks` and discards it in reorder mode; size and fix. Blocked on: nothing. Size: small, unsized.
- **E19** — One section-list shell for every "header over rows". The admin hub's four panels already share one tabbed `ListPanel` with one `PanelAction` style; six variants remain: `RoleDetailView` sections, `CollectionRolesSection`, `UserRolesSection`, the `CollectionListSelector` header and bucket accordion, `CommentsList`, and the `FilterToolbar` dropdown chevron. Four MRs, each independently shippable, in order: (a) extract `app/components/ui/SectionList/` (heading, optional `PanelAction`-styled action, `ListRows`-style rows, an `addRow` slot) and move the three role editors onto it, deleting the duplicated SCSS and keeping one heading style; design `UserRolesSection`'s compact chip-row mode first; (b) move `PanelAction` out of `ListPanel` into `app/components/ui/` and use it for `CollectionListSelector`'s "Add New Child"; (c) put `CommentsList` rows on `ListRows`/`ListRow` (markup and surfaces only, not `listPanelShape`); (d) one chevron glyph set, exported from `Disclosure` (it draws `▸`/`▾`, `FilterChip` draws `▴`/`▾`). Out of scope: `MenuDropdown`'s About/Contact disclosure and the `Dropdown` combobox. Blocked on: nothing. Size: E19a source-negative, b to d flat-to-positive; each needs tests for any new primitive.
- **B8** (optional) — Tests for `sharedObserver`, `useParallax` and `useContentReordering`; merges the hook and component test gaps listed under the leftovers below. Blocked on: nothing. Size: +400 to 600 test lines.

## Features

- **AU1** — Self-serve password reset over the invite subsystem; `/forgot-password` route; backend `purpose` column on the invite table. Blocked on: nothing; the backend half becomes a handoff when picked. Size: medium, BE + FE.
- **AU2** — Admin passkey list and revoke on `/admin/users/[id]` against `GET /api/admin/users/{id}/passkeys` and `DELETE /{id}/passkeys/{credentialId}`, with a last-passkey warning ("their last passkey" needs no backend change; "and no password to fall back on" needs BA3). Self-service list/remove on `/user` is still decision #4 (the enrollment chip shipped in #437). Blocked on: BA3; user for the self-service half. Size: medium.
- **SD4** — `/explore` as a drill-down explorer (Option C). Blocked on: user, decision #10, reconcile with the `MenuDropdown` design review. Size: large.
- **SD6** — Clickable people chips; `/person/[id]` (frontend-only) or a backend `slug` column plus `/person/[slug]`. Blocked on: user, decision #17. Size: small FE, or small BE + FE.
- **SD8** — Lens filter on `/location/[slug]`. Blocked on: user, is the facet wanted. Size: small.
- **RC1** — Re-measure `isFilm` on four film collections against a live backend; if any still reads zero, flagging a third body is a data call for the owner:

  ```bash
  for s in chamonix-film vienna-film gorge-50km-film dolomites-film; do
    curl -s "localhost:8080/api/read/collections/$s?page=0&size=50" \
      | jq -r --arg s "$s" '[.content[]|select(.contentType=="IMAGE")]
          | "\($s) \(map(select(.isFilm==true))|length)/\(length)"'
  done
  ```

  Blocked on: live backend. Size: tiny.

- **RC2** — Similar-collections v1: metadata-graph score, Related section swap. Blocked on: user, decision #1 (D1 to D4). Size: medium BE + small FE.
- **RC3** — Embedded hub renders as a labeled card-row of its children instead of one parallax card; branch in `transformCollectionBlocks`, render with `CoverCard` modeled on `LocationCollections`, with its own entry in the row-rating model. Blocked on: BA4. Size: small BE + medium FE.
- **RC4** — Suggested collections (admin rows). Blocked on: CT3 and RC1. Size: medium.
- **RC5** — CLIP/pgvector similarity tier. Blocked on: user, decision #1 (D6). Size: large, infra.
- **CT1** — Rewrite the collections-as-tags spec against the typeless collection model and emit open questions D1 to D12. Blocked on: nothing. Size: docs, one sitting.
- **CT2** — Adjudicate D1 to D12. Blocked on: user, after CT1. Size: decision.
- **CT3** — Saved-filter engine: AND-tag query, `source` column, sync. Blocked on: CT2. Size: large BE + FE.
- **CT4** — `/blog` date-keyed stream. Blocked on: CT2. Size: medium.
- **CT5** — `POST /collections/{id}/auto-tag` plus an admin button. Blocked on: nothing; backend first, no handoff yet. Size: small BE + small FE.
- **CT6** — Tag `type`/visibility column. Blocked on: nothing; design confirm. Size: small BE.
- **EM1** — SES production checklist: domain, DKIM, sandbox exit, and `EMAIL_ENABLED` on the backend. Blocked on: user drives the AWS console. Size: ops.
- **EM2** — New-recipient-only gallery send: the frontend reshapes the gallery-access form into a read-only existing-recipients list plus an add-one field. Blocked on: BA2. Size: small BE + small FE.
- **EM3** — Contact-owner notification email through SES, plus `user_invite.created_by`. Blocked on: user, decision #14 (this or MA4's webhook, not both). Size: small BE.
- **EM4** — Gallery-password design pass; BCrypt storage of gallery passwords (the highest-value security item, backend `ClientGalleryAuthService`) is parked behind it. Blocked on: user, decision #3. Size: design.
- **MA1** — Manage rail: per-field PATCH commits, delete the edit sheet. `updateCollection` already calls the null-guarded partial-update PUT, so set-a-value commits can be built now; only the clear path waits. Blocked on: F1 first; BA1 for clearing. Size: large, own sessions.
- **MA2** — `staging` system collection, identified by its slug `staging` exactly like Home (the collection type enum and `visible` boolean no longer exist; visibility is the 3-state `CollectionVisibility`). The backend auto-links a freshly uploaded collection to whatever row holds `slug = 'staging'` (`ImageUploadPipelineService.linkToStagingCollection`, `STAGING_COLLECTION_SLUG`), in its own try/catch so a metadata failure cannot block staging; with no such row it is a logged no-op. Open: (1) seed the row: nothing creates `staging`, so the link is a no-op until an operator makes it by hand; a migration should create `slug='staging'` with a deliberate `visibility`; open decision `HIDDEN` (dev-only, 404s in prod for anyone without an explicit grant) versus `UNLISTED` (direct-slug-only), pick one before writing the migration; (2) auto-parent beyond upload: link on creation and on a visibility change into the draft state, unlink when it flips back to `LISTED`, guard against self-reference and against parenting Home; (3) visibility carve-out: `CollectionService.enforceVisibility()` bypasses on `HOME_SLUG` alone, so decide whether `staging` needs the same slug bypass for admin reads or whether its own `visibility` plus the `/api/admin/**` authz gate is enough, which depends on the seed choice; (4) frontend veneer: a manage-page badge for staged collections keyed on the collection's `visibility` and on membership in `staging`, never on a type, with a `STAGING_SLUG` constant beside `HOME_SLUG` in `app/utils/collectionSlugs.ts`. Blocked on: user, decision #2. Size: medium BE + small FE.
- **MA3** — Manage page full-screen grid and morphing bottom bar on a light surface. Blocked on: user, decision #15 (respec or drop). Size: several MRs once specced.
- **MA4** — Contact-message notify channel (Discord/Slack webhook); the mark-as-read half shipped. Blocked on: user, decision #14. Size: small.
- **MA5** — Backend-paged admin collections list. Blocked on: nothing; low priority. Size: medium.
- **MA6** — User change log and a non-admin mutation path (notify badge, accept, revert, edit review panel on the admin surface). Blocked on: user, decision #16. Size: large, design first.
- **PF7** — CloudFlare Phase 2: proxy DNS, lock the origin to CloudFlare ranges, trust `CF-Connecting-IP`, drop `X-Real-IP` injection, `www` to apex redirect. Blocked on: user, ops. Size: 1 to 2 weeks lead.
- **PF13** — Home page static via Cache Components: hoist cookies out of `fetchBase`, keep `getCollectionBySlug` cookie-varying, flip the flag, convert 19 segments. The home page renders per request because `CollectionPageWrapper` reads `headers()` and `cookies()`. Blocked on: nothing; the review round waits for a production Lighthouse run showing TTFB is what remains. Size: three sittings.
- **PF14** — Site-wide dark mode behind a user preference (admin gets no separate dark wiring). Blocked on: nothing; scope first. Size: unscoped.
- **PF15** — `app/robots.ts`, `app/sitemap.ts`, canonical and `og:url` pointing at the apex (decided #18). Blocked on: nothing for the two files; read `NEXT_PUBLIC_APP_URL` from the Amplify console before the canonical. Size: small.
- **PF16** — `/search` fetches 200 images with no criteria (234 KB, `SEARCH_RESULT_LIMIT` in `searchFilters.ts`); pick a smaller default or require a criterion. Blocked on: nothing; the profiling half needs a Lighthouse baseline and backend timing of `GET /collections/{slug}`. Size: small.

## Open user decisions

- **#1** — Similar-collections D1 to D6: Related source mix, score location, hubs in slots, auto-promote threshold, suggestion surface, pgvector. Unblocks RC2, RC5.
- **#2** — Staging seed visibility, `HIDDEN` or `UNLISTED`. Unblocks MA2.
- **#3** — Gallery passwords: what should they do, reconciling admin re-share, the shared-unlock cookie and revocation on change. Unblocks EM4.
- **#4** — Should a signed-in user see and remove their own passkeys on `/user`? Enrollment already shipped (#437). Unblocks AU2's user-facing half.
- **#10** — `/explore` direction: reconcile Option C with the `MenuDropdown` design review. Unblocks SD4.
- **#14** — Contact-message notification: Discord/Slack webhook (MA4) or owner email through SES (EM3). One, not both. Unblocks MA4, EM3.
- **#15** — MA3: respec the manage page's full-screen grid and bottom bar on a light surface, or drop them. Unblocks MA3.
- **#16** — MA6: non-admin canonical mutation, `user_change_log`, admin review surface. Unblocks MA6.
- **#17** — SD6 route shape: `/person/[id]` now, or a backend `slug` column and `/person/[slug]`. Unblocks SD6.
- **SD8** — Is the lens facet on `/location/[slug]` wanted at all. Unblocks SD8.

## Backend asks

None acted on as of backend `origin/main` `f569f40a` (2026-09-19). The frontend does not write to the backend repo; each ask below is the whole spec.

- **BA1** — Clear-a-nullable-field on `PUT /collections/{id}` (both the `AdminController` and `EditController` routes). The PUT is a null-guarded partial update, so setting a value works today, but clearing the description, the collection date or the location list cannot be expressed because null means "unchanged". Ask: an explicit-null marker the null-guard recognises, or a `clear: ["description", "collectionDate"]` list on the request applied after the guarded fields. No new verb is needed (a `PATCH` alias is acceptable). Name it in the DTO so the frontend's `buildFieldPatch` has one place to read. Unblocks the clear path of MA1.
- **BA2** — `notifyEmails` on `GalleryAccessRequest`. `recipient_emails` has one writer, `CollectionRepository.saveGalleryAccess`, which overwrites the whole array with what the request sent, and `CollectionService.updateGalleryAccess` then mails every address in that same array, so one column is both the stored list and the send list. The frontend can only shrink the stored list to the new address or re-mail everyone. Ask: a `notifyEmails` field that mails only those addresses while `emails` is stored as sent; the alternative is append semantics on `emails` with the notify set derived from what was actually new. The first is the smaller change and the more explicit contract. Unblocks EM2.
- **BA3** — `passwordLoginAvailable` on `GET /api/admin/users/{id}/passkeys`. The GET returns a bare `List<PasskeyRow>` (`id`, `label`, `transports`, `createdAt`, `lastUsedAt`); `passwordLoginAvailable` exists only on the DELETE response (`PasskeyDeregisterResult(int remainingPasskeys, boolean passwordLoginAvailable)`), computed inside the delete handler. The admin UI must warn before deleting a last passkey on an account with no password. Ask: carry the boolean on the GET, as a small wrapper around the list or as one field beside it; no hash, no count. Note for the UI: deleting a passkey calls `sessionService.revokeAllForUser(id)`, so it ends every live session of that user; flag it if that is wrong. Unblocks AU2.
- **BA4** — Child summary on the COLLECTION content block (`ContentModels.Collection`, 21 components, none describing children). Ask: `hasChildren: boolean`, which alone picks the render mode, and ideally `children: [{ id, name, slug, coverImageUrl }]` capped at some N, using `name` not `title` so it matches the frontend's `CollectionListModel`. This is serialization: `hasChildren` is already computed server-side for the admin manage DTO. Decide whether `children` honours the same two visibility gates RC1 applied to `parents` (`c.visibility = 'LISTED'` and `cc.visible = true`); a hidden child in a public card-row would repeat the disclosure RC1 closed. Do not reuse `DisplayMode` as the render hint; it is a per-collection sort key. Unblocks RC3.

## Leftovers from the earlier chapter docs

- **CS1** — Two deferred CSS sweeps: the `@custom-media` breakpoint bridge (token-drive the ~100 hardcoded `768px` queries; deferred for a postcss/Next 16 pipeline conflict) and the gap-rule plus `rgb()`-slash syntax sweeps. Blocked on: nothing. Size: small.
- **PF-L** — Perf tasks not covered by the PF rows: baseline LCP measurement from production (Lighthouse and `view-source` to confirm the hero is in the HTML), explicit image `quality` (~65) with tighter `deviceSizes`/`imageSizes`, narrow `priority`/preload to the single LCP candidate instead of every leaf in row 0, scope `will-change: transform` on parallax images to near-viewport, and render micro-optimizations (memoize `handleFullScreenImageClick`, share one IntersectionObserver, drop the `document.querySelector` probe in `useFullScreenImage`, admin-only inline-arrow callbacks in `ReorderOverlay`). Blocked on: nothing. Size: unsized.
- **CG1** — Five small client-gallery items: a regression test for proxy `Set-Cookie` forwarding (`getSetCookie()` plus per-cookie `append` is uncovered); SSR cookie-timing hardening (the `router.refresh()` race on first SSR after unlock); an email-disabled warning callout replacing the `"email-disabled"` status string; Download-All UX (replace `window.location.href` and the blind 4-second "Preparing ZIP…" timer with `<a download>`/`Blob` and real progress); and BCrypt storage, parked behind EM4. Blocked on: nothing except BCrypt. Size: small each.
- **OBS1** — CloudWatch alerting and dashboards on the Amplify log group; also the token-in-URL and CSP-report gaps. Blocked on: user, ops. Size: small.
- **WB1** — Wave B cleanup: `bffPaths.ts` (kill hardcoded BFF prefixes), shared `<StatusBanner>`, `useApiSubmit` hook, `contactApi` `ApiError` standardization, shared test factories. Blocked on: nothing. Size: medium.
- **DC1** — Function decomposition: split `buildRows`, `CollectionContentRenderer` and `MetadataModal` (and the medium/low candidates); route `fetchReadApi` and `fetchAdminGetApi` through the `fetchBase` helper in `app/lib/api/core.ts`. Blocked on: nothing. Size: medium.
- **RL1** — Generalize the backend rate-limit config from contact-specific `app.contact.rate-limit-*` props to a per-path map before a second public endpoint; housekeeping: messages PII retention TTL, Comments page mark-as-read/delete/search, an optional Discord/Slack notify channel. Blocked on: backend. Size: small.
- **BE1** — Three missing backend endpoints: public `locations` and public `lenses` read endpoints (filter dropdowns), and `POST /collections/{id}/auto-tag` (see CT5). Blocked on: backend. Size: small each.
- **ABT1** — The About image is hardcoded in `MenuDropdown.tsx` (line 274) and `About.tsx` (line 18). Blocked on: nothing. Size: small.
- **README1** — The README references four `docs/screenshot-*.png` images that do not exist; add them or drop the references. Blocked on: user. Size: tiny.

## Not in this round

Out of the 2026-10-17 review round; each needs its own planning session or a product decision first. The round itself is tracked in `docs/reviews/2026-10-17/04-orch-plan.md`.

- **PF13 Cache Components** (code 7.26) — Waits on the round's request R2 and a production Lighthouse run showing TTFB is what remains. Unverified whether Amplify keeps a `use cache` store across Lambda instances.
- **F4: fold `/tag` into the location page stack** (design 9.41, code 7.27) — Large, unsized. R6 fixes the tag page first.
- **F1: split `useCollectionEdit.tsx`** (1,829 lines) — Large, own session, goes before MA1.
- **Link `/search` and its nav cell** (design 9.40) — Blocked on SD4 (decision #10).
- **Brand serif: webfont or remove** (design 9.42) — Product decision.
- **Percent-width tiles with `aspect-ratio`** (design 9.43) — Measured win is CLS 0.0019; touches dozens of pixel-asserting tests.
- **PF16 `/search` corpus size and backend `GET /collections/{slug}` profiling** (code 7.25) — Medium. Needs the Lighthouse baseline and backend timing first.
- **Last grid tile alone on an odd count** (design §8 open question 1) — No decision yet.
- **The 31 feature rows, 10 open decisions and 4 backend asks** — Listed above; product backlog, not review fixes.
- **`useSubmitState` for forms and modals; inline comments beyond the seven worst files** — Do when those files are next opened.
- **Admin panel cache keyed by principal** (code §2 "Noted") — Low risk, noted only.
