/** @jest-environment node */
import { type ReactNode } from 'react';

import { type CollectionModel } from '@/app/types/Collection';
import { createCollectionContent } from '@/tests/fixtures/contentFixtures';

jest.mock('@/app/lib/api/collections', () => ({
  getScopedAllCollections: jest.fn(),
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
  PageShell: ({ children }: { children: ReactNode }) => children,
  default: ({ children }: { children: ReactNode }) => children,
}));

import CollectionsPage from '@/app/collections/page';
import CollectionPageClient from '@/app/components/ContentCollection/CollectionPageClient';
import { getScopedAllCollections } from '@/app/lib/api/collections';
import { resolveSsrViewport } from '@/app/utils/ssrViewport';

const mockGetScopedAllCollections = getScopedAllCollections as jest.MockedFunction<
  typeof getScopedAllCollections
>;

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
    // On an index surface the bar is part of the page, not something that appears only when the
    // backend happens to ship tags or cameras on the child blocks.
    mockGetScopedAllCollections.mockResolvedValue(
      makeParent([createCollectionContent(1, { title: 'Solo', slug: 'solo' })])
    );
    expect(stackProps(await CollectionsPage()).alwaysShowFilterBar).toBe(true);
  });

  it('opens at the shared default density', async () => {
    // No /collections-only density: the page inherits LAYOUT.defaultChunkSize like every other
    // collection surface, and the shared slider re-tunes it.
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
    expect(stack.serverContentWidth).toBe(1200);
    expect(stack.serverViewportHeight).toBe(900);
    expect(stack.serverIsMobile).toBe(false);
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
});
