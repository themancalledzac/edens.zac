# Content Collection Refactor TODO

## Overview

### Current State
The portfolio currently uses a simple **Catalog/Image** system where:
- `CatalogEntity` contains basic metadata (title, location, description, etc.) and a list of `ImageEntity` objects
- All catalogs are essentially the same type - just containers of images with descriptions
- Content types like wedding portfolios, art galleries, client deliveries, and daily moments are all forced into the same "catalog" structure
- **Performance Issue**: Large catalogs (200+ images) load slowly due to single API endpoint returning all data at once

### The Problem
The current system is too rigid and doesn't reflect the different **purposes** and **presentation needs** of different content types:
- **Daily/moment blogs** need mixed content (text + images) in specific order, more casual presentation
- **Art galleries** need curated image collections with artistic presentation
- **Client galleries** need private access, download capabilities, and professional delivery features
- **Portfolio showcases** (wedding/corporate work) need polished presentation to attract new clients
- **Future needs** like coding portfolios will require code blocks, diagrams, and technical content

### The Solution: ContentCollection System
Refactor to a flexible **ContentCollection** system with four distinct types:

1. **`BLOG`** - Daily moments, casual content, mixed text/images, chronological
2. **`ART_GALLERY`** - Curated artistic collections (e.g., "humans in nature", "urban landscapes")
3. **`CLIENT_GALLERY`** - Private client deliveries with simple password protection
4. **`PORTFOLIO`** - Professional showcases (e.g., "Wedding Photography", "Corporate Work", "Arches National Park")

**Key Architecture Changes:**
- `ContentCollectionEntity` replaces Catalog entities
- `ContentBlockEntity` system allows mixed content types (images, text, code, video, gifs)
- **Pagination strategy** for collections with 30+ content blocks
- Ordered content blocks enable precise layout control
- Type-specific rendering and editing interfaces
- **Storage strategy**: Text/code in database, media (images/videos/gifs) in S3
- **Testing strategy**: Unit tests and component tests throughout development

### Strategy: Parallel Development
**Critical Approach:** Build the new ContentCollection system **completely parallel** to the existing Catalog/Image system to avoid breaking current functionality.

**Key Technical Considerations:**
- **SSR vs Client-side**: Minimize context usage to keep components server-side rendered where possible
- **Performance**: Implement pagination for large collections from the start
- **Testing**: Add unit tests and component tests as we build each piece
- **Validation**: Use Bean Validation annotations with service-level validation
- **Error Handling**: Follow Spring Boot best practices with proper HTTP status codes

### End Goal
A flexible CMS-like system where each content type has:
- **Specialized creation/editing interfaces** tailored to its purpose
- **Optimized presentation** with pagination for large collections
- **Type-specific features** (privacy controls, download options, technical formatting)
- **Proper SSR/client-side balance** for optimal performance
- **Comprehensive testing** ensuring reliability and maintainability
- **Extensibility** for future content types (coding portfolios, tutorials, etc.)

---

## Phase 1: Database Schema & Core Entities (Backend)

### 1.1 Create CollectionType Enum
- [x] Create `CollectionType.java` enum with values: `BLOG`, `ART_GALLERY`, `CLIENT_GALLERY`, `PORTFOLIO`
- [x] Add to `edens.zac.portfolio.backend.types` package
- [x] Add validation annotations
- **Files created**: `src/main/java/edens/zac/portfolio/backend/types/CollectionType.java`
- **Testing**: Unit test for enum values and validation

### 1.2 Create ContentBlockType System
- [x] Create `ContentBlockType.java` enum: `IMAGE`, `TEXT`, `CODE`, `GIF`
- [x] Create `ContentBlockEntity.java` base entity with ordering field
- [x] Add `@Table` indexes for performance (collection_id, order_index)
- [x] Include validation annotations (`@NotNull`, `@Min`, etc.)
- **Files created**:
    - `src/main/java/edens/zac/portfolio/backend/types/ContentBlockType.java`
    - `src/main/java/edens/zac/portfolio/backend/entity/ContentBlockEntity.java`
- **Testing**: Unit tests for entity validation and ordering logic

### 1.3 Create Specific ContentBlock Entities
- [x] Create `ImageContentBlockEntity.java` extending ContentBlockEntity
    - [x] Reuse image metadata fields from existing `ImageEntity`
    - [x] Include S3 URL fields (web, raw)
- [x] Create `TextContentBlockEntity.java` extending ContentBlockEntity
    - [x] Store content as `@Lob` field in database (no S3 needed)
    - [x] Add formatting options (markdown, html, plain text)
