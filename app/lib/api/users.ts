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
import { type CollectionModel } from '@/app/types/Collection';
import { type ContentImageModel } from '@/app/types/Content';
import { type FailSoftRead } from '@/app/types/FailSoftRead';
import {
  type AcceptInviteRequest,
  type AdminUserSummary,
  type CreateUserResponse,
  type InvitePreview,
  type InvitePreviewResult,
  type MergePreview,
  type MergeResult,
  type UserCreateRequest,
  type UserUpdateRequest,
  type UserUpgradeRequest,
} from '@/app/types/User';
import { logger } from '@/app/utils/logger';

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
 * yields no body. Pass `includePeople: true` to also surface tag-only `PERSON` rows.
 */
export async function listUsers(opts?: { includePeople?: boolean }): Promise<AdminUserSummary[]> {
  const endpoint = opts?.includePeople ? '/users?includePeople=true' : '/users';
  const result = await fetchAdminGetApi<AdminUserSummary[]>(endpoint);
  return result ?? [];
}

/** Preview what a merge of `sourceId` into `targetId` would move. `null` if either id is gone. */
export async function getMergePreview(
  sourceId: number,
  targetId: number
): Promise<MergePreview | null> {
  return await fetchAdminGetApi<MergePreview>(
    `/users/${sourceId}/merge-preview?targetId=${targetId}`
  );
}

/** Absorb tag-only `sourceId` into surviving `targetId`. Throws ApiError(409) on an illegal merge. */
export async function mergeUser(targetId: number, sourceId: number): Promise<MergeResult> {
  const result = await fetchAdminPostJsonApi<MergeResult>(`/users/${targetId}/merge`, { sourceId });
  if (!result) {
    throw new ApiError('Unexpected empty response from merge', 500);
  }
  return result;
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
 * Promote a tag-only `PERSON` identity in place into an `INVITED` account, keeping its existing
 * image tags and collections. Requires an `email` (a PERSON has none) so the invite can be issued;
 * the PERSON's existing display name is retained by the backend. Distinct from {@link mergeUser},
 * which folds a PERSON into an existing account and deletes it.
 *
 * The address is trimmed and lowercased here rather than at the call site: the server lowercases
 * before persisting, so normalizing at this single boundary guarantees the address callers send is
 * byte-for-byte the one that gets stored and that the returned invite link is bound to.
 *
 * @returns `CreateUserResponse` with the fresh `inviteUrl` and the upgraded `userId`.
 * @throws `ApiError(404)` when the user no longer exists.
 * @throws `ApiError(409)` when the email is already taken, or the target is not a PERSON.
 */
export async function upgradeUser(userId: number, email: string): Promise<CreateUserResponse> {
  const body: UserUpgradeRequest = { email: email.trim().toLowerCase() };
  const result = await fetchAdminPostJsonApi<CreateUserResponse>(`/users/${userId}/upgrade`, body);
  if (!result) {
    throw new ApiError('Unexpected empty response from upgrade-user', 500);
  }
  return result;
}

/**
 * Fetch a single user summary by id for the admin detail view.
 *
 * `null` means an EMPTY BODY, not a 404: `fetchAdminGetApi` throws `ApiError` for every non-OK
 * response, 404 included. Callers that want a `notFound()` must narrow on `error.status === 404`
 * and rethrow the rest — see `app/(admin)/admin/users/[id]/page.tsx`. Catching every status there
 * would render "user not found" at an admin whose backend is merely unreachable.
 */
export async function getAdminUser(id: number): Promise<AdminUserSummary | null> {
  return await fetchAdminGetApi<AdminUserSummary>(`/users/${id}`);
}

/**
 * Update an existing user's email, display name, status, and description via the admin endpoint.
 *
 * @returns the refreshed `AdminUserSummary`.
 * @throws `ApiError(404)` when the user no longer exists.
 * @throws `ApiError(409)` when another user already owns the requested email.
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
 *
 * The backend's 410 (already redeemed) is kept distinct from 404 (never existed, or expired)
 * because the invite page routes them differently — a redeemed token means the account exists, so
 * its owner is sent home instead of to a 404. Every other non-OK status (500, 503, network-level
 * failure surfaced as a status) is treated as `invalid`: without a preview there is nothing to
 * render, and a dead end is the honest outcome.
 *
 * @param token - Raw URL token from the invite link (will be percent-encoded).
 */
export async function getInvitePreview(token: string): Promise<InvitePreviewResult> {
  const url = `${getApiBaseUrl('auth')}/invite/${encodeURIComponent(token)}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (res.status === 410) return { status: 'used' };
  if (!res.ok) return { status: 'invalid' };
  return { status: 'ok', preview: (await res.json()) as InvitePreview };
}

/**
 * Fetch the full page (CollectionModel) for a user as seen by the admin.
 *
 * Same contract as {@link getAdminUser}: `null` means an empty body, while every non-OK status —
 * 404 included — throws `ApiError`. Callers must narrow on 404 rather than catching everything;
 * see `loadUserSpace`, where a bare `.catch(() => null)` once turned a 500, a timeout and a lapsed
 * admin session into the claim "this user has no galleries yet".
 */
export async function getUserPageById(userId: number): Promise<CollectionModel | null> {
  return fetchAdminGetApi<CollectionModel>(`/users/${userId}/page`);
}

/**
 * Admin-side twins of `listSavedImagesServer` / `listFollowedCollectionIdsServer` in
 * `app/lib/api/personal.ts`. Those read `/api/read/user/{saves,follows}`, which the backend binds
 * to the session principal — self-only by construction — so an admin rendering ANOTHER user's
 * space cannot use them. These take the target id instead.
 *
 * Both stay fail-soft rather than throwing: a Saved or Following section that cannot load must not
 * 500 the whole detail page, and these two endpoints do not exist on the deployed backend yet, so
 * the failure path is the CURRENT path. But the failure is reported, not swallowed — it is logged
 * and returned as {@link FailSoftRead} `ok: false` so the caller can say "unavailable" instead of
 * "none".
 *
 * ## Log level
 *
 * `warn`, not `error`, and the self-side twins in `personal.ts` agree. A known-missing endpoint is
 * the expected steady state until the backend ships it, so `error` here would put two entries on
 * the error channel for every single render of `/admin/users/[id]` — the reliable way to train
 * everyone to stop reading it. `error` is reserved for a failure that is NOT expected. When these
 * endpoints deploy, the level is worth revisiting; until then this is normal operation and is
 * logged as such.
 */
export async function listSavedImagesByUserServer(
  userId: number
): Promise<FailSoftRead<ContentImageModel>> {
  try {
    const images = await fetchAdminGetApi<ContentImageModel[]>(`/users/${userId}/saves/images`);
    return { ok: true, items: images ?? [] };
  } catch (error) {
    logger.warn('users', 'Failed to read saved images for user; reporting unavailable', {
      error,
      userId,
    });
    return { ok: false };
  }
}

/** See {@link listSavedImagesByUserServer}. */
export async function listFollowedCollectionIdsByUserServer(
  userId: number
): Promise<FailSoftRead<number>> {
  try {
    const ids = await fetchAdminGetApi<number[]>(`/users/${userId}/follows`);
    return { ok: true, items: ids ?? [] };
  } catch (error) {
    logger.warn('users', 'Failed to read follows for user; reporting unavailable', {
      error,
      userId,
    });
    return { ok: false };
  }
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
        : detail && typeof detail === 'object'
          ? ((detail as { message?: string }).message ?? `API error: ${res.status}`)
          : `API error: ${res.status}`;
    throw new ApiError(message, res.status);
  }
}
