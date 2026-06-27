import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { MenuDropdown } from '@/app/components/MenuDropdown/MenuDropdown';
import { useMe } from '@/app/hooks/useMe';
import * as authApi from '@/app/lib/api/auth';

const mockPush = jest.fn();
const mockRefresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));
jest.mock('@/app/hooks/useMe', () => ({ useMe: jest.fn() }));
jest.mock('@/app/lib/api/auth', () => ({ logout: jest.fn() }));
jest.mock('@/app/lib/actions/clearCache', () => ({ clearCacheAction: jest.fn() }));
jest.mock('@/app/utils/environment', () => ({
  isLocalEnvironment: () => false,
}));

const mockUseMe = useMe as jest.MockedFunction<typeof useMe>;
const mockLogout = authApi.logout as jest.MockedFunction<typeof authApi.logout>;

function setMe(
  value: { email: string; mfaSatisfied: boolean; galleries: [] } | null,
  loading = false
) {
  mockUseMe.mockReturnValue({ me: value, loading, refresh: jest.fn() });
}

describe('MenuDropdown — auth actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows "Log out" when logged in and calls logout + redirects home', async () => {
    setMe({ email: 'a@b.com', mfaSatisfied: true, galleries: [] });
    mockLogout.mockResolvedValue();

    render(<MenuDropdown isOpen onClose={jest.fn()} />);

    const btn = screen.getByRole('button', { name: /log out/i });
    expect(btn).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /log in/i })).not.toBeInTheDocument();

    fireEvent.click(btn);
    await waitFor(() => expect(mockLogout).toHaveBeenCalled());
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/'));
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('shows "Log in" when logged out and navigates to /login', () => {
    setMe(null);

    render(<MenuDropdown isOpen onClose={jest.fn()} />);

    const btn = screen.getByRole('button', { name: /log in/i });
    expect(btn).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /log out/i })).not.toBeInTheDocument();

    fireEvent.click(btn);
    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('shows neither while loading', () => {
    setMe(null, true);

    render(<MenuDropdown isOpen onClose={jest.fn()} />);

    expect(screen.queryByRole('button', { name: /log in/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /log out/i })).not.toBeInTheDocument();
  });
});