- [x] Create `CodeContentBlockEntity.java` extending ContentBlockEntity
    - [x] Store code as `@Lob` field in database
    - [x] Add language field for syntax highlighting
- [x] Create `GifContentBlockEntity.java` extending ContentBlockEntity
    - [x] Include S3 URL fields similar to images
- **Files created**:
    - `src/main/java/edens/zac/portfolio/backend/entity/ImageContentBlockEntity.java`
    - `src/main/java/edens/zac/portfolio/backend/entity/TextContentBlockEntity.java`
    - `src/main/java/edens/zac/portfolio/backend/entity/CodeContentBlockEntity.java`
    - `src/main/java/edens/zac/portfolio/backend/entity/GifContentBlockEntity.java`
- **Testing**: Unit tests for each entity type and their specific validations

### 1.4 Create ContentCollection Entity
- [x] Create `ContentCollectionEntity.java` with CollectionType field
- [x] Add OneToMany relationship to ContentBlockEntity (ordered by order_index)
- [x] Include all common fields: title, slug, description, date, visibility, priority
- [x] Add type-specific JSON configuration field for extensibility
- [x] Add pagination metadata (total_blocks, blocks_per_page)
- [x] Add client gallery security: `password_hash` field (nullable)
- [x] Include proper validation annotations
- [x] Add database indexes for performance (slug, type, date)
- **Files to create**: `src/main/java/edens/zac/portfolio/backend/entity/ContentCollectionEntity.java`
- **Testing**: Unit tests for entity validation and relationships

### 1.5 Create Repository Layer
- [x] Create `ContentCollectionRepository.java`
    - [x] Add `findBySlug`, `findByType`, `findByTypeOrderByPriority` methods
    - [x] Add pagination support: `findByIdWithContentBlocks(Long id, Pageable pageable)`
    - [x] Add client gallery methods: `findBySlugAndPasswordHash`
- [x] Create `ContentBlockRepository.java`
    - [x] Add `findByCollectionIdOrderByOrderIndex` method
    - [x] Add pagination: `findByCollectionId(Long collectionId, Pageable pageable)`
    - [x] Add counting: `countByCollectionId(Long collectionId)`
- **Files to create**:
    - `src/main/java/edens/zac/portfolio/backend/repository/ContentCollectionRepository.java`
    - `src/main/java/edens/zac/portfolio/backend/repository/ContentBlockRepository.java`
- **Testing**: Integration tests for repository methods and pagination

---

## Phase 2: Models & DTOs (Backend)

### 2.1 Create Content Block Models
- [x] Create `ContentBlockModel.java` base model with validation
- [x] Create `ImageContentBlockModel.java` (reuse fields from existing `ImageModel`)
- [x] Create `TextContentBlockModel.java` with content and formatting fields
- [x] Create `CodeContentBlockModel.java` with content and language fields
- [x] Create `GifContentBlockModel.java` with S3 URL fields
- [x] Add proper Bean Validation annotations to all models
- **Files to create**: Multiple ContentBlock model files
- [x] **Testing**: Unit tests for model validation and serialization

### 2.2 Create ContentCollection Models
- [x] Create `ContentCollectionModel.java`
    - [x] Include pagination metadata (currentPage, totalPages, totalBlocks)
    - [x] Include List<ContentBlockModel> for content items (paginated)
    - [x] Add client gallery access fields (isPasswordProtected, hasAccess)
- [x] Create `ContentCollectionCreateDTO.java`
    - [x] Include validation for required fields based on type
    - [x] Add password field for client galleries
- [x] Create `ContentCollectionUpdateDTO.java`
    - [x] Support partial updates
    - [x] Include content block reordering operations
- [x] Create `ContentCollectionPageDTO.java` for paginated responses
- **Files to create**: Multiple ContentCollection model files
- **Testing**: Unit tests for DTO validation and type-specific requirements

---

## Phase 3: Service Layer (Backend)

### 3.1 Create ContentBlock Processing Utils
- [x] Create `ContentBlockProcessingUtil.java`
    - [x] Entity-to-model conversion methods for each content type
    - [x] Content block ordering and reordering logic
    - [x] **Reuse `ImageProcessingUtil`** for image-specific processing
    - [x] Text/code content validation and sanitization
    - [x] S3 upload logic for media content blocks (gifs)
- [x] Add proper error handling with Spring Boot best practices
- **Files created**: `src/main/java/edens/zac/portfolio/backend/services/ContentBlockProcessingUtil.java`
- **Testing**: Unit tests for conversion logic and content validation have been implemented in `ContentBlockProcessingUtilTest.java`

