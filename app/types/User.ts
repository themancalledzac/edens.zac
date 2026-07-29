/**
 * User API types — mirrors the backend invite/onboarding contract.
 */

/** Request body for `POST /api/admin/users`. */
export interface UserCreateRequest {
  email: string;
  displayName?: string;
}

/**
 * Request body for `POST /api/admin/users/{id}/upgrade` — promotes a tag-only `PERSON` identity in
 * place into an `INVITED` account. `email` is required (a PERSON has `email: null`, and the invite
 * needs a login address) and must already be normalized to trimmed lowercase, matching what the
 * server persists; the PERSON's existing display name is kept, so it is not sent.
 */
export interface UserUpgradeRequest {
  email: string;
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
 * Request body for `PATCH /api/admin/users/{id}` — the admin-editable fields. `email` is optional:
 * omitted or empty leaves the login email unchanged (whitespace-only gets a `400` from the
 * server); when non-empty the server lowercases it and responds `409 Conflict` if another user
 * already owns it. `displayName` and `description` may be `null` to clear them; `status` is
 * required. `description` is the profile blurb shown on the user's page (max 500 chars).
 */
export interface UserUpdateRequest {
  email?: string;
  displayName?: string | null;
  status: UserStatus;
  description?: string | null;
}

/** Response body for `GET /api/auth/invite/{token}` (HTTP 200). */
export interface InvitePreview {
  email: string;
  displayName: string | null;
}

/**
 * Outcome of an invite-token preview.
 *
 * The backend distinguishes a token that never existed or has expired (404) from one that has
 * already been redeemed (410), and the two deserve different destinations: an expired or mistyped
 * link is a genuine dead end, while a redeemed link means the account already exists and its owner
 * belongs on the site rather than staring at a 404. Collapsing both to `null` would throw that
 * distinction away, so callers get the reason.
 */
export type InvitePreviewResult =
  | { status: 'ok'; preview: InvitePreview }
  | { status: 'used' }
  | { status: 'invalid' };

/** Request body for `POST /api/auth/invite/{token}/accept`. */
export interface AcceptInviteRequest {
  displayName: string;
  password: string;
}
