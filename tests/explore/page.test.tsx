/**
 * `/explore` is public, so the directory reads only the public `/api/read` channel: the admin
 * channel refuses everyone but admins (401 at the BFF, 403 at the backend).
 *
 * `fetch` is the mock boundary, so `getAllTags` and `getAllLocations` run for real against bodies
 * in the backend's wire shape. `PageShell` is a passthrough because it mounts the site header's
 * client tree.
 */
import '@testing-library/jest-dom';

import { render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';

import { ExploreDirectory } from '@/app/explore/ExploreDirectory';
import ExplorePage from '@/app/explore/page';
import { meServer } from '@/app/lib/api/auth';
import { type MeResponse } from '@/app/types/Auth';

jest.mock('@/app/lib/api/auth', () => ({
  meServer: jest.fn(() => Promise.resolve(null)),
}));

jest.mock('@/app/components/ui/PageShell/PageShell', () => ({
  __esModule: true,
  PageShell: ({ children, me }: { children: ReactNode; me?: { email: string } | null }) => (
    <div data-me={me === undefined ? 'unresolved' : (me?.email ?? 'anonymous')}>{children}</div>
  ),
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

/** Backend `Records.Tag`. */
interface WireTag {
  id: number;
  name: string;
  slug: string;
}

/** Backend `Records.LocationWithCounts`. */
interface WireLocation {
  id: number;
  name: string;
  slug: string;
  collectionCount: number;
  imageCount: number;
}

const mockFetch = jest.fn();
global.fetch = mockFetch;

const respond = (status: number, body: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: '',
  json: async () => body,
});

const wireLocation = (id: number, name: string, slug: string): WireLocation => ({
  id,
  name,
  slug,
  collectionCount: 1,
  imageCount: 0,
});

/**
 * Answer the two public directory reads. Any other URL gets a 404, so a read from another channel
 * fails the render instead of passing silently.
 */
function serveDirectory({
  tags = [],
  locations = [],
  failing,
}: {
  tags?: WireTag[];
  locations?: WireLocation[];
  failing?: 'tags' | 'locations';
} = {}) {
  mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith('/api/read/content/tags')) {
      return failing === 'tags' ? respond(500, { message: 'boom' }) : respond(200, tags);
    }
    if (url.endsWith('/api/read/content/locations')) {
      return failing === 'locations' ? respond(500, { message: 'boom' }) : respond(200, locations);
    }
    return respond(404, { message: 'Not found' });
  });
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe('ExploreDirectory', () => {
  it('reads tags and locations from the public read channel only', async () => {
    serveDirectory();

    render(await ExploreDirectory());

    const urls = mockFetch.mock.calls.map(([input]) => String(input)).sort();
    expect(urls).toEqual([
      expect.stringMatching(/\/api\/read\/content\/locations$/),
      expect.stringMatching(/\/api\/read\/content\/tags$/),
    ]);
  });

  it('links tags to /tag/[slug] and locations to /location/[slug] under their own headings', async () => {
    serveDirectory({
      tags: [{ id: 1, name: 'Mountains', slug: 'mountains' }],
      locations: [wireLocation(3, 'Patagonia', 'patagonia')],
    });

    render(await ExploreDirectory());

    expect(screen.getByRole('heading', { name: 'Locations' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Tags' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'People' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mountains' })).toHaveAttribute(
      'href',
      '/tag/mountains'
    );
    expect(screen.getByRole('link', { name: 'Patagonia' })).toHaveAttribute(
      'href',
      '/location/patagonia'
    );
  });

  it('renders every directory link as a FilterChip link', async () => {
    serveDirectory({
      tags: [{ id: 1, name: 'Mountains', slug: 'mountains' }],
      locations: [wireLocation(3, 'Patagonia', 'patagonia')],
    });

    render(await ExploreDirectory());

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    for (const link of links) {
      expect(link.className).toMatch(/chip/);
    }
    expect(screen.getByRole('link', { name: 'Mountains' })).toHaveAttribute(
      'href',
      '/tag/mountains'
    );
    expect(screen.getByRole('link', { name: 'Patagonia' })).toHaveAttribute(
      'href',
      '/location/patagonia'
    );
  });

  it('renders a link for every tag and location', async () => {
    serveDirectory({
      tags: [
        { id: 1, name: 'Mountains', slug: 'mountains' },
        { id: 2, name: 'Rivers', slug: 'rivers' },
      ],
      locations: [
        wireLocation(4, 'Patagonia', 'patagonia'),
        wireLocation(5, 'Dolomites', 'dolomites'),
      ],
    });

    render(await ExploreDirectory());

    expect(screen.getAllByRole('link')).toHaveLength(4);
  });

  it('omits locations with an empty slug (no /location/ links)', async () => {
    serveDirectory({
      locations: [wireLocation(1, 'Patagonia', 'patagonia'), wireLocation(2, 'Nowhere', '')],
    });

    render(await ExploreDirectory());

    expect(screen.getByRole('link', { name: 'Patagonia' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Nowhere' })).not.toBeInTheDocument();
  });

  it.each(['tags', 'locations'] as const)(
    'renders the unreachable-directory message when the %s read fails',
    async failing => {
      serveDirectory({
        tags: [{ id: 1, name: 'Mountains', slug: 'mountains' }],
        locations: [wireLocation(3, 'Patagonia', 'patagonia')],
        failing,
      });

      render(await ExploreDirectory());

      expect(screen.getByText(/unable to load/i)).toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    }
  );

  it('renders a friendly empty state when there are no tags or locations', async () => {
    serveDirectory();

    render(await ExploreDirectory());

    expect(screen.getByText(/nothing to explore yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});

/**
 * The route itself is synchronous — that is the point of the split. The heading is in the first
 * paint while the directory is still suspended.
 */
describe('ExplorePage', () => {
  it('paints the heading while the directory is still suspended', async () => {
    serveDirectory({ tags: [{ id: 1, name: 'Mountains', slug: 'mountains' }] });

    render(await ExplorePage());

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Explore' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Tags' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Mountains' })).not.toBeInTheDocument();
  });

  it('passes the server-resolved principal to the shell', async () => {
    serveDirectory();
    jest.mocked(meServer).mockResolvedValueOnce({ email: 'a@b.c' } as MeResponse);

    const { container } = render(await ExplorePage());

    expect(container.querySelector('[data-me]')).toHaveAttribute('data-me', 'a@b.c');
  });

  it('falls back to an anonymous shell when the principal read fails', async () => {
    serveDirectory();
    jest.mocked(meServer).mockRejectedValueOnce(new Error('boom'));

    const { container } = render(await ExplorePage());

    expect(container.querySelector('[data-me]')).toHaveAttribute('data-me', 'anonymous');
  });
});
