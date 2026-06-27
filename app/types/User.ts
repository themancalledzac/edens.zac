/**
 * User API types — mirrors the backend invite/onboarding contract.
 */

/** Request body for `POST /api/admin/users`. */
export interface UserCreateRequest {
  email: string;
  displayName?: string;
}

/** Response body for `POST /api/admin/users` (HTTP 201) and `POST /api/admin/users/{id}/invite`. */
export interface CreateUserResponse {
  userId: number;
  inviteUrl: string;
}

/** Account lifecycle status — mirrors the backend `UserStatus` enum. `PERSON` = tag-only identity. */
export type UserStatus = 'INVITED' | 'ACTIVE' | 'DISABLED' | 'PERSON';

/** Row in the admin user list (`GET /api/admin/users`). Excludes any secret fields. */
export interface AdminUserSummary {
  id: number;
  /** `null` for tag-only PERSON rows (no account). */
  email: string | null;
  displayName: string | null;
  status: UserStatus;
  /** Admin-authored profile blurb shown on the user's page; `null` when unset. */
  description: string | null;
}

/** Preview of a pending identity merge (`GET /api/admin/users/{sourceId}/merge-preview`). */
export interface MergePreview {
  sourceId: number;
  sourceName: string | null;
  targetId: number;
  targetName: string | null;
  imageTagCount: number;
  collectionCount: number;
  duplicatesCollapsed: number;
}

/** Result of a completed merge (`POST /api/admin/users/{targetId}/merge`). */
export interface MergeResult {
  movedImageTags: number;
  movedCollections: number;
  duplicatesCollapsed: number;
}

/**
 * Request body for `PATCH /api/admin/users/{id}` — the admin-editable fields. Email is immutable
 * (it is the login identity and invite target). `displayName` and `description` may be `null` to
 * clear them; `status` is required. `description` is the profile blurb shown on the user's page
 * (max 500 chars).
 */
export interface UserUpdateRequest {
  displayName?: string | null;
  status: UserStatus;
  description?: string | null;
}

/** Response body for `GET /api/auth/invite/{token}` (HTTP 200). */
export interface InvitePreview {
  email: string;
  displayName: string | null;
}

/** Request body for `POST /api/auth/invite/{token}/accept`. */
export interface AcceptInviteRequest {
  displayName: string;
  password: string;
}
