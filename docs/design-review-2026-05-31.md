# Edens.zac — Full Design Review

> **Date:** 2026‑05‑31
> **Method:** Live visual tour (dev server :3001, desktop + mobile, every page type) + an 11‑agent read‑only code review (6 page‑clusters × 5 cross‑cutting dimensions: UX flows, component reuse, design tokens, SCSS, a11y). Findings below are cross‑corroborated between what was *seen* and what was *read in the source*.
> **Through‑line:** how to collapse *many* divergent design standards into *one* unified, simple, reusable set of **Main Design Elements** — and simplify the logic underneath while we do it.

---

## 0. The one‑paragraph verdict

This is a genuinely well‑built photography portfolio with a **strong, already‑unified core** (one render pipeline, one excellent layout engine, a real token foundation) sitting under a **fractured surface layer** (no shared UI primitives, three competing color systems, navigation built on the wrong element). None of the problems are deep or architectural — they are *concentrated foundation gaps*. The single highest‑leverage move is to stop re‑implementing buttons/modals/chips/badges per feature and promote ~10 canonical **Main Design Elements**, sitting on **one** color‑token taxonomy and **one** painted page surface. Do that and most of the failures below disappear at once, the code shrinks, and every future change becomes a one‑place edit.

---

## 1. The five foundation truths (what recurs in almost every report)

| # | Truth | Why it matters | The one fix |
|---|-------|----------------|-------------|
| **1** | **The page never paints a background.** `globals.css` declares `--color-bg`/`--color-fg` + `color-scheme:light` but never binds them to `html`/`body` (only `#000` behind `body.scroll-locked`). | Verified live: `html`/`body` background = `rgba(0,0,0,0)`, text = black, browser in dark mode. Result: **404, `/metadata` content, SiteHeader title, admin headings all render black‑on‑black / invisible.** | `html, body { background-color: var(--color-bg); color: var(--color-fg); }` |
| **2** | **No canonical UI primitives exist.** ~30–38 ad‑hoc `*Button` classes, 4 divergent close buttons (2 byte‑identical), 5 modal shells, 2 filter bars, 6 chip implementations, 3 badge definitions. | This *is* the "many standards" problem. Every feature reinvents the same elements with slightly different padding/color/behavior. | Build the **Main Design Elements** set (§6). |
| **3** | **The color layer is fractured and partly phantom.** Three families (semantic `--color-fg/-bg`, admin `--color-text-primary/#333`, the `--color-overlay-light-*` ramp) + **~15 undeclared "shadow" tokens** (`--text-primary`, `--border-color`, `--color-accent`…) that silently fall back to hex. | The admin UI is literally un‑themeable because the tokens it references don't exist. Meanwhile the **spacing/radius/type/z‑index scales are healthy** — they're the template the color layer should copy. | Collapse to one semantic taxonomy + a stylelint rule banning undeclared `var()`. |
| **4** | **Primary navigation uses the wrong element.** Home/collection tiles navigate via `router.push` on a `<div onClick>` — no `<a href>`. Three different nav idioms coexist (`<Link>` in header, `button`+push in menu, `div`+push in tiles). | No SEO crawlability, no middle‑click / open‑in‑new‑tab, weak keyboard semantics on the site's *main* navigation. (Tiles *do* use `next/image` with `alt` — that part is fine.) | One `NavLink`/`Tile` primitive that is always a real `<a>`. |
| **5** | **Information architecture strands content.** The hamburger is the *only* nav; "Blogs" links to a 404 (`/all-blogs`); `/tag`, `/location`, `/people` have **no front door** (reachable only via Google or inline chips); `/metadata` is an admin CRUD screen mislabeled as public; the fullscreen viewer isn't deep‑linkable and the Back button exits the collection instead of closing the modal. | A whole dimension of content (the taxonomy) is invisible to humans, and the deepest interaction (fullscreen) is a mobile dead‑end. | A public directory + a footer/breadcrumb + URL‑synced fullscreen. |

