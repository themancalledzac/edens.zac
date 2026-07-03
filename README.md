# edens.zac

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![SCSS Modules](https://img.shields.io/badge/SCSS-Modules-CC6699?logo=sass)](https://sass-lang.com/)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-Backend-6DB33F?logo=spring-boot)](https://spring.io/projects/spring-boot)

A full-stack photography portfolio and content management platform. Built for performance, type safety, and visual impact.

---

## Tech Stack

| Layer        | Technology                                          |
| ------------ | --------------------------------------------------- |
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript 5.8   |
| **Styling**  | SCSS Modules, responsive design (container queries) |
| **Backend**  | Spring Boot, Hibernate/JPA, RESTful API             |
| **Database** | PostgreSQL on EC2                                   |
| **Storage**  | AWS S3 + CloudFront CDN                             |
| **Hosting**  | AWS Amplify                                         |
| **Auth**     | Cookie session (`ezac_session`) + WebAuthn passkeys |
| **Testing**  | Jest, React Testing Library                         |
| **Linting**  | ESLint 9 (flat config), Stylelint, Prettier         |

---

## Features

- **Photography Collections** — Galleries, blogs, portfolios, and client deliveries with distinct layouts per collection type
- **Prominence-Aware Image Sizing** — Higher-rated images occupy more visual space, symmetrically across orientations. A 5-star hero commands a large area whether it is a wide panorama or a tall portrait; lower-rated images share space.
- **Custom Layout Algorithm** — BoxTree-based recursive layout engine that arranges content into visually balanced rows using aspect-ratio scoring and prominence-based point balancing
- **Parallax Scroll Effects** — Collection cards on the home page use depth-based parallax for a layered visual presentation
- **Admin Panel** — In-place edit mode on collection pages: collection creation, image/GIF metadata editing, drag-and-drop ordering, tags/people/locations, and client-gallery management
- **Accounts & Personal Space** — Cookie-session auth with WebAuthn passkey sign-in, per-user saved images ("selects") and follows, and a personal `/user` space; invite links onboard client-gallery recipients
- **Server-First Architecture** — Maximized use of React Server Components for SEO, performance, and minimal client-side JavaScript
- **Responsive Design** — Adaptive layouts from mobile (2-slot) through desktop (multi-slot) with breakpoint-aware image sizing
- **CDN-Optimized Images** — All images served via CloudFront with automatic WebP/AVIF conversion through Next.js Image

---

## Architecture

```
                    +------------------+
                    |   Next.js 16     |
                    |   (App Router)   |
                    +--------+---------+
                             |
              +--------------+--------------+
              |                             |
     +--------v----------+       +----------v---------+
     |  Server Components|       |  BFF Proxy Route   |
     |  (pages, layouts) |       |  /api/proxy/[...]  |
     +--------+----------+       +----------+---------+
              |                             |
              +-------------+---------------+
                            |  (X-Internal-Secret injected)
                   +--------v---------+
                   |   Spring Boot    |
                   |   REST API       |
                   +--------+---------+
                            |
              +-------------+-------------+
              |                           |
     +--------v---------+      +----------v--------+
     |   PostgreSQL      |      |   AWS S3          |
     |   (EC2)           |      |   + CloudFront    |
     +-------------------+      +-------------------+
```

**Frontend** — Next.js App Router with Server Components as the default. Client components are used only where interactivity requires it (modals, forms, parallax, the fullscreen viewer). URL state replaces React Context wherever possible.

**BFF proxy** — The browser never talks to the backend directly. All requests go through the same-origin Backend-for-Frontend proxy at `app/api/proxy/[...path]/route.ts`, which injects the `X-Internal-Secret`, enforces an Origin allowlist and payload size caps on writes, and re-emits multiple `Set-Cookie` headers correctly.

**Backend** — Spring Boot REST API handles data persistence, image uploads, and metadata management. The Next.js frontend communicates through a typed API client layer (`app/lib/api/`) with `ApiError`-based error handling and Next.js cache tags.

**Storage** — Images are uploaded to S3 and served globally through CloudFront. Next.js Image handles format conversion and responsive sizing at the edge.

**Database** — PostgreSQL stores collections, content metadata, users, and relationships. Hibernate/JPA manages the schema and queries.

---

## Key Technical Highlights

### BoxTree Layout Algorithm

The layout engine uses a recursive binary tree (BoxTree) to arrange content into visually balanced rows. Each leaf node is a content item; combined nodes specify horizontal or vertical arrangement. The algorithm:

1. **Greedy row fill** — Items are added sequentially until the row reaches its target capacity, measured in prominence units derived from each item's rating and aspect ratio.
2. **Point-balance split** — Within a row, the tree is built by splitting at the adjacent boundary that best halves the row's prominence points, so items group when their combined weight matches the other side's. No templates — structure follows the ratings.
3. **Direction enumeration** — Every horizontal/vertical assignment of that tree is enumerated and scored against a hard aspect-ratio floor (a row is never taller than it is wide) plus closeness to the target AR; among acceptable candidates, the most equitable one (leaf areas tracking each item's weight) wins.
4. **Boundary optimization** — A post-pass shifts items between adjacent rows to maximize fill quality across the entire layout.

This produces layouts where a single 5-star panorama gets a wide hero row while lower-rated images stack efficiently into a compact grid — all without manual configuration.

### Directional Prominence

Each item has a rating (0–5) that controls its visual prominence via an **orientation-agnostic** value model (`app/utils/contentRatingUtils.ts`). A single prominence `P` is computed from the rating (scaled up for aspect-ratio extremeness, symmetric for wide _or_ tall), then split into a horizontal width cost `Hv = √(P·AR)` and a vertical height demand `Vv = √(P/AR)`. A 5-star portrait and a 5-star panorama command the same visual _area_ — only the shape differs. (This replaced an earlier orientation-biased scheme that demoted vertical images with a rating penalty.)

### Server Components

The application defaults to Server Components. Data fetching, layout calculation, and HTML generation happen on the server (the BoxTree is server-rendered with a `userAgent()`-derived viewport, avoiding a blank first paint). Client components are limited to interactive elements: the parallax handler, modal overlays, metadata forms, the fullscreen viewer, and the collection edit layer.

---

## Project Structure

```
app/
  layout.tsx, page.tsx            Root layout and home page (Server Components)
  (admin)/                        Admin route group
    admin/                          Local-only admin hub (+ users/[id])
    all-collections/                Collection list and management
    all-images/                     Image browser and metadata editor
    collection/manage/[[...slug]]/  Legacy manage route (edit now happens in-place)
    comments/                       Contact-message reader
    metadata/                       Global metadata (cameras, lenses, tags, ...)
  [slug]/page.tsx                 Dynamic collection pages (in-place edit via ?manage=1)
  all-client-galleries/           Signed-in client's gallery index
  explore/                        Public discovery front door
  invite/[token]/                 Invite-link onboarding
  location/[slug]/                Location-filtered image view
  login/                          Password + passkey sign-in
  tag/[slug]/                     Tag-filtered view
  user/                           Personal space (selects + follows); user/selects
  homePage/                       Home management surface
  api/proxy/[...path]/            BFF proxy to Spring Boot (secret injection, size caps)
  components/                     React components (Content, ContentCollection, Metadata, ...)
  hooks/                          Custom hooks (useViewport, useParallax, useCollectionEdit, ...)
  lib/
    api/                          Typed API client (~11 modules; see below)
    components/                   Shared UI components
  types/                          TypeScript definitions (Collection, Content, Auth, ...)
  utils/                          Layout algorithms, rating utilities, type guards
  constants/                      Layout breakpoints, image config, grid settings
  styles/                         Global styles, SCSS variables
tests/                            Jest tests mirroring app/ structure
docs/                             Planning docs ("The Book") — see docs/000-summary.md
ai_guidelines/                    Modular AI development guidelines
```

---

## Content Architecture

Collections come in seven types (`app/types/Collection.ts` → `CollectionType`):

- **HOME** — the pinned home surface
- **PARENT** — a hub that groups other collections
- **CLIENT_GALLERY** — private client deliveries (password/invite gated)
- **ART_GALLERY** — curated artistic collections
- **PORTFOLIO** — professional showcases
- **BLOG** — chronological content with mixed media
- **MISC** — catch-all

Each collection is composed of content blocks (`app/types/Content.ts` → `ContentType`): **IMAGE** (S3/CloudFront), **TEXT** (structured, plain/markdown/HTML), **GIF** (animated GIF/MP4), **COLLECTION** (a reference to another collection, rendered as a card), and **PANEL** (an admin UI panel such as users or messages rendered as a rated block).

---

## Getting Started

### Prerequisites

- Node.js 20–22 (enforced via `engines` in `package.json`)
- npm 9+
- Access to the Spring Boot backend (localhost:8080 for development)

### Installation

```bash
git clone https://github.com/themancalledzac/edens.zac.git
cd edens.zac
npm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```bash
# Backend API (server-side direct URL used by the BFF proxy)
API_URL=http://localhost:8080
NEXT_PUBLIC_APP_URL=http://localhost:3000

# BFF → backend shared secret (must match the backend's expected value)
INTERNAL_API_SECRET=dev-secret

# AWS CloudFront (image CDN)
NEXT_PUBLIC_CLOUDFRONT_URL=https://your-distribution.cloudfront.net
```

### Development

```bash
# Start the development server (http://localhost:3000)
npm run dev

# Type checking
npm run type-check

# Linting (ESLint + Stylelint)
npm run lint
npm run lint:fix

# Formatting
npm run format

# Testing
npm test
npm run test:watch
```

The application runs at `http://localhost:3000`.

---

## API Integration

The frontend never calls the backend directly — every request is routed through the same-origin BFF proxy (`/api/proxy/api/**`), which forwards to Spring Boot with the internal secret attached. API functions live in `app/lib/api/` and use `ApiError` for typed error handling; read paths use Next.js cache tags for ISR and on-demand revalidation.

Endpoint families (see `ai_guidelines/ai_api.md` for the full map):

- **Read** — `/api/read/**` — public collection, content, and metadata reads (collections, images, tags, locations, lenses, image search, downloads)
- **Admin** — `/api/admin/**` — collection and content writes (create/update/delete, ratings, gallery access, tags/people, reorder)
- **Auth** — `/api/auth/**` — login, logout, `me`, invite acceptance, and WebAuthn register/login

---

## License

MIT
