/** @jest-environment node */
import { notFound, redirect } from 'next/navigation';

jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  redirect: jest.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));
jest.mock('@/app/lib/api/auth', () => ({ meServer: jest.fn() }));
jest.mock('@/app/lib/api/collections', () => ({ getAllCollections: jest.fn() }));
jest.mock('@/app/lib/api/personal', () => ({
  getUserPage: jest.fn(),
  listSavedImagesServer: jest.fn(),
  listFollowedCollectionIdsServer: jest.fn(),
}));
jest.mock('@/app/utils/ssrViewport', () => ({
  resolveSsrViewport: jest.fn(),
}));
jest.mock('@/app/lib/api/share', () => ({
  readShareSettings: jest.fn(),
}));
jest.mock('@/app/components/ContentCollection/CollectionPageClient', () => ({
  __esModule: true,
  default: () => 'CollectionPageClient',
}));
jest.mock('@/app/components/SiteHeader/SiteHeader', () => ({
  __esModule: true,
  default: () => 'SiteHeader',
}));
jest.mock('@/app/components/ui/Modal/Modal', () => ({
  Modal: ({ children }: { children: unknown }) => children,
}));
jest.mock('@/app/components/ContactForm/ContactForm', () => ({
  ContactForm: ({ lockedEmail }: { lockedEmail?: string }) => (
    <span data-locked-email={lockedEmail} />
  ),
}));
jest.mock('@/app/components/Personal/FollowsContext', () => ({
  FollowsProvider: ({ children }: { children: unknown }) => children,
  useFollows: () => null,
}));

import { renderToStaticMarkup } from 'react-dom/server';

import { MeProvider } from '@/app/components/auth/MeProvider';
import { PageShell } from '@/app/components/ui/PageShell/PageShell';
import { UserSpace } from '@/app/components/UserSpace/UserSpace';
import { UserSpaceGrid } from '@/app/components/UserSpace/UserSpaceGrid';
import { LAYOUT } from '@/app/constants';
import { meServer } from '@/app/lib/api/auth';
import { getAllCollections } from '@/app/lib/api/collections';
import {
  getUserPage,
  listFollowedCollectionIdsServer,
  listSavedImagesServer,
} from '@/app/lib/api/personal';
import { readShareSettings } from '@/app/lib/api/share';
import UserPage from '@/app/user/page';
import { resolveSsrViewport } from '@/app/utils/ssrViewport';

const authedPrincipal = {
  email: 'c@x.com',
  isAdmin: false,
  mfaSatisfied: true,
  passkeyCount: 0,
  galleries: [],
};

/**
 * `id` is the content-table row id and `referencedCollectionId` the collection it points at, which
 * a real granted block always carries. They are deliberately different numbers here: anything
 * keyed on the collection entity must read the second, and a fixture that set them equal would let
 * a lookup on the wrong field pass.
 */
const collectionBlock = (id: number) => ({
  id,
  contentType: 'COLLECTION',
  referencedCollectionId: id * 100,
});
const imageBlock = (id: number) => ({
  id,
  contentType: 'IMAGE',
  imageUrl: `https://cdn/${id}.jpg`,
});
const gifBlock = (id: number) => ({ id, contentType: 'GIF' });

/**
 * Walk the rendered element tree and return the first element of the given type's props.
 *
 * `UserSpace` is invoked rather than descended, because it renders the collection stack itself — it
 * has no `children` to walk. It is a plain synchronous server component with no hooks, so calling it
 * here is safe, and it keeps these assertions end-to-end: they still check the props the shared
 * stack actually receives, not just what the page forwards.
 *
 * The walk stops at `UserSpaceGrid`, the client boundary that resolves the active section from the
 * URL, re-derives the Collections count from live follow state, prunes unfollowed tiles, and renders
 * the hub / empty / unavailable states. It uses hooks, so it cannot be invoked the way `UserSpace`
 * is; `UserSpace.sectionSwitch.test.tsx` renders it for real and covers what it does with these
 * props.
 */
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
  if (node.type === UserSpace) return findProps(node.type(node.props), type);
  return node.props?.children ? findProps(node.props.children, type) : null;
}

/** Props the page handed to `UserSpaceGrid` — every section's data, not just one. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const gridProps = (result: unknown): any => findProps(result, UserSpaceGrid);

function seedApis() {
  (getUserPage as jest.Mock).mockResolvedValue({
    slug: 'user',
    title: 'Your Space',
    description: 'Photos I have been tagged in.',
    coverImage: { id: 42, contentType: 'IMAGE', imageUrl: 'https://cdn/cover.jpg' },
    content: [collectionBlock(1), collectionBlock(2), imageBlock(3), gifBlock(4)],
  });
  (listSavedImagesServer as jest.Mock).mockResolvedValue({ ok: true, items: [] });
  (listFollowedCollectionIdsServer as jest.Mock).mockResolvedValue({ ok: true, items: [] });
  (getAllCollections as jest.Mock).mockResolvedValue([]);
  (resolveSsrViewport as jest.Mock).mockResolvedValue({
    contentWidth: 1200,
    viewportHeight: 900,
    isMobile: false,
  });
  (readShareSettings as jest.Mock).mockResolvedValue({ ok: true, settings: null });
}

/** Render the page for a given `?tab=` value — relevant only to the admin-redirect tests now. */
const renderTab = (tab?: string | string[]) =>
  UserPage({ searchParams: Promise.resolve(tab === undefined ? {} : { tab }) });