### 3.2 Create ContentCollection Service
- [x] Create `ContentCollectionService.java` interface
    - [x] Define methods with pagination: `getCollectionWithPagination(String slug, int page, int size)`
    - [x] Define client gallery access: `validateClientGalleryAccess(String slug, String password)`
- [x] Create `ContentCollectionServiceImpl.java`
    - [x] Implement CRUD operations with proper error handling
    - [x] Add pagination logic (default page size: 30 content blocks)
    - [x] Add client gallery password validation (SHA-256 hashing)
    - [x] Add methods: `findByType`, `findBySlug`, `createCollection`, `updateContent`, `addContentBlocks`, `getAllCollections`
    - [x] **Performance optimization**: Use `@Transactional(readOnly = true)` for read operations
- **Files created**:
    - `src/main/java/edens/zac/portfolio/backend/services/ContentCollectionService.java`
    - `src/main/java/edens/zac/portfolio/backend/services/ContentCollectionServiceImpl.java`
- **Testing**: Unit tests for service methods and integration tests for pagination (TODO: Tests for `addContentBlocks` flow need to be implemented)

### 3.3 Create ContentCollection Processing Util
- [x] Create `ContentCollectionProcessingUtil.java`
    - [x] Entity-to-model conversion methods
    - [x] Type-specific processing logic for each CollectionType
    - [x] Slug generation and validation (reuse existing `generateSlug` method)
    - [x] Password hashing for client galleries
    - [x] Pagination metadata calculation
- [x] Follow existing error handling patterns from `CatalogProcessingUtil`
- **Files created**: `src/main/java/edens/zac/portfolio/backend/services/ContentCollectionProcessingUtil.java`
- **Testing**: Unit tests for processing logic and type-specific behavior have been implemented in `ContentCollectionProcessingUtilTest.java`

---

## Phase 4: API Controllers (Backend)

### 4.1 Create ContentCollection Read Controller
- [x] Create `ContentCollectionControllerProd.java` in prod package
- [x] Add endpoints with pagination (base path: `/api/read/collections`):
    - [x] `GET /api/read/collections?page=0&size=10` - all collections with basic info (default size 10)
    - [x] `GET /api/read/collections/{slug}?page=0&size=30` - collection with paginated content (default size 30)
    - [x] `GET /api/read/collections/type/{type}?page=0&size=10` - collections by type (default size 10)
    - [x] `POST /api/read/collections/{slug}/access` - client gallery password validation
- [x] Implement proper HTTP status codes and error responses
- [x] Add validation for pagination parameters
- [x] Keep completely separate from existing CatalogController
- **Files created**: `src/main/java/edens/zac/portfolio/backend/controller/prod/ContentCollectionControllerProd.java`
- **Testing**: Integration tests for all endpoints including pagination and error cases

### 4.2 Create ContentCollection Write Controller (Dev Only)
- [x] Create `ContentCollectionControllerDev.java` in dev package
- [x] Add endpoints (base path: `/api/write/collections`):
    - [x] `POST /api/write/collections/createCollection` - create collection (JSON body)
    - [x] `PUT /api/write/collections/{id}` - update collection metadata; also supports reorder/remove/add text via ContentCollectionUpdateDTO
    - [x] `POST /api/write/collections/{id}/content` - add media content blocks (multipart file upload)
    - [x] `DELETE /api/write/collections/{id}/content/{blockId}` - remove content block
    - [x] `DELETE /api/write/collections/{id}` - delete collection
- [x] Creation flow is two-step: JSON create, then separate media upload
- [x] Add proper validation and error handling
- [x] Follow existing patterns from `CatalogControllerDev`
- **Files created**: `src/main/java/edens/zac/portfolio/backend/controller/dev/ContentCollectionControllerDev.java`
- **Testing**: Integration tests for CRUD operations and multipart uploads

---

## Phase 5: General Updates

### 5.1 Dependencies Audit & Upgrade Plan
- [ ] Verify current runtime Node.js version and engines
    - [x] Target LTS Node 20.x or 22.x (Next.js 15 supports Node 18+; prefer 20/22 LTS)
    - [x] Add/update `engines` in package.json to enforce Node version
- [ ] Framework & React upgrades
    - [x] Next.js -> keep at ^15.x or upgrade to latest 15 minor
    - [x] React -> upgrade to 18.3+ or 19 if ecosystem ready; verify MUI and other peers
    - [x] React DOM -> match React version
- [x] TypeScript & ESLint
    - [x] Typescript -> ^5.6+ (ensure tsconfig compatibility)
    - [x] ESLint, eslint-config-next -> align with Next 15
- [x] UI & styling dependencies
    - [x] sass -> latest compatible
    - [x] stylelint & configs -> latest compatible
