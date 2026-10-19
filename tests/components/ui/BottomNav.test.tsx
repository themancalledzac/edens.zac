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

  it('renders Explore, Collections, Log in, Menu in order for an anonymous visitor', () => {
    renderBar(null);
    const cells = screen.getByRole('navigation').children;
    expect(cells).toHaveLength(4);
    expect(cells[0]).toHaveAttribute('href', '/explore');
    expect(cells[0]).toHaveAttribute('aria-label', 'Explore');
    expect(cells[1]).toHaveAttribute('href', '/collections');
    expect(cells[1]).toHaveAttribute('aria-label', 'Collections');
    expect(cells[2]).toHaveAttribute('href', '/login');
    expect(cells[2]).toHaveAttribute('aria-label', 'Log in');
    expect(cells[3]).toHaveAttribute('aria-label', 'Menu');
    expect(screen.getByRole('navigation')).toHaveAttribute('data-bottom-nav');
  });

  it('renders icon-only cells with no text', () => {
    renderBar(null);
    const cells = screen.getByRole('navigation').children;
    for (const cell of Array.from(cells)) {
      expect(cell).toHaveTextContent('');
      expect(cell.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    }
  });

  it('shows Your space at /user for a signed-in non-admin, never Log in', () => {
    renderBar(makeMe(false));
    expect(screen.queryByLabelText('Log in')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Your space')).toHaveAttribute('href', '/user');
  });

  it('points an admin Your space at /admin', () => {
    renderBar(makeMe(true));
    expect(screen.getByLabelText('Your space')).toHaveAttribute('href', '/admin');
  });

  it('keeps four cells with an empty You slot and never shows Log in while me is undefined', () => {
    renderBar();
    const cells = screen.getByRole('navigation').children;
    expect(cells).toHaveLength(4);
    expect(cells[2]).toHaveAttribute('aria-hidden', 'true');
    expect(cells[2]).toBeEmptyDOMElement();
    expect(cells[3]).toHaveAttribute('aria-label', 'Menu');
    expect(screen.queryByLabelText('Log in')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Your space')).not.toBeInTheDocument();
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['a value', makeMe(false)],
  ])('makes no /me request when me is %s', async (_label, me) => {
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;
    renderBar(me);
    await Promise.resolve();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(mockMe).not.toHaveBeenCalled();
  });

  it('marks only the current route with aria-current', () => {
    mockPathname = '/collections/summer';
    renderBar(null);
    const current = document.querySelectorAll('[aria-current]');
    expect(current).toHaveLength(1);
    expect(screen.getByLabelText('Collections')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByLabelText('Explore')).not.toHaveAttribute('aria-current');
  });

  it('does not treat a sibling prefix as current', () => {
    mockPathname = '/explorer';
    renderBar(null);
    expect(document.querySelectorAll('[aria-current]')).toHaveLength(0);
  });

  it('toggles the shared menu from the Menu cell and wires aria', () => {
    renderBar(null);
    const menuCell = screen.getByRole('button', { name: 'Menu' });
    expect(menuCell).toHaveAttribute('aria-expanded', 'false');
    expect(menuCell).not.toHaveAttribute('aria-controls');
    fireEvent.click(menuCell);
    expect(screen.getByTestId('probe')).toHaveTextContent('open');
    const open = screen.getByRole('button', { name: 'Close menu' });
    expect(open).toHaveAttribute('aria-expanded', 'true');
    expect(open).toHaveAttribute('aria-controls');
  });

  it('closes an open menu when a link cell is tapped', () => {
    renderBar(null);
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    fireEvent.click(screen.getByLabelText('Explore'));
    expect(screen.getByTestId('probe')).toHaveTextContent('closed');
  });

  it('turns the Menu cell into a Close menu X while the menu is open and closes on tap', () => {
    renderBar(null);
    const menuCell = screen.getByRole('button', { name: 'Menu' });
    expect(menuCell.querySelector('svg')).toHaveClass('lucide-text-align-justify');
    fireEvent.click(menuCell);
    const closeCell = screen.getByRole('button', { name: 'Close menu' });
    expect(screen.queryByRole('button', { name: 'Menu' })).not.toBeInTheDocument();
    expect(closeCell).toHaveAttribute('aria-expanded', 'true');
    expect(closeCell).toHaveAttribute('aria-controls');
    expect(closeCell.querySelector('svg')).toHaveClass('lucide-x');
    fireEvent.click(closeCell);
    expect(screen.getByTestId('probe')).toHaveTextContent('closed');
    expect(screen.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-expanded', 'false');
  });
});
