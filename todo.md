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
- [ ] **Context to URL State Migration**
- [ ] Move `imageSelected` to URL: `/collection/[slug]?image=123`
- [ ] Move `isEditMode` to route: `/collection/[slug]/edit`
- [ ] Replace `currentCatalog` context with RSC props
- [ ] Remove `photoDataList` from context - fetch where needed

- [ ] **Client-Only Context Optimization**
- [ ] Create `app/providers.tsx` for remaining client providers
- [ ] Keep only drag-drop state (`selectedForSwap`) in EditContext
- [ ] Keep file upload state (`previewData`) in client context
- [ ] Wrap only interactive components, not entire pages

### 5.6 App Router - Data Fetching & Caching
- [ ] **API Layer Updates for RSC**
- [ ] Update `lib/api/contentCollections.ts` with Next.js cache options:
  ```tsx
  fetch(url, {
    next: { 
      revalidate: 3600,
      tags: [`collection-${slug}`]
    }
  })
  ```
- [ ] Create server-only wrappers in `lib/server/collections.ts`
- [ ] Implement cache tags for targeted revalidation
- [ ] Configure CloudFront for S3 images (separate from Next cache)

- [ ] **Route Handlers Migration**
- [ ] Migrate `pages/api/proxy/[...path].ts` to `app/api/proxy/[...path]/route.ts`
- [ ] Use modern Request/Response APIs
- [ ] Implement streaming for large file uploads

### 5.7 App Router - Admin Features (Client-Heavy)
- [ ] **Collection Creation/Editing**
- [ ] Create `app/(admin)/collection/create/page.tsx` - client page with 'use client'
- [ ] Create `app/(admin)/collection/[slug]/edit/page.tsx` - client page
- [ ] Keep editing components client-side (drag-drop, file upload required)
- [ ] Use route groups `(admin)` for organization

- [ ] **Admin Middleware & Protection**
- [ ] Update `middleware.ts` for App Router paths
- [ ] Add authentication checks for admin routes
- [ ] Implement feature flags for gradual rollout

### 5.8 App Router - Legacy Migration (Final Phase)
- [ ] **Catalog to Collection Migration**
- [ ] Keep `pages/catalog/[slug].tsx` operational during transition
- [ ] Create redirect rules from old catalog URLs to new collection URLs
- [ ] Update home page to pull from ContentCollections
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

## Phase 6: Ultra-fast Initial Home Page

### 6.1 Goals & Metrics
- [ ] First Contentful Paint < 1s on fast 4G, LCP < 2.5s
- [ ] JS shipped < 50KB on initial home route; CSS < 20KB critical
- [ ] 100 Lighthouse Performance on desktop; 90+ on mobile

### 6.2 Implementation Plan (RSC-first)
- [ ] Convert home to RSC (App Router) or keep SSR minimal in Pages until migration
- [ ] Server-render above-the-fold content; no client providers on home unless needed
- [ ] Use CSS Modules with minimal rules; remove heavy parallax on first load or lazy-load it
- [ ] Replace image components with `next/image` using WebP/AVIF, width/height, lazy loading
- [ ] Add skeletons/placeholders for hero cards; defer non-critical sections with `Suspense`
- [ ] Dynamic import heavy components with `ssr: false` only if unavoidable
- [ ] Use `preload` for critical fonts/assets; avoid large font files
- [ ] Cache home data at the edge (Next cache route or `revalidate`), enable `stale-while-revalidate`

### 6.3 Verification
- [ ] Add a `scripts/perf/home-lh.mjs` to run Lighthouse CI locally
- [ ] Track metrics in README/todo; include before/after numbers

---

## Phase 7: Frontend Types & Models

### 7.1 Create TypeScript Types
- [ ] Create `types/ContentCollection.ts`
    - [ ] Define CollectionType enum matching backend
    - [ ] Include pagination interfaces (PaginatedResponse, PageMetadata)
    - [ ] Add client gallery access types
- [ ] Create `types/ContentBlock.ts`
    - [ ] Define ContentBlockType enum matching backend
    - [ ] Create interfaces for each content block type
    - [ ] Include ordering and editing interfaces