- [x] AWS/Amplify/CDK and build tooling
    - [x] Verify amplify libs compatibility with Node target
    - [x] esbuild/sharp versions compatible with platform
- [ ] Lockfile & CI
    - [ ] Update lockfile, run `npm ci` on CI, update cache keys
- [x] Testing
    - [x] Add/confirm Jest + RTL setup (unit tests for components)

### 5.2 App Router Migration - Foundation
- [x] **Migration Strategy Decision**: Gradual hybrid approach - new features in App Router, legacy in Pages
- [x] **Initial App Router Setup**
- [x] Create `app/` directory structure with base layout
- [x] Create root `app/layout.tsx` with minimal client providers
- [x] Create `app/not-found.tsx` and `app/error.tsx` for error boundaries
- [ ] Setup CSS Modules and ensure MUI compatibility with RSC
- [x] Configure metadata defaults in root layout

### 5.3 App Router - Content Collections (New Features First)
- [x] **Collection Pages (Server-First)**
- [x] Create `app/collection/[slug]/page.tsx` - RSC with async data fetching
  ```tsx
  // Direct fetch, no getServerSideProps
  const collection = await fetchCollectionBySlug(params.slug);
  ```
- [x] Create `app/collection/[slug]/loading.tsx` - skeleton for collection metadata
- [x] Implement `generateMetadata()` for SEO/social sharing
- [x] Add pagination via URL params (`?page=0&size=30`)

- [x] **Parallel Routes for Collection Viewer**
- [x] Create `app/collection/[slug]/@viewer/page.tsx` - image grid with suspense
- [x] Create `app/collection/[slug]/@sidebar/page.tsx` - metadata/info panel
- [x] Create `app/collection/[slug]/layout.tsx` - combines parallel routes
- [x] Implement independent loading states for each slot

- [x] **Collection Type-Specific Views (RSC)**
- [x] Create `components/content-collection/blog-view.tsx` - server component
- [x] Create `components/content-collection/art-gallery-view.tsx` - server component
- [x] Create `components/content-collection/portfolio-view.tsx` - server component
- [x] Create `components/content-collection/client-gallery-view.tsx` - hybrid (RSC + client for password)

### 5.4 App Router - Content Blocks & Performance
- [x] **Content Block Components (SSR-Optimized)**
- [x] Create `components/content-blocks/image-content-block.tsx` - server component with next/image
- [x] Create `components/content-blocks/text-content-block.tsx` - server component
- [x] Create `components/content-blocks/code-content-block.tsx` - server component with syntax highlighting
- [x] Create `components/content-blocks/content-block-renderer.tsx` - server-side switch component

- [x] **Partial Prerendering & Streaming**
- [x] Implement streaming for image blocks:
  ```tsx
  <Suspense fallback={<ImageBlockSkeleton />}>
    <ImageContentBlock block={block} />
  </Suspense>
  ```
- [x] Configure static shell with `export const dynamic = 'force-static'`
- [x] Add `export const revalidate = 3600` for hourly cache updates
- [x] Implement progressive loading for collections with 30+ blocks

### 5.5 App Router - State Management Refactor
- [x] **Context to URL State Migration**
- [x] Move `imageSelected` to URL: `/collection/[slug]?image=123`
- [x] Move `isEditMode` to route: `/collection/[slug]/edit`
- [x] Replace `currentCatalog` context with RSC props
- [x] Remove `photoDataList` from context - fetch where needed

- [x] **Client-Only Context Optimization**
- [x] Create `app/providers.tsx` for remaining client providers
- [x] Keep only drag-drop state (`selectedForSwap`) in EditContext
- [x] Keep file upload state (`previewData`) in client context
- [x] Wrap only interactive components, not entire pages

### 5.6 App Router - Data Fetching & Caching
- [x] **API Layer Updates for RSC**
- [x] Update `lib/api/contentCollections.ts` with Next.js cache options:
  ```tsx
  fetch(url, {
    next: { 
      revalidate: 3600,
      tags: [`collection-${slug}`]
    }
  })
  ```
- [x] Create server-only wrappers in `lib/server/collections.ts`
- [x] Implement cache tags for targeted revalidation
- [x] Configure CloudFront for S3 images (separate from Next cache)

- [x] **Route Handlers Migration**
- [x] Migrate `pages/api/proxy/[...path].ts` to `app/api/proxy/[...path]/route.ts`
- [x] Use modern Request/Response APIs
- [x] Implement streaming for large file uploads

