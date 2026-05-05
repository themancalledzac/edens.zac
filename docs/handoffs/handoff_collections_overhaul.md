# Handoff: Admin Hub + Collections Overhaul

**Date:** 2026-05-05
**Branches:** `0085-admin-hub` (backend) + `0135-admin-page` (frontend)
**Status:** Code complete, full backend test suite green (578), backend boots cleanly. FE side has an open forward-compat gap (filter dimensions need backend-side data plumbing). Neither branch has been pushed.

This handoff documents everything that landed in a long working session covering two related bodies of work:

1. **Admin hub finalization** — the `/admin` landing surface, cover-image resolution, Clear Cache wiring, two broken list-page bugs (`/all-collections`, `/collectionType/client-gallery`).
2. **Collections overhaul** — three-state visibility, per-collection rating, endpoint pivot to synthetic slugs, PARENT password trickle-down, collection_people foundation, filter wiring + text-box-as-header pattern.

The plans lived in `edens.zac.backend/docs/superpowers/plans/`:
- `2026-05-04-admin-hub-finalization.md`
- `2026-05-05-collections-overhaul.md`

---

## TL;DR — What you (FE engineer) need to know

- **Visibility is now 3-state** everywhere: `LISTED`, `UNLISTED`, `HIDDEN`. The old `visible: boolean` on `CollectionModel` is gone — use `visibility: CollectionVisibility`. New collections default to `HIDDEN`. The manage page has a 3-radio control.
- **Rating is a thing on collections.** `CollectionModel.rating?: number` (0-5). The home manage page renders click-to-rate stars on each child collection (immediate `PATCH /api/admin/collections/{id}/rating`).
- **`/collectionType/[type]` is gone.** Routes are now synthetic slugs handled by the catch-all `/[slug]/page.tsx`. Admin tiles point at `/all-blogs`, `/all-client-galleries`, `/all-portfolios`, `/all-art-galleries`, `/all-misc`, and `/all-collections`. Backend synthesizes a PARENT-shaped response for any of these.
- **`/all-collections` no longer calls `getAllCollectionsAdmin`.** It just renders `<CollectionPageWrapper slug="all-collections" />`. Visibility is environment-aware on the backend (dev sees all, prod sees LISTED only).
- **PARENT password trickle-down** is wired (FE confirm dialog + BE propagation). Currently dormant in the UI because the gallery-access form only renders for `CLIENT_GALLERY` — see "Forward-compat gaps" below.
- **`collection_people` is a real backend table** with admin endpoints (`PUT /api/admin/collections/{id}/people` and `POST /api/admin/collections/{id}/people/regenerate`). Manage page has a People section with set + regenerate.
- **Filter bar on `/all-collections` is wired but inert** until the backend extends `ContentModels.Collection` (Java record) to carry tags/people/locations. See "Forward-compat gaps."

---

## Frontend commits on `0135-admin-page` (this session, in order)

The branch already had ~15 admin-hub commits before this session (`f9549c2`, `6c12e7c`, `3eef184`, etc.). The session added:

| SHA | Subject |
|---|---|
| `3416660` | feat(visibility): FE 3-state enum + manage page radio + sweep |
| `c0dbf05` | feat(rating): RatingStars component + updateCollectionRating + home manage wiring |
| `412167d` | refactor(routes): drop /collectionType; admin tiles use synthetic /all-* slugs |
| `183c955` | feat(parent-password): FE confirm dialog + propagateToChildren flag in save |
| `4866d4b` | feat(collections): filter bar wiring + text-box header + people manager UI |

Plus the admin-hub work that landed earlier in the same branch (visible above the SHAs in `git log`).

---

## Backend commits on `0085-admin-hub` (this session, in order)

The branch starts from `298d501` (admin-hub baseline). Session commits:

### Admin hub finalization (Phase A)

| SHA | Subject |
|---|---|
| `0a57767` | feat(dao): add ContentRepository.findRandomImageWebUrl for admin home tile |
| `5244e59` | refactor(dao): simplify AdminHomeTileRepository to tile catalog only |
| `f081c35` | refactor(dao): use stream().findFirst() in findRandomImageWebUrl |
| `b7af4f3` | feat(service): resolve admin home tile covers per-key with in-memory cache |
| `e8b427d` | feat(service): implement findChildCollectionsForHome and findAllVisibleWithCovers |
| `a2e46d6` | feat(controller): add dev-only POST /api/admin/cache/clear |

