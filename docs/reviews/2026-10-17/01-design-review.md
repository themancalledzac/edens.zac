# Design review: mobile first

Reviewed 2026-10-17 at `main` @ `9f7302b7` (plus the uncommitted `mobileChunkSize` working-tree diff, which touches none of the areas below). Looked at: the public site and the admin area on the dev server at `localhost:3001`, anonymous session, 393x852 iPhone viewport first and 1440x900 desktop second. For Zac, who will decide and then build.

## Thesis

The site has one visual language for its controls (the hairline chip) and three places that ignore it: the Related pills, the admin list panels and the fullscreen viewer. The mobile collection page spends 309 px between the cover and the first photo, and about 57 px of that is padding and empty gaps. The "page shifts while images load" complaint is real but misdiagnosed: image bytes cause zero layout shift (CLS 0 measured four times); the footer streams before the page because `app/loading.tsx` is a bare spinner and `app/layout.tsx` renders `<Footer />` outside the Suspense boundary. There is also a plain regression: message rows on `/admin` and `/comments` have rendered unstyled since 2026-08-22 because the SCSS classes they read were deleted. First three things to do: restore the message-row styles, move the footer into the page tree and give `loading.tsx` the real page frame, then fix the collection info block (density on the chip row, dead gaps removed, parent covers from the backend).

## Contents