### 5.7 App Router - Admin Features (Client-Heavy)
- [x] **Collection Creation/Editing**
- [x] Create `app/(admin)/collection/create/page.tsx` - client page with 'use client'
- [x] Create `app/(admin)/collection/[slug]/edit/page.tsx` - client page
- [x] Keep editing components client-side (drag-drop, file upload required)
- [x] Use route groups `(admin)` for organization

- [x] **Admin Middleware & Protection**
- [x] Update `middleware.ts` for App Router paths
- [x] Add authentication checks for admin routes
- [x] Implement feature flags for gradual rollout

### 5.8 App Router - Legacy Migration (Final Phase)
- [x] Temporarily disable legacy Pages Router entrypoint by commenting out `pages/_app.tsx` so only App Router loads locally for testing
- [x] **Catalog to Collection Migration**
- [x] Keep `pages/catalog/[slug].tsx` operational during transition
- [x] Create redirect rules from old catalog URLs to new collection URLs
  - Flag-gated in middleware via `COLLECTION_REDIRECTS_ENABLED` (true => 308 to `/collection/[slug]`, except `/catalog/create`)
- [x] Update home page to pull from ContentCollections
- [ ] Deprecate catalog endpoints once migration complete

- [ ] **Performance Monitoring**
- [ ] Add Web Vitals tracking for new App Router pages
- [ ] Monitor Core Web Vitals: LCP < 2.5s, FID < 100ms, CLS < 0.1
- [ ] Compare performance: Pages Router vs App Router
- [ ] Optimize based on real-world metrics

### 5.9 Next.js Configuration Updates
- [ ] **Image Optimization for S3/CloudFront**
 ```js
 // next.config.js
 images: {
   remotePatterns: [{
     protocol: 'https',
     hostname: 'd2qp8h5pbkohe6.cloudfront.net',
   }],
   formats: ['image/avif', 'image/webp'],
 }
```
- [ ] Update build configuration for App Router
- [ ] Configure experimental features if needed
- [ ] Setup development/production environment variables

---

## Phase 6: New Home Page Rebuild

### 6.1 Overview & Constraints
- [x] Build a new Home page at `app/page.tsx` using the App Router (RSC-first)
- [x] Keep all old files untouched (e.g., `pages-old/index.tsx`, `types/HomeCardModel.ts`, `lib/api/home.ts`)
- [ ] Base layout and visual structure on the Old Home Page, but use the new ContentCollection system
- [ ] Use `ContentCollection.ContentBlock` image blocks as sources that map from legacy `HomeCardModel` semantics
- [ ] Maintain or improve initial load performance; provide placeholder/skeleton blocks until images load

### 6.1.2 Backend Model Alignment (Updated)
- [x] The current getHome API already returns the correct HomeCardModel. Including the model here for reference:
```java
@NoArgsConstructor
@AllArgsConstructor
@Data
@Builder
public class HomeCardModel {
    private Long id;
    private String title;
    private String cardType;
    private String location;
    private String date;
    private Integer priority;
    private String coverImageUrl;
    private String slug;
    private String text;
}
```

### 6.2 Data & Fetching
- [ ] Create `fetchHomePageCollections` in `lib/api/contentCollections.ts`
  - [ ] Fetch minimal, cacheable data for home (featured collections + light metadata)
  - [ ] Use Next cache with `revalidate` and `tags` (e.g., `home`, `collection-*`)
  - [ ] Return a typed array of `ContentCollection` with a minimal `ContentBlock[]` subset suitable for cards/hero
- [ ] Confirm/define `ContentCollection` and `ContentBlock` TypeScript types for home usage (if not already finalized)
  - [ ] Ensure image block fields include width/height, aspect ratio, srcset/webp/avif when available

### 6.3 UI Composition (RSC-first)
- [ ] Implement new Home at `app/page.tsx`
  - [ ] Server-render above-the-fold hero and initial card grid
  - [ ] Use `next/image` with width/height and priority for hero; lazy for others
  - [ ] Provide skeleton placeholders for cards while images stream
- [ ] CSS-based Parallax implementation
  - [ ] Prefer pure CSS (e.g., layered backgrounds, transform + perspective) with reduced motion support
  - [ ] Fallback or opt-in JS only if necessary (dynamically import client module)
- [ ] New Header (V2) and MenuDropdown (V2) components
  - [ ] Create parallel components (e.g., `components/header-v2`, `components/menu-dropdown-v2`) to avoid touching legacy
  - [ ] Keep them SSR-friendly; minimal client event handlers

### 6.4 Performance Targets (Initial)
- [ ] JS on home route < 50KB (initial) and CSS critical < 20KB
- [ ] Use PPR/streaming with Suspense boundaries where beneficial
- [ ] Use WebP/AVIF formats and CloudFront-allowed domains (see next.config.js)
- [ ] Preload only critical assets; avoid large fonts

