import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Link from 'next/link';

import { MenuDropdown } from '@/app/components/MenuDropdown/MenuDropdown';
import { clearCacheAction } from '@/app/lib/actions/clearCache';
import * as authApi from '@/app/lib/api/auth';
import { type MeResponse } from '@/app/types/Auth';

const mockPush = jest.fn();
const mockRefresh = jest.fn();
let mockPathname = '/some-collection';
// Read on every render, so a test can flip the menu into its local-only shape and back.
let mockIsLocal = false;

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
  isLocalEnvironment: () => mockIsLocal,
}));

const mockMe = authApi.me as jest.MockedFunction<typeof authApi.me>;
const mockLogout = authApi.logout as jest.MockedFunction<typeof authApi.logout>;
const mockClearCache = clearCacheAction as jest.MockedFunction<typeof clearCacheAction>;

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

  it('shows "Home" off the home page as a real link to /', async () => {
    mockMe.mockResolvedValue(null);
    const onClose = jest.fn();

    render(<MenuDropdown isOpen onClose={onClose} />);
    await screen.findByRole('button', { name: /log in/i }); // settle the me() fetch

    const home = screen.getByRole('link', { name: 'Home' });
    expect(home).toHaveAttribute('href', '/');

    fireEvent.click(home);
    expect(onClose).toHaveBeenCalled();
  });

  it('hides "Home" when already on the home page', async () => {
    mockMe.mockResolvedValue(null);
    mockPathname = '/';

    render(<MenuDropdown isOpen onClose={jest.fn()} />);
    await screen.findByRole('button', { name: /log in/i }); // settle the me() fetch

    expect(screen.queryByRole('link', { name: 'Home' })).not.toBeInTheDocument();
  });

  it('renders "Me" as a real link to /user for a logged-in principal', async () => {
    mockMe.mockResolvedValue(principal);

    render(<MenuDropdown isOpen onClose={jest.fn()} />);

    expect(await screen.findByRole('link', { name: 'Me' })).toHaveAttribute('href', '/user');
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
    await screen.findByRole('button', { name: /log in/i }); // settle the me() fetch

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Explore' })).toHaveAttribute('href', '/explore');
    expect(screen.getByRole('link', { name: 'Collections' })).toHaveAttribute(
      'href',
      '/collections'
    );
  });

  it('renders every admin destination as an anchor carrying its href', async () => {
    mockMe.mockResolvedValue(adminPrincipal);

    render(
      <MenuDropdown isOpen onClose={jest.fn()} pageType="collection" collectionSlug="my-gallery" />
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
    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
  });

  it('falls back to the create surface when Update has no collection slug', async () => {
    mockMe.mockResolvedValue(adminPrincipal);

    render(<MenuDropdown isOpen onClose={jest.fn()} pageType="collection" />);

    expect(await screen.findByRole('link', { name: 'Update' })).toHaveAttribute(
      'href',
      '/collection/manage'
    );
  });

  it('closes the menu when a destination link is followed', async () => {
    mockMe.mockResolvedValue(null);
    const onClose = jest.fn();

    render(<MenuDropdown isOpen onClose={onClose} />);
    await screen.findByRole('button', { name: /log in/i }); // settle the me() fetch

    fireEvent.click(screen.getByRole('link', { name: 'Collections' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('keeps genuine actions as buttons, never links', async () => {
    mockMe.mockResolvedValue(principal);

    render(<MenuDropdown isOpen onClose={jest.fn()} />);
    await screen.findByRole('button', { name: /log out/i }); // settle the me() fetch

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
    await screen.findByRole('button', { name: /log in/i }); // settle the me() fetch

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

describe('MenuDropdown — About/Contact disclosures', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = '/some-collection';
  });

  it('exposes aria-expanded on About and wires aria-controls to the panel once open', async () => {
    mockMe.mockResolvedValue(null);

    render(<MenuDropdown isOpen onClose={jest.fn()} />);
    await screen.findByRole('button', { name: /log in/i }); // settle the me() fetch

    const about = screen.getByRole('button', { name: 'About' });
    expect(about).toHaveAttribute('aria-expanded', 'false');
    expect(about).not.toHaveAttribute('aria-controls');

    fireEvent.click(about);

    expect(about).toHaveAttribute('aria-expanded', 'true');
    const panelId = about.getAttribute('aria-controls');
    expect(panelId).toBeTruthy();
    expect(document.getElementById(panelId!)).not.toBeNull();
  });

  it('exposes aria-expanded on Contact and wires aria-controls to the panel once open', async () => {
    mockMe.mockResolvedValue(null);

    render(<MenuDropdown isOpen onClose={jest.fn()} />);
    await screen.findByRole('button', { name: /log in/i }); // settle the me() fetch

    const contact = screen.getByRole('button', { name: 'Contact' });
    expect(contact).toHaveAttribute('aria-expanded', 'false');
    expect(contact).not.toHaveAttribute('aria-controls');

    fireEvent.click(contact);

    expect(contact).toHaveAttribute('aria-expanded', 'true');
    const panelId = contact.getAttribute('aria-controls');
    expect(panelId).toBeTruthy();
    expect(document.getElementById(panelId!)).not.toBeNull();
  });

  it('collapses the other disclosure, resetting its aria-expanded', async () => {
    mockMe.mockResolvedValue(null);

    render(<MenuDropdown isOpen onClose={jest.fn()} />);
    await screen.findByRole('button', { name: /log in/i }); // settle the me() fetch

    const about = screen.getByRole('button', { name: 'About' });
    const contact = screen.getByRole('button', { name: 'Contact' });

    fireEvent.click(about);
    expect(about).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(contact);
    expect(contact).toHaveAttribute('aria-expanded', 'true');
    expect(about).toHaveAttribute('aria-expanded', 'false');
    expect(about).not.toHaveAttribute('aria-controls');
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
    await screen.findByRole('button', { name: /log in/i }); // settle the me() fetch

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
    await screen.findByRole('button', { name: /log in/i }); // settle the me() fetch

    expect(screen.getByRole('dialog')).toHaveFocus();
  });

  it('returns focus to the trigger when the menu closes', async () => {
    const { rerender } = render(<Harness open={false} onClose={jest.fn()} />);
    const trigger = screen.getByTestId('trigger');
    trigger.focus();

    rerender(<Harness open onClose={jest.fn()} />);
    await screen.findByRole('button', { name: /log in/i }); // settle the me() fetch
    expect(screen.getByRole('dialog')).toHaveFocus();

    rerender(<Harness open={false} onClose={jest.fn()} />);
    expect(trigger).toHaveFocus();
  });

  it('traps Tab at the end of the overlay and Shift+Tab at the start', async () => {
    render(<MenuDropdown isOpen onClose={jest.fn()} />);
    await screen.findByRole('button', { name: /log in/i }); // settle the me() fetch

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
    await screen.findByRole('button', { name: /log in/i }); // settle the me() fetch

    const dialog = screen.getByRole('dialog');
    const github = screen.getByRole('link', { name: 'Visit GitHub' });

    expect(dialog).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(github).toHaveFocus();
  });

  it('applies the id it is handed so a trigger can reference it', async () => {
    render(<MenuDropdown isOpen onClose={jest.fn()} id="site-menu" />);
    await screen.findByRole('button', { name: /log in/i }); // settle the me() fetch

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

  it('shows Update only when pageType is "collection" for an isAdmin principal', async () => {
    mockMe.mockResolvedValue(adminPrincipal);
    const onClose = jest.fn();

    render(
      <MenuDropdown isOpen onClose={onClose} pageType="collection" collectionSlug="my-gallery" />
    );

    const update = await screen.findByRole('link', { name: 'Update' });
    expect(update).toHaveAttribute('href', '/my-gallery?manage=1');

    fireEvent.click(update);
    expect(onClose).toHaveBeenCalled();
  });

  it('hides Update when pageType is not "collection", even for an isAdmin principal', async () => {
    mockMe.mockResolvedValue(adminPrincipal);

    render(<MenuDropdown isOpen onClose={jest.fn()} pageType="default" />);
    await screen.findByRole('link', { name: 'Explore' }); // settle the me() fetch

    expect(screen.queryByRole('link', { name: 'Update' })).not.toBeInTheDocument();
  });

  it('hides Create/Update/Metadata/Comments for a logged-in non-admin principal (Explore stays public)', async () => {
    mockMe.mockResolvedValue(principal); // isAdmin: false

    render(
      <MenuDropdown isOpen onClose={jest.fn()} pageType="collection" collectionSlug="my-gallery" />
    );
    await screen.findByRole('button', { name: /log out/i }); // settle the me() fetch

    expect(screen.getByRole('link', { name: 'Explore' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Create' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Update' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Metadata' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Comments' })).not.toBeInTheDocument();
  });

  it('hides Create/Update/Metadata/Comments for an anonymous (logged-out) viewer (Explore stays public)', async () => {
    mockMe.mockResolvedValue(null);

    render(
      <MenuDropdown isOpen onClose={jest.fn()} pageType="collection" collectionSlug="my-gallery" />
    );
    await screen.findByRole('button', { name: /log in/i }); // settle the me() fetch

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
    mockMe.mockResolvedValue(principal); // isAdmin: false

    render(<MenuDropdown isOpen onClose={jest.fn()} />);
    await screen.findByRole('button', { name: /log out/i }); // settle the me() fetch

    expect(screen.getByRole('link', { name: 'Collections' })).toBeInTheDocument();
  });

  it('hides Clear Cache for an isAdmin principal in a prod-shaped environment (isLocalEnvironment mocked false) — stays local-only even for real admins', async () => {
    mockMe.mockResolvedValue(adminPrincipal);

    render(<MenuDropdown isOpen onClose={jest.fn()} />);
    await screen.findByRole('link', { name: 'Create' }); // settle the me() fetch; other admin items ARE visible

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
    await screen.findByRole('button', { name: /log in/i }); // settle the me() fetch
    expect(screen.getByRole('dialog')).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(<Harness open={false} onClose={onClose} />);
    expect(trigger).toHaveFocus();
  });

  it('ignores Escape while an IME composition is open, so cancelling a candidate keeps the draft', async () => {
    const onClose = jest.fn();
    render(<MenuDropdown isOpen onClose={onClose} />);
    await screen.findByRole('button', { name: /log in/i }); // settle the me() fetch

    fireEvent.keyDown(document, { key: 'Escape', isComposing: true });
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('leaves other keys alone', async () => {
    const onClose = jest.fn();
    render(<MenuDropdown isOpen onClose={onClose} />);
    await screen.findByRole('button', { name: /log in/i }); // settle the me() fetch

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

  it('stays focusable and inert (aria-disabled, not disabled) for the duration of the action', async () => {
    mockClearCache.mockReturnValue(new Promise<never>(() => {}));

    render(<MenuDropdown isOpen onClose={jest.fn()} />);
    const clearCache = await screen.findByRole('button', { name: 'Clear Cache' });

    fireEvent.click(clearCache);
    await waitFor(() => expect(clearCache).toHaveAttribute('aria-disabled', 'true'));
    expect(clearCache).toHaveTextContent(/clearing/i);
    expect(clearCache).not.toBeDisabled();

    // A `disabled` button is not a focusable area: this is the assertion that fails if the
    // pending state ever goes back to dropping focus on <body>.
    screen.getByRole('dialog').focus();
    clearCache.focus();
    expect(clearCache).toHaveFocus();

    // ...and the trap it is still a member of continues to wrap.
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

  it('falls back to the page header when the trigger unmounted while the menu was open', async () => {
    const { rerender } = render(<Harness open={false} withTrigger />);
    screen.getByTestId('trigger').focus();

    rerender(<Harness open withTrigger />);
    await screen.findByRole('button', { name: /log in/i }); // settle the me() fetch

    rerender(<Harness open withTrigger={false} />);
    rerender(<Harness open={false} withTrigger={false} />);

    // The FIRST control in the header, not merely something inside it: the fallback exists to put
    // the viewer back at a known corner of the page, and the header holds two links here so
    // "landed in the header" and "landed at the top of it" are distinguishable outcomes.
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
    await screen.findByRole('button', { name: /log in/i }); // settle the me() fetch

    rerender(<Bare open withTrigger={false} />);
    expect(() => rerender(<Bare open={false} withTrigger={false} />)).not.toThrow();

    expect(document.body).toHaveFocus();
  });
});
