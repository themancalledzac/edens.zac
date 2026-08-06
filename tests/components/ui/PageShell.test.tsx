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

  describe('skip link', () => {
    it('renders a skip link whose target exists and is focusable', () => {
      const { container } = render(
        <PageShell>
          <p>page body</p>
        </PageShell>
      );

      const link = screen.getByRole('link', { name: /skip to main content/i });
      expect(link).toHaveAttribute('href', '#main-content');

      const target = container.querySelector('#main-content');
      expect(target).not.toBeNull();
      expect(target).toHaveAttribute('tabindex', '-1');
      expect(target).toContainElement(screen.getByText('page body'));
    });

    it('comes first in the DOM, and its target comes after the header', () => {
      const { container } = render(<PageShell>x</PageShell>);

      const link = screen.getByRole('link', { name: /skip to main content/i });
      const header = screen.getByTestId('site-header');
      const target = container.querySelector('#main-content')!;

      expect(link.compareDocumentPosition(header) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(
        header.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    });

    it('is omitted with the header — there is nothing to skip on a status page', () => {
      render(<PageShell withHeader={false}>x</PageShell>);
      expect(screen.queryByRole('link', { name: /skip to main content/i })).not.toBeInTheDocument();
    });
  });
});
