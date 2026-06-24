/**
 * Tests for InviteForm — the client-side onboarding form on the public invite page.
 *
 * Mirrors the ClientGalleryGate test style: mock the API helpers
 * (`acceptInvite`, `registerPasskey`) and `useRouter` from next/navigation,
 * then drive the form through validation, the happy path, the non-blocking
 * passkey-failure path, and the expired-token error path.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import InviteForm from '@/app/invite/[token]/InviteForm';
import * as authApi from '@/app/lib/api/auth';
import { ApiError } from '@/app/lib/api/core';
import * as usersApi from '@/app/lib/api/users';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/app/lib/api/users', () => ({
  acceptInvite: jest.fn(),
}));

jest.mock('@/app/lib/api/auth', () => ({
  registerPasskey: jest.fn(),
}));

const mockAcceptInvite = usersApi.acceptInvite as jest.MockedFunction<typeof usersApi.acceptInvite>;
const mockRegisterPasskey = authApi.registerPasskey as jest.MockedFunction<
  typeof authApi.registerPasskey
>;

const PASSWORD_PLACEHOLDER = 'Choose a password';
const CONFIRM_PLACEHOLDER = 'Repeat your password';
const PASSKEY_LABEL = /enable face \/ touch id/i;

function renderForm(displayName: string | null = 'Jane') {
  return render(
    <InviteForm token="tok-123" email="client@example.com" displayName={displayName} />
  );
}

describe('InviteForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a validation error and does not submit when the display name is empty', async () => {
    renderForm(null);

    // Display name starts empty (displayName prop is null); fill only the passwords.
    fireEvent.change(screen.getByPlaceholderText(PASSWORD_PLACEHOLDER), {
      target: { value: 'pw12345' },
    });
    fireEvent.change(screen.getByPlaceholderText(CONFIRM_PLACEHOLDER), {
      target: { value: 'pw12345' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/display name is required/i);
    });
    expect(mockAcceptInvite).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('shows a mismatch error and does not submit when password !== confirm', async () => {
    renderForm();

    fireEvent.change(screen.getByPlaceholderText(PASSWORD_PLACEHOLDER), {
      target: { value: 'pw12345' },
    });
    fireEvent.change(screen.getByPlaceholderText(CONFIRM_PLACEHOLDER), {
      target: { value: 'different' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/passwords do not match/i);
    });
    expect(mockAcceptInvite).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('calls acceptInvite with {displayName, password} and redirects to /user on success', async () => {
    mockAcceptInvite.mockResolvedValue();

    renderForm('Jane');

    fireEvent.change(screen.getByPlaceholderText(PASSWORD_PLACEHOLDER), {
      target: { value: 'pw12345' },
    });
    fireEvent.change(screen.getByPlaceholderText(CONFIRM_PLACEHOLDER), {
      target: { value: 'pw12345' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockAcceptInvite).toHaveBeenCalledWith('tok-123', {
        displayName: 'Jane',
        password: 'pw12345',
      });
    });
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/user');
    });
    // Passkey was not opted in, so registerPasskey must not run.
    expect(mockRegisterPasskey).not.toHaveBeenCalled();
  });

  it('still redirects to /user when passkey is opted-in but registerPasskey throws', async () => {
    mockAcceptInvite.mockResolvedValue();
    mockRegisterPasskey.mockRejectedValue(new Error('user cancelled'));

    renderForm('Jane');

    fireEvent.change(screen.getByPlaceholderText(PASSWORD_PLACEHOLDER), {
      target: { value: 'pw12345' },
    });
    fireEvent.change(screen.getByPlaceholderText(CONFIRM_PLACEHOLDER), {
      target: { value: 'pw12345' },
    });
    fireEvent.click(screen.getByLabelText(PASSKEY_LABEL));
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockRegisterPasskey).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/user');
    });
  });

  it('shows an expired/invalid message and does not redirect on ApiError(410)', async () => {
    mockAcceptInvite.mockRejectedValue(new ApiError('Gone', 410));

    renderForm('Jane');

    fireEvent.change(screen.getByPlaceholderText(PASSWORD_PLACEHOLDER), {
      target: { value: 'pw12345' },
    });
    fireEvent.change(screen.getByPlaceholderText(CONFIRM_PLACEHOLDER), {
      target: { value: 'pw12345' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/already been used/i);
    });
    expect(mockPush).not.toHaveBeenCalled();
  });
});
