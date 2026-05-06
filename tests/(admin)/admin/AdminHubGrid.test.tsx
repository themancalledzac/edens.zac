import { render, screen } from '@testing-library/react';

import AdminHubGrid from '@/app/(admin)/admin/AdminHubGrid';
import type { AdminTileMerged } from '@/app/(admin)/admin/adminTiles';

jest.mock('@/app/hooks/useParallax', () => ({
  useParallax: () => ({ current: null }),
}));

const tiles: AdminTileMerged[] = [
  { tileKey: 'home', label: 'Home (Preview)', href: '/homePage', coverImageUrl: null },
  {
    tileKey: 'all-images',
    label: 'All Images',
    href: '/all-images',
    coverImageUrl: 'https://cf.example/img.jpg',
  },
  {
    tileKey: 'about',
    label: 'About Me (soon)',
    href: '#',
    disabled: true,
    coverImageUrl: null,
  },
];

describe('AdminHubGrid', () => {
  it('renders one element per tile', () => {
    render(<AdminHubGrid tiles={tiles} />);
    expect(screen.getByText('Home (Preview)')).toBeInTheDocument();
    expect(screen.getByText('All Images')).toBeInTheDocument();
    expect(screen.getByText('About Me (soon)')).toBeInTheDocument();
  });

  it('renders enabled tiles as <a> links pointing at href', () => {
    render(<AdminHubGrid tiles={tiles} />);
    const homeLink = screen.getByRole('link', { name: /home \(preview\)/i });
    expect(homeLink).toHaveAttribute('href', '/homePage');
    const allImagesLink = screen.getByRole('link', { name: /all images/i });
    expect(allImagesLink).toHaveAttribute('href', '/all-images');
  });

  it('does NOT render disabled tiles as links', () => {
    render(<AdminHubGrid tiles={tiles} />);
    expect(screen.queryByRole('link', { name: /about me/i })).not.toBeInTheDocument();
  });

  it('renders an <img> when coverImageUrl is set, placeholder when null', () => {
    const { container } = render(<AdminHubGrid tiles={tiles} />);
    const images = container.querySelectorAll('img');
    expect(images.length).toBe(1);
    expect(images[0]).toHaveAttribute('alt', '');
  });
});
