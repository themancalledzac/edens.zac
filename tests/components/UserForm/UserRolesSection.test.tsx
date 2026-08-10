/**
 * Tests for UserRolesSection — one user's role membership, shared by the admin hub's UserForm and
 * the read-only view on /admin/users/[id].
 *
 * The behaviours worth pinning:
 * - every role name, and the section's own label, is a link to a real admin destination;
 * - adding commits on `change` (no second "Add" button) and removing is the red × on the row;
 * - a failed read reports membership as UNKNOWN rather than as "no roles" — the one thing here
 *   that must never regress, because the wrong answer is a confident claim about who can see what;
 * - readOnly drops the mutating controls and skips the role-catalog read entirely.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { UserRolesSection } from '@/app/components/UserForm/UserRolesSection';
import { ApiError } from '@/app/lib/api/core';
import * as rolesApi from '@/app/lib/api/roles';

jest.mock('@/app/lib/api/roles', () => ({
  listUserRoles: jest.fn(() => Promise.resolve([])),
  listRoles: jest.fn(() => Promise.resolve([])),
  // `jest.fn(() => Promise.resolve())` rather than `.mockResolvedValue(undefined)`: an untyped
  // jest.fn() infers `unknown`, so tsc demands the argument, while eslint's
  // unicorn/no-useless-undefined auto-strips it — leaving `mockResolvedValue()`, which then fails
  // the type check. This form satisfies both.
  addUserToRole: jest.fn(() => Promise.resolve()),
  removeUserFromRole: jest.fn(() => Promise.resolve()),
}));

const mockListUserRoles = rolesApi.listUserRoles as jest.MockedFunction<
  typeof rolesApi.listUserRoles
>;
const mockListRoles = rolesApi.listRoles as jest.MockedFunction<typeof rolesApi.listRoles>;
const mockAddUserToRole = rolesApi.addUserToRole as jest.MockedFunction<
  typeof rolesApi.addUserToRole
>;
const mockRemoveUserFromRole = rolesApi.removeUserFromRole as jest.MockedFunction<
  typeof rolesApi.removeUserFromRole
>;

describe('UserRolesSection', () => {
  // `jest.clearAllMocks()` clears calls but NOT implementations, so a rejection installed by one
  // test leaks into the next. Every mock this suite reprograms is restored here, or the failure
  // shows up in whichever test happens to run after the one that set it.
  beforeEach(() => {
    jest.clearAllMocks();
    mockListUserRoles.mockResolvedValue([]);
    mockListRoles.mockResolvedValue([]);
    mockAddUserToRole.mockImplementation(() => Promise.resolve());
    mockRemoveUserFromRole.mockImplementation(() => Promise.resolve());
  });

  it('links the section label to the role index and each role to its own detail page', async () => {
    mockListUserRoles.mockResolvedValue([
      { roleId: 3, name: 'power' },
      { roleId: 9, name: 'clients' },
    ]);

    render(<UserRolesSection userId={8} />);

    expect(screen.getByRole('link', { name: 'Roles' })).toHaveAttribute('href', '/admin/roles');
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'power' })).toHaveAttribute('href', '/admin/roles/3')
    );
    expect(screen.getByRole('link', { name: 'clients' })).toHaveAttribute('href', '/admin/roles/9');
  });

  it('adds a role on select change, with no confirming button, and refetches membership', async () => {
    mockListRoles.mockResolvedValue([{ id: 3, name: 'power' }]);

    render(<UserRolesSection userId={8} />);

    const select = await screen.findByLabelText('Add Role');
    // The previous shape needed a second tap on an "Add" button; picking the role IS the intent.
    expect(screen.queryByRole('button', { name: /^add$/i })).not.toBeInTheDocument();

    mockListUserRoles.mockResolvedValue([{ roleId: 3, name: 'power' }]);
    fireEvent.change(select, { target: { value: '3' } });

    await waitFor(() => expect(mockAddUserToRole).toHaveBeenCalledWith(8, 3));
    // Membership is re-read rather than patched locally, so the list shows what the server stored.
    await waitFor(() => expect(screen.getByRole('link', { name: 'power' })).toBeInTheDocument());
  });

  it('offers only roles the user is not already in', async () => {
    mockListUserRoles.mockResolvedValue([{ roleId: 3, name: 'power' }]);
    mockListRoles.mockResolvedValue([
      { id: 3, name: 'power' },
      { id: 9, name: 'clients' },
    ]);

    render(<UserRolesSection userId={8} />);

    await waitFor(() =>
      expect(screen.getByRole('option', { name: 'clients' })).toBeInTheDocument()
    );
    expect(screen.queryByRole('option', { name: 'power' })).not.toBeInTheDocument();
  });

  it('removes a role from the × on its row', async () => {
    mockListUserRoles.mockResolvedValue([{ roleId: 3, name: 'power' }]);

    render(<UserRolesSection userId={8} />);

    const remove = await screen.findByRole('button', { name: 'Remove power' });
    mockListUserRoles.mockResolvedValue([]);
    fireEvent.click(remove);

    await waitFor(() => expect(mockRemoveUserFromRole).toHaveBeenCalledWith(8, 3));
    await waitFor(() => expect(screen.getByText(/not in any roles yet/i)).toBeInTheDocument());
  });

  it('reports a failed add instead of leaving the list silently unchanged', async () => {
    mockListRoles.mockResolvedValue([{ id: 3, name: 'power' }]);
    mockAddUserToRole.mockRejectedValue(new ApiError('Backend unreachable', 500));

    render(<UserRolesSection userId={8} />);

    fireEvent.change(await screen.findByLabelText('Add Role'), { target: { value: '3' } });

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/failed to add role/i));
  });

  // The write and the read back are reported separately: an add that LANDED and then failed to
  // re-read must not claim the add failed, or an admin retries a grant that already exists — or
  // worse, walks away believing access was never given.
  it('does not report a landed change as a failure when only the re-read throws', async () => {
    mockListRoles.mockResolvedValue([{ id: 3, name: 'power' }]);

    render(<UserRolesSection userId={8} />);
    const select = await screen.findByLabelText('Add Role');

    mockListUserRoles.mockRejectedValue(new ApiError('Backend unreachable', 500));
    fireEvent.change(select, { target: { value: '3' } });

    await waitFor(() => expect(mockAddUserToRole).toHaveBeenCalledWith(8, 3));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        /saved, but this list could not be re-read/i
      )
    );
    expect(screen.queryByText(/failed to add role/i)).not.toBeInTheDocument();
  });

  // An admin auditing permissions must never be shown "Not in any roles yet." for a read that
  // failed — the reads throw on any non-OK response, and `[]` is a different claim entirely.
  it('reports unknown membership instead of claiming the user has no roles', async () => {
    mockListUserRoles.mockRejectedValue(new ApiError('Backend unreachable', 500));

    render(<UserRolesSection userId={8} />);

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/could not load roles for this user/i)
    );
    expect(screen.queryByText(/not in any roles yet/i)).not.toBeInTheDocument();
  });

  it('reports the failure when the role catalog is the read that throws', async () => {
    mockListRoles.mockRejectedValue(new ApiError('Backend unreachable', 500));

    render(<UserRolesSection userId={8} />);

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/membership is unknown/i)
    );
    expect(screen.queryByText(/not in any roles yet/i)).not.toBeInTheDocument();
  });

  describe('compact', () => {
    // The rail's roles are one wrapping row, so the join control leads it as a chip rather than
    // sitting under the row as a form field.
    it('leads the row with an "Add" chip, before the role chips', async () => {
      mockListUserRoles.mockResolvedValue([{ roleId: 3, name: 'power' }]);
      mockListRoles.mockResolvedValue([{ id: 9, name: 'clients' }]);

      render(<UserRolesSection userId={8} compact />);

      const add = await screen.findByLabelText('Add Role');
      // Shorter visible label; the accessible name stays the fuller phrase and still contains it.
      expect(add).toHaveDisplayValue('Add');

      const row = add.closest('ul');
      expect(row).not.toBeNull();
      const items = [...row!.children];
      expect(items[0]).toContainElement(add);
      expect(items[1]).toContainElement(screen.getByRole('link', { name: 'power' }));
    });

    it('still adds on select, from the chip', async () => {
      mockListRoles.mockResolvedValue([{ id: 3, name: 'power' }]);

      render(<UserRolesSection userId={8} compact />);

      const add = await screen.findByLabelText('Add Role');
      mockListUserRoles.mockResolvedValue([{ roleId: 3, name: 'power' }]);
      fireEvent.change(add, { target: { value: '3' } });

      await waitFor(() => expect(mockAddUserToRole).toHaveBeenCalledWith(8, 3));
    });

    it('renders the row for the Add chip even when the user is in no roles', async () => {
      mockListRoles.mockResolvedValue([{ id: 9, name: 'clients' }]);

      render(<UserRolesSection userId={8} compact />);

      expect(await screen.findByLabelText('Add Role')).toBeInTheDocument();
      expect(screen.getByText(/not in any roles yet/i)).toBeInTheDocument();
    });
  });

  describe('readOnly', () => {
    it('keeps the links but drops the controls that change membership', async () => {
      mockListUserRoles.mockResolvedValue([{ roleId: 3, name: 'power' }]);
      mockListRoles.mockResolvedValue([{ id: 9, name: 'clients' }]);

      render(<UserRolesSection userId={8} readOnly />);

      await waitFor(() =>
        expect(screen.getByRole('link', { name: 'power' })).toHaveAttribute(
          'href',
          '/admin/roles/3'
        )
      );
      expect(screen.queryByLabelText('Add Role')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
    });

    it('skips the role-catalog read, which only ever fed the add control', async () => {
      render(<UserRolesSection userId={8} readOnly />);

      await waitFor(() => expect(mockListUserRoles).toHaveBeenCalledWith(8));
      expect(mockListRoles).not.toHaveBeenCalled();
    });
  });
});
