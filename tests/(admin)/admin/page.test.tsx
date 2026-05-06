import { render, screen } from '@testing-library/react';

import { ADMIN_TILES } from '@/app/(admin)/admin/adminTiles';
import AdminHubPage from '@/app/(admin)/admin/page';
import * as adminHomeApi from '@/app/lib/api/adminHome';

jest.mock('@/app/lib/api/adminHome');
jest.mock('@/app/hooks/useParallax', () => ({
  useParallax: () => ({ current: null }),
}));
// SiteHeader → MenuDropdown → clearCache action → next/cache, which references
// Request/TextEncoder at module init and breaks under jsdom. Stub the chain.
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));
// MenuDropdown calls useRouter unconditionally; jsdom has no app-router context.
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/admin',
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
});