### 6.5 Accessibility & Responsiveness
- [ ] Mobile-first responsive grid for cards
- [ ] Respect reduced motion; keyboard navigable menu
- [ ] Provide semantic landmarks and alt text from content metadata

### 6.6 Testing & Monitoring
- [ ] Unit tests for `fetchHomePageCollections`
- [ ] Component tests for `app/page.tsx` skeletons and image rendering
- [ ] Lighthouse/perf script alignment with (now) Phase 7 goals

### 6.7 Decisions & Specs (Confirmed)
- [x] Collection types on Home: All (BLOG, ART_GALLERY, CLIENT_GALLERY, PORTFOLIO)
- [x] Ordering: priority (desc), then date (newest first)
- [x] Initial visible items: target 12; use 6 simple placeholders above-the-fold for tiny initial JS, hydrate/stream rest
- [x] Card data shape: Update to new HomeCardModel and ensure API returns this shape from `fetchHomePageCollections`
- [x] Card fields on UI: show `title`; consider `date` and `cardType` badges on cards
- [x] Layout parity: 2-wide grid (no cardPairs); mobile 1-wide; keep parallax on scroll
- [x] Parallax: prefer CSS; keep background layer + cards; discuss optional lazy client JS enhancement later
- [x] Header/Menu: keep current Header/MenuDropdown unchanged for now; same items (About / Contact). Show Create/Update locally
- [x] Placeholders: support both shimmer skeletons and blur LQIP as options; discuss LQIP strategy later
- [x] Caching: only cache Home for now; define revalidate interval (e.g., 3600s) as a follow-up
- [x] Remote images: unchanged (same CloudFront domain)
- [x] SEO/Branding: no changes for now

### 6.8 API Contract (To implement)
- [ ] `fetchHomePageCollections`: returns array of HomeCardModel-like objects with minimal fields
- [ ] Server caching: `next: { revalidate: <interval>, tags: ['home'] }`
- [ ] Accept optional filters (type) and pagination (page/size) for future-proofing

---

## Phase 7: Ultra-fast Initial Home Page

### 7.1 Goals & Metrics
- [ ] First Contentful Paint < 1s on fast 4G, LCP < 2.5s
- [ ] JS shipped < 50KB on initial home route; CSS < 20KB critical
- [ ] 100 Lighthouse Performance on desktop; 90+ on mobile

### 7.2 Implementation Plan (RSC-first)
- [ ] Server-render above-the-fold content; no client providers on home unless needed
- [ ] Use CSS Modules with minimal rules; remove heavy parallax on first load or lazy-load it
- [ ] Replace image components with `next/image` using WebP/AVIF, width/height, lazy loading
- [ ] Add skeletons/placeholders for hero cards; defer non-critical sections with `Suspense`
- [ ] Dynamic import heavy components with `ssr: false` only if unavoidable
- [ ] Use `preload` for critical fonts/assets; avoid large font files
- [ ] Cache home data at the edge (Next cache route or `revalidate`), enable `stale-while-revalidate`

### 7.3 Verification
- [ ] Add a `scripts/perf/home-lh.mjs` to run Lighthouse CI locally
- [ ] Track metrics in README/todo; include before/after numbers

---



---

## Phase 8: Content Creation & Management

### 8.1 Create ContentCollection Create/Edit Components
- [ ] Create `Components/ContentCollection/ContentCollectionEditor.tsx`
    - [ ] **Client-side component** (editing requires interactivity)
    - [ ] Type-specific form fields based on CollectionType
    - [ ] Validation using existing patterns
- [ ] Create `Components/ContentCollection/ContentBlockEditor.tsx`
    - [ ] **Client-side component** for drag-and-drop reordering
    - [ ] Content block type selection and editing
    - [ ] File upload for media content blocks
- [ ] Create `Components/ContentCollection/CollectionTypeSelector.tsx`
    - [ ] **Client-side component** for type selection during creation
    - [ ] Type-specific feature explanations
- [ ] Create `pages/collection/create.tsx`
    - [ ] **Client-side page** (creation requires extensive interactivity)
    - [ ] Follow existing creation patterns from catalog create
- [ ] Use existing context patterns from `EditContext` where necessary
- **Files to create**: Multiple editor components and create page
- **Testing**: Component tests for editing functionality
- **SCSS**: Create `ContentCollectionEditor.module.scss`

### 8.2 Update Header/Navigation (Minimal Client-Side Impact)
- [ ] Add ContentCollection routes to header navigation
    - [ ] Update `Components/Header/Header.tsx` - keep server-side
    - [ ] Add collection type navigation
