/**
 * User API types — mirrors the backend Phase F invite/onboarding contract.
 *
 * `Role` is re-exported from Auth.ts; do not duplicate it here.
 */

import { type Role } from '@/app/types/Auth';

/** Request body for `POST /api/admin/users`. */
export interface UserCreateRequest {
  email: string;
  displayName?: string;
  role: Role;
}

/** Response body for `POST /api/admin/users` (HTTP 201). */
export interface CreateUserResponse {
  userId: number;
  inviteUrl: string;
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
