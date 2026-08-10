/** @jest-environment node */
import { notFound } from 'next/navigation';

jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));
jest.mock('@/app/lib/api/auth', () => ({ meServer: jest.fn() }));
jest.mock('@/app/lib/api/user', () => ({ getUserPage: jest.fn() }));
jest.mock('@/app/lib/api/collections', () => ({ getAllCollections: jest.fn() }));
jest.mock('@/app/lib/api/personal', () => ({
  listSavedImagesServer: jest.fn(),
  listFollowedCollectionIdsServer: jest.fn(),
}));
jest.mock('@/app/utils/ssrViewport', () => ({
  resolveSsrViewport: jest.fn(),
}));
jest.mock('@/app/components/ContentCollection/CollectionPageClient', () => ({
  __esModule: true,
  default: () => 'CollectionPageClient',
}));
jest.mock('@/app/components/SiteHeader/SiteHeader', () => ({
  __esModule: true,
  default: () => 'SiteHeader',
}));
// SendMessageButton is deliberately NOT mocked: it is the component the MeProvider wrapper exists
// for, so the real one has to run for the lockedEmail assertion below to mean anything. Its modal
// is stubbed open and its form reduced to a probe that echoes the lockedEmail it was handed.
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
}));
jest.mock('@/app/components/Personal/AccountCard', () => ({
  AccountCard: () => 'AccountCard',
}));

import { renderToStaticMarkup } from 'react-dom/server';

import { MeProvider } from '@/app/components/auth/MeProvider';
import CollectionPageClient from '@/app/components/ContentCollection/CollectionPageClient';
import { AccountCard } from '@/app/components/Personal/AccountCard';
import { AdminCard } from '@/app/components/Personal/AdminCard';
import { FormError } from '@/app/components/ui/Field/FormError';
import { EmptyState } from '@/app/components/ui/StatusText/EmptyState';
import { UserSpace } from '@/app/components/UserSpace/UserSpace';
import { LAYOUT } from '@/app/constants';
import { meServer } from '@/app/lib/api/auth';
import { getAllCollections } from '@/app/lib/api/collections';
import { listFollowedCollectionIdsServer, listSavedImagesServer } from '@/app/lib/api/personal';
import { getUserPage } from '@/app/lib/api/user';
import UserPage from '@/app/user/page';
import { resolveSsrViewport } from '@/app/utils/ssrViewport';

const authedPrincipal = { email: 'c@x.com', isAdmin: false, mfaSatisfied: true, galleries: [] };

const collectionBlock = (id: number) => ({ id, contentType: 'COLLECTION' });
// isContentImage requires an `imageUrl` field, so the fixture supplies one.
const imageBlock = (id: number) => ({
  id,
  contentType: 'IMAGE',
  imageUrl: `https://cdn/${id}.jpg`,
});
const gifBlock = (id: number) => ({ id, contentType: 'GIF' });