- [ ] Update admin menu to include "Create Collection" option
    - [ ] Update `Components/MenuDropdown/MenuDropdown.tsx`
    - [ ] Keep existing Catalog navigation intact during transition
- [ ] Follow existing navigation patterns
- **Files to modify**:
    - `Components/Header/Header.tsx`
    - `Components/MenuDropdown/MenuDropdown.tsx`
- **Testing**: Component tests for navigation updates

---


## Phase 9: Migration Strategy & Tooling

### 9.1 Create Migration Utilities (Backend kept here for visibility)
- [ ] Create `MigrationService.java` for converting Catalogs to ContentCollections
    - [ ] Catalog type detection logic (analyze titles, content, metadata)
    - [ ] Batch migration with progress tracking
    - [ ] Data validation and integrity checks
- [ ] Create migration endpoint (dev-only): `POST /api/write/migration/catalog-to-collection/{catalogId}`
- [ ] Add rollback functionality for failed migrations
- [ ] Consider Flyway for future schema changes
- **Files to create**: `src/main/java/edens/zac/portfolio/backend/services/MigrationService.java`
- **Testing**: Unit tests for migration logic and integration tests for data integrity

### 9.2 Create Migration Scripts & Tools
- [ ] Create database migration script for bulk conversion
    - [ ] SQL scripts for data type mapping
    - [ ] Image-to-ImageContentBlock conversion
- [ ] Add validation script to ensure data integrity
    - [ ] Compare before/after data
    - [ ] Verify S3 URLs and metadata
- [ ] Create frontend tool for selective migration
    - [ ] Admin interface for choosing which catalogs to migrate
    - [ ] Preview functionality before migration
- **Files to create**: Migration scripts and admin tools
- **Testing**: Integration tests for migration scripts

---

## Phase 10: Testing Strategy & Validation

### 10.1 Current Test Files and Required Coverage (be explicit)
- tests/lib/api/contentCollections.test.ts
  - Functions to cover:
    - fetchCollections, fetchCollectionBySlug, fetchCollectionsByType, fetchHomePageCollections, validateClientGalleryAccess
  - General instructions:
    - Mock global.fetch. Assert Next.js cache tags in init.next.tags and revalidate values where applicable.
    - Verify 404 triggers notFound() for slug detail. Verify non-JSON responses throw a descriptive error.
    - Normalize shapes: test array and paginated object responses for fetchCollections and fetchHomePageCollections.

- tests/lib/server/collections.test.ts
  - Functions to cover:
    - createCollection, updateCollection, deleteCollection, uploadContentFiles
  - General instructions:
    - Mock global.fetch and next/cache revalidateTag/revalidatePath. Ensure correct tags are revalidated per operation.
    - Validate required argument guard clauses (e.g., missing id/slug/password) throw early.
    - For uploadContentFiles, ensure FormData is constructed and at least one file is required.

- tests/url-state/selectable-wrapper.test.tsx
  - Behaviors to cover:
    - Renders child, computes href with image selection, fires router.push on click (mock).
  - Instructions:
    - Mock next/navigation hooks (useRouter/usePathname/useSearchParams). Use RTL render/fireEvent.

