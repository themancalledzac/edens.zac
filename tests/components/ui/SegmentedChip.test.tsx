import { render, screen, within } from '@testing-library/react';
import { type ReactNode } from 'react';

import { SegmentedChip } from '@/app/components/ui/SegmentedChip/SegmentedChip';

/**
 * `next/link` consumes `scroll` and never puts it on the anchor, so the real component leaves the
 * prop unobservable from the DOM. This passthrough renders the same anchor and parks the value on
 * a data attribute; every other link assertion (href, aria-current, class) is unaffected.
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

const segments = [
  {
    key: 'collections',
    label: 'Collections',
    count: 14,
    href: '/user?tab=collections',
    current: true,
  },
  { key: 'images', label: 'Images', count: 1, href: '/user?tab=images', current: false },
  { key: 'saved', label: 'Saved', href: '/user?tab=saved', current: false },
];

describe('SegmentedChip', () => {
  it('renders one link per segment inside a labelled navigation', () => {
    render(<SegmentedChip segments={segments} ariaLabel="Sections" />);
    const nav = screen.getByRole('navigation', { name: 'Sections' });
    expect(within(nav).getAllByRole('link')).toHaveLength(3);
  });

  it('marks exactly one segment current and links every segment to its href', () => {
    render(<SegmentedChip segments={segments} ariaLabel="Sections" />);
    const links = screen.getAllByRole('link');
    expect(links.filter(link => link.getAttribute('aria-current') === 'page')).toEqual([links[0]]);
    expect(links.map(link => link.getAttribute('href'))).toEqual([
      '/user?tab=collections',
      '/user?tab=images',
      '/user?tab=saved',
    ]);
  });

  it('renders a count badge only when the count is known', () => {
    render(<SegmentedChip segments={segments} ariaLabel="Sections" />);
    expect(screen.getByRole('link', { name: 'Collections' })).toHaveTextContent('Collections14');
    expect(screen.getByRole('link', { name: 'Saved' })).toHaveTextContent(/^Saved$/);
  });

  it('does not scroll when navigating between segments, so the reader stays where they were', () => {
    render(<SegmentedChip segments={segments} ariaLabel="Sections" />);
    const links = screen.getAllByRole('link');
    for (const link of links) {
      expect(link).toHaveAttribute('data-scroll', 'false');
    }
  });
});
