# CT — Collections-as-tags

_Context file for board items CT1–CT6 on [2026-features.md](../2026-features.md). Governing spec:
`docs/superpowers/specs/2026-07-06-collections-as-tags-design.md` (gitignored, and STALE — see
CT1). The user-stated product direction behind it (2026-07-06): treat collections as saved
tag-combination filters — `seattle` = ["seattle"], `seattle on film` = ["seattle","film"] — both
auto-growing over one archive. The deeper motivation (recorded 2026-06-29): ORGANIC EMERGENCE —
"lots of random collections that spring up organically, WITHOUT having to go through CREATING
them"; tagging is the act of organizing, collections crystallize out of metadata._

## The model (what survives from the spec)

A collection = presentation shell + membership source. Membership is either hand-placed rows or a
saved AND-tag query, materialized into `collection_content` with a `source` column and kept in
sync event-driven (with a nightly reconcile). "Film as a tag-generated collection",
"Seattle vs Seattle-on-Film", and "locations as programmatic overarching collections" are all
instances. Location-driven membership fits the same engine if `collection_query` allows a location
term alongside tags.

## CT1 · The spec refresh pass (docs-only, gates CT2–CT4)

The spec was written pre-V52 and will mislead a planner as-is. The refresh must:

- Recast the §5 type-by-type disposition table: `CollectionType` no longer exists — collections
  are typeless with `isClient`/`isBlog` booleans, PARENT derived via
  `hasChildren`/`childCollectionIds`, HOME via slug. New framing: client galleries (`isClient`)
  stay bespoke, blogs (`isBlog`) per the blog track, everything else is filter-capable.
- `DisplayMode FIXED` **has shipped on both sides** (`app/types/Collection.ts:16` is
  `'CHRONOLOGICAL' | 'ORDERED' | 'FIXED'`; `processContentBlocks` accepts it), but live data showed
  no row using it and MA1's step 10 plans to DROP it. CT1 decides whether the saved-filter model
  needs `FIXED` before MA1 deletes it — that is the coordination, not "verify whether it shipped".
- Incorporate one-way siblings (`oneWaySiblingIds` shipped) — sibling links are directional where
  relevant.
- Re-audit whatever backend V40–V52 changed beyond the type drop.
- Re-emit the D1–D12 decision matrix in current terms as a tracked doc in this directory, so CT2
  can be answered without reading the stale spec.

Also fold in the standing contradiction sweep from 2026-06-30 (recorded in MemPalace): the
2026-06-29 IA notes contain four ideas that conflict with decisions already made (type collapse,
named parent groups, tag-existence thresholds, random Home interspersal) — the refresh should
restate the settled answers so they are not re-opened.

## CT2 · Adjudicate D1–D12 — user decision, after CT1

## CT3 · The saved-filter engine — blocked on CT2

- Backend: AND-tag query (the current `tagIds` filter is OR-semantics in `ContentRepository`),
  `collection_content.source` column, event-driven membership sync + nightly reconcile.
- Frontend: live-mode "Save as Collection" (the one-click creation already exists for tag views;
  live mode keeps the query attached instead of snapshotting).
- This engine is the foundation for RC4 (suggested collections) and CT4.

## CT4 · Blog-as-date surface — blocked on CT2

User direction (2026-07-06): "blog" potentially a tag, but organization is per-DAY keyed on the
date itself, chronological, "fill as many days as possible, not only pictures." No `/blog` route
exists. Plank C of the 2026-07-19 debloat review; its D5 trigger-scope decision is unexecuted.
`isBlog` exists and `Badge.tsx` already renders `'Story'` from it.

## CT5 · Auto-tag endpoint + admin button — COLD, independent

Collection tags Phase 1 (manual entry on manage page) shipped as PR #167. Phase 2:
`POST /collections/{id}/auto-tag` (verified missing — zero hits in backend `src/main/java`), the
admin "Auto-populate from images" button, and the optional public collection-page tag-chip
display. Note the production tag layer is nearly empty (collection `tags` null/empty on every
public payload — see RC live-data audit), so auto-tag is also what makes RC4 suggestions viable.

## CT6 · Tag `type`/visibility model — COLD

From the 2026-08-02 filter-consolidation follow-ups: a `type` column on `TagEntity` (explicitly
NOT generic key-value), migration, DTO threading, admin UI, and a backfill decision. The
principled version of the shipped workaround: collection pages hide both tag surfaces (the Tags
dropdown and the TEXT-block tag chips, removed in `81ca206`) because tags carry no type to tell a
display tag from an organizational one. That workaround is "D5" only in the gitignored 2026-08-02
filter-consolidation spec — the refactor board's D5 is an unrelated proxy fix. Small backend design
confirm, then mechanical.

## Related debloat-review leftovers (2026-07-19, planks that did NOT ship)

Tracked here so they surface when CT work starts, verified 2026-08-30 unless noted:

- **D2 unlisted-by-default on create** — the review found `applyTypeSpecificDefaults` flips the
  HIDDEN entity default to LISTED on every create (a privacy drift) and recommended shipping the
  fix first, independently. No evidence it shipped, and nothing here re-verified it. It is a
  backend bug, not a feature, and it has no row on any board: it is listed as a question in
  [backend-handoff-MA1-EM2.md](backend-handoff-MA1-EM2.md) so the backend agent can confirm or
  dismiss it.
- **D4 synthetic-slug prune** — FE partly done (`/all-collections` deleted; `all-client-galleries`
  survives); backend slug catalog unpruned.
- **D9** full ancestor-walk cycle validation, **D10** chronological-by-default for existing rows —
  backend, unexecuted.

## Closed

_Nothing yet._
