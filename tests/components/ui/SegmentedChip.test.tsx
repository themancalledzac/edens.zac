import { render, screen, within } from '@testing-library/react';

import { SegmentedChip } from '@/app/components/ui/SegmentedChip/SegmentedChip';

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
});
