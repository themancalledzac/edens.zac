# Handoff: Location Page Redesign & Location Inheritance

**Date**: 2026-03-28
**Status**: Frontend implementation complete, type-check + lint clean
**Branch**: `0115-dropdown-menu-scroll-fix` (changes unstaged)

---

## What Was Done (Frontend)

Redesigned the location page layout and added a location inheritance feature:

### UI Changes
1. **Cover image** — Changed from full-width 5:1 banner to a small top-left thumbnail (140px mobile / 240px desktop, 4:3 ratio) with title/count text beside it
2. **Collection cards** — New `LocationCollections` component renders small parallax cards (140px/200px, 16:9) that **link directly** to the collection page (`/{slug}`). Previously these were filter toggles inside the filter bar.
3. **Filter chip corners** — Changed from pill-shaped (`border-radius: 100px`) to almost square (`3px`)
4. **Film filter** — Always visible as a tri-state (Film / Digital / Off), no longer gated behind `hasFilm && hasDigital`

### Location Inheritance (Frontend-Side, Temporary)
When a collection is saved with a new location in the manage page, the frontend now bulk-updates all images in that collection that have no location, setting them to the same location via `PATCH /api/admin/content/images`.

**This is a temporary frontend workaround.** The ideal implementation is backend-native (see below).

### Bug Fix: `getCollectionsByLocation` Response Parsing
The backend's `GET /api/read/collections/location/{slug}` returns a **paginated wrapper** (e.g. `{ content: [...] }`), but the frontend was treating the raw response as `CollectionModel[]`. Added `parseCollectionArrayResponse()` to handle the wrapper format, matching how other collection endpoints work.

---

## Backend Work Requested

### 1. Location Inheritance on Collection Update (HIGH priority)

**Goal**: When a collection's location is set (or changed), automatically propagate that location to all images in the collection that have **no location set**.

**Current frontend approach** (to be replaced):
- After `PUT /api/admin/collections/{id}` returns, the frontend checks for locationless images and fires `PATCH /api/admin/content/images` with location updates
- Problems: race conditions possible, relies on client having full content loaded, extra round-trip

**Recommended backend approach**:
In the collection update handler (`PUT /api/admin/collections/{id}`), when `location` is being set (not removed):

```java
// Pseudocode for CollectionService.updateCollection()
if (updateRequest.getLocation() != null && !updateRequest.getLocation().isRemove()) {
    Location resolvedLocation = resolveLocation(updateRequest.getLocation());

    // Find all images in this collection with no location
    List<ContentImage> locationlessImages = contentImageRepository
        .findByCollectionIdAndLocationIsNull(collection.getId());

    // Bulk-set their location
    for (ContentImage image : locationlessImages) {
        image.setLocation(resolvedLocation);
    }
    contentImageRepository.saveAll(locationlessImages);
}
```

**Key details**:
- Only apply to images where `location IS NULL` — never overwrite an existing location
- Only apply when location is being **set** (not removed)
- The `LocationUpdate` DTO has three modes: `{ prev: id }` (existing), `{ newValue: "name" }` (create new), `{ remove: true }` (clear). Inheritance should trigger on the first two.
- The response from `PUT /api/admin/collections/{id}` should include the updated images so the frontend sees the change without an extra fetch

**Once backend implements this**: Remove the frontend fire-and-forget logic in `ManageClient.tsx` (lines 354-382, the `// Location inheritance:` block).

### 2. `GET /collections/location/{slug}` Response Format (LOW priority)

This endpoint returns a paginated wrapper:
```json
{
  "content": [ { "id": 1, "title": "...", ... }, ... ],
  "totalElements": 5,
  "totalPages": 1,
  ...
}
```

The frontend now handles this correctly via `parseCollectionArrayResponse()`, so no immediate action needed. But for consistency:

- **Option A**: Return a plain array `[...]` like other non-paginated collection endpoints
- **Option B**: Keep the paginated format (useful if locations ever have many collections), and document it

No frontend changes needed either way — the parser handles both formats.

---

## Files Changed (Frontend)

| Layer | Files | Change |
|-------|-------|--------|
| **Components** | `LocationPage.tsx` | Cover image → small top-left thumbnail with flex layout |
| **Components** | `LocationPage.module.scss` | Rewrote header styles for thumbnail + text layout |
| **Components** | `LocationCollections.tsx` (new) | Parallax collection link cards |
| **Components** | `LocationCollections.module.scss` (new) | Wrapping flex row of small cards |
| **Components** | `LocationPageClient.tsx` | Added `LocationCollections`, removed collection filtering |
| **Components** | `LocationFilterBar.tsx` | Removed `collections` prop/row, always show Film filter |
| **Components** | `LocationFilterBar.module.scss` | `border-radius: 3px`, removed collection card styles |
| **Admin** | `ManageClient.tsx` | Added location inheritance logic (temporary, to be replaced by backend) |
| **API** | `collections.ts` | `getCollectionsByLocation` uses `parseCollectionArrayResponse()` |

---

## Backend Issue: Database Connectivity (BLOCKING for local testing)

When navigating to a location page, the backend throws:

```
CannotCreateTransactionException: Could not open JDBC Connection for transaction
...
PSQLException: Connection to host.docker.internal:5432 refused.
HikariPool-1 - Connection is not available, request timed out after 30004ms
  (total=0, active=0, idle=0, waiting=2)
```

**Root cause**: The backend Docker container is configured to connect to PostgreSQL via `host.docker.internal:5432`, but PostgreSQL is either not running or not accepting connections on that port.

**Impact**: The location page (and likely all pages) cannot load any data. The call chain is:
- Frontend server component calls `getAllLocations()` → `GET /api/read/content/locations`
- Backend `ContentControllerProd.getLocationsWithCounts()` → `MetadataService.getLocationsWithCounts()`
- HikariCP cannot open a JDBC connection → 500 error

**To fix**: Ensure PostgreSQL is running and accessible at the host/port the backend Docker container expects. Common causes:
1. PostgreSQL service not started (`brew services start postgresql@16` or equivalent)
2. PostgreSQL not listening on TCP (check `listen_addresses` in `postgresql.conf`)
3. Docker networking issue — `host.docker.internal` may not resolve correctly depending on Docker Desktop version

---

## Testing Notes

- Type-check: clean (`tsc --noEmit`)
- ESLint: clean (all changed files)
- Location page requires live backend + database to render (server component data fetching) — currently blocked by DB connectivity issue above
- Location inheritance can be tested by: creating a collection with images that have no location, then setting a location on the collection and verifying all images inherit it
