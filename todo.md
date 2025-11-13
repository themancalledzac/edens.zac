# TODO

---

## Development Principles

### Key Technical Principles
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

### Code Reuse & Consistency
- **Check existing utilities first**: Before creating new utility functions, check if similar functionality already exists (e.g., `processContentBlocks` in `contentLayout.ts`)
- **Consistency across pages**: Admin/manage pages should use the same processing logic as public pages when displaying the same content types
- **Collection rendering**: Collections should be converted to `ParallaxImageContentModel` (not `ImageContentModel`) for consistency with collection page rendering
- **Shared components**: Both collection page and manage page use `ContentBlockWithFullScreen`, so content processing should be compatible

---

## High Priority Features (Next Up)

#### 1. Image Metadata Dropdown on Full Screen Image
- Add clickable button/icon to show/hide metadata panel in fullscreen view
- Display: other collections, people, camera, lens, fstop/aperture, shutter speed, ISO, etc.
- Reuse existing metadata structure from `ImageMetadataModal`
- Consider creating `FullScreenImageMetadata` component
- Easy win: Extract metadata display logic from `ImageMetadataModal` into reusable component

**Implementation Findings:**
- **Fullscreen Component**: `app/hooks/useFullScreenImage.tsx` - renders modal via portal at body level ( this should already be done )
- **Current Layout**: Mobile-first flexbox - defaults to `flex-direction: column` (mobile), switches to `flex-direction: row` only on desktop when width is super wide (16:9 or 2:1 aspect ratio)
- **Styles**: `app/styles/fullscreen-image.module.scss` - image centered in `overlayContainer`
- **Metadata Source**: `ContentImageModel` type contains all metadata fields (title, caption, camera, lens, ISO, f-stop, shutter speed, tags, people, collections, etc.)
- **Metadata Display Logic**: `ImageMetadataModal.tsx` has all the form rendering logic - need to extract read-only display version
- **Implementation Plan**:
  1. Create `FullScreenImageMetadata.tsx` component (read-only metadata display)
  2. Extract metadata rendering from `ImageMetadataModal` - create reusable `MetadataDisplay` component or utility
  3. Add toggle button with down arrow (↓) at bottom of image (default mobile layout), positioned on right side only on wide desktop screens
  4. Arrow flips to up arrow (↑) when metadata is visible
  5. Add hover effect on arrow (slight highlight/glow)
  6. Implement slide-in animation (0.2s transition):
     - Default (mobile): Slide down from bottom of image
     - Wide desktop only: Slide in from right side
  7. Ensure image container has enough space - metadata should not push image around
  8. Update `useFullScreenImage` hook to accept and pass image metadata
  9. Responsive breakpoint: Use 16:9 or 2:1 aspect ratio check for wide desktop layout (metadata on right) - mobile-first means this is an enhancement, not the default
- **Key Files to Modify**:
  - `app/hooks/useFullScreenImage.tsx` - add metadata panel state and rendering
  - `app/styles/fullscreen-image.module.scss` - add metadata panel styles and animations
  - `app/components/ImageMetadata/` - create new `FullScreenImageMetadata.tsx` component
  - `app/components/Content/ContentBlockWithFullScreen.tsx` - ensure image metadata is passed to fullscreen hook

#### 2. People Page
- New route/page for viewing images by person
- Click person name from metadata (step 1) → navigate to people page
- Backend: New endpoint `getImagesByPerson(personId)` - returns images where person is tagged
- Reuse `CollectionPage`/`ContentBlockWithFullScreen` logic (same pattern as collections)
- URL structure: `/people/[personId]` or `/people/[personSlug]`
- Easy win: Create `PeoplePage.tsx` component that mirrors `CollectionPage.tsx` structure

#### 3. Admin getAllImages Endpoint
- Option A: Separate admin endpoint `getAllImagesAdmin()` that returns all images (including non-visible)
- Option B: Enhance existing `getAllImages()` to check admin status - return all if admin, only visible if public
- Consider: Add `isAdmin` check in API route handler
- Easy win: Add visibility filter parameter to existing endpoint

#### 4. Image Filter Bar
- Add filter UI component at top of getAllImages page
- Filter by: tags, people, location, camera, lens, date range, etc.
- Reusable component for future use on other pages (collections, people page, etc.)
- Create `ImageFilterBar` component in `app/components/ImageFilter/`
- Backend: Add filter parameters to `getAllImages` endpoint
- Easy win: Start with simple tag/people filters, expand later

#### 5. Collection Top Bar with Parallax Cover Image
- Add header section to collection pages with:
  - Parallax cover image (reuse existing parallax logic)
  - Text box overlay with collection metadata: Title, Location, Description, Date, etc.
- Create `CollectionHeader` component
- Position above `ContentBlockWithFullScreen` in `CollectionPage`
- Easy win: Reuse `CollectionContentRenderer` parallax image logic for cover

#### 6. Blog Page Integration Strategy
- Analyze how blog pages differ from standard collections:
  - Text-heavy content blocks
  - Different layout requirements
  - Reading flow vs. gallery browsing
- Consider: Separate `BlogPage` component or enhanced `CollectionPage` with `displayMode: 'BLOG'`
- Research: How should blog navigation work? Table of contents? Previous/Next post?
- Easy win: Document differences first, then implement

#### 7. iOS/Android Image File Format Support
- Add support for HEIC/HEIF (iOS) and WebP (Android) image formats
- Backend: Ensure image processing pipeline handles these formats
- Frontend: Display these formats correctly in image components
- Consider: Conversion to standard formats for compatibility
- Easy win: Check Next.js Image component support for these formats

#### 8. Authentication / Login Logic
- Set up OAuth or Auth0 (free tier) for authentication
- Research free options: Auth0 free tier, Clerk free tier, NextAuth.js (self-hosted)
- Implement login/logout flow
- Protect admin routes (manage pages, API endpoints)
- Add user session management
- Easy win: Start with NextAuth.js for self-hosted solution (no 3rd party dependency)

#### 9. Update Manage Page - Collection Metadata Section
- **Width consistency**: Make metadata section same width as rest of page content
- **Reformat metadata layout**:
  - Reorder fields for better readability
  - Adjust field sizes (some smaller, some much smaller)
  - Improve visual hierarchy
- **Mobile-first design**:
  - Design for mobile first (default layout)
  - Ensure metadata looks good on mobile screens
  - Responsive layout that enhances on larger screens
  - Consider collapsible sections for mobile (default behavior)
- **Location**: `app/(admin)/collection/manage/[[...slug]]/ManageClient.tsx`
- Easy win: Start with width consistency, then work on field sizing and ordering

---

## Function Analysis: Improvements Needed

### Refactoring Principles & Guidelines

All refactoring work should follow these principles:

#### 1. Preserve Existing Logic
- **All refactors must keep logic the same** - Refactoring is about improving structure, not changing behavior
- If logic needs to change due to a bug fix or improvement, document it explicitly in the refactor notes
- Any logic changes that fix previous errors should be clearly mentioned in the refactor description

#### 2. Extract to Utility Files
- **Move logic outside React components whenever possible** - Extract to utility files, hooks, or pure functions
- **Check for existing utilities first** - Before creating new utility functions, search the codebase for similar functionality (e.g., `processContentBlocks` already existed in `contentLayout.ts`)
- Utility files should be organized by domain:
  - `app/utils/` - General utilities (object comparison, data transformation, content processing)
  - `app/(admin)/collection/manage/[[...slug]]/manageUtils.ts` - Manage page specific utilities
  - `app/components/ImageMetadata/imageMetadataUtils.ts` - Image metadata specific utilities
  - `app/lib/api/` - API utilities
- Pure functions are easier to test, reuse, and reason about
- **Prefer reusing existing utilities** over creating duplicates - maintains consistency and reduces maintenance burden

#### 3. Single Responsibility Principle
- **Each function should do ONE thing well** - If a function handles multiple concerns, split it
- Functions should be small and focused (aim for < 50 lines when possible)
- Complex functions should be broken into a "router" function that orchestrates smaller, focused handlers
- Example pattern: `handleImageClick` → determines action type → calls appropriate handler (`handleCoverImageSelection`, `handleCollectionNavigation`, etc.)

#### 4. Testing Strategy Requirements
- **Every refactored function must have a testing strategy** documented in its associated test file
- Testing strategy should be written in pseudo-code format for now, including:
  - **All passing test cases** - Happy path scenarios, edge cases, boundary conditions
  - **All failing test cases** - Error scenarios, invalid inputs, network failures, etc.
- Test files should be organized to match the utility file structure:
  - `app/utils/contentLayout.test.ts` for `contentLayout.ts`
  - `app/(admin)/collection/manage/[[...slug]]/manageUtils.test.ts` for `manageUtils.ts`
  - etc.

#### 5. Component Simplification Goal
- **Simplify React component files as much as possible** - Components should primarily:
  - Render UI
  - Handle user interactions (delegate to handlers)
  - Manage local UI state (loading, error states)
- Business logic should live in:
  - Utility functions (pure functions)
  - Custom hooks (stateful logic)
  - API layer (data fetching)
- **Make it easy and simple to see what logic is happening** - Clear function names, good organization, minimal nesting

#### 6. Refactoring Pattern Example

**Before (Complex Component Logic):**
```typescript
const handleImageClick = useCallback((imageId: number) => {
  if (isSelectingCoverImage) {
    // 20 lines of cover image logic
  } else if (isCollectionContent) {
    // 15 lines of navigation logic
  } else if (isMultiSelectMode) {
    // 10 lines of multi-select logic
  } else {
    // 25 lines of single edit logic
  }
}, [dependencies]);
```

**After (Extracted to Utilities):**
```typescript
// In manageUtils.ts - Pure functions, easy to test
export function handleCoverImageSelection(imageId: number, collection: CollectionModel, ...) { }
export function handleCollectionNavigation(imageId: number, collection: CollectionModel, router: Router) { }
export function handleMultiSelectToggle(imageId: number, selectedIds: number[], setSelectedIds: ...) { }
export function handleSingleImageEdit(imageId: number, collection: CollectionModel, openEditor: ...) { }

// In ManageClient.tsx - Simple router, easy to understand
const handleImageClick = useCallback((imageId: number) => {
  if (isSelectingCoverImage) {
    return handleCoverImageSelection(imageId, collection, ...);
  }
  
  const originalBlock = collection?.content?.find(block => block.id === imageId);
  if (originalBlock && isCollectionContent(originalBlock)) {
    return handleCollectionNavigation(imageId, originalBlock, router);
  }
  
  if (isMultiSelectMode) {
    return handleMultiSelectToggle(imageId, selectedImageIds, setSelectedImageIds);
  }
  
  return handleSingleImageEdit(imageId, collection, processedContent, openEditor, setSelectedImageIds);
}, [dependencies]);
```

**Test File (manageUtils.test.ts):**
```typescript
// Testing Strategy (Pseudo-code):
describe('handleCoverImageSelection', () => {
  // Passing test cases:
  // - Valid image ID exists in collection
  // - Image is an IMAGE content type
  // - Updates updateData with coverImageId
  // - Sets isSelectingCoverImage to false
  // - Shows flash animation on selected image
  
  // Failing test cases:
  // - Image ID doesn't exist in collection
  // - Image ID points to non-image content (TEXT, GIF, etc.)
  // - Collection is null/undefined
  // - Image ID is invalid (0, negative, NaN)
});
```

#### 7. Documentation Requirements
- Each refactored function should have:
  - Clear JSDoc comments explaining purpose
  - Parameter descriptions
  - Return type documentation
  - Usage examples if complex
- Refactor notes in todo.md should link to the test file where testing strategy is documented
- **Prefer docblocks over inline comments** - For complex functions like `handleMetadataSaveSuccess`, use a JSDoc docblock at the top listing all steps rather than inline comments throughout the function body

#### 8. Modal Component Pattern
- **Replace browser prompts/alerts with proper modals** - Use React modal components with proper form validation
- **Modal components should**:
  - Accept `scrollPosition` prop to position correctly
  - Handle form validation and error display
  - Provide loading states during async operations
  - Support backdrop click to close (optional)
  - Use consistent styling with existing modals (e.g., `ImageMetadataModal.module.scss` as reference)
- **Example**: `TextBlockCreateModal` replaced `prompt()` with a proper form modal

---

### 1. Functions That Could Be Simplified

#### `app/(admin)/collection/manage/[[...slug]]/ManageClient.tsx`
- No pending refactoring tasks

#### `app/components/ImageMetadata/imageMetadataUtils.ts`
- No pending refactoring tasks

#### `app/lib/api/collections.ts`
- No pending refactoring tasks

#### `app/utils/contentLayout.ts`
- No pending refactoring tasks

### 2. Functions That Could Be Refactored

#### `app/(admin)/collection/manage/[[...slug]]/ManageClient.tsx`
- No pending refactoring tasks

#### `app/components/ImageMetadata/ImageMetadataModal.tsx`
- No pending refactoring tasks

#### `app/lib/api/core.ts`
- No pending refactoring tasks

#### `app/utils/contentLayout.ts`
- No pending refactoring tasks

### 3. Functions With Potential Errors/Bugs

#### `app/(admin)/collection/manage/[[...slug]]/ManageClient.tsx`
- No pending bug fixes
- [ ] `handleImageClick` (line 388) - **Verified: Not a bug** - Logic is correct: `handleCollectionNavigation` uses `collection?.content` (original blocks), and `handleSingleImageEdit` checks both original and processed content as fallback. The implementation correctly handles both cases. However, could be clearer - consider documenting why both are checked.
- [ ] `handleMetadataSaveSuccess` (line 442) - **Silent failure in revalidation** - `revalidateCollectionCache` (called at line 452) fails silently with only `console.warn` in `manageUtils.ts` line 500-502. Console statement now wrapped with `isLocalEnvironment()` check. This is intentional (revalidation is not critical), but could be improved to log to error tracking service in production.

#### `app/components/ImageMetadata/imageMetadataUtils.ts`
- No pending bug fixes

#### `app/lib/api/content.ts`
- No pending bug fixes

#### `app/lib/api/collections.ts`
- [ ] `safeJson` (line 31) - **Code clarity issue** - Not actually a bug: `res.json()` is only called once per execution path (error path on line 36 OR success path on line 48, never both). However, the code structure could be clearer by caching the parsed JSON result to avoid confusion. Consider refactoring for better readability.

#### `app/utils/contentLayout.ts`
- No pending bug fixes

#### `app/lib/storage/collectionStorage.ts`
- No pending bug fixes

#### `app/components/ImageMetadata/ImageMetadataModal.tsx`
- No pending bug fixes

### 4. Functions That Could Be Combined

#### `app/lib/api/core.ts`
- [ ] `fetchPutJsonApi`, `fetchPatchJsonApi`, `fetchPostJsonApi` - **Similar pattern** - Could use a generic `fetchJsonApi(method, endpoint, body)` helper.

#### `app/components/ImageMetadata/imageMetadataUtils.ts`
- [ ] `getDisplayTags`, `getDisplayPeople` - **Wrappers around same function** - Could be combined into single `getDisplayItems` with type parameter.
- [ ] `getDisplayCamera`, `getDisplayLens` - **Identical logic** - Should be combined into single function.

#### `app/utils/contentTypeGuards.ts`
- [ ] `isContentImage`, `isParallaxImageContent`, `isTextContent`, `isGifContent`, `isCollectionContent` - **Could use factory** - All follow same pattern. Could use a factory function to reduce duplication.

### 5. Functions Too Complex for Unit Tests (Need Refactoring First)

#### `app/(admin)/collection/manage/[[...slug]]/ManageClient.tsx`
- [ ] `ManageClient` component - **922 lines** - Entire component is too large. Should be split into smaller components:
  - `CreateCollectionForm`
  - `UpdateCollectionForm`
  - `CollectionContentList`
  - `CoverImageSelector`
- [ ] `handleImageClick` - **Multiple responsibilities** - **Refactor approach**: Split into switch case pattern with focused handlers (see "Functions That Could Be Simplified" section above). After refactoring, test each handler individually.
- [ ] `handleMetadataSaveSuccess` - **Too many side effects** - Should be split into smaller, testable functions.

#### `app/components/ImageMetadata/ImageMetadataModal.tsx`
- [ ] `ImageMetadataModal` component - **~776 lines** - Too large. Should split into:
  - `ImagePreview` component
  - `MetadataForm` component
  - `BulkEditIndicator` component
- [ ] `handleSubmit` - **Complex async logic** - **Refactor approach**: Extract diff building to `buildImageUpdatesForBulkEdit` and `buildImageUpdateForSingleEdit` (see "Functions That Could Be Refactored" section). Extract API call to separate function. After refactoring, test each part independently.

#### `app/components/ImageMetadata/imageMetadataUtils.ts`
- [ ] `buildImageUpdateDiff` - **176 lines, handles 15+ field types** - Should be split into per-field-type functions.

#### `app/utils/contentLayout.ts`
- [ ] `processContentBlocks` - **58 lines, multiple transformations** - Should be split into: `filterVisibleBlocks`, `transformCollectionBlocks`, `updateImageOrderIndex`, `sortByOrderIndex`.

### 6. Functions That Need to Be Moved to Utils

#### From `ManageClient.tsx`:
- [ ] `loadCollectionData` logic - **Move to** `app/lib/utils/collectionDataLoader.ts` or custom hook
- [ ] `processedContent` transformation - **Move to** `app/utils/contentLayout.ts` as `processContentForManagePage`
- [ ] `currentSelectedCollections` logic - **Move to** `app/(admin)/collection/manage/[[...slug]]/manageUtils.ts`

#### From `ImageMetadataModal.tsx`:
- [ ] Response mapping logic (lines 183-197) - **Move to** `app/components/ImageMetadata/imageMetadataUtils.ts` as `mapUpdateResponseToFrontend`
- [ ] `hasChanges` comparison logic - **Move to** `app/utils/objectComparison.ts` as `deepEqual` or `hasObjectChanges`

#### From `collections.ts`:
- [ ] `safeJson` - **Move to** `app/lib/api/core.ts` as it's a shared utility
- [ ] Response parsing logic from `getAllCollections` - **Move to** `app/lib/api/core.ts` as `parseCollectionArrayResponse`

### 7. Functions That Might Not Be Needed

#### `app/(admin)/collection/manage/[[...slug]]/manageUtils.ts`
- [ ] `syncCollectionState` (lines 73-88) - **Unused?** - Check if this is actually called anywhere. If not, remove.
- [ ] `isImageContentBlock` (lines 94-97) - **Deprecated** - Marked as deprecated, uses `isContentImage`. Should be removed if not used.

#### `app/utils/contentLayout.ts`
- [ ] `processContentForDisplay` (lines 132-139) - **Thin wrapper** - Just calls `chunkContent` then `calculateContentSizes`. May not need separate function if only used in one place.

#### `app/components/ImageMetadata/imageMetadataUtils.ts`
- [ ] `getDisplayTags` and `getDisplayPeople` - **Thin wrappers** - If only used once, could inline the call to `getDisplayItemsFromUpdate`.

---

## Unit Test Files Needed

### API Layer Tests

#### `app/lib/api/collections.test.ts`
**Functions to test:**
- `getAllCollections` - Test pagination, response parsing, error handling
- `getCollectionBySlug` - Test slug encoding, access control, caching
- `getCollectionBySlugAdmin` - Test admin access, error handling
- `getCollectionsByType` - Test type filtering, pagination
- `validateClientGalleryAccess` - Test password validation, error cases
- `createCollection` - Test request building, response handling
- `updateCollection` - Test partial updates, error handling
- `deleteCollection` - Test deletion, error handling
- `getAllCollectionsAdmin` - Test admin endpoint
- `getCollectionUpdateMetadata` - Test metadata fetching
- `getMetadata` - Test general metadata fetching
- `safeJson` - Test JSON parsing, error handling, 404 handling

**Considerations:**
- Mock `fetch` globally
- Test error cases (network errors, 404, 500, malformed JSON)
- Test Next.js cache tags and revalidation
- Extract `safeJson` to shared utility for easier testing
- Consider using MSW (Mock Service Worker) for API mocking

#### `app/lib/api/content.test.ts`
**Functions to test:**
- `getAllTags` - Test response parsing, caching
- `getAllPeople` - Test response parsing, caching
- `getAllCameras` - Test response parsing, caching
- `getFilmMetadata` - Test response structure
- `createImages` - Test FormData building, file upload
- `createTextContent` - Test request building
- `updateImages` - Test bulk updates, response mapping
- `getAllImages` - Test admin endpoint
- `deleteImages` - Test deletion
- `createTag` - Test tag creation
- `createPerson` - Test person creation

**Considerations:**
- Remove debug `console.log` statements before testing
- Mock FormData for image upload tests
- Test bulk update scenarios (1 image, multiple images)
- Test error handling for each endpoint

#### `app/lib/api/core.test.ts`
**Functions to test:**
- `buildApiUrl` - Test URL building with/without params, encoding
- `getApiBaseUrl` (if exported) - Test environment-based URLs
- `fetchReadApi` - Test GET requests, error handling, 204 responses
- `fetchAdminGetApi` - Test admin GET requests
- `fetchAdminPostJsonApi` - Test POST with JSON
- `fetchAdminPutJsonApi` - Test PUT with JSON
- `fetchAdminPatchJsonApi` - Test PATCH with JSON
- `fetchAdminFormDataApi` - Test FormData uploads
- `fetchAdminDeleteApi` - Test DELETE requests
- `ApiError` class - Test error creation, status codes
- `handleApiResponseError` - Test error extraction
- `handleApiCatchError` - Test error conversion

**Considerations:**
- Refactor `fetchWriteBase` and `fetchAdminBase` to reduce duplication before testing
- Test all error paths (network errors, HTTP errors, JSON parse errors)
- Test environment switching (production vs localhost)
- Consider extracting shared fetch logic to reduce test duplication

### Utility Function Tests

#### `app/utils/contentLayout.test.ts`
**Functions to test:**
- `chunkContent` - Test chunking logic, standalone items, edge cases
- `shouldBeStandalone` - Test panorama detection, high-rated images, vertical images
- `calculateContentSizes` - Test size calculations, single item, multiple items, aspect ratios
- `processContentForDisplay` - Test full pipeline
- `convertCollectionContentToParallax` - Test conversion, dimension extraction
- `convertCollectionContentToImage` - Test conversion, metadata preservation
- `processContentBlocks` - Test filtering, transformation, sorting

**Considerations:**
- Split `processContentBlocks` into smaller functions first (see refactoring section)
- Test edge cases (empty arrays, missing dimensions, null values)
- Test aspect ratio calculations with various image dimensions
- Mock `getContentDimensions` if needed

#### `app/utils/contentTypeGuards.test.ts`
**Functions to test:**
- `isContentImage` - Test type checking, edge cases
- `isParallaxImageContent` - Test parallax detection
- `isTextContent` - Test text content detection
- `isGifContent` - Test GIF detection
- `isCollectionContent` - Test collection detection
- `hasImage` - Test image content detection
- `getContentDimensions` - Test dimension extraction, fallbacks
- `validateContentBlock` - Test validation logic

**Considerations:**
- Test with various content types
- Test edge cases (null, undefined, malformed objects)
- Test dimension fallback logic thoroughly
- Consider using test fixtures for content models

#### `app/(admin)/collection/manage/[[...slug]]/manageUtils.test.ts`
**Functions to test:**
- `buildUpdatePayload` - Test field comparison, change detection
- `syncCollectionState` - Test state synchronization (if still used)
- `getCollectionContentAsSelections` - Test collection extraction
- `findImageBlockById` - Test image finding, type checking
- `getDisplayedCoverImage` - Test cover image selection logic
- `validateCoverImageSelection` - Test validation
- `handleApiError` - Test error message extraction
- `buildCollectionsUpdate` - Test complex toggle logic

**Considerations:**
- Remove or update `syncCollectionState` if unused
- Test `buildCollectionsUpdate` with various scenarios (add, remove, toggle)
- Test error handling edge cases
- Mock type guards if needed

#### `app/components/ImageMetadata/imageMetadataUtils.test.ts`
**Functions to test:**
- `applyPartialUpdate` - Test partial updates, collections transformation
- `getFormValue` - Test fallback logic
- `getCommonValues` - Test intersection logic, various field types
- `getDisplayItemsFromUpdate` - Test prev/newValue pattern
- `getDisplayItemFromUpdate` - Test single-select pattern
- `buildImageUpdateDiff` - **After refactoring** - Test each field type separately
- `extractMultiSelectValues` - Test ID/name extraction
- `handleDropdownChange` - Test multi-select and single-select handling

**Considerations:**
- **Refactor `buildImageUpdateDiff` first** - Split into smaller functions (see refactoring section)
- Test prev/newValue/remove patterns thoroughly
- Test edge cases (empty arrays, null values, undefined fields)
- Consider extracting field-specific diff builders for easier testing

### Component Tests

#### `app/components/Content/CollectionContentRenderer.test.tsx`
**Component to test:**
- `CollectionContentRenderer` - Test unified content rendering (IMAGE, TEXT, GIF, COLLECTION), parallax effects, click handling, drag and drop

**Considerations:**
- Test with various content types (IMAGE, TEXT, GIF, COLLECTION)
- Test parallax vs non-parallax rendering
- Test default mobile rendering, then wide desktop rendering
- Test overlay positioning and badges
- Test drag and drop functionality
- Mock Next.js Image component
- Mock `useParallax` hook
- Test error states and placeholder rendering

#### `app/components/ImageMetadata/ImageMetadataModal.test.tsx`
**Component to test:**
- `ImageMetadataModal` - Test single edit, bulk edit, form submission, error handling

**Considerations:**
- **Refactor component first** - Split into smaller components (see refactoring section)
- Mock `updateImages` API call
- Test form state management
- Test hasChanges detection (after refactoring to use proper comparison)
- Test response mapping

#### `app/(admin)/collection/manage/[[...slug]]/ManageClient.test.tsx`
**Component to test:**
- `ManageClient` - Test create mode, update mode, form submission, image upload, metadata editing

**Considerations:**
- **Major refactoring needed first** - Component is 922 lines, split into smaller components
- Extract handlers to testable functions
- Mock all API calls
- Test state management
- Test error handling
- Test cover image selection
- Test multi-select mode

### Hook Tests

#### `app/hooks/useImageMetadataEditor.test.tsx`
**Hook to test:**
- `useImageMetadataEditor` - Test open/close, scroll position, body scroll prevention, Escape key

**Considerations:**
- Test cleanup on unmount
- Test Escape key handler
- Mock `window.scrollY`

#### `app/hooks/useFullScreenImage.test.tsx`
**Hook to test:**
- `useFullScreenImage` - Test fullscreen state, enter/exit, keyboard handlers

**Considerations:**
- Mock Fullscreen API
- Test keyboard navigation
- Test cleanup

#### `app/hooks/useParallax.test.tsx`
**Hook to test:**
- `useParallax` - Test parallax calculations, scroll handling

**Considerations:**
- Mock scroll events
- Test with various options
- Test cleanup

#### `app/hooks/useViewport.test.tsx`
**Hook to test:**
- `useViewport` - Test viewport dimensions, resize handling

**Considerations:**
- Mock window resize events
- Test default mobile detection, then wide desktop detection

### Integration Tests

#### `app/lib/api/integration.test.ts`
**Scenarios to test:**
- Collection CRUD flow (create, read, update, delete)
- Image upload and metadata update flow
- Content pagination
- Error recovery

**Considerations:**
- Use MSW for API mocking
- Test real-world user flows
- Test error scenarios

---

## Testing Infrastructure Improvements

### Before Writing Tests

1. **Remove debug code:**
   - Remove all `console.log` statements from production code
   - Remove debug comments
   - Use proper logging library if needed

2. **Refactor complex functions:**
   - Split large functions into smaller, testable units
   - Extract business logic from components
   - Reduce function complexity (aim for < 50 lines per function)

3. **Improve error handling:**
   - Standardize error types
   - Add proper error boundaries
   - Improve error messages

4. **Add test utilities:**
   - Create test fixtures for common data structures (e.g., `createImageContent`, `createCollectionContent`, `createCollectionModel`)
   - Test fixtures should accept `overrides` parameter for flexibility
   - Add helper functions for common test patterns
   - Set up MSW for API mocking
   - **Fixture pattern**: Use factory functions like `createImageContent(id, overrides?)` that return properly typed objects with sensible defaults

5. **Improve type safety:**
   - Ensure all functions have proper return types
   - Add runtime validation where needed
   - Use discriminated unions for better type narrowing

---

## Click-and-Drag Refactoring: Code Review Issues

This section documents all issues found in the click-and-drag refactoring work, including refactor opportunities, simplifications, bad code/logic, code duplication, incorrect implementations, and errors.

### 4. Simplification Opportunities

#### `app/(admin)/collection/manage/[[...slug]]/ManageClient.tsx`
- No pending simplifications

#### `app/utils/contentComponentHandlers.ts`
- No pending simplifications

### 5. Bad Code / Bad Logic

#### `app/(admin)/collection/manage/[[...slug]]/ManageClient.tsx`

- [ ] **`applyReorderLocally` - Pending changes merging logic (lines 579-598)** - **Potential bug** - The logic for merging pending changes creates a `Map` and then converts it back to an array. However, the merging logic might not correctly handle all edge cases. **Issue**: If a content item is moved multiple times in quick succession, the latest change should win, which the current implementation does correctly. However, the logic could be clearer. **Fix**: Add comments explaining the merge strategy, or extract to a well-documented function `mergeReorderChanges(existing: ReorderChange[], newChanges: ReorderChange[]): ReorderChange[]`.

- [ ] **`applyReorderLocally` - State update after reorder (lines 634-637)** - **Potential issue** - The function updates `currentState` with the updated collection, but it doesn't clear `pendingReorderChanges` until after `handleSaveOrder` succeeds. This means if the user makes multiple reorders before saving, the pending changes accumulate. **Question**: Is this the intended behavior? If so, it should be documented. If not, we might need to handle the case where pending changes conflict with new changes.

- [ ] **`handleDrop` - Early return conditions (line 724)** - **Good** - Correctly handles edge cases (no dragged item, same item, missing collection/state). No issues.

- [ ] **`handleDragOver` - Missing validation** - **Minor issue** - The function doesn't check if `collection.displayMode === 'ORDERED'` before allowing drag over. However, `handleDragStart` does check this, so it's probably fine. **Consideration**: Should we add the same check here for consistency?

#### `app/(admin)/collection/manage/[[...slug]]/manageUtils.ts`

- [ ] **`applyReorderChangesLocally` - Image block update (lines 947-964)** - **Potential issue** - The function updates both `collections` array entry AND top-level `orderIndex`. The comment says "Also update top-level orderIndex for consistency" but this might cause confusion if the top-level `orderIndex` is used elsewhere. **Question**: Is the top-level `orderIndex` actually used, or is it always read from the `collections` array entry? If it's not used, we should remove this line to avoid confusion.

- [ ] **`calculateForwardReorderChanges` and `calculateBackwardReorderChanges` - Index calculation** - **Logic verification needed** - The logic for calculating which blocks to shift looks correct, but should be tested with edge cases:
  - Dragging first item to last position
  - Dragging last item to first position
  - Dragging to adjacent position
  - Dragging with gaps in orderIndex values

- [ ] **`getContentOrderIndex` - Fallback to 0** - **Potential issue** - In `calculateForwardReorderChanges` and `calculateBackwardReorderChanges`, when `getContentOrderIndex` returns `undefined`, it falls back to `0` (line 737, 772). This might cause incorrect reordering if some blocks have `undefined` orderIndex. **Fix**: Should we filter out blocks with undefined orderIndex before calculating changes, or assign a default orderIndex? This needs to be verified against the actual data structure.

#### `app/utils/contentComponentHandlers.ts`

- [ ] **`createDragEndHandler` - setTimeout usage (lines 196-209)** - **Potential race condition** - Uses `setTimeout(() => { isDraggingRef.current = false; onDragEnd(); }, 0)` to allow drop event to fire first. This is a common pattern but could be fragile. **Consideration**: Is this necessary? The `createDropHandler` already sets `isDraggingRef.current = false` (line 186), so the setTimeout might be redundant. **Investigation needed**: Test if removing the setTimeout causes any issues.

- [ ] **`prepareCollectionContentRender` - Missing error handling** - **Minor issue** - The function doesn't handle the case where `convertCollectionContentToParallax` might fail or return invalid data. **Fix**: Add validation or error handling.

### 6. Code Duplication

#### `app/(admin)/collection/manage/[[...slug]]/ManageClient.tsx`

- [ ] **Debug logging pattern** - Lines 618-632, 703-710, and 745-760 all have similar debug logging patterns that extract block names and log reorder information. **Duplication**: Extract to a utility function:
  ```typescript
  function getContentBlockName(block: ImageContentModel | CollectionContentModel): string {
    if (isContentImage(block)) {
      return block.rawFileName || block.imageUrl?.split('/').pop() || `Image ${block.id}`;
    }
    return block.title || `Collection ${block.id}`;
  }
  
  function logReorderInfo(operation: string, draggedBlock: ..., targetBlock: ..., collection: ...) {
    if (!isLocalEnvironment()) return;
    console.log(`[${operation}]`, { dragged: ..., target: ... });
  }
  ```

- [ ] **Block finding and name extraction** - Lines 738-743 (in `handleDrop`) duplicate the logic for extracting block names that's also used in `handleDragStart` (lines 699-701). **Duplication**: Extract to utility function as shown above.

#### `app/utils/contentComponentHandlers.ts` and `app/components/Content/Component.tsx`

- [ ] **Drag handler creation** - The pattern of creating drag handlers is repeated in multiple places in `Component.tsx` (lines 218-232, 293-307, and in `renderCollectionContent`). However, they all use `createDragHandlers` from `contentComponentHandlers.ts`, which is good. **No duplication** - The handlers utility is properly extracted.

### 7. Code That Exists Elsewhere (Reuse Opportunities)

#### `app/(admin)/collection/manage/[[...slug]]/ManageClient.tsx`

- [ ] **Block name extraction** - The logic for extracting a display name from a content block (lines 611-616, 699-701, 738-743) could potentially be reused. **Check**: Is there a utility function elsewhere that does this? If not, create one in `contentComponentHandlers.ts` or `manageUtils.ts`.

- [ ] **Content block type checking** - The code uses `isContentImage()` and checks for collection content in multiple places. This is already using the utility functions correctly, so no issue here.

#### `app/utils/contentLayout.ts`

- [ ] **`convertCollectionContentToParallax`** - This function exists in `contentLayout.ts` (line 165) and is used in `contentComponentHandlers.ts` (line 357). **Good reuse** - No duplication.

### 8. Code That Isn't Correct / Needs to Be Redone

#### `app/(admin)/collection/manage/[[...slug]]/ManageClient.tsx`

- [ ] **`applyReorderLocally` - State update timing** - **Potential issue** - The function updates `currentState` immediately (lines 634-637), but the pending changes are stored separately. This means the UI shows the reordered state, but if the user discards changes, we need to revert. **Question**: Does `handleDiscardOrder` correctly revert to the original state? It calls `refreshCollectionData`, which should work, but we should verify that pending changes don't interfere with the revert.

- [ ] **`handleDiscardOrder` - Error handling** - **Needs improvement** - Uses `.then().catch()` instead of async/await, and error handling just sets an error message. Should show user feedback (toast notification) and handle the error more gracefully.

- [ ] **Missing validation in drag handlers** - **Minor issue** - `handleDragStart` checks `collection.displayMode !== 'ORDERED'` but `handleDragOver` and `handleDrop` don't. While `handleDragStart` prevents dragging from starting, it would be more defensive to check in all handlers.

#### `app/(admin)/collection/manage/[[...slug]]/manageUtils.ts`

- [ ] **`executeReorderOperation` - Missing cache update** - **Bug found!** - Line 845 calls `updateCollectionCache` but the function signature shows it should be called. However, looking at line 845, it seems the cache update might be missing. **Verification needed**: Check if `updateCollectionCache` is actually being called. Looking at the code, line 845 should have the call, but I need to verify the actual implementation.

  **Update after review**: Line 845 shows `updateCollectionCache(slug, fullResponse.collection, collectionStorage);` - this looks correct. However, the function is called but the result isn't checked. **No bug** - the cache update is there.

- [ ] **`applyReorderChangesLocally` - Type safety** - **Minor issue** - The function uses type assertions (`as ImageContentModel`, `as CollectionContentModel`) which is fine, but we could improve type safety by using type guards more consistently.

#### `app/components/Content/Component.tsx`

- [ ] **`renderCollectionContent` - Inline function** - **Not incorrect, but suboptimal** - The function is defined inside the component, causing it to be recreated on every render. This is a performance issue, not a correctness issue. **Fix**: Move outside component or wrap with `useCallback`.

- [ ] **Missing `dragOverImageId` usage** - **Potential bug** - The prop `dragOverImageId` is passed to the component (line 102, renamed to `_dragOverImageId`), but it's never used. The drag over visual feedback might be missing. **Investigation needed**: Check if drag-over styling is handled elsewhere or if this is intentional.

### 9. Type Safety Issues

#### `app/(admin)/collection/manage/[[...slug]]/ManageClient.tsx`

- [ ] **`pendingReorderChanges` type** - Uses `{ imageId: number; newOrderIndex: number }[]` but `imageId` can be a collection ID too. **Type safety issue**: Should be `{ contentId: number; newOrderIndex: number }[]` or create a type alias.

- [ ] **Type assertions in `applyReorderLocally`** - Lines 611-616 use type narrowing with `isContentImage()`, which is good. No issues.

#### `app/utils/contentComponentHandlers.ts`

- [ ] **`prepareCollectionContentRender` return type** - **Missing explicit return type** - The function returns an object but doesn't have an explicit return type annotation. **Fix**: Add return type for better type safety and documentation.

### 10. Performance Issues

#### `app/(admin)/collection/manage/[[...slug]]/ManageClient.tsx`

- [ ] **`applyReorderLocally` - Multiple state updates** - **Potential performance issue** - The function updates `pendingReorderChanges` and `currentState` separately (lines 598 and 634-637). This causes two re-renders. **Optimization**: Could use a single state update with a reducer or combine the updates, but this might not be worth it unless there are performance problems.

- [ ] **Debug logging in render path** - **Performance issue in development** - The extensive debug logging (lines 618-632, 703-710, 745-760) runs during drag operations, which could impact performance. **Fix**: Wrap all debug logging with `isLocalEnvironment()` checks or remove entirely.

#### `app/components/Content/Component.tsx`

- [ ] **`renderCollectionContent` - Recreated on every render** - **Performance issue** - The function is defined inside the component, so it's recreated on every render. **Fix**: Move outside component or wrap with `useCallback` if it needs access to props/state.

### 11. Missing Error Handling

#### `app/(admin)/collection/manage/[[...slug]]/ManageClient.tsx`

