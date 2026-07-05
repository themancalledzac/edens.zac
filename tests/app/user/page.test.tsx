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
jest.mock('@/app/components/Content/ContentBlockWithFullScreen', () => ({
  __esModule: true,
  default: () => 'ContentBlockWithFullScreen',
}));
jest.mock('@/app/components/SiteHeader/SiteHeader', () => ({
  __esModule: true,
  default: () => 'SiteHeader',
}));
jest.mock('@/app/components/SendMessageButton/SendMessageButton', () => ({
  SendMessageButton: () => 'SendMessageButton',
}));
jest.mock('@/app/components/auth/MeProvider', () => ({
  MeProvider: ({ children }: { children: unknown }) => children,
}));
jest.mock('@/app/components/Personal/SavesContext', () => ({
  SavesProvider: ({ children }: { children: unknown }) => children,
}));
jest.mock('@/app/components/Personal/PersonalContentGrid', () => ({
  PersonalContentGrid: ({ content }: { content: unknown[] }) =>
    `PersonalContentGrid:${content.length}`,
}));
jest.mock('@/app/components/Personal/FollowsContext', () => ({
  FollowsProvider: ({ children }: { children: unknown }) => children,
}));
jest.mock('@/app/components/LocationPage/LocationCollections', () => ({
  __esModule: true,
  default: () => 'LocationCollections',
}));
jest.mock('@/app/components/Personal/CollapsibleSection', () => ({
  CollapsibleSection: ({
    label,
    count,
    children,
  }: {
    label: string;
    count: number;
    children: unknown;
  }) => ({
    label,
    count,
    children,
  }),
}));

import ContentBlockWithFullScreen from '@/app/components/Content/ContentBlockWithFullScreen';
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
 * Walk the rendered element tree and collect each CollapsibleSection element's props by label. The
 * mocked component is never invoked (the page only builds elements), so label/count live in
 * `element.props`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function collectSections(node: any, acc: Record<string, any> = {}): Record<string, any> {
  if (!node || typeof node !== 'object') return acc;
  if (Array.isArray(node)) {
    for (const child of node) collectSections(child, acc);
    return acc;
  }
  const props = node.props;
  if (props && typeof props.label === 'string' && typeof props.count === 'number') {
    acc[props.label] = props;
  }
  if (props?.children) collectSections(props.children, acc);
  return acc;
}