/**
 * Walk the rendered element tree and return the first element of the given type's props.
 *
 * `UserSpace` is invoked rather than descended, because the sections live inside it and it renders
 * the collection stack itself — it has no `children` to walk. It is a plain synchronous server
 * component with no hooks, so calling it here is safe, and it keeps these assertions end-to-end:
 * they still check the props the shared stack actually receives, not just what the page forwards.
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

/** Props the page handed to the shared collection renderer for the active section. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const gridProps = (result: unknown): any => findProps(result, CollectionPageClient);

/**
 * The section chips the page handed to the shared bar. There is no `/user`-only switcher component
 * any more — the sections ride on the same CollectionPageClient props as everything else.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sectionProps = (result: unknown): any => {
  const props = gridProps(result);
  return { sections: props?.sections, activeKey: props?.activeSectionKey };
};

function seedApis() {
  // Mirrors the real payload: `UserPageAssembler` builds this collection with no `id`, `isClient`
  // or `isPasswordProtected` — it is assembled, not a `collection` row. See the no-id test below.
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
}

/** Render the page for a given `?tab=` value. */
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

  it('renders every section through the shared CollectionPageClient', async () => {
    const grid = gridProps(await renderTab());
    expect(grid).not.toBeNull();
    expect(grid.me).toBe(authedPrincipal);
  });

  it('mounts SendMessageButton inside a MeProvider so its form gets a lockedEmail', async () => {
    // SendMessageButton is a SIBLING of CollectionPageClient, so the MeProvider that the collection
    // stack mounts internally never reaches it. Without the page-level provider, useMe() is null and
    // the signed-in user gets a blank, editable email field instead of their locked-in address.
    const provider = findProps(await renderTab(), MeProvider);
    expect(provider).not.toBeNull();
    expect(provider.me).toBe(authedPrincipal);

    const markup = renderToStaticMarkup(
      <MeProvider me={provider.me}>{provider.children}</MeProvider>
    );
    expect(markup).toContain('data-locked-email="c@x.com"');
  });

  it('defaults to Collections and passes only the COLLECTION blocks', async () => {
    const grid = gridProps(await renderTab());
    expect(grid.collection.content).toHaveLength(2);
    expect(
      grid.collection.content.every((b: { contentType: string }) => b.contentType === 'COLLECTION')
    ).toBe(true);
  });

  it('passes the IMAGE and GIF blocks for ?tab=images', async () => {
    const grid = gridProps(await renderTab('images'));
    expect(grid.collection.content.map((b: { id: number }) => b.id)).toEqual([3, 4]);
  });

  it('passes the saved images for ?tab=saved', async () => {
    (listSavedImagesServer as jest.Mock).mockResolvedValue({ ok: true, items: [imageBlock(9)] });
    const grid = gridProps(await renderTab('saved'));
    expect(grid.collection.content.map((b: { id: number }) => b.id)).toEqual([9]);
  });

  it('wraps followed collections as COLLECTION blocks keyed by referencedCollectionId', async () => {
    (listFollowedCollectionIdsServer as jest.Mock).mockResolvedValue({ ok: true, items: [7] });
    (getAllCollections as jest.Mock).mockResolvedValue([
      { id: 7, slug: 'seven', title: 'Seven' },
      { id: 8, slug: 'eight', title: 'Eight' },
    ]);
    const grid = gridProps(await renderTab('following'));
    expect(grid.collection.content).toHaveLength(1);
    // `referencedCollectionId` is what convertCollectionContentToParallax carries through as the
    // card's `collectionId` — the id the follow toggle persists against.
    expect(grid.collection.content[0]).toMatchObject({
      contentType: 'COLLECTION',
      referencedCollectionId: 7,
      slug: 'seven',
    });
  });

  it('falls back to Collections for an unknown ?tab=', async () => {
    expect(gridProps(await renderTab('nope')).collection.content).toHaveLength(2);
    expect(sectionProps(await renderTab('nope')).activeKey).toBe('collections');
    expect(sectionProps(await renderTab('')).activeKey).toBe('collections');
  });

  it('takes the first value when ?tab= is repeated', async () => {
    expect(sectionProps(await renderTab(['images', 'saved'])).activeKey).toBe('images');
    expect(gridProps(await renderTab(['images', 'saved'])).collection.content).toHaveLength(2);
  });

  it('keeps the collection header (cover + description) across sections', async () => {
    // The header row is rendered by CollectionPageClient from `collectionData`, so every section
    // hands it the same collection and swaps only `content` — no /user-only header render.
    for (const tab of [undefined, 'images', 'saved', 'following']) {
      const grid = gridProps(await renderTab(tab));
      expect(grid.collection.description).toBe('Photos I have been tagged in.');
      expect(grid.collection.coverImage.imageUrl).toBe('https://cdn/cover.jpg');
      expect(grid.collection.slug).toBe('user');
    }
  });

  it('opens every section at the shared default density', async () => {
    // No /user-only density constants: each section inherits LAYOUT.defaultChunkSize, the density
    // an ordinary collection page opens at, and the shared slider re-tunes it from there. The old
    // bespoke value (14) could not even be represented on a slider whose maximum is 10.
    for (const tab of [undefined, 'images', 'saved', 'following']) {
      const { chunkSize } = gridProps(await renderTab(tab));
      expect(chunkSize).toBeUndefined();
    }
    expect(LAYOUT.defaultChunkSize).toBeGreaterThanOrEqual(LAYOUT.minDensity);
    expect(LAYOUT.defaultChunkSize).toBeLessThanOrEqual(LAYOUT.maxDensityDesktop);
  });

  it('labels all four sections with their counts regardless of the active section', async () => {
    (listSavedImagesServer as jest.Mock).mockResolvedValue({ ok: true, items: [imageBlock(9)] });
    (listFollowedCollectionIdsServer as jest.Mock).mockResolvedValue({ ok: true, items: [7] });
    (getAllCollections as jest.Mock).mockResolvedValue([{ id: 7, slug: 'seven' }, { id: 8 }]);
    const { sections, activeKey } = sectionProps(await renderTab('saved'));
    expect(sections.map((s: { label: string; count: number }) => [s.label, s.count])).toEqual([
      ['Collections', 2],
      ['Images', 2],
      ['Saved', 1],
      ['Following', 1],
    ]);
    expect(activeKey).toBe('saved');
  });

  it('gives every section a ?tab= link so the choice stays shareable', async () => {
    // Sections are links rather than a FilterState dimension: each one's blocks come from a
    // different server read, and the choice has to survive a copied URL and the back button.
    const { sections } = sectionProps(await renderTab('images'));
    expect(sections.map((s: { key: string; href: string }) => [s.key, s.href])).toEqual([
      ['collections', '/user?tab=collections'],
      ['images', '/user?tab=images'],
      ['saved', '/user?tab=saved'],
      ['following', '/user?tab=following'],
    ]);
  });

  it('always marks exactly one section active', async () => {
    for (const [tab, expected] of [
      [undefined, 'collections'],
      ['images', 'images'],
      ['saved', 'saved'],
      ['following', 'following'],
      ['nope', 'collections'],
    ] as const) {
      const { sections, activeKey } = sectionProps(await renderTab(tab));
      expect(activeKey).toBe(expected);
      expect(sections.filter((s: { key: string }) => s.key === activeKey)).toHaveLength(1);
    }
  });

  it('seeds the saves provider from the saved-images read (no separate ids fetch)', async () => {
    // The full saved images read is the single source for both the Saved section and the seeded
    // SavesProvider ids — there is no separate `/user/saves` ids-only read to duplicate it.
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
    expect(grid.serverContentWidth).toBe(1200);
    expect(grid.serverViewportHeight).toBe(900);
    expect(grid.serverIsMobile).toBe(false);
  });

  it('never synthesizes an id or client-gallery flags onto the user collection', async () => {
    // Load-bearing: `canDownloadCollection` short-circuits on the missing id and `selectsEnabled`
    // on the missing `isClient`, which is what keeps the download and Selects affordances inside
    // CollectionPageClient switched off on /user. Adding an id to satisfy the CollectionModel type
    // would arm both on a page that has no gallery to grant.
    for (const tab of [undefined, 'images', 'saved', 'following']) {
      const { collection } = gridProps(await renderTab(tab));
      expect(collection.id).toBeUndefined();
      expect(collection.isClient).toBeUndefined();
      expect(collection.isPasswordProtected).toBeUndefined();
    }
  });

  it('still renders a section whose content is empty', async () => {
    const grid = gridProps(await renderTab('following'));
    expect(grid.collection.content).toEqual([]);
    expect(grid.collection.description).toBe('Photos I have been tagged in.');
  });
});

