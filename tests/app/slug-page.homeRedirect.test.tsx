/**
 * Tests for the `/home` -> `/` temporary redirect in the collection route.
 *
 * `redirect` is mocked to throw like the real one. `HOME_SLUG` is read through a getter so the
 * twin tests can turn the home check off and show the redirect is what the main tests observe.
 */

import { render } from '@testing-library/react';
import { redirect } from 'next/navigation';

import CollectionPage from '@/app/[slug]/page';
import CollectionPageWrapper from '@/app/components/ContentCollection/CollectionPageWrapper';
import { requireAdmin } from '@/app/utils/admin';

const slugState = { home: 'home' };

jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  redirect: jest.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
  permanentRedirect: jest.fn(() => {
    throw new Error('NEXT_PERMANENT_REDIRECT');
  }),
}));

jest.mock('@/app/utils/collectionSlugs', () => {
  const actual = jest.requireActual('@/app/utils/collectionSlugs');
  return {
    ...actual,
    get HOME_SLUG() {
      return slugState.home;
    },
  };
});

jest.mock('@/app/components/ContentCollection/CollectionPageWrapper', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

jest.mock('@/app/components/StructuredData/CollectionJsonLd', () => ({
  __esModule: true,
  CollectionJsonLd: jest.fn(() => null),
}));

jest.mock('@/app/utils/admin', () => ({
  requireAdmin: jest.fn(async () => {}),
}));

const mockRedirect = redirect as unknown as jest.Mock;
const mockWrapper = CollectionPageWrapper as unknown as jest.Mock;
const mockRequireAdmin = requireAdmin as jest.MockedFunction<typeof requireAdmin>;

async function renderPage(slug: string, searchParams: { manage?: string } = {}) {
  const element = await CollectionPage({
    params: Promise.resolve({ slug }),
    searchParams: Promise.resolve(searchParams),
  });
  render(element);
}

describe('app/[slug]/page.tsx — /home redirect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    slugState.home = 'home';
  });

  it('A7: a public /home redirects to / with a temporary redirect', async () => {
    await expect(renderPage('home')).rejects.toThrow('NEXT_REDIRECT');

    expect(mockRedirect).toHaveBeenCalledTimes(1);
    expect(mockRedirect).toHaveBeenCalledWith('/');
    expect(mockWrapper).not.toHaveBeenCalled();
  });

  it('A7: /home never uses permanentRedirect', async () => {
    const nav = jest.requireMock('next/navigation');
    await expect(renderPage('home')).rejects.toThrow();

    expect(nav.permanentRedirect).not.toHaveBeenCalled();
  });

  it('A17: /home?manage=1 does not redirect and opens the edit view behind requireAdmin', async () => {
    await renderPage('home', { manage: '1' });

    expect(mockRedirect).not.toHaveBeenCalled();
    expect(mockRequireAdmin).toHaveBeenCalledTimes(1);
    expect(mockWrapper.mock.calls[0][0]).toMatchObject({ slug: 'home', editMode: true });
  });

  it('A7: /home?manage=0 still redirects', async () => {
    await expect(renderPage('home', { manage: '0' })).rejects.toThrow('NEXT_REDIRECT');

    expect(mockRedirect).toHaveBeenCalledWith('/');
  });

  it('A17: other slugs do not redirect', async () => {
    await renderPage('film');

    expect(mockRedirect).not.toHaveBeenCalled();
    expect(mockWrapper.mock.calls[0][0]).toMatchObject({ slug: 'film', editMode: false });
  });

  it('A17 twin: /home renders instead of redirecting when the home check is off', async () => {
    slugState.home = '__no-home__';

    await renderPage('home');

    expect(mockRedirect).not.toHaveBeenCalled();
    expect(mockWrapper).toHaveBeenCalledTimes(1);
  });
});