---

## 2. UX & user‑flow analysis

### The information‑architecture map (as it exists today)

```
            ┌─ "Zac Edens" (→ / )  [real link]
 SiteHeader ┤
            └─ ☰ MenuDropdown  ──┬─ About        (in‑dropdown panel)
              (the ONLY nav)     ├─ Contact      (in‑dropdown panel, good form)
                                 ├─ Blogs  →  /all-blogs  ❌ 404
                                 ├─ Instagram / GitHub
                                 └─ [local only] Create ×2 (dup), Update, Comments, Clear Cache

 Home (PARENT)  → tiles (div onClick, not links) → leaf collection
 Leaf collection → image (div onClick) → FullScreen modal (state‑only, not deep‑linkable)
                 → inline chips → /location/[slug], /tag/[slug]   (only entry to taxonomy)
 /people/[slug]  → ⚠ ZERO entry points anywhere in the UI
 /metadata       → ⚠ admin CRUD, mislabeled, no server auth gate
 /all-collections → public, but NOTHING links to it ("Browse all work" is missing)
 Client gallery  → gate → list → gallery → download   ✅ the most complete journey
```

### Journey‑by‑journey

- **First‑time visitor → discover work.** Lands on the editorial home (strong first impression). But the *only* way deeper is clicking image tiles that aren't links, and the *only* nav is one hamburger icon. There is no "Browse all work," no taxonomy directory, no footer. Discoverability rests entirely on one icon.
- **Drill into a collection → view fullscreen.** The leaf gallery is the site's best moment (immersive, full‑bleed). But on first paint you see the header then a **blank black void** until lazy‑gated images stream in. Opening an image into fullscreen is excellent *in‑modal* (swipe, arrows, Esc, metadata panel) — but it's **React‑state‑only**: not shareable, and **Back exits the whole collection** instead of closing the modal (the biggest mobile journey gap).
- **Browse by location / person / tag.** The pages are well‑built and SEO‑clean — but orphaned. `/people` has no entry point at all; a person page's only header is "2 photos" (no name → no orientation). `/location` has a full filter bar; `/people` and `/tag` have none, despite being the same concept.
- **Recover from a wrong URL / error.** `not-found.tsx` renders without site chrome and (in dark mode) invisibly. A recoverable state becomes a true dead end.
- **Client receives a gallery.** The best‑designed journey in the app: password gate with a real state machine (idle/verifying/unlocking), a 5‑second failsafe, status‑specific errors (429/404/403), `aria-live`, autofocus, and a download picker. **This is the quality bar the rest of the site should meet** — except the gate card itself is hit by the dark‑mode bug, and "Download All" gives a blind 4‑second timer instead of real feedback.

---

## 3. Component review

### Best (keep, and build *on* these)

| Component | Why it's a model |
|-----------|------------------|
| `lib/components/CollectionPageWrapper.tsx` | One entry point for home + every collection + parent + client gallery. Unification already achieved structurally. |
| `utils/rowCombination.ts` + `rowStructureAlgorithm.ts` + `contentRatingUtils.ts` (**BoxTree**) | The crown jewel: AR‑aware, rating‑weighted, single‑mode row composition. Well‑documented, test‑covered. Produces the signature look. |
| `ImageMetadata/UnifiedMetadataSelector.tsx` | A real generic `Dropdown<T>` (multi/single select, inline add, `showWhen`, keyboard, click‑outside). **Proof the team can build canonical primitives — promote it.** |
| `ContactForm.tsx` + `utils/contactApi.ts` | Proper form semantics, char counter, disabled logic, typed discriminated‑union results, routes through a proxy (no leaked email). |
| `RatingStars.tsx` | Textbook `radiogroup`/`radio`, `aria-checked`, sr‑only labels. The a11y reference for all custom controls. |
| `hooks/useBodyScrollLock.ts`, `LoadingSpinner.tsx`, `ErrorBoundary.tsx` | Small, accessible, token‑driven, genuinely reusable. `ErrorBoundary` is even dark‑readable — the page‑level error/404 routes should look like it. |
| `(admin)/admin/AdminHubGrid.tsx` | Uses real `next/link` + `next/image` tiles — **more correct than the public home tiles.** |
| Container‑query title scaling in `ContentComponent.module.scss` (`clamp(1.25rem, 18cqi, 3rem)`) | Exactly the modern fluid pattern to standardize on — it just needs to spread to the other 34 modules. |
| The `--space-*` / `--radius-*` / `--text-*` / `--z-*` scales + `Z_INDEX` sync | The healthy half of the token system. The template for fixing the color half. |

