/**
 * Roles API — admin role management (`/api/admin/roles`) plus the user-side membership calls
 * (`/api/admin/users/{id}/roles`). All go through the admin BFF perimeter via the `fetchAdmin*`
 * helpers. Replaces the removed per-user `/users/{id}/collections` grant calls: access is now
 * granted on a role and inherited by the users who join it.
 */

import {
  fetchAdminDeleteApi,
  fetchAdminGetApi,
  fetchAdminPostJsonApi,
  fetchAdminPutJsonApi,
} from '@/app/lib/api/core';
import {
  type AccessLevel,
  type CollectionRoleRow,
  type CreateRoleRequest,
  type RoleDetail,
  type RoleSummary,
  type UserRoleRow,
} from '@/app/types/Role';

const BASE = '/roles';

/** List all roles, ordered by name. `[]` when the endpoint yields no body. */
export async function listRoles(): Promise<RoleSummary[]> {
  return (await fetchAdminGetApi<RoleSummary[]>(BASE)) ?? [];
}

/** Role detail — members + collection grants. `null` on 404 (mapped from an empty body). */
export async function getRole(roleId: number): Promise<RoleDetail | null> {
  return await fetchAdminGetApi<RoleDetail>(`${BASE}/${roleId}`);
}

/** Create a role. Returns the created summary (HTTP 201); throws `ApiError(409)` on a duplicate name. */
export async function createRole(body: CreateRoleRequest): Promise<RoleSummary | null> {
  return await fetchAdminPostJsonApi<RoleSummary>(BASE, body);
}

/** Delete a role (cascades its members + grants). */
export async function deleteRole(roleId: number): Promise<void> {
  await fetchAdminDeleteApi<void>(`${BASE}/${roleId}`);
}

/** Grant a collection to a role at a level (upsert — creates or promotes/demotes). */
export async function setRoleGrant(
  roleId: number,
  collectionId: number,
  level: AccessLevel
): Promise<void> {
  await fetchAdminPutJsonApi<void>(`${BASE}/${roleId}/collections/${collectionId}`, { level });
}

/** Revoke a role's grant on a collection. */
export async function removeRoleGrant(roleId: number, collectionId: number): Promise<void> {
  await fetchAdminDeleteApi<void>(`${BASE}/${roleId}/collections/${collectionId}`);
}

/** Add a user to a role (idempotent). */
export async function addRoleMember(roleId: number, userId: number): Promise<void> {
  await fetchAdminPutJsonApi<void>(`${BASE}/${roleId}/members/${userId}`, {});
}

/** Remove a user from a role. */
export async function removeRoleMember(roleId: number, userId: number): Promise<void> {
  await fetchAdminDeleteApi<void>(`${BASE}/${roleId}/members/${userId}`);
}

// ---- user-side membership (admin user-detail screen) ----

/** The roles a user belongs to (`GET /api/admin/users/{id}/roles`). */
export async function listUserRoles(userId: number): Promise<UserRoleRow[]> {
  return (await fetchAdminGetApi<UserRoleRow[]>(`/users/${userId}/roles`)) ?? [];
}

/** Add a user to a role from the user-detail screen (idempotent). */
export async function addUserToRole(userId: number, roleId: number): Promise<void> {
  await fetchAdminPutJsonApi<void>(`/users/${userId}/roles/${roleId}`, {});
}

/** Remove a user from a role from the user-detail screen. */
export async function removeUserFromRole(userId: number, roleId: number): Promise<void> {
  await fetchAdminDeleteApi<void>(`/users/${userId}/roles/${roleId}`);
}

// ---- collection-side grants (collection edit screen) ----

/** The roles granting a collection (`GET /api/admin/collections/{id}/roles`). */
export async function listCollectionRoles(collectionId: number): Promise<CollectionRoleRow[]> {
  return (await fetchAdminGetApi<CollectionRoleRow[]>(`/collections/${collectionId}/roles`)) ?? [];
}
