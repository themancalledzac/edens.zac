/**
 * Base update pattern for single-select entity (one-to-one relationship)
 * Used for Camera, Lens, and FilmType updates
 * - prev: ID of existing entity to use
 * - newValue: Data for new entity to create
 * - remove: true to remove entity association
 */
export interface SingleEntityUpdate<T = string> {
  prev?: number;
  newValue?: T;
  remove?: boolean;
}
