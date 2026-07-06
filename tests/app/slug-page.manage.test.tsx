import { render } from '@testing-library/react';

import CollectionPage from '@/app/[slug]/page';
import CollectionPageWrapper from '@/app/lib/components/CollectionPageWrapper';
import { requireAdmin } from '@/app/utils/admin';

jest.mock('@/app/lib/components/CollectionPageWrapper', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

jest.mock('@/app/utils/admin', () => ({
  requireAdmin: jest.fn(async () => {}),
}));

const mockWrapper = CollectionPageWrapper as unknown as jest.Mock;
const mockRequireAdmin = requireAdmin as jest.MockedFunction<typeof requireAdmin>;

async function renderPage(slug: string, manage?: string) {
  const element = await CollectionPage({
    params: Promise.resolve({ slug }),
    searchParams: Promise.resolve(manage === undefined ? {} : { manage }),
  });
  render(element);
}

describe('app/[slug]/page.tsx — ?manage=1 entry (isAdmin-gated via requireAdmin, no environment gate)', () => {
  const originalEnv = process.env.NEXT_PUBLIC_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdmin.mockImplementation(async () => {});
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_ENV = originalEnv;
  });

  it('passes editMode=false and does NOT call requireAdmin with no ?manage param', async () => {
    process.env.NEXT_PUBLIC_ENV = 'local';
    await renderPage('film');

    expect(mockWrapper).toHaveBeenCalledTimes(1);
    expect(mockWrapper.mock.calls[0][0]).toMatchObject({ slug: 'film', editMode: false });
    expect(mockRequireAdmin).not.toHaveBeenCalled();
  });

  it('passes editMode=true and calls requireAdmin when ?manage=1 in local dev', async () => {
    process.env.NEXT_PUBLIC_ENV = 'local';
    await renderPage('film', '1');

    expect(mockWrapper).toHaveBeenCalledTimes(1);
    expect(mockWrapper.mock.calls[0][0]).toMatchObject({ slug: 'film', editMode: true });
    expect(mockRequireAdmin).toHaveBeenCalledTimes(1);
  });

  it('passes editMode=true and calls requireAdmin when ?manage=1 in production (no longer parked)', async () => {
    process.env.NEXT_PUBLIC_ENV = 'production';
    await renderPage('film', '1');

    expect(mockWrapper.mock.calls[0][0]).toMatchObject({ slug: 'film', editMode: true });
    expect(mockRequireAdmin).toHaveBeenCalledTimes(1);
  });

  it('redirects a non-admin viewer to /login in production via requireAdmin, even with ?manage=1', async () => {
    process.env.NEXT_PUBLIC_ENV = 'production';
    const redirectError = new Error('NEXT_REDIRECT');
    mockRequireAdmin.mockRejectedValueOnce(redirectError);

    await expect(renderPage('film', '1')).rejects.toThrow('NEXT_REDIRECT');
    expect(mockRequireAdmin).toHaveBeenCalledTimes(1);
    // CollectionPageWrapper must not render for a viewer requireAdmin rejects.
    expect(mockWrapper).not.toHaveBeenCalled();
  });

  it('treats any non-"1" manage value as non-edit', async () => {
    process.env.NEXT_PUBLIC_ENV = 'local';
    await renderPage('film', 'true');

    expect(mockWrapper.mock.calls[0][0]).toMatchObject({ slug: 'film', editMode: false });
    expect(mockRequireAdmin).not.toHaveBeenCalled();
  });
});
