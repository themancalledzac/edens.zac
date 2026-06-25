/**
 * Users API — create-user (admin) and invite-flow (public) functions.
 *
 * - `createUser` uses the admin perimeter (BFF secret) via `fetchAdminPostJsonApi`.
 * - `getInvitePreview` is server-side only: hits the backend directly via `getApiBaseUrl`
 *   with `cache:'no-store'`; returns `null` on any non-OK response.
 * - `acceptInvite` is client-side: POSTs to the BFF proxy with `credentials:'same-origin'`
 *   so the `Set-Cookie: ezac_session` from the backend is accepted; resolves on 204,
 *   throws `ApiError` otherwise.
 */

import {
  ApiError,
  fetchAdminGetApi,
  fetchAdminPatchJsonApi,
  fetchAdminPostJsonApi,
  getApiBaseUrl,
} from '@/app/lib/api/core';
import {
  type AcceptInviteRequest,
  type AdminUserSummary,
  type CreateUserResponse,
  type InvitePreview,
  type UserCreateRequest,
  type UserUpdateRequest,
} from '@/app/types/User';

/**
 * Create a new invited user via the admin endpoint.
 *
 * @returns `CreateUserResponse` containing `userId` and `inviteUrl` (HTTP 201).
 * @throws `ApiError(409)` when the email is already registered.
 */
export async function createUser(req: UserCreateRequest): Promise<CreateUserResponse> {
  const result = await fetchAdminPostJsonApi<CreateUserResponse>('/users', req);
  if (!result) {
    throw new ApiError('Unexpected empty response from /users', 500);
  }
  return result;
}

/**
 * List all user accounts via the admin endpoint (newest first). Returns `[]` when the endpoint
 * yields no body.
 */
export async function listUsers(): Promise<AdminUserSummary[]> {
  const result = await fetchAdminGetApi<AdminUserSummary[]>('/users');
  return result ?? [];
}

/**
 * Re-issue a single-use invite link for an existing user — a resend for an `INVITED` user, a
 * password-reset link for an `ACTIVE` one. The backend invalidates the user's prior unused invites,
 * so only the returned link is live.
 *
 * @returns `CreateUserResponse` with the fresh `inviteUrl`.
 * @throws `ApiError(404)` when the user no longer exists.
 */
export async function regenerateInvite(userId: number): Promise<CreateUserResponse> {
  const result = await fetchAdminPostJsonApi<CreateUserResponse>(`/users/${userId}/invite`, {});
  if (!result) {
    throw new ApiError('Unexpected empty response from regenerate-invite', 500);
  }
  return result;
}

/**
 * Fetch a single user summary by id for the admin detail view. Returns `null` on 404 (mapped from
 * an empty body) so callers can `notFound()` cleanly.
 */
export async function getAdminUser(id: number): Promise<AdminUserSummary | null> {
  return await fetchAdminGetApi<AdminUserSummary>(`/users/${id}`);
}

/**
 * Update an existing user's display name and status via the admin endpoint.
 *
 * @returns the refreshed `AdminUserSummary`.
 * @throws `ApiError(404)` when the user no longer exists.
 */
export async function updateUser(id: number, body: UserUpdateRequest): Promise<AdminUserSummary> {
  const result = await fetchAdminPatchJsonApi<AdminUserSummary>(`/users/${id}`, body);
  if (!result) {
    throw new ApiError('Unexpected empty response from update-user', 500);
  }
  return result;
}

/**
 * Server-side fetch of the invite preview for a given raw token.
 *
 * Hits the backend directly (no BFF proxy needed — public endpoint, no cookie required).
 * Returns `null` for any non-OK response (404 = invalid/expired, 410 = already used).
 *
 * @param token - Raw URL token from the invite link (will be percent-encoded).
 */
export async function getInvitePreview(token: string): Promise<InvitePreview | null> {
  const url = `${getApiBaseUrl('auth')}/invite/${encodeURIComponent(token)}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  return (await res.json()) as InvitePreview;
}

/**
 * Client-side submission of the invite-acceptance form.
 *
 * POSTs through the BFF proxy so that the `Set-Cookie: ezac_session` response header
 * is forwarded to the browser (mirrors the `login` function in auth.ts).
 * Resolves on 204; throws `ApiError` on any non-OK status.
 *
 * @param token - Raw URL token (will be percent-encoded in the path).
 * @param body  - Display name and password chosen by the invitee.
 */
export async function acceptInvite(token: string, body: AcceptInviteRequest): Promise<void> {
  const res = await fetch(`/api/proxy/api/auth/invite/${encodeURIComponent(token)}/accept`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  if (!res.ok) {
    let detail: unknown;
    const contentType = res.headers.get('content-type') ?? '';
    try {
      detail = contentType.includes('application/json') ? await res.json() : await res.text();
    } catch {
      detail = '';
    }
    const message =
      typeof detail === 'string' && detail
        ? detail
        : (detail && typeof detail === 'object'
          ? ((detail as { message?: string }).message ?? `API error: ${res.status}`)
          : `API error: ${res.status}`);
    throw new ApiError(message, res.status);
  }
}