### Collections overhaul Phase 1 — Visibility 3-state

| SHA | Subject |
|---|---|
| `92f47ba` | feat(migration): V20 add 3-state visibility, drop boolean visible |
| `2066148` | feat(types): add CollectionVisibility enum (LISTED/UNLISTED/HIDDEN) |
| `0dba502` | refactor(visibility): swap CollectionEntity.visible (Boolean) for visibility (enum) |
| `ee12852` | chore(tests): sweep CollectionEntity test fixtures for visible -> visibility |
| `1d4ca29` | feat(visibility): env-aware enforceVisibility (HIDDEN passes in dev only) |
| `2744f92` | feat(visibility): swap CollectionModel + CollectionRequests.Update to CollectionVisibility |

### Collections overhaul Phase 2 — Rating

| SHA | Subject |
|---|---|
| `870b1c5` | feat(migration): V21 add collection.rating (0-5, indexed) |
| `98f450c` | feat(rating): collection.rating field + LISTED queries ordered by rating + PATCH endpoint |

### Collections overhaul Phase 3 — Synthetic slugs + PARENT password

| SHA | Subject |
|---|---|
| `c1fac08` | feat(synthetic): SyntheticCollectionResolver + intercept synthetic slugs in getCollection |
| `27a95ee` | refactor(controller): drop /collections/type/{type}; synthetic slugs replace it |
| `9dc4f75` | feat(parent-password): propagate PARENT gallery password to child CLIENT_GALLERYs |
| `388c756` | fix(parent-password): propagate to UNLISTED children via all-visibilities lookup |

### Collections overhaul Phase 4 — collection_people

| SHA | Subject |
|---|---|
| `4fe847f` | feat(migration): V22 add collection_people join table |
| `16fee7f` | feat(people): collection_people repo + service + admin endpoints |

### Bug fix discovered during smoke

| SHA | Subject |
|---|---|
| `af0a171` | fix(synthetic): break circular dep CollectionService <-> SyntheticCollectionResolver |

---

## Schema migrations applied

V20, V21, V22 all applied successfully on the dev DB (verified by `start_backend` log: `Successfully applied 3 migrations to schema "public", now at version v22`). The `collection_people` table notes a `relation already exists, skipping` — a pre-existing table from the JPA era that V22's `IF NOT EXISTS` correctly tolerates.

```sql
-- V20: collection.visible BOOLEAN  ->  collection.visibility VARCHAR(16)
--      CHECK (LISTED|UNLISTED|HIDDEN), idx_collection_visibility
-- V21: collection.rating INT (0-5, nullable, idx_collection_rating)
-- V22: collection_people (collection_id, person_id) PK, two indexes
```

Existing data migration on V20:
- `visible=true AND type='CLIENT_GALLERY'` → `UNLISTED`
- `visible=true AND any other type` → `LISTED`
- `visible=false` → `UNLISTED`

(HOME stays accessible regardless via the existing service-layer slug exception.)

---

## API surface changes

### New / changed endpoints

- `POST /api/admin/cache/clear` — dev only, evicts admin home tile cover cache.
- `PATCH /api/admin/collections/{id}/rating` — body `{rating: number | null}`, range-validated 0-5, returns 204.
- `PUT /api/admin/collections/{id}/people` — body `[personId, personId, ...]`, replaces the people list.
- `POST /api/admin/collections/{id}/people/regenerate` — auto-fills people from contained images' tagged people.
- `POST /api/admin/collections/{id}/gallery-access` — body now optionally accepts `propagateToChildren: boolean` (default false). When true AND parent type is PARENT, batch-updates the password on all CLIENT_GALLERY children referenced by that parent. Recipient emails are NOT propagated.
- `GET /api/read/collections/{slug}` — now intercepts synthetic slugs (`all-collections`, `all-blogs`, `all-portfolios`, `all-client-galleries`, `all-art-galleries`, `all-misc`) and returns a PARENT-shaped synthetic response. Visibility is environment-aware: dev returns LISTED + UNLISTED + HIDDEN; prod returns LISTED only.

### Removed endpoints

- `GET /api/read/collections/type/{type}` — superseded by synthetic per-type slugs. The FE helper `getCollectionsByType` is also gone.

### Response shape additions

- `CollectionModel` now carries `visibility: CollectionVisibility`, `rating?: number | null`, `people?: Person[]`. `visible: boolean` is gone — every consumer was swept in `3416660`.

