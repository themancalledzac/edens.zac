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

describe('app/[slug]/page.tsx — ?manage=1 entry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdmin.mockImplementation(async () => {});
  });

  it('passes editMode=false and does NOT call requireAdmin with no ?manage param', async () => {
    await renderPage('film');

    expect(mockWrapper).toHaveBeenCalledTimes(1);
    expect(mockWrapper.mock.calls[0][0]).toMatchObject({ slug: 'film', editMode: false });
    expect(mockRequireAdmin).not.toHaveBeenCalled();
  });

  it('passes editMode=true and calls requireAdmin when ?manage=1', async () => {
    await renderPage('film', '1');

    expect(mockWrapper).toHaveBeenCalledTimes(1);
    expect(mockWrapper.mock.calls[0][0]).toMatchObject({ slug: 'film', editMode: true });
    expect(mockRequireAdmin).toHaveBeenCalledTimes(1);
  });

  it('treats any non-"1" manage value as non-edit (editMode=false, no requireAdmin)', async () => {
    await renderPage('film', 'true');

    expect(mockWrapper.mock.calls[0][0]).toMatchObject({ slug: 'film', editMode: false });
    expect(mockRequireAdmin).not.toHaveBeenCalled();
  });
});
