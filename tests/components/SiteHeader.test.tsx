import { fireEvent, render, screen, within } from '@testing-library/react';

import { SiteHeader } from '@/app/components/SiteHeader/SiteHeader';
import * as authApi from '@/app/lib/api/auth';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  usePathname: () => '/some-collection',
}));
// SiteHeader always mounts MenuDropdown, which runs the real useFetchMe — only the
// api layer is mocked so the header's own behavior is exercised end to end.
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

/**
 * The header toggle and the overlay's own X both close the menu and therefore share an
 * accessible name while open, so header queries are scoped to the banner landmark.
 */
const toggle = () =>
  within(screen.getByRole('banner')).getByRole('button', { name: /navigation menu$/i });

describe('SiteHeader — menu toggle accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMe.mockResolvedValue(null);
  });

  it('renders the toggle collapsed, with no dangling aria-controls', () => {
    render(<SiteHeader />);

    expect(toggle()).toHaveAccessibleName('Open navigation menu');
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
    expect(toggle()).not.toHaveAttribute('aria-controls');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renames the toggle to "Close navigation menu" while the menu is open', async () => {
    render(<SiteHeader />);

    fireEvent.click(toggle());
    await screen.findByRole('dialog');

    expect(toggle()).toHaveAccessibleName('Close navigation menu');
    expect(toggle()).toHaveAttribute('aria-expanded', 'true');
  });

  it('points aria-controls at the open dropdown', async () => {
    render(<SiteHeader />);

    fireEvent.click(toggle());
    const dialog = await screen.findByRole('dialog');

    const controls = toggle().getAttribute('aria-controls');
    expect(controls).toBeTruthy();
    expect(dialog).toHaveAttribute('id', controls!);
  });

  it('restores the collapsed label and drops aria-controls when the menu closes', async () => {
    render(<SiteHeader />);

    fireEvent.click(toggle());
    await screen.findByRole('dialog');
    fireEvent.click(toggle());

    expect(toggle()).toHaveAccessibleName('Open navigation menu');
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
    expect(toggle()).not.toHaveAttribute('aria-controls');
  });

  it('returns focus to the toggle after the overlay is dismissed from inside', async () => {
    render(<SiteHeader />);

    toggle().focus();
    fireEvent.click(toggle());

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveFocus();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Close navigation menu' }));

    expect(toggle()).toHaveFocus();
  });
});