describe('UserPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (meServer as jest.Mock).mockResolvedValue(authedPrincipal);
    seedApis();
  });

  it('calls notFound() when anonymous', async () => {
    (meServer as jest.Mock).mockResolvedValue(null);
    await expect(renderTab()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
    expect(getUserPage).not.toHaveBeenCalled();
  });

  it('redirects an admin to /admin', async () => {
    (meServer as jest.Mock).mockResolvedValue({ ...authedPrincipal, isAdmin: true });
    await expect(renderTab()).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/admin');
    expect(getUserPage).not.toHaveBeenCalled();
  });

  it('keeps the requested section on the admin redirect', async () => {
    (meServer as jest.Mock).mockResolvedValue({ ...authedPrincipal, isAdmin: true });
    await expect(renderTab('images')).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/admin?tab=images');
  });

  it('hands the shared bar the Share, Contact and Face / Touch ID chips', async () => {
    const extras = gridProps(await renderTab()).toolbarExtras;
    expect(extras.map((e: { key: string }) => e.key)).toEqual(['share', 'contact', 'passkey']);
  });

  it('renders through the shared UserSpaceGrid', async () => {
    const grid = gridProps(await renderTab());
    expect(grid).not.toBeNull();
    expect(grid.me).toBe(authedPrincipal);
  });

  it('hands PageShell no collectionSlug, since `user` is shadowed by this route', async () => {
    expect(findProps(await renderTab(), PageShell).collectionSlug).toBeUndefined();
  });

  it('still hands the Contact chip a lockedEmail', async () => {
    const contact = gridProps(await renderTab()).toolbarExtras.find(
      (e: { key: string }) => e.key === 'contact'
    );
    const html = renderToStaticMarkup(<MeProvider me={authedPrincipal}>{contact.node}</MeProvider>);
    expect(html).toContain('data-locked-email="c@x.com"');
  });

  it('mounts no MeProvider of its own — the collection stack already owns one', async () => {
    expect(findProps(await renderTab(), MeProvider)).toBeNull();
  });

  it('hands the grid every section’s blocks, not just one the page picked', async () => {
    const grid = gridProps(await renderTab());
    expect(
      grid.sections.collections.content.every(
        (b: { contentType: string }) => b.contentType === 'COLLECTION'
      )
    ).toBe(true);
    expect(grid.sections.collections.content).toHaveLength(2);
    expect(grid.sections.images.content.map((b: { id: number }) => b.id)).toEqual([3, 4]);
    expect(grid.sections.saved.content).toEqual([]);
  });

  it('hands every section the same blocks no matter what `?tab=` was requested', async () => {
    const withoutTab = gridProps(await renderTab());
    const withTab = gridProps(await renderTab('images'));
    expect(withTab.sections).toEqual(withoutTab.sections);
  });

  /**
   * `referencedCollectionId` is what `convertCollectionContentToParallax` carries through as the
   * card's `collectionId` — the id the follow toggle persists against. Collection 8 is in the
   * catalog but unfollowed, so hydration is a filter over the catalog rather than a copy of it.
   */
  it('merges followed collections into Collections as COLLECTION blocks', async () => {
    (listFollowedCollectionIdsServer as jest.Mock).mockResolvedValue({ ok: true, items: [7] });
    (getAllCollections as jest.Mock).mockResolvedValue([
      { id: 7, slug: 'seven', title: 'Seven' },
      { id: 8, slug: 'eight', title: 'Eight' },
    ]);
    const grid = gridProps(await renderTab());
    const content = grid.sections.collections.content;
    const followed = content.filter((b: { slug?: string }) => b.slug === 'seven');
    expect(followed).toHaveLength(1);
    expect(followed[0]).toMatchObject({
      contentType: 'COLLECTION',
      referencedCollectionId: 7,
      slug: 'seven',
    });
    expect(content.some((b: { slug?: string }) => b.slug === 'eight')).toBe(false);
  });

  it('keeps the collection header (cover + description)', async () => {
    const grid = gridProps(await renderTab());
    expect(grid.collection.description).toBe('Photos I have been tagged in.');
    expect(grid.collection.coverImage.imageUrl).toBe('https://cdn/cover.jpg');
    expect(grid.collection.slug).toBe('user');
  });

  it('does not pass a chunkSize, so every section opens at the shared default density', async () => {
    expect(gridProps(await renderTab()).chunkSize).toBeUndefined();
    expect(LAYOUT.defaultChunkSize).toBeGreaterThanOrEqual(LAYOUT.minDensity);
    expect(LAYOUT.defaultChunkSize).toBeLessThanOrEqual(LAYOUT.maxDensityDesktop);
  });

  /**
   * Collections badges 3: two granted blocks plus followed collection 7, from the union of ids —
   * never from `content.length`, which the badge must stay right even where the section were left
   * unhydrated in the old per-tab design.
   */
  it('labels every section with its own count', async () => {
    (listSavedImagesServer as jest.Mock).mockResolvedValue({ ok: true, items: [imageBlock(9)] });
    (listFollowedCollectionIdsServer as jest.Mock).mockResolvedValue({ ok: true, items: [7] });
    (getAllCollections as jest.Mock).mockResolvedValue([{ id: 7, slug: 'seven' }, { id: 8 }]);
    const { sections } = gridProps(await renderTab());
    expect([
      ['Collections', sections.collections.count],
      ['Images', sections.images.count],
      ['Saved', sections.saved.count],
    ]).toEqual([
      ['Collections', 3],
      ['Images', 2],
      ['Saved', 1],
    ]);
  });

  it('seeds the saves provider from the saved-images read (no separate ids fetch)', async () => {
    (listSavedImagesServer as jest.Mock).mockResolvedValue({
      ok: true,
      items: [imageBlock(7), imageBlock(8)],
    });
    const grid = gridProps(await renderTab());
    expect(grid.initialSavedImageIds).toEqual([7, 8]);
    expect(listSavedImagesServer).toHaveBeenCalledTimes(1);
    expect(listFollowedCollectionIdsServer).toHaveBeenCalledTimes(1);
  });

  it('SSR-sizes the grid so the cover LCP does not shift', async () => {
    const grid = gridProps(await renderTab());
    expect(grid.ssrViewport).toEqual({
      contentWidth: 1200,
      viewportHeight: 900,
      isMobile: false,
    });
  });

  it('never synthesizes an id or client-gallery flags onto the user collection', async () => {
    const { collection } = gridProps(await renderTab());
    expect(collection.id).toBeUndefined();
    expect(collection.isClient).toBeUndefined();
    expect(collection.isPasswordProtected).toBeUndefined();
  });

  it('still hands over a section whose content is empty', async () => {
    (listSavedImagesServer as jest.Mock).mockResolvedValue({ ok: true, items: [] });
    const grid = gridProps(await renderTab());
    expect(grid.sections.saved.content).toEqual([]);
    expect(grid.collection.description).toBe('Photos I have been tagged in.');
  });
});

