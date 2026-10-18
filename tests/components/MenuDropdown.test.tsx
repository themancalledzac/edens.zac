/**
 * Every case awaits a control that only renders once `me()` has resolved (Log in, Log out, or a
 * nav link) before asserting, so the fetch has settled and nothing races the assertions.
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import Link from 'next/link';

import { MenuDropdown } from '@/app/components/MenuDropdown/MenuDropdown';
import { clearCacheAction } from '@/app/lib/actions/clearCache';
import * as authApi from '@/app/lib/api/auth';
import { type MeResponse } from '@/app/types/Auth';

const mockPush = jest.fn();
const mockRefresh = jest.fn();
let mockPathname = '/some-collection';
let mockIsLocal = false;
let mockForceMountFetch = false;

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
  usePathname: () => mockPathname,
}));
jest.mock('@/app/lib/api/auth', () => ({
  AUTH_CHANGED_EVENT: (jest.requireActual('@/app/lib/api/auth') as { AUTH_CHANGED_EVENT: string })
    .AUTH_CHANGED_EVENT,
  me: jest.fn(),
  logout: jest.fn(),
}));
jest.mock('@/app/hooks/useFetchMe', () => {
  const actual = jest.requireActual<{
    useFetchMe: (options?: { initialMe?: unknown; enabled?: boolean }) => unknown;
  }>('@/app/hooks/useFetchMe');
  return {
    ...actual,
    useFetchMe: (options?: { initialMe?: unknown; enabled?: boolean }) =>
      actual.useFetchMe(mockForceMountFetch ? { enabled: true } : options),
  };
});
jest.mock('@/app/lib/actions/clearCache', () => ({ clearCacheAction: jest.fn() }));
jest.mock('@/app/utils/environment', () => ({
  isLocalEnvironment: () => mockIsLocal,
}));

const mockMe = authApi.me as jest.MockedFunction<typeof authApi.me>;
const mockLogout = authApi.logout as jest.MockedFunction<typeof authApi.logout>;
const mockClearCache = clearCacheAction as jest.MockedFunction<typeof clearCacheAction>;

const principal: MeResponse = {
  email: 'a@b.com',
  isAdmin: false,
  mfaSatisfied: true,
  passkeyCount: 0,
  galleries: [],
};

const adminPrincipal: MeResponse = {
  email: 'admin@b.com',
  isAdmin: true,
  mfaSatisfied: true,
  passkeyCount: 0,
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

  /**
   * The admin panels cache every user's email address and the full text of every contact message
   * in localStorage. None of that may outlive the session that fetched it, least of all on a
   * shared browser — and the clear has to sweep the whole `adminPanel:v1:` prefix, since a logout
   * from a page load that never opened /admin has nothing in the in-memory cache to drive it.
   */
  it('clears cached admin panel data on logout', async () => {
    mockMe.mockResolvedValue(adminPrincipal);
    mockLogout.mockResolvedValue();
    window.localStorage.setItem('adminPanel:v1:users:base', '[{"id":1}]');
    window.localStorage.setItem('adminPanel:v1:messages', '{"messages":[],"total":0}');
    window.localStorage.setItem('unrelated', 'keep me');

    render(<MenuDropdown isOpen onClose={jest.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: /log out/i }));

    await waitFor(() => expect(window.localStorage.getItem('adminPanel:v1:users:base')).toBeNull());
    expect(window.localStorage.getItem('adminPanel:v1:messages')).toBeNull();
    expect(window.localStorage.getItem('unrelated')).toBe('keep me');
  });

  /**
   * Logout is best-effort — the component navigates away whether or not the call succeeded, since
   * the cookie may already be gone. The cache clear has to follow that same rule: a failed logout
   * that left the data sitting there would be the worst of both.
   */
  it('clears cached admin panel data even when logout fails', async () => {
    mockMe.mockResolvedValue(adminPrincipal);
    mockLogout.mockRejectedValue(new Error('network down'));
    window.localStorage.setItem('adminPanel:v1:roles', '[{"id":1,"name":"a"}]');

    render(<MenuDropdown isOpen onClose={jest.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: /log out/i }));

    await waitFor(() => expect(window.localStorage.getItem('adminPanel:v1:roles')).toBeNull());
  });

  it('swaps "Log out" for "Log in" after logout without a remount', async () => {
    mockMe.mockResolvedValueOnce(principal).mockResolvedValue(null);
    mockLogout.mockImplementation(async () => {
      window.dispatchEvent(new Event(authApi.AUTH_CHANGED_EVENT));
    });

    render(<MenuDropdown isOpen onClose={jest.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: /log out/i }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument()
    );
    expect(screen.queryByRole('button', { name: /log out/i })).not.toBeInTheDocument();
    expect(mockMe).toHaveBeenCalledTimes(2);
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
});

