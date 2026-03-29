# edens.zac

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev/)
[![SCSS Modules](https://img.shields.io/badge/SCSS-Modules-CC6699?logo=sass)](https://sass-lang.com/)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-Backend-6DB33F?logo=spring-boot)](https://spring.io/projects/spring-boot)

A full-stack photography portfolio and content management platform. Built for performance, type safety, and visual impact.

![Screenshot](docs/screenshot-home.png)

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15 (App Router), React 18, TypeScript 5.8 |
| **Styling** | SCSS Modules, responsive design |
| **Backend** | Spring Boot, Hibernate/JPA, RESTful API |
| **Database** | PostgreSQL on EC2 |
| **Storage** | AWS S3 + CloudFront CDN |
| **Hosting** | AWS (S3 + CloudFront) |
| **Testing** | Jest, React Testing Library |
| **Linting** | ESLint 9 (flat config), Stylelint, Prettier |

---

## Features

- **Photography Collections** -- Galleries, blogs, portfolios, and client deliveries with distinct layouts per collection type
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
                    |   Next.js 15     |
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

**Database** -- PostgreSQL stores collections, content metadata, and relationships. Hibernate/JPA manages the schema and queries.

---

## Key Technical Highlights

### BoxTree Layout Algorithm

The layout engine uses a recursive binary tree (BoxTree) to arrange images into visually balanced rows. Each leaf node is a content item; combined nodes specify horizontal or vertical arrangement. The algorithm:

1. **Greedy row fill** -- Items are added sequentially until the row reaches 90-115% capacity, measured in slot units derived from each image's effective rating.
2. **Template map lookup** -- The orientation profile of each row (count of horizontal vs. vertical images) maps to a structural template: flat chains, dominant-stacked layouts, nested quads, etc.
3. **AR-target scoring** -- For rows with 3+ items, multiple candidate tree structures are generated and scored by how closely their combined aspect ratio matches the target (1.5 for desktop). The best candidate wins.
4. **Partition splitting** -- For 5+ items, the algorithm also tries balanced partition splits (recursive divide-and-conquer), comparing them against the dominant+rest approach.
5. **Boundary optimization** -- A post-pass shifts items between adjacent rows to maximize fill quality across the entire layout.

This produces layouts where a single 5-star panoramic gets a full-width hero row, while four 2-star verticals stack efficiently into a compact grid -- all without manual configuration.

### Effective Rating System

Images are classified by a rating (0-5 stars) that directly controls their visual prominence. Vertical images receive a -1 penalty to their effective rating (a vertical 5-star is treated as a 4-star equivalent), ensuring horizontals naturally dominate when both orientations are present.

### Server Components

The application defaults to Server Components. Data fetching, layout calculation, and HTML generation happen on the server. Client components are limited to interactive elements: the parallax scroll handler, modal overlays, image metadata forms, and the collection editor.

---

## Project Structure

```
app/
  layout.tsx, page.tsx            Root layout and home page (Server Components)
  (admin)/                        Admin routes (collection manager, image browser)
    collection/manage/[[...slug]]/  Collection editor with drag-and-drop
    all-collections/                Collection list and management
    all-images/                     Image browser and metadata editor
  [slug]/page.tsx                 Dynamic collection pages
  collectionType/[type]/page.tsx  Collections filtered by type
  api/                            Next.js API routes (proxy to Spring Boot)
  components/
    Content/                      BoxRenderer, image/text/gif renderers
    ContentCollection/            Collection page layout
    ImageMetadata/                Metadata editing forms
    SiteHeader/                   Navigation and site header
    FullScreenModal/              Lightbox image viewer
  hooks/                          useCollectionData, useParallax, useViewport
  lib/
    api/                          Typed API client (collections, content, core)
    components/                   Shared UI components
  types/                          TypeScript definitions (Collection, Content, etc.)
  utils/                          Layout algorithms, rating utilities, type guards
  constants/                      Layout breakpoints, image config, grid settings
  styles/                         Global styles, SCSS variables
tests/                            Jest tests mirroring app/ structure
docs/                             Feature specs, spikes, handoff docs
ai_guidelines/                    Modular AI development guidelines
```

---

## Content Architecture

The platform supports four collection types:

- **BLOG** -- Chronological content with mixed media
- **ART_GALLERY** -- Curated artistic collections
- **CLIENT_GALLERY** -- Private client deliveries
- **PORTFOLIO** -- Professional showcases

Each collection supports multiple content types: images (S3-hosted with CloudFront), text blocks (database-stored with markdown), GIFs, and hierarchical collections (collections containing other collections).

---

## Getting Started

### Prerequisites

- Node.js 20+ (enforced via `engines` in package.json)
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
# Backend API
NEXT_PUBLIC_API_URL=http://localhost:8080
API_URL=http://localhost:8080

# AWS CloudFront (image CDN)
NEXT_PUBLIC_CLOUDFRONT_URL=https://your-distribution.cloudfront.net

# Next.js
NEXT_PUBLIC_BASE_URL=http://localhost:3001
```

### Development

```bash
# Start the development server (port 3001)
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

The application runs at `http://localhost:3001`.

---

## API Integration

The frontend communicates with a Spring Boot backend through a typed API client layer:

- **Read endpoints**: `/api/read/collections/*` -- public collection data
- **Admin endpoints**: `/api/admin/collections/*` -- collection management
- **Content endpoints**: `/api/admin/content/*` -- content CRUD operations

API functions in `app/lib/api/` use Next.js cache tags for ISR and on-demand revalidation.

---

## Screenshots

| Home Page | Collection Page |
|---|---|
| ![Home](docs/screenshot-home.png) | ![Collection](docs/screenshot-collection.png) |

| Admin Panel | Mobile View |
|---|---|
| ![Admin](docs/screenshot-admin.png) | ![Mobile](docs/screenshot-mobile.png) |

---

## License

MIT