/**
 * `/user` is the owner's own page and the busier of the two surfaces, and it carried the same
 * defect the admin path did: `personal.ts` flattened every failed read to `[]`, so a backend
 * outage told the OWNER "You have not saved any images yet." These assert end-to-end — from the
 * `personal.ts` mock through `loadUserSpace` to the props and nodes the page actually renders.
 */
describe('UserPage — a failed personal read never claims the owner has nothing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (meServer as jest.Mock).mockResolvedValue(authedPrincipal);
    seedApis();
  });

  const failSaved = () =>
    (listSavedImagesServer as jest.Mock).mockResolvedValue({ ok: false, items: [] });

  it('says the saved images are unavailable, in the second person', async () => {
    failSaved();
    const props = findProps(await renderTab('saved'), FormError);
    expect(props.children).toBe('Your saved images are unavailable right now.');
  });

  it('renders no EmptyState, so "You have not saved any images yet." never appears', async () => {
    failSaved();
    expect(findProps(await renderTab('saved'), EmptyState)).toBeNull();
  });

  it('drops the Saved chip’s count rather than badging it 0', async () => {
    failSaved();
    const { sections } = sectionProps(await renderTab('saved'));
    const saved = sections.find((s: { key: string }) => s.key === 'saved');
    expect(saved.count).toBeUndefined();
  });

  it('keeps every loaded section’s count intact', async () => {
    failSaved();
    const { sections } = sectionProps(await renderTab('saved'));
    expect(
      sections
        .filter((s: { key: string }) => s.key !== 'saved')
        .map((s: { key: string; count?: number }) => [s.key, s.count])
    ).toEqual([
      ['collections', 2],
      ['images', 2],
      ['following', 0],
    ]);
  });

  it('reports the followed collections unavailable when that read fails', async () => {
    (listFollowedCollectionIdsServer as jest.Mock).mockResolvedValue({ ok: false, items: [] });
    const props = findProps(await renderTab('following'), FormError);
    expect(props.children).toBe('Your followed collections are unavailable right now.');
  });

  it('still renders the genuine empty copy when the read succeeded with nothing', async () => {
    const props = findProps(await renderTab('saved'), EmptyState);
    expect(props.children).toBe('You have not saved any images yet.');
    expect(findProps(await renderTab('saved'), FormError)).toBeNull();
  });

  it('badges a genuinely empty section with 0, which is a true count', async () => {
    const { sections } = sectionProps(await renderTab('saved'));
    const saved = sections.find((s: { key: string }) => s.key === 'saved');
    expect(saved.count).toBe(0);
  });

  it('still renders the page rather than 500-ing when both reads fail', async () => {
    failSaved();
    (listFollowedCollectionIdsServer as jest.Mock).mockResolvedValue({ ok: false, items: [] });
    expect(gridProps(await renderTab('saved'))).not.toBeNull();
  });
});