- New tests to add (files to create):
  - tests/app/home.page.test.tsx
    - Cover RSC fallback behavior by using experimental-server mocks or treat as integration via route handler.
    - Verify minimal list rendering when fetchHomePageCollections returns [] and when it returns data.
  - tests/Components/content-collection/*.test.tsx (one per view)
    - blog-view, art-gallery-view, portfolio-view, client-gallery-view
    - Mount with minimal collection fixture and assert block rendering via ContentBlockRenderer.
  - tests/Components/content-blocks/content-block-renderer.test.tsx
    - Given blocks of type IMAGE/TEXT/CODE/GIF, dispatches to correct subcomponent.

### 10.2 Test Data and Fixtures
- Create lightweight fixtures for ContentCollectionNormalized and ContentBlock variants in tests/_fixtures.ts.
- Provide helper to build URLSearchParams for pagination queries.

### 10.3 Tooling and Commands
- Ensure npx jest runs with jsdom for component tests and node for API tests (already configured in jest.config.mjs).
- Add npm scripts: "test:watch", "test:ci" with --runInBand for CI.

### 10.4 Performance/Lighthouse (deferred until Home UI is ready)
- Add scripts/perf/home-lh.mjs to run Lighthouse locally against / (once Home UI is more complete).
- Capture metrics in README with before/after snaps.


---

## Phase 11: Gradual Migration & Production Deployment

### 13.1 Environment Considerations
- [ ] **Production Data**: Continue using production environment for now
- [ ] **Future Environment Setup**: Plan for staging environment
    - [ ] Separate S3 buckets for staging
    - [ ] Separate database for testing migrations
    - [ ] CI/CD pipeline for automated testing

### 13.2 Migrate Existing Data
- [ ] **Catalog Classification**: Identify which catalogs belong to which CollectionType
    - [ ] Art galleries: Abstract concepts ("humans in nature", "urban landscapes")
    - [ ] Portfolio pieces: Location/event specific ("Arches National Park", "Wedding Showcase")
    - [ ] Client galleries: Individual client work (if any exist)
- [ ] **Migration Order** (lowest risk first):
    - [ ] Migrate art galleries first (lowest risk, most generic)
    - [ ] Migrate portfolio pieces (professional showcases)
    - [ ] Create new blogs rather than migrating (fresh start)
    - [ ] Keep any client galleries as catalogs initially
- [ ] **Data Validation**: Verify all migrated content displays correctly
    - [ ] Check image loading and metadata
    - [ ] Verify pagination works with migrated content
    - [ ] Test performance with large migrated collections

### 13.3 Update Home Page & Navigation
- [ ] Modify home page to pull from ContentCollections instead of Catalogs
    - [ ] Update `fetchHomePage()` API to use new endpoints
    - [ ] Update `HomeCardModel` to support collection types
    - [ ] Ensure backwards compatibility during transition
- [ ] Update main navigation to include collection types
- [ ] **Gradual Rollout**: Feature flag approach for testing
- **Files to modify**:
    - `lib/api/home.ts`
    - `pages/index.tsx`
    - `src/main/java/edens/zac/portfolio/backend/services/HomeService.java`

### 13.4 Performance Monitoring & Optimization
- [ ] Monitor database performance with new pagination queries
- [ ] Monitor S3 usage patterns with mixed content types
- [ ] Optimize any slow queries discovered in production
- [ ] Monitor user experience with larger collections

---

## Notes for Future Development

### What We Need
- **Flexible content system** supporting four collection types (blog, art_gallery, client_gallery, portfolio)
- **Ordered content blocks** (images, text, code, gifs) with pagination for performance
- **Optimized SSR/client-side balance** - minimize context usage, keep components server-side when possible
- **Comprehensive testing strategy** - unit tests, component tests, integration tests
- **Migration path** from existing Catalog system without breaking current functionality
- **Simple client gallery security** (password protection) with future extensibility

### What We Don't Need
- **Complex permissions system** initially (simple passwords sufficient)
- **Flyway migrations** immediately (can add later, new system is parallel)
- **Separate environments** initially (production-only acceptable for solo developer)
- **Advanced client gallery features** (user accounts, JWT tokens) in Phase 1
- **Real-time collaboration** or advanced CMS features initially

### Key Technical Principles
- **Build in parallel**: Don't modify existing Catalog/Image system until ready
- **SSR-first approach**: Minimize client-side context usage, keep components server-side when possible
- **Pagination from start**: Design for collections with 200+ content blocks
- **Test as you build**: Add unit and component tests throughout development
- **Performance-conscious**: Consider database indexes, query optimization, and S3 usage patterns
- **Type safety**: Maintain strict TypeScript usage and validation

### Error Handling & Validation Strategy
- **Backend**: Use Bean Validation annotations + service-level validation + proper HTTP status codes
- **Frontend**: Client-side validation for UX + server-side validation for security
- **Database**: Proper indexes, constraints, and foreign key relationships

### SCSS & Styling
- **Module-based approach**: Continue using `.module.scss` pattern
- **Unified naming**: Follow BEM or similar consistent naming convention
- **Component-specific**: Each major component gets its own SCSS module
- **Responsive-first**: Mobile-first design approach

### Storage Strategy
- **Images/GIFs**: S3 storage with CloudFront CDN (existing pattern)
- **Text/Code content**: Database storage as `@Lob` fields (no S3 needed)
- **Metadata**: Database with proper indexing for performance
- **Client passwords**: Currently SHA-256 hashing (TODO: migrate to BCrypt before client gallery frontend work)


context: `.junie/guidelines.md` `newToDO.md` `todo.md`,
`mobileToDo.md`

We need to consolidate our todo files, so that  todo.md is
our only todo file. it should  include ONLY things that are
still needing to be done, from all three. This should be
based on order of priority. we can obviously remove all
backend todo items. For some items like `Ultra-fast initial
  Home Page`, this is a 'verify' step.

again, let's keep these organized by order of importance,
basically what needs to be done next. 
