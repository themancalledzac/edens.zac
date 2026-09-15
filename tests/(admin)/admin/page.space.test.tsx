/** @jest-environment node */
jest.mock('@/app/lib/api/auth', () => ({ meServer: jest.fn() }));
jest.mock('@/app/lib/api/collections', () => ({
  getAllCollections: jest.fn(),
  getMetadata: jest.fn().mockResolvedValue({ collections: [] }),
}));
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
jest.mock('@/app/lib/api/adminHome', () => ({
  getAdminHomeTiles: jest.fn().mockResolvedValue([]),
}));
jest.mock('@/app/lib/api/users', () => ({ listUsers: jest.fn().mockResolvedValue([]) }));
jest.mock('@/app/lib/api/roles', () => ({ listRoles: jest.fn().mockResolvedValue([]) }));
jest.mock('@/app/lib/api/messages', () => ({
  getAdminMessages: jest.fn().mockResolvedValue({ total: 0, items: [] }),
}));
jest.mock('@/app/(admin)/admin/AdminHubClient', () => ({ AdminHubClient: () => 'AdminHubClient' }));

import { AdminHubClient } from '@/app/(admin)/admin/AdminHubClient';
import AdminPage from '@/app/(admin)/admin/page';
import { UserSpace } from '@/app/components/UserSpace/UserSpace';
import { UserSpaceGrid } from '@/app/components/UserSpace/UserSpaceGrid';
import { meServer } from '@/app/lib/api/auth';
import { getAllCollections } from '@/app/lib/api/collections';
import {
  getUserPage,
  listFollowedCollectionIdsServer,
  listSavedImagesServer,
} from '@/app/lib/api/personal';
import { readShareSettings } from '@/app/lib/api/share';
import { resolveSsrViewport } from '@/app/utils/ssrViewport';

const authedPrincipal = {
  email: 'c@x.com',
  isAdmin: false,
  mfaSatisfied: true,
  passkeyCount: 0,
  galleries: [],
};
const adminPrincipal = { ...authedPrincipal, isAdmin: true };

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
 * Walk the rendered element tree and return the first element of the given type's props. `UserSpace`
 * is invoked rather than descended, since it renders the collection stack and the hub itself rather
 * than passing children through. Copied from `tests/app/user/page.test.tsx`; the walk already
 * handles arrays and fragments, so it descends through `UserSpace` into the hub rendered as a
 * sibling of the grid without any change.
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
const gridProps = (result: unknown): any => findProps(result, UserSpaceGrid);

/** The section chips the page handed to the shared bar. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sectionProps = (result: unknown): any => {
  const props = gridProps(result);
  return { sections: props?.sections, activeKey: props?.activeSectionKey };
};

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

/** Render the page for a given `?tab=` value. */
const renderAdmin = (tab?: string) =>
  AdminPage({ searchParams: Promise.resolve(tab === undefined ? {} : { tab }) });

describe("AdminPage as the admin's own space", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (meServer as jest.Mock).mockResolvedValue(adminPrincipal);
    seedApis();
  });

  it('defaults to the Admin section and renders the hub beneath the shared header', async () => {
    const result = await renderAdmin();
    const { sections, activeKey } = sectionProps(result);
    expect(activeKey).toBe('admin');
    expect(sections.map((s: { key: string }) => s.key)).toEqual([
      'admin',
      'collections',
      'images',
      'saved',
    ]);
    expect(sections[0].href).toBe('/admin?tab=admin');
    expect(gridProps(result).collection.content).toEqual([]);
    expect(findProps(result, AdminHubClient)).not.toBeNull();
  });

  it('renders a personal section with no hub when asked for one', async () => {
    const result = await renderAdmin('images');
    expect(sectionProps(result).activeKey).toBe('images');
    expect(findProps(result, AdminHubClient)).toBeNull();
    expect(gridProps(result).collection.content.map((b: { id: number }) => b.id)).toEqual([3, 4]);
  });

  it('links the personal sections under /admin', async () => {
    const { sections } = sectionProps(await renderAdmin());
    expect(sections[1].href).toBe('/admin?tab=collections');
  });

  it('passes the own-space chips like /user does', async () => {
    expect(gridProps(await renderAdmin()).toolbarExtras.map((e: { key: string }) => e.key)).toEqual(
      ['share', 'contact', 'passkey']
    );
  });

  it('renders the hub alone when there is no principal (local anonymous dev)', async () => {
    (meServer as jest.Mock).mockResolvedValue(null);
    const result = await renderAdmin();
    expect(findProps(result, AdminHubClient)).not.toBeNull();
    expect(gridProps(result)).toBeNull();
  });
});
