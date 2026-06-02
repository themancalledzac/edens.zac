import { render, screen } from '@testing-library/react';

import TaxonomyPage from '@/app/components/TaxonomyPage/TaxonomyPage';
import { type ContentImageModel } from '@/app/types/Content';

// Mock the heavy content pipeline child so the test isolates the page heading.
jest.mock('@/app/components/Content/ContentBlockWithFullScreen', () => ({
  __esModule: true,
  default: () => null,
}));

// PageShell renders SiteHeader, which transitively pulls in next/cache (via
// clearCache) and cannot run under jsdom. Stub it so the real CollectionHeader
// h1 still renders. CollectionHeader itself is intentionally NOT mocked.
jest.mock('@/app/components/SiteHeader/SiteHeader', () => ({
  __esModule: true,
  default: () => null,
  SiteHeader: () => null,
}));

const img = (id: number): ContentImageModel => ({
  id,
  contentType: 'IMAGE',
  orderIndex: id,
  imageUrl: `https://cdn/${id}.jpg`,
  locations: [],
});

describe('TaxonomyPage', () => {
  it('renders the entity name as the page h1', () => {
    render(<TaxonomyPage entityName="Ada Lovelace" images={[img(1), img(2)]} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ada Lovelace');
  });

  it('renders the photo count', () => {
    render(<TaxonomyPage entityName="Ada Lovelace" images={[img(1), img(2)]} />);
    expect(screen.getByText('2 photos')).toBeInTheDocument();
  });

  it('renders a fallback heading when entityName is empty or whitespace', () => {
    render(<TaxonomyPage entityName="   " images={[img(1)]} />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Untitled');
    expect(heading.textContent?.trim()).not.toBe('');
  });
});
