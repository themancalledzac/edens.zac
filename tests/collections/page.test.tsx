/** @jest-environment node */
import { type ReactNode } from 'react';

import { type CollectionModel } from '@/app/types/Collection';
import { createCollectionContent } from '@/tests/fixtures/contentFixtures';

jest.mock('@/app/lib/api/collections', () => ({
  getScopedAllCollections: jest.fn(),
}));
jest.mock('@/app/lib/api/auth', () => ({
  meServer: jest.fn(() => Promise.resolve(null)),
}));
jest.mock('@/app/utils/ssrViewport', () => ({
  resolveSsrViewport: jest.fn(),
}));
jest.mock('@/app/components/ContentCollection/CollectionPageClient', () => ({
  __esModule: true,
  default: () => 'CollectionPageClient',
}));
jest.mock('@/app/components/ui/PageShell/PageShell', () => ({
  __esModule: true,
  PageShell: jest.fn(({ children }: { children: ReactNode }) => children),
  default: ({ children }: { children: ReactNode }) => children,
}));

import CollectionsPage from '@/app/collections/page';
import CollectionPageClient from '@/app/components/ContentCollection/CollectionPageClient';
import { PageShell } from '@/app/components/ui/PageShell/PageShell';
import { meServer } from '@/app/lib/api/auth';
import { getScopedAllCollections } from '@/app/lib/api/collections';
import { resolveSsrViewport } from '@/app/utils/ssrViewport';

const mockGetScopedAllCollections = getScopedAllCollections as jest.MockedFunction<
  typeof getScopedAllCollections
>;
const mockMeServer = meServer as jest.MockedFunction<typeof meServer>;

/** Walk the rendered element tree and return the first element of the given type's props. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findProps(node: any, type: unknown): any {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findProps(child, type);
      if (found) return found;
    }
    return null;
  }
  if (node.type === type) return node.props;
  return node.props?.children ? findProps(node.props.children, type) : null;
}

/** Props the page handed to the shared collection stack. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stackProps = (result: unknown): any => findProps(result, CollectionPageClient);

/** Collect every string rendered anywhere in the tree (for the fallback / empty copy). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function allText(node: any): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(allText).join(' ');
  return typeof node === 'object' ? allText(node.props?.children) : '';
}

/**
 * Wrap COLLECTION content blocks in a synthetic all-collections parent shell.
 *
 * The cast is deliberate: the page reads only `content`, and spelling out the other ~15
 * required CollectionModel fields would obscure what each case is actually varying. It also
 * lets a case pass a deliberately off-contract shape (see the `{}` resilience test).
 */
function makeParent(content: unknown[]): CollectionModel {
  return { slug: 'all-collections', title: 'Collections', content } as unknown as CollectionModel;
}

