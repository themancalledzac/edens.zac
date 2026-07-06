import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { MenuDropdown } from '@/app/components/MenuDropdown/MenuDropdown';
import * as authApi from '@/app/lib/api/auth';
import { type MeResponse } from '@/app/types/Auth';

const mockPush = jest.fn();
const mockRefresh = jest.fn();
let mockPathname = '/some-collection';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
  usePathname: () => mockPathname,
}));
// The real useFetchMe runs in these tests — only the api layer is mocked, so the
// menu's auth buttons reflect genuine hook behavior. The real AUTH_CHANGED_EVENT
// constant is passed through (also pinned in tests/lib/api/auth.test.ts).
jest.mock('@/app/lib/api/auth', () => ({
  AUTH_CHANGED_EVENT: (jest.requireActual('@/app/lib/api/auth') as { AUTH_CHANGED_EVENT: string })
    .AUTH_CHANGED_EVENT,
  me: jest.fn(),
  logout: jest.fn(),
}));
jest.mock('@/app/lib/actions/clearCache', () => ({ clearCacheAction: jest.fn() }));
jest.mock('@/app/utils/environment', () => ({
  isLocalEnvironment: () => false,
}));

const mockMe = authApi.me as jest.MockedFunction<typeof authApi.me>;
const mockLogout = authApi.logout as jest.MockedFunction<typeof authApi.logout>;

const principal: MeResponse = {
  email: 'a@b.com',
  isAdmin: false,
  mfaSatisfied: true,
  galleries: [],
};

const adminPrincipal: MeResponse = {
  email: 'admin@b.com',
  isAdmin: true,
  mfaSatisfied: true,
  galleries: [],
};

describe('MenuDropdown — auth actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = '/some-collection';
  });

  it('shows "Log out" when logged in and calls logout + redirects home', async () => {
    mockMe.mockResolvedValue(principal);
    mockLogout.mockResolvedValue();

    render(<MenuDropdown isOpen onClose={jest.fn()} />);

    const btn = await screen.findByRole('button', { name: /log out/i });
    expect(screen.queryByRole('button', { name: /log in/i })).not.toBeInTheDocument();

    fireEvent.click(btn);
    await waitFor(() => expect(mockLogout).toHaveBeenCalled());
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/'));
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('swaps "Log out" for "Log in" after logout without a remount', async () => {
    mockMe.mockResolvedValueOnce(principal).mockResolvedValue(null);
    // Mirror the real logout() contract: dispatch auth-changed on success.
    mockLogout.mockImplementation(async () => {
      window.dispatchEvent(new Event(authApi.AUTH_CHANGED_EVENT));
    });

    render(<MenuDropdown isOpen onClose={jest.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: /log out/i }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument()
    );
    expect(screen.queryByRole('button', { name: /log out/i })).not.toBeInTheDocument();
    expect(mockMe).toHaveBeenCalledTimes(2); // refetched, not remounted
    expect(mockPush).toHaveBeenCalledWith('/');
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('shows "Log in" when logged out and navigates to /login', async () => {
    mockMe.mockResolvedValue(null);

    render(<MenuDropdown isOpen onClose={jest.fn()} />);

    const btn = await screen.findByRole('button', { name: /log in/i });
    expect(screen.queryByRole('button', { name: /log out/i })).not.toBeInTheDocument();

    fireEvent.click(btn);
    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('shows neither auth button while me() is still resolving', () => {
    mockMe.mockReturnValue(new Promise<never>(() => {}));

    render(<MenuDropdown isOpen onClose={jest.fn()} />);

    expect(screen.queryByRole('button', { name: /log in/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /log out/i })).not.toBeInTheDocument();
  });

  it('shows "Home" off the home page and navigates to /', async () => {
    mockMe.mockResolvedValue(null);

    render(<MenuDropdown isOpen onClose={jest.fn()} />);
    await screen.findByRole('button', { name: /log in/i }); // settle the me() fetch

    fireEvent.click(screen.getByRole('button', { name: /^home$/i }));
    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('hides "Home" when already on the home page', async () => {
    mockMe.mockResolvedValue(null);
    mockPathname = '/';

    render(<MenuDropdown isOpen onClose={jest.fn()} />);
    await screen.findByRole('button', { name: /log in/i }); // settle the me() fetch

    expect(screen.queryByRole('button', { name: /^home$/i })).not.toBeInTheDocument();
  });
});

describe('MenuDropdown — admin item gating (isAdmin, not isLocalEnvironment)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = '/some-collection';
  });

  it('shows Explore/Create/Metadata/Comments for an isAdmin principal (prod-shaped: isLocalEnvironment mocked false)', async () => {
    mockMe.mockResolvedValue(adminPrincipal);

    render(<MenuDropdown isOpen onClose={jest.fn()} />);

    expect(await screen.findByRole('button', { name: 'Explore' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Metadata' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Comments' })).toBeInTheDocument();
  });

  it('shows Update only when pageType is "collection" for an isAdmin principal', async () => {
    mockMe.mockResolvedValue(adminPrincipal);

    render(
      <MenuDropdown isOpen onClose={jest.fn()} pageType="collection" collectionSlug="my-gallery" />
    );

    const updateBtn = await screen.findByRole('button', { name: 'Update' });
    fireEvent.click(updateBtn);
    expect(mockPush).toHaveBeenCalledWith('/my-gallery?manage=1');
  });

  it('hides Update when pageType is not "collection", even for an isAdmin principal', async () => {
    mockMe.mockResolvedValue(adminPrincipal);

    render(<MenuDropdown isOpen onClose={jest.fn()} pageType="default" />);
    await screen.findByRole('button', { name: 'Explore' }); // settle the me() fetch

    expect(screen.queryByRole('button', { name: 'Update' })).not.toBeInTheDocument();
  });

  it('hides Explore/Create/Update/Metadata/Comments for a logged-in non-admin principal', async () => {
    mockMe.mockResolvedValue(principal); // isAdmin: false

    render(
      <MenuDropdown isOpen onClose={jest.fn()} pageType="collection" collectionSlug="my-gallery" />
    );
    await screen.findByRole('button', { name: /log out/i }); // settle the me() fetch

    expect(screen.queryByRole('button', { name: 'Explore' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Update' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Metadata' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Comments' })).not.toBeInTheDocument();
  });

  it('hides Explore/Create/Update/Metadata/Comments for an anonymous (logged-out) viewer', async () => {
    mockMe.mockResolvedValue(null);

    render(
      <MenuDropdown isOpen onClose={jest.fn()} pageType="collection" collectionSlug="my-gallery" />
    );
    await screen.findByRole('button', { name: /log in/i }); // settle the me() fetch

    expect(screen.queryByRole('button', { name: 'Explore' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Update' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Metadata' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Comments' })).not.toBeInTheDocument();
  });

  it('hides Clear Cache for an isAdmin principal in a prod-shaped environment (isLocalEnvironment mocked false) — stays local-only even for real admins', async () => {
    mockMe.mockResolvedValue(adminPrincipal);

    render(<MenuDropdown isOpen onClose={jest.fn()} />);
    await screen.findByRole('button', { name: 'Explore' }); // settle the me() fetch; other admin items ARE visible

    expect(screen.queryByRole('button', { name: /clear cache/i })).not.toBeInTheDocument();
  });
});
