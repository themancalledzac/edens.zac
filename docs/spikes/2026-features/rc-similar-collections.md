# RC — Related & similar collections

_Context file for board items RC1–RC5 on [2026-features.md](../2026-features.md). Source spec:
`docs/superpowers/specs/2026-08-30-similar-collections-research.md` (gitignored — everything an
item needs is copied here). The spike was grounded in a live audit of all 39 collections via
`localhost:8080/api/read/**` and a working similarity prototype run against real data._

## The feature in one paragraph

Every collection page gets an auto-computed "top 5 similar collections" list feeding the existing
Related section, derived fresh from metadata the backend already stores — never hand-curated,
never persisted. Curated sibling/parent links stay as high-precision signal. Later phases add CLIP
visual similarity, admin-suggested collections over the saved-filter engine (group CT), and a list
render-mode for embedded collection refs.

## Live-data facts (audited 2026-08-30, 39 collections / 949 unique images)

- Hierarchy: `home` → 6 children; `travel` → 13, `film` → 8, `adventure` → 7, `pnwer` → 4.
  Sibling pairs: `dolomites` ↔ `dolomites-film`, `porto` ↔ `porto-film`; payload carries
  `oneWaySiblingIds`.
- Signal coverage: locations good (30/39, Seattle links 6); parent/child good (38 links, 5 hubs);
  siblings sparse but precise (2 pairs); people moderate; 47/949 images shared across collections;
  collection-level `tags` **null/empty on every public payload**; image tags only on
  Lightroom-keyworded sets; `isFilm` inconsistent (see RC1).

## RC1 · Data bugs (backend) — BE#301 merged 2026-09-04; one measurement owed

1. ~~**`parents` is null on every public read**~~ **FIXED, BE#301.** `populateParents(model, true)`
   runs on the public read path (`CollectionService.java:164`), gated on `c.visibility = 'LISTED'`
   and `cc.visible = true`. **No frontend half exists:** `buildMetadataItems`
   (`app/utils/contentLayout.ts:468`) has read `collection.parents` since the Related section was
   built, `CollectionModel.parents` is typed at `app/types/Collection.ts:285`, and
   `tests/utils/contentLayout.test.ts` pins "appends a collection item per parent". Parents arrive
   without a cover (the backend deliberately loads none), so they render as text chips in the
   Related row — the existing mixed-row fallback, not a defect.
