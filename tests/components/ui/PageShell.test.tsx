import { render, screen } from '@testing-library/react';

import { PageShell } from '@/app/components/ui/PageShell/PageShell';

const mockSiteHeader = jest.fn();

jest.mock('@/app/components/SiteHeader/SiteHeader', () => {
  const stub = (props: { isCollectionPage?: boolean; collectionSlug?: string }) => {
    mockSiteHeader(props);
    return (
      <div
        data-testid="site-header"
        data-collection-page={String(Boolean(props.isCollectionPage))}
        data-collection-slug={props.collectionSlug}
      />
    );
  };
  return { __esModule: true, default: stub, SiteHeader: stub };
});

const mockBottomNav = jest.fn();

jest.mock('@/app/components/ui/BottomNav/BottomNav', () => ({
  __esModule: true,
  BottomNav: (props: { me?: unknown }) => {
    mockBottomNav(props);
    return <nav data-testid="bottom-nav" />;
  },
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

  describe('footer', () => {
    it('renders one footer after <main>, as a child of the container', () => {
      const { container } = render(<PageShell>x</PageShell>);
      const main = screen.getByRole('main');
      const footer = screen.getByRole('contentinfo');

      expect(container.querySelectorAll('footer')).toHaveLength(1);
      expect(footer.parentElement).toBe(main.parentElement);
      expect(main.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(main).not.toContainElement(footer);
    });

    it('omits the footer when withFooter={false}', () => {
      const { container } = render(<PageShell withFooter={false}>x</PageShell>);
      expect(container.querySelector('footer')).toBeNull();
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
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

/**
 * A16 / A15: the shell forwards the server-resolved `me` to SiteHeader unchanged. Omitted stays
 * undefined (the menu fetches on first open); null stays null (anonymous, no fetch).
 */
describe('PageShell — me forwarding', () => {
  beforeEach(() => {
    mockSiteHeader.mockClear();
  });

  const signedIn = { id: 7, email: 'a@example.com' } as unknown as Parameters<
    typeof PageShell
  >[0]['me'];

  it('A16: forwards a signed-in me to SiteHeader as the same object', () => {
    render(<PageShell me={signedIn}>x</PageShell>);
    expect(mockSiteHeader.mock.calls[0][0].me).toBe(signedIn);
  });

  it('A16: forwards null (anonymous) as null', () => {
    render(<PageShell me={null}>x</PageShell>);
    expect(mockSiteHeader.mock.calls[0][0].me).toBeNull();
  });

  it('A16b: an omitted me reaches SiteHeader as undefined, not null', () => {
    render(<PageShell>x</PageShell>);
    expect(mockSiteHeader.mock.calls[0][0].me).toBeUndefined();
  });

  it('A15: an omitted me is not coerced to anonymous, so the menu still fetches on open', () => {
    render(<PageShell collectionSlug="abc">x</PageShell>);
    expect(mockSiteHeader.mock.calls[0][0].me).not.toBeNull();
  });
});

/**
 * `backHref` opts a page into a "← Admin" link as the first element inside the skip target. Unset
 * renders nothing extra.
 */
describe('PageShell — back link', () => {
  it('renders no link when backHref is unset', () => {
    const { container } = render(<PageShell>x</PageShell>);
    expect(container.querySelector('#main-content')!.querySelector('a')).toBeNull();
  });

  it('renders a link to backHref reading "← Admin" with the arrow aria-hidden', () => {
    render(<PageShell backHref="/admin">x</PageShell>);
    const link = screen.getByRole('link', { name: 'Admin' });
    expect(link).toHaveAttribute('href', '/admin');
    expect(link).toHaveTextContent('← Admin');
    expect(link.querySelector('span')).toHaveAttribute('aria-hidden', 'true');
  });

  it('uses backLabel when given', () => {
    render(
      <PageShell backHref="/admin/users" backLabel="Users">
        x
      </PageShell>
    );
    expect(screen.getByRole('link', { name: 'Users' })).toHaveTextContent('← Users');
  });

  it('places the link first inside the skip target, before the children', () => {
    const { container } = render(
      <PageShell backHref="/admin">
        <p>page body</p>
      </PageShell>
    );
    const target = container.querySelector('#main-content')!;
    const link = screen.getByRole('link', { name: 'Admin' });
    expect(target.firstElementChild).toBe(link);
    expect(
      link.compareDocumentPosition(screen.getByText('page body')) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });
});

/**
 * The mobile bottom bar renders beside the header and takes the same `me`. It is left out when the
 * caller hides it or when the shell renders no header.
 */
describe('PageShell — bottom nav', () => {
  beforeEach(() => {
    mockBottomNav.mockClear();
  });

  it('renders the bar by default', () => {
    render(<PageShell>x</PageShell>);
    expect(screen.getByTestId('bottom-nav')).toBeInTheDocument();
  });

  it('omits the bar with hideBottomNav', () => {
    render(<PageShell hideBottomNav>x</PageShell>);
    expect(screen.queryByTestId('bottom-nav')).not.toBeInTheDocument();
    expect(screen.getByTestId('site-header')).toBeInTheDocument();
  });

  it('omits the bar with withHeader={false}', () => {
    render(<PageShell withHeader={false}>x</PageShell>);
    expect(screen.queryByTestId('bottom-nav')).not.toBeInTheDocument();
  });

  it('S1: passes the same me object, null and undefined through', () => {
    const me = { id: 7 } as unknown as Parameters<typeof PageShell>[0]['me'];
    const { unmount } = render(<PageShell me={me}>x</PageShell>);
    expect(mockBottomNav.mock.calls[0][0].me).toBe(me);
    unmount();
    mockBottomNav.mockClear();
    const second = render(<PageShell me={null}>x</PageShell>);
    expect(mockBottomNav.mock.calls[0][0].me).toBeNull();
    second.unmount();
    mockBottomNav.mockClear();
    render(<PageShell>x</PageShell>);
    expect(mockBottomNav.mock.calls[0][0].me).toBeUndefined();
  });
});