### Needs work

| Component | Issue |
|-----------|-------|
| `Content/CollectionContentRenderer.tsx` | ~560‑line client component doing TEXT/GIF/IMAGE/COLLECTION/placeholder/error/reorder/cover‑select; navigates via `div onClick`+`router.push` (not `<a>`); duplicates NaN‑dimension recovery already in `contentRendererUtils`. |
| `Content/BadgeOverlay.tsx` | Good instinct, but fed the **raw `CollectionType` enum** → public sees `PARENT`/`PORTFOLIO`. Only 2 hard‑coded variants; position implicit in class name. |
| `ImageMetadata/ImageMetadataModal.tsx` | 1100+‑line god‑component; `position:absolute + inset:0 + 100vh + top:scrollPosition` instead of a portal; heavy inline styles; 4 bespoke buttons; 3 `window.confirm`. |
| `TextBlockCreateModal.tsx` | A *second* independent modal shell + third close‑button style. |
| `MetadataPage/Metadata{Tag,Person,Location}List.tsx` | ~95% identical (state + handlers + JSX) — three copies of one edit/delete list. |
| `SiteHeader.module.scss` | Hardcodes `color:black` (lines 49, 92) with no scrim → invisible title. |
| `MenuDropdown.tsx` | Duplicate "Create" item (two handlers → same route/label); button‑reset copy‑pasted 5×; re‑implements click‑outside/Esc/scroll‑lock. |
| `ClientGalleryDownload.tsx` | "Download All" uses a blind 4s timer, not real success/error (the sibling `ImageDownloadOverlay` does it correctly). |
| `globals.css` (color + foundation layer) | The fix‑site for truths #1 and #3. |

### Duplicate (one concept, many implementations) → *the consolidation catalog*