- [ ] Follow existing TypeScript patterns from Catalog/Image types
- **Files to create**:
    - `types/ContentCollection.ts`
    - `types/ContentBlock.ts`
- **Testing**: Create type-only test files to ensure type safety

### 7.2 Create API Functions
- [ ] Create `lib/api/contentCollections.ts`
- [ ] Implement fetch functions (align with backend paths and defaults):
    - [ ] `fetchCollections(page = 0, size = 10)` -> GET `/api/read/collections`
    - [ ] `fetchCollectionBySlug(slug, page = 0, size = 30)` -> GET `/api/read/collections/{slug}`
    - [ ] `fetchCollectionsByType(type, page = 0, size = 10)` -> GET `/api/read/collections/type/{type}`
    - [ ] `validateClientGalleryAccess(slug, password)` -> POST `/api/read/collections/{slug}/access`
    - [ ] `createCollection(dto)` -> POST `/api/write/collections/createCollection` (JSON)
    - [ ] `uploadContentFiles(collectionId, files)` -> POST `/api/write/collections/{id}/content` (multipart)
    - [ ] `updateCollection(id, updates)` -> PUT `/api/write/collections/{id}` (metadata + reorder/remove/add text)
    - [ ] `deleteCollection(id)` -> DELETE `/api/write/collections/{id}`
- [ ] Follow existing error handling patterns from `lib/api/core.ts`
- [ ] Keep separate from existing catalog API functions
- [ ] Add proper TypeScript return types
- **Files to create**: `lib/api/contentCollections.ts`
- **Testing**: Unit tests for API functions and error handling

---

## Phase 8: Frontend Components (SSR-Optimized)

### 8.1 Create Content Block Components (SSR-First)
- [ ] Create `Components/ContentBlocks/ImageContentBlock.tsx`
    - [ ] **Server-side component** - no hooks/context unless absolutely necessary
    - [ ] Reuse image optimization from existing components
    - [ ] Add lazy loading for performance
- [ ] Create `Components/ContentBlocks/TextContentBlock.tsx`
    - [ ] **Server-side component** with markdown/HTML rendering
    - [ ] Add syntax highlighting for formatted text
- [ ] Create `Components/ContentBlocks/CodeContentBlock.tsx`
    - [ ] **Server-side component** with syntax highlighting
    - [ ] Support multiple programming languages
- [ ] Create `Components/ContentBlocks/GifContentBlock.tsx`
    - [ ] **Server-side component** optimized for GIF display
- [ ] Create `Components/ContentBlocks/ContentBlockRenderer.tsx`
    - [ ] **Server-side switch component** based on block type
    - [ ] Minimal logic, pure rendering
- **Files to create**: Multiple ContentBlock components
- **Testing**: Component tests using React Testing Library
- **SCSS**: Follow existing module patterns, create `ContentBlocks.module.scss`

### 8.2 Create ContentCollection Display Components (SSR-First)
- [ ] Create `Components/ContentCollection/ContentCollectionView.tsx`
    - [ ] **Server-side base component** with minimal logic
    - [ ] Handle pagination controls (minimal client-side interaction)
    - [ ] Type-based rendering delegation
- [ ] Create `Components/ContentCollection/BlogView.tsx`
    - [ ] **Server-side component** optimized for chronological content
    - [ ] Mixed content layout (text + images)
- [ ] Create `Components/ContentCollection/ArtGalleryView.tsx`
    - [ ] **Server-side component** optimized for image-focused display
    - [ ] Grid layouts, artistic presentation
- [ ] Create `Components/ContentCollection/PortfolioView.tsx`
    - [ ] **Server-side component** for professional presentation
    - [ ] Clean, polished layouts
- [ ] Create `Components/ContentCollection/ClientGalleryView.tsx`
    - [ ] **Hybrid component** - SSR for display, client-side for password access
    - [ ] Download functionality (minimal client-side logic)
    - [ ] Password protection interface
- [ ] Create `Components/ContentCollection/PaginationControls.tsx`
    - [ ] **Client-side component** for navigation (necessary for interactivity)
    - [ ] URL-based pagination (SEO-friendly)
