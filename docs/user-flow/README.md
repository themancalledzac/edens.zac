# edens.zac — Collection Map & User Flow

This doc holds two things side by side:

1. **As-built** — a living map of the **collections that actually exist on the site today** and how
   a visitor moves between them (the _content graph_, not the component/auth plumbing).
2. **Target model** — the agreed tag-forward direction we're evolving toward (see
   [§ Target model](#target-model--tag-forward-collections) below). Full design in the spec.

> As-built data pulled live from `localhost:8080/api/read/collections/<slug>` (which serves prod data)
> on **2026-06-29**. Re-run / re-crawl to refresh.

> ⚠️ **This crawl predates the typeless-collection migration (shipped 2026-07, PRs #233/#234/#235).**
> Collections no longer carry a type: `CollectionType` and `collection.type` are deleted (backend
> `V52__drop_collection_type.sql`). The old `Type` column below is now a `Kind` column, re-keyed to
> what each row is **today**; the crawl-time labels survive in parentheses only as provenance. The
> mapping is: `CLIENT_GALLERY` → `isClient`, `BLOG` → `isBlog`, `PARENT` → derived from
> `hasChildren`, `HOME` → `slug === 'home'`, and `PORTFOLIO` / `ART_GALLERY` / `MISC` → **gone, no
> successor** — those rows are simply collections now. The membership graph itself is unaffected,
> which is why this map is still useful. **Re-crawl before trusting the counts.**

## Files

| File                                                                    | What it is                                        | Use                                                                                 |
| ----------------------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `current-user-flow.svg`                                                 | The **as-built** flowchart (vector).              | Drag into **Figma** → imports as editable shapes. Open in the Launch preview panel. |
| `current-user-flow.mmd`                                                 | Mermaid source of the as-built map.               | Import to **FigJam** via the _Mermaid → Flow_ plugin; quick edits in PRs.           |
| `README.md`                                                             | This doc — as-built inventory **+ target model**. | The thing we keep adding to.                                                        |
| `../superpowers/specs/2026-06-29-collection-ia-and-user-flow-design.md` | The full **target design spec**.                  | Source of truth for the model + migration + decisions.                              |

---

## The collections, as published today

**6 tiles on Home** → 3 parent hubs + 3 leaves:

- **Film** · **Adventure** · **Travel** — parents, because they hold collection references (derived)
- **Event** (home only) · **Hidden Lake** (blog) · **Gorge Climbing** (blog)

**19 unique child collections.** A collection can sit under **several** parents — that
cross-membership is the most important part of the flow. `Kind` is the current model; the
parenthesised label is the type this row carried at crawl time, kept only as provenance:

| Collection           | Kind                  | Film | Travel | Adventure | Home | Related ↔          |
| -------------------- | --------------------- | :--: | :----: | :-------: | :--: | ------------------ |
| California 2026      | collection (was PORT) |  ●   |   ●    |           |      |                    |
| Dolomites (film)     | collection (was PORT) |  ●   |   ●    |     ●     |      | ↔ Dolomites        |
| Gorge 50km (film)    | collection (was PORT) |  ●   |        |           |      |                    |
| Lisbon (film)        | collection (was ART)  |  ●   |   ●    |           |      |                    |
| NYC (film)           | collection (was PORT) |  ●   |   ●    |           |      |                    |
| Porto (film)         | collection (was PORT) |  ●   |   ●    |           |      | ↔ Porto            |
| San Francisco (film) | collection (was PORT) |  ●   |   ●    |           |      |                    |
| Seattle on Film      | collection (was PORT) |  ●   |        |           |      |                    |
| Chamonix             | `isBlog`              |      |   ●    |           |      |                    |
| Geneva               | `isBlog`              |      |   ●    |           |      |                    |
| New York New York    | collection (was PORT) |      |   ●    |           |      |                    |
| Porto                | collection (was PORT) |      |   ●    |           |      | ↔ Porto (film)     |
| Vienna (film)        | collection (was PORT) |      |   ●    |           |      |                    |
| Dolomites            | collection (was PORT) |      |   ●    |     ●     |      | ↔ Dolomites (film) |
| Enchantments 2020    | `isBlog`              |      |        |     ●     |      |                    |
| Nate Runs Chamonix   | collection (was PORT) |      |        |     ●     |      |                    |
| Run                  | collection (was PORT) |      |        |     ●     |      |                    |
| Hidden Lake          | `isBlog`              |      |        |     ●     |  ●   |                    |
| Gorge Climbing       | `isBlog`              |      |        |     ●     |  ●   |                    |
| Event                | collection (was PORT) |      |        |           |  ●   |                    |

Plus a separate **Client Galleries** cluster of **14** `isClient` items reached via
`/all-client-galleries` (incl. two client parents, _Edens Family_ and _Weigel Family_). Guests
unlock each with a per-collection password; logged-in members see their own.

## How a visitor moves today

1. **Home → parent → child.** Click a parent tile (Film/Adventure/Travel), then click a child
   collection card → `/[childSlug]`.
2. **Related links.** A collection page lists sibling collections as "Related" links — but
   **only two pairs exist** (Dolomites ↔ Dolomites (film), Porto ↔ Porto (film)).
3. **Taxonomy.** `/explore` → `/tag/[slug]` and `/location/[slug]` group images across collections.
4. **Home.** The logo is the **only** "up/back" — there are no breadcrumbs.
5. **Logged in.** A "Me" tile appears on Home → `/user` (your galleries + tagged content).

## What the live data tells us (the gaps worth fixing)

- **Cross-membership is rich but invisible.** `dolomites-film` lives under Film **and** Adventure
  **and** Travel, yet a visitor inside Travel has no idea it's also an Adventure entry point.
- **"Related" is nearly empty.** 2 links across 24 collections. The graph is far more connected
  than the UI exposes.
- **No "up."** Children's reverse `parents` array comes back **empty** from the API, so there's
  no data to build a breadcrumb or a "back to Travel" affordance.
- **Inconsistent parenting.** Most `*-film` collections are dual-parented (Film + Travel), but
  `vienna-film`, `seattle-on-film`, and `gorge-50km-film` are not — likely data drift.
- **Dead-end leaf.** `Event` has no parent, no siblings, no related — once you're there, the only
  way onward is the logo.
- **Only 6 of 24 collections are reachable from Home** without drilling into a parent.

---

<a id="target-model--tag-forward-collections"></a>

## Target model — tag-forward collections

Brainstormed 2026-06-29. **Full design + migration + decisions live in the
[spec](../superpowers/specs/2026-06-29-collection-ia-and-user-flow-design.md)** — this is the summary.

**Two primitives** _(amended 2026-07-28 — the "Type" half of this went further than the spec proposed)_

- ~~**Type = format** (Blog · Portfolio · Gallery · Client)~~ — **superseded.** The typeless migration
  did not slim the enum down to four formats; it **deleted the enum outright**. What remains is two
  stored booleans, `isClient` and `isBlog`, and nothing else. Portfolio and Gallery have no successor
  concept — a collection with neither flag is simply a collection, presented by what it contains.
- **Tag = theme** (travel · adventure · film · event · climbing…) — how things are _organized & found_.
  One shared vocabulary across images **and** collections. **This half shipped as designed.**

**Tags emerge as collections (the core idea — zero creation step)**

- **Any tag is a browsable (virtual) collection** at `/{name}` — derived live, no DB row. Tag things
  and the grouping exists; it keeps auto-growing. Routing is unified: `/{slug}` resolves to a real
  collection _or_ a tag-view, both rendered the same.
- **Governance by scope:** a tag-view is built from the **collections** carrying the tag (deliberate),
  so auto image-tags don't spawn junk hubs. Tagged images show as a secondary section.
- **Featured tags** (a curated few, flagged on the tag with cover/order) are Home's main groups —
  still virtual, still auto-growing.
- **"Convert to full collection"** (manage page) = a **one-way snapshot**: adopts the tag-view's
  current members as explicit content, the collection takes over the slug, and the tag stops driving
  it. For one-offs you want to freeze/editorialize. **Marquee themes never convert** (they must keep
  growing). Schema cost: 3 columns on the tag entity.
- **Custom static parents** remain for deliberate hand-built compositions ("Family Vacations").

**Every collection is a crossroads** — up (breadcrumb) · lateral (Related) · cross-lens (metadata
chips → the tag's view) · save (→ Your Space). No more dead ends.

**Manual now → automated later** (design the slot, fill it later): **Related** (curated `collection_sibling`
→ auto-suggested from date/theme/people/place) and **Tags** (hand-applied → CLIP auto-tagging; `film`
from image `isFilm`).

### How today's gaps map to the target

| As-built gap (above)             | Target resolution                                                               |
| -------------------------------- | ------------------------------------------------------------------------------- |
| Cross-membership invisible       | A collection's tags _are_ its memberships; metadata chips jump to each tag-view |
| "Related" nearly empty (2 pairs) | Related is a manual-now/auto-later slot (date/theme/people/place)               |
| No "up" / logo is the only back  | Breadcrumbs `Home › Travel › Porto` (arrived-by context)                        |
| Parenting drift (`vienna-film`…) | Fixed by tagging — no link surgery; `film` later auto-derived from `isFilm`     |
| `Event` is a dead-end leaf       | Tag `event` → joins the Event view; crossroads gives it a next step             |
| Only 6/24 reachable from Home    | Featured tag-views + Explore/Search surface the rest                            |

### Migration of today's 24 collections (summary)

Backfill `film`/`travel`/`adventure`/`event` tags from the existing parent links (deterministic,
diff-verifiable); flag those tags **featured**; retire the old `Travel`/`Film`/`Adventure` parent
rows (their slugs are served by the auto-growing tag-views). Blogs keep `isBlog`; client galleries
unchanged. Full table + risk notes in the spec (§6).

> **Status note (2026-07-28).** The separate typeless-collection migration has since landed and
> partly overtakes this plan. Backend `V50` seeded transitional `Portfolio` / `Art Gallery` label
> tags, then `V51` deleted them again by decision D6 — that grouping was **dropped, not converted
> to tags**, so do not expect `/portfolio` or `/art-gallery` tag views to exist. The theme-tag
> backfill described above is still unbuilt and still the plan.
