# Content Collection Refactor TODO

## Overview


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

## Phase 1: Content Creation & Management

### 1.1 Create ContentCollection Create/Edit Components
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

### 1.2 Update Header/Navigation (Minimal Client-Side Impact)
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


## Phase 2: Migration Strategy & Tooling

### 2.1 Create Migration Utilities (Backend kept here for visibility)
- [ ] Create `MigrationService.java` for converting Catalogs to ContentCollections
    - [ ] Catalog type detection logic (analyze titles, content, metadata)
    - [ ] Batch migration with progress tracking
    - [ ] Data validation and integrity checks
- [ ] Create migration endpoint (dev-only): `POST /api/write/migration/catalog-to-collection/{catalogId}`
- [ ] Add rollback functionality for failed migrations
- [ ] Consider Flyway for future schema changes
- **Files to create**: `src/main/java/edens/zac/portfolio/backend/services/MigrationService.java`
- **Testing**: Unit tests for migration logic and integration tests for data integrity

### 2.2 Create Migration Scripts & Tools
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

## Phase 3: Testing Strategy & Validation

### 3.1 Current Test Files and Required Coverage (be explicit)
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

### 3.2 Test Data and Fixtures
- Create lightweight fixtures for ContentCollectionNormalized and ContentBlock variants in tests/_fixtures.ts.
- Provide helper to build URLSearchParams for pagination queries.

### 3.3 Tooling and Commands
- Ensure npx jest runs with jsdom for component tests and node for API tests (already configured in jest.config.mjs).
- Add npm scripts: "test:watch", "test:ci" with --runInBand for CI.

### 3.4 Performance/Lighthouse (deferred until Home UI is ready)
- Add scripts/perf/home-lh.mjs to run Lighthouse locally against / (once Home UI is more complete).
- Capture metrics in README with before/after snaps.


---

## Phase 4: Gradual Migration & Production Deployment

### 4.1 Environment Considerations
- [ ] **Production Data**: Continue using production environment for now
- [ ] **Future Environment Setup**: Plan for staging environment
    - [ ] Separate S3 buckets for staging
    - [ ] Separate database for testing migrations
    - [ ] CI/CD pipeline for automated testing

### 4.2 Migrate Existing Data
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

### 4.3 Update Home Page & Navigation
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

### 4.4 Performance Monitoring & Optimization
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



## Phase 12: Parallax Unification & Mobile Optimization

### Description
After implementing ParallaxImageRenderer for collection pages, we've achieved better mobile parallax functionality than our home page implementation. The collection pages display full-width images with proper parallax starting from the bottom, while the home page crops to 1:1 ratio and has suboptimal parallax behavior on mobile.

**Key Differences Identified:**
- Collection cover: Uses ParallaxImageRenderer with proper background positioning (50% 100%) and sizing (110%)
- Home page: Uses generic parallax with different styling and 1:1 crop causing visual issues
- useParallax.ts: Large, complex hook that could benefit from modularization and simplification

**Questions/Concerns:**
- Can we use ParallaxImageRenderer for home page images to unify behavior?
- Should we treat home page images as ParallaxImageContentBlock types?
- Do we need buildCoverImageBlock logic outside of collection pages?
- Can useParallax.ts logic be simplified or consolidated into smaller functions?
- Is there a performance reason to keep separate parallax implementations?

### 12.1 Width Container System Unification (Priority: High)
- [x] **Analyze width container differences** between home and collection pages
    - **Home Page**: CSS Grid, full page width, forced aspect ratios (1:1 mobile, 1.75:1 desktop), `.gridBackground` parallax
    - **Collection Pages**: Fixed max-width 1200px container, calculated dimensions via useViewport, ParallaxImageRenderer, custom contentBlockPair logic
    - **Issue**: Home page 1:1 cropping causes visual problems, different container approaches create inconsistency
- [ ] **Design unified container system supporting both grid and content-based layouts**
    - [ ] Create ContainerContext to provide layout mode (grid vs content) and dimensions
    - [ ] Design responsive width calculation that works for both grid cards and content blocks
    - [ ] Plan container wrapper that handles both fixed-width (collections) and full-width (home) scenarios
    - [ ] Ensure mobile-first approach: full width mobile, appropriate containers desktop
- [ ] **Create shared width/container utilities**
    - [ ] Extract buildCoverImageBlock from `app/[cardType]/[slug]/page.tsx` to shared utility
    - [ ] Create utility to convert home page images to ParallaxImageContentBlock format
    - [ ] Create `getContainerDimensions(mode, viewport)` utility for consistent width calculation
    - [ ] Create `useContainerLayout` hook to replace individual useViewport calls
