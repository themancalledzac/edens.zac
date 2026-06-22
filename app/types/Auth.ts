/**
 * Auth API types — mirror the backend Phase F contract exactly.
 *
 * Source of truth: edens.zac.backend Auth Foundation build contract
 * (`MeResponse`, `GalleryAccessSummary`, `Role`). The `galleries` array is
 * always empty in Phase F (admin is all-access; client scope is Phase C) but
 * ships now so the frontend contract is stable.
 */

export type Role = 'ADMIN' | 'CLIENT';

export interface GalleryAccessSummary {
  collectionId: number;
  canDownload: boolean;
  canTag: boolean;
}

export interface MeResponse {
  email: string;
  role: Role;
  mfaSatisfied: boolean;
  galleries: GalleryAccessSummary[];
}
