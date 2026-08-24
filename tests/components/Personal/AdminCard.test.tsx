import { render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';

import { AdminCard } from '@/app/components/Personal/AdminCard';

/**
 * `next/link` swallows `scroll`, so the only way to see what a chip forwards is to stand in for it.
 * The anchor is otherwise identical, and every href/class assertion below reads the same DOM the
 * real component produces.
 */
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    scroll,
    children,
    ...rest
  }: {
    scroll?: boolean;
    children: ReactNode;
    href: string;
  }) => (
    <a {...rest} data-scroll={String(scroll)}>
      {children}
    </a>
  ),
}));

const DESTINATIONS = [
  ['Admin hub', '/admin'],
  ['New collection', '/collection/manage'],
  ['Metadata', '/metadata'],
  ['Comments', '/comments'],
] as const;

describe('AdminCard', () => {
  it('renders under an Admin heading', () => {
    render(<AdminCard />);
    expect(screen.getByRole('heading', { name: 'Admin' })).toBeInTheDocument();
  });

  it('leads with the destinations rather than a sentence describing them', () => {
    render(<AdminCard />);
    expect(
      screen.queryByText('Manage collections, metadata, messages and access.')
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(DESTINATIONS.length);
  });

  it.each(DESTINATIONS)('links %s to %s', (label, href) => {
    render(<AdminCard />);
    expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', href);
  });

  it('renders exactly the four destinations, in order', () => {
    render(<AdminCard />);
    expect(screen.getAllByRole('link').map(a => a.getAttribute('href'))).toEqual(
      DESTINATIONS.map(([, href]) => href)
    );
  });

  it('styles the destinations as filter chips, not plain nav links', () => {
    render(<AdminCard />);
    for (const link of screen.getAllByRole('link')) {
      expect(link.className).toMatch(/chip/);
      expect(link.className).not.toMatch(/navLink/);
    }
  });

  it('marks no destination active — none of them is the page you are on', () => {
    render(<AdminCard />);
    for (const link of screen.getAllByRole('link')) {
      expect(link).not.toHaveAttribute('aria-current');
      expect(link.className).not.toMatch(/active/);
    }
  });

  it('carries no count badge, so each chip is label-only', () => {
    render(<AdminCard />);
    for (const [label] of DESTINATIONS) {
      expect(screen.getByRole('link', { name: label }).textContent).toBe(label);
    }
  });

  it('scrolls to the top on every destination, since each one leaves /user', () => {
    // FilterChip defaults to scroll={false}, which is right for the ?tab= chips it was built for
    // and wrong here: these are cross-page jumps, and keeping the /user offset would land the
    // reader partway down a page they have never seen.
    render(<AdminCard />);
    for (const link of screen.getAllByRole('link')) {
      expect(link).toHaveAttribute('data-scroll', 'true');
    }
  });
});
