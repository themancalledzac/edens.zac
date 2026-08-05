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
  // `jest.fn(() => Promise.resolve())` rather than `jest.fn().mockResolvedValue(undefined)`: an
  // untyped jest.fn() infers `unknown`, so tsc demands the argument, while eslint's
  // unicorn/no-useless-undefined auto-strips it — leaving `mockResolvedValue()`, which then fails
  // the type check. This form satisfies both. Same reasoning as SelectStar/SelectsContext tests.
  addUserToRole: jest.fn(() => Promise.resolve()),
  removeUserFromRole: jest.fn(() => Promise.resolve()),
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

  // The in-flight message is a live region, so a screen-reader user hears the wait instead of
  // silence. It used to be a bare <p>; the shared <LoadingText> is what carries the semantics.
  it('announces the in-flight read as a polite live region', async () => {
    let resolveUsers!: (users: AdminUserSummary[]) => void;
    mockListUsers.mockImplementation(
      () =>
        new Promise<AdminUserSummary[]>(resolve => {
          resolveUsers = resolve;
        })
    );

    render(<UserManagementPanel />);

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Loading users…');
    expect(status).toHaveAttribute('aria-live', 'polite');

    resolveUsers(USERS);
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
  });

  // The load-bearing one. `listUsers` throws on any non-OK response, so a catch-less refresh left
  // `users` at [] and told an admin whose backend was down that there were no users at all —
  // inviting them to create a duplicate of an account that already exists.
  it('shows a load failure, NOT the empty state, when the users read throws', async () => {
    mockListUsers.mockRejectedValue(new Error('Backend unreachable'));

    render(<UserManagementPanel />);

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/could not load users/i)
    );
    expect(screen.queryByText(/no users yet/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Loading users…')).not.toBeInTheDocument();
  });

  it('retries the read from the failure branch and renders the list on success', async () => {
    mockListUsers.mockRejectedValueOnce(new Error('Backend unreachable'));

    render(<UserManagementPanel />);

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());

    mockListUsers.mockResolvedValue(USERS);
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
