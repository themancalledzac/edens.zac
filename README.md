# edens.zac

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![SCSS Modules](https://img.shields.io/badge/SCSS-Modules-CC6699?logo=sass)](https://sass-lang.com/)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-Backend-6DB33F?logo=spring-boot)](https://spring.io/projects/spring-boot)

A full-stack photography portfolio and content management platform. Built for performance, type safety, and visual impact.

---

## Tech Stack

| Layer        | Technology                                        |
| ------------ | ------------------------------------------------- |
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript 5.8 |
| **Styling**  | SCSS Modules, responsive design                   |
| **Backend**  | Spring Boot, Hibernate/JPA, RESTful API           |
| **Database** | PostgreSQL on EC2                                 |
| **Storage**  | AWS S3 + CloudFront CDN                           |
| **Hosting**  | AWS Amplify (Next.js server, CloudFront-fronted)  |
| **Testing**  | Jest, React Testing Library                       |
| **Linting**  | ESLint 9 (flat config), Stylelint, Prettier       |

---

## Features

- **Photography Collections** -- One typeless collection primitive holding any mix of images, text, GIFs, and other collections; blogs and client deliveries get their own presentation
- **Rating-Aware Image Sizing** -- Higher-rated images occupy more visual space. A 5-star hero fills an entire row; 2-star images share space with others.
- **Custom Layout Algorithm** -- BoxTree-based recursive layout engine that arranges images into visually balanced rows using aspect ratio scoring and pattern detection
- **Parallax Scroll Effects** -- Collection cards on the home page use depth-based parallax for a layered visual presentation
- **Admin Panel** -- Collection creation, image metadata editing, drag-and-drop ordering, and content management
- **Server-First Architecture** -- Maximized use of React Server Components for SEO, performance, and minimal client-side JavaScript
- **Responsive Design** -- Adaptive layouts from mobile (2-slot) through desktop (5-slot) with breakpoint-aware image sizing
- **CDN-Optimized Images** -- All images served via CloudFront with automatic WebP/AVIF conversion through Next.js Image

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
     +--------v---------+        +---------v--------+
     |  Server Components|        |   API Routes     |
     |  (pages, layouts) |        |   (proxy layer)  |
     +--------+----------+        +---------+--------+
              |                             |
              +-------------+---------------+
                            |
                   +--------v---------+
                   |   Spring Boot    |
                   |   REST API       |
                   +--------+---------+
                            |
              +-------------+-------------+
              |                           |
     +--------v---------+      +---------v--------+
     |   PostgreSQL      |      |   AWS S3          |
     |   (EC2)           |      |   + CloudFront    |
     +-------------------+      +------------------+
```

**Frontend** -- Next.js App Router with Server Components as the default. Client components are used only where interactivity requires it (modals, forms, parallax). URL state replaces React Context wherever possible.

**Backend** -- Spring Boot REST API handles data persistence, image uploads, and metadata management. The Next.js frontend communicates through a typed API client layer with proper error handling and caching.

**Storage** -- Images are uploaded to S3 and served globally through CloudFront. Next.js Image handles format conversion and responsive sizing at the edge.

**Hosting** -- The frontend runs as a live Next.js server on AWS Amplify, which puts its own CloudFront distribution in front. Merging to `main` builds and deploys automatically in about fifteen minutes; the build configuration lives in the Amplify console rather than in this repo. The S3 image CDN is a separate CloudFront distribution.

**Database** -- PostgreSQL stores collections, content metadata, and relationships. Hibernate/JPA manages the schema and queries.

---

## Key Technical Highlights

### BoxTree Layout Algorithm

A recursive binary tree (BoxTree) arranges images into visually balanced rows: greedy row fill, a point-balance split, then enumeration of every horizontal/vertical assignment scored on aspect ratio and equity.

See [`app/utils/rowCombination.md`](app/utils/rowCombination.md).

### Effective Rating System

Images are classified by a rating (0-5 stars) that directly controls their visual prominence. The rating is orientation-agnostic: a vertical 5-star and a horizontal 5-star carry the same effective rating, and directionality is expressed downstream by aspect-ratio extremeness (width cost for horizontals, height demand for verticals) rather than by demoting the rating. Collection cards rate as 4; non-image content as 1.

### Server Components

The application defaults to Server Components. Data fetching, layout calculation, and HTML generation happen on the server. Client components are limited to interactive elements: the parallax scroll handler, modal overlays, image metadata forms, and the collection editor.

---

## Project Structure

```
app/
  layout.tsx, page.tsx            Root layout and home page
  (admin)/                        Admin routes
    admin/, admin/users/            Admin hub and user management
    all-images/                     Image browser
    collection/manage/              Collection editor
    metadata/                       Metadata editing page
  [slug]/                         Collection pages
  collections/, all-client-galleries/  Collection lists
  explore/, search/               Discovery
  tag/[slug]/, location/[slug]/   Taxonomy pages
  s/[token]/, invite/[token]/     Share and invite links
  login/, user/                   Sign-in and the user's own space
  api/                            proxy, revalidate, csp-report, client-errors
  components/                     UI components (Content/, Metadata/, SiteHeader/, ...)
  hooks/                          useParallax, useViewport, useFetchMe, useImageBrowser, ...
  lib/                            api/ (typed client), actions/, storage/
  types/, utils/, constants/, styles/
proxy.ts                          Request proxy (admin and auth routing)
tests/                            Jest tests mirroring app/; e2e/ holds Playwright specs
docs/                             backlog.md and decisions.md
```

---

## Content Architecture

A **collection** is a named, slugged, ordered grouping of any mix of content: images (S3-hosted, served via CloudFront), text blocks (database-stored, markdown), GIFs, and references to other collections. There is no collection type -- a collection is defined by what it contains, not by a category assigned up front.

Two stored boolean flags carry the only distinctions the system still makes:

- **`isClient`** -- a private client delivery, gated behind a per-collection password.
- **`isBlog`** -- a dated entry, rendered and sorted chronologically.

Both default to false, which is an ordinary collection. They are mutually exclusive; the backend rejects a collection that sets both.

Everything else is derived rather than stored:

- **Parent** -- a collection is a parent when it holds at least one collection reference. The server computes this over the whole content graph and returns it as `hasChildren` / `childCollectionIds`.
- **Home** -- the collection whose slug is `home`.

A collection can belong to several parents at once, so the content graph is a DAG rather than a tree.

---

## Getting Started

### Prerequisites

- Node.js 22+ (`engines` in package.json is `>=22`; `.nvmrc` pins 24)
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
API_URL=http://localhost:8080
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_ENV=local
INTERNAL_API_SECRET=
```

`API_URL` is the backend, `INTERNAL_API_SECRET` is sent to it as `X-Internal-Secret`, and `NEXT_PUBLIC_ENV=local` turns on the local admin shell. Never set it in a deploy.

### Development

```bash
# Start the development server (port 3000)
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

The application runs at `http://localhost:3000` — `npm run dev` is a bare `next dev`, which uses
Next's default port.

### Working on admin pages

`/admin` and the other `(admin)` routes render anonymously in local dev. On 2026-10-18 an anonymous `GET localhost:8080/api/admin/users` returned 200: the dev-profile `DevLocalAdminFilter` answers it as the bootstrap admin, and a bootstrap login with `ADMIN_BOOTSTRAP_EMAIL` / `ADMIN_BOOTSTRAP_PASSWORD` works. Backend PR edens.zac.backend#334 (merged 2026-10-18) limits that anonymous admin to loopback callers plus addresses in `DEV_LOCAL_ADMIN_EXTRA_ADDRESSES`. The local backend runs in Docker, so a Docker user sets that variable to the Docker gateway address or logs in at `http://localhost:3000/login`.

> **The local backend writes to production.** The backend container's datasource is `host.docker.internal:5432`, an SSH tunnel to the production EC2 database. Every admin mutation you make against localhost edits live rows.

Open work lives in [`docs/backlog.md`](docs/backlog.md) and past decisions in [`docs/decisions.md`](docs/decisions.md).

---

## API Integration

The frontend communicates with a Spring Boot backend through a typed API client layer:

- **Read endpoints**: `/api/read/collections/*` -- public collection data
- **Admin endpoints**: `/api/admin/collections/*` -- collection management
- **Content endpoints**: `/api/admin/content/*` -- content CRUD operations

API functions in `app/lib/api/` use Next.js cache tags for ISR and on-demand revalidation.

---

## License

MIT
