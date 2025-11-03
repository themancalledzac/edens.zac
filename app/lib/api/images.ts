/**
 * Images API (Write Layer)
 *
 * Purpose
 * - Provides functions for updating image metadata and collection relationships
 * - Uses the write API endpoints for mutating operations
 * - Supports partial updates - only send fields that need to be changed
 *
 * When to use
 * - Use for updating image properties, metadata, or collection associations
 * - Use for managing image visibility and ordering within collections
 *
 * Update Strategy
 * - Follows the same pattern as updateCollection
 * - Only fields included in the update DTO will be modified
 * - Null values indicate explicit clearing of a field
 * - Undefined/omitted fields remain unchanged
 */

import { type ImageContentModel } from '@/app/types/Content';
import type {
  ContentCameraModel,
  ContentLensModel,
  ContentPersonModel,
  ContentTagModel,
  FilmTypeModel,
} from '@/app/types/ImageMetadata';

// ============================================================================
// Response Types
// ============================================================================

/**
 * Response from updating image(s)
 * Returns the fully updated images plus any newly created metadata entities
 */
export interface UpdateImagesResponse {
  /**
   * The fully updated image blocks with all relationships resolved
   * - Includes server-side transformations (timestamps, computed fields)
   * - Relationships are populated (full camera object, not just ID)
   * - Same shape as GET endpoints for consistency
   */
  updatedImages: ImageContentModel[];

  /**
   * NEW metadata entities created during this update
   * - Only includes entities that were created (had id: 0 in request)
   * - Client uses these to update dropdown options without full refetch
   * - Fields are null if no new entities of that type were created
   */
  newMetadata: {
    cameras: ContentCameraModel[] | null;
    lenses: ContentLensModel[] | null;
    tags: ContentTagModel[] | null;
    people: ContentPersonModel[] | null;
    filmTypes: FilmTypeModel[] | null;
  };

  /**
   * Validation or processing errors (if any)
   * - Empty array if all updates succeeded
   */
  errors: string[];
}

