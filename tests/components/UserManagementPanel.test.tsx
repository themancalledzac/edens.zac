/**
 * Tests for UserManagementPanel — the tall in-place admin panel that swaps its body between a user
 * list, a create form, and an edit form.
 *
 * Mocks next/navigation (router.push), the users API (list/create/update/regenerate), and stubs
 * the clipboard (InviteLinkResult / GenerateInviteButton use it).
 */

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { UserManagementPanel } from '@/app/components/UserManagementPanel/UserManagementPanel';
import * as usersApi from '@/app/lib/api/users';
import { type AdminUserSummary } from '@/app/types/User';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/app/lib/api/users', () => ({
  listUsers: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
  regenerateInvite: jest.fn(),
}));

// The edit form (UserForm) now reads role membership, not per-user collection grants.
jest.mock('@/app/lib/api/roles', () => ({
  listUserRoles: jest.fn().mockResolvedValue([]),
  listRoles: jest.fn().mockResolvedValue([]),
  addUserToRole: jest.fn().mockResolvedValue(undefined),
  removeUserFromRole: jest.fn().mockResolvedValue(undefined),
}));

const mockListUsers = usersApi.listUsers as jest.MockedFunction<typeof usersApi.listUsers>;

// jsdom does not implement navigator.clipboard — stub it.
Object.defineProperty(global.navigator, 'clipboard', {
  value: { writeText: jest.fn(() => Promise.resolve()) },
  writable: true,
});

const USERS: AdminUserSummary[] = [
  { id: 1, email: 'alice@x.com', displayName: 'Alice', status: 'ACTIVE', description: null },
  { id: 2, email: 'bob@x.com', displayName: null, status: 'INVITED', description: null },
];

describe('UserManagementPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListUsers.mockResolvedValue(USERS);
  });

  it('lists users with name, email, and status', async () => {
    render(<UserManagementPanel />);

    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    expect(screen.getByText('alice@x.com')).toBeInTheDocument();
    expect(screen.getByText('bob@x.com')).toBeInTheDocument();
    expect(screen.getByText('INVITED')).toBeInTheDocument();
  });

  it('"+ New User" opens the create form; Cancel returns to the list', async () => {
    render(<UserManagementPanel />);
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /new user/i }));
    expect(screen.getByRole('button', { name: /create user/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
  });

  it('clicking a row body navigates to the user detail page', async () => {
    render(<UserManagementPanel />);
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /alice/i }));
    expect(mockPush).toHaveBeenCalledWith('/admin/users/1');
  });

  it('row "Update" opens edit mode without navigating', async () => {
    render(<UserManagementPanel />);
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());

    // Scope to Alice's row so the Update button is unambiguous (and type-safe).
    const aliceRow = screen.getByText('Alice').closest('li') as HTMLElement;
    fireEvent.click(within(aliceRow).getByRole('button', { name: /update/i }));

    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('shows an empty state when there are no users', async () => {
    mockListUsers.mockResolvedValue([]);
    render(<UserManagementPanel />);

    await waitFor(() => expect(screen.getByText(/no users yet/i)).toBeInTheDocument());
  });
});
