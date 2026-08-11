/**
 * Tests for RolesPanel — the tall in-place admin panel that swaps its body between the role list,
 * a create form, and a role's detail editor.
 *
 * Mocks the roles API. The detail branch mounts RoleDetailView inside this panel's body, so the
 * collections and users APIs it reads on mount are stubbed to empty arrays: without them, opening a
 * role throws instead of rendering.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { RolesPanel } from '@/app/components/RolesPanel/RolesPanel';
import { clearCachedPanelData } from '@/app/hooks/useCachedPanelData';
import { ApiError } from '@/app/lib/api/core';
import * as rolesApi from '@/app/lib/api/roles';
import { type RoleDetail, type RoleSummary } from '@/app/types/Role';

jest.mock('@/app/lib/api/roles', () => ({
  listRoles: jest.fn(),
  createRole: jest.fn(),
  deleteRole: jest.fn(),
  getRole: jest.fn(),
  // The rest of RoleDetailView's surface. `jest.fn(() => Promise.resolve())` rather than
  // `jest.fn().mockResolvedValue(undefined)`: unicorn/no-useless-undefined strips the argument and
  // the bare `mockResolvedValue()` then fails to type-check against `Promise<void>`.
  setRoleGrant: jest.fn(() => Promise.resolve()),
  removeRoleGrant: jest.fn(() => Promise.resolve()),
  addRoleMember: jest.fn(() => Promise.resolve()),
  removeRoleMember: jest.fn(() => Promise.resolve()),
}));

// Reassigned per test to drive the ?role= deep link. Read lazily inside the hook, so the TDZ on
// this `let` is never reached: the factory runs at import time, the arrow only during render.
let mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}));

jest.mock('@/app/lib/api/collections', () => ({
  getAllCollectionsAdmin: jest.fn(() => Promise.resolve([])),
}));

jest.mock('@/app/lib/api/users', () => ({
  listUsers: jest.fn(() => Promise.resolve([])),
}));

const mockListRoles = rolesApi.listRoles as jest.MockedFunction<typeof rolesApi.listRoles>;
const mockCreateRole = rolesApi.createRole as jest.MockedFunction<typeof rolesApi.createRole>;
const mockDeleteRole = rolesApi.deleteRole as jest.MockedFunction<typeof rolesApi.deleteRole>;
const mockGetRole = rolesApi.getRole as jest.MockedFunction<typeof rolesApi.getRole>;

// Deliberately unsorted, and deliberately mixed-case: a plain ASCII sort would put "Beta" first,
// so this fixture is what distinguishes the case-insensitive comparison from a naive one.
const ROLES: RoleSummary[] = [
  { id: 2, name: 'zeta' },
  { id: 1, name: 'alpha' },
  { id: 3, name: 'Beta' },
];

const ALPHA_DETAIL: RoleDetail = { id: 1, name: 'alpha', members: [], collections: [] };

describe('RolesPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearCachedPanelData();
    window.localStorage.clear();
    window.confirm = jest.fn(() => true);
    mockSearchParams = new URLSearchParams();
    mockListRoles.mockResolvedValue(ROLES);
    mockGetRole.mockResolvedValue(ALPHA_DETAIL);
  });

  it('renders roles alphabetically, case-insensitively', async () => {
    render(<RolesPanel />);

    await waitFor(() => expect(screen.getByText('alpha')).toBeInTheDocument());

    const rows = screen.getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('alpha');
    expect(rows[1]).toHaveTextContent('Beta');
    expect(rows[2]).toHaveTextContent('zeta');
  });

  // Opening a role swaps the panel body rather than navigating, so the header title is the only
  // thing that says which role you are in — and the list has to be gone, not merely scrolled past.
  it('opens a role detail in place and returns to the list via ← Back', async () => {
    render(<RolesPanel />);
    await waitFor(() => expect(screen.getByText('alpha')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'alpha' }));

    expect(screen.getByRole('heading', { name: 'alpha' })).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(mockGetRole).toHaveBeenCalledWith(1);
    await screen.findByRole('heading', { name: 'Collections' });

    fireEvent.click(screen.getByRole('button', { name: /back/i }));

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Roles' })).toBeInTheDocument());
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('"+ New Role" opens the create form; Cancel returns to the list', async () => {
    render(<RolesPanel />);
    await waitFor(() => expect(screen.getByText('alpha')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /new role/i }));
    expect(screen.getByRole('heading', { name: 'New Role' })).toBeInTheDocument();
    expect(screen.getByLabelText(/new role name/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Roles' })).toBeInTheDocument());
    expect(screen.getByText('alpha')).toBeInTheDocument();
  });

  it('creates a role with the trimmed name and returns to the list', async () => {
    mockCreateRole.mockResolvedValue({ id: 4, name: 'power' });
    render(<RolesPanel />);
    await waitFor(() => expect(screen.getByText('alpha')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /new role/i }));
    fireEvent.change(screen.getByLabelText(/new role name/i), { target: { value: '  power  ' } });
    fireEvent.click(screen.getByRole('button', { name: /create role/i }));

    await waitFor(() => expect(mockCreateRole).toHaveBeenCalledWith({ name: 'power' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Roles' })).toBeInTheDocument());
    // Initial read + the refresh backToList triggers.
    expect(mockListRoles).toHaveBeenCalledTimes(2);
  });

  // The backend answers a duplicate name with 409. Anything else is a generic failure, so the
  // status is what has to be read — not the message text.
  it('surfaces a 409 duplicate name as "A role with that name already exists."', async () => {
    mockCreateRole.mockRejectedValue(new ApiError('Conflict', 409));
    render(<RolesPanel />);
    await waitFor(() => expect(screen.getByText('alpha')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /new role/i }));
    fireEvent.change(screen.getByLabelText(/new role name/i), { target: { value: 'alpha' } });
    fireEvent.click(screen.getByRole('button', { name: /create role/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('A role with that name already exists.')
    );
    expect(screen.getByRole('heading', { name: 'New Role' })).toBeInTheDocument();
  });

  it('removes the row optimistically when the per-row × is confirmed', async () => {
    mockDeleteRole.mockResolvedValue();
    render(<RolesPanel />);
    await waitFor(() => expect(screen.getByText('alpha')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Delete role alpha' }));

    await waitFor(() => expect(screen.queryByText('alpha')).not.toBeInTheDocument());
    expect(mockDeleteRole).toHaveBeenCalledWith(1);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('deletes nothing and keeps the row when the confirm is declined', async () => {
    window.confirm = jest.fn(() => false);
    render(<RolesPanel />);
    await waitFor(() => expect(screen.getByText('alpha')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Delete role alpha' }));

    expect(mockDeleteRole).not.toHaveBeenCalled();
    expect(screen.getByText('alpha')).toBeInTheDocument();
  });

  // A failed delete that left the row gone would read as a successful one — the rollback is the
  // whole point of the optimistic update, and the message has to name which role survived.
  it('rolls the row back and names it when the delete fails', async () => {
    mockDeleteRole.mockRejectedValue(new Error('Network error'));
    render(<RolesPanel />);
    await waitFor(() => expect(screen.getByText('alpha')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Delete role alpha' }));

    await waitFor(() => expect(screen.getByText(/failed to delete role/i)).toBeInTheDocument());
    expect(screen.getByText(/failed to delete role/i)).toHaveTextContent('alpha');
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('shows an empty state when there are no roles', async () => {
    mockListRoles.mockResolvedValue([]);
    render(<RolesPanel />);

    await waitFor(() => expect(screen.getByText(/no roles yet/i)).toBeInTheDocument());
  });

  // The live region has to predate the text it announces, so the panel renders it outside the body
  // branch. Node identity across the transition is what proves it was not inserted mid-flight.
  it('announces the in-flight read through one region that outlives the load', async () => {
    let resolveRoles!: (roles: RoleSummary[]) => void;
    mockListRoles.mockImplementation(
      () =>
        new Promise<RoleSummary[]>(resolve => {
          resolveRoles = resolve;
        })
    );

    render(<RolesPanel />);

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Loading roles…');
    expect(status).toHaveAttribute('aria-live', 'polite');

    resolveRoles([]);
    await waitFor(() => expect(screen.getByText(/no roles yet/i)).toBeInTheDocument());

    expect(screen.getByRole('status')).toBe(status);
    expect(status).toBeEmptyDOMElement();
  });

  // `listRoles` throws on any non-OK response, so a catch-less refresh would leave `roles` at []
  // and tell an admin whose backend is down that there are no roles — inviting a duplicate.
  it('shows a load failure, NOT the empty state, when the roles read throws', async () => {
    mockListRoles.mockRejectedValue(new Error('Backend unreachable'));
    render(<RolesPanel />);

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/could not load roles/i)
    );
    expect(screen.queryByText(/no roles yet/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Loading roles…')).not.toBeInTheDocument();
  });

  it('retries the read from the failure branch and renders the list on success', async () => {
    mockListRoles.mockRejectedValueOnce(new Error('Backend unreachable'));
    render(<RolesPanel />);

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(mockListRoles).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => expect(screen.getByText('alpha')).toBeInTheDocument());
    expect(mockListRoles).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  /**
   * Roles lost their own routes when they moved onto the hub, so `?role=` is the only thing keeping
   * a role addressable — it is what UserRolesSection links a user's role names to. Without it those
   * links land on the list and the reader has to find the role again by hand.
   */
  describe('?role= deep link', () => {
    it('opens that role instead of the list', async () => {
      mockSearchParams = new URLSearchParams('role=3');
      mockGetRole.mockResolvedValue({ id: 3, name: 'Beta', members: [], collections: [] });

      render(<RolesPanel />);

      await waitFor(() => expect(mockGetRole).toHaveBeenCalledWith(3));
      expect(screen.getByRole('heading', { name: 'Beta' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'alpha' })).not.toBeInTheDocument();
    });

    it('returns to the list on ← Back, and does not reopen the role', async () => {
      mockSearchParams = new URLSearchParams('role=3');
      mockGetRole.mockResolvedValue({ id: 3, name: 'Beta', members: [], collections: [] });

      render(<RolesPanel />);
      await waitFor(() =>
        expect(screen.getByRole('heading', { name: 'Beta' })).toBeInTheDocument()
      );

      fireEvent.click(screen.getByRole('button', { name: /back/i }));

      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'alpha' })).toBeInTheDocument()
      );
      expect(screen.getByRole('heading', { name: 'Roles' })).toBeInTheDocument();
    });

    it('falls back to the list when the id matches no role', async () => {
      mockSearchParams = new URLSearchParams('role=404');

      render(<RolesPanel />);

      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'alpha' })).toBeInTheDocument()
      );
      expect(mockGetRole).not.toHaveBeenCalled();
      expect(screen.getByRole('heading', { name: 'Roles' })).toBeInTheDocument();
    });

    it('ignores a non-numeric id rather than opening anything', async () => {
      mockSearchParams = new URLSearchParams('role=not-a-number');

      render(<RolesPanel />);

      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'alpha' })).toBeInTheDocument()
      );
      expect(mockGetRole).not.toHaveBeenCalled();
    });
  });
});
