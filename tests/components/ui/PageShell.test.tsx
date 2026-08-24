import { render, screen } from '@testing-library/react';

import { PageShell } from '@/app/components/ui/PageShell/PageShell';

jest.mock('@/app/components/SiteHeader/SiteHeader', () => {
  const stub = ({
    isCollectionPage,
    collectionSlug,
  }: {
    isCollectionPage?: boolean;
    collectionSlug?: string;
  }) => (
    <div
      data-testid="site-header"
      data-collection-page={String(Boolean(isCollectionPage))}
      data-collection-slug={collectionSlug}
    />
  );
  return { __esModule: true, default: stub, SiteHeader: stub };
});

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

  it('forwards collectionSlug to SiteHeader', () => {
    render(<PageShell collectionSlug="abc">x</PageShell>);
    expect(screen.getByTestId('site-header')).toHaveAttribute('data-collection-slug', 'abc');
  });

  /**
   * E17 removed `pageType` from the shell rather than converting it to a boolean: nothing the shell
   * wraps is a single collection's page. This pins the consequence — the shell's header is never a
   * collection header, which is what keeps the admin Update item off these pages now that no caller
   * can ask for it.
   */
  it('never marks its header as a collection page', () => {
    render(<PageShell collectionSlug="abc">x</PageShell>);
    expect(screen.getByTestId('site-header')).toHaveAttribute('data-collection-page', 'false');
  });

  it('omits SiteHeader when withHeader={false}', () => {
    render(<PageShell withHeader={false}>x</PageShell>);
    expect(screen.queryByTestId('site-header')).not.toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  /**
   * The shell supplies only the landing zone. The link itself is rendered once from the root
   * layout, above the route's Suspense boundary — see tests/app/skipLink.layout.test.tsx, which
   * pins that stream order and composes the two halves.
   */
  describe('skip target', () => {
    it('wraps the children in a focusable #main-content target', () => {
      const { container } = render(
        <PageShell>
          <p>page body</p>
        </PageShell>
      );

      const target = container.querySelector('#main-content');
      expect(target).not.toBeNull();
      expect(target).toHaveAttribute('tabindex', '-1');
      expect(target).toContainElement(screen.getByText('page body'));
    });

    it('places the target after the header, so the jump actually skips it', () => {
      const { container } = render(<PageShell>x</PageShell>);

      const header = screen.getByTestId('site-header');
      const target = container.querySelector('#main-content')!;

      expect(
        header.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
      expect(target).not.toContainElement(header);
    });

    it('still renders the target with withHeader={false} — the layout link is unconditional', () => {
      const { container } = render(<PageShell withHeader={false}>x</PageShell>);
      expect(container.querySelector('#main-content')).not.toBeNull();
    });

    it('renders no skip link of its own, which would duplicate the layout tab stop', () => {
      render(<PageShell>x</PageShell>);
      expect(screen.queryByRole('link', { name: /skip to main content/i })).not.toBeInTheDocument();
    });
  });
});
