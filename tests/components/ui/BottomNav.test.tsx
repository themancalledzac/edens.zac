import '@testing-library/jest-dom';

import { fireEvent, render, screen } from '@testing-library/react';

import { SiteMenuProvider, useSiteMenu } from '@/app/components/SiteHeader/SiteMenuContext';
import { BottomNav } from '@/app/components/ui/BottomNav/BottomNav';
import * as authApi from '@/app/lib/api/auth';
import { type MeResponse } from '@/app/types/Auth';

let mockPathname = '/';
jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));
jest.mock('@/app/lib/api/auth', () => ({
  AUTH_CHANGED_EVENT: 'auth-changed',
  me: jest.fn(),
}));

const mockMe = authApi.me as jest.MockedFunction<typeof authApi.me>;

const makeMe = (isAdmin: boolean): MeResponse => ({ isAdmin }) as MeResponse;

function MenuProbe() {
  const menu = useSiteMenu();
  return <div data-testid="probe">{menu?.isOpen ? 'open' : 'closed'}</div>;
}

const renderBar = (me?: MeResponse | null) =>
  render(
    <SiteMenuProvider>
      <BottomNav me={me} />
      <MenuProbe />
    </SiteMenuProvider>
  );

describe('BottomNav', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = '/';
    mockMe.mockResolvedValue(null);
  });

  it('renders Menu, Explore, Collections, Log in in order for an anonymous visitor', () => {
    renderBar(null);
    const cells = screen.getByRole('navigation').children;
    expect(cells[0]).toHaveTextContent('Menu');
    expect(cells[1]).toHaveAttribute('href', '/explore');
    expect(cells[2]).toHaveAttribute('href', '/collections');
    expect(cells[3]).toHaveTextContent('Log in');
    expect(cells[3]).toHaveAttribute('href', '/login');
    expect(screen.getByRole('navigation')).toHaveAttribute('data-bottom-nav');
  });

  it('shows Your space at /user for a signed-in non-admin, never Log in', () => {
    renderBar(makeMe(false));
    expect(screen.queryByText('Log in')).not.toBeInTheDocument();
    expect(screen.getByText('Your space')).toHaveAttribute('href', '/user');
  });

  it('points an admin Your space at /admin', () => {
    renderBar(makeMe(true));
    expect(screen.getByText('Your space')).toHaveAttribute('href', '/admin');
  });

  it('never shows Log in while me is unresolved for a signed-in visitor', async () => {
    mockMe.mockResolvedValue(makeMe(false));
    renderBar();
    expect(screen.queryByText('Log in')).not.toBeInTheDocument();
    expect(await screen.findByText('Your space')).toHaveAttribute('href', '/user');
    expect(screen.queryByText('Log in')).not.toBeInTheDocument();
  });

  it('marks only the current route with aria-current', () => {
    mockPathname = '/collections/summer';
    renderBar(null);
    const current = document.querySelectorAll('[aria-current]');
    expect(current).toHaveLength(1);
    expect(screen.getByText('Collections')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('Explore')).not.toHaveAttribute('aria-current');
  });

  it('does not treat a sibling prefix as current', () => {
    mockPathname = '/explorer';
    renderBar(null);
    expect(document.querySelectorAll('[aria-current]')).toHaveLength(0);
  });

  it('toggles the shared menu from the Menu cell and wires aria', () => {
    renderBar(null);
    const menuCell = screen.getByRole('button', { name: 'Open navigation menu' });
    expect(menuCell).toHaveAttribute('aria-expanded', 'false');
    expect(menuCell).not.toHaveAttribute('aria-controls');
    fireEvent.click(menuCell);
    expect(screen.getByTestId('probe')).toHaveTextContent('open');
    const open = screen.getByRole('button', { name: 'Close navigation menu' });
    expect(open).toHaveAttribute('aria-expanded', 'true');
    expect(open).toHaveAttribute('aria-controls');
  });

  it('closes an open menu when a link cell is tapped', () => {
    renderBar(null);
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }));
    fireEvent.click(screen.getByText('Explore'));
    expect(screen.getByTestId('probe')).toHaveTextContent('closed');
  });
});