/**
 * `/user` is the owner's own page and the busier of the two surfaces, and it carried the same
 * defect the admin path did: `personal.ts` flattened every failed read to `[]`, so a backend
 * outage told the OWNER "You have not saved any images yet." These assert end-to-end — from the
 * `personal.ts` mock through `loadUserSpace` to the section data the page hands `UserSpaceGrid`.
 * `UserSpace.sectionSwitch.test.tsx` covers the FormError / EmptyState rendering that data drives.
 */
describe('UserPage — a failed personal read never claims the owner has nothing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (meServer as jest.Mock).mockResolvedValue(authedPrincipal);
    seedApis();
  });

  const failSaved = () =>
    (listSavedImagesServer as jest.Mock).mockResolvedValue({ ok: false, items: [] });

  it('marks Saved unavailable, in the second person', async () => {
    failSaved();
    const { sections } = gridProps(await renderTab());
    expect(sections.saved.unavailableLabel).toBe('Your saved images are unavailable right now.');
  });

  it('drops the Saved section’s count rather than badging it 0', async () => {
    failSaved();
    const { sections } = gridProps(await renderTab());
    expect(sections.saved.count).toBeUndefined();
  });

  it('keeps every loaded section’s count intact', async () => {
    failSaved();
    const { sections } = gridProps(await renderTab());
    expect(sections.collections.count).toBe(2);
    expect(sections.images.count).toBe(2);
  });

  /**
   * A failed follows read is a partial failure of Collections, not a total one. The granted half
   * still rendered, so the copy says the list may be incomplete instead of claiming the whole
   * section is unavailable — and the count survives rather than going unsaid.
   */
  it('reports the Collections list incomplete when the follows read fails', async () => {
    (listFollowedCollectionIdsServer as jest.Mock).mockResolvedValue({ ok: false, items: [] });
    const { sections } = gridProps(await renderTab());
    expect(sections.collections.unavailableLabel).toBe(
      'Your followed collections are unavailable right now, so this list may be incomplete.'
    );
    expect(sections.collections.content).toHaveLength(2);
  });

  it('still reports the genuine empty copy when the read succeeded with nothing', async () => {
    const { sections } = gridProps(await renderTab());
    expect(sections.saved.emptyLabel).toBe('You have not saved any images yet.');
    expect(sections.saved.unavailableLabel).toBeUndefined();
  });

  it('badges a genuinely empty section with 0, which is a true count', async () => {
    const { sections } = gridProps(await renderTab());
    expect(sections.saved.count).toBe(0);
  });

  it('still renders the page rather than 500-ing when both reads fail', async () => {
    failSaved();
    (listFollowedCollectionIdsServer as jest.Mock).mockResolvedValue({ ok: false, items: [] });
    expect(gridProps(await renderTab())).not.toBeNull();
  });
});
