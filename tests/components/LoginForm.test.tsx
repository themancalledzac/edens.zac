import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import * as authApi from '@/app/lib/api/auth';
import { ApiError } from '@/app/lib/api/core';
import LoginForm from '@/app/login/LoginForm';

const mockPush = jest.fn();
const mockRefresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));
jest.mock('@/app/lib/api/auth', () => ({
  login: jest.fn(),
  loginWithPasskey: jest.fn(),
}));

const mockLogin = authApi.login as jest.MockedFunction<typeof authApi.login>;
const mockLoginWithPasskey = authApi.loginWithPasskey as jest.MockedFunction<
  typeof authApi.loginWithPasskey
>;

const EMAIL_PLACEHOLDER = 'you@example.com';
const PASSWORD_PLACEHOLDER = 'Your password';

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requires email and password before calling login', async () => {
    render(<LoginForm />);
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/email is required/i));
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('calls login and redirects to /user on success', async () => {
    mockLogin.mockResolvedValue();
    render(<LoginForm />);

    fireEvent.change(screen.getByPlaceholderText(EMAIL_PLACEHOLDER), {
      target: { value: 'a@b.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(PASSWORD_PLACEHOLDER), {
      target: { value: 'pw123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('a@b.com', 'pw123456'));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/user'));
  });

  it('maps a 401 to an "Incorrect email or password" message', async () => {
    mockLogin.mockRejectedValue(new ApiError('Unauthorized', 401));
    render(<LoginForm />);

    fireEvent.change(screen.getByPlaceholderText(EMAIL_PLACEHOLDER), {
      target: { value: 'a@b.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(PASSWORD_PLACEHOLDER), {
      target: { value: 'wrong' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/incorrect email or password/i)
    );
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('passkey button is disabled until an email is entered, then calls loginWithPasskey', async () => {
    mockLoginWithPasskey.mockResolvedValue();
    render(<LoginForm />);

    const passkeyBtn = screen.getByRole('button', { name: /face \/ touch id/i });
    expect(passkeyBtn).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText(EMAIL_PLACEHOLDER), {
      target: { value: 'a@b.com' },
    });
    expect(passkeyBtn).toBeEnabled();

    fireEvent.click(passkeyBtn);
    await waitFor(() => expect(mockLoginWithPasskey).toHaveBeenCalledWith('a@b.com'));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/user'));
  });

  /** Drive the passkey button with a pre-filled email and a rejecting loginWithPasskey. */
  async function failPasskeySignIn(rejection: unknown): Promise<void> {
    mockLoginWithPasskey.mockRejectedValue(rejection);
    render(<LoginForm />);

    fireEvent.change(screen.getByPlaceholderText(EMAIL_PLACEHOLDER), {
      target: { value: 'a@b.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /face \/ touch id/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(mockPush).not.toHaveBeenCalled();
  }

  it('maps a passkey NotAllowedError to no-passkey guidance, not a generic failure', async () => {
    await failPasskeySignIn(new DOMException('ceremony dismissed', 'NotAllowedError'));

    expect(screen.getByRole('alert')).toHaveTextContent(/no passkey was used/i);
    expect(screen.getByRole('alert')).toHaveTextContent(/add face \/ touch id from your account/i);
  });

  it('maps a passkey SecurityError to an availability message', async () => {
    await failPasskeySignIn(new DOMException('invalid rp id', 'SecurityError'));

    expect(screen.getByRole('alert')).toHaveTextContent(/isn't available right now/i);
  });

  it('maps a passkey 429 to the 15-minute rate-limit message', async () => {
    await failPasskeySignIn(new ApiError('Too many attempts', 429));

    expect(screen.getByRole('alert')).toHaveTextContent(/wait about 15 minutes/i);
  });

  it('maps a passkey 401 to ceremony copy that never says "password"', async () => {
    await failPasskeySignIn(new ApiError('Unauthorized', 401));

    expect(screen.getByRole('alert')).toHaveTextContent(/passkey sign-in didn't complete/i);
    expect(screen.getByRole('alert')).not.toHaveTextContent(/password/i);
  });

  it('maps a password 429 to the 15-minute rate-limit message', async () => {
    mockLogin.mockRejectedValue(new ApiError('Too many attempts', 429));
    render(<LoginForm />);

    fireEvent.change(screen.getByPlaceholderText(EMAIL_PLACEHOLDER), {
      target: { value: 'a@b.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(PASSWORD_PLACEHOLDER), {
      target: { value: 'pw123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/wait about 15 minutes/i)
    );
    expect(mockPush).not.toHaveBeenCalled();
  });
});
