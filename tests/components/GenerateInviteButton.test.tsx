/**
 * Tests for GenerateInviteButton — the per-user admin "resend / reset" action.
 *
 * Mocks regenerateInvite; verifies the label adapts to status, the click calls the API
 * with the user id and surfaces the copyable link, and a 404 shows a clear error.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { GenerateInviteButton } from '@/app/(admin)/admin/users/GenerateInviteButton';
import { ApiError } from '@/app/lib/api/core';
import * as usersApi from '@/app/lib/api/users';

jest.mock('@/app/lib/api/users', () => ({
  regenerateInvite: jest.fn(),
}));

const mockRegenerateInvite = usersApi.regenerateInvite as jest.MockedFunction<
  typeof usersApi.regenerateInvite
>;

// jsdom does not implement navigator.clipboard — stub it (InviteLinkResult uses it).
Object.defineProperty(global.navigator, 'clipboard', {
  value: { writeText: jest.fn(() => Promise.resolve()) },
  writable: true,
});

describe('GenerateInviteButton', () => {
  beforeEach(() => jest.clearAllMocks());

  it('labels the trigger "Resend invite" for an INVITED user', () => {
    render(<GenerateInviteButton userId={5} email="bob@example.com" status="INVITED" />);
    expect(screen.getByRole('button', { name: /resend invite/i })).toBeInTheDocument();
  });

  it('labels the trigger "Reset password link" for an ACTIVE user', () => {
    render(<GenerateInviteButton userId={9} email="amy@example.com" status="ACTIVE" />);
    expect(screen.getByRole('button', { name: /reset password link/i })).toBeInTheDocument();
  });

  it('calls regenerateInvite with the user id and shows the fresh link', async () => {
    mockRegenerateInvite.mockResolvedValue({
      userId: 5,
      inviteUrl: 'http://localhost:3000/invite/fresh',
    });

    render(<GenerateInviteButton userId={5} email="bob@example.com" status="INVITED" />);
    fireEvent.click(screen.getByRole('button', { name: /resend invite/i }));

    await waitFor(() => expect(mockRegenerateInvite).toHaveBeenCalledWith(5));
    await waitFor(() => {
      expect(screen.getByText('http://localhost:3000/invite/fresh')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
  });

  it('shows a clear error when the user no longer exists (404)', async () => {
    mockRegenerateInvite.mockRejectedValue(new ApiError('Not Found', 404));

    render(<GenerateInviteButton userId={5} email="bob@example.com" status="INVITED" />);
    fireEvent.click(screen.getByRole('button', { name: /resend invite/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/no longer exists/i);
    });
  });
});