1. [Collection page info block](#1-collection-page-info-block)
2. [Related items](#2-related-items)
3. [Heart overlay](#3-heart-overlay)
4. [First paint and the footer](#4-first-paint-and-the-footer)
5. [Menu and navigation](#5-menu-and-navigation)
6. [Admin page and list panels](#6-admin-page-and-list-panels)
7. [All-images header](#7-all-images-header)
8. [Design system](#8-design-system)
9. [Priority list](#9-priority-list)
10. [Appendix](#appendix)

## 1. Collection page info block

### What is wrong

![Zac's own capture of /dolomites-film signed in: 24 px of blank between the date rule and RELATED, pills beside a cover tile, four chip rows, the density control alone on the last row.](screenshots/user-dolomites-film-info-component.png)

![The same page anonymous at 393x852, captured for this review. Look at the gap under the date rule and the empty space to the left of the density buttons.](screenshots/m-collection-dolomites-film-top.png)

Measured at 393x852 on `/dolomites-film`, anonymous:

| Item | Value |
| --- | --- |
| Cover row | y 71, 393x393 |
| Info row (date, location, Related, filter bar) | y 468, 309.4 px tall |
| First grid row starts | y 781 |
| Metadata part (`.metadataBlockInner`) | 156 px, of which 44 px is padding and gaps |
| Empty description container | 0 px tall, but adds two 12 px gaps (24 px blank under the date rule) |
| Filter bar | 151.4 px, of which 13 px is padding |
| Chip rows | 3, starting y 635, 673, 710; chips 29.6 px tall, 8 px apart |
| Fourth row (reset x + density) | density group 115x25, segments 33x25, 6 px below the last chip row |
| Padding and empty gaps in the 309 px block | about 57 px |

Three problems, in order of how much height they cost:

1. The density control sits on its own row with empty space to its left, under three chip rows. On desktop it shares the row.
2. Twenty-four pixels of nothing between the date rule and the RELATED label, plus 8 px of `padding-top` on the Related container on top of that.
3. Three flat date chips ("Sep 30, 2025", "May 8, 2026", "Jun 5, 2026") fill a whole row by themselves because the flat-date limit was sized for desktop width.

Chips themselves: 4 px 12 px padding, 0 margin, 1 px `#e5e5e5` border, 4 px radius, 14 px / 500. The 12 px side padding on a 14 px label is what reads as "too much padding". The Order chip is 78.6 px wide for a five-letter label because it reserves space for a trailing arrow that only shows when active.

The People dropdown opens as a small box over the date chip row ([m-collection-dolomites-film-filter-people-open.png](screenshots/m-collection-dolomites-film-filter-people-open.png)). On a phone a popover anchored under a chip is cramped; section 5 proposes a bottom sheet for it.

### Why (in the code)

Density row. `.toolbar` wraps under 768 px and `.controls` (the chip cluster) gets a hard floor: [FilterToolbar.module.scss:60-66](../../../app/components/ui/FilterToolbar/FilterToolbar.module.scss#L60-L66) sets `flex: 1 0 240px`, and `flex-shrink: 0` means it never goes under 240 px. `.trailing` (reset x and density) is `flex: 0 0 auto; margin-left: auto` ([:126-135](../../../app/components/ui/FilterToolbar/FilterToolbar.module.scss#L126-L135)) and never shrinks. Trailing width from the tokens: reset about 27 px ([:193-205](../../../app/components/ui/FilterToolbar/FilterToolbar.module.scss#L193-L205)), three 33 px density segments with an 8 px gap = 115 px ([DensityTierControl.module.scss:11](../../../app/components/ui/FilterToolbar/DensityTierControl.module.scss#L11), [:18-29](../../../app/components/ui/FilterToolbar/DensityTierControl.module.scss#L18-L29)), plus the 8 px gap between them ([:133](../../../app/components/ui/FilterToolbar/FilterToolbar.module.scss#L133)): about 150 px. Measured: 115 px group, 27.3 px reset.

| Viewport | Toolbar row width (12 px side padding) | Needed to share (240 + 4 + 150) | Shares? |
| --- | --- | --- | --- |
| 360 | 336 | 394 | no |
| 375 | 351 | 394 | no |
| 393 | 369 | 394 | no |
| 414 | 390 | 394 | no |
| 418 | 394 | 394 | yes |

The measured table in the docblock at [FilterToolbar.module.scss:35-54](../../../app/components/ui/FilterToolbar/FilterToolbar.module.scss#L35-L54) claims 375 px shares. It predates the density group's gap going from 4 px to 8 px and is stale.

A second cost of the wrapped row: the `.toolbar` row gap is `--space-1` (4 px) ([:14](../../../app/components/ui/FilterToolbar/FilterToolbar.module.scss#L14)). The density segments' coarse-pointer overlays overhang 9.5 px ([DensityTierControl.module.scss:49-51](../../../app/components/ui/FilterToolbar/DensityTierControl.module.scss#L49-L51)) and reach about 5 px into the chip row above, painting later in DOM order. That is the tap-steal the `.controls` invariant at [:106-112](../../../app/components/ui/FilterToolbar/FilterToolbar.module.scss#L106-L112) was written to prevent, now between two rows the invariant does not cover. Unverified by touch testing.

Dead gaps. `.metadataBlockInner` has `padding: 12px` and `gap: 12px` ([ContentComponent.module.scss:405-423](../../../app/components/Content/ContentComponent.module.scss#L405-L423)). `.metadataDescriptionContainer` is always rendered ([CollectionContentRenderer.tsx:435](../../../app/components/Content/CollectionContentRenderer.tsx#L435)) because on desktop it is the flex-grow spacer that pins the toolbar to the bottom of the rail ([ContentComponent.module.scss:515-519](../../../app/components/Content/ContentComponent.module.scss#L515-L519), [CollectionContentRenderer.tsx:99-100](../../../app/components/Content/CollectionContentRenderer.tsx#L99-L100)). On mobile `.metadataBlockInner` is `flex: 0 0 auto` ([:64-65](../../../app/components/Content/ContentComponent.module.scss#L64-L65)), nothing grows, and the empty container only costs a gap step. `.metadataSiblingsContainer` adds `padding-top: var(--space-2)` on top of the gap ([:557](../../../app/components/Content/ContentComponent.module.scss#L557)).

Date chips. `MAX_FLAT_DATE_CHIPS = 5` at [FilterToolbar.tsx:171](../../../app/components/ui/FilterToolbar/FilterToolbar.tsx#L171), used at [:268](../../../app/components/ui/FilterToolbar/FilterToolbar.tsx#L268). Each flat date chip is 100 to 119 px wide, so three of them fill a 369 px row.

Chip padding. [FilterChip.module.scss:6](../../../app/components/ui/FilterChip/FilterChip.module.scss#L6) `padding: var(--space-1) var(--space-3)`. The gap between chips, `--space-2` (8 px) at [FilterToolbar.module.scss:113](../../../app/components/ui/FilterToolbar/FilterToolbar.module.scss#L113), is pinned by the 44 px coarse-pointer overlay: at 4 px the overlays of a wrapped row stole taps from the row above ([:106-112](../../../app/components/ui/FilterToolbar/FilterToolbar.module.scss#L106-L112)). Do not lower it without lowering `--touch-target-min`. The border is `1px solid var(--color-border)` ([:15](../../../app/components/ui/FilterChip/FilterChip.module.scss#L15)), `#e5e5e5`, and is already faint. What reads as heavy is four rows of 12 px padded boxes, not the border weight.

Keep the border. It is the chip look of the whole site (FilterChip, DensityTierControl segments at [DensityTierControl.module.scss:29](../../../app/components/ui/FilterToolbar/DensityTierControl.module.scss#L29), SegmentedChip at [SegmentedChip.module.scss:13](../../../app/components/ui/SegmentedChip/SegmentedChip.module.scss#L13), the admin role chips). The film/digital tri-state is carried by `border-style: dashed | dotted` ([FilterChip.module.scss:75-81](../../../app/components/ui/FilterChip/FilterChip.module.scss#L75-L81)); a borderless chip has no tone signal. The dropdown trigger ("People") needs to read as a control. A bottom-hairline-only chip is a tab metaphor for single-select, and these are multi-select toggles.

The uncommitted `densityPinned` change at [CollectionPageClient.tsx:588-602](../../../app/components/ContentCollection/CollectionPageClient.tsx#L588-L602) withholds the density control on mobile when a page pins `mobileChunkSize` (home). The density-row fix does not apply there because there is no density control to place.

### What we will do

Target mobile layout with no description: about 230 px instead of 309, five chip boxes instead of eight. Every spacing rule below is scoped to `width < 768px` unless noted. Desktop keeps the side-by-side rail.

```
┌──────────────────────────────────────────────┐
│ ▓▓▓▓▓▓▓ cover, title overlay ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
├──────────────────────────────────────────────┤  2px rule (keep)
│ 2025-09-02                    Dolomites, Italy│  date · location (keep)
│ ─────────────────────────────────────────────│  hairline (keep)
│ Description text, when present               │  only when present; no spacer on mobile
│ RELATED                                      │
│ [Film ▣][Adventure ▣][Travel ▣][Dolomites ▣]▸ │  parents first, 96x48 cover tiles,
│                                              │  one horizontal strip, last tile peeks
│ ─────────────────────────────────────────────│  bar rule
│ [People ▾] [Date ▾]                          │  overflow row, wrap-reverse as today
│ [Order] [Highly Rated] [2025] [2026] [▣|▦|▩] │  bottom row: chips + joined density
└──────────────────────────────────────────────┘
```

1. Density joins the bottom chip row. [FilterToolbar.module.scss](../../../app/components/ui/FilterToolbar/FilterToolbar.module.scss): lower the floor and open the row gap so the overlays clear each other. Replace the stale table at `:35-54`.

   ```scss
   .toolbar {
     gap: var(--space-2) var(--space-1);

     @media (width < 768px) {
       flex-wrap: wrap;
       .controls { flex: 1 0 180px; }
     }
   }
   ```

   With trailing at about 150 px: 369 - 4 - 150 = 215 px at 393, 336 - 4 - 150 = 182 px at 360, both over 180. "Order" + "Highly Rated" (62 + 105 + 8 = 175 px) fit beside the density. The manage slider variant (about 221 px trailing) still takes its own line, as today.

2. Join the density segments the way SegmentedChip does ([SegmentedChip.module.scss:8-33](../../../app/components/ui/SegmentedChip/SegmentedChip.module.scss#L8-L33)): one outer border, dividers between items. [DensityTierControl.module.scss](../../../app/components/ui/FilterToolbar/DensityTierControl.module.scss):

   ```scss
   .group {
     gap: 0;
     border: 1px solid var(--color-border);
     border-radius: var(--radius-1);
   }
   .segment {
     border: none;
     & + & { border-left: 1px solid var(--color-border); }
   }
   ```

   Group goes from 115 px to about 97 px, trailing to about 132 px, and the density reads as one control. Adjacent 44 px overlays then overlap by about 6 px; SegmentedChip already accepts that ([:5-7](../../../app/components/ui/SegmentedChip/SegmentedChip.module.scss#L5-L7)). Do both 1 and 2.

3. Remove the dead vertical space. [ContentComponent.module.scss](../../../app/components/Content/ContentComponent.module.scss):

   ```scss
   .metadataBlockInner {
     gap: var(--space-2);                 /* mobile only; desktop keeps --space-4 at :421 */
   }

   .metadataDescriptionContainer {
     @media (width < 768px) {
       &:empty { display: none; }
     }
   }

   .metadataSiblingsContainer {
     padding-top: 0;
   }
   ```

   `:empty` matches because React renders the container with no children when `descriptionItem` is undefined ([CollectionContentRenderer.tsx:449-453](../../../app/components/Content/CollectionContentRenderer.tsx#L449-L453)). In inline-edit mode the editor is always rendered, so the rule never hides it. Alternative with no CSS trick: do not render the container on mobile when there is nothing to show, using the `isMobile` prop already in scope at [:107](../../../app/components/Content/CollectionContentRenderer.tsx#L107).

4. Collapse flat date chips on phones. [FilterToolbar.tsx](../../../app/components/ui/FilterToolbar/FilterToolbar.tsx): add a `flatDateLimit` prop (default `MAX_FLAT_DATE_CHIPS`), and pass `isMobile ? 2 : MAX_FLAT_DATE_CHIPS` from [CollectionContentRenderer.tsx:475](../../../app/components/Content/CollectionContentRenderer.tsx#L475). `isMobile` comes from the SSR viewport props, so there is no post-hydration reflow, which was the docblock's reason for a fixed count ([:166-170](../../../app/components/ui/FilterToolbar/FilterToolbar.tsx#L166-L170)). Three dates become one "Date" dropdown chip and the bar drops a row. Tests: [tests/components/ui/FilterToolbar.test.tsx](../../../tests/components/ui/FilterToolbar.test.tsx).

5. Chip padding. [FilterChip.module.scss:6](../../../app/components/ui/FilterChip/FilterChip.module.scss#L6):

   ```scss
   padding: var(--space-1) var(--space-2);
   ```

   Eight pixels back per chip, roughly one more chip per row. Keep gap, border, radius and opacity. Change the two controls that match FilterChip by token so the bar stays uniform: [SegmentedChip.module.scss:40](../../../app/components/ui/SegmentedChip/SegmentedChip.module.scss#L40) and the role chips in [UserRolesSection.tsx](../../../app/components/UserForm/UserRolesSection.tsx) (their SCSS was not read; find the `--space-3` horizontal padding there). The density segment already uses `--space-2` horizontally ([DensityTierControl.module.scss:23](../../../app/components/ui/FilterToolbar/DensityTierControl.module.scss#L23)).

6. Stop reserving arrow width on the inactive Order chip, or accept it. The 78.6 px box for "Order" is visible in [m-collection-dolomites-film-filter-order-open.png](screenshots/m-collection-dolomites-film-filter-order-open.png). The cause was not traced to a line; look in [FilterChip.module.scss:101-106](../../../app/components/ui/FilterChip/FilterChip.module.scss#L101-L106) (trailing slot) first.

Desktop impact: items 1, 2 and 5 are global or mobile-scoped as shown; the desktop toolbar is `nowrap`, so the floor never applies. Item 3's `:empty` rule is mobile-only; on desktop the empty container must keep existing as the flex spacer ([ContentComponent.module.scss:66-77](../../../app/components/Content/ContentComponent.module.scss#L66-L77)). The `/user` page renders the same rail with no date, location or related items, so items 1 and 3 improve it too, and [user-all-images-filters.webp](screenshots/user-all-images-filters.webp) shows the same density-on-its-own-row problem on `/all-images`.

On desktop ([d-collection-dolomites-film-top.png](screenshots/d-collection-dolomites-film-top.png)) the info column has about 270 px of white between the date line and RELATED, because the description spacer pushes Related and the chips to the bottom of the rail. That is the design working as built. Whether Related should sit under the date instead is an open question below.

### Open questions

1. Desktop rail: should Related sit directly under the date/location row, with only the filter bar pinned to the bottom? Options: (a) keep as is, Related rides with the toolbar at the bottom; (b) move `.metadataSiblingsContainer` above the spacer so it follows the date. (b) is a one-line reorder in `CollectionContentRenderer.tsx`.
2. If after items 4 and 5 the chips still read heavy: the viable alternative is borderless with a `var(--color-surface-raised)` fill and the active state still inverted. That is a separate decision touching FilterChip, SegmentedChip, DensityTierControl and the admin role chips.

## 2. Related items

### What is wrong

On `/dolomites-film` the Related row is one 110x55 cover tile (Dolomites, radius 4 px) next to three grey pills (Adventure, Film, Travel; radius 9999 px, 4 px 12 px padding, 14 px text). The pills are the only `--radius-round` chips on the site; the filter chips 40 px below are 4 px rectangles with the same padding and text size. On `/pnwer-2026` the Related entry is the plain text link "PNWER" with no card and no chip ([m-collection-pnwer-2026-top.png](screenshots/m-collection-pnwer-2026-top.png)), so the same kind of link has three looks across two pages.

"Film" has no image because the backend sends `coverImageUrl: null` for every parent. Siblings get covers; parents do not. The order is siblings first, parents second. Zac wants parents first.

### Why (in the code)

How Related is built: [contentLayout.ts:463-482](../../../app/utils/contentLayout.ts#L463-L482) spreads `[...siblings, ...parents]`, dedups by slug (siblings win), and gives each item `coverImageUrl` only when the backend sent one ([:478-480](../../../app/utils/contentLayout.ts#L478-L480)). The renderer ([CollectionContentRenderer.tsx:311-363](../../../app/components/Content/CollectionContentRenderer.tsx#L311-L363)) takes the card path when at least one item has a cover; inside it, an item with a cover renders `.metadataSiblingCard` (110x55, `--radius-sm`) and one without renders `.metadataSiblingChip`. When no item has a cover the plain-text path at [:348-363](../../../app/components/Content/CollectionContentRenderer.tsx#L348-L363) runs, which is the PNWER case.

The pill: [ContentComponent.module.scss:649-671](../../../app/components/Content/ContentComponent.module.scss#L649-L671) uses `border-radius: var(--radius-round)`, `background-color: rgb(0 0 0 / 6%)`, `border: 1px solid rgb(0 0 0 / 12%)`, `font-weight: 600`. The fills are literals, not tokens, and black tints on a dark page would vanish (unverified on a device; follows from the values).

The missing image is backend data. In `edens.zac.backend`, `CollectionProcessingUtil.populateSiblings` collects `coverImageId` from each sibling row, batch-loads with `contentRepository.findImagesByIds` and maps to `imageUrlWeb` (`CollectionProcessingUtil.java:501-525`). `populateParents` builds `new Records.CollectionList(p.getId(), p.getTitle(), p.getSlug(), p.getCollectionDate(), null, …)` with the cover slot hard-coded `null` at `:558`. The javadoc at `:538-539` says parents "render as text links, and fetching covers would add a query per read for something nothing displays yet". That is out of date: the frontend has displayed parent covers whenever present since [contentLayout.ts:478](../../../app/utils/contentLayout.ts#L478). `CollectionModel.java` repeats the stale sentence. `CollectionEntity` already carries `coverImageId` and `findAllParentCollectionsByChildId` selects every column, so the id is already in hand; the fix is one extra batched query, the same one siblings run. Endpoint `GET /api/read/collections/{slug}`, field `parents[].coverImageUrl`.

Ordering: the comment at [contentLayout.ts:463-467](../../../app/utils/contentLayout.ts#L463-L467) says siblings "win the slot". The describe block at [tests/utils/contentLayout.test.ts:1097](../../../tests/utils/contentLayout.test.ts#L1097) holds the four tests that pin the current behaviour, including "lists siblings first, then parents" at [:1114](../../../tests/utils/contentLayout.test.ts#L1114) and the dedup case at [:1127](../../../tests/utils/contentLayout.test.ts#L1127).

### What we will do

1. Backend: `populateParents` batch-loads cover URLs exactly as `populateSiblings` does (`CollectionProcessingUtil.java:536-562`), passes the URL instead of `null` at `:558`, and deletes the "text links" sentence from the javadoc and from `CollectionModel.java`. Any backend test asserting `parents[].coverImageUrl == null` flips (not searched). No frontend change is needed for the image to appear.

2. Parents first. [contentLayout.ts:468](../../../app/utils/contentLayout.ts#L468):

   ```ts
   const relatedCollections = [...(collection.parents ?? []), ...(collection.siblings ?? [])];
   ```

   Parents then win dedup. Update the comment at `:463-467` and the four tests under [contentLayout.test.ts:1097](../../../tests/utils/contentLayout.test.ts#L1097). No parent/sibling labelling: one row, parents first, is enough; a second "In" row would spend the height section 1 saves.

3. Showing more: a single horizontally scrolling strip on mobile, wrapping on desktop where the rail is tall. The header height stays fixed however many related collections exist, and the last tile bleeding past the 12 px padding is the scroll affordance. Rejected: multiple wrapped rows (every 3 to 4 items add 56 px and push the grid down); a "+N more" Disclosure (hides items behind a tap and needs open state in the renderer); smaller text chips (drops the cover, which is what makes a related tile recognisable). [ContentComponent.module.scss](../../../app/components/Content/ContentComponent.module.scss):

   ```scss
   .metadataSiblingCardRow {
     gap: var(--space-2);
     @media (width < 768px) {
       flex-wrap: nowrap;
       overflow-x: auto;
       scroll-snap-type: x proximity;
       margin-inline: calc(-1 * var(--space-3));
       padding-inline: var(--space-3);
       scrollbar-width: none;
     }
   }

   .metadataSiblingCard {
     width: 96px;                                 /* 2:1 keeps it 48px tall; was 110 */
     scroll-snap-align: start;
     @media (width >= 768px) { width: 150px; }   /* unchanged */
   }
   ```

4. Restyle the no-cover fallback to FilterChip tokens instead of a pill. After item 1 ships this branch only fires for a collection with no cover assigned at all. [ContentComponent.module.scss:649-671](../../../app/components/Content/ContentComponent.module.scss#L649-L671):

   ```scss
   .metadataSiblingChip {
     align-self: center;
     padding: var(--space-1) var(--space-2);
     font-size: var(--text-sm);
     font-weight: 500;
     color: var(--color-fg);
     background-color: transparent;
     border: 1px solid var(--color-border);
     border-radius: var(--radius-1);
     opacity: 0.7;
     &:hover { border-color: var(--color-fg); opacity: 1; }
   }
   ```

   The plain-text path at [CollectionContentRenderer.tsx:348-363](../../../app/components/Content/CollectionContentRenderer.tsx#L348-L363) can stay.

5. The "Home" parent links to `/home`, a second URL for the landing page. See section 5, item 9.

Items 2 to 4 are frontend-only and land before or after item 1 without harm (parents show as token chips until covers arrive).

## 3. Heart overlay

### What is wrong

![Zac's own capture, signed in: each tile carries a 44x44 grey square with a thin outline heart in its top-right corner; one is filled pink.](screenshots/user-collection-grid-hearts.webp)

On a two-up mobile grid each tile is about 180 px wide, so the 44 px box is a quarter of the tile width. It reads as a grey square with a thin heart in it. Idle, it is at `opacity: 0.35` over the photo, which on a mid-grey photo is about 1.74:1 contrast: nearly invisible on touch devices, which never get the hover reveal. On a client-gallery tile the top-left SelectStar is a 36 px circle and the top-right heart is a 44 px square, so the two corner controls on one tile have different sizes and shapes.

No heart renders for an anonymous visitor (verified: zero matching elements on `/dolomites-film`), so the review captures do not show it; Zac's screenshot above does.

### Why (in the code)

[SaveHeart.module.scss:15-16](../../../app/components/Content/SaveHeart.module.scss#L15-L16) `width: 44px; height: 44px`, [:21](../../../app/components/Content/SaveHeart.module.scss#L21) `border-radius: 0`, [:22](../../../app/components/Content/SaveHeart.module.scss#L22) `background: rgb(0 0 0 / 60%)`, [:23](../../../app/components/Content/SaveHeart.module.scss#L23) `opacity: 0.35`, glyph 22 px at [:41-43](../../../app/components/Content/SaveHeart.module.scss#L41-L43). The docblock at `:1-6` says the box was raised from 36/40 px to 44 px at every width to meet the touch minimum. The visible size and the touch target got conflated. FilterChip solves the same problem with an invisible `::after` overlay on `(pointer: coarse)` ([FilterChip.module.scss:48-60](../../../app/components/ui/FilterChip/FilterChip.module.scss#L48-L60)). SelectStar: [ContentComponent.module.scss:286-304](../../../app/components/Content/ContentComponent.module.scss#L286-L304), 36 px round, `rgb(0 0 0 / 35%)`.

The 2026-08-06 decision to keep SaveHeart off IconButton still holds; this is a change inside `SaveHeart.module.scss` only.

### What we will do

1. [SaveHeart.module.scss](../../../app/components/Content/SaveHeart.module.scss): smaller visible box, same 44 px tap target, corner-anchored so the hit area never leaves the image.

   ```scss
   .saveHeart {
     width: var(--space-6);                /* 32px, was 44px */
     height: var(--space-6);
     background: rgb(0 0 0 / 45%);         /* was 60%; lighter scrim on a smaller box */

     @media (pointer: coarse) {
       &::after {
         position: absolute;
         top: 0;
         right: 0;
         width: 44px;
         height: 44px;
         content: '';
       }
     }
   }

   .saveHeartIcon {
     width: 18px;                          /* was 22px */
     height: 18px;
   }
   ```

   The overlay still intercepts the fullscreen tap in the same 44 px corner it does today. Rewrite the docblock at `:1-6`: the 44 px target is now the overlay, not the box. Update the paragraph in [pf-performance-platform.md](../../../docs/spikes/2026-features/pf-performance-platform.md) that describes the 44 px box.

2. Raise the idle opacity on coarse pointers (0.35 to about 0.6) so the control is findable without hover. Same file, `:23`.

3. Make SelectStar the same size and shape as the heart ([ContentComponent.module.scss:286-304](../../../app/components/Content/ContentComponent.module.scss#L286-L304)): 32 px square, same scrim, or move it onto `IconButton` with the coarse overlay.

4. When the `--scrim-dark-*` ladder lands (section 8), the two `rgb(0 0 0 / N%)` literals here move onto it.

### Open questions

1. Should the heart stay a square or become a circle? A circle reads less like a UI chrome box over a photo; the square aligns with the tile corner. Either is one line.

## 4. First paint and the footer

### What is wrong

The owner's report was "the page shifts while images load". Measured on `/dolomites-film` at 393x852, with and without a 4 s delay on every image response, CLS is 0.0000 in all four runs. Image bytes move nothing: every tile is server-rendered with pixel width and height and paints as a grey box until its image arrives.

What does move is the footer, and it moves before any image is involved:

| Page | Footer top at 100 ms | at 800 ms | settled |
| --- | --- | --- | --- |
| /dolomites-film | 868 | 868 | 3950 |
| /collections | 868 | 3934 | 3934 |
| /film (separate run, 393x852) | 868 | 868 | 1420, then 1429 after the 390 to 393 px recompute |

At 100 ms the document is 928 px tall and the footer sits at y 868, 16 px under the fold of an 852 px viewport. On a real phone `100dvh` tracks the toolbar state, so the footer sits at the bottom edge and shows the moment the page is nudged. When the page content lands the footer jumps to its real position. CLS does not count it because it starts below the fold; a phone's bottom edge is exactly where it is.

The load sequence, images held 4 s: [m-load-dolomites-film-t100.png](screenshots/m-load-dolomites-film-t100.png) and [m-load-dolomites-film-t800.png](screenshots/m-load-dolomites-film-t800.png) are a white viewport with a spinner in the middle, no header, no menu, no footer. [m-load-collections-t100.png](screenshots/m-load-collections-t100.png) is the same. Then:

![/collections at 800 ms, images still held: header, filter bar and grey tiles with titles are all in place.](screenshots/m-load-collections-t800.png)

[m-load-collections-settled.png](screenshots/m-load-collections-settled.png) shows the photos in those exact boxes; no tile moved. The difference between the two pages at 800 ms is only that `/collections` data came back faster from the local backend; both show spinner-only until their content arrives.

A second, smaller movement: on short pages like home the footer stays pinned at the fold ([ContentCollectionPage.module.scss:14](../../../app/components/ContentCollection/ContentCollectionPage.module.scss#L14) `min-height: 100dvh`) and moves down when the phone's URL bar collapses. That is `dvh` working as designed, not a load bug, but it reads as "the footer moved". It goes away once the footer is no longer at the fold on first paint.

### Why (in the code)

Because `app/loading.tsx` exists, Next wraps the page (not the layout) in a Suspense boundary whose fallback is that file. [app/loading.tsx:9-13](../../../app/loading.tsx#L9-L13) renders a bare spinner in a box with `min-height: 100dvh` ([loading.module.scss:5](../../../app/loading.module.scss#L5)). [app/layout.tsx:50-52](../../../app/layout.tsx#L50-L52) renders `<SkipLink />`, `{children}`, `<Footer />`. While the fallback shows, the body is exactly: a fixed skip link, a 100dvh spinner box, the footer. The footer starts at `100dvh + 16px` ([Footer.module.scss:9](../../../app/components/Footer/Footer.module.scss#L9) `margin: var(--page-padding-mobile) auto 0`).

Verified stream order for `GET /` with an iPhone UA (byte offsets in the 45 KB response): spinner at 3644, `<footer>` at 4036, the hidden real page from 5088, the first pixel-sized tile row at 32652. React's inline swap script replaces the fallback without waiting for JS.

Why images do not shift anything: [CollectionPageWrapper.tsx:67](../../../app/components/ContentCollection/CollectionPageWrapper.tsx#L67) calls `resolveSsrViewport()` (390x844 for a mobile UA, [ssrViewport.ts:20-34](../../../app/utils/ssrViewport.ts#L20-L34)). [CollectionPage.tsx:127-129](../../../app/components/ContentCollection/CollectionPage.tsx#L127-L129) threads `serverContentWidth` into `CollectionPageClient` and on to `Component`. [componentUtils.ts:54-67](../../../app/components/Content/componentUtils.ts#L54-L67) uses the SSR viewport while `useViewport` is still zero, so `buildContentRows` ([:101-135](../../../app/components/Content/componentUtils.ts#L101-L135)) runs on the server at 390 px. [BoxRenderer.tsx:100-111](../../../app/components/Content/BoxRenderer.tsx#L100-L111) hands each leaf its size and [CollectionContentRenderer.tsx:739-747](../../../app/components/Content/CollectionContentRenderer.tsx#L739-L747) writes `style={{ width, height }}` on the tile wrapper, with `.imageWrapper` painting `var(--color-surface-sunken)` behind it ([ContentComponent.module.scss:116-121](../../../app/components/Content/ContentComponent.module.scss#L116-L121)). Verified in the HTML: `style="width:193px;height:190px"`. After hydration `useViewport` measures 393 px and the mobile tolerance of 0 ([componentUtils.ts:53](../../../app/components/Content/componentUtils.ts#L53)) recomputes: tiles go 193 to 195 px, CLS 0.0019. Negligible.

Skeleton history, so nobody goes looking for something that was removed by accident:

| When | Commit | What |
| --- | --- | --- |
| 2025-11-07 | `5918af35` | Deleted `CardsGridSkeleton` (six placeholder cards). It depended on `GridSection` and the old `gridContainer` CSS, both removed in the same 27-file refactor. The card grid it mirrored no longer exists. |
| 2026-06-01 | `6d75b8d6` | Added the `.layoutSkeleton` shimmer in `Component.tsx` for the `rows.length === 0` case. |
| 2026-06-02 | `ce3b7a12` | Put `min-height: 100dvh` on it. The same PR (#161) added SSR row rendering, which is why the shimmer is now unreachable on collection pages. |
| 2026-06-04 | `a5bc4f43` | Gave `loading.tsx` and the three page containers `100dvh` to stop the footer rendering first. That fixed short pages (home) only. |

What still exists: [Component.tsx:227-233](../../../app/components/Content/Component.tsx#L227-L233) `.layoutSkeleton` early return and [ContentComponent.module.scss:764-779](../../../app/components/Content/ContentComponent.module.scss#L764-L779) shimmer. On collection pages it is unreachable because `buildContentRows` returns `[]` only when `contentWidth` is 0 ([componentUtils.ts:110](../../../app/components/Content/componentUtils.ts#L110)) and the SSR viewport is always supplied. It is reachable on the four callers that do not pass `serverContentWidth`: [SearchPageClient.tsx](../../../app/components/SearchPage/SearchPageClient.tsx), [TaxonomyPage.tsx](../../../app/components/TaxonomyPage/TaxonomyPage.tsx), [LocationPageClient.tsx](../../../app/components/LocationPage/LocationPageClient.tsx), [EditModeLayer.tsx](../../../app/components/ContentCollection/edit/EditModeLayer.tsx). Those show the flat shimmer until `useViewport` measures, then swap to the grid. The docblock at [ContentComponent.module.scss:761-763](../../../app/components/Content/ContentComponent.module.scss#L761-L763) describes the pre-SSR behaviour and is only true for those four. How big that shift is was not measured.

Other reservation facts, verified: the `next/image` tiles have intrinsic `width`/`height`, no `placeholder`/`blurDataURL`, `sizes="(max-width: 768px) 100vw, Npx"` ([CollectionContentRenderer.tsx:696-704](../../../app/components/Content/CollectionContentRenderer.tsx#L696-L704)), one image per page gets `priority` ([componentUtils.ts:219-231](../../../app/components/Content/componentUtils.ts#L219-L231)). Inter via `next/font` with `display: swap` and size-adjust, so text does not reflow ([layout.tsx:15](../../../app/layout.tsx#L15)). `FullScreenModal` is `dynamic()` with no `loading`, so Next wraps it in a Fragment, not a Suspense ([ContentBlockWithFullScreen.tsx:16-20](../../../app/components/Content/ContentBlockWithFullScreen.tsx#L16-L20)); aborting that chunk in a test took the whole gallery to the error boundary. `app/search/loading.tsx` already renders `PageShell` + `CollectionHeader` + spinner ([:10-14](../../../app/search/loading.tsx#L10-L14)), so `/search` never shows the blank frame.

The `100vw` in `sizes` means a 193 px two-up tile requests the 640w/828w candidate; the LCP warning on `/` named a tile in row 2, not the one that got `priority`. Neither shifts layout; both slow the tile fill.

### What we will do

In this order. The first two fix what Zac sees; the rest are cleanups on the same path.

1. Move `<Footer />` out of the root layout into the page tree so it streams with the content and cannot exist while the fallback is on screen. [app/layout.tsx:52](../../../app/layout.tsx#L52): remove it. [PageShell.tsx:38-45](../../../app/components/ui/PageShell/PageShell.tsx#L38-L45) and [CollectionPage.tsx:118-137,145-166](../../../app/components/ContentCollection/CollectionPage.tsx#L118-L166) (both return branches): render `<Footer />` after `<main>` inside `.container`. `.container` is already `display: flex; flex-direction: column; min-height: 100dvh` with `.main { flex: 1 }` ([ContentCollectionPage.module.scss:14-27](../../../app/components/ContentCollection/ContentCollectionPage.module.scss#L14-L27), [PageShell.module.scss:6-12](../../../app/components/ui/PageShell/PageShell.module.scss#L6-L12)), so the footer stays at the bottom on short pages with no new CSS. Five places render neither shell and need a `<Footer />` or a decision against one: [app/login/page.tsx:27](../../../app/login/page.tsx#L27), [app/invite/[token]/page.tsx:57](../../../app/invite/%5Btoken%5D/page.tsx#L57), [ClientGalleryGate.tsx:135](../../../app/components/ClientGalleryGate/ClientGalleryGate.tsx#L135), [AllImagesClient.tsx](../../../app/components/Admin/AllImagesClient.tsx), [app/(admin)/collection/manage/[[...slug]]/page.tsx](../../../app/%28admin%29/collection/manage/%5B%5B...slug%5D%5D/page.tsx). `not-found.tsx`, `error.tsx`, `/metadata` and `all-client-galleries` are covered through `StatusPage`/`PageShell`/`CollectionPage`. The only footer tests render `<Footer />` in isolation, so none moves; add one on `PageShell` and `CollectionPage` that the footer renders after `<main>`.

2. Make `app/loading.tsx` render the page frame, as `app/search/loading.tsx` does: real shell, real header, a full-height shimmer body. `SiteHeader` is a client component with `useState` only, so it renders without data and hydrates in place.

   ```tsx
   // app/loading.tsx
   import { PageShell } from '@/app/components/ui/PageShell/PageShell';
   import styles from './loading.module.scss';

   export default function Loading() {
     return (
       <PageShell>
         <div className={styles.body} aria-hidden="true" />
       </PageShell>
     );
   }
   ```

   ```scss
   // app/loading.module.scss
   .body {
     min-height: 100dvh;
     background: linear-gradient(90deg, var(--color-surface-raised) 25%, var(--color-surface-sunken) 37%, var(--color-surface-raised) 63%);
     background-size: 400% 100%;
     animation: shimmer 1.4s ease infinite;
     @media (prefers-reduced-motion: reduce) { animation: none; }
   }
   ```

   Lift the gradient from [ContentComponent.module.scss:764-779](../../../app/components/Content/ContentComponent.module.scss#L764-L779) into a shared partial under `app/styles/` rather than copying it. Not a row-accurate skeleton: `loading.tsx` takes no params, so it cannot know the collection's rows, and a grid of made-up grey tiles would shift the same way the spinner does. The real row-accurate skeleton is the server-rendered grid, which already exists.

3. Request the right image size on mobile. [CollectionContentRenderer.tsx:701](../../../app/components/Content/CollectionContentRenderer.tsx#L701): `sizes` becomes the tile's own rendered width on every viewport:

   ```ts
   sizes: `${Math.round(validWidth)}px`,
   ```

   Faster tile fill is less time looking at grey boxes, which is the part that reads as "loading". Update the `sizes` assertions under `tests/components/Content/`.

4. Give the modal chunk its own boundary. [ContentBlockWithFullScreen.tsx:16-20](../../../app/components/Content/ContentBlockWithFullScreen.tsx#L16-L20): add `{ loading: () => null }` to the `dynamic()` call (that makes Next wrap it in Suspense) and wrap the mount at `:198` in an error boundary so a flaky chunk load does not blank the gallery.

5. Re-measure after 1 and 2: no `<footer>` in the DOM while the fallback is up; footer top above 852 at every sample on `/dolomites-film`; CLS still at or under 0.002. Then run the same check against production to settle whether Amplify streams the response (if it buffers, the spinner never paints on prod) and whether the cold-dev "fallback re-shown for 300 ms after hydration" seen twice on a cold Turbopack server ever happens there.

6. Separately scoped: thread `resolveSsrViewport()` into `SearchPageClient`, `TaxonomyPage` and `LocationPageClient` the way `CollectionPageWrapper.tsx:67` does, then retire `.layoutSkeleton` and its docblock. Measure `/search` and `/tag/[slug]` with the same script first.

7. Later, optional: percent widths plus `aspect-ratio` on tiles instead of inline px, so the same rows fit any phone width without the 390 to 393 recompute. Cost is `BoxRenderer.module.scss`, two renderers and dozens of tests that assert pixel `style` values. The measured win is CLS 0.0019, so this is a cleanliness item.

What not to do: do not delete `app/loading.tsx` (without it the response blocks on the backend fetch and client navigation shows the old page until the new one is ready); do not add a `min-height` to the fallback to "match" the page (no fixed height matches a content-height page); do not bring back a grey card grid in the fallback.

## 5. Menu and navigation

### What is wrong

![Home with the menu open at 393x852: the panel is translucent, so the tile photos and their white titles show through behind the black menu text and the divider lines run across them. Six rows at the top, 410 px empty under them. "Clear Cache" is in the public menu.](screenshots/m-home-menu-open.png)

Measured at 375x812: hamburger 32x32 at (327, 20); close button 32x32; six 50 px rows from y 61 to 362; empty space y 362 to 772 (410 px); social icons 32x32 at y 772. Apple's HIG and WCAG 2.5.8 want 44 px. The rows are fine; the four icon buttons are not. "Log in" starts at the bottom edge of the header with no gap.

Route-level problems, ordered by what they cost a visitor:

1. `/search` has no entry point. Nothing in `app/` links to it. It is the only page that filters by people, camera or lens across collections.
2. Tags are dead text on a collection page while the location on the same row is a link. People have no public page at all.
3. "Home" duplicates the title link, which is on every page the menu exists on.
4. "Me" sends an admin through `/user` and a 307 to `/admin`. The word "Admin" appears nowhere in the menu.
5. `/login` is a dead end: no header, no title link, no way back ([m-login.png](screenshots/m-login.png): the form starts about 250 px down and the top third is blank; the passkey button shows grey text on a white button). A signed-in non-admin who types `/admin` bounces to `/login` and then to `/user` and never sees "not allowed".
6. Admin subpages `/comments`, `/metadata`, `/all-images` and `/collection/manage` have no way back to `/admin` except the title, which goes to `/`. Only `/admin/users/[id]` has a back link.
7. `/home` renders the home collection at a second URL. The Related row on `/film` links the "Home" parent to `/home` (verified in the browser).
8. `/tag/alpine` renders the heading "Untitled" for a real tag with 35 photos ([m-tag-alpine.png](screenshots/m-tag-alpine.png)), and `/tag/film` (not a tag slug) renders "Untitled, 0 photos" and a blank page instead of a 404 ([m-tag-film-unknown-slug.png](screenshots/m-tag-film-unknown-slug.png)).
9. "Clear Cache" shows for an anonymous visitor on a local build.
10. The menu panel is translucent on mobile and loses to the admin EditBar by z-index.
11. `/all-client-galleries` is a public route reached only from an admin tile. What an anonymous visitor gets back is backend scoping; unverified which.

Things that are fine and should stay: fullscreen images are deep-linkable with exactly one history entry and Back closes the viewer ([useFullScreenImage.tsx:180,205](../../../app/hooks/useFullScreenImage.tsx#L180)); filters use `router.replace` so Back leaves the page rather than stepping through every chip ([useFilterUrlState.ts:65](../../../app/hooks/useFilterUrlState.ts#L65)); `/user` sections use `pushState` because a section is a page and a chip is a view of one; collection tiles are real anchors.

### Why (in the code)

Menu items are two arrays at [MenuDropdown.tsx:280-296](../../../app/components/MenuDropdown/MenuDropdown.tsx#L280-L296): Home (when not on `/`), Me, then the auth buttons at `:334`/`:342`, About and Contact disclosures at `:350`/`:359`, then Explore, Collections, Create, Update, Metadata, Comments, and Clear Cache at `:370` gated on `isLocalEnvironment()` only, which is why the anonymous screenshot shows it. On production it does not render.

The panel is `position: fixed; height: 100vh; background-color: rgb(255, 255, 255, 0.95)` ([MenuDropdown.module.scss:7-17](../../../app/components/MenuDropdown/MenuDropdown.module.scss#L7-L17)). `100vh`, not `100dvh`, so on iOS Safari the social row can sit under the browser chrome (unverified on a device). `z-index: var(--z-dropdown)` = 100 ([:12](../../../app/components/MenuDropdown/MenuDropdown.module.scss#L12)); `EditBar` is fixed at `--z-modal-controls` = 1002 ([EditBar.module.scss:10](../../../app/components/ui/EditBar/EditBar.module.scss#L10)), so on `/[slug]?manage=1` the edit bar paints over the open menu's lower rows. Click-outside closes on desktop only ([MenuDropdown.tsx:222](../../../app/components/MenuDropdown/MenuDropdown.tsx#L222)). The menu is hand-rolled on purpose, not on `ui/Modal`: decided 2026-06-01 and reaffirmed 2026-08-06 because `Modal` paints a scrim and its dialog fills the backdrop, and the desktop panel must leave the page visible. That still holds for desktop.

Sizes: hamburger `width: var(--space-6)` (32 px) at [SiteHeader.module.scss:96](../../../app/components/SiteHeader/SiteHeader.module.scss#L96); close at [MenuDropdown.module.scss:83](../../../app/components/MenuDropdown/MenuDropdown.module.scss#L83); socials at [:191](../../../app/components/MenuDropdown/MenuDropdown.module.scss#L191).

Routes. `/search`: `grep -rn "/search" app` returns zero hrefs; [sd-search-discovery.md](../../../docs/spikes/2026-features/sd-search-discovery.md) says "reachable by URL only" and parks it on the SD4 "what is Explore" question, open since 2026-06-10. Tags: the header renders `filterItems` as plain `<div>`s at [CollectionContentRenderer.tsx:452](../../../app/components/Content/CollectionContentRenderer.tsx#L452) while the location is a link at [:425](../../../app/components/Content/CollectionContentRenderer.tsx#L425); there is no `app/people/` route and [ExploreDirectory.tsx](../../../app/explore/ExploreDirectory.tsx) lists locations and tags only. "Me": [app/user/page.tsx:34](../../../app/user/page.tsx#L34) redirects admins; `me.isAdmin` is already in scope at [MenuDropdown.tsx:148](../../../app/components/MenuDropdown/MenuDropdown.tsx#L148). `/login`: bare `<main>` at [app/login/page.tsx:27](../../../app/login/page.tsx#L27); `requireAdmin` bounces to `/login` at [admin.ts:62](../../../app/utils/admin.ts#L62) and `/login` bounces signed-in users to `/user` at `:24`. Admin back path: only [users/[id]/page.tsx:131](../../../app/%28admin%29/admin/users/%5Bid%5D/page.tsx#L131) has one. `/home`: [app/[slug]/page.tsx:91](../../../app/%5Bslug%5D/page.tsx#L91) does not special-case `HOME_SLUG`.

`/tag` "Untitled": [TaxonomyPage.tsx:16](../../../app/components/TaxonomyPage/TaxonomyPage.tsx#L16) falls back to `'Untitled'` when `entityName` is empty. [app/tag/[slug]/page.tsx:40-48](../../../app/tag/%5Bslug%5D/page.tsx#L40-L48) calls `notFound()` when `resolveTaxonomyBySlug` finds no match and passes `matchedTag.name`. The screenshots show the fallback firing on a real tag and no 404 on an unknown one, so either the tags response does not carry `name` under that key or the resolver matches something for "film". Cause not established; check what `getAllTags` returns against what `resolveTaxonomyBySlug` reads first.

### What we will do

Pick: a mobile-only bottom bar with four cells plus a bottom-anchored menu sheet. Desktop keeps the top-right button and the 400 px panel, unchanged.

| Option | For | Against |
| --- | --- | --- |
| Keep top-right | No change, desktop parity | Hardest corner on a phone; the sheet opens from the top and leaves 410 px empty at the bottom |
| Floating button bottom-right | One 48 px circle | Sits on the corner of every photo; collides with the fullscreen metadata toggle, also bottom-right ([FullScreenModal.module.scss:198](../../../app/components/FullScreenModal/FullScreenModal.module.scss#L198)) |
| Bottom bar, 3 to 5 cells | Destinations one tap away; same idiom the admin edit modes already use (`EditBar`) | About 56 px plus safe area of every mobile viewport; must get out of the way of `EditBar`; footer needs bottom padding |

Cells, left to right: Menu, Explore, Collections, Your space (or Log in when anonymous). Four, not five: Search is not linked today and its place is the open SD4 question.

```
┌─────────────────────────────────────┐
│ Zac Edens                           │  header: title only on mobile
│ ┌──────────┐  Film                  │
│ │  cover   │  12 photos · Iceland   │
│ └──────────┘  Related: [Home]       │
│ ┌────────────────┐ ┌──────────────┐ │
│ │     photo      │ │    photo     │ │
│ └────────────────┘ └──────────────┘ │
│   ...                               │
├─────────────────────────────────────┤
│  ≡ Menu   Explore   Collections   Log in │  56px + safe area, --z-sticky
└─────────────────────────────────────┘

menu open, anonymous:
┌─────────────────────────────────────┐
│ Zac Edens              (page dimmed)│
├─────────────────────────────────────┤  sheet slides up, max-height 85dvh
│                              About  │
│                            Contact  │
│  ─────────────────────────────────  │
│                             Log in  │
│  ─────────────────────────────────  │
│  [ig] [gh]                     (x)  │  close at bottom-right, 44px
├─────────────────────────────────────┤
│  ≡ Menu   Explore   Collections   Log in │  bar stays; Menu cell is pressed
└─────────────────────────────────────┘

menu open, admin, on a collection page:
├─────────────────────────────────────┤
│                             Create  │
│                             Update  │
│                           Metadata  │
│                           Comments  │
│  ─────────────────────────────────  │
│                              About  │
│                            Contact  │
│  ─────────────────────────────────  │
│                        Clear cache  │  local only, admin only
│                            Log out  │
│  ─────────────────────────────────  │
│  [ig] [gh]                     (x)  │
├─────────────────────────────────────┤
│  ≡ Menu   Explore   Collections   Your space │
└─────────────────────────────────────┘
```

Bar rules: `display: none` at `width >= 768px`; `SiteHeader` hides its hamburger under 768 px so there is one menu button; height 56 px plus `env(safe-area-inset-bottom)` with matching `body` padding-bottom under 768 px; not rendered when `EditBar` is mounted ([EditModeLayer.tsx:356](../../../app/components/ContentCollection/edit/EditModeLayer.tsx#L356), [AdminUserSpaceEditor.tsx:170](../../../app/%28admin%29/admin/users/%5Bid%5D/AdminUserSpaceEditor.tsx#L170)); z-index `--z-sticky` (500), above content, below modals and the edit bar; the fullscreen viewer (`--z-fullscreen` 9999) covers it and scroll-locks the body, so no conflict; active cell gets `aria-current="page"` and the inset top rule `EditBar` uses for its active tab ([EditBar.module.scss:62](../../../app/components/ui/EditBar/EditBar.module.scss#L62)).

Menu items per state. Anonymous: Explore, Collections, About, Contact, Log in, socials. Signed in: Explore, Collections, Your space, About, Contact, Log out, socials. Admin: Explore, Collections, Your space, About, Contact, Create, Update (collection page only), Metadata, Comments, Clear cache (local only), Log out, socials. On mobile with the bar, the sheet drops the three rows the bar carries. Log out sits just above the social row, which is a non-destructive buffer between the thumb and the sign-out.

Not a tile layout. The row packer ([contentLayout.ts:408](../../../app/utils/contentLayout.ts#L408)) packs image links by aspect ratio. The menu is six to eleven text rows and one photograph. Giving each row a cover means a fetch per destination on every open, and six near-identical cards scan slower than six words. Where a visual menu does make sense the repo already does it: the admin hub renders its destinations as cover tiles.

Pop-out pattern. `ui/Modal` ([Modal.tsx:10](../../../app/components/ui/Modal/Modal.tsx#L10)) has three variants: `overlay`, `sheet` (full-bleed), `fullscreen`, with ten call sites. Add a fourth, `sheet-bottom`: anchored to the bottom edge, width 100%, `max-height: 85dvh`, rounded top corners, `padding-bottom: env(safe-area-inset-bottom)`, rendering as `overlay` at `width >= 768px`. Because the dialog no longer fills the backdrop, the backdrop's `event.target === event.currentTarget` close ([Modal.tsx:132](../../../app/components/ui/Modal/Modal.tsx#L132)) works as tap-outside with no new code. `MenuDropdown` stays hand-rolled; its mobile change is CSS only (bottom-anchored, `dvh`, a scrim that closes on tap, click-outside at [MenuDropdown.tsx:219](../../../app/components/MenuDropdown/MenuDropdown.tsx#L219) extended to all widths). That keeps the count at two implementations of dialog semantics, which is what the codebase has today.

What moves into the sheet:

| In the page today | Proposed | Note |
| --- | --- | --- |
| Users panel create/edit `UserForm` ([UserManagementPanel.tsx:230,234](../../../app/components/UserManagementPanel/UserManagementPanel.tsx#L230)) | `sheet-bottom` | The same panel already opens Merge and Upgrade as modals, so it mixes two idioms now |
| Roles panel create form and `RoleDetailView` ([RolesPanel.tsx](../../../app/components/RolesPanel/RolesPanel.tsx)) | `sheet-bottom` | The `?role=[id]` deep link opens the sheet instead of forcing the panel open |
| Filter dropdown panels ([FilterToolbar.module.scss:157](../../../app/components/ui/FilterToolbar/FilterToolbar.module.scss#L157)) | `sheet-bottom` under 768 px | The People popover in section 1 |
| Contact in the menu (inline `ContactForm`, [MenuDropdown.tsx:359](../../../app/components/MenuDropdown/MenuDropdown.tsx#L359)) | Open `ContactChip`'s existing modal ([ContactChip.tsx:31](../../../app/components/Personal/ContactChip.tsx#L31)) | Removes a duplicate form |
| Collections and Messages panels | Leave | They are lists, not editors |

Not a candidate: the collection edit layer (`EditModeLayer`), designed in place with a bottom bar on purpose (2026-06-08) and the model the bar borrows from.

Steps, each shippable alone:

1. Menu contents. [MenuDropdown.tsx:280](../../../app/components/MenuDropdown/MenuDropdown.tsx#L280): drop Home; rename Me to Your space and point it at `/admin` when `isAdmin`; gate Clear Cache on `isAdmin` as well as `isLocalEnvironment()`; reorder to browse, account, About, Contact, admin, Clear cache, Log out. Update [tests/components/MenuDropdown.test.tsx](../../../tests/components/MenuDropdown.test.tsx) (several of its 52 tests pin the item set) and `tests/components/SiteHeader.test.tsx`.
2. Targets. [SiteHeader.module.scss:96](../../../app/components/SiteHeader/SiteHeader.module.scss#L96), [MenuDropdown.module.scss:83,191](../../../app/components/MenuDropdown/MenuDropdown.module.scss#L83): 44 px hit boxes for hamburger, close and socials (padding, not a bigger glyph).
3. Opaque panel and `dvh`. [MenuDropdown.module.scss:7-17](../../../app/components/MenuDropdown/MenuDropdown.module.scss#L7-L17): `background-color: var(--color-bg)`, `height: 100dvh`. One line each; do this before the sheet work.
4. Bottom bar. New `app/components/ui/BottomNav/BottomNav.tsx` + `.module.scss`; rendered from [PageShell.tsx](../../../app/components/ui/PageShell/PageShell.tsx) next to `SiteHeader`, mobile only, with a `hideBottomNav` prop that `CollectionPageWrapper` sets in edit mode; `SiteHeader.tsx` hides the hamburger under 768 px; `body` padding-bottom in [globals.css](../../../app/styles/globals.css). New `tests/components/ui/BottomNav.test.tsx`; `tests/components/ui/PageShell.test.tsx` gets the prop.
5. Bottom sheet for the menu. [MenuDropdown.module.scss:7](../../../app/components/MenuDropdown/MenuDropdown.module.scss#L7): mobile `.dropdown` bottom-anchored, z-index above the bar, scrim, close button in the sheet's last row on mobile; [MenuDropdown.tsx:219](../../../app/components/MenuDropdown/MenuDropdown.tsx#L219) click-outside on all widths; the sheet hides the three bar rows.
6. Link `/search`: add it to the menu and decide its bar cell. Blocked on the SD4 answer.
7. Tags as links. [CollectionContentRenderer.tsx:452](../../../app/components/Content/CollectionContentRenderer.tsx#L452): render tag `filterItems` as `NavLink`s to `/tag/[slug]` the way the location chip does at `:425`. Whether `filterItems` carries the tag slug today is unverified.
8. Admin back path. Add a "← Admin" link (the [users/[id]/page.tsx:131](../../../app/%28admin%29/admin/users/%5Bid%5D/page.tsx#L131) pattern) to [comments/page.tsx](../../../app/%28admin%29/comments/page.tsx), [metadata/page.tsx](../../../app/%28admin%29/metadata/page.tsx), [all-images/page.tsx](../../../app/%28admin%29/all-images/page.tsx) and the create form. Or give `PageShell` a `backHref` prop.
9. `/home`. [app/[slug]/page.tsx:91](../../../app/%5Bslug%5D/page.tsx#L91): `redirect('/')` when `slug === HOME_SLUG`, and the Related link for the home parent becomes `/`. Check `CollectionJsonLd` for the canonical URL while there.
10. `/login` and `/invite` way out. [app/login/page.tsx:27](../../../app/login/page.tsx#L27), [app/invite/[token]/page.tsx:57](../../../app/invite/%5Btoken%5D/page.tsx#L57): render through `PageShell` (title link, footer) or add a `NavLink href="/"` above the card.
11. `/tag` heading. Find why `entityName` arrives empty (see above), then delete the `'Untitled'` fallback at [TaxonomyPage.tsx:16](../../../app/components/TaxonomyPage/TaxonomyPage.tsx#L16) and make the unknown-slug case 404.
12. `Modal` `sheet-bottom` variant ([Modal.tsx:10](../../../app/components/ui/Modal/Modal.tsx#L10), [Modal.module.scss](../../../app/components/ui/Modal/Modal.module.scss), `tests/components/ui/Modal.test.tsx`), then move `UserForm` and the Roles views into it. Section 6 depends on this.
13. Decide `/all-client-galleries`: move it into `app/(admin)/` and the [proxy.ts:84](../../../proxy.ts#L84) matcher, or document that the backend returns nothing for anonymous callers.

### Open questions

1. SD4: is Explore the directory and Search the filter, or does one absorb the other? This decides whether `/search` gets the fourth bar cell, replaces Explore, or stays a menu row.
2. Bottom bar cells for a signed-in non-admin: Your space, or Saved directly?

## 6. Admin page and list panels

### What is wrong

First, a regression, verified in source, git history and screenshots. The message rows on `/admin` and `/comments` have rendered with no styling on the email, body, time, actions row and "Reply in Gmail" link since 2026-08-22. In [screenshots/private/m-comments.png](screenshots/private/m-comments.png) "Reply in Gmail" runs straight into the "Mark read" button with no gap, the "54 days ago" label sits right-aligned on its own line between the email and the text, and the body wraps instead of ellipsising. The same "Reply in Gmail" collision against "Delete" is visible in the Messages panel of [screenshots/private/m-admin.png](screenshots/private/m-admin.png).

Second, the panels. Zac's 2026-08-13 critique of the panel component, paraphrased: the panel title sits in an odd middle space; the "new user" button does not align with the row buttons; the "tag only people" toggle is awkward and badly placed; the shell and rows are not separated enough; too much padding everywhere. Target: clean, able to show a lot without clutter, space used well. Scorecard today:

| # | Critique | Fixed? | Evidence |
| --- | --- | --- | --- |
| 1 | Title in an odd middle space | No | Title is `--text-md` 500 ([ListPanel.module.scss:132-133](../../../app/components/ListPanel/ListPanel.module.scss#L132-L133)); row names are 600 at the same 16 px ([UserManagementPanel.module.scss:56](../../../app/components/UserManagementPanel/UserManagementPanel.module.scss#L56)). The title is lighter than the rows beneath it. |
| 2 | "+ New User" misaligned with row buttons | Yes | Header and row share one grid, `1fr auto auto` ([ListPanel.module.scss:80-86](../../../app/components/ListPanel/ListPanel.module.scss#L80-L86), [:214-218](../../../app/components/ListPanel/ListPanel.module.scss#L214-L218)). |
| 3 | Tag-only toggle awkward | No | Still a native `<input type="checkbox">` in the header's middle slot ([UserManagementPanel.tsx:193-203](../../../app/components/UserManagementPanel/UserManagementPanel.tsx#L193-L203)). Every other boolean on the site is a `FilterChip` toggle. |
| 4 | Shell/row separation too weak | Over-fixed | Replaced by a three-grey ramp: shell `#eef0f2`, list well `#d5dae0`, row `#fff` ([ListPanel.module.scss:33-36](../../../app/components/ListPanel/ListPanel.module.scss#L33-L36)). Nothing else on the site uses it. |
| 5 | Too much padding | Partly | Row padding went 8/8 to 8/4 ([:218](../../../app/components/ListPanel/ListPanel.module.scss#L218)); header 12/16, body 16/0, list inset 16 unchanged ([:85](../../../app/components/ListPanel/ListPanel.module.scss#L85), [:178](../../../app/components/ListPanel/ListPanel.module.scss#L178), [:197](../../../app/components/ListPanel/ListPanel.module.scss#L197)). The row's right section still stacks two buttons, which sets the row height. |

Space on a 393 px phone (computed from the stylesheets and [listPanelShape.ts](../../../app/components/ListPanel/listPanelShape.ts); the private screenshots confirm the look):

| Panel | Row px | Text stack | Right stack | Padding + rule | Targets per row | Wasted per row |
| --- | --- | --- | --- | --- | --- | --- |
| Users | 71 | 41 | 58 (two stacked buttons) | 13 | 3 | 17 px of button stack beyond the text |
| Messages | 58.5 | 38 | 45.5 | 13 | 3 | 7.5 px |
| Roles | 40 | 20 | 27 | 13 | 2 | 7 px |
| Collections | 54 | 41 | 0 | 13 | 1 | 0 |

A collapsed panel is 102 px: 2 border + 24 header padding + 27 control + 1 rule + 32 body padding kept as `::after` margin + 16 px sliver ([adminHubContent.ts:347,356-357](../../../app/%28admin%29/admin/adminHubContent.ts#L347), [ListPanel.module.scss:122-129](../../../app/components/ListPanel/ListPanel.module.scss#L122-L129)). Seventy-five pixels of chrome to show one word and one button. Four closed panels are 408 px, about half the viewport.

An expanded panel is capped at `0.9 × viewportHeight` = 767 px on an 852 px phone ([adminHubContent.ts:192,220-224](../../../app/%28admin%29/admin/adminHubContent.ts#L192)). Users hits the cap at 10 rows, Messages at 12, Collections at 13. With, say, 15 users, 30 messages, 3 roles and 40 collections (real counts unverified) the Admin section stacks about 2,500 px of panels, each scrolling internally inside the page scroll, before the first nav tile. The three tiles follow at full width, roughly 800 px more. "All Images" is at the bottom of about 3,300 px. In [screenshots/private/m-admin.png](screenshots/private/m-admin.png) the Users box cuts the last visible row in half and "Update" / "Reset pw" stack on the right of every row. The same half-cut last row shows on [m-metadata.png](screenshots/m-metadata.png) in each fixed-height list, and the Locations box there touches the footer with no gap.

Things a phone cannot do from the hub: read a whole message (the excerpt is 10 words and the full text is a `title` tooltip, [MessageRow.tsx:57](../../../app/components/messages/MessageRow.tsx#L57), which touch cannot open; the row is not activatable); hide a collection (the row has no actions and tap goes to the public page). Two controls go to the same place: the Collections header "View all" and the "All Collections" tile both link to `/collections`.

Where the panels' styling differs from the public site's:

| Property | Panel | Public site |
| --- | --- | --- |
| Container fill | `#eef0f2` shell, `#d5dae0` well, `#fff` rows ([ListPanel.module.scss:33-36](../../../app/components/ListPanel/ListPanel.module.scss#L33-L36)); `#d5dae0` is darker than the darkest surface token `--color-surface-sunken-strong` `#dee2e6` | Transparent chips, `--color-bg` dropdown panel, no filled panels anywhere |
| Hairlines | Row separator `--color-border-strong` `#adb5bd` ([:221](../../../app/components/ListPanel/ListPanel.module.scss#L221)) | Every public hairline is `--color-border` `#e5e5e5` |
| Buttons | Ghost, secondary, danger `Button` sm; bare `×`; plain "View all" link; native checkbox: five looks | `FilterChip` 500 weight, hairline, 0.02em tracking |
| Header title | `--text-md` 500 | Page h1 `--text-3xl` 700; chip label `--text-sm` 500. 16/500 is neither |
| Row primary text | 16 px 600 | Body text `--text-sm` 400; cover titles `--text-xs` 600. A list of 15 bold names is the loudest block on the page |
| Counts | "N · View all" `--text-sm` muted | Chip counts `--text-xs` 400 at 0.6 opacity |
| Chevron | Leading `▾`/`▸` glyph ([Disclosure.tsx:99](../../../app/components/ui/Disclosure/Disclosure.tsx#L99)) | Trailing chevron in the chip's `trailing` slot |
| Booleans | Native checkbox | `FilterChip` toggle |
| Status | 8 px coloured dot | Text badge ("Unread" on `/comments`, chosen over a dot on purpose) |
| Spacing | Header 12/16, body 16/0, list inset 16, row 8/4: four insets before text | Toolbar 8/12/4, chip 4/12 |

The 2026-08-10 decision for `/admin/users/[id]` matched the role chips to the public tokens for exactly this reason: a second chip look read as two different products on one screen. The hub panels do not follow it.

### Why (in the code)

The regression. [MessagesPanel.tsx:105-109](../../../app/components/MessagesPanel/MessagesPanel.tsx#L105-L109) passes its own `styles` module into `MessageRowLeft` and `MessageRowRight`. [MessageRow.tsx](../../../app/components/messages/MessageRow.tsx) reads `styles.email` (`:36`), `.time` (`:44`), `.body` (`:57`), `.actions` (`:85`), `.replyButton` (`:90`), `.unread` (`:116`), `.meta` (`:140`), `.identity` (`:167`). [MessagesPanel.module.scss](../../../app/components/MessagesPanel/MessagesPanel.module.scss) defines only `.error`. [Comments.module.scss](../../../app/%28admin%29/comments/Comments.module.scss) has `.meta`, `.time`, `.unread` but no `.email`, `.body`, `.actions`, `.replyButton`, and [CommentsList.tsx:171-177](../../../app/%28admin%29/comments/CommentsList.tsx#L171-L177) passes it in the same way. Commit `3f6b6b43` (2026-08-22, "chore(cleanup): delete dead SCSS classes and globals.css tokens (A8)") deleted the rules as unreferenced; the references go through a prop, so the commit's zero-reference grep missed them. [tests/components/styleClassReferences.test.ts:97-103](../../../tests/components/styleClassReferences.test.ts#L97-L103) checks `<binding>.x` against the stylesheet the same file imports, and `MessageRow.tsx` imports no stylesheet, so the guard cannot see it. The 58.5 px row height the packer reserves for Messages ([adminHubContent.ts:150-153](../../../app/%28admin%29/admin/adminHubContent.ts#L150-L153)) assumes the deleted `.body` nowrap rule.

The panels. Shell at [ListPanel.tsx:61-111](../../../app/components/ListPanel/ListPanel.tsx#L61-L111): `section.panel` > `div.header` (grid `1fr auto auto`) > `div.body` > `ul.list` > `li.row` (grid `1fr auto auto`, `div.rowRight` a flex column). `div.rowMiddle` is always empty ([:167](../../../app/components/ListPanel/ListPanel.tsx#L167)). Per-row controls: Users `Update` over `Reset pw`/`Resend` ([UserManagementPanel.tsx:135-183](../../../app/components/UserManagementPanel/UserManagementPanel.tsx#L135-L183)); Messages relative time over `Reply in Gmail` + `Delete` ([MessageRow.tsx:165-185](../../../app/components/messages/MessageRow.tsx#L165-L185)); Roles a bare `×` ([RolesPanel.tsx:220-236](../../../app/components/RolesPanel/RolesPanel.tsx#L220-L236)); Collections none ([CollectionsPanel.tsx:94-118](../../../app/components/CollectionsPanel/CollectionsPanel.tsx#L94-L118)). Collapsed: the body unmounts ([Disclosure.tsx:111-115](../../../app/components/ui/Disclosure/Disclosure.tsx#L111-L115)) and `.isCollapsed::after` paints a 16 px strip of the list well with 16 px margins ([ListPanel.module.scss:122-129](../../../app/components/ListPanel/ListPanel.module.scss#L122-L129)). Hub order: `[...panels, ...tileModels]` at [adminHubContent.ts:334](../../../app/%28admin%29/admin/adminHubContent.ts#L334) with `mobileChunkSize={1}` at [page.tsx:52](../../../app/%28admin%29/admin/page.tsx#L52), so everything stacks one per row and the tiles come last. Initial collapse state is all-expanded to avoid a hydration mismatch ([AdminHubClient.tsx:44-45](../../../app/%28admin%29/admin/AdminHubClient.tsx#L44-L45)), but the page already passes `serverIsMobile` ([page.tsx:55](../../../app/%28admin%29/admin/page.tsx#L55)).

Decisions kept: ListPanel is a first-class list block and the Collection variant is a list, not a tile grid (2026-08-13); `/admin` is the admin's own `/user` page plus an Admin section with sections as one `SegmentedChip` (PR #437, [page.tsx:73-89](../../../app/%28admin%29/admin/page.tsx#L73-L89)); panels do not get their own row and do not use rating as the width lever (2026-08-10); collapse state lives in `AdminHubClient`. Two decisions this review argues against: the collapsed body sliver (2026-08-10 round 3) and the `--lp-*` ramp (2026-08-13). Both exist to separate a grey shell from a darker well. With rows as hairline-separated lines inside one bordered box, there is nothing left to separate.

### What we will do

One list pattern for all four panels: single-line rows with no per-row buttons, a tap opens a detail sheet (the existing `Modal`, bottom-anchored on phones via section 5's `sheet-bottom`), and the header uses the chip look. Rejected: master-detail on desktop (needs a full-width row, ruled out 2026-08-10; the Roles panel already is one inside a 400 px column and its detail view wraps to four lines); a tile grid for collections (that grid is `/collections`, one tap away); a dense table (same as the pick minus the sheet, and the sheet is what removes the per-row buttons).

The row: one shape for all four, `{ left: ['header'], right: ['meta'] }`. Primary text, then a muted secondary after a middle dot, one line, ellipsised. The right slot holds a small muted fact and nothing clickable. The whole row is the activation target. Height 20 + 2 × 8 + 1 = 37 px (`ROW_PADDING_Y` 13 to 17 so the row is a usable touch target). One `--color-border` hairline between rows, no fill, hover `--color-overlay-soft`. Text: `--text-sm` 500 primary, `--text-sm` 400 muted secondary, `--text-xs` muted fact. Nothing in the list is bolder than the panel title. Users: 71 to 37 px per row, 3 targets to 1; fifteen users go from 1,151 px (capped) to 599 px, uncapped.

| Panel | Row reads | Right fact | Sheet holds |
| --- | --- | --- | --- |
| Users | `● Jane Doe · jane@x.com` (dot stays; it becomes a text badge inside the sheet) | role count or `Invited` | name, email, status select, role chips with add (`UserRolesSection` compact), `Reset password`, `Open space`, `Edit` (`UserForm`); PERSON rows: `Merge…`, `Upgrade` |
| Messages | `ann@x.com · Love the Dolomites set, could I…` (600 while unread) | `2h` | full message, `mailto:`, `Reply in Gmail`, `Mark read`, `Delete` (the card arrangement `/comments` uses, [MessageRow.tsx:129-156](../../../app/components/messages/MessageRow.tsx#L129-L156)) |
| Roles | `power · 4 members · 6 collections` | none | `RoleDetailView` unchanged at 600 px, delete included ([RoleDetailView.tsx:283-287](../../../app/components/RolesPanel/RoleDetailView.tsx#L283-L287)) |
| Collections | `▪ Dolomites · Oct 2025` with a 20 px thumb | `Hidden` when not public | cover, title, date, `Open`, `Manage`, visibility toggle |

The header: `[▾ Users 14] [People] [+ New]`. Title `--text-md` 500 plus the count in chip-count style. Middle slot: a `FilterChip` toggle replacing the checkbox. Right slot: one chip-token button. Padding `--space-2 --space-3`: 44 px. `+ New` opens the sheet with the form instead of swapping the panel body, so the title stops changing to "New User" ([UserManagementPanel.tsx:123-124](../../../app/components/UserManagementPanel/UserManagementPanel.tsx#L123-L124)) and a collapsed panel no longer forces itself open ([:106-112](../../../app/components/UserManagementPanel/UserManagementPanel.tsx#L106-L112)).

The shell: page background, 1 px `--color-border`, `--radius-1`, no body padding, the list is the body. Delete the `--lp-*` ramp. Collapsed is the header only: 44 px, down from 102. Four bars go from 408 px to 176 px. If separation turns out to be needed on a busy desktop row, add one token fill (`--color-surface-raised`) to the header only, not a ramp.

```
mobile, 393px
┌─────────────────────────────────────────┐
│ ▾ Messages 3 unread            View all │ 44
├─────────────────────────────────────────┤
│ ann@x.com · Love the Dolomites set…  2h │ 37
│ bo@y.com · Can I order prints of…    1d │ 37
│ cy@z.com · Hi Zac, quick question…   3d │ 37
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ ▸ Users 14                 People  + New│ 44  (collapsed by default on phone)
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ ▸ Collections 42                        │ 44
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ ▸ Roles 3                         + New │ 44
└─────────────────────────────────────────┘

tap a user row (Modal sheet-bottom under 768px)
┌─────────────────────────────────────────┐
│ Jane Doe                              ✕ │
│ jane@x.com   [Active ▾]                 │
│ Roles  [power ×] [client ×] [+ Add ▾]   │
│ ──────────────────────────────────────  │
│ [Edit] [Reset password] [Open space]    │
└─────────────────────────────────────────┘

desktop, ~1,240px content
┌ All Collections ──┐┌ All Images ────────┐┌ Client Galleries ──┐   nav tiles first
└───────────────────┘└────────────────────┘└────────────────────┘
┌ ▾ Messages 3 unread               View all ┐┌ ▾ Users 14          People  + New ┐
│ ann@x.com · Love the Dolomites set…     2h ││ ● Jane Doe · jane@x.com     2 roles│
│ bo@y.com · Can I order prints of…       1d ││ ● Sam Lee · sam@y.com      Invited │
└────────────────────────────────────────────┘│ …                                  │
┌ ▾ Collections 42                           ┐└────────────────────────────────────┘
│ ▪ Dolomites · Oct 2025                     │┌ ▾ Roles 3                    + New ┐
│ ▪ Iceland · Aug 2025               Hidden  ││ power · 4 members · 6 collections  │
└────────────────────────────────────────────┘└────────────────────────────────────┘
tap → centred Modal overlay, 600px, same body as the sheet
```

`/admin` body order: tiles first, panels second (`[...tileModels, ...panels]`). The tiles are the way to the pages where the work happens; on a phone they become the first thing after the chip bar instead of the last thing after 2,500 px. Panel order by how often they are touched: Messages, Users, Collections, Roles. Phone default: everything collapsed except Messages, derived from `serverIsMobile` so server and client agree. Unread count on the Admin segment (`Segment.count` exists at [SegmentedChip.tsx:5-13](../../../app/components/ui/SegmentedChip/SegmentedChip.tsx#L5-L13)) so "Admin 3" tells the admin why to open it. Collections header keeps the count and drops "View all"; the All Collections tile is the link. Messages keeps "View all" because `/comments` has no tile. Nothing moves into the upper chip tier; it already holds four segments and three chips.

Steps. 1 stands alone; 2 to 5 are one branch; 6 is section 7.

1. Restore the message-row styles and close the guard gap. New `app/components/messages/MessageRow.module.scss` with `.identity`, `.email`, `.body`, `.time`, `.actions`, `.replyButton`, `.meta`, `.unread`, imported by `MessageRow.tsx` itself (the deleted rules are in `git show b1164134:app/components/MessagesPanel/MessagesPanel.module.scss`); `MessagesPanel.tsx` and `CommentsList.tsx` stop passing `styles` for those keys. [styleClassReferences.test.ts](../../../tests/components/styleClassReferences.test.ts): follow a `styles={styles}` prop one hop, or assert `MessageRow.tsx` imports its own module. `tests/components/MessagesPanel/MessagesPanel.test.tsx`: assert the email and body carry the ellipsis classes.
2. Re-skin `ListPanel` and collapse the shape model. [ListPanel.module.scss](../../../app/components/ListPanel/ListPanel.module.scss): delete `--lp-*`, page background, `--color-border` hairlines, header padding 8/12, body padding 0, row padding 8/8, hover `--color-overlay-soft`, delete `.isCollapsed::after`, chip-token `.viewAll`. [listPanelShape.ts](../../../app/components/ListPanel/listPanelShape.ts): `ROW_PADDING_Y` 17, `PANEL_CHROME` `{border 2, headerPadding 16, headerRule 1, bodyPadding 0}`, re-measure the three calibration numbers in Chrome. [adminHubContent.ts](../../../app/%28admin%29/admin/adminHubContent.ts): one `PANEL_SHAPE`, delete `COLLAPSED_BODY_SLIVER`, `COLLAPSED_PANEL_HEIGHT = panelChromeHeight(header)`. [Disclosure.tsx](../../../app/components/ui/Disclosure/Disclosure.tsx): trailing chevron, same glyph as the dropdown chips. Tests: [subtreeRules.test.ts](../../../tests/components/ListPanel/subtreeRules.test.ts), `listPanelSurfaces.test.ts` (loses its ramp contrast gate), [page.collapsedLayout.test.ts](../../../tests/%28admin%29/admin/page.collapsedLayout.test.ts), `page.collapseStates.test.ts`.
3. One row, one sheet, per panel. `Modal` `sheet-bottom` (section 5, step 12). [ListPanel.tsx](../../../app/components/ListPanel/ListPanel.tsx): `ListRow` gets `secondary` and `fact` props and drops `right` as a button slot; new `ListDetailSheet` wrapper around `Modal` + `CloseButton` + optional `EditBar` footer. [UserManagementPanel.tsx](../../../app/components/UserManagementPanel/UserManagementPanel.tsx): rows lose `Update`/`Reset pw`; sheet holds `UserForm`, `UserRolesSection` compact, `GenerateInviteButton`, `Open space`; `People` becomes a `FilterChip`; `+ New` opens the sheet in create mode; delete the `headerTitle` swap. [MessagesPanel.tsx](../../../app/components/MessagesPanel/MessagesPanel.tsx): rows become activatable; sheet renders the `MessageRow` card with `onToggleRead` (`markMessageRead` exists in `app/lib/api/messages.ts`; signature unverified). [RolesPanel.tsx](../../../app/components/RolesPanel/RolesPanel.tsx): delete the per-row `×` and the in-body create/detail modes; `?role=` opens the sheet. [CollectionsPanel.tsx](../../../app/components/CollectionsPanel/CollectionsPanel.tsx): 20 px thumb, inline date, `Hidden` fact; sheet with `Open`, `Manage`, visibility toggle (which endpoint the manage rail uses for visibility is unverified). Tests under `tests/components/*Panel/`.
4. Hub order and phone defaults. [adminHubContent.ts:334](../../../app/%28admin%29/admin/adminHubContent.ts#L334): tiles before panels; `PANEL_ORDER` Messages, Users, Collections, Roles; Collections header drops "View all". [AdminHubClient.tsx:44-45](../../../app/%28admin%29/admin/AdminHubClient.tsx#L44-L45): initial collapsed map from `serverIsMobile`. [UserSpaceGrid.tsx:147](../../../app/components/UserSpace/UserSpaceGrid.tsx#L147): Admin segment gets `count` = unread messages, supplied by `loadAdminHub.ts` from the messages read it already makes. `tests/(admin)/admin/*.test.ts`: re-sweep.
5. Docs: fold the row-shape and collapse changes into whatever tracked doc holds the ListPanel notes, in the same change.
6. `/metadata` lists ([m-metadata.png](screenshots/m-metadata.png)): the same half-cut last row and the footer with no gap. Once `ListPanel` is re-skinned, check whether `MetadataPageClient` shares the fix or needs its own bottom padding.

### Open questions

1. Phone default collapse: Messages open and the rest closed, or everything closed?
2. Users row dot: keep the coloured status dot in the one-line row (it is the only compact status idiom that fits), or drop it and rely on the `Invited` fact?

## 7. All-images header

### What is wrong

![Zac's own capture of /all-images: the sentence "All images ordered by capture date ascending (oldest first)" wraps to two lines under the site title, then a hairline, then three rows of controls. No page title, no count.](screenshots/user-all-images-filters.webp)

The sentence is the only visible text in the header and it is not a heading. It contradicts the control under it: the Order chip is unlit (no sort), the sentence says ascending. It says the same thing twice ("ascending (oldest first)"). The hairline under it is the toolbar's own `border-top`, so it reads as part of the filter bar. Cost at 393 px: two lines at 14 px × 1.6 = 45 px plus 12 px above and 8 px below, about 65 px before the first control, for information the Order chip is meant to carry. Then about 115 px of controls on three rows (seven chips plus the density control alone on the third, the section 1 problem). About 180 px of the first screen before any image, under a 70 px site header.

### Why (in the code)

[AllImagesClient.tsx:61-77](../../../app/components/Admin/AllImagesClient.tsx#L61-L77) synthesises a `CollectionModel` with `title: 'All Images'`, `description: 'All images ordered by capture date ascending (oldest first)'` (`:68`), no `coverImage`, and `displayMode: 'ORDERED'` (`:72`). The page's `h1` is visually hidden ([CollectionPage.tsx:99-100,122](../../../app/components/ContentCollection/CollectionPage.tsx#L99-L122)) because the title is normally the overlay on the cover. With no cover, `createTextOnlyHeaderRow` ([contentLayout.ts:645-646](../../../app/utils/contentLayout.ts#L645-L646)) emits a text-only rail, and the rail renders a title only in inline-edit mode ([CollectionContentRenderer.tsx:382-398](../../../app/components/Content/CollectionContentRenderer.tsx#L382-L398)). So the first thing a reader sees is a caption for a title that is not there. The description is set in `.metadataDescription`, `--text-sm` 400 at line-height 1.6 with `white-space: pre-wrap` ([ContentComponent.module.scss:521-528](../../../app/components/Content/ContentComponent.module.scss#L521-L528)). `ORDERED` starts the Order chip at `off` ([CollectionPageClient.tsx:200](../../../app/components/ContentCollection/CollectionPageClient.tsx#L200)). `PagedImages.totalElements` is in the response, and `CollectionHeader` has a `.count` style for exactly this ([CollectionHeader.module.scss:59-63](../../../app/components/ui/CollectionHeader/CollectionHeader.module.scss#L59-L63)), used by the location, taxonomy and search pages, not here.

### What we will do

1. Delete the description at [AllImagesClient.tsx:68](../../../app/components/Admin/AllImagesClient.tsx#L68).
2. A real header: "All Images" as the title and "N images" as the count through `CollectionHeader`, the way `LocationPage` composes it (read [LocationPage.tsx](../../../app/components/LocationPage/LocationPage.tsx) before copying; the composition was not read). Title `--text-3xl` 700 on desktop, the same component at its mobile padding under 768 px.
3. Make the Order chip tell the truth. The backend returns `capture_date ASC` and pages append in that order ([AllImagesClient.tsx:33-38](../../../app/components/Admin/AllImagesClient.tsx#L33-L38)). Either switch to `displayMode: 'CHRONOLOGICAL'` so the chip starts lit at `asc` ([CollectionPageClient.tsx:191,599](../../../app/components/ContentCollection/CollectionPageClient.tsx#L191)), after checking that the client sort keys on `captureDate` and not `createdAt` as the docblock at `:36-37` warns (unverified), or keep `ORDERED` and let the unlit chip stand, which is accurate once the sentence is gone.
4. Leave the toolbar's row logic alone here; section 1 fixes the density row for every page.
5. Add a back link to `/admin` (section 5, step 8). Tests: `tests/components/Admin/AllImagesClient.test.tsx` if it exists (unverified): assert no description, assert the count.

## 8. Design system

### What is wrong

One correction to the brief first: there is no admin dark surface any more. [app/(admin)/layout.tsx:11-24](../../../app/%28admin%29/layout.tsx#L11-L24) says the `data-surface="dark"` wrapper was removed and admin renders on the light surface. The `[data-surface='dark']` block at [globals.css:199-232](../../../app/styles/globals.css#L199-L232) and the dark ramp at [ListPanel.module.scss:63-68](../../../app/components/ListPanel/ListPanel.module.scss#L63-L68) are unreachable. There is no dark surface to contrast-check, and two files explain a feature that does not exist.

Token bypasses. 71 hardcoded colours across 34 modules and hundreds of raw px values. The worst files:

| File | Raw px | Raw colours | Examples |
| --- | --- | --- | --- |
| [FullScreenModal.module.scss](../../../app/components/FullScreenModal/FullScreenModal.module.scss) | 77 | 31 | `padding: 12px 48px 12px 12px` (:240), `font-size: 12px` (:242), `15px` (:270), `11px` (:372, :401), `width: 40px; height: 56px` (:453-454), `top: 20px; right: 20px` (:535-536), scrims at 0.4/0.5/0.55/0.6/0.65/0.8 and the `white` keyword |
| [Dropdown.module.scss](../../../app/components/ui/Dropdown/Dropdown.module.scss) | 57 | | `margin-bottom: 16px` (:12), `font-size: 13px` (:23), `padding: 10px 12px` (:37), radii `3px`/`2px` (:187, :215, :299, :318), `transition: all` (:42, :113, :323, :347). The only `ui/` component still written entirely in px with its own type ramp |
| [ContentComponent.module.scss](../../../app/components/Content/ContentComponent.module.scss) | 27 | 18 | placeholder greys `#e0e0e0`/`#757575` (:754-758) while `--color-surface-sunken` and `--color-on-surface-muted` exist for this |
| [CollectionListSelector.module.scss](../../../app/components/CollectionListSelector/CollectionListSelector.module.scss) | 13 | 16 | `border-radius: 3px` (:72), `font-size: 11px` (:76) |
| [ReorderOverlay.module.scss](../../../app/components/Content/ReorderOverlay.module.scss) | 16 | 6 | 32 px circles, `16px`/`18px` glyphs |
| [FollowButton.module.scss](../../../app/components/Personal/FollowButton.module.scss) | 10 | | `border-radius: 999px` (:8), `0.75rem` (:11), own `0.15s ease` (:15-16) |
| [CoverCard.module.scss](../../../app/components/ui/CoverCard/CoverCard.module.scss) | 6 | 5 | `border-radius: 3px` (:23); the docblock (:6-12) says the literals are "preserved pending a visual pass". That pass is this one |

Patterns behind the numbers: black scrims at ten different alphas (35% to 85%) across seven files, with no dark scrim ladder in `globals.css` (only `--scrim-light-10..90` at [:47-52](../../../app/styles/globals.css#L47-L52)); three different blacks for "primary fill" (`--color-fg` #111 on Button primary, `--color-primary` #212226 on Load More at [ContentBlockWithFullScreen.module.scss:14](../../../app/components/Content/ContentBlockWithFullScreen.module.scss#L14), `--color-black` #111 on the gate title); two status reds (`--color-error-text` #c33 in ContactForm and ClientGalleryGate, `--color-danger-text` #b91c1c in 13 files including `ui/Field`'s `FormError`); two desktop side-padding tokens (`--default-padding` 0.8rem in PageShell and Footer, `--page-padding-desktop` 2rem in Explore and Collections), which gives `/explore`'s title a different left edge from a `CollectionHeader` title. [.stylelintrc](../../../.stylelintrc) has no rule against raw lengths or colours, so none of this is caught.

Breakpoints are consistent: one real breakpoint, 768 px, mobile-first, 97 occurrences. `BREAKPOINTS.tablet: 1024` and `desktop: 1280` at [constants/index.ts:8-12](../../../app/constants/index.ts#L8-L12) have no CSS counterpart. The `Badge` container query at 300 px is the only other width and is the right tool there.

Touch targets. `IconButton`, `FilterChip`, `SegmentedChip` and `DensityTierControl` paint a 44 px `::after` overlay under `(pointer: coarse)`. `Button` does not ([Button.module.scss:49-57](../../../app/components/ui/Button/Button.module.scss#L49-L57): `.sm` about 28 px tall, `.md` about 38 px, no coarse rule). Thirty-five call sites use `size="sm"`. The most-used component on the site is the only one without a touch target. Others with nothing: Explore directory links about 28 px ([Explore.module.scss:60-73](../../../app/explore/Explore.module.scss#L60-L73)); footer links about 20 px ([Footer.module.scss:26-34](../../../app/components/Footer/Footer.module.scss#L26-L34)); fullscreen tag/collection chips about 24 px ([FullScreenModal.module.scss:397-440](../../../app/components/FullScreenModal/FullScreenModal.module.scss#L397-L440)); fullscreen prev/next 40x56 (width under 44); download format buttons 36 px; SelectStar 36 px; FollowButton about 41 px with its overlay (just under).

Contrast (computed, WCAG 2.x):

| Pair | Ratio | Verdict |
| --- | --- | --- |
| `--color-on-surface-muted` #666 on white | 5.74:1 | AA pass |
| `--color-border` #e5e5e5 on white | 1.26:1 | Fails 3:1 for component boundaries (1.4.11). Every `Field` input, every chip, every outline Button draws its box with this |
| `--color-border-strong` #adb5bd on white | 2.07:1 | Also fails. No border token on the light surface reaches 3:1 |
| FilterChip at `opacity: 0.7`: border / text | 1.17:1 / 7.11:1 | Text fine; the chip boundary is nearly invisible |
| FilterChip `.count` at 0.6 inside 0.7 ([:94-98](../../../app/components/ui/FilterChip/FilterChip.module.scss#L94-L98)) | 2.78:1 | Fails AA at 12 px. Result counts on every chip are unreadable grey |
| `.unavailable` chip at 0.25 | 1.74:1 | Exempt (disabled), but lower than it needs to be |
| `--color-error-text` #c33 on `--color-error-bg` #fee | 4.58:1 | Pass by 0.08 |
| `--color-success-dark` #16a34a on #f0fdf4 ("Message sent!", [ContactForm.module.scss:63-67](../../../app/components/ContactForm/ContactForm.module.scss#L63-L67)) | 3.15:1 | Fails AA for 16 px text |
| White on `--color-danger` #dc3545 | 4.53:1 | Pass by 0.03 |
| Placeholder #757575 on #e0e0e0 | 3.49:1 | Fails AA for text |
| CoverCard title, white on 35% black over a light cover | 3.59:1 | Fails AA for 12 px text on light covers (unverified per image) |
| SaveHeart idle at 0.35 over a mid-grey photo | 1.74:1 | Section 3 |
| `--focus-ring` accent on white | 3.68:1 | Pass |

Typography. Inter via `next/font` on `<body>`; `--font-sans` is declared but only `body` reads it and `body` also gets `inter.className`, so the token is dead. `--font-serif: 'Big Caslon'` is a Mac local font with no webfont ([globals.css:113](../../../app/styles/globals.css#L113)); on Android and Windows it falls to Book Antiqua or the default serif (unverified on device), and it is used on the three auth screens and four collection text-block styles. Weights: 600 (46 uses), 500 (21), 700 (17), `bold` (8, the same weight as 700 written another way), 400 (5). Same role, different size:

| Role | Treatments |
| --- | --- |
| Page h1 | `CollectionHeader` `--text-3xl` 700 sans ([CollectionHeader.module.scss:46-50](../../../app/components/ui/CollectionHeader/CollectionHeader.module.scss#L46-L50)); Explore and the Collections fallback `--text-lg` 600 ([Explore.module.scss:14-19](../../../app/explore/Explore.module.scss#L14-L19), [Collections.module.scss:30-35](../../../app/collections/Collections.module.scss#L30-L35)); StatusPage `--text-2xl` 700 ([StatusPage.module.scss:15-19](../../../app/components/ui/StatusPage/StatusPage.module.scss#L15-L19)); auth card and gallery gate serif `--text-2xl` to `--text-3xl` 700 ([auth-card.module.scss:20-30](../../../app/styles/auth-card.module.scss#L20-L30), [ClientGalleryGate.module.scss:10-20](../../../app/components/ClientGalleryGate/ClientGalleryGate.module.scss#L10-L20)). Four recipes; `/explore`'s h1 is 20 px while `/search`'s is 36 px |
| Chip text | FilterChip and SegmentedChip `--text-sm` 500; Explore `--text-sm` 400; fullscreen `11px`; FollowButton `0.75rem` 600 |
| Caption | StatusText `--text-sm`; Footer `--text-xs`; fullscreen `12px` |
| Form label | Field `--text-sm` 600; Dropdown `13px` 500 muted; gate `--text-sm` 400 muted |
| Section heading | Explore `--text-md` 600; fullscreen `11px` 600 uppercase |

Under 14 px on mobile: the fullscreen metadata panel body is 12 px and its section headers and chips 11 px, and it is the main reading surface for captions, tags and people; footer copyright `--text-xs`; CoverCard title `--text-xs` on a 140 px card; chip counts `--text-xs` at 0.6 opacity; `Badge` at 0.5625rem (9 px) inside a 300 px container, which is below any readable floor.

Hand-rolled controls where a `ui/` component already exists:

| Location | What it is | Should be |
| --- | --- | --- |
| [Explore.module.scss:60-73](../../../app/explore/Explore.module.scss#L60-L73) + [ExploreDirectory.tsx:48,67](../../../app/explore/ExploreDirectory.tsx#L48) | `.directoryLink`, the FilterChip recipe minus the overlay and states | `FilterChip` with `href` |
| [FollowButton.module.scss:2-44](../../../app/components/Personal/FollowButton.module.scss#L2-L44) | Raw button, 999 px radius, own overlay and transitions | Keep as its own component (text pill, not IconButton, per the 2026 decision) but on Button tokens |
| [ContentBlockWithFullScreen.module.scss:12-30](../../../app/components/Content/ContentBlockWithFullScreen.module.scss#L12-L30) + [.tsx:187](../../../app/components/Content/ContentBlockWithFullScreen.tsx#L187) | `.loadMoreButton`, off-brand black, weight 500 | `<Button variant="primary" size="md">` |
| [ClientGalleryGate.tsx:148-159](../../../app/components/ClientGalleryGate/ClientGalleryGate.tsx#L148-L159) | Raw `<input>` and `<p class=gateError>` | `Field` + `Input` + `FormError` from `ui/Field` (the login form two routes away uses them) |
| [InviteForm.tsx:151-157](../../../app/invite/%5Btoken%5D/InviteForm.tsx#L151-L157) | Raw 16 px checkbox with `accent-color: var(--color-black)` | `Checkbox` from `ui/Field` ([Field.module.scss:49-58](../../../app/components/ui/Field/Field.module.scss#L49-L58)) |
| [ShareChip.tsx:179,220](../../../app/components/Personal/ShareChip.tsx#L179) | Two raw `<input>`s, 2 px radius | `Input` from `ui/Field` |
| [FullScreenModal.module.scss:397-440](../../../app/components/FullScreenModal/FullScreenModal.module.scss#L397-L440) | Tag/people/collection chips, 11 px, 4 px 8 px padding | A dark-tone `FilterChip` (link variant for the clickable ones) |
| [FullScreenModal.module.scss:201-233,527-548](../../../app/components/FullScreenModal/FullScreenModal.module.scss#L201-L233) | `.metadataToggle` and `.closeButton`: IconButtons overridden with doubled classes to get a 50-60% scrim instead of IconButton's 70% | An IconButton `variant="scrim"` so the viewer stops fighting the component |
| [ContentComponent.module.scss:286-304](../../../app/components/Content/ContentComponent.module.scss#L286-L304) | SelectStar, 36 px round raw button | `IconButton` or the SaveHeart size (section 3) |
| [ReorderOverlay.module.scss:35-45](../../../app/components/Content/ReorderOverlay.module.scss#L35-L45) | Five raw 32 px circle buttons | `IconButton size="sm"`. Admin, lower priority |
| [FullScreenDownloadButton.module.scss:38-66](../../../app/components/ClientGalleryDownload/FullScreenDownloadButton.module.scss#L38-L66) | `.formatButton` 36 px text buttons | `<Button size="sm">` on a dark scrim, or `SegmentedChip` |
| [Dropdown.module.scss:187,215,299,318](../../../app/components/ui/Dropdown/Dropdown.module.scss#L187) | 3 px / 2 px radii inside a `ui/` component | `--radius-1` |

Empty, loading and error states per route:

| Route | Loading | Empty | Error | Gap |
| --- | --- | --- | --- | --- |
| `/` | root spinner, 100dvh | section 4 | `app/error.tsx` StatusPage with retry | first navigation from home blanks the header (section 4 fixes) |
| `/collections` | root spinner | `EmptyState` ([page.tsx:131-133](../../../app/collections/page.tsx#L131-L133)) | inline failed-read copy ([:109-120](../../../app/collections/page.tsx#L109-L120)), no retry | fallback header is a second h1 recipe |
| `/explore` | Suspense spinner at 50dvh | `ExploreDirectory.tsx:35,45,64` | inline, no retry ([:24-28](../../../app/explore/ExploreDirectory.tsx#L24-L28)) | |
| `/search` | `search/loading.tsx` with header | two `EmptyState`s ([SearchPageClient.tsx:179-185](../../../app/components/SearchPage/SearchPageClient.tsx#L179-L185)) | `search/error.tsx` with retry | "No photos match" has no "Clear filters" action |
| `/location/[slug]` | root spinner | `EmptyState` for filtered-to-zero ([LocationPageClient.tsx:159](../../../app/components/LocationPage/LocationPageClient.tsx#L159)); 404 when both lists are empty | root boundary | same missing "Clear filters" |
| `/tag/[slug]` | root spinner | none; renders the header with "0" and nothing below ([TaxonomyPage.tsx:21-29](../../../app/components/TaxonomyPage/TaxonomyPage.tsx#L21-L29)) | root boundary | no filter bar either; `/tag` and `/location` are different pages for the same job (board F4) |
| `/login`, `/invite/[token]` | n/a | n/a | inline `FormError` | no header, no way back (section 5) |
| `/s/[token]` | root spinner | inherited from `UserSpaceGrid` | 404 on dead token | `ShareBanner` is the only context and reads as a caption |
| Client gallery gate | "Loading gallery…" | n/a | inline `.gateError` in the other red | 5 s failsafe |
| Fullscreen viewer | per-image gating | n/a | none; a failed image load has no visible state (no `onError` found; unverified) | |
| Offline | none anywhere; a fetch failure lands on StatusPage with retry | | | acceptable |

Per-page issues for the pages not covered above:

Home `/`: everything visible belongs to sections 1 to 4. The last tile sits alone on the left of its row and leaves the right half empty ([m-home.png](screenshots/m-home.png), Gorge Climbing; same on [m-collections.png](screenshots/m-collections.png), the Film tile). That is the packer's last-row behaviour on an odd count; whether the last tile should stretch to full width or stay at its aspect ratio is an open question below.

`/collections`: the failed-read branch ([page.tsx:109-120](../../../app/collections/page.tsx#L109-L120)) is a bespoke header plus a `<p>` with no retry; use `StatusPage` with `onRetry` like `/search` and delete `.pageHeader`/`.pageTitle`/`.empty` ([Collections.module.scss:30-43](../../../app/collections/Collections.module.scss#L30-L43)). The "Enchantments 2020" tile title looks cut off at the tile's left edge in [m-collections.png](screenshots/m-collections.png); not traced to a line.

`/explore` ([m-explore.png](screenshots/m-explore.png), otherwise clean): `.directoryLink` to `FilterChip href`; page title to `CollectionHeader title="Explore"` (fixes the 2.8rem vs 0.8rem desktop left edge at [Explore.module.scss:8,33](../../../app/explore/Explore.module.scss#L8)); a count per chip via the `count` prop so a visitor knows which tags are worth tapping; failed-read `.empty` ([:76-80](../../../app/explore/Explore.module.scss#L76-L80)) gets `LoadError`.

`/search` ([m-search.png](screenshots/m-search.png)): no "Clear filters" button in the no-match state ([SearchPageClient.tsx:180](../../../app/components/SearchPage/SearchPageClient.tsx#L180)); it is a filter page with no search box, so either rename the heading or add a text field; chips look smaller than on the collection page and the first row starts right under them with almost no gap (seen, not measured).

`/location/[slug]` ([m-location-dolomites-italy.png](screenshots/m-location-dolomites-italy.png)): `LocationCollections.module.scss:11,16,24,28` gaps and widths are literals; cards are 140 px with a 12 px title over light covers (3.59:1); same missing "Clear filters"; the 140 px cover beside a 36 px title leaves about 190 px for the title at 375 px so a two-word name wraps to three lines (unverified; consider stacking cover above title under 768 px); same tight gap under the chips as `/search`.

`/tag/[slug]`: section 5, item 8, plus no empty state and no filter bar; merge into the location page stack (board F4).

`/login`: [auth-card.module.scss:9](../../../app/styles/auth-card.module.scss#L9) `min-height: 100vh` (iOS Safari over-tall; use `100dvh`); no header or home link; serif h1 only here, on invite and on the gate; placeholder "Your password" repeats the label ([LoginForm.tsx:107,119](../../../app/login/LoginForm.tsx#L107)); the passkey button is `disabled` until an email is typed with no hint why ([:143](../../../app/login/LoginForm.tsx#L143)), and in [m-login.png](screenshots/m-login.png) it reads as grey text on white.

`/invite/[token]`: labels say `Display Name *` ([InviteForm.tsx:111,122,134](../../../app/invite/%5Btoken%5D/InviteForm.tsx#L111)) while login and contact mark nothing; pick one and give `Field` a `required` prop; raw checkbox; same `100vh`, no-header and serif items as login; confirm-password mismatch only on submit.

`/s/[token]`: `ShareBanner` is `--text-sm` muted with no fill or border ([ShareBanner.module.scss:16-25](../../../app/s/%5Btoken%5D/ShareBanner.module.scss#L16-L25)); give it `--color-surface-raised`, `--space-3` padding and `--radius-1` so it reads as a notice.

Fullscreen viewer: the token-bypass table above, plus: close button pinned `top: 20px; right: 20px` ignores `env(safe-area-inset-top)` ([FullScreenModal.module.scss:535-536](../../../app/components/FullScreenModal/FullScreenModal.module.scss#L535-L536)); the position counter is `aria-live="polite"` on every swipe ([FullScreenModal.tsx:412](../../../app/components/FullScreenModal/FullScreenModal.tsx#L412)), which announces "3 / 40" over the image alt each time; metadata title, section headers and items are `<div>`s ([:300-351](../../../app/components/FullScreenModal/FullScreenModal.tsx#L300-L351)), so a screen reader hears a flat run of text; prev/next could be 44x64 with the same subtle look.

Contact form: `.formWrapper { height: calc(100vh - 15rem) }` and `.messageTextarea { min-height: 360px }` ([ContactForm.module.scss:22,54](../../../app/components/ContactForm/ContactForm.module.scss#L22)) push Send below the fold on a 667 px phone and create a nested scroll inside the menu sheet; success banner 3.15:1; error banner on `--color-error-*` while every other form uses `FormError`; "0 / 5000" counter always visible ([ContactForm.tsx:91-95](../../../app/components/ContactForm/ContactForm.tsx#L91-L95)) with a negative-margin hack at `:85`; Send `disabled` while empty (`:102`) so the user never learns why nothing happened; `padding-bottom: 5px` literal (`:45`). `autoFocus` on the gate password input ([ClientGalleryGate.tsx:155](../../../app/components/ClientGalleryGate/ClientGalleryGate.tsx#L155)) pops the iOS keyboard over the modal before the title is read.

Footer: links are inline anchors about 20 px tall ([Footer.module.scss:26-34](../../../app/components/Footer/Footer.module.scss#L26-L34)); copyright `--text-xs` ([:37](../../../app/components/Footer/Footer.module.scss#L37)); desktop side padding `--default-padding` does not align with `/explore` and `/collections` titles.

### Why (in the code)

Covered inline above; every row cites its file.

### What we will do

Quick wins (one PR each, under a day):

1. `Button` 44 px on touch: add the same `@media (pointer: coarse) ::after` overlay `IconButton` uses ([IconButton.module.scss:59-70](../../../app/components/ui/IconButton/IconButton.module.scss#L59-L70)) to [Button.module.scss](../../../app/components/ui/Button/Button.module.scss). Fixes 35 call sites at once.
2. Chip contrast: [FilterChip.module.scss:94-98](../../../app/components/ui/FilterChip/FilterChip.module.scss#L94-L98) and [SegmentedChip.module.scss:86-90](../../../app/components/ui/SegmentedChip/SegmentedChip.module.scss#L86-L90) replace `opacity: 0.6` with `color: var(--color-on-surface-muted)`; drop the chip's own `opacity: 0.7` for `color: var(--color-on-surface-muted); border-color: var(--color-border-strong)`. Then add a `--color-border-control` (#767676, 4.5:1) for `Field` inputs ([Field.module.scss:21](../../../app/components/ui/Field/Field.module.scss#L21)) and the chips.
3. Contact form: [ContactForm.module.scss:22,54,63-67](../../../app/components/ContactForm/ContactForm.module.scss#L22): `100vh` to `dvh`, textarea `min-height: 10rem`, success text on a new `--color-success-text` (#15803d, 4.6:1), counter hidden until 4500, Send enabled with `required` doing the work.
4. Auth pages: [auth-card.module.scss:9](../../../app/styles/auth-card.module.scss#L9) `100dvh`; home link (section 5, step 10).
5. `/tag` empty state: [TaxonomyPage.tsx:21-29](../../../app/components/TaxonomyPage/TaxonomyPage.tsx#L21-L29).
6. "Clear filters" Button in the filtered-empty states: [SearchPageClient.tsx:180](../../../app/components/SearchPage/SearchPageClient.tsx#L180), [LocationPageClient.tsx:159](../../../app/components/LocationPage/LocationPageClient.tsx#L159).
7. Raw inputs to `ui/Field`: `ClientGalleryGate.tsx:148-159`, `InviteForm.tsx:151-157`, `ShareChip.tsx:179,220`; delete the local styles.
8. Load More to `<Button variant="primary">` ([ContentBlockWithFullScreen.tsx:187](../../../app/components/Content/ContentBlockWithFullScreen.tsx#L187)); delete `.loadMoreButton`.
9. Explore directory links to `FilterChip href` ([ExploreDirectory.tsx:48,67](../../../app/explore/ExploreDirectory.tsx#L48)); delete `.directoryLink`.
10. Delete the dead `[data-surface='dark']` block ([globals.css:199-232](../../../app/styles/globals.css#L199-L232)) and [ListPanel.module.scss:63-68](../../../app/components/ListPanel/ListPanel.module.scss#L63-L68), and the paragraph in `(admin)/layout.tsx` that explains them. Or keep one sentence pointing at a future site-wide dark mode, not two files.
11. `ShareBanner` as a notice ([ShareBanner.module.scss:16-25](../../../app/s/%5Btoken%5D/ShareBanner.module.scss#L16-L25)).
12. Footer link height and copyright size ([Footer.module.scss:26-37](../../../app/components/Footer/Footer.module.scss#L26-L37)).

Medium (one to three days each):

13. `--scrim-dark-10..90` ladder next to the light one in [globals.css:47-52](../../../app/styles/globals.css#L47-L52); sweep every `rgb(0 0 0 / N%)` in FullScreenModal, CoverCard, FollowButton, SaveHeart, ContentComponent, FullScreenDownloadButton and MenuDropdown.
14. One h1 recipe: `/explore` and the `/collections` fallback use `CollectionHeader`; StatusPage and the auth card match its size and weight; decide serif or not once, in [CollectionHeader.module.scss:46-50](../../../app/components/ui/CollectionHeader/CollectionHeader.module.scss#L46-L50). Collapse the side-padding tokens: drop `--page-padding-desktop` in `Explore.module.scss` and `Collections.module.scss` and let `PageShell` own the edge.
15. Fullscreen metadata panel onto tokens ([FullScreenModal.module.scss:236-440](../../../app/components/FullScreenModal/FullScreenModal.module.scss#L236-L440)): body `--text-sm`, chips `--text-xs` at 44 px-safe padding, section headers `<h2>`, items `<ul>`, safe-area close, live region off the counter.
16. `IconButton variant="scrim"` so FullScreenModal and FullScreenDownloadButton drop their doubled-class overrides; then SelectStar and ReorderOverlay become IconButtons.
17. `ui/Dropdown` onto the token scale ([Dropdown.module.scss](../../../app/components/ui/Dropdown/Dropdown.module.scss)): 57 raw px, four `transition: all`, four off-scale radii.
18. Stylelint guard in [.stylelintrc](../../../.stylelintrc): `declaration-property-value-disallowed-list` for `/^#/` and `/^rgb/` on colour properties and `/px$/` on `font-size`, `border-radius`, `gap`, `padding`, `margin`, with an allowlist for `1px`, `0` and the `::after` overlay math. Without this, 13 to 17 regress.

Larger:

19. Merge `/tag/[slug]` into the location page stack (board F4): one taxonomy page with filters, collections strip, cover and follow seeding.
20. Decide the brand serif: ship a webfont through `next/font` and use it for every h1, or remove `--font-serif` and its six uses.
21. A `--touch-target-min` audit test: a stylesheet test that reads each `ui/` module and asserts the coarse-pointer overlay is present, so a new component cannot ship without it.

### Open questions

1. Last grid tile on an odd count: stretch to full width (current desktop behaviour on some rows), keep its aspect ratio and leave the gap, or centre it? Affects home and `/collections` on every phone.
2. Serif or sans for h1 (item 20)? Today the serif is Mac-only.
3. `--color-border` at 1.26:1 passes nowhere for component boundaries. Raise the token for everything (changes every hairline on the site) or add `--color-border-control` for inputs and chips only (item 2)?

## 9. Priority list

Quick wins first, then medium, then larger. Within a tier, ordered by what to do first.

| # | Item | Section | Size | Files |
| --- | --- | --- | --- | --- |
| 1 | Restore message-row styles, close the style-class guard gap | [6](#6-admin-page-and-list-panels) | S | `app/components/messages/MessageRow.module.scss` (new), `MessageRow.tsx`, `MessagesPanel.tsx`, `CommentsList.tsx`, `tests/components/styleClassReferences.test.ts` |
| 2 | Move `<Footer />` from the root layout into `PageShell` and `CollectionPage` | [4](#4-first-paint-and-the-footer) | S | `app/layout.tsx`, `PageShell.tsx`, `CollectionPage.tsx`, five shell-less pages |
| 3 | `app/loading.tsx` renders `PageShell` + shimmer body | [4](#4-first-paint-and-the-footer) | S | `app/loading.tsx`, `app/loading.module.scss`, shared shimmer partial under `app/styles/` |
| 4 | Density on the bottom chip row: 180 px floor, row gap, joined segments | [1](#1-collection-page-info-block) | S | `FilterToolbar.module.scss`, `DensityTierControl.module.scss` |
| 5 | Remove dead gaps in the info block | [1](#1-collection-page-info-block) | S | `ContentComponent.module.scss` (`.metadataBlockInner`, `.metadataDescriptionContainer`, `.metadataSiblingsContainer`) |
| 6 | Backend: `populateParents` sends cover URLs | [2](#2-related-items) | S | `edens.zac.backend/.../CollectionProcessingUtil.java:536-562`, `CollectionModel.java` |
| 7 | Parents first in Related; restyle the no-cover chip | [2](#2-related-items) | S | `contentLayout.ts:468`, `tests/utils/contentLayout.test.ts:1097-1140`, `ContentComponent.module.scss:649-671` |
| 8 | Heart: 32 px box, 44 px overlay, 18 px glyph; SelectStar to match | [3](#3-heart-overlay) | S | `SaveHeart.module.scss`, `ContentComponent.module.scss:286-304`, `docs/spikes/2026-features/pf-performance-platform.md` |
| 9 | Menu: opaque panel, `100dvh`, 44 px icon buttons, drop Home, Me to Your space, Clear Cache admin-only | [5](#5-menu-and-navigation) | S | `MenuDropdown.tsx:280-370`, `MenuDropdown.module.scss:7-17,83,191`, `SiteHeader.module.scss:96`, `tests/components/MenuDropdown.test.tsx` |
| 10 | Chip padding 4/8; SegmentedChip and role chips to match | [1](#1-collection-page-info-block) | S | `FilterChip.module.scss:6`, `SegmentedChip.module.scss:40`, `UserRolesSection` SCSS |
| 11 | Flat date chips collapse to 2 on phones | [1](#1-collection-page-info-block) | S | `FilterToolbar.tsx:171,268`, `CollectionContentRenderer.tsx:475`, `tests/components/ui/FilterToolbar.test.tsx` |
| 12 | `/all-images`: delete the description, add `CollectionHeader` with count, fix the Order chip | [7](#7-all-images-header) | S | `AllImagesClient.tsx:61-77` |
| 13 | `Button` coarse-pointer 44 px overlay | [8](#8-design-system) | S | `Button.module.scss` |
| 14 | Chip count and border contrast | [8](#8-design-system) | S | `FilterChip.module.scss:19,94-98`, `SegmentedChip.module.scss:86-90`, `Field.module.scss:21`, `globals.css` |
| 15 | `/tag` heading "Untitled" and no 404 on unknown slug; empty state | [5](#5-menu-and-navigation), [8](#8-design-system) | S | `app/tag/[slug]/page.tsx`, `TaxonomyPage.tsx:16-29`, `resolveTaxonomy.ts` |
| 16 | `/home` redirects to `/`; Related home link becomes `/` | [5](#5-menu-and-navigation) | S | `app/[slug]/page.tsx:91`, `contentLayout.ts`, `CollectionJsonLd` |
| 17 | `/login` and `/invite` get a header or home link, `100dvh` | [5](#5-menu-and-navigation), [8](#8-design-system) | S | `app/login/page.tsx:27`, `app/invite/[token]/page.tsx:57`, `app/styles/auth-card.module.scss:9` |
| 18 | Admin subpages get a back link to `/admin` | [5](#5-menu-and-navigation) | S | `app/(admin)/comments/page.tsx`, `metadata/page.tsx`, `all-images/page.tsx`, create form, or `PageShell` `backHref` |
| 19 | `sizes` = tile width on every viewport | [4](#4-first-paint-and-the-footer) | S | `CollectionContentRenderer.tsx:701`, `tests/components/Content/` |
| 20 | Contact form: `dvh`, 10rem textarea, success colour, counter, Send enabled | [8](#8-design-system) | S | `ContactForm.module.scss:22,54,63-67`, `ContactForm.tsx:91-102`, `globals.css` |
| 21 | "Clear filters" in filtered-empty states | [8](#8-design-system) | S | `SearchPageClient.tsx:180`, `LocationPageClient.tsx:159` |
| 22 | Raw inputs to `ui/Field`; Load More to `Button`; Explore links to `FilterChip` | [8](#8-design-system) | S | `ClientGalleryGate.tsx`, `InviteForm.tsx`, `ShareChip.tsx`, `ContentBlockWithFullScreen.tsx:187`, `ExploreDirectory.tsx:48,67` |
| 23 | Delete the dead dark-surface CSS | [8](#8-design-system) | S | `globals.css:199-232`, `ListPanel.module.scss:63-68`, `app/(admin)/layout.tsx` docblock |
| 24 | Tags as links on the collection header | [5](#5-menu-and-navigation) | S | `CollectionContentRenderer.tsx:452` |
| 25 | `FullScreenModal` chunk: `loading` + error boundary | [4](#4-first-paint-and-the-footer) | S | `ContentBlockWithFullScreen.tsx:16-20,198` |
| 26 | Related strip on mobile (96x48 tiles, horizontal scroll) | [2](#2-related-items) | M | `ContentComponent.module.scss:588-614` |
| 27 | `Modal` `sheet-bottom` variant | [5](#5-menu-and-navigation) | M | `Modal.tsx:10`, `Modal.module.scss`, `tests/components/ui/Modal.test.tsx` |
| 28 | Bottom nav bar, mobile only | [5](#5-menu-and-navigation) | M | `app/components/ui/BottomNav/` (new), `PageShell.tsx`, `SiteHeader.tsx`, `globals.css`, `tests/components/ui/BottomNav.test.tsx` |
| 29 | Menu as a bottom sheet on mobile | [5](#5-menu-and-navigation) | M | `MenuDropdown.module.scss:7`, `MenuDropdown.tsx:219` |
| 30 | `ListPanel` re-skin and shape collapse | [6](#6-admin-page-and-list-panels) | M | `ListPanel.module.scss`, `listPanelShape.ts`, `adminHubContent.ts`, `Disclosure.tsx`, four tests |
| 31 | Hub order, phone collapse defaults, Admin unread count | [6](#6-admin-page-and-list-panels) | M | `adminHubContent.ts:247-252,334`, `AdminHubClient.tsx:44-45`, `UserSpaceGrid.tsx:147`, `loadAdminHub.ts` |
| 32 | `--scrim-dark-*` ladder and sweep | [8](#8-design-system) | M | `globals.css:47-52`, seven SCSS modules |
| 33 | One h1 recipe; one desktop side-padding token | [8](#8-design-system) | M | `CollectionHeader.module.scss:46-50`, `Explore.module.scss`, `Collections.module.scss`, `StatusPage.module.scss`, `auth-card.module.scss` |
| 34 | Fullscreen metadata panel onto tokens and semantics | [8](#8-design-system) | M | `FullScreenModal.module.scss:236-440,535-536`, `FullScreenModal.tsx:300-351,412` |
| 35 | `IconButton variant="scrim"`; SelectStar and ReorderOverlay onto it | [8](#8-design-system) | M | `IconButton.module.scss`, `FullScreenModal.module.scss:201-233,527-548`, `FullScreenDownloadButton.module.scss`, `ContentComponent.module.scss:286-304`, `ReorderOverlay.module.scss` |
| 36 | `ui/Dropdown` onto tokens | [8](#8-design-system) | M | `Dropdown.module.scss` |
| 37 | Stylelint guard against raw colours and px | [8](#8-design-system) | M | `.stylelintrc` |
| 38 | SSR viewport for Search, Taxonomy, Location; retire `.layoutSkeleton` | [4](#4-first-paint-and-the-footer) | M | `SearchPageClient.tsx`, `TaxonomyPage.tsx`, `LocationPageClient.tsx`, `Component.tsx:227-233`, `ContentComponent.module.scss:761-779` |
| 39 | One row + detail sheet per admin panel | [6](#6-admin-page-and-list-panels) | L | `ListPanel.tsx`, `UserManagementPanel.tsx`, `MessagesPanel.tsx`, `RolesPanel.tsx`, `CollectionsPanel.tsx`, tests under `tests/components/*Panel/` |
| 40 | Link `/search`; decide its bar cell (SD4) | [5](#5-menu-and-navigation) | L | `MenuDropdown.tsx`, `BottomNav.tsx`, `docs/spikes/2026-features/sd-search-discovery.md` |
| 41 | Merge `/tag` into the location page stack (F4) | [8](#8-design-system) | L | `TaxonomyPage.tsx`, `LocationPage*`, `app/tag/[slug]/page.tsx` |
| 42 | Brand serif decision (webfont or remove) | [8](#8-design-system) | L | `globals.css:113`, `auth-card.module.scss`, `ClientGalleryGate.module.scss`, `ContentComponent.module.scss:142,203,472,638` |
| 43 | Percent-width tiles with `aspect-ratio` | [4](#4-first-paint-and-the-footer) | L | `BoxRenderer.module.scss`, two renderers, pixel-asserting tests |
| 44 | `--touch-target-min` audit test | [8](#8-design-system) | L | new test under `tests/components/ui/` |

## Appendix

### What was measured and how

Browser measurements: Chromium headless shell 1217 driven by Playwright, 393x852 at DPR 2 with an iPhone 14 Pro user agent for mobile and 1440x900 at DPR 1 for desktop, against `http://localhost:3001` with the backend on `localhost:8080`, anonymous session. Element boxes, computed styles, CLS (`PerformanceObserver` type `layout-shift`, buffered, injected before load) and a per-frame sampler of footer top, document height and spinner presence. The 4 s image delay held every `_next/image` and CloudFront response. "Settled" means the load event, up to 9 s waiting for network idle, then 1.5 s; `networkidle` was never reached because three `GET /api/proxy/api/auth/me` calls (401) never finish in headless Chromium, although curl gets the 401 in about 20 ms. Whether that is a site issue or a headless quirk was not established. The stream-order byte offsets came from a raw `GET /` with an iPhone UA. The menu measurements in section 5 were taken at 375x812 in the Claude Browser pane.

Full-page captures are stitched from viewport-sized slices taken while scrolling, because Playwright's `fullPage` resizes the viewport to the page height and this site's grid layout depends on viewport height, which reflowed the grids into a layout a phone never shows. Pages taller than 12,000 CSS px are cut at about 12,780 px, and full-page files were cropped to 6,000 px tall for the repo. The Next.js dev badge is hidden in every shot except `m-load-*-t100.png` and `-t800.png`.

Computed, not measured: the admin panel row and chrome heights (from the stylesheets and `listPanelShape.ts`), the trailing-group width thresholds in section 1 (confirmed by the 393 px measurement: group 115 px, reset 27.3 px), and every contrast ratio (WCAG 2.x relative luminance from the token values).

### Screenshots

All under `docs/reviews/2026-10-17/screenshots/`. Three files are under `screenshots/private/` because they show real user names, email addresses and a real message: `m-admin.png`, `d-admin.png`, `m-comments.png`. Do not commit those three to a public repo without blurring.

| File | What it shows |
| --- | --- |
| user-dolomites-film-info-component.png | Zac's capture, signed in: the info block he complained about |
| user-collection-grid-hearts.webp | Zac's capture, signed in: grid with the 44 px heart overlays |
| user-all-images-filters.webp | Zac's capture: `/all-images` header with the description sentence |
| m-home.png | Home, mobile full page: 2-up grid, last tile alone on the left |
| d-home.png, d-home-top.png | Home, desktop full page and above the fold |
| m-collections.png | `/collections`, mobile: filter bar, density control, grid; Enchantments 2020 title clipped |
| d-collections.png, d-collections-top.png | `/collections`, desktop |
| m-explore.png | `/explore`: location and tag chips, wraps cleanly |
| m-search.png | `/search`: 200 photos, five chips, Load More at 30 |
| m-collection-dolomites-film-top.png | `/dolomites-film` above the fold: cover, date/location, Related, four chip rows |
| m-collection-dolomites-film-full.png | Same, whole page |
| d-collection-dolomites-film-top.png | Desktop header block: about 270 px of white in the rail |
| d-collection-dolomites-film-full.png, d-collection-dolomites-film-scrolled-1500.png | Desktop whole page and mid-page grid |
| m-collection-pnwer-2026-top.png | 271-image collection: text-only Related link, Order chip dark on load |
| m-collection-pnwer-2026-full.png | Same, first 12,780 px |
| m-location-dolomites-italy.png, d-location-dolomites-italy.png | Location page with related collections |
| m-tag-alpine.png | Real tag page, heading reads "Untitled" |
| m-tag-film-unknown-slug.png | Unknown tag slug: "Untitled, 0 photos", no 404 |
| m-login.png | Sign in form, no header, top third blank |
| m-user.png | Anonymous `/user` is a 404 page; "Return home" is plain text |
| private/m-admin.png | Admin hub, mobile: Users rows with stacked buttons, last row half cut, message row collision |
| private/d-admin.png | Admin hub, desktop |
| private/m-comments.png | `/comments`: "Reply in Gmail" running into "Mark read" |
| m-all-images.png | `/all-images`, first 12,780 px |
| m-metadata.png | Admin tags/people/locations: fixed-height boxes, last row half cut, no gap above the footer |
| m-home-menu-open.png | Menu open: translucent panel, 410 px empty, Clear Cache visible |
| m-collection-dolomites-film-filter-people-open.png | People dropdown covering the date chip row |
| m-collection-dolomites-film-filter-order-open.png | Order toggled on: dark fill, caret, reset x appears |
| m-load-dolomites-film-t100.png, -t800.png, -settled.png | Load sequence with images held 4 s: spinner, spinner, settled |
| m-load-collections-t100.png, -t800.png, -settled.png | Same on `/collections`: spinner, grey tiles in place, photos in the same boxes |

### Not verified

Merged from every section; each is stated where it matters above and repeated here so nothing is scheduled on an assumption.

- Trailing-group thresholds at 360, 375 and 414 px are computed from stylesheet values; only 393 px was measured.
- The tap-steal between the wrapped density row and the chip row above is derived from the file's invariant comments, not touch-tested.
- Dark-theme invisibility of the pill's black-tinted border follows from the values; not checked on a device.
- Backend tests asserting `parents[].coverImageUrl == null` were not searched.
- The role-chip SCSS under `UserRolesSection` was located but not read.
- Whether `filterItems` carries the tag slug for item 24.
- The cause of the "Untitled" tag heading and the missing 404 on an unknown slug.
- The cause of the clipped "Enchantments 2020" tile title and the reserved arrow width on the inactive Order chip.
- Why the Order chip is dark on load for `/pnwer-2026` and light for `/dolomites-film`.
- Production streaming behaviour on Amplify, and whether the cold-dev "fallback re-shown after hydration" ever happens there.
- The size of the hydration shift on `/search`, `/tag` and `/location`, which take the `.layoutSkeleton` path.
- `100vh` menu cropping and the `Big Caslon` fallback on iOS and Android devices.
- Real row counts on the production admin account; the exact viewport of Zac's screenshots.
- Whether `UserForm`'s role add saves immediately; `markMessageRead`'s signature; the endpoint for the collection visibility toggle; how `LocationPage` composes `CollectionHeader`; the client sort key for `CHRONOLOGICAL`; the chip bar's row count at 393 px on `/admin`.
- What an anonymous visitor sees on `/all-client-galleries`.
- Whether `tests/components/Admin/AllImagesClient.test.tsx` exists.
- Search toolbar chip count at 375 px; location header wrap at 375 px; cover-card title legibility on light covers; fullscreen chevrons on bright photos; a failed image load in the fullscreen viewer.
- The never-finishing `/api/auth/me` 401s in headless Chromium.