/**
 * The Account and Admin cards ride in the collection header rail — the TEXT block leading the
 * first row, beside the cover — not in a slab below the grid. That rail is where this app already
 * puts what is *about* a collection (date, location, description, filter bar), so these assert on
 * the `railExtras` node handed to UserSpace rather than on the page's own children.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const railExtras = (result: unknown): any => findProps(result, UserSpace)?.railExtras ?? null;

describe('UserPage — header rail cards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    seedApis();
  });

  it('puts the Account card in the rail, not below the grid', async () => {
    (meServer as jest.Mock).mockResolvedValue(authedPrincipal);
    const result = await renderTab();

    expect(findProps(railExtras(result), AccountCard)).not.toBeNull();
    // Nothing account-shaped is left loose in the page body.
    expect(findProps(result.props?.children, AccountCard)).toBeNull();
  });

  /**
   * This card is one of the site's two navigations into /admin, alongside MenuDropdown's admin
   * link: the hub used to be reachable because localhost redirected `/` to it, and that redirect
   * is gone. It must gate on the real `isAdmin` principal — never an environment check — because
   * it is meant to render in production too.
   */
  it('omits the Admin card for an ordinary signed-in user', async () => {
    (meServer as jest.Mock).mockResolvedValue(authedPrincipal);
    expect(findProps(railExtras(await renderTab()), AdminCard)).toBeNull();
  });

  it('puts the Admin card in the rail for an admin principal', async () => {
    (meServer as jest.Mock).mockResolvedValue({ ...authedPrincipal, isAdmin: true });
    expect(findProps(railExtras(await renderTab()), AdminCard)).not.toBeNull();
  });

  it('links to the admin hub', async () => {
    (meServer as jest.Mock).mockResolvedValue({ ...authedPrincipal, isAdmin: true });
    expect(renderToStaticMarkup(railExtras(await renderTab()))).toContain('href="/admin"');
  });
});
