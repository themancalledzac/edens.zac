import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { MenuDropdown } from '@/app/components/MenuDropdown/MenuDropdown';
import { useFetchMe } from '@/app/hooks/useFetchMe';
import * as authApi from '@/app/lib/api/auth';

const mockPush = jest.fn();
const mockRefresh = jest.fn();
let mockPathname = '/some-collection';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
  usePathname: () => mockPathname,
}));
jest.mock('@/app/hooks/useFetchMe', () => ({ useFetchMe: jest.fn() }));
jest.mock('@/app/lib/api/auth', () => ({ logout: jest.fn() }));
jest.mock('@/app/lib/actions/clearCache', () => ({ clearCacheAction: jest.fn() }));
jest.mock('@/app/utils/environment', () => ({
  isLocalEnvironment: () => false,
}));

const mockUseFetchMe = useFetchMe as jest.MockedFunction<typeof useFetchMe>;
const mockLogout = authApi.logout as jest.MockedFunction<typeof authApi.logout>;

function setMe(
  value: { email: string; mfaSatisfied: boolean; galleries: [] } | null,
  loading = false
) {
  mockUseFetchMe.mockReturnValue({ me: value, loading });
}

describe('MenuDropdown — auth actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = '/some-collection';
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

  it('shows "Home" off the home page and navigates to /', () => {
    setMe(null);

    render(<MenuDropdown isOpen onClose={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /^home$/i }));
    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('hides "Home" when already on the home page', () => {
    setMe(null);
    mockPathname = '/';

    render(<MenuDropdown isOpen onClose={jest.fn()} />);

    expect(screen.queryByRole('button', { name: /^home$/i })).not.toBeInTheDocument();
  });
});
