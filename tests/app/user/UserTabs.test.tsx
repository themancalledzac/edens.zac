/**
 * Tests for UserTabs — the /user section switcher that replaced the client-side tab component.
 * Sections are addressed by `?tab=`, so each tab is a link and the active one is marked with
 * `aria-current="page"` rather than the ARIA tabs pattern's `aria-selected`.
 */
import { render, screen } from '@testing-library/react';

import { UserTabs } from '@/app/user/UserTabs';

const tabs = [
  { key: 'collections', label: 'Collections', count: 3 },
  { key: 'images', label: 'Images', count: 0 },
  { key: 'saved', label: 'Saved', count: 12 },
  { key: 'following', label: 'Following', count: 1 },
];

describe('UserTabs', () => {
  it('renders one link per tab, pointing at its ?tab= value', () => {
    render(<UserTabs tabs={tabs} activeKey="collections" />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(4);
    expect(links.map(a => a.getAttribute('href'))).toEqual([
      '/user?tab=collections',
      '/user?tab=images',
      '/user?tab=saved',
      '/user?tab=following',
    ]);
  });

  it('marks only the active tab with aria-current', () => {
    render(<UserTabs tabs={tabs} activeKey="saved" />);
    expect(screen.getByRole('link', { name: /Saved/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /Images/ })).not.toHaveAttribute('aria-current');
  });

  it('shows each tab count, including zero', () => {
    render(<UserTabs tabs={tabs} activeKey="collections" />);
    expect(screen.getByRole('link', { name: /Collections/ })).toHaveTextContent('3');
    expect(screen.getByRole('link', { name: /Images/ })).toHaveTextContent('0');
  });

  it('labels the nav so the section switcher is identifiable', () => {
    render(<UserTabs tabs={tabs} activeKey="collections" />);
    expect(screen.getByRole('navigation', { name: 'Your space' })).toBeInTheDocument();
  });
});