describe('CollectionsPage', () => {
  beforeEach(() => {
    mockGetScopedAllCollections.mockReset();
    (resolveSsrViewport as jest.Mock).mockResolvedValue({
      contentWidth: 1200,
      viewportHeight: 900,
      isMobile: false,
    });
  });

  it('renders through the shared collection stack rather than a bespoke grid', async () => {
    mockGetScopedAllCollections.mockResolvedValue(
      makeParent([
        createCollectionContent(1, { title: 'Dolomites', slug: 'dolomites' }),
        createCollectionContent(2, { title: 'Patagonia', slug: 'patagonia' }),
      ])
    );

    const stack = stackProps(await CollectionsPage());
    expect(stack).not.toBeNull();
    expect(stack.collection.content.map((b: { slug: string }) => b.slug)).toEqual([
      'dolomites',
      'patagonia',
    ]);
  });

  it('always shows the filter bar, whatever aggregates the payload carries', async () => {
    mockGetScopedAllCollections.mockResolvedValue(
      makeParent([createCollectionContent(1, { title: 'Solo', slug: 'solo' })])
    );
    expect(stackProps(await CollectionsPage()).alwaysShowFilterBar).toBe(true);
  });

  it('opens at the shared default density, with no /collections-only chunk size', async () => {
    mockGetScopedAllCollections.mockResolvedValue(
      makeParent([createCollectionContent(1, { title: 'Solo', slug: 'solo' })])
    );
    expect(stackProps(await CollectionsPage()).chunkSize).toBeUndefined();
  });

  it('SSR-sizes the grid so the cover LCP does not shift', async () => {
    mockGetScopedAllCollections.mockResolvedValue(
      makeParent([createCollectionContent(1, { title: 'Solo', slug: 'solo' })])
    );
    const stack = stackProps(await CollectionsPage());
    expect(stack.ssrViewport).toEqual({ contentWidth: 1200, viewportHeight: 900, isMobile: false });
  });

  it('keeps the parent shell and swaps only its content', async () => {
    mockGetScopedAllCollections.mockResolvedValue(
      makeParent([createCollectionContent(1, { title: 'Solo', slug: 'solo' })])
    );
    const stack = stackProps(await CollectionsPage());
    expect(stack.collection.slug).toBe('all-collections');
    expect(stack.collection.title).toBe('Collections');
  });

  it('excludes the home slug from the showcase', async () => {
    mockGetScopedAllCollections.mockResolvedValue(
      makeParent([
        createCollectionContent(1, { title: 'Home', slug: 'home' }),
        createCollectionContent(2, { title: 'Keep', slug: 'keep' }),
      ])
    );

    const stack = stackProps(await CollectionsPage());
    expect(stack.collection.content.map((b: { slug: string }) => b.slug)).toEqual(['keep']);
  });

  it('renders a fallback message when the fetch fails', async () => {
    mockGetScopedAllCollections.mockRejectedValue(new Error('upstream down'));

    const result = await CollectionsPage();
    expect(allText(result)).toMatch(/unable to load collections/i);
    expect(stackProps(result)).toBeNull();
  });

  it('renders a friendly empty state when there are no collections', async () => {
    mockGetScopedAllCollections.mockResolvedValue(makeParent([]));
    expect(allText(await CollectionsPage())).toMatch(/no collections yet/i);
  });

  it('degrades to the empty state when the response has no content field at all', async () => {
    mockGetScopedAllCollections.mockResolvedValue({} as CollectionModel);
    expect(allText(await CollectionsPage())).toMatch(/no collections yet/i);
  });

  it('requests the scoped list at the showcase page size', async () => {
    mockGetScopedAllCollections.mockResolvedValue(makeParent([]));
    await CollectionsPage();
    expect(mockGetScopedAllCollections).toHaveBeenCalledWith(500);
  });

  it('threads the resolved principal through so admin-only controls can render', async () => {
    const me = { isAdmin: true } as Awaited<ReturnType<typeof meServer>>;
    mockMeServer.mockResolvedValue(me);
    mockGetScopedAllCollections.mockResolvedValue(makeParent([createCollectionContent(1)]));

    const result = await CollectionsPage();

    expect(stackProps(result).me).toBe(me);
  });

  it('still renders for an anonymous viewer with no principal', async () => {
    mockMeServer.mockResolvedValue(null);
    mockGetScopedAllCollections.mockResolvedValue(makeParent([createCollectionContent(1)]));

    const result = await CollectionsPage();

    expect(stackProps(result).me).toBeNull();
  });

  it('passes the resolved principal to the shell on the success render', async () => {
    const me = { isAdmin: true } as Awaited<ReturnType<typeof meServer>>;
    mockMeServer.mockResolvedValue(me);
    mockGetScopedAllCollections.mockResolvedValue(makeParent([createCollectionContent(1)]));

    const result = (await CollectionsPage()) as { type: unknown; props: { me: unknown } };

    expect(result.type).toBe(PageShell);
    expect(result.props.me).toBe(me);
  });

  it('passes the resolved principal to the shell on the fallback render', async () => {
    const me = { isAdmin: false } as Awaited<ReturnType<typeof meServer>>;
    mockMeServer.mockResolvedValue(me);
    mockGetScopedAllCollections.mockRejectedValue(new Error('upstream down'));

    const result = (await CollectionsPage()) as { props: { me: unknown } };

    expect(result.props.me).toBe(me);
  });

  it('renders with a null principal when the principal read fails', async () => {
    mockMeServer.mockRejectedValue(new Error('boom'));
    mockGetScopedAllCollections.mockResolvedValue(makeParent([createCollectionContent(1)]));

    const result = await CollectionsPage();

    expect(stackProps(result).me).toBeNull();
  });
});
