/**
 * Tests for the admin users page (Server Component).
 *
 * Mocks listUsers + the client GenerateInviteButton + PageShell, awaits the async component,
 * and asserts one row per user (with a generate action) and the empty state.
 */

import { render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';

jest.mock('@/app/lib/api/users', () => ({ listUsers: jest.fn() }));
jest.mock('@/app/components/ui/PageShell/PageShell', () => ({
  PageShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
jest.mock('@/app/(admin)/admin/users/GenerateInviteButton', () => ({
  GenerateInviteButton: ({ userId }: { userId: number }) => <button>generate-{userId}</button>,
}));

import AdminUsersPage from '@/app/(admin)/admin/users/page';
import { listUsers } from '@/app/lib/api/users';

const mockListUsers = listUsers as jest.MockedFunction<typeof listUsers>;

describe('AdminUsersPage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders a row per user with a generate action', async () => {
    mockListUsers.mockResolvedValue([
      { id: 1, email: 'a@x.com', displayName: 'Alice', status: 'ACTIVE' },
      { id: 2, email: 'b@x.com', displayName: null, status: 'INVITED' },
    ]);

    render(await AdminUsersPage());

    expect(screen.getByText('a@x.com')).toBeInTheDocument();
    expect(screen.getByText('b@x.com')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('INVITED')).toBeInTheDocument();
    expect(screen.getByText('generate-1')).toBeInTheDocument();
    expect(screen.getByText('generate-2')).toBeInTheDocument();
  });

  it('shows an empty state when there are no users', async () => {
    mockListUsers.mockResolvedValue([]);

    render(await AdminUsersPage());

    expect(screen.getByText(/no users yet/i)).toBeInTheDocument();
  });
});
