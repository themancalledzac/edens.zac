import { render, screen } from '@testing-library/react';

import ManageCollectionPage from '@/app/(admin)/collection/manage/[[...slug]]/page';

const mockRedirect = jest.fn();

jest.mock('next/navigation', () => ({
  redirect: (path: string) => mockRedirect(path),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock('@/app/(admin)/collection/manage/[[...slug]]/CreateCollectionForm', () => ({
  __esModule: true,
  default: () => <div data-testid="create-collection-form" />,
}));

describe('ManageCollectionPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls redirect to /<slug>?manage=1 when a slug is present', async () => {
    const ui = await ManageCollectionPage({ params: Promise.resolve({ slug: ['paris-trip'] }) });
    if (ui) render(ui);

    expect(mockRedirect).toHaveBeenCalledWith('/paris-trip?manage=1');
    expect(mockRedirect).toHaveBeenCalledTimes(1);
  });

  it('renders CreateCollectionForm when no slug segment is present', async () => {
    const ui = await ManageCollectionPage({ params: Promise.resolve({ slug: undefined }) });
    render(ui);

    expect(mockRedirect).not.toHaveBeenCalled();
    expect(screen.getByTestId('create-collection-form')).toBeInTheDocument();
  });

  it('renders CreateCollectionForm when the slug array is empty', async () => {
    const ui = await ManageCollectionPage({ params: Promise.resolve({ slug: [] }) });
    render(ui);

    expect(mockRedirect).not.toHaveBeenCalled();
    expect(screen.getByTestId('create-collection-form')).toBeInTheDocument();
  });

  it('calls redirect with only the first slug segment when multiple segments are present', async () => {
    const ui = await ManageCollectionPage({
      params: Promise.resolve({ slug: ['first-slug', 'ignored'] }),
    });
    if (ui) render(ui);

    expect(mockRedirect).toHaveBeenCalledWith('/first-slug?manage=1');
  });
});