describe('MenuDropdown — destinations are links, actions are buttons', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = '/some-collection';
  });

  it('renders every public destination as an anchor carrying its href', async () => {
    mockMe.mockResolvedValue(null);

    render(<MenuDropdown isOpen onClose={jest.fn()} />);
    await screen.findByRole('button', { name: /log in/i });

    expect(screen.queryByRole('link', { name: 'Home' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explore' })).toHaveAttribute('href', '/explore');
    expect(screen.getByRole('link', { name: 'Collections' })).toHaveAttribute(
      'href',
      '/collections'
    );
  });

  it('renders every admin destination as an anchor carrying its href', async () => {
    mockMe.mockResolvedValue(adminPrincipal);

    render(
      <MenuDropdown isOpen onClose={jest.fn()} isCollectionPage collectionSlug="my-gallery" />
    );

    expect(await screen.findByRole('link', { name: 'Create' })).toHaveAttribute(
      'href',
      '/collection/manage'
    );
    expect(screen.getByRole('link', { name: 'Update' })).toHaveAttribute(
      'href',
      '/my-gallery?manage=1'
    );
    expect(screen.getByRole('link', { name: 'Metadata' })).toHaveAttribute('href', '/metadata');
    expect(screen.getByRole('link', { name: 'Comments' })).toHaveAttribute('href', '/comments');
    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
  });

  it('falls back to the create surface when Update has no collection slug', async () => {
    mockMe.mockResolvedValue(adminPrincipal);

    render(<MenuDropdown isOpen onClose={jest.fn()} isCollectionPage />);

    expect(await screen.findByRole('link', { name: 'Update' })).toHaveAttribute(
      'href',
      '/collection/manage'
    );
  });

  it('closes the menu when a destination link is followed', async () => {
    mockMe.mockResolvedValue(null);
    const onClose = jest.fn();

    render(<MenuDropdown isOpen onClose={onClose} />);
    await screen.findByRole('button', { name: /log in/i });

    fireEvent.click(screen.getByRole('link', { name: 'Collections' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('keeps genuine actions as buttons, never links', async () => {
    mockMe.mockResolvedValue(principal);

    render(<MenuDropdown isOpen onClose={jest.fn()} />);
    await screen.findByRole('button', { name: /log out/i });

    expect(screen.getByRole('button', { name: 'About' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Contact' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /log out/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'About' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Contact' })).not.toBeInTheDocument();
  });

  it('renders the social entries as external anchors, not window.open buttons', async () => {
    mockMe.mockResolvedValue(null);
    const onClose = jest.fn();

    render(<MenuDropdown isOpen onClose={onClose} />);
    await screen.findByRole('button', { name: /log in/i });

    const instagram = screen.getByRole('link', { name: 'Visit Instagram' });
    const github = screen.getByRole('link', { name: 'Visit GitHub' });

    expect(instagram).toHaveAttribute('href', 'https://instagram.com/themancalledzac');
    expect(instagram).toHaveAttribute('target', '_blank');
    expect(instagram).toHaveAttribute('rel', 'noopener noreferrer');
    expect(github).toHaveAttribute('href', 'https://github.com/themancalledzac');
    expect(github).toHaveAttribute('target', '_blank');
    expect(github).toHaveAttribute('rel', 'noopener noreferrer');

    expect(screen.queryByRole('button', { name: 'Visit Instagram' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Visit GitHub' })).not.toBeInTheDocument();
  });
});

describe('MenuDropdown — About disclosure and Contact row', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = '/some-collection';
  });

  it('exposes aria-expanded on About and wires aria-controls to the panel once open', async () => {
    mockMe.mockResolvedValue(null);

    render(<MenuDropdown isOpen onClose={jest.fn()} />);
    await screen.findByRole('button', { name: /log in/i });

    const about = screen.getByRole('button', { name: 'About' });
    expect(about).toHaveAttribute('aria-expanded', 'false');
    expect(about).not.toHaveAttribute('aria-controls');

    fireEvent.click(about);

    expect(about).toHaveAttribute('aria-expanded', 'true');
    const panelId = about.getAttribute('aria-controls');
    expect(panelId).toBeTruthy();
    expect(document.getElementById(panelId!)).not.toBeNull();
  });

  it('opens the contact dialog from the Contact row, closes the menu and locks the email', async () => {
    mockMe.mockResolvedValue(principal);
    const onClose = jest.fn();

    render(<MenuDropdown isOpen onClose={onClose} />);
    await screen.findByRole('button', { name: /log out/i });

    expect(screen.queryByPlaceholderText('Your message')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Contact' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('heading', { name: 'Contact the Photographer' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Your message')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Your email')).not.toBeInTheDocument();
  });

  it('keeps the contact dialog mounted after the menu closes', async () => {
    mockMe.mockResolvedValue(null);

    const { rerender } = render(<MenuDropdown isOpen onClose={jest.fn()} />);
    await screen.findByRole('button', { name: /log in/i });
    fireEvent.click(screen.getByRole('button', { name: 'Contact' }));
    rerender(<MenuDropdown isOpen={false} onClose={jest.fn()} />);

    expect(screen.getByRole('heading', { name: 'Contact the Photographer' })).toBeInTheDocument();
  });
});

describe('MenuDropdown — click outside and scrim', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = '/some-collection';
  });

  it('closes on a mousedown outside at any width', async () => {
    mockMe.mockResolvedValue(null);
    const onClose = jest.fn();
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 400 });

    render(<MenuDropdown isOpen onClose={onClose} />);
    await screen.findByRole('button', { name: /log in/i });
    fireEvent.mouseDown(document.body);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ignores a mousedown inside the bottom bar', async () => {
    mockMe.mockResolvedValue(null);
    const onClose = jest.fn();

    render(
      <>
        <nav data-bottom-nav>
          <button type="button">Bar Menu</button>
        </nav>
        <MenuDropdown isOpen onClose={onClose} />
      </>
    );
    await screen.findByRole('button', { name: /log in/i });
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Bar Menu' }));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes when the scrim is clicked', async () => {
    mockMe.mockResolvedValue(null);
    const onClose = jest.fn();

    const { container } = render(<MenuDropdown isOpen onClose={onClose} />);
    await screen.findByRole('button', { name: /log in/i });
    fireEvent.click(container.querySelector('[aria-hidden="true"]')!);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('MenuDropdown — focus management', () => {
  function Harness({ open, onClose }: { open: boolean; onClose: () => void }) {
    return (
      <>
        <button type="button" data-testid="trigger">
          Menu
        </button>
        <MenuDropdown isOpen={open} onClose={onClose} />
      </>
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = '/some-collection';
    mockMe.mockResolvedValue(null);
  });

  it('is a labelled modal dialog', async () => {
    render(<MenuDropdown isOpen onClose={jest.fn()} />);
    await screen.findByRole('button', { name: /log in/i });

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('Site navigation');
  });

  it('moves focus into the overlay on open', async () => {
    const { rerender } = render(<Harness open={false} onClose={jest.fn()} />);
    const trigger = screen.getByTestId('trigger');
    trigger.focus();
    expect(trigger).toHaveFocus();

    rerender(<Harness open onClose={jest.fn()} />);
    await screen.findByRole('button', { name: /log in/i });

    expect(screen.getByRole('dialog')).toHaveFocus();
  });

  it('returns focus to the trigger when the menu closes', async () => {
    const { rerender } = render(<Harness open={false} onClose={jest.fn()} />);
    const trigger = screen.getByTestId('trigger');
    trigger.focus();

    rerender(<Harness open onClose={jest.fn()} />);
    await screen.findByRole('button', { name: /log in/i });
    expect(screen.getByRole('dialog')).toHaveFocus();

    rerender(<Harness open={false} onClose={jest.fn()} />);
    expect(trigger).toHaveFocus();
  });

  it('traps Tab at the end of the overlay and Shift+Tab at the start', async () => {
    render(<MenuDropdown isOpen onClose={jest.fn()} />);
    await screen.findByRole('button', { name: /log in/i });

    const dialog = screen.getByRole('dialog');
    const close = screen.getByRole('button', { name: /close navigation menu/i });
    const github = screen.getByRole('link', { name: 'Visit GitHub' });

    github.focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(close).toHaveFocus();

    close.focus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(github).toHaveFocus();
  });

  it('traps Shift+Tab when focus is still on the overlay container (post-open state)', async () => {
    render(<MenuDropdown isOpen onClose={jest.fn()} />);
    await screen.findByRole('button', { name: /log in/i });

    const dialog = screen.getByRole('dialog');
    const github = screen.getByRole('link', { name: 'Visit GitHub' });

    expect(dialog).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(github).toHaveFocus();
  });

  it('applies the id it is handed so a trigger can reference it', async () => {
    render(<MenuDropdown isOpen onClose={jest.fn()} id="site-menu" />);
    await screen.findByRole('button', { name: /log in/i });

    expect(screen.getByRole('dialog')).toHaveAttribute('id', 'site-menu');
  });
});

describe('MenuDropdown — admin item gating (isAdmin, not isLocalEnvironment)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = '/some-collection';
  });

  it('shows Create/Metadata/Comments for an isAdmin principal (prod-shaped: isLocalEnvironment mocked false)', async () => {
    mockMe.mockResolvedValue(adminPrincipal);

    render(<MenuDropdown isOpen onClose={jest.fn()} />);

    expect(await screen.findByRole('link', { name: 'Create' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Metadata' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Comments' })).toBeInTheDocument();
  });

  it('shows Update only when isCollectionPage is set for an isAdmin principal', async () => {
    mockMe.mockResolvedValue(adminPrincipal);
    const onClose = jest.fn();

    render(<MenuDropdown isOpen onClose={onClose} isCollectionPage collectionSlug="my-gallery" />);

    const update = await screen.findByRole('link', { name: 'Update' });
    expect(update).toHaveAttribute('href', '/my-gallery?manage=1');

    fireEvent.click(update);
    expect(onClose).toHaveBeenCalled();
  });

  it('hides Update when isCollectionPage is unset, even for an isAdmin principal', async () => {
    mockMe.mockResolvedValue(adminPrincipal);

    render(<MenuDropdown isOpen onClose={jest.fn()} />);
    await screen.findByRole('link', { name: 'Explore' });

    expect(screen.queryByRole('link', { name: 'Update' })).not.toBeInTheDocument();
  });

  it('hides Create/Update/Metadata/Comments for a logged-in non-admin principal (Explore stays public)', async () => {
    mockMe.mockResolvedValue(principal);

    render(
      <MenuDropdown isOpen onClose={jest.fn()} isCollectionPage collectionSlug="my-gallery" />
    );
    await screen.findByRole('button', { name: /log out/i });

    expect(screen.getByRole('link', { name: 'Explore' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Create' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Update' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Metadata' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Comments' })).not.toBeInTheDocument();
  });

  it('hides Create/Update/Metadata/Comments for an anonymous (logged-out) viewer (Explore stays public)', async () => {
    mockMe.mockResolvedValue(null);

    render(
      <MenuDropdown isOpen onClose={jest.fn()} isCollectionPage collectionSlug="my-gallery" />
    );
    await screen.findByRole('button', { name: /log in/i });

    expect(screen.getByRole('link', { name: 'Explore' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Create' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Update' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Metadata' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Comments' })).not.toBeInTheDocument();
  });

  it('shows Explore for an anonymous viewer as a link to /explore (public taxonomy directory)', async () => {
    mockMe.mockResolvedValue(null);
    const onClose = jest.fn();

    render(<MenuDropdown isOpen onClose={onClose} />);

    const explore = await screen.findByRole('link', { name: 'Explore' });
    expect(explore).toHaveAttribute('href', '/explore');

    fireEvent.click(explore);
    expect(onClose).toHaveBeenCalled();
  });

  it('shows Collections for an anonymous viewer as a link to /collections (public showcase)', async () => {
    mockMe.mockResolvedValue(null);
    const onClose = jest.fn();

    render(<MenuDropdown isOpen onClose={onClose} />);

    const collections = await screen.findByRole('link', { name: 'Collections' });
    expect(collections).toHaveAttribute('href', '/collections');

    fireEvent.click(collections);
    expect(onClose).toHaveBeenCalled();
  });

  it('keeps Collections visible for a logged-in non-admin principal', async () => {
    mockMe.mockResolvedValue(principal);

    render(<MenuDropdown isOpen onClose={jest.fn()} />);
    await screen.findByRole('button', { name: /log out/i });

    expect(screen.getByRole('link', { name: 'Collections' })).toBeInTheDocument();
  });

  it('hides Clear Cache for an isAdmin principal in a prod-shaped environment (isLocalEnvironment mocked false) — stays local-only even for real admins', async () => {
    mockMe.mockResolvedValue(adminPrincipal);

    render(<MenuDropdown isOpen onClose={jest.fn()} />);
    await screen.findByRole('link', { name: 'Create' });

    expect(screen.queryByRole('button', { name: /clear cache/i })).not.toBeInTheDocument();
  });
});

describe('MenuDropdown — Escape', () => {
  function Harness({ open, onClose }: { open: boolean; onClose: () => void }) {
    return (
      <>
        <button type="button" data-testid="trigger">
          Menu
        </button>
        <MenuDropdown isOpen={open} onClose={onClose} />
      </>
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = '/some-collection';
    mockMe.mockResolvedValue(null);
  });

  it('closes on Escape and hands focus back to the trigger', async () => {
    const onClose = jest.fn();
    const { rerender } = render(<Harness open={false} onClose={onClose} />);
    const trigger = screen.getByTestId('trigger');
    trigger.focus();

    rerender(<Harness open onClose={onClose} />);
    await screen.findByRole('button', { name: /log in/i });
    expect(screen.getByRole('dialog')).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(<Harness open={false} onClose={onClose} />);
    expect(trigger).toHaveFocus();
  });

  it('ignores Escape while an IME composition is open, so cancelling a candidate keeps the draft', async () => {
    const onClose = jest.fn();
    render(<MenuDropdown isOpen onClose={onClose} />);
    await screen.findByRole('button', { name: /log in/i });

    fireEvent.keyDown(document, { key: 'Escape', isComposing: true });
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('leaves other keys alone', async () => {
    const onClose = jest.fn();
    render(<MenuDropdown isOpen onClose={onClose} />);
    await screen.findByRole('button', { name: /log in/i });

    fireEvent.keyDown(document, { key: 'Enter' });
    fireEvent.keyDown(document, { key: 'Esc' });
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('MenuDropdown — Clear Cache keeps focus inside the trap while pending', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = '/some-collection';
    mockMe.mockResolvedValue(adminPrincipal);
    mockIsLocal = true;
  });

  afterEach(() => {
    mockIsLocal = false;
  });

  /**
   * A `disabled` button is not focusable, so the focus assertion is what fails if the pending
   * state ever goes back to dropping focus on `<body>`; the Tab step proves the trap still wraps.
   */
  it('stays focusable and inert (aria-disabled, not disabled) for the duration of the action', async () => {
    mockClearCache.mockReturnValue(new Promise<never>(() => {}));

    render(<MenuDropdown isOpen onClose={jest.fn()} />);
    const clearCache = await screen.findByRole('button', { name: 'Clear Cache' });

    fireEvent.click(clearCache);
    await waitFor(() => expect(clearCache).toHaveAttribute('aria-disabled', 'true'));
    expect(clearCache).toHaveTextContent(/clearing/i);
    expect(clearCache).not.toBeDisabled();

    screen.getByRole('dialog').focus();
    clearCache.focus();
    expect(clearCache).toHaveFocus();

    const dialog = screen.getByRole('dialog');
    const close = screen.getByRole('button', { name: /close navigation menu/i });
    const github = screen.getByRole('link', { name: 'Visit GitHub' });

    github.focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(close).toHaveFocus();
  });

  it('ignores repeat activations while the action is in flight', async () => {
    mockClearCache.mockReturnValue(new Promise<never>(() => {}));

    render(<MenuDropdown isOpen onClose={jest.fn()} />);
    const clearCache = await screen.findByRole('button', { name: 'Clear Cache' });

    fireEvent.click(clearCache);
    await waitFor(() => expect(clearCache).toHaveAttribute('aria-disabled', 'true'));

    fireEvent.click(clearCache);
    fireEvent.click(clearCache);
    expect(mockClearCache).toHaveBeenCalledTimes(1);
  });
});

describe('MenuDropdown — focus restore when the trigger is gone', () => {
  function Harness({ open, withTrigger }: { open: boolean; withTrigger: boolean }) {
    return (
      <>
        <header>
          <Link href="/">Zac Edens</Link>
          <Link href="/collections">Collections</Link>
          {withTrigger && (
            <button type="button" data-testid="trigger">
              Menu
            </button>
          )}
        </header>
        <MenuDropdown isOpen={open} onClose={jest.fn()} />
      </>
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = '/some-collection';
    mockMe.mockResolvedValue(null);
  });

  /**
   * The first control in the header, not merely something inside it: the header holds two links
   * here, so "landed in the header" and "landed at the top of it" are distinguishable outcomes.
   */
  it('falls back to the page header when the trigger unmounted while the menu was open', async () => {
    const { rerender } = render(<Harness open={false} withTrigger />);
    screen.getByTestId('trigger').focus();

    rerender(<Harness open withTrigger />);
    await screen.findByRole('button', { name: /log in/i });

    rerender(<Harness open withTrigger={false} />);
    rerender(<Harness open={false} withTrigger={false} />);

    expect(screen.getByRole('link', { name: 'Zac Edens' })).toHaveFocus();
  });

  /**
   * The fallback is scoped to the page header on purpose. A document-wide "focus the first
   * focusable thing" would be worse than doing nothing — it would drop the viewer into whatever
   * happens to lead the page body, somewhere they never were. With no header, `<body>` is the
   * honest place for focus to sit, and the page-body button below is what makes that assertion
   * capable of failing.
   */
  it('leaves focus on the body, untouched, when there is no header to fall back to', async () => {
    function Bare({ open, withTrigger }: { open: boolean; withTrigger: boolean }) {
      return (
        <>
          {withTrigger && (
            <button type="button" data-testid="trigger">
              Menu
            </button>
          )}
          <main>
            <button type="button">Not in a header</button>
          </main>
          <MenuDropdown isOpen={open} onClose={jest.fn()} />
        </>
      );
    }

    const { rerender } = render(<Bare open={false} withTrigger />);
    screen.getByTestId('trigger').focus();

    rerender(<Bare open withTrigger />);
    await screen.findByRole('button', { name: /log in/i });

    rerender(<Bare open withTrigger={false} />);
    expect(() => rerender(<Bare open={false} withTrigger={false} />)).not.toThrow();

    expect(document.body).toHaveFocus();
  });
});

const NAV_ORDER = [
  'Explore',
  'Collections',
  'Your space',
  'About',
  'Contact',
  'Create',
  'Update',
  'Metadata',
  'Comments',
  'Clear Cache',
  'Log out',
  'Log in',
];

function renderedMenuOrder() {
  return [...screen.getByRole('dialog').querySelectorAll('a, button')]
    .map(el => (el.textContent ?? '').replace(/[^ A-Za-z]/g, '').trim())
    .filter(text => NAV_ORDER.includes(text));
}

describe('MenuDropdown — A12 item list and order', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMe.mockResolvedValue(null);
    mockPathname = '/some-collection';
    mockIsLocal = false;
  });

  afterEach(() => {
    mockIsLocal = false;
  });

  it('A12: never renders a Home row, on the home page or off it', () => {
    mockPathname = '/';
    const { unmount } = render(<MenuDropdown isOpen onClose={jest.fn()} me={principal} />);
    expect(screen.queryByRole('link', { name: 'Home' })).not.toBeInTheDocument();
    unmount();

    mockPathname = '/elsewhere';
    render(<MenuDropdown isOpen onClose={jest.fn()} me={principal} />);
    expect(screen.queryByRole('link', { name: 'Home' })).not.toBeInTheDocument();
  });

  it('A12: renders no "Me" row and calls it "Your space"', () => {
    render(<MenuDropdown isOpen onClose={jest.fn()} me={principal} />);

    expect(screen.queryByRole('link', { name: 'Me' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Your space' })).toBeInTheDocument();
  });

  it('A12: Your space links to /user for a signed-in non-admin', () => {
    render(<MenuDropdown isOpen onClose={jest.fn()} me={principal} />);

    expect(screen.getByRole('link', { name: 'Your space' })).toHaveAttribute('href', '/user');
  });

  it('A12: Your space links to /admin for an admin', () => {
    render(<MenuDropdown isOpen onClose={jest.fn()} me={adminPrincipal} />);

    expect(screen.getByRole('link', { name: 'Your space' })).toHaveAttribute('href', '/admin');
  });

  it('A12: Your space is absent for an anonymous viewer', () => {
    render(<MenuDropdown isOpen onClose={jest.fn()} me={null} />);

    expect(screen.queryByRole('link', { name: 'Your space' })).not.toBeInTheDocument();
  });

  it('A12: orders a local admin on a collection page browse, account, About, Contact, admin rows, Clear Cache, Log out', () => {
    mockIsLocal = true;
    render(
      <MenuDropdown
        isOpen
        onClose={jest.fn()}
        me={adminPrincipal}
        isCollectionPage
        collectionSlug="x"
      />
    );

    expect(renderedMenuOrder()).toEqual([
      'Explore',
      'Collections',
      'Your space',
      'About',
      'Contact',
      'Create',
      'Update',
      'Metadata',
      'Comments',
      'Clear Cache',
      'Log out',
    ]);
  });

  it('A12: orders a signed-in non-admin Explore, Collections, Your space, About, Contact, Log out', () => {
    render(<MenuDropdown isOpen onClose={jest.fn()} me={principal} />);

    expect(renderedMenuOrder()).toEqual([
      'Explore',
      'Collections',
      'Your space',
      'About',
      'Contact',
      'Log out',
    ]);
  });

  it('A12: orders an anonymous viewer Explore, Collections, About, Contact, Log in', () => {
    render(<MenuDropdown isOpen onClose={jest.fn()} me={null} />);

    expect(renderedMenuOrder()).toEqual(['Explore', 'Collections', 'About', 'Contact', 'Log in']);
  });

  it('A12: keeps the same order when the viewer is resolved by the lazy fetch', async () => {
    mockMe.mockResolvedValue(principal);
    render(<MenuDropdown isOpen onClose={jest.fn()} />);
    await screen.findByRole('button', { name: /log out/i });

    expect(renderedMenuOrder()).toEqual([
      'Explore',
      'Collections',
      'Your space',
      'About',
      'Contact',
      'Log out',
    ]);
  });
});

describe('MenuDropdown — A13 Clear Cache gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = '/some-collection';
    mockIsLocal = true;
  });

  afterEach(() => {
    mockIsLocal = false;
    jest.restoreAllMocks();
  });

  it('A13: renders for a local admin', () => {
    render(<MenuDropdown isOpen onClose={jest.fn()} me={adminPrincipal} />);

    expect(screen.getByRole('button', { name: 'Clear Cache' })).toBeInTheDocument();
  });

  it('A13: never renders for an anonymous viewer, even locally', () => {
    render(<MenuDropdown isOpen onClose={jest.fn()} me={null} />);

    expect(screen.queryByRole('button', { name: /clear cache/i })).not.toBeInTheDocument();
  });

  it('A13: never renders for a signed-in non-admin, even locally', () => {
    render(<MenuDropdown isOpen onClose={jest.fn()} me={principal} />);

    expect(screen.queryByRole('button', { name: /clear cache/i })).not.toBeInTheDocument();
  });

  it('A13: never renders for an admin outside a local environment', () => {
    mockIsLocal = false;
    render(<MenuDropdown isOpen onClose={jest.fn()} me={adminPrincipal} />);

    expect(screen.queryByRole('button', { name: /clear cache/i })).not.toBeInTheDocument();
  });

  it('A13 twin: with the local-environment check letting everything through, an admin sees Clear Cache outside local', () => {
    mockIsLocal = false;
    const environment = jest.requireMock('@/app/utils/environment') as {
      isLocalEnvironment: () => boolean;
    };
    jest.spyOn(environment, 'isLocalEnvironment').mockReturnValue(true);

    render(<MenuDropdown isOpen onClose={jest.fn()} me={adminPrincipal} />);

    expect(screen.getByRole('button', { name: 'Clear Cache' })).toBeInTheDocument();
  });
});

describe('MenuDropdown — A15 no /auth/me on page load', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMe.mockResolvedValue(null);
    mockPathname = '/some-collection';
    mockIsLocal = false;
  });

  afterEach(() => {
    mockForceMountFetch = false;
    jest.restoreAllMocks();
  });

  it('A15b: closed with me supplied makes no request', () => {
    render(<MenuDropdown isOpen={false} onClose={jest.fn()} me={principal} />);

    expect(mockMe).not.toHaveBeenCalled();
  });

  it('A15b: closed with me undefined makes no request', () => {
    render(<MenuDropdown isOpen={false} onClose={jest.fn()} />);

    expect(mockMe).not.toHaveBeenCalled();
  });

  it('A15b: opening with me supplied makes no request and renders from it', () => {
    const { rerender } = render(<MenuDropdown isOpen={false} onClose={jest.fn()} me={principal} />);
    rerender(<MenuDropdown isOpen onClose={jest.fn()} me={principal} />);

    expect(mockMe).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
  });

  it('A15b: opening with me null (anonymous, server-resolved) makes no request', () => {
    const { rerender } = render(<MenuDropdown isOpen={false} onClose={jest.fn()} me={null} />);
    rerender(<MenuDropdown isOpen onClose={jest.fn()} me={null} />);

    expect(mockMe).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
  });

  it('A15b: with me undefined the first open makes exactly one request, and later opens make none', async () => {
    mockMe.mockResolvedValue(principal);
    const { rerender } = render(<MenuDropdown isOpen={false} onClose={jest.fn()} />);
    expect(mockMe).not.toHaveBeenCalled();

    rerender(<MenuDropdown isOpen onClose={jest.fn()} />);
    await screen.findByRole('button', { name: /log out/i });
    expect(mockMe).toHaveBeenCalledTimes(1);

    rerender(<MenuDropdown isOpen={false} onClose={jest.fn()} />);
    rerender(<MenuDropdown isOpen onClose={jest.fn()} />);
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
    expect(mockMe).toHaveBeenCalledTimes(1);
  });

  it('A15 twin: a menu that fetches on mount makes a request while closed', () => {
    mockMe.mockResolvedValue(null);
    mockForceMountFetch = true;

    render(<MenuDropdown isOpen={false} onClose={jest.fn()} me={principal} />);

    expect(mockMe).toHaveBeenCalled();
  });
});

