/**
 * Tests for CreateUserModal.
 *
 * Covers: open/close rendering, validation, successful submit shows the invite link
 * with a Copy button, and error display on API failure.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import CreateUserModal from '@/app/components/CreateUserModal/CreateUserModal';
import { ApiError } from '@/app/lib/api/core';
import * as usersApi from '@/app/lib/api/users';

jest.mock('@/app/lib/api/users', () => ({
  createUser: jest.fn(),
}));

const mockCreateUser = usersApi.createUser as jest.MockedFunction<typeof usersApi.createUser>;

// jsdom does not implement navigator.clipboard — stub it.
Object.defineProperty(global.navigator, 'clipboard', {
  value: { writeText: jest.fn().mockResolvedValue(undefined) },
  writable: true,
});

describe('CreateUserModal', () => {
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when open=false', () => {
    render(<CreateUserModal open={false} onClose={onClose} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the form when open=true', () => {
    render(<CreateUserModal open onClose={onClose} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create user/i })).toBeInTheDocument();
  });

  it('shows a validation error when email is empty', async () => {
    render(<CreateUserModal open onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /create user/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  it('calls createUser and shows the returned invite link on success', async () => {
    mockCreateUser.mockResolvedValue({
      userId: 7,
      inviteUrl: 'http://localhost:3000/invite/abc123',
    });

    render(<CreateUserModal open onClose={onClose} />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'client@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create user/i }));

    await waitFor(() => {
      expect(screen.getByText('http://localhost:3000/invite/abc123')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
  });

  it('copies the invite link when the Copy button is clicked', async () => {
    mockCreateUser.mockResolvedValue({
      userId: 7,
      inviteUrl: 'http://localhost:3000/invite/abc123',
    });

    render(<CreateUserModal open onClose={onClose} />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'client@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create user/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /copy/i }));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'http://localhost:3000/invite/abc123'
      );
    });
  });

  it('shows an error message on API failure', async () => {
    mockCreateUser.mockRejectedValue(new ApiError('Conflict', 409));

    render(<CreateUserModal open onClose={onClose} />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'existing@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create user/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('disables the submit button while the request is in-flight', async () => {
    let resolve!: (v: { userId: number; inviteUrl: string }) => void;
    mockCreateUser.mockImplementation(
      () =>
        new Promise(r => {
          resolve = r;
        })
    );

    render(<CreateUserModal open onClose={onClose} />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'client@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create user/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled();
    });

    resolve({ userId: 1, inviteUrl: 'http://localhost:3000/invite/tok' });
  });
});
