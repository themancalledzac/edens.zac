# Handoff to the backend agent — RC3, a child summary on the COLLECTION content block

**Written 2026-09-02 by the frontend session. No code was written and no backend branch exists.**

RC3 asks for an embedded collection that is itself a hub to render as a labeled card-row of its
children rather than as one parallax card. The board filed it COLD and small. It is neither: the
frontend cannot make the LIST-vs-CARD decision, because nothing in what the backend sends says
whether the referenced collection has children.

This document is the whole ask. Unlike the MA4/RC1 handoff, there is nothing to review and no
branch to take over.

---

## The finding, and how it was checked

Both sides were read on `origin/main`, not inferred from one.

**Frontend.** `ContentCollectionModel` (`app/types/Content.ts:338-392`) is the content-model member
for a COLLECTION row. It carries `slug`, `referencedCollectionId`, `coverImage`, `rating`,
`collectionDate`, `tags`, `people`, `locations`, `visibility` and the three booleans. No
`hasChildren`, no `children`, no `contentCount`.

**Backend.** `ContentModels.Collection` (`src/main/java/edens/zac/portfolio/backend/model/ContentModels.java:236`)
is the record it maps from. Twenty-one components, and none of them describe children:

```bash
git show origin/main:src/main/java/edens/zac/portfolio/backend/model/ContentModels.java \
  | grep -n 'record Collection' -A 30
```

The aggregated `tags` / `people` / `locations` block is the nearest thing, and its own docblock says
it exists so synthetic PARENT pages can populate a filter bar. It is present on a childless
collection too, so it answers nothing.

## Why there is no frontend-only path

The only way to learn a referenced collection's children from this repo today is to fetch each one:
`getCollectionBySlug` (`app/lib/api/collections.ts:106-124`), once per embedded collection on the
page, at render time, each returning a full content page. That is a request per card for a layout
hint. It was considered and rejected rather than not thought of.

## The ask

One field on the COLLECTION content block, ideally two:

- `hasChildren: boolean` — enough on its own to pick the render mode.
- `children: [{ id, name, slug, coverImageUrl }]`, capped at some N — what the LIST row would
  actually draw. Without it the frontend has the verdict but nothing to render, and is back to a
  fetch per row. Use `name`, not `title`: the frontend's existing related-list type is
  `CollectionListModel { id, name, slug?, coverImageUrl? }` (`app/types/Collection.ts:69-81`) and
  `buildMetadataItems` reads `related.name`, so that shape drops straight in.

**This is serialization, not new logic.** The value already exists server-side: `hasChildren` is on
the admin manage DTO today, surfaced to the frontend as `CollectionUpdateResponseDTO.hasChildren`
(`app/types/Collection.ts:381`), documented there as "server-derived parent-ness over the WHOLE
content graph". The computation is written; it just does not reach the public content block.

Worth deciding on your side: whether `children` should honour the same two visibility gates RC1
applied to `parents` — `c.visibility = 'LISTED'` and `cc.visible = true`. The same reasoning holds,
and a hidden child surfacing in a public card-row would be the same disclosure RC1 closed.

## What is NOT being asked for

**Do not reuse `DisplayMode`.** `DisplayMode` (`CHRONOLOGICAL | ORDERED | FIXED`) shipped and
`FIXED` exists, which makes it look like the per-row display hint the board's row describes. It is
not. It is a per-collection sort key, read on the collection being _viewed_, and the frontend
consumes it only to decide chronological sorting (`app/utils/contentLayout.ts:408-421`). Using it
as a render hint on a _referenced_ collection would overload one enum with two unrelated meanings
on two different collections.

**RC3 is not RC2.** RC2 is the weighted similarity score and is blocked on the owner's decision #1.
The frontend guardrail for this run was explicitly not to touch what feeds the Related section, and
nothing here does.

## The frontend half, once the field lands

Small and localized, and it needs no new component:

- Branch inside `transformCollectionBlocks` (`app/utils/contentLayout.ts:309-320`), which is where
  a COLLECTION block is flattened into a parallax card by `convertCollectionContentToParallax`.
  That flattening is why `CollectionContentRenderer` has no COLLECTION case to add one to — by the
  time a block reaches the renderer it is an image with a slug.
- Render the LIST case with `CoverCard` (`app/components/ui/CoverCard/CoverCard.tsx`) in a wrapping
  row, modeled on `LocationCollections` (`app/components/LocationPage/LocationCollections.tsx:14-31`),
  which is already a labeled row of collection cards and is reusable.

The Related section's card-row is inlined JSX inside the TEXT branch
(`CollectionContentRenderer.tsx:402-442`), not a component. It is the visual target, not something
to call — reaching for `CoverCard` avoids extracting it and avoids touching Related at all.

Sizing note for whoever picks up the frontend half: a LIST row is a different shape from the
parallax card it replaces, so it needs its own entry in the row-rating model
(`contentRatingUtils` rates a card-with-slug at 4) rather than inheriting the card's.

## Board bookkeeping

RC3 keeps a row on the frontend board, moved COLD → BLOCKED, so no frontend session picks it up
believing it is startable. The frontend does not write to `edens.zac.backend`; cross-repo items get
specced here and handed over, which is what this document is.
