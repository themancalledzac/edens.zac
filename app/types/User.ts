/**
 * User API types — mirrors the backend Phase F invite/onboarding contract.
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

/** Account lifecycle status — mirrors the backend `UserStatus` enum. */
export type UserStatus = 'INVITED' | 'ACTIVE' | 'DISABLED';

/** Row in the admin user list (`GET /api/admin/users`). Excludes any secret fields. */
export interface AdminUserSummary {
  id: number;
  email: string;
  displayName: string | null;
  status: UserStatus;
}

/**
 * Request body for `PATCH /api/admin/users/{id}` — the two admin-editable fields. Email is
 * immutable (it is the login identity and invite target). `displayName` may be `null` to clear it;
 * `status` is required.
 */
export interface UserUpdateRequest {
  displayName?: string | null;
  status: UserStatus;
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