- [ ] **Update BlockWrapper for unified container handling**
    - [ ] Add containerMode prop: 'grid' | 'content' | 'full-width'
    - [ ] Remove forced aspect ratios when containerMode='content'
    - [ ] Handle responsive width calculation internally based on containerMode
    - [ ] Maintain backward compatibility during transition
- **Files to modify:**
    - `app/components/ContentBlock/BlockWrapper.tsx` (unified container logic)
    - `app/hooks/useContainerLayout.ts` (new unified hook)
    - `app/utils/containerDimensions.ts` (new utility)
    - `app/page.tsx` (use new container system)
    - `app/[cardType]/[slug]/page.tsx` (extract buildCoverImageBlock)

### 12.2 Parallax System Unification (Priority: High)
- [ ] **Replace home page parallax with ParallaxImageRenderer**
    - [ ] Update home page to use ParallaxImageRenderer instead of `.gridBackground`
    - [ ] Convert home page image data to ParallaxImageContentBlock format
    - [ ] Remove 1:1 aspect ratio constraints that cause cropping issues
    - [ ] Test mobile behavior matches improved collection page experience
- [ ] **Standardize parallax background positioning**
    - [ ] Use consistent background-position: 50% 100% (start at bottom) for all parallax images
    - [ ] Use consistent background-size: 110% for parallax expansion
    - [ ] Remove home page specific background sizing (160% on mobile, cover on desktop)
- **Files to modify:**
    - `app/page.tsx` (use ParallaxImageRenderer)
    - `app/page.module.scss` (remove .gridBackground, update grid styles)
    - `app/utils/` (conversion utilities)

### 12.2 useParallax Hook Refactoring (Priority: Medium)
- [ ] **Break down useParallax.ts into smaller modules**
    - [ ] Extract row manager logic into separate `parallaxRowManager.ts`
    - [ ] Extract individual element logic into `parallaxSingleElement.ts`
    - [ ] Create `parallaxUtils.ts` for shared calculations and device detection
    - [ ] Keep main `useParallax.ts` as orchestrator/public API
- [ ] **Add comprehensive tests for parallax modules**
    - [ ] Unit tests for row manager functionality
    - [ ] Unit tests for single element parallax
    - [ ] Unit tests for utility functions (speed calculation, device detection)
    - [ ] Integration tests for hook behavior
- [ ] **Simplify and optimize parallax logic**
    - [ ] Review if both row-based and single-element modes are necessary
    - [ ] Consolidate duplicate scroll handling logic
    - [ ] Optimize performance bottlenecks identified during refactoring
- **Files to create:**
    - `app/hooks/parallax/parallaxRowManager.ts`
    - `app/hooks/parallax/parallaxSingleElement.ts`
    - `app/hooks/parallax/parallaxUtils.ts`
    - `tests/hooks/parallax/` (test files)

### 12.3 Mobile Parallax Optimization (Priority: High)
- [ ] **Fix home page mobile parallax issues**
    - [ ] Remove 1:1 image cropping on mobile home page
    - [ ] Implement proper background positioning (50% 100%) like collection pages
    - [ ] Ensure images display full-width on mobile
    - [ ] Test parallax smoothness across different mobile devices
- [ ] **Standardize mobile parallax behavior**
    - [ ] Use consistent speed attenuation across home and collection pages
    - [ ] Ensure reduced motion preferences are respected
    - [ ] Optimize performance for mobile scroll events
- **Files to modify:**
    - Home page styling and image rendering
    - ParallaxImageRenderer mobile optimizations

### 12.4 Type System Integration (Priority: Low)
- [ ] **Extend ParallaxImageContentBlock usage**
    - [ ] Evaluate if home page images should use ParallaxImageContentBlock type
    - [ ] Create conversion utilities from existing image data to ParallaxImageContentBlock
    - [ ] Update type definitions if needed for home page integration
- [ ] **Consolidate parallax-related types**
    - [ ] Review if ParallaxOptions in useParallax can be simplified
    - [ ] Ensure type consistency between home page and collection page parallax

---

Notes from Tyler:
- skinnier desktop menu ✓
- menu needs to not be opaque ✓
- can't see inside
- collection page, top title image should have parallax ✓
- menu items should ALL have a dropdown, so 'blog' would show top 3, and a 'see more'. for consistency.

---