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
- [x] `handleImageClick` (lines 412-456) - **Too complex** - Handles 4 different modes (cover selection, collection navigation, multi-select, single edit). **Refactor approach**: Use switch case pattern to determine action type, then delegate to focused handlers:
  - `handleCoverImageSelection(imageId)` - Cover image selection logic
  - `handleCollectionNavigation(imageId)` - Navigate to collection manage page
  - `handleMultiSelectToggle(imageId)` - Multi-select toggle (already exists)
  - `handleSingleImageEdit(imageId)` - Open metadata editor for single image
  - Main `handleImageClick` becomes a simple router: determines mode → calls appropriate handler
- [x] `handleMetadataSaveSuccess` (lines 459-511) - **Too complex** - Does multiple things: re-fetch, update state, update cache, revalidate, merge metadata. **Refactor approach**: Split into focused functions:
  - `refreshCollectionData(slug)` - Re-fetch collection with metadata
  - `updateCollectionState(response)` - Update currentState with response
  - `updateCollectionCache(slug, collection)` - Update cache storage
  - `revalidateCollectionCache(slug)` - Revalidate Next.js cache
  - `mergeNewMetadata(response, currentState)` - Merge new metadata entities
  - Main `handleMetadataSaveSuccess` orchestrates these in sequence
- [x] `processedContent` useMemo (lines 135-161) - **COMPLETED** - Now uses `processContentBlocks` from `contentLayout.ts` to match collection page behavior. Collections are converted to ParallaxImageContentModel, keeping consistency across pages. **Learning**: Check for existing utilities before creating new ones - `processContentBlocks` already existed and was the correct solution. Initially created `processContentForManagePage` but removed it after realizing the existing utility was better.
- [x] `handleCreateNewTextBlock` (lines 223-257) - **COMPLETED** - Replaced `prompt()` with `TextBlockCreateModal` component. Modal includes form validation, format selector (plain/markdown/html), alignment selector (left/center/right), and proper error handling.

#### `app/components/ImageMetadata/imageMetadataUtils.ts`
- [x] `buildImageUpdateDiff` (lines 343-519) - **COMPLETED** - Refactored into focused field-specific builders:
  - `buildSimpleFieldDiff(field, updateValue, currentValue)` - For string/number/boolean fields
  - `buildCameraDiff(update, current)` - Camera prev/newValue/remove pattern
  - `buildLensDiff(update, current)` - Lens prev/newValue/remove pattern
  - `buildFilmTypeDiff(update, current)` - FilmType prev/newValue/remove pattern
  - `buildTagsDiff(update, current)` - Tags prev/newValue/remove pattern
  - `buildPeopleDiff(update, current)` - People prev/newValue/remove pattern
  - `buildCollectionsDiff(update, current)` - Collections prev/newValue/remove pattern
  - Main `buildImageUpdateDiff` orchestrates by calling appropriate builder per field
  - Comprehensive tests added in `tests/components/ImageMetadata/imageMetadataUtils.test.ts`
- [x] `getCommonValues` (lines 113-164) - **COMPLETED** - Extracted comparison logic to helper `areAllEqual<T>(items: T[], getValue: (item: T) => unknown)` to reduce duplication. All field comparisons now use this helper function, making the code more maintainable.
- [x] `handleDropdownChange` (lines 588-620) - **COMPLETED** - Refactored using strategy pattern with field-specific handlers:
  - `handleMultiSelectChange(field, value, updateDTO)` - For tags/people (prev/newValue pattern)
  - `handleSingleSelectChange(field, value, updateDTO)` - For camera/lens/collections (prev/newValue/remove pattern)
  - Main `handleDropdownChange` determines field type → calls appropriate handler

#### `app/lib/api/collections.ts`
- [x] `getAllCollections` (lines 60-87) - **COMPLETED** - Extracted response parsing to helper `parseCollectionArrayResponse(data: unknown): CollectionModel[]` that handles all fallback logic in one place. The function now handles direct array responses, wrapped object responses (content/collections/items), and invalid formats, making it easier to test and maintain.

#### `app/utils/contentLayout.ts`
- [x] `processContentBlocks` (lines 240-298) - **COMPLETED** - Split into focused pipeline functions:
  - `filterVisibleBlocks(content, filterVisible, collectionId)` - Filter visibility logic
  - `transformCollectionBlocks(content)` - Convert CollectionContentModel to ParallaxImageContentModel
  - `updateImageOrderIndex(content, collectionId)` - Update orderIndex from collection-specific entry
  - `ensureParallaxDimensions(content)` - Ensure PARALLAX blocks have proper dimensions
  - `sortContentByOrderIndex(content)` - Sort by orderIndex
  - Main `processContentBlocks` orchestrates: filter → transform → update → ensure → sort
  - Each function has a single responsibility, making the code easier to test and maintain

### 2. Functions That Could Be Refactored

#### `app/(admin)/collection/manage/[[...slug]]/ManageClient.tsx`
- [x] `loadCollectionData` (inside useEffect, lines 189-212) - **COMPLETED** - Extracted to custom hook `useCollectionData(slug, currentSlug, onLoadSuccess)` that handles loading, error states, and data fetching. Hook uses callback pattern to notify parent of successful loads. Tests added in `tests/hooks/useCollectionData.test.tsx`. Fixed bug where loading state wasn't set to false when skipping fetch.
- [x] `handleImageUpload` (lines 324-360) - **COMPLETED** - Extracted common refresh pattern to `refreshCollectionAfterOperation` utility in `manageUtils.ts`. Both `handleImageUpload` and `handleTextBlockSubmit` now use this utility which handles: operation → re-fetch → update cache. Tests added in `manageUtils.test.ts`.
- [x] `currentSelectedCollections` useMemo (lines 527-543) - **COMPLETED** - Extracted to pure function `getCurrentSelectedCollections(collectionContent, updateDataCollections)` in `manageUtils.ts`. Function combines original collections (minus removals) with newly added collections. Tests added in `manageUtils.test.ts`.

#### `app/components/ImageMetadata/ImageMetadataModal.tsx`
- [x] `handleSubmit` (lines 151-177) - **COMPLETED** - Extracted diff building logic to focused functions in `imageMetadataUtils.ts`: `buildImageUpdatesForBulkEdit` for bulk edits, `buildImageUpdateForSingleEdit` for single edits, and `mapUpdateResponseToFrontend` for response mapping. Main `handleSubmit` now simply determines edit mode → calls appropriate builder → calls API → maps response. Tests added in `imageMetadataUtils.test.ts`.
- [x] `hasChanges` useMemo (lines 119-133) - **COMPLETED** - Extracted to `hasObjectChanges` utility in `app/utils/objectComparison.ts` using proper deep equality check. Replaced inefficient JSON.stringify comparison with field-by-field deep comparison that handles nested objects, arrays, null/undefined correctly. Also created `deepEqual` function for general deep equality checks. Tests added in `tests/utils/objectComparison.test.ts`.

#### `app/lib/api/core.ts`
- [x] `fetchWriteBase` and `fetchAdminBase` - **COMPLETED** - Combined into single `fetchBase(endpointType: 'write' | 'admin', endpoint, options)` function. Eliminates duplication - both functions were identical except for endpoint type. All callers updated to use the unified function.
- [x] `handleApiResponseError` and `handleApiCatchError` - **COMPLETED** - Combined into unified `handleApiError(error: unknown, response?: Response)` function. Handles both Response errors (extracts message from response) and catch block errors (converts to ApiError). All callers updated to use the unified function.

#### `app/utils/contentLayout.ts`
- [x] `convertCollectionContentToParallax` and `convertCollectionContentToImage` - **COMPLETED** - Extracted common dimension extraction to helper `extractCollectionDimensions(coverImage)` that returns `{ imageWidth, imageHeight }`. Both conversion functions now use this helper, eliminating duplication.

### 3. Functions With Potential Errors/Bugs

#### `app/(admin)/collection/manage/[[...slug]]/ManageClient.tsx`
- [ ] `handleCreateNewTextBlock` (line 226) - **Uses `prompt()`** - Blocking UI, poor UX. Also no validation of input.
- [ ] `handleImageClick` (line 422) - **Potential bug** - Checks `isCollectionContent` on original block but uses `processedContent` for image lookup. Could cause mismatch.
- [ ] `handleMetadataSaveSuccess` (line 477) - **Silent failure** - Revalidation wrapped in try-catch with only console.warn. Should handle errors properly.

#### `app/components/ImageMetadata/imageMetadataUtils.ts`
- [ ] `buildImageUpdateDiff` (line 408) - **Incomplete** - FilmType diff building is incomplete (has TODO comment).
- [ ] `applyPartialUpdate` (line 51) - **Console.log in production code** - Should be removed or use proper logging.

#### `app/lib/api/content.ts`
- [ ] `updateImages` (lines 98-103, 116-117) - **Debug console.logs** - Should be removed or use proper logging.

#### `app/lib/api/collections.ts`
- [ ] `safeJson` (line 48) - **Potential race condition** - Calls `res.json()` twice (line 36 and 48). Should cache the result.

#### `app/utils/contentLayout.ts`
- [ ] `convertCollectionContentToImage` (line 220) - **Potential undefined** - Uses `col.title || col.slug || ''` but if both are undefined, could cause issues.

### 4. Functions That Could Be Combined

#### `app/lib/api/core.ts`
- [ ] `fetchWriteBase` and `fetchAdminBase` - **Nearly identical** - Should be combined into a single `fetchBase` function with endpoint type parameter.
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

#### `app/components/Content/ContentWrapper.test.tsx`
**Component to test:**
- `ContentWrapper` - Test rendering, ref forwarding, click handling, overlay detection

**Considerations:**
- Test with various content types
- Test mobile vs desktop rendering
- Test overlay positioning
- Mock `useViewport` if needed

#### `app/components/Content/ImageBlockRenderer.test.tsx`
**Component to test:**
- `ContentImageRenderer` - Test image rendering, dimensions, click handling

**Considerations:**
- Mock Next.js Image component
- Test with/without overlays
- Test error states

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
- Test mobile vs desktop detection

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