describe('MenuDropdown — A14 AUTH_CHANGED_EVENT refetch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMe.mockResolvedValue(null);
    mockPathname = '/some-collection';
    mockIsLocal = false;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('A14: refetches and re-renders on AUTH_CHANGED_EVENT when seeded with me', async () => {
    mockMe.mockResolvedValue(null);
    render(<MenuDropdown isOpen onClose={jest.fn()} me={principal} />);
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new Event(authApi.AUTH_CHANGED_EVENT));
    });

    expect(await screen.findByRole('button', { name: /log in/i })).toBeInTheDocument();
    expect(mockMe).toHaveBeenCalledTimes(1);
  });

  it('A14: refetches on AUTH_CHANGED_EVENT after a lazy first open', async () => {
    mockMe.mockResolvedValueOnce(principal).mockResolvedValue(null);
    render(<MenuDropdown isOpen onClose={jest.fn()} />);
    await screen.findByRole('button', { name: /log out/i });

    act(() => {
      window.dispatchEvent(new Event(authApi.AUTH_CHANGED_EVENT));
    });

    expect(await screen.findByRole('button', { name: /log in/i })).toBeInTheDocument();
    expect(mockMe).toHaveBeenCalledTimes(2);
  });

  it('A14 twin: with the event name no longer matching, the event does not refetch', () => {
    const realName = authApi.AUTH_CHANGED_EVENT;
    jest.replaceProperty(
      jest.requireMock<{ AUTH_CHANGED_EVENT: string }>('@/app/lib/api/auth'),
      'AUTH_CHANGED_EVENT',
      'something-else'
    );
    render(<MenuDropdown isOpen onClose={jest.fn()} me={principal} />);

    act(() => {
      window.dispatchEvent(new Event(realName));
    });

    expect(mockMe).not.toHaveBeenCalled();
  });
});

