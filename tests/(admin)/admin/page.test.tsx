import { render, screen } from '@testing-library/react';

import { ADMIN_TILES } from '@/app/(admin)/admin/adminTiles';
import AdminHubPage from '@/app/(admin)/admin/page';
import * as adminHomeApi from '@/app/lib/api/adminHome';

jest.mock('@/app/lib/api/adminHome');
jest.mock('@/app/hooks/useParallax', () => ({
  useParallax: () => ({ current: null }),
}));
// Page transitively imports AdminActionBox → actions → next/cache, which
// references Request/TextEncoder at module init and breaks under jsdom.
// Stubbing next/cache short-circuits the chain.
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));

const mockGetTiles = adminHomeApi.getAdminHomeTiles as jest.MockedFunction<
  typeof adminHomeApi.getAdminHomeTiles
>;

describe('AdminHubPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    expect(images.length).toBe(1);
  });

  it('falls back to placeholders when the API throws', async () => {
    mockGetTiles.mockRejectedValue(new Error('backend down'));
    const ui = await AdminHubPage();
    const { container } = render(ui);

    expect(container.querySelectorAll('img').length).toBe(0);
    for (const tile of ADMIN_TILES) {
      expect(screen.getByText(tile.label)).toBeInTheDocument();
    }
  });

  it('renders the Clear Cache button (action box wired up)', async () => {
    mockGetTiles.mockResolvedValue([]);
    const ui = await AdminHubPage();
    render(ui);
    expect(screen.getByRole('button', { name: /clear cache/i })).toBeInTheDocument();
  });
});