2. **`isFilm` unset on three film collections** — V62 (in BE#301) infers film from a stock or a
   flagged body and V23 flags exactly two bodies, so `chamonix-film` 0/5, `vienna-film` 0/5 and
   `gorge-50km-film` 0/7 (2026-08-30 numbers) may still read zero. **Re-measure against a live
   backend** (down on 2026-09-05; port 8080 is held by a Docker proxy that times out):

   ```bash
   for s in chamonix-film vienna-film gorge-50km-film dolomites-film; do
     curl -s "localhost:8080/api/read/collections/$s?page=0&size=50" \
       | jq -r --arg s "$s" '[.content[]|select(.contentType=="IMAGE")]
           | "\($s) \(map(select(.isFilm==true))|length)/\(length)"'
   done
   ```

   If any still reads zero, flagging a third body is a data call for Zac. Close RC1 on the numbers.

## RC2 · The v1 algorithm (no ML, no schema change)

Score for candidate B relative to current collection A:

| Signal                                                 | Weight                    | Source                               |
| ------------------------------------------------------ | ------------------------- | ------------------------------------ |
| A and B are parent/child                               | +5                        | `collection_content` COLLECTION rows |
| A and B are siblings (either direction, incl. one-way) | +5                        | `collection_sibling`                 |
| Co-children of a shared parent (excluding `home`)      | +3 per shared parent      | inverted child map                   |
| Shared images (Jaccard over image ids)                 | ×4                        | `collection_content`                 |
| Location overlap (Jaccard)                             | ×3                        | `collection_locations`               |
| People overlap (Jaccard)                               | ×2                        | `collection_people`                  |
| Image-tag overlap (Jaccard)                            | ×1.5                      | `content_tags`                       |
| Date proximity                                         | ×1, decay `exp(-days/90)` | `collection_date`                    |

Client galleries excluded as candidates. Hubs can appear (a parent is usually the most-related
page, as requested). Verified results on live data:

```
seattle-on-film → film (parent), california-2026, san-francisco-film, seattle-walks, sinclair
dolomites       → dolomites-film 14.05, adventure, travel, new-york-new-york, chamonix-film
chamonix        → chamonix-film, travel, geneva, nate-runs-chamonix
pnwer-2025      → pnwer, pnwer-2021, event (16 shared images)
event           → 2026-seahawks-parade, then the Seattle-location cluster
```

**Where it runs:** backend, `CollectionService` — a new read endpoint
(`GET /api/read/collections/{slug}/related?limit=5`) or an enriched field on the single-collection
payload. Computed per request over an in-memory candidate set, cached by the existing
`collection-{slug}` tag + 1h ISR on the FE. Nothing stored.

**Scaling:** at ~4,000 collections, pre-filter candidates by an inverted index (share ≥1
location/tag/parent/person); a nightly `collection_similarity` cache table is a later optimization
only, never a design change.

**Freshness:** reads the same rows every mutation path already touches; existing revalidation
covers it. No new invalidation machinery.

**FE side:** the Related section in `contentLayout.ts` swaps its source from `siblings + parents`
to the computed top-5 (per D1's answer, curated links may pin first). When the strong-relation
count exceeds 5, promote the chips to a full card-row block (backend-decided placement — the FE
already consumes synthesized layout items).

## RC3 · Collections_List render mode

A curated reusable list of collections IS a collection of COLLECTION refs (that's what `travel`,
`film`, `pnwer` are) — no new entity. Missing piece: a per-row display hint
(`render_mode: CARD | LIST`, or infer LIST when the referenced collection `hasChildren`) so an
embedded hub renders as a labeled card-row of its children instead of one parallax card. Visual
precedent: the Related card-row renderer in `CollectionContentRenderer.tsx`. The auto-injected
related block (RC2's >5 promote) is synthesized, never a DB row.

## RC4 · Suggested collections

A suggestion = a candidate membership query with no owning collection. Generate from
co-occurrence: location × `isFilm`, location × date window, tag clusters once auto-tagging lands.
Score by member count and cohesion; drop candidates whose member set ≈ an existing collection.
Surface as admin suggestion rows in the collection list (the manage list already renders synthetic
`TagViewModel` rows with `derived: true`, and Save-as-Collection exists — a suggestion row is the
same pattern with a prefilled query). **Suggest only; the human approves.** Blocked on RC1
(metadata quality) and CT3 (the saved-filter engine).

## RC5 · CLIP/pgvector tier (phase 2)

`edens.zac.ml` already computes a 768-D CLIP ViT-L/14 embedding per image during tagging; its own
README's top next step is persisting them via pgvector. The bridge: `content_image.embedding
vector(768)` written at tag time + batch backfill; collection embedding = centroid of members
(derived, never authored); `cosine(centroid_A, centroid_B) × weight` joins the RC2 score. Free
byproducts: image-level "more like this", natural-language search, better suggestion clustering.
RC2 does not wait on any of this.

## Decisions for Zac (D1–D6, from the spike — recommendations are the ticketed defaults)

- **D1 — Related source:** (a) computed top-5 replaces curated entirely; (b) curated pinned first,
  computed fills to 5. **Recommend (b).**
- **D2 — Where the score runs:** (a) per-request over an inverted-index candidate set, no storage;
  (b) nightly-precomputed table. **Recommend (a)** for v1.
- **D3 — Hubs as candidates:** (a) parents can occupy related slots; (b) parents render
  separately. **Recommend (a)** for v1.
- **D4 — Auto-promote threshold:** promote to a top-of-page card-row when strong-relation count
  exceeds 5, decided backend-side. Confirm threshold and placement.
- **D5 — Suggestion surface:** admin-only rows in the collection list (recommended) vs a dedicated
  review page; confirm suggest-only for v1.
- **D6 — pgvector commitment:** real infra decision (extension on RDS + local container). Affirm
  before RC5 is planned.

## Decisions already made (do not re-litigate)

- Small algorithm, no ML for v1 — verified sufficient on live data.
- Never store similarity in the DB — the requirement is derived-and-ever-updating.
- Suggest, don't auto-create programmatic collections.
- Collections_List needs no new entity.

## Build order (from the spike)

1. RC1 plumbing → 2. RC2 v1 (+RC3's promote rule) → 3. CT1–CT3 → 4. RC4 → 5. RC5 → 6. RC3 full +
   MA5. Items 1–2 are one plan; 3 is its own (existing spec, needs CT1's refresh).

## Closed

_Nothing yet._
