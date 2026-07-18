/** @jest-environment node */
/**
 * Unit tests for roles.ts — verifies URL construction and request shape for the admin role
 * management calls and the user-side membership calls. Core fetch helpers are mocked.
 */

import { ApiError } from '@/app/lib/api/core';
import {
  addRoleMember,
  addUserToRole,
  createRole,
  deleteRole,
  getRole,
  listCollectionRoles,
  listRoles,
  listUserRoles,
  removeRoleGrant,
  removeRoleMember,
  removeUserFromRole,
  setRoleGrant,
} from '@/app/lib/api/roles';

jest.mock('@/app/lib/api/core', () => ({
  ...jest.requireActual('@/app/lib/api/core'),
  fetchAdminGetApi: jest.fn(),
  fetchAdminPostJsonApi: jest.fn(),
  fetchAdminPutJsonApi: jest.fn(),
  fetchAdminDeleteApi: jest.fn(),
}));

import * as core from '@/app/lib/api/core';

beforeEach(() => jest.clearAllMocks());

describe('listRoles', () => {
  it('GETs /roles and returns the array', async () => {
    const roles = [{ id: 1, name: 'power', kind: 'SHARED' }];
    (core.fetchAdminGetApi as jest.Mock).mockResolvedValue(roles);
    expect(await listRoles()).toEqual(roles);
    expect(core.fetchAdminGetApi).toHaveBeenCalledWith('/roles');
  });

  it('returns [] when the endpoint yields no body', async () => {
    (core.fetchAdminGetApi as jest.Mock).mockResolvedValue(null);
    expect(await listRoles()).toEqual([]);
  });
});

describe('getRole', () => {
  it('GETs /roles/{id} and returns the detail', async () => {
    const detail = { id: 1, name: 'power', kind: 'SHARED', members: [], collections: [] };
    (core.fetchAdminGetApi as jest.Mock).mockResolvedValue(detail);
    expect(await getRole(1)).toEqual(detail);
    expect(core.fetchAdminGetApi).toHaveBeenCalledWith('/roles/1');
  });
});

describe('createRole', () => {
  it('POSTs /roles with the body', async () => {
    const created = { id: 9, name: 'power', kind: 'SHARED' };
    (core.fetchAdminPostJsonApi as jest.Mock).mockResolvedValue(created);
    expect(await createRole({ name: 'power', kind: 'SHARED' })).toEqual(created);
    expect(core.fetchAdminPostJsonApi).toHaveBeenCalledWith('/roles', {
      name: 'power',
      kind: 'SHARED',
    });
  });

  it('propagates ApiError(409) on a duplicate name', async () => {
    (core.fetchAdminPostJsonApi as jest.Mock).mockRejectedValue(new ApiError('Conflict', 409));
    await expect(createRole({ name: 'power' })).rejects.toMatchObject({ status: 409 });
  });
});

describe('deleteRole', () => {
  it('DELETEs /roles/{id}', async () => {
    (core.fetchAdminDeleteApi as jest.Mock).mockResolvedValue(null);
    await deleteRole(9);
    expect(core.fetchAdminDeleteApi).toHaveBeenCalledWith('/roles/9');
  });
});

describe('collection grants', () => {
  it('setRoleGrant PUTs /roles/{id}/collections/{cid} with the level', async () => {
    (core.fetchAdminPutJsonApi as jest.Mock).mockResolvedValue(null);
    await setRoleGrant(1, 20, 'CLIENT');
    expect(core.fetchAdminPutJsonApi).toHaveBeenCalledWith('/roles/1/collections/20', {
      level: 'CLIENT',
    });
  });

  it('removeRoleGrant DELETEs /roles/{id}/collections/{cid}', async () => {
    (core.fetchAdminDeleteApi as jest.Mock).mockResolvedValue(null);
    await removeRoleGrant(1, 20);
    expect(core.fetchAdminDeleteApi).toHaveBeenCalledWith('/roles/1/collections/20');
  });
});

describe('membership', () => {
  it('addRoleMember PUTs /roles/{id}/members/{uid}', async () => {
    (core.fetchAdminPutJsonApi as jest.Mock).mockResolvedValue(null);
    await addRoleMember(1, 3);
    expect(core.fetchAdminPutJsonApi).toHaveBeenCalledWith('/roles/1/members/3', {});
  });

  it('removeRoleMember DELETEs /roles/{id}/members/{uid}', async () => {
    (core.fetchAdminDeleteApi as jest.Mock).mockResolvedValue(null);
    await removeRoleMember(1, 3);
    expect(core.fetchAdminDeleteApi).toHaveBeenCalledWith('/roles/1/members/3');
  });

  it('listUserRoles GETs /users/{id}/roles', async () => {
    (core.fetchAdminGetApi as jest.Mock).mockResolvedValue([]);
    expect(await listUserRoles(3)).toEqual([]);
    expect(core.fetchAdminGetApi).toHaveBeenCalledWith('/users/3/roles');
  });

  it('addUserToRole PUTs /users/{id}/roles/{roleId}', async () => {
    (core.fetchAdminPutJsonApi as jest.Mock).mockResolvedValue(null);
    await addUserToRole(3, 1);
    expect(core.fetchAdminPutJsonApi).toHaveBeenCalledWith('/users/3/roles/1', {});
  });

  it('removeUserFromRole DELETEs /users/{id}/roles/{roleId}', async () => {
    (core.fetchAdminDeleteApi as jest.Mock).mockResolvedValue(null);
    await removeUserFromRole(3, 1);
    expect(core.fetchAdminDeleteApi).toHaveBeenCalledWith('/users/3/roles/1');
  });
});

describe('listCollectionRoles', () => {
  it('GETs /collections/{id}/roles and returns the array', async () => {
    const rows = [{ roleId: 1, name: 'power', kind: 'SHARED', level: 'GENERAL' }];
    (core.fetchAdminGetApi as jest.Mock).mockResolvedValue(rows);
    expect(await listCollectionRoles(20)).toEqual(rows);
    expect(core.fetchAdminGetApi).toHaveBeenCalledWith('/collections/20/roles');
  });

  it('returns [] when the endpoint yields no body', async () => {
    (core.fetchAdminGetApi as jest.Mock).mockResolvedValue(null);
    expect(await listCollectionRoles(20)).toEqual([]);
  });
});
