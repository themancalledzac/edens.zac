import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

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

jest.mock('@/app/components/ui/PageShell/PageShell', () => ({
  PageShell: ({
    backHref,
    me,
    children,
  }: {
    backHref?: string;
    me?: { email: string } | null;
    children: ReactNode;
  }) => (
    <div
      data-testid="page-shell"
      data-back-href={backHref}
      data-me={me === undefined ? 'undefined' : (me?.email ?? 'null')}
    >
      {children}
    </div>
  ),
}));

const mockMeServer = jest.fn();

jest.mock('@/app/lib/api/auth', () => ({
  meServer: () => mockMeServer(),
}));

describe('ManageCollectionPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMeServer.mockResolvedValue(null);
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
    expect(screen.getByTestId('page-shell')).toHaveAttribute('data-back-href', '/admin');
    expect(screen.getByTestId('page-shell')).toContainElement(
      screen.getByTestId('create-collection-form')
    );
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

  it('hands PageShell the server-resolved principal', async () => {
    mockMeServer.mockResolvedValue({ email: 'admin@example.com', isAdmin: true });
    render(await ManageCollectionPage({ params: Promise.resolve({ slug: undefined }) }));

    expect(screen.getByTestId('page-shell')).toHaveAttribute('data-me', 'admin@example.com');
  });

  it('falls back to a null principal when meServer fails', async () => {
    mockMeServer.mockRejectedValue(new Error('Service Unavailable'));
    render(await ManageCollectionPage({ params: Promise.resolve({ slug: undefined }) }));

    expect(screen.getByTestId('page-shell')).toHaveAttribute('data-me', 'null');
    expect(screen.getByTestId('create-collection-form')).toBeInTheDocument();
  });
});