/**
 * Find the collection-header render — the `ContentBlockWithFullScreen` element the page puts above
 * the accordion with empty body content + the user collection as `collectionData`. Returns its
 * props (or null if absent).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findHeaderBlock(node: any): any {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findHeaderBlock(child);
      if (found) return found;
    }
    return null;
  }
  if (node.type === ContentBlockWithFullScreen && node.props?.collectionData) {
    return node.props;
  }
  return node.props?.children ? findHeaderBlock(node.props.children) : null;
}

function seedApis() {
  (getUserPage as jest.Mock).mockResolvedValue({
    slug: 'user',
    type: 'PARENT',
    content: [collectionBlock(1), collectionBlock(2), imageBlock(3), gifBlock(4)],
  });
  (listSavedImagesServer as jest.Mock).mockResolvedValue([]);
  (listFollowedCollectionIdsServer as jest.Mock).mockResolvedValue([]);
  (getAllCollections as jest.Mock).mockResolvedValue([]);
  (resolveSsrViewport as jest.Mock).mockResolvedValue({
    contentWidth: 1200,
    viewportHeight: 900,
    isMobile: false,
  });
}

describe('UserPage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls notFound() when anonymous', async () => {
    (meServer as jest.Mock).mockResolvedValue(null);
    await expect(UserPage()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
    expect(getUserPage).not.toHaveBeenCalled();
  });

  it('splits getUserPage content into Collections (COLLECTION) vs Images (IMAGE/GIF)', async () => {
    (meServer as jest.Mock).mockResolvedValue(authedPrincipal);
    seedApis();
    const result = await UserPage();
    const sections = collectSections(result);
    expect(sections.Collections.count).toBe(2);
    expect(sections.Images.count).toBe(2);
  });

  it('wires all four sections with the saved + followed counts', async () => {
    (meServer as jest.Mock).mockResolvedValue(authedPrincipal);
    seedApis();
    (listSavedImagesServer as jest.Mock).mockResolvedValue([imageBlock(9)]);
    (listFollowedCollectionIdsServer as jest.Mock).mockResolvedValue([7]);
    (getAllCollections as jest.Mock).mockResolvedValue([{ id: 7 }, { id: 8 }]);
    const result = await UserPage();
    const sections = collectSections(result);
    expect(Object.keys(sections).sort()).toEqual(['Collections', 'Following', 'Images', 'Saved']);
    expect(sections.Saved.count).toBe(1);
    expect(sections.Following.count).toBe(1);
  });

  it('seeds the providers from the saved-images + follows reads (no separate ids fetch)', async () => {
    (meServer as jest.Mock).mockResolvedValue(authedPrincipal);
    seedApis();
    // The full saved images read is the single source for both the Saved section and the seeded
    // SavesProvider ids — there is no separate `/user/saves` ids-only read to duplicate it.
    (listSavedImagesServer as jest.Mock).mockResolvedValue([imageBlock(7), imageBlock(8)]);
    const result = await UserPage();
    expect(result).toBeTruthy();
    expect(listSavedImagesServer).toHaveBeenCalled();
    expect(listFollowedCollectionIdsServer).toHaveBeenCalled();
    // The ids are derived from the images, so the SavesProvider is seeded without an extra fetch.
    expect(listSavedImagesServer).toHaveBeenCalledTimes(1);
  });

  it('renders the collection header (cover + description) above the four sections', async () => {
    (meServer as jest.Mock).mockResolvedValue(authedPrincipal);
    seedApis();
    (getUserPage as jest.Mock).mockResolvedValue({
      slug: 'user',
      type: 'PARENT',
      title: 'Your Space',
      description: 'Photos I have been tagged in.',
      coverImage: { id: 42, contentType: 'IMAGE', imageUrl: 'https://cdn/cover.jpg' },
      content: [collectionBlock(1), imageBlock(3)],
    });
    const result = await UserPage();

    // Header renders with the user collection as collectionData + empty body content, so the layout
    // pipeline prepends only the header row. It is the LCP (priority 0) and an intro (no fullscreen).
    const header = findHeaderBlock(result);
    expect(header).not.toBeNull();
    expect(header.content).toEqual([]);
    expect(header.collectionData.description).toBe('Photos I have been tagged in.');
    expect(header.collectionData.coverImage.imageUrl).toBe('https://cdn/cover.jpg');
    expect(header.priorityBlockIndex).toBe(0);
    expect(header.enableFullScreenView).toBe(false);
    // SSR-sized on first paint (cover is the LCP) to avoid layout shift.
    expect(header.serverContentWidth).toBe(1200);
    expect(header.serverIsMobile).toBe(false);

    // The accordion sections are untouched by the header addition.
    const sections = collectSections(result);
    expect(Object.keys(sections).sort()).toEqual(['Collections', 'Following', 'Images', 'Saved']);
  });

  it('still renders a description-only header when the user collection has no cover', async () => {
    (meServer as jest.Mock).mockResolvedValue(authedPrincipal);
    seedApis();
    (getUserPage as jest.Mock).mockResolvedValue({
      slug: 'user',
      type: 'PARENT',
      description: 'A user with a bio but no tagged image yet.',
      content: [],
    });
    const result = await UserPage();

    const header = findHeaderBlock(result);
    expect(header).not.toBeNull();
    expect(header.collectionData.description).toBe('A user with a bio but no tagged image yet.');
    expect(header.collectionData.coverImage).toBeUndefined();
  });
});
