import { act, render, screen } from '@testing-library/react';
import { isValidElement } from 'react';

import { ADMIN_TILES } from '@/app/(admin)/admin/adminTiles';
import AdminHubPage from '@/app/(admin)/admin/page';
import { clearCachedPanelData } from '@/app/hooks/useCachedPanelData';
import * as adminHomeApi from '@/app/lib/api/adminHome';
import * as rolesApi from '@/app/lib/api/roles';
import * as usersApi from '@/app/lib/api/users';
import { type AdminUserSummary } from '@/app/types/User';

jest.mock('@/app/lib/api/adminHome');

/**
 * The page fetches these two lists for their row counts and then hands them to the panels as their
 * cache seed, so the panels render them here rather than stubbing themselves out. Only the list
 * calls are replaced; the rest of each module stays real, since the panels import from it.
 */
jest.mock('@/app/lib/api/users', () => ({
  ...jest.requireActual('@/app/lib/api/users'),
  listUsers: jest.fn(() => Promise.resolve([])),
}));
jest.mock('@/app/lib/api/roles', () => ({
  ...jest.requireActual('@/app/lib/api/roles'),
  listRoles: jest.fn(() => Promise.resolve([])),
}));
jest.mock('@/app/hooks/useParallax', () => ({
  useParallax: () => ({ current: null }),
}));
jest.mock('@/app/utils/ssrViewport', () => ({
  resolveSsrViewport: jest.fn().mockResolvedValue({
    contentWidth: 1200,
    viewportHeight: 800,
    isMobile: false,
  }),
}));
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/admin',
}));

const mockGetTiles = adminHomeApi.getAdminHomeTiles as jest.MockedFunction<
  typeof adminHomeApi.getAdminHomeTiles
>;
const mockListUsers = usersApi.listUsers as jest.MockedFunction<typeof usersApi.listUsers>;
const mockListRoles = rolesApi.listRoles as jest.MockedFunction<typeof rolesApi.listRoles>;

const ADA: AdminUserSummary = {
  id: 5,
  email: 'ada@example.com',
  displayName: 'Ada',
  status: 'ACTIVE',
  description: null,
};

describe('AdminHubPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListUsers.mockResolvedValue([]);
    mockListRoles.mockResolvedValue([]);
    clearCachedPanelData();
    window.localStorage.clear();
  });

  it('renders every configured tile label', async () => {
    mockGetTiles.mockResolvedValue([]);
    const ui = await AdminHubPage();
    render(ui);

    for (const tile of ADMIN_TILES) {
      expect(screen.getByText(tile.label)).toBeInTheDocument();
    }
  });

  it('merges API cover URLs into the matching tile keys', async () => {
    mockGetTiles.mockResolvedValue([
      {
        tileKey: 'all-images',
        coverImageUrl: 'https://cf.example/all-images.jpg',
        displayOrder: 2,
      },
    ]);
    const ui = await AdminHubPage();
    const { container } = render(ui);

    const images = container.querySelectorAll('img');
    expect(images.length).toBeGreaterThanOrEqual(1);
  });

  it('pins the content block to a single column on mobile', async () => {
    mockGetTiles.mockResolvedValue([]);
    const ui = await AdminHubPage();

    const findMobileChunkSize = (node: unknown): number | undefined => {
      if (Array.isArray(node)) {
        for (const child of node) {
          const found = findMobileChunkSize(child);
          if (found !== undefined) return found;
        }
        return undefined;
      }
      if (!isValidElement(node)) return undefined;
      const props = node.props as { mobileChunkSize?: number; children?: unknown };
      if (props.mobileChunkSize !== undefined) return props.mobileChunkSize;
      return findMobileChunkSize(props.children);
    };

    expect(findMobileChunkSize(ui)).toBe(1);
  });

  /**
   * The single-fetch rule across the server/client boundary. The page needs these lists for the
   * panels' row counts, so keeping only `.length` and letting the client re-request them is a
   * duplicate fetch AND a "Loading…" paint over data already in hand. Asserted on the first commit,
   * with nothing awaited: a list on screen at that point can only have come from the server's.
   */
  it('seeds the panels with the lists it fetched for their row counts', async () => {
    mockGetTiles.mockResolvedValue([]);
    mockListUsers.mockResolvedValue([ADA]);
    mockListRoles.mockResolvedValue([{ id: 1, name: 'editor' }]);

    const ui = await AdminHubPage();
    render(ui);

    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.getByText('editor')).toBeInTheDocument();
    expect(screen.queryByText('Loading users…')).not.toBeInTheDocument();

    await act(async () => {});
  });

  /** A server-side failure seeds nothing, so the panel loads for itself rather than showing `[]`. */
  it('does not seed an empty list when the server fetch failed', async () => {
    mockGetTiles.mockResolvedValue([]);
    mockListUsers.mockRejectedValue(new Error('backend down'));

    const ui = await AdminHubPage();
    render(ui);

    expect(screen.getByText('Loading users…')).toBeInTheDocument();
    expect(screen.queryByText(/no users yet/i)).not.toBeInTheDocument();

    await act(async () => {});
  });

  it('falls back gracefully when the API throws', async () => {
    mockGetTiles.mockRejectedValue(new Error('backend down'));
    const ui = await AdminHubPage();
    render(ui);

    for (const tile of ADMIN_TILES) {
      expect(screen.getByText(tile.label)).toBeInTheDocument();
    }
  });
});