describe('MenuDropdown — A15c me prop changes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMe.mockResolvedValue(null);
    mockPathname = '/some-collection';
    mockIsLocal = false;
  });

  it('A15c: shows the new value when me goes from anonymous to signed in', () => {
    const { rerender } = render(<MenuDropdown isOpen onClose={jest.fn()} me={null} />);
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();

    rerender(<MenuDropdown isOpen onClose={jest.fn()} me={adminPrincipal} />);

    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Your space' })).toHaveAttribute('href', '/admin');
    expect(screen.getByRole('link', { name: 'Create' })).toBeInTheDocument();
    expect(mockMe).not.toHaveBeenCalled();
  });

  it('A15c: shows the new value when me goes from signed in to anonymous', () => {
    const { rerender } = render(<MenuDropdown isOpen onClose={jest.fn()} me={adminPrincipal} />);

    rerender(<MenuDropdown isOpen onClose={jest.fn()} me={null} />);

    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Your space' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Create' })).not.toBeInTheDocument();
  });
});

describe('MenuDropdown — A19 row markup unchanged', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = '/some-collection';
  });

  it('A19: nav rows keep the item wrapper, link and options-span classes', () => {
    render(<MenuDropdown isOpen onClose={jest.fn()} me={principal} />);

    const link = screen.getByRole('link', { name: 'Your space' });
    expect(link).toHaveClass('dropdownMenuLink');
    expect(link.parentElement).toHaveClass('dropdownMenuItem');
    expect(link.querySelector('span')).toHaveClass('dropdownMenuOptions');
    expect(screen.getByRole('dialog')).toHaveClass('dropdown');
  });
});
