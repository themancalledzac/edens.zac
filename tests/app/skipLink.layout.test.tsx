/**
 * The skip link is rendered once, from the root layout, above the route segment's Suspense
 * boundary. That position is the whole point of the component: rendered inside a page shell it
 * arrived in React's deferred buffer, so the site-wide footer's links were the page's first two
 * tab stops until the boundary resolved (measured at 459ms on `/collections` in a production
 * build).
 *
 * These tests render the REAL `RootLayout` around each page shell and assert against the emitted
 * markup, so they pin stream order rather than a hand-rolled approximation of the layout.
 */
import { type ReactNode } from 'react';
// The `.node` entry point rather than bare `react-dom/server`: under jsdom the bare specifier
// resolves to the browser build, which reaches for a MessageChannel jsdom does not provide.
import { renderToStaticMarkup } from 'react-dom/server.node';

import CollectionPage from '@/app/components/ContentCollection/CollectionPage';
import { PageShell } from '@/app/components/ui/PageShell/PageShell';
import RootLayout from '@/app/layout';
import Loading from '@/app/loading';
import { type CollectionModel } from '@/app/types/Collection';
import { CollectionVisibility } from '@/app/types/CollectionVisibility';

// The real header pulls next/cache (via MenuDropdown -> clearCacheAction) and cannot run here.
// The stand-in still emits focusable chrome, so "the skip link is the FIRST focusable" is a real
// claim about tab order rather than a claim about an empty page.
jest.mock('@/app/components/SiteHeader/SiteHeader', () => {
  const Stub = () => (
    <header data-testid="site-header">
      <button type="button">Home</button>
      <button type="button">Menu</button>
    </header>
  );
  return { __esModule: true, default: Stub, SiteHeader: Stub };
});

jest.mock('@/app/components/ContentCollection/CollectionPageClient', () => ({
  __esModule: true,
  default: () => <button type="button">gallery control</button>,
}));

jest.mock('@/app/components/Content/ContentBlockWithFullScreen', () => ({
  __esModule: true,
  default: () => <button type="button">grid control</button>,
}));

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function makeCollection(overrides: Partial<CollectionModel> = {}): CollectionModel {
  return {
    id: 1,
    slug: 'dolomites',
    title: 'Dolomites',
    isClient: false,
    isBlog: true,
    locations: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    visibility: CollectionVisibility.LISTED,
    content: [],
    ...overrides,
  };
}

/** Server-renders a whole document — root layout plus the given route body. */
function renderRoute(children: ReactNode): { doc: Document; html: string } {
  const html = renderToStaticMarkup(<RootLayout>{children}</RootLayout>);
  return { doc: new DOMParser().parseFromString(html, 'text/html'), html };
}

function focusables(doc: Document): Element[] {
  return [...doc.querySelectorAll(FOCUSABLE_SELECTOR)];
}

const routes: Array<[string, () => ReactNode]> = [
  ['PageShell', () => <PageShell>page body</PageShell>],
  ['CollectionPage (single collection)', () => <CollectionPage collection={makeCollection()} />],
  ['CollectionPage (collection array)', () => <CollectionPage collection={[makeCollection()]} />],
];

describe('skip link, composed through the root layout', () => {
  describe.each(routes)('%s', (_name, renderBody) => {
    it('renders exactly one skip link', () => {
      const { doc } = renderRoute(renderBody());
      expect(doc.querySelectorAll('a[href="#main-content"]')).toHaveLength(1);
    });

    it('puts the skip link first in the tab order, ahead of the header and the footer', () => {
      const { doc } = renderRoute(renderBody());
      const link = doc.querySelector('a[href="#main-content"]');

      expect(focusables(doc)[0]).toBe(link);
      expect(focusables(doc).length).toBeGreaterThan(1);
    });

    it('resolves its href to a focusable target that excludes the header', () => {
      const { doc } = renderRoute(renderBody());
      const target = doc.querySelector('#main-content');
      const header = doc.querySelector('header');

      expect(target).not.toBeNull();
      expect(target?.getAttribute('tabindex')).toBe('-1');
      expect(target?.contains(header)).toBe(false);
    });

    /**
     * The regression itself. The footer ships with the shell; before the fix the link shipped with
     * the page inside the Suspense boundary, so it appeared LATER in the byte stream than the
     * footer and the footer's Instagram/GitHub links were reachable first.
     */
    it('appears earlier in the emitted markup than the footer', () => {
      const { html } = renderRoute(renderBody());
      expect(html.indexOf('Skip to main content')).toBeGreaterThan(-1);
      expect(html.indexOf('Skip to main content')).toBeLessThan(html.indexOf('<footer'));
    });
  });

  it('emits the skip link before the route body, so no route can push it down the stream', () => {
    const { html } = renderRoute(<p id="route-content">route</p>);
    expect(html.indexOf('Skip to main content')).toBeLessThan(html.indexOf('id="route-content"'));
  });

  /**
   * The load-bearing assertion. Every route streams inside a Suspense boundary whose fallback is
   * `app/loading.tsx`; the shell around it — footer included — flushes first. Standing in for that
   * pending shell, the markup must ALREADY carry the skip link, ahead of the footer. A skip link
   * rendered by a page shell fails here, because the page has not resolved yet: that is exactly
   * the window in which the footer's Instagram and GitHub links were the first two tab stops.
   */
  it('carries the skip link in the shell that flushes while the route is still pending', () => {
    const { doc, html } = renderRoute(<Loading />);

    expect(doc.querySelectorAll('a[href="#main-content"]')).toHaveLength(1);
    expect(html.indexOf('Skip to main content')).toBeLessThan(html.indexOf('<footer'));
  });

  /**
   * Status pages render `PageShell` with no header. They used to get no skip link at all; the
   * hoisted link is unconditional, so they now get exactly one — and `PageShell` still supplies
   * the target, so it resolves.
   */
  it('still renders one resolvable skip link on a header-less status shell', () => {
    const { doc } = renderRoute(<PageShell withHeader={false}>status body</PageShell>);
    expect(doc.querySelectorAll('a[href="#main-content"]')).toHaveLength(1);
    expect(doc.querySelector('#main-content')).not.toBeNull();
  });
});
