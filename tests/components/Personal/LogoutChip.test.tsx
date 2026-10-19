import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { LogoutChip } from '@/app/components/Personal/LogoutChip';
import * as authApi from '@/app/lib/api/auth';

const mockPush = jest.fn();
const mockRefresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));
jest.mock('@/app/lib/api/auth', () => ({ logout: jest.fn() }));

const mockLogout = authApi.logout as jest.MockedFunction<typeof authApi.logout>;

describe('LogoutChip', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs out and sends the viewer home', async () => {
    mockLogout.mockResolvedValue();
    render(<LogoutChip />);

    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));

    await waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/'));
    expect(mockRefresh).toHaveBeenCalled();
  });
});