- [ ] **`applyReorderLocally` - No error handling** - **Missing** - The function doesn't handle errors if `getReorderableBlocks`, `findContentById`, or `calculateReorderChanges` fail. **Fix**: Add try-catch or validate inputs.

- [ ] **`handleSaveOrder` - Error handling** - **Good** - Has try-catch and error handling. No issues.

- [ ] **`handleDiscardOrder` - Error handling** - **Needs improvement** - Uses `.catch()` but only sets error message. Should provide better user feedback.

#### `app/utils/contentComponentHandlers.ts`

- [ ] **`prepareCollectionContentRender` - No error handling** - **Missing** - Doesn't handle errors from `convertCollectionContentToParallax` or other operations. **Fix**: Add error handling or validation.

### 12. Documentation Issues

#### `app/(admin)/collection/manage/[[...slug]]/ManageClient.tsx`

- [ ] **`applyReorderLocally` - Missing JSDoc** - **Missing** - The function is complex but doesn't have comprehensive JSDoc documentation explaining the merge strategy for pending changes. **Fix**: Add detailed JSDoc explaining:
  - What the function does
  - How it merges pending changes
  - When it should be called
  - What side effects it has

- [ ] **`pendingReorderChanges` state - Missing documentation** - **Missing** - The state variable and its structure should be documented. Why is it called `imageId` when it can be a collection ID?

#### `app/(admin)/collection/manage/[[...slug]]/manageUtils.ts`

- [ ] **`applyReorderChangesLocally` - JSDoc exists but could be clearer** - **Good** - Has JSDoc, but could explain the dual update (collections array + top-level orderIndex) more clearly.

## Code Quality & Cleanup Tasks

### Critical Issues (Must Fix)

1. **Console statements not wrapped** - `app/(admin)/collection/manage/[[...slug]]/ManageClient.tsx`:
   - Lines 540, 572, 588, 639, 652: `console.log` and `console.error` not wrapped with `isLocalEnvironment()`
   - These should only log in development/local environment

2. **Linter errors** - Check for unused imports across codebase

3. **Type safety** - Ensure all functions have explicit return types where missing

4. **Error handling** - Add error handling to functions that currently lack it

### Code Cleanup (High Priority)

1. **Remove unnecessary inline comments** - Scan for comments that don't add value:
   - Remove obvious comments like `// Render image content` when function name is clear
   - Keep docblocks but make them concise
   - Remove commented-out code
   - Keep only comments that explain "why", not "what"

2. **Test coverage gaps** - Missing test files for:
   - `app/utils/debounce.ts` - `useDebounce` hook
   - `app/utils/environment.ts` - `isLocalEnvironment`, `isProduction`
   - `app/utils/admin.ts` - Admin utility functions
   - `app/utils/parallaxImageUtils.ts` - Parallax utility functions
   - `app/components/Content/ImageOverlays.tsx` - New component
   - `app/components/Content/BadgeOverlay.tsx` - Badge component
   - `app/components/Content/Component.tsx` - Main content component
   - `app/components/Content/ContentBlockWithFullScreen.tsx` - Fullscreen component
   - `app/components/ContentCollection/CollectionPage.tsx` - Collection page
   - `app/hooks/useParallax.ts` - Parallax hook
   - `app/hooks/useFullScreenImage.tsx` - Fullscreen hook

3. **Component simplification** - Large components that could be split:
   - `ManageClient.tsx` (922 lines) - Split into smaller components
   - `ImageMetadataModal.tsx` (~776 lines) - Split into sub-components

4. **Unused/deprecated code** - Check and remove:
   - `app/(admin)/collection/manage/[[...slug]]/manageUtils.ts` - `syncCollectionState` (if unused)
   - `app/(admin)/collection/manage/[[...slug]]/manageUtils.ts` - `isImageContentBlock` (deprecated)
   - `app/utils/parallaxImageUtils.ts` - `buildParallaxImageFromContent` (not imported anywhere)

### Refactoring Opportunities

1. **Code duplication** - Extract common patterns:
   - Debug logging pattern in `ManageClient.tsx` (lines 540, 572, 588, 639)
   - Block name extraction logic (used in multiple places)

2. **Function complexity** - Functions that need splitting:
   - `applyReorderLocally` in `ManageClient.tsx` - Too many responsibilities
   - Consider extracting merge logic for pending changes

3. **Missing explicit return types** - Add return types to:
   - `prepareCollectionContentRender` in `contentComponentHandlers.ts`

### Summary of Critical Issues (Must Fix)

1. **Linter errors** - Remove unused imports (`findImageById`, `getImageBlocksForReorder`, `getImageOrderIndex`)
2. **Console statements** - Wrap all `console.log` statements with `isLocalEnvironment()` checks or remove them
3. **Type safety** - Rename `imageId` to `contentId` in `pendingReorderChanges` type
4. **Error handling** - Add error handling to `applyReorderLocally` and `handleDiscardOrder`
5. **Performance** - Move `renderCollectionContent` outside component or wrap with `useCallback`

### Summary of Important Issues (Should Fix)

1. **Code duplication** - Extract debug logging and block name extraction to utility functions
2. **Function complexity** - Split `applyReorderLocally` into smaller functions
3. **Parameter count** - Reduce `prepareCollectionContentRender` parameters using a config object
4. **Documentation** - Add comprehensive JSDoc to complex functions
5. **State management** - Consider custom hooks for drag-and-drop and selection state

### Summary of Nice-to-Have Improvements

1. **Code organization** - Extract `renderCollectionContent` to separate file
2. **Type improvements** - Add explicit return types where missing
3. **Validation** - Add displayMode checks to all drag handlers for consistency
4. **User feedback** - Add toast notifications for save/discard operations

---
