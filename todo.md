# TODO

---
## Phase 1: Content Creation & Management
- [ ] **Edit Image Modal**
- [ ] **Get All images endpoint / page**
- [ ] **edit image endpoint**
- [ ] **Add existing images to collection**
- [ ] **Add existing images to collection** aka, 'getAllImages -> display images by date/location/etc'
- [ ] **Display Metadata on images**
- [ ] **Clickable metadata on images to go to 'tags'**
- [ ] **Tag page**
- [ ] **all images page**
  - Includes 'filter by'
  - Includes 'order by'
  - Includes a 'add to collection' button
    - Allows us to select multiple to add to
  - Includes a 'upload images(not to collection)'
  - Includes 'update metadata' where we can update multiple
    - i.e., update location - select all 'seattle'
  - Includes updating tags ( type tag, select all that apply?)

### Notes
- **Do NOT combine Image/GIF renderers** - GIF component is still in development
- **Keep Image/GIF styles separate** - Different optimization requirements
- **Preserve ParallaxImageRenderer special styling** - Mobile/desktop wrapper logic must stay in ContentBlockComponent

### Phase 3: Architecture Improvements (Medium Priority)
- [ ] **Implement renderer registry pattern**
  - Replace inline type checking (lines 91-133) with registry map
  - Create `RENDERERS` object mapping block types to components
  - Simplify ContentBlockComponent render logic

- [ ] **Move parallax wrapper logic to ParallaxImageRenderer**
  - Remove special-case inline JSX from ContentBlockComponent (lines 94-125)
  - Move wrapper divs and styling into ParallaxImageRenderer component
  - Make all renderers follow consistent pattern

- [ ] **Simplify hasOverlays detection**
  - Remove duplicate overlay calculations in individual renderers
  - Centralize overlay detection since only ParallaxImageRenderer has text overlays currently

- [ ] **Create responsive styles hook**
  - Extract mobile/desktop logic into `useResponsiveBlockStyles` hook
  - Centralize responsive calculations for reuse across components
  - Keep special ParallaxImageRenderer wrapper styling in ContentBlockComponent


## Overview


## Phase 4: Ultra-fast Initial Home Page

### 4.1 Goals & Metrics
- [ ] First Contentful Paint < 1s on fast 4G, LCP < 2.5s
- [ ] JS shipped < 50KB on initial home route; CSS < 20KB critical
- [ ] 100 Lighthouse Performance on desktop; 90+ on mobile

### 4.2 Implementation Plan (RSC-first)
- [ ] Server-render above-the-fold content; no client providers on home unless needed
- [ ] Use CSS Modules with minimal rules; remove heavy parallax on first load or lazy-load it
- [ ] Replace image components with `next/image` using WebP/AVIF, width/height, lazy loading
- [ ] Add skeletons/placeholders for hero cards; defer non-critical sections with `Suspense`
- [ ] Dynamic import heavy components with `ssr: false` only if unavoidable
- [ ] Use `preload` for critical fonts/assets; avoid large font files
- [ ] Cache home data at the edge (Next cache route or `revalidate`), enable `stale-while-revalidate`

### 4.3 Verification
- [ ] Add a `scripts/perf/home-lh.mjs` to run Lighthouse CI locally
- [ ] Track metrics in README/todo; include before/after numbers

---

---

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


- [ ] **Touch interaction optimization** - test scroll smoothness on actual mobile devices

### 5.4 Lessons Learned
- ✅ **Incremental changes**: Test one change at a time, not everything at once
- ✅ **Preserve working functionality**: Don't fix what isn't broken
- ✅ **Performance vs UX trade-offs**: Address separately, not simultaneously
- ✅ **Testing is critical**: Especially for visual effects like parallax


### Future Thoughts
- ** Add Image to other collection
- ** Get all Collection Names endpoint - simply array of name/slug of all collections
- ** Update Image Metadata endpoint and frontend logic

---