### Response shape gaps (forward-compat work needed)

- `ContentModels.Collection` (Java record, the per-collection-content-block projection) does NOT carry `tags`/`people`/`locations`. The FE filter-bar wiring on synthetic /all-collections aggregates these from the content-block array — but the array contains `null`/`undefined` for those fields today. See "Forward-compat gaps" for the small Java change that lights this up.

---

## Frontend file changes (cumulative since session start)

**New files:**
- `app/types/CollectionVisibility.ts` — enum + label/description maps.
- `app/components/RatingStars/RatingStars.tsx` + `.module.scss` — a11y-correct 5-star control with click-to-clear and pending state.

**Updated files (notable ones):**
- `app/types/Collection.ts` — `visible` swapped to `visibility`; added `rating?: number`, `people?: Person[]`.
- `app/types/Content.ts` — `ContentCollectionModel` gained optional `rating`, `tags`, `people`, `locations` fields (currently unpopulated by the BE).
- `app/lib/api/collections.ts` — added `updateCollectionRating`, `setCollectionPeople`, `regenerateCollectionPeople`. Removed `getCollectionsByType`. `saveGalleryAccess` body type accepts `propagateToChildren?: boolean`.
- `app/(admin)/all-collections/page.tsx` — collapsed to `<CollectionPageWrapper slug="all-collections" />`.
- `app/(admin)/admin/adminTiles.ts` — `blogs` → `/all-blogs`, `client-galleries` → `/all-client-galleries`.
- `app/(admin)/collection/manage/[[...slug]]/ManageClient.tsx` — Visibility radio, RatingStars on home child rows, People section with set + regenerate, PARENT password confirm dialog.
- `app/components/ContentCollection/CollectionPage.tsx` — `showProtectedCovers` prop, visibility → block-visible derivation.
- `app/components/ContentCollection/CollectionPageClient.tsx` — text-box-as-header for cover-less PARENT collections.
- `app/utils/contentFilter.ts` — `extractFilterOptions` now aggregates from `ContentCollectionModel` children too (no-op until BE sends the data).

**Deleted:**
- `app/collectionType/[collectionType]/page.tsx` — superseded by `/[slug]/page.tsx` catching synthetic slugs.

---

## Forward-compat gaps (FE-relevant follow-up work)

These are the items where the FE wiring is in place but doesn't fully work end-to-end yet. Each is small and well-scoped.

### 1. `ContentModels.Collection` (Java record) needs to carry `tags` / `people` / `locations`

**Symptom:** open `/all-collections` in browser — cards render with cover images, clicks work, BUT the filter bar is empty / not rendered. The `extractFilterOptions` helper finds zero filterable dimensions because the per-collection content blocks don't carry these fields.

**Fix (backend, ~30 lines):**
- Add `Set<String> tags`, `List<Records.Person> people`, `String location` to the `ContentModels.Collection` record positional list.
- In `SyntheticCollectionResolver.toCollectionContent`, pass the child collection's `tags`, `people`, `location` into the constructor.
- Make sure `CollectionProcessingUtil.batchConvertToBasicModels` populates these fields on `CollectionModel` before the resolver consumes them. Tags + location may already be there; people just landed in commit `16fee7f`.

Once that ships, the filter chips light up automatically — no FE change required.

### 2. PARENT-type gallery-access UI

**Symptom:** the PARENT password trickle-down (BE + FE) is fully wired but you can't actually trigger it through the UI. `ManageClient.tsx` line ~1186 gates the gallery-access section to `updateData.type === CollectionType.CLIENT_GALLERY`. PARENT collections never render the form, so the new confirm dialog never fires.

**Fix (frontend, ~5 lines):** widen the gate to `[CLIENT_GALLERY, PARENT].includes(updateData.type)`. Verify the section's labels still make sense for PARENT (might need to relabel "Client Gallery Access" → "Gallery Access" when type is PARENT).

### 3. People manager picker can't auto-create new people

**Symptom:** in the People section on the manage page, the picker filters out person entries with `id <= 0` because the `PUT /people` endpoint reconciles by ID. So newly-typed-but-not-yet-saved people are silently dropped.

**Fix:** either (a) FE pre-creates the person via an existing `POST /people` endpoint before assembling the ID list, or (b) BE accepts people-by-name and auto-creates. Option (a) is closer to existing patterns elsewhere in the codebase.

### 4. `getAllCollectionsAdmin` is now dead code

`app/lib/api/collections.ts` still exports `getAllCollectionsAdmin()` (returns Spring Page envelope). The only caller (`app/(admin)/all-collections/page.tsx`) was migrated off it in commit `412167d`. Worth deleting on next pass; left in place to keep this PR scoped.

### 5. AdminHubGrid tests

There's a known pre-existing FE test failure in `tests/(admin)/admin/AdminHubGrid.test.tsx` and `tests/(admin)/admin/adminTiles.test.ts` — those tests reference an `AdminTileConfig.disabled` field that was removed during the admin-hub simplification. They predate this session and the user previously deferred fixing them. Worth a small sweep when convenient.

---

## Verification checklist (smoke)

When you re-run `start_backend` after the circular-dep fix (commit `af0a171`), the container should boot to "Started Application" instead of "APPLICATION FAILED TO START". Then in the browser:

- [ ] `/admin` — header bar present, dropdown opens, all 5 card tiles render with cover images, Clear Cache button reseeds the random covers (refresh after click → covers may differ).
- [ ] `/all-collections` — uniform card grid with covers, each clickable to `/{slug}`. (Filter bar will not render — see gap #1.)
- [ ] `/all-blogs` — same, filtered to BLOG type.
- [ ] `/all-client-galleries` — same, filtered to CLIENT_GALLERY. In dev you'll see UNLISTED ones too (that's intentional).
- [ ] `/collection/manage/some-blog` — Visibility radio works, save persists. Manage page now has a People section.
- [ ] `/collection/manage/home` — child collections show RatingStars; clicking a star fires `PATCH /api/admin/collections/{id}/rating` immediately.
- [ ] Existing pages (`/film`, `/{any-real-slug}`) still render exactly as before (HOME and per-collection pages NOT changed by this work).

---

## Test design caveat (the circular-dep lesson)

The session shipped 21 BE commits and a full `mvn test` reported 578 tests, all green — but the very first attempt to actually boot the backend failed with a Spring circular dependency between `CollectionService` and `SyntheticCollectionResolver`. The unit tests passed because both classes were mocked in isolation; the cycle only existed at real `ApplicationContext` construction.

The fix (`af0a171`) was easy. The deeper issue: this project has **exactly one** Spring context-loading test (`ApplicationTests.contextLoads`), and it has been `@Disabled` since the H2 → PostgreSQL migration with the comment "JPA entities removed during PostgreSQL migration." Nobody re-enabled it after switching to JDBC + Flyway.

**Recommended follow-up (not in scope for this branch):** add a `@SpringBootTest` smoke test that boots the real Spring context against a Testcontainers PostgreSQL container. Re-running Flyway migrations during the test would have caught:
- The circular bean dependency
- Any `@Profile("dev")` mismatch on a controller
- Column name typos in row mappers
- Missing `@Transactional` boundaries

Adds ~20 seconds to `mvn test` (one-time container spin-up). Catches every wiring regression at CI time instead of at `start_backend` time.

The current pattern of `@ExtendWith(MockitoExtension.class)` + `@Mock` + `@InjectMocks` everywhere is fast and isolates failures cleanly, but it cannot prove the system assembles. The right move is to keep mocks for behavior tests AND add an integration layer for wiring/SQL.

---

## Working-tree state at handoff

**Backend `/Users/themancalledzac/Code/edens.zac.backend`:**
- Branch: `0085-admin-hub`
- Working tree: clean
- HEAD: `af0a171`

**Frontend `/Users/themancalledzac/Code/edens.zac`:**
- Branch: `0135-admin-page`
- Working tree: 2 modified files (`jest.setup.ts`, `proxy.ts`) — these are pre-existing WIP from before this session, intentionally untouched.
- HEAD: `4866d4b`

**Neither branch is pushed.** Per project guidance, push + PR opening was held back for explicit user approval.

---

## Suggested PR shape

Given the scope, suggest two PRs (one per repo) reviewed together. Both should reference each other in their descriptions. PR titles, suggested:

- BE: `feat(collections): admin hub finalization + 3-state visibility + rating + synthetic slugs + collection_people`
- FE: `feat(collections): admin hub + visibility radio + rating stars + synthetic slugs + people manager`

Both PRs include the relevant migration files (V20, V21, V22) — make sure the deploy order is BE-first so migrations land before any FE call expects the new columns. Realistically the BE schema is forward-compatible (new column with safe default, no FE-side breaking change other than the type swap which is enforced at compile time by TS), so FE-first is also safe.
