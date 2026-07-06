/**
 * Auth API types — mirror the backend Auth contract exactly.
 * Source of truth: edens.zac.backend MeResponse / GalleryMembership.
 */

/** Per-collection membership role. GENERAL = view-only; CLIENT = download + tag + star. */
export type CollectionRole = 'GENERAL' | 'CLIENT';

export interface GalleryMembership {
  collectionId: number;
  role: CollectionRole;
}

export interface MeResponse {
  email: string;
  /**
   * Admin flag on the user row — deliberately SEPARATE from "being logged in".
   * An admin impersonating another user ("log in as") still needs admin
   * capabilities, so admin-ness is a row-level boolean, not inferred from the
   * session identity. Backend `is_admin` → this field via `/api/auth/me`.
   */
  isAdmin: boolean;
  mfaSatisfied: boolean;
  galleries: GalleryMembership[];
}
