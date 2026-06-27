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
});
