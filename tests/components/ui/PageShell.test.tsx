import { render, screen } from '@testing-library/react';

import { PageShell } from '@/app/components/ui/PageShell/PageShell';

jest.mock('@/app/components/SiteHeader/SiteHeader', () => ({
  __esModule: true,
  default: ({ pageType }: { pageType?: string }) => (
    <div data-testid="site-header" data-page-type={pageType} />
  ),
  SiteHeader: ({ pageType }: { pageType?: string }) => (
    <div data-testid="site-header" data-page-type={pageType} />
  ),
}));

describe('PageShell', () => {
  it('renders SiteHeader, a <main>, and its children', () => {
    render(
      <PageShell>
        <p>page body</p>
      </PageShell>
    );
    expect(screen.getByTestId('site-header')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByText('page body')).toBeInTheDocument();
  });

  it('forwards pageType and collectionSlug to SiteHeader', () => {
    render(
      <PageShell pageType="collectionsCollection" collectionSlug="abc">
        x
      </PageShell>
    );
    expect(screen.getByTestId('site-header')).toHaveAttribute(
      'data-page-type',
      'collectionsCollection'
    );
  });

  it('omits SiteHeader when withHeader={false}', () => {
    render(<PageShell withHeader={false}>x</PageShell>);
    expect(screen.queryByTestId('site-header')).not.toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});
