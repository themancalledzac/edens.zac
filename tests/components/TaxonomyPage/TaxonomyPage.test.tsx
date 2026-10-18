import { render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';

import TaxonomyPage from '@/app/components/TaxonomyPage/TaxonomyPage';
import { meServer } from '@/app/lib/api/auth';
import { type MeResponse } from '@/app/types/Auth';
import { type ContentImageModel } from '@/app/types/Content';

const contentBlockProps = jest.fn();

jest.mock('@/app/lib/api/auth', () => ({
  meServer: jest.fn(() => Promise.resolve(null)),
}));

jest.mock('@/app/components/ui/PageShell/PageShell', () => ({
  __esModule: true,
  PageShell: ({ children, me }: { children: ReactNode; me?: { email: string } | null }) => (
    <div data-me={me === undefined ? 'unresolved' : (me?.email ?? 'anonymous')}>{children}</div>
  ),
}));

beforeEach(() => {
  contentBlockProps.mockClear();
});

// Mock the heavy content pipeline child so the test isolates the page heading.
jest.mock('@/app/components/Content/ContentBlockWithFullScreen', () => ({
  __esModule: true,
  default: (props: unknown) => {
    contentBlockProps(props);
    return null;
  },
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
  it('renders the entity name as the page h1', async () => {
    render(await TaxonomyPage({ entityName: 'Ada Lovelace', images: [img(1), img(2)] }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ada Lovelace');
  });

  it('renders the photo count', async () => {
    render(await TaxonomyPage({ entityName: 'Ada Lovelace', images: [img(1), img(2)] }));
    expect(screen.getByText('2 photos')).toBeInTheDocument();
  });

  it('renders an empty state instead of the content block when there are no photos', async () => {
    render(await TaxonomyPage({ entityName: 'alpine', images: [] }));
    expect(screen.getByText('No photos have this tag yet.')).toBeInTheDocument();
    expect(contentBlockProps).not.toHaveBeenCalled();
  });

  it('passes the SSR viewport to the content block', async () => {
    render(
      await TaxonomyPage({
        entityName: 'alpine',
        images: [img(1)],
        ssrViewport: { contentWidth: 640, viewportHeight: 480, isMobile: true },
      })
    );
    expect(contentBlockProps).toHaveBeenCalledWith(
      expect.objectContaining({
        ssrViewport: { contentWidth: 640, viewportHeight: 480, isMobile: true },
      })
    );
  });

  it('passes the server-resolved principal to the shell', async () => {
    jest.mocked(meServer).mockResolvedValueOnce({ email: 'a@b.c' } as MeResponse);
    const { container } = render(await TaxonomyPage({ entityName: 'alpine', images: [] }));
    expect(container.querySelector('[data-me]')).toHaveAttribute('data-me', 'a@b.c');
  });

  it('falls back to an anonymous shell when the principal read fails', async () => {
    jest.mocked(meServer).mockRejectedValueOnce(new Error('boom'));
    const { container } = render(await TaxonomyPage({ entityName: 'alpine', images: [] }));
    expect(container.querySelector('[data-me]')).toHaveAttribute('data-me', 'anonymous');
  });
});
