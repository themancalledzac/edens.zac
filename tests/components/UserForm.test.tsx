/**
 * Tests for UserForm — the reusable inline create/edit user form.
 *
 * Create mode: collects email + name, calls createUser, shows the copyable invite link, and "Done"
 * fires onSuccess. Validation + 409 surface inline (role="alert").
 * Edit mode: prefills fields (email included — it is editable), saves email + displayName +
 * status + description via updateUser, requires a non-empty email, surfaces 409 email conflicts
 * inline, and Cancel fires onCancel.
 *
 * Role membership moved to UserRolesSection and is covered in that component's own suite; what
 * remains here is the form's end of the contract — that edit mode mounts the section and create
 * mode does not.
 *
 * This form backs the /admin hub panel only. The /admin/users/[id] page does not use it: its
 * fields are inline-editable in place (see UserDetailCard), with no form and no submit step.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { UserForm } from '@/app/components/UserForm/UserForm';
import { ApiError } from '@/app/lib/api/core';
import * as rolesApi from '@/app/lib/api/roles';
import * as usersApi from '@/app/lib/api/users';
import { type AdminUserSummary } from '@/app/types/User';

jest.mock('@/app/lib/api/users', () => ({
  createUser: jest.fn(),
  updateUser: jest.fn(),
}));

jest.mock('@/app/lib/api/roles', () => ({
  listUserRoles: jest.fn().mockResolvedValue([]),
  listRoles: jest.fn().mockResolvedValue([]),
  // `jest.fn(() => Promise.resolve())` rather than `jest.fn().mockResolvedValue(undefined)`: an
  // untyped jest.fn() infers `unknown`, so tsc demands the argument, while eslint's
  // unicorn/no-useless-undefined auto-strips it — leaving `mockResolvedValue()`, which then fails
  // the type check. This form satisfies both. Same reasoning as SelectStar/SelectsContext tests.
  addUserToRole: jest.fn(() => Promise.resolve()),
  removeUserFromRole: jest.fn(() => Promise.resolve()),
}));

const mockCreateUser = usersApi.createUser as jest.MockedFunction<typeof usersApi.createUser>;
const mockUpdateUser = usersApi.updateUser as jest.MockedFunction<typeof usersApi.updateUser>;
const mockListUserRoles = rolesApi.listUserRoles as jest.MockedFunction<
  typeof rolesApi.listUserRoles
>;

// jsdom does not implement navigator.clipboard — stub it (InviteLinkResult uses it).
Object.defineProperty(global.navigator, 'clipboard', {
  value: { writeText: jest.fn(() => Promise.resolve()) },
  writable: true,
});

describe('UserForm', () => {
  const onSuccess = jest.fn();
  const onCancel = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  describe('create mode', () => {
    it('creates a user, shows the invite link, and "Done" fires onSuccess', async () => {
      mockCreateUser.mockResolvedValue({
        userId: 7,
        inviteUrl: 'http://localhost:3000/invite/abc123',
      });

      render(<UserForm mode="create" onSuccess={onSuccess} onCancel={onCancel} />);

      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'client@example.com' },
      });
      fireEvent.click(screen.getByRole('button', { name: /create user/i }));

      await waitFor(() => {
        expect(screen.getByText('http://localhost:3000/invite/abc123')).toBeInTheDocument();
      });
      expect(mockCreateUser).toHaveBeenCalledWith({
        email: 'client@example.com',
      });

      fireEvent.click(screen.getByRole('button', { name: /done/i }));
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it('validates that email is required (no API call, inline error)', async () => {
      render(<UserForm mode="create" onSuccess={onSuccess} onCancel={onCancel} />);

      fireEvent.click(screen.getByRole('button', { name: /create user/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/email is required/i);
      });
      expect(mockCreateUser).not.toHaveBeenCalled();
    });

    it('surfaces a 409 conflict as an "already exists" error', async () => {
      mockCreateUser.mockRejectedValue(new ApiError('Conflict', 409));

      render(<UserForm mode="create" onSuccess={onSuccess} onCancel={onCancel} />);

      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'existing@example.com' },
      });
      fireEvent.click(screen.getByRole('button', { name: /create user/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/already exists/i);
      });
    });

    it('Cancel fires onCancel', () => {
      render(<UserForm mode="create" onSuccess={onSuccess} onCancel={onCancel} />);
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('edit mode', () => {
    const user: AdminUserSummary = {
      id: 8,
      email: 'ken@x.com',
      displayName: 'Ken',
      status: 'INVITED',
      description: null,
    };

    it('prefills fields with an editable email, saves email + displayName + status + description, fires onSuccess', async () => {
      mockUpdateUser.mockResolvedValue({
        ...user,
        displayName: 'Kenneth',
        status: 'ACTIVE',
        description: 'A short bio',
      });

      render(<UserForm mode="edit" user={user} onSuccess={onSuccess} onCancel={onCancel} />);

      const emailInput = screen.getByLabelText('Email');
      expect(emailInput).toHaveValue('ken@x.com');
      expect(emailInput).not.toHaveAttribute('readonly');
      expect(screen.getByLabelText('Name')).toHaveValue('Ken');

      fireEvent.change(screen.getByLabelText('Name'), {
        target: { value: 'Kenneth' },
      });
      fireEvent.change(screen.getByLabelText(/status/i), {
        target: { value: 'ACTIVE' },
      });
      fireEvent.change(screen.getByLabelText(/description/i), {
        target: { value: 'A short bio' },
      });
      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(mockUpdateUser).toHaveBeenCalledWith(8, {
          email: 'ken@x.com',
          displayName: 'Kenneth',
          status: 'ACTIVE',
          description: 'A short bio',
        });
      });
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    // Membership behaviour is UserRolesSection's, and is covered there. What belongs to the form is
    // that edit mode mounts it for the user being edited — and that create mode does not, since
    // there is no user id to hang membership on until the account exists.
    it('mounts the roles section for the edited user', async () => {
      render(<UserForm mode="edit" user={user} onSuccess={onSuccess} onCancel={onCancel} />);

      await waitFor(() => expect(screen.getByRole('group', { name: 'Roles' })).toBeInTheDocument());
      expect(mockListUserRoles).toHaveBeenCalledWith(8);
    });

    it('omits the roles section in create mode', () => {
      render(<UserForm mode="create" onSuccess={onSuccess} onCancel={onCancel} />);

      expect(screen.queryByRole('group', { name: 'Roles' })).not.toBeInTheDocument();
      expect(mockListUserRoles).not.toHaveBeenCalled();
    });

    it('sends a changed email in the update payload and fires onSuccess', async () => {
      mockUpdateUser.mockResolvedValue({ ...user, email: 'kenneth@y.com' });

      render(<UserForm mode="edit" user={user} onSuccess={onSuccess} onCancel={onCancel} />);

      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'kenneth@y.com' },
      });
      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(mockUpdateUser).toHaveBeenCalledWith(8, {
          email: 'kenneth@y.com',
          displayName: 'Ken',
          status: 'INVITED',
          description: null,
        });
      });
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it('validates that email is required (no API call, inline error)', async () => {
      render(<UserForm mode="edit" user={user} onSuccess={onSuccess} onCancel={onCancel} />);

      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: '' } });
      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/email is required/i);
      });
      expect(mockUpdateUser).not.toHaveBeenCalled();
    });

    it('surfaces a 409 email conflict as an "already exists" error and does not fire onSuccess', async () => {
      mockUpdateUser.mockRejectedValue(new ApiError('Conflict', 409));

      render(<UserForm mode="edit" user={user} onSuccess={onSuccess} onCancel={onCancel} />);

      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'taken@x.com' },
      });
      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/already exists/i);
      });
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('Cancel fires onCancel', () => {
      render(<UserForm mode="edit" user={user} onSuccess={onSuccess} onCancel={onCancel} />);
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });
});
