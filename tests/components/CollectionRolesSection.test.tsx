/**
 * Tests for CollectionRolesSection — the collection-edit "Role Access" panel (the inverse of the
 * role-detail page). Renders the roles granting a collection, changes a level, revokes, adds an
 * existing SHARED role, and creates-and-grants a new SHARED role in one action. All mutations
 * save immediately and re-fetch the grant list.
 */

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { CollectionRolesSection } from '@/app/components/ContentCollection/edit/sections/CollectionRolesSection';
import { ApiError } from '@/app/lib/api/core';
import * as rolesApi from '@/app/lib/api/roles';
import { type CollectionRoleRow, type RoleSummary } from '@/app/types/Role';

jest.mock('@/app/lib/api/roles', () => ({
  listCollectionRoles: jest.fn(),
  listRoles: jest.fn(),
  createRole: jest.fn(),
  setRoleGrant: jest.fn(),
  removeRoleGrant: jest.fn(),
}));

const mockListCollectionRoles = rolesApi.listCollectionRoles as jest.MockedFunction<
  typeof rolesApi.listCollectionRoles
>;
const mockListRoles = rolesApi.listRoles as jest.MockedFunction<typeof rolesApi.listRoles>;
const mockCreateRole = rolesApi.createRole as jest.MockedFunction<typeof rolesApi.createRole>;
const mockSetRoleGrant = rolesApi.setRoleGrant as jest.MockedFunction<typeof rolesApi.setRoleGrant>;
const mockRemoveRoleGrant = rolesApi.removeRoleGrant as jest.MockedFunction<
  typeof rolesApi.removeRoleGrant
>;

const COLLECTION_ID = 20;

const grants: CollectionRoleRow[] = [
  { roleId: 1, name: 'pnwer', kind: 'SHARED', level: 'GENERAL' },
  { roleId: 2, name: 'ken@x.com', kind: 'PERSONAL', level: 'CLIENT' },
];

const allRoles: RoleSummary[] = [
  { id: 1, name: 'pnwer', kind: 'SHARED' }, // already granted — excluded from the picker
  { id: 3, name: 'power', kind: 'SHARED' }, // grantable
  { id: 4, name: 'ken@x.com', kind: 'PERSONAL' }, // PERSONAL — excluded from the picker
];

beforeEach(() => {
  jest.clearAllMocks();
  mockListCollectionRoles.mockResolvedValue(grants);
  mockListRoles.mockResolvedValue(allRoles);
  mockSetRoleGrant.mockResolvedValue();
  mockRemoveRoleGrant.mockResolvedValue();
});

async function renderSection(title = 'Fall Wedding') {
  render(<CollectionRolesSection collectionId={COLLECTION_ID} collectionTitle={title} />);
  // Wait for the initial grant + role loads to settle (silences act() warnings).
  await waitFor(() => {
    expect(mockListCollectionRoles).toHaveBeenCalledWith(COLLECTION_ID);
    expect(mockListRoles).toHaveBeenCalled();
  });
}

describe('CollectionRolesSection', () => {
  it('renders the granted roles with kind badge and current level', async () => {
    await renderSection();

    expect(await screen.findByText('pnwer')).toBeInTheDocument();
    expect(screen.getByText('ken@x.com')).toBeInTheDocument();
    expect(screen.getByText('SHARED')).toBeInTheDocument();
    // PERSONAL appears once — the granted row badge (the picker excludes PERSONAL roles).
    expect(screen.getByText('PERSONAL')).toBeInTheDocument();
    expect(screen.getByLabelText('Access level for pnwer')).toHaveValue('GENERAL');
    expect(screen.getByLabelText('Access level for ken@x.com')).toHaveValue('CLIENT');
  });

  it('shows the empty state when no roles grant the collection', async () => {
    mockListCollectionRoles.mockResolvedValue([]);
    await renderSection();

    expect(await screen.findByText('No roles have access yet.')).toBeInTheDocument();
  });

  it('adds an existing role via the picker and re-fetches the grants', async () => {
    await renderSection();
    await screen.findByLabelText('Add a role');

    fireEvent.change(screen.getByLabelText('Add a role'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Access level for added role'), {
      target: { value: 'CLIENT' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => {
      expect(mockSetRoleGrant).toHaveBeenCalledWith(3, COLLECTION_ID, 'CLIENT');
    });
    // Initial load + post-mutation refresh.
    await waitFor(() => {
      expect(mockListCollectionRoles).toHaveBeenCalledTimes(2);
    });
  });

  it('excludes PERSONAL and already-granted roles from the add picker', async () => {
    await renderSection();
    const picker = await screen.findByLabelText('Add a role');

    expect(within(picker).getByRole('option', { name: 'power' })).toBeInTheDocument();
    expect(within(picker).queryByRole('option', { name: 'pnwer' })).not.toBeInTheDocument();
    expect(within(picker).queryByRole('option', { name: 'ken@x.com' })).not.toBeInTheDocument();
  });

  it('changes a granted role level via setRoleGrant', async () => {
    await renderSection();
    const levelSelect = await screen.findByLabelText('Access level for pnwer');

    fireEvent.change(levelSelect, { target: { value: 'CLIENT' } });

    await waitFor(() => {
      expect(mockSetRoleGrant).toHaveBeenCalledWith(1, COLLECTION_ID, 'CLIENT');
    });
  });

  it('removes a granted role via removeRoleGrant', async () => {
    await renderSection();
    const row = (await screen.findByLabelText('Access level for pnwer')).closest('div');
    if (!row) throw new Error('granted-role row not found');

    fireEvent.click(within(row).getByRole('button', { name: 'Remove' }));

    await waitFor(() => {
      expect(mockRemoveRoleGrant).toHaveBeenCalledWith(1, COLLECTION_ID);
    });
  });

  it('creates a SHARED role named after the collection, then grants it', async () => {
    mockCreateRole.mockResolvedValue({ id: 9, name: 'Fall Wedding', kind: 'SHARED' });
    await renderSection();

    const nameInput = await screen.findByLabelText('Create role for this collection');
    expect(nameInput).toHaveValue('Fall Wedding'); // defaults to the collection title

    fireEvent.change(screen.getByLabelText('Access level for created role'), {
      target: { value: 'CLIENT' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(mockCreateRole).toHaveBeenCalledWith({ name: 'Fall Wedding', kind: 'SHARED' });
      expect(mockSetRoleGrant).toHaveBeenCalledWith(9, COLLECTION_ID, 'CLIENT');
    });
  });

  it('surfaces a 409 duplicate role name as "already exists"', async () => {
    mockCreateRole.mockRejectedValue(new ApiError('Conflict', 409));
    await renderSection();
    await screen.findByLabelText('Create role for this collection');

    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('A role with that name already exists.');
    });
    expect(mockSetRoleGrant).not.toHaveBeenCalled();
  });
});