- **Files to create**: Multiple view components
- **Testing**: Component tests for each view type and pagination
- **SCSS**: Create unified `ContentCollection.module.scss` following best practices

### 8.3 Create ContentCollection Page Route
- [ ] Create `pages/collection/[slug].tsx`
    - [ ] **Server-side rendering** with `getServerSideProps`
    - [ ] Handle pagination in SSR (page, size query params)
    - [ ] Dynamic rendering based on CollectionType
    - [ ] Client gallery password handling (hybrid approach)
    - [ ] Keep completely separate from existing `pages/catalog/[slug].tsx`
- [ ] Follow existing SSR patterns from catalog pages
- [ ] Implement proper error handling (404, 403, etc.)
- [ ] Add SEO optimization (meta tags, structured data)
- **Files to create**: `pages/collection/[slug].tsx`
- **Testing**: Page-level integration tests

---

## Phase 9: Content Creation & Management

### 9.1 Create ContentCollection Create/Edit Components
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

### 9.2 Update Header/Navigation (Minimal Client-Side Impact)
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

## Phase 10: Migration Strategy & Tooling

### 10.1 Create Migration Utilities
- [ ] Create `MigrationService.java` for converting Catalogs to ContentCollections
    - [ ] Catalog type detection logic (analyze titles, content, metadata)
    - [ ] Batch migration with progress tracking
    - [ ] Data validation and integrity checks
- [ ] Create migration endpoint (dev-only): `POST /api/write/migration/catalog-to-collection/{catalogId}`
- [ ] Add rollback functionality for failed migrations
- [ ] **Consider Flyway**: Evaluate adding Flyway for future schema changes
- **Files to create**: `src/main/java/edens/zac/portfolio/backend/services/MigrationService.java`
- **Testing**: Unit tests for migration logic and integration tests for data integrity

### 10.2 Create Migration Scripts & Tools
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

## Phase 11: Testing Strategy & Validation

### 11.1 Backend Testing
- [ ] **Unit Tests**: Create comprehensive unit tests for all services and utilities
    - [ ] Test pagination logic thoroughly
    - [ ] Test client gallery password validation
    - [ ] Test content block ordering and reordering
    - [ ] Mock external dependencies (S3, database)
- [ ] **Integration Tests**: Test full API endpoints
    - [ ] Test pagination with real data
    - [ ] Test multipart uploads for mixed content
    - [ ] Test client gallery access flows
- [ ] **Performance Tests**: Test with large collections
    - [ ] 200+ content blocks pagination performance
    - [ ] Database query optimization
    - [ ] S3 upload performance for batch operations

### 11.2 Frontend Testing
- [ ] **Component Tests**: Use React Testing Library for all components
    - [ ] Test SSR components render correctly
    - [ ] Test client-side components handle state properly
    - [ ] Test pagination controls
    - [ ] Test content block rendering for each type
- [ ] **Integration Tests**: Test page-level functionality
    - [ ] Test SSR data fetching
    - [ ] Test client gallery password flows
    - [ ] Test collection creation and editing
- [ ] **Performance Tests**: Test with large collections
    - [ ] Image lazy loading effectiveness
    - [ ] Pagination performance on slow connections

### 11.3 End-to-End Validation
- [ ] Create test collections of each type with real content
- [ ] Verify all CRUD operations work correctly
- [ ] Test content block ordering and editing across all types
- [ ] Validate responsive design on all collection types and devices
- [ ] Test client gallery security and access controls
- [ ] **Future**: Plan for Selenium UI testing framework

---

## Phase 12: Gradual Migration & Production Deployment

### 12.1 Environment Considerations
- [ ] **Production Data**: Continue using production environment for now
- [ ] **Future Environment Setup**: Plan for staging environment
    - [ ] Separate S3 buckets for staging
    - [ ] Separate database for testing migrations
    - [ ] CI/CD pipeline for automated testing

### 12.2 Migrate Existing Data
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

### 12.3 Update Home Page & Navigation
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

### 12.4 Performance Monitoring & Optimization
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
