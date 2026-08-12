/**
 * Auth API types — mirror the backend Auth contract exactly.
 * Source of truth: edens.zac.backend MeResponse / GalleryMembership.
 */

/**
 * Per-collection membership role. GENERAL = view-only; CLIENT = download + tag + star;
 * COLLABORATOR = client powers + curation edits.
 */
export type CollectionRole = 'GENERAL' | 'CLIENT' | 'COLLABORATOR';

export interface GalleryMembership {
  collectionId: number;
  role: CollectionRole;
}

export interface MeResponse {
  email: string;
  /**
   * `isAdmin` is a row-level attribute of the account (a root capability),
   * independent of session/login identity. Backend `is_admin` → this field
   * via `/api/auth/me`.
   */
  isAdmin: boolean;
  mfaSatisfied: boolean;
  galleries: GalleryMembership[];
}