| Concept | Where it's duplicated | Collapse into |
|---------|----------------------|---------------|
| **Buttons** | ~30–38 `*Button` classes across ImageMetadataModal, TextBlockCreateModal, Comments, ClientGalleryGate/Download, CollectionListSelector, ErrorBoundary, SiteHeader, MenuDropdown, ManageClient (8 alone)… | `<Button variant size loading leftIcon>` |
| **Close buttons** | `fullscreen-image.scss:395` ≡ `ImageMetadataModal.scss:347` (byte‑identical) + TextBlock ghost glyph + MenuDropdown `CircleX` — 4 X's | `<CloseButton>` (a `<IconButton>` specialization) |
| **Modals/overlays** | FullScreenModal (correct, portal) vs ImageMetadataModal (absolute+100vh, no portal) vs TextBlockCreateModal vs MenuDropdown sheet vs ClientGalleryGate card | one `<Modal variant=overlay\|sheet\|fullscreen>` |
| **Filter bars + chips** | `CollectionFilterBar` (borderless, dropdowns, slider) vs `LocationFilterBar` (bordered pills, film/digital colors); **6 chip variants** total; `cycleDateSort` exists twice with *different* cycle orders | one `<FilterToolbar>` + `<FilterChip active count tone state>` |
| **Badges** | `.dateBadge`/`.cardTypeBadge` defined in **both** `globals.css` (211‑235) **and** `ContentComponent.module.scss` (160‑183) + `BadgeOverlay.tsx` on top | one `<Badge>` (keep `BadgeOverlay`, delete the CSS copies) |
| **Form fields** | `formGroup/Label/Input/Select/Textarea` re‑declared in ImageMetadataModal, TextBlockCreateModal, ContactForm, forms.module.scss | `<Field>/<Input>/<Select>/<Textarea>/<Checkbox>/<FormError>` |
| **Page scaffold** | `.container/.main/.pageHeader` copy‑pasted verbatim across **8 modules** while shared `layout.module.scss` holds 3 trivial rules | `<PageShell>` + `.pageContainer/.pageMain/.pageHeader` |
| **Click‑outside / Esc / scroll‑lock** | hand‑rolled in MenuDropdown (3 effects), FullScreenModal, etc. — while `useClickOutside`/`useBodyScrollLock` already exist | fold into the canonical `<Modal>`/`<Dropdown>` |
| **Status pages** | `not-found.tsx` + `error.tsx` (no‑style `.main`) + two divergent retry buttons | one `<StatusPage>` (reuse ErrorBoundary's readable pattern) |

### Dead code / to remove
- `FullScreenModal/FsDebug.tsx` — **self‑documented as TEMPORARY, still imported and shippable via `?fsdebug=1`** (injects `!important` outlines + a magenta bar into prod). Delete before merging branch `0144`.
- `About.tsx` / `ContactForm.tsx` — dead `onBack` prop (`_onBack`, never used).
- Duplicate "Create" entry in `MenuDropdown`.
- `@keyframes gateSpinnerRotate` (duplicate of `LoadingSpinner`'s `spin`).

---

## 4. Design wins (the identity to protect)

1. **Full‑bleed BoxTree galleries** — edge‑to‑edge, gapless, varied row compositions. Immersive, intentional, distinctly *not* a generic grid. This is the brand; everything else should serve it.
2. **The editorial home** — full‑width stacked tiles with centered serif overlay titles, scaling fluidly via container queries; translates beautifully to mobile.
3. **One render pipeline for everything** — home, leaf, parent, and client galleries all flow through the same code; parent children are converted to image models so there's no special‑case parent UI. *The unification you want is already true at the structural level — don't fragment it.*
4. **The client‑gallery flow** — the most thoughtful journey: state machine, failsafe, granular errors, privacy defense‑in‑depth (cover stripped from lists, OG image suppressed for protected galleries).
5. **A real token foundation** — spacing/radius/type/z‑index scales are coherent, documented, and widely adopted; `Z_INDEX` is mirrored in TS with a sync contract.
6. **Pockets of excellent a11y** — `RatingStars`, modal/dropdown triggers as real buttons with `aria-*`, the density control as a native range input.

---

## 5. Design failures (severity‑ranked)

| Severity | Failure | Evidence | Fix |
|----------|---------|----------|-----|
| 🔴 Critical | Page canvas + default text invisible in OS dark mode | `globals.css:159‑167` body sets no bg/color; `:3` `color-scheme:light`; `:182` only `#000` when scroll‑locked. Live: bg `rgba(0,0,0,0)`, text black. | `html,body{background:var(--color-bg);color:var(--color-fg)}` |
| 🔴 Critical | Primary nav tiles are non‑link, non‑keyboard `div onClick` | `CollectionContentRenderer.tsx:108‑111, 531` | Render tile nav as `next/link <Link>`; keep `onClick` only for fullscreen‑open. |
| 🔴 Critical | 404 / error pages are chrome‑less + invisible | `not-found.tsx:20`, `error.tsx:36` → `layout.module.scss .main` (padding only) | One `<StatusPage>` on the painted surface. |
| 🟠 High | No shared Button/Modal/Dropdown/Badge/Chip — every surface reinvents them | §3 catalog | Build the Main Design Elements (§6). |
| 🟠 High | "Shadow namespace": ~15 undeclared tokens silently fall back to hex; admin un‑themeable | `--text-primary` ×13, `--text-secondary` ×8, `--border-color`, `--color-accent`, `--color-warning`… none declared | Declare‑as‑alias or rename; add stylelint var‑allowlist. |
| 🟠 High | Two divergent filter bars + filter state **never URL‑driven** (shareable/back‑button broken) — despite tested `serialize/parseFilterToParams` existing, **wired to nothing** | `contentFilter.ts:493/567` tested, imported by 0 pages | One `FilterToolbar`; wire the existing URL helpers. |
| 🟠 High | "Blogs" menu link → `/all-blogs` 404; taxonomy pages have no front door; `/metadata` is unguarded admin CRUD | `MenuDropdown.tsx:80‑83`; no `/all-blogs` route; `/metadata` gated only by `isLocalEnvironment()` | Fix/remove Blogs; add a public directory; move `/metadata` under `(admin)` with real auth. |
| 🟠 High | Fullscreen not deep‑linkable; Back button exits collection | `useFullScreenImage.tsx:61‑76` (state only, no history) | Sync open image to URL + push history. |
| 🟠 High | `FsDebug` temporary diagnostic shippable in prod via `?fsdebug=1` | `FullScreenModal.tsx:13,87‑89,292` | Delete the file + wiring. |
| 🟡 Medium | No focus trap / focus return in any modal or the dropdown | `FullScreenModal`, `MenuDropdown`, `ImageMetadataModal` | One Modal primitive owns focus management. |
| 🟡 Medium | Collection titles aren't real headings (`div.textOverlay`) → pages lack an `h1` | `CollectionContentRenderer.tsx:451` | Emit a real (optionally visually‑hidden) `h1`. |
| 🟡 Medium | Internal `CollectionType` leaked to public as a badge (`PARENT`/`PORTFOLIO`) | `contentRendererUtils.ts:173` | Map to curated public labels or suppress. |
| 🟡 Medium | Blank‑on‑load: grid computed client‑only, no SSR/skeleton | `Component.tsx:127‑156` (rows=[] until `contentWidth` measured) | Eager‑render first row(s) + blur/skeleton placeholders. |
| 🟡 Medium | `ContactForm` inputs have no labels; status not announced | `ContactForm.tsx:56‑74` | `htmlFor`/`aria-label`, `role=status`, `aria-live`. |
| 🟡 Medium | Plaintext client‑gallery password stored & displayed | `ManageClient.tsx:1444` | Backend track: hash/encrypt; stop rendering plaintext. |
| 🟢 Low | Parallax ignores `prefers-reduced-motion`; `outline:none` without `:focus-visible` in ~7 modules; gap‑rule violated via per‑image padding; 3 competing breakpoint systems (0/97 use the `--breakpoint-*` tokens); 40+ magic‑number transitions; `--color-danger` has 4 values; `--color-primary` is near‑black but used as blue. | various | Motion guard; one `--focus-ring`; `@custom-media` bridge; motion + danger/accent tokens. |

---

## 6. The unification blueprint — your "Main Design Elements"

This is the centerpiece. The answer to *"what buttons/sliders/dropdowns should be Main Design Elements?"* is a set of **~10 canonical primitives** living in one place (`app/components/ui/` + `app/styles/design-elements/`), all driven by **one** token taxonomy.

### 6a. The canonical components (ranked by consolidation leverage)

| Rank | Element | API sketch | Collapses |
|------|---------|------------|-----------|
| 1 | **`<Modal>`** | `open, onClose, variant: overlay\|sheet\|fullscreen, labelledBy` — owns `createPortal`, backdrop, Esc, **focus trap + return**, `useBodyScrollLock` | 5 modal shells, the `position:absolute+100vh` footgun, duplicated dismissal effects |
| 2 | **`<Button>`** + **`<IconButton>`** + **`<CloseButton>`** | `variant: primary\|secondary\|danger\|ghost, size: sm\|md, loading, leftIcon` | ~30–38 button classes + 4 close buttons + the inline "spinner while saving" pattern |
| 3 | **`<FilterToolbar>`** + **`<FilterChip>`** | chip: `{ label, count?, active, tone: neutral\|film\|digital, state: available\|unavailable }` | 2 filter bars, 6 chip impls, duplicated toggle/cycle logic |
| 4 | **`<Dropdown<T>>`** | promote `UnifiedMetadataSelector` (give it portable SCSS) | menu items, filter dropdowns, metadata selectors |
| 5 | **`<NavLink>` / `<Tile>`** | always a real `<a>`/`next/link`; `onClick` reserved for genuine non‑nav actions | 3 nav idioms; fixes SEO + keyboard + new‑tab in one sweep |
| 6 | **`<PageShell>` + `<CollectionHeader>`** | `title, count?, cover?, breadcrumbs?` — owns container/main/SiteHeader/header; **the painted, dark‑safe surface lives here** | 8 copy‑pasted page scaffolds; also where orientation/breadcrumbs get solved |
| 7 | **`<Badge>`** | `tone, position: start\|end`; public‑label map (no raw enum) | 3 badge definitions |
| 8 | **Form set**: `<Field>/<Input>/<Select>/<Textarea>/<Checkbox>/<FormError>` | one SCSS source, token‑themed | 3+ parallel form systems |
| 9 | **`<StatusPage>`** | `title, message, action?` on the safe surface | 404 / error / empty‑state |
| 10 | **`<Slider>`** | the density control — already a native range input; just relocate into the design‑elements layer with a tokenized track/thumb/`--focus-ring` | the one‑off density styling |

### 6b. The color‑token collapse (one taxonomy)

Keep the healthy `--space/--radius/--text/--z` scales untouched. Replace the three color families + shadow namespace with **one semantic set**:

```
--color-surface / --color-surface-raised      (was: --color-bg, --color-bg-light/medium/dark)
--color-on-surface / --color-on-surface-muted  (was: --color-fg, --color-text-primary/#333, --color-fg-muted/#666, --text-primary…)
--color-border                                  (was: --color-border, --color-border-light/medium/dark, --border-color)
--color-accent (+ --color-on-accent)            (split the accidental --color-primary near‑black vs blue collision)
--color-danger / --color-success                (collapse the 4 red values into 1)
--scrim-dark-{10..90} / --scrim-light-{10..90}  (one alpha scale; replace the 9 fixed --color-overlay-light-* steps + ~30 inline rgb(0 0 0 / x%))
--focus-ring                                    (one ring; ban bare outline:none)
--duration-fast/base/slow + --ease-standard     (replace ~40 magic-number transitions)
```

Then **bind it once**: `html, body { background: var(--color-surface); color: var(--color-on-surface); }` and point `layout.tsx` `themeColor` at the same token.

### 6c. Migration sequence (safe, incremental)

1. **Declare** the unified roles **+ aliases** for every legacy/phantom token (nothing breaks).
2. **Freeze regressions:** add a stylelint rule that fails CI on `var(--x)` where `--x` is undeclared, plus bans on bare `outline:none`, legacy‑comma `rgb()`, and inter‑item directional padding (the gap rule).
3. **Bind the canvas** (`html,body` background/color) — this *alone* fixes the 404, header, admin, and gate‑card invisibility together. Add the `@custom-media` bridge so the existing `--breakpoint-*` tokens become usable.
4. **Build the primitives** (§6a), highest‑leverage first (Modal → Button → FilterChip).
5. **Migrate call sites** one component at a time; delete each per‑feature button/modal/chip/badge block as it converts.
6. **Delete** the dead tokens, duplicate CSS, `FsDebug`, the duplicate "Create", and the dead `onBack` last.

---

## 7. Design implementations to consider

### Complementary (fit the existing site, additive)
- **Skeleton / blur‑up (LQIP) placeholders** sized to the BoxTree rows + eager‑load the first row — kills the blank‑on‑load void.
- **Deep‑linkable fullscreen** (`?image=<id>` + `history.pushState`) so links reopen to an image and Back closes the modal. Add a **`3 / 12` image counter**.
- **A public taxonomy directory** — turn the existing `/metadata` *data* into a public "Explore" index (tags / people / locations as `NavLink`s), and/or add index routes at `/tag`, `/location`, `/people`. The data and `[slug]` pages already exist; only the front door is missing.
- **A minimal footer** (About / Contact / Instagram / GitHub) + a **breadcrumb / "up to parent"** affordance — so nav is reachable and crawlable without discovering the hamburger, and deep‑linked visitors aren't stranded.
- **`prefers-reduced-motion` guard** on the parallax; a real `--focus-ring`.
- **Client gallery upgrades:** real download progress (drop the blind timer), a photo count, and a favorite/select‑for‑print flow.

### Replacement / "better idea" (rethink, not just patch)
- **Lean *into* an intentional dark theme.** The site is *accidentally* dark today (a bug) — but full‑bleed photography looks fantastic on an intentional dark canvas. Rather than fight dark mode, consider **committing to a token‑driven dark theme** (or a clean light one) — either way, make `color-scheme` *honest*. This turns the #1 failure into a deliberate design decision.
- **Replace the hamburger‑only model** with a persistent, minimal nav (or at minimum footer + breadcrumb). One icon is a discoverability bottleneck for the whole site.
- **Replace the buried, doubled filter UI** with **one persistent/sticky `FilterToolbar`** that's discoverable on first paint and works identically on collection *and* taxonomy pages.
- **Replace the public `CollectionType` badge** with curated labels ("Series", "Gallery") or remove it — internal enums shouldn't be visitor‑facing.
- **Promote the client‑gallery async‑state pattern** (idle/verifying/error/failsafe + `aria-live`) into a shared convention reused by ContactForm and downloads, instead of each form reinventing states.

---

## 8. Missing UX functionality

- A **"Browse all work" / collections index** in the nav (the public `/all-collections` page already exists — just link it).
- **Browse‑by‑tag / location / person** directory pages for humans (today: search‑engine‑only).
- **Shareable / deep‑linkable fullscreen** images; **Back closes the modal**.
- **Breadcrumbs / orientation** on deep collections and taxonomy pages (a person page shows only "2 photos", never the name).
- **Skeleton loading state** to remove the blank‑on‑load gap.
- **Open‑in‑new‑tab / middle‑click** on tiles (consequence of the non‑link nav).
- **Keyboard‑operable gallery + skip‑to‑content link + visible focus** everywhere.
- A **richer `error.tsx`** (home link + human copy) matching the client‑gallery quality.
- Client‑gallery: **download progress, photo count, favorites**, "forgot password / request access".

---

## 9. Recommended sequencing

1. **Foundation week (tiny diff, huge payoff):** bind `html,body` background/color; delete `FsDebug`; fix the Blogs 404; add stylstylelint var‑allowlist + the alias layer. → resolves 3 critical/visible failures.
2. **Primitives:** `<Modal>` → `<Button>/<IconButton>/<CloseButton>` → `<FilterChip>/<FilterToolbar>` → promote `<Dropdown>`. Migrate call sites; delete duplicates.
3. **Navigation correctness:** `<NavLink>/<Tile>` (real `<a>`), `<PageShell>`/`<CollectionHeader>` with breadcrumb + footer, `<StatusPage>`.
4. **IA + UX:** public taxonomy directory; URL‑synced fullscreen; wire the existing filter‑URL helpers; skeletons.
5. **Color‑token collapse + a11y polish** (focus rings, labels, headings, reduced‑motion) as the migration completes.
6. **Strategic call:** decide light‑vs‑intentional‑dark and the nav model — the two highest‑order design decisions.

---

*Appendix: this report is the synthesis of an 11‑agent code review (≈1M tokens) cross‑checked against a live desktop+mobile visual tour. Per‑agent raw findings (with exhaustive `file:line` evidence for every item above) are available on request.*
