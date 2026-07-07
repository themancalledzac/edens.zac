/**
 * Tests for AccountCard — the /user account block with the passkey (Face / Touch ID)
 * enrollment affordance.
 *
 * Mirrors the LoginForm test style: mock `registerPasskey` from the auth API and
 * drive the button through the pending, success, and per-cause failure states.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { AccountCard } from '@/app/components/Personal/AccountCard';
import * as authApi from '@/app/lib/api/auth';
import { ApiError } from '@/app/lib/api/core';

jest.mock('@/app/lib/api/auth', () => ({
  registerPasskey: jest.fn(),
}));

const mockRegisterPasskey = authApi.registerPasskey as jest.MockedFunction<
  typeof authApi.registerPasskey
>;

const EMAIL = 'client@example.com';
const ADD_BUTTON = /add face \/ touch id/i;

describe('AccountCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the signed-in email and the enrollment button', () => {
    render(<AccountCard email={EMAIL} />);

    expect(screen.getByText(EMAIL)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: ADD_BUTTON })).toBeEnabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('disables the button while the ceremony is pending, then shows success', async () => {
    let resolveCeremony!: () => void;
    mockRegisterPasskey.mockReturnValue(
      new Promise<void>(resolve => {
        resolveCeremony = resolve;
      })
    );
    render(<AccountCard email={EMAIL} />);

    const button = screen.getByRole('button', { name: ADD_BUTTON });
    fireEvent.click(button);

    expect(mockRegisterPasskey).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(button).toBeDisabled());

    resolveCeremony();
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(/face \/ touch id added/i)
    );
    expect(button).toBeEnabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows dismissal guidance when the browser ceremony throws NotAllowedError', async () => {
    mockRegisterPasskey.mockRejectedValue(new DOMException('dismissed', 'NotAllowedError'));
    render(<AccountCard email={EMAIL} />);

    fireEvent.click(screen.getByRole('button', { name: ADD_BUTTON }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/wasn't saved.*try again/i)
    );
    expect(screen.getByRole('button', { name: ADD_BUTTON })).toBeEnabled();
  });

  it('shows an availability message when the ceremony throws SecurityError', async () => {
    mockRegisterPasskey.mockRejectedValue(new DOMException('bad rp id', 'SecurityError'));
    render(<AccountCard email={EMAIL} />);

    fireEvent.click(screen.getByRole('button', { name: ADD_BUTTON }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/isn't available right now/i)
    );
  });

  it('shows a session message on ApiError 401', async () => {
    mockRegisterPasskey.mockRejectedValue(new ApiError('Unauthorized', 401));
    render(<AccountCard email={EMAIL} />);

    fireEvent.click(screen.getByRole('button', { name: ADD_BUTTON }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/session has expired/i)
    );
  });

  it('shows a generic failure message for unrecognized errors and clears it on retry', async () => {
    mockRegisterPasskey.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce();
    render(<AccountCard email={EMAIL} />);

    fireEvent.click(screen.getByRole('button', { name: ADD_BUTTON }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/couldn't be saved/i));

    fireEvent.click(screen.getByRole('button', { name: ADD_BUTTON }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(/face \/ touch id added/i)
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
