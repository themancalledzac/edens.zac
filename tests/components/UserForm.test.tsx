/**
 * Tests for UserForm — the reusable inline create/edit user form.
 *
 * Create mode: collects email + display name, calls createUser, shows the copyable invite link,
 * and "Done" fires onSuccess. Validation + 409 surface inline (role="alert").
 * Edit mode: prefills fields, locks email (readonly), saves displayName + status via updateUser,
 * and Cancel fires onCancel.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { UserForm } from '@/app/components/UserForm/UserForm';
import { ApiError } from '@/app/lib/api/core';
import * as usersApi from '@/app/lib/api/users';
import { type AdminUserSummary } from '@/app/types/User';

jest.mock('@/app/lib/api/users', () => ({
  createUser: jest.fn(),
  updateUser: jest.fn(),
  listUserCollections: jest.fn().mockResolvedValue([]),
  setUserCollectionRole: jest.fn().mockResolvedValue(null),
  removeUserCollection: jest.fn().mockResolvedValue(null),
}));

const mockCreateUser = usersApi.createUser as jest.MockedFunction<typeof usersApi.createUser>;
const mockUpdateUser = usersApi.updateUser as jest.MockedFunction<typeof usersApi.updateUser>;
const mockListUserCollections = usersApi.listUserCollections as jest.MockedFunction<
  typeof usersApi.listUserCollections
>;
const mockSetUserCollectionRole = usersApi.setUserCollectionRole as jest.MockedFunction<
  typeof usersApi.setUserCollectionRole
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
    };

    it('prefills fields, locks the email, saves displayName + status, fires onSuccess', async () => {
      mockUpdateUser.mockResolvedValue({ ...user, displayName: 'Kenneth', status: 'ACTIVE' });

      render(<UserForm mode="edit" user={user} onSuccess={onSuccess} onCancel={onCancel} />);

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveValue('ken@x.com');
      expect(emailInput).toHaveAttribute('readonly');
      expect(screen.getByLabelText(/display name/i)).toHaveValue('Ken');

      fireEvent.change(screen.getByLabelText(/display name/i), {
        target: { value: 'Kenneth' },
      });
      fireEvent.change(screen.getByLabelText(/status/i), {
        target: { value: 'ACTIVE' },
      });
      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(mockUpdateUser).toHaveBeenCalledWith(8, {
          displayName: 'Kenneth',
          status: 'ACTIVE',
        });
      });
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it('Cancel fires onCancel', () => {
      render(<UserForm mode="edit" user={user} onSuccess={onSuccess} onCancel={onCancel} />);
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('collection role select calls setUserCollectionRole and refreshes the list', async () => {
      mockListUserCollections.mockResolvedValue([
        { collectionId: 20, title: 'Portraits', role: null },
      ]);
      mockSetUserCollectionRole.mockResolvedValue();

      render(<UserForm mode="edit" user={user} onSuccess={onSuccess} onCancel={onCancel} />);

      // Wait for the collection row to appear (also silences the act() warning).
      await waitFor(() => {
        expect(screen.getByText('Portraits')).toBeInTheDocument();
      });

      // After the row renders, listUserCollections returns the updated state on refresh.
      mockListUserCollections.mockResolvedValue([
        { collectionId: 20, title: 'Portraits', role: 'CLIENT' },
      ]);

      const collectionSelect = screen.getByDisplayValue('No access');
      fireEvent.change(collectionSelect, { target: { value: 'CLIENT' } });

      await waitFor(() => {
        expect(mockSetUserCollectionRole).toHaveBeenCalledWith(8, 20, 'CLIENT');
      });
    });
  });
});
