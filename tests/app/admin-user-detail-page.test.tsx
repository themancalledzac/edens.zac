import { render, screen } from '@testing-library/react';
import { notFound } from 'next/navigation';
import { type ReactNode } from 'react';

import AdminUserDetailPage from '@/app/(admin)/admin/users/[id]/page';
import { UserSpace } from '@/app/components/UserSpace/UserSpace';
import { loadUserSpace } from '@/app/components/UserSpace/userSpaceData';
import { ApiError } from '@/app/lib/api/core';
import { getAdminUser } from '@/app/lib/api/users';

jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => children,
}));

jest.mock('@/app/components/ui/PageShell/PageShell', () => ({
  PageShell: ({ children }: { children: ReactNode }) => children,
}));

jest.mock('@/app/(admin)/admin/users/GenerateInviteButton', () => ({
  GenerateInviteButton: () => null,
}));

// AdminUserSpaceEditor, UserRolesSection and UpgradePersonButton are client components (useRouter,
// role reads); this suite verifies the page's orchestration of the shared space, so stub them like
// the other children above. The editor must still render its children — the space is inside it.
jest.mock('@/app/(admin)/admin/users/[id]/AdminUserSpaceEditor', () => ({
  AdminUserSpaceEditor: ({ children }: { children: ReactNode }) => children,
}));

jest.mock('@/app/components/UserForm/UserRolesSection', () => ({
  UserRolesSection: () => null,
}));

jest.mock('@/app/(admin)/admin/users/[id]/UpgradePersonButton', () => ({
  UpgradePersonButton: () => null,
}));

jest.mock('@/app/components/UserSpace/UserSpace', () => ({
  UserSpace: jest.fn(() => null),
}));

// resolveTabKey is pure — keep the real one so the ?tab= narrowing is exercised end to end.
jest.mock('@/app/components/UserSpace/userSpaceData', () => ({
  ...jest.requireActual('@/app/components/UserSpace/userSpaceData'),
  loadUserSpace: jest.fn(),
}));

jest.mock('@/app/utils/ssrViewport', () => ({
  resolveSsrViewport: jest.fn(() => Promise.resolve(null)),
}));

jest.mock('@/app/lib/api/users', () => ({
  getAdminUser: jest.fn(),
}));

const mockUserSpace = UserSpace as unknown as jest.Mock;
const mockLoadUserSpace = loadUserSpace as jest.Mock;
const mockGetAdminUser = getAdminUser as jest.Mock;
const mockNotFound = notFound as unknown as jest.Mock;

const adminUser = { id: 5, email: 'c@x.com', displayName: 'Cara', status: 'ACTIVE' };

const spaceData = {
  collection: { slug: 'user', content: [] },
  sections: {
    collections: { label: 'Collections', content: [], emptyLabel: '' },
    images: { label: 'Images', content: [], emptyLabel: '' },
    saved: { label: 'Saved', content: [], emptyLabel: '' },
    following: { label: 'Following', content: [], emptyLabel: '' },
  },
  followedCollectionIds: [],
  savedImageIds: [],
};

async function renderPage(tab?: string) {
  const element = await AdminUserDetailPage({
    params: Promise.resolve({ id: '5' }),
    searchParams: Promise.resolve(tab === undefined ? {} : { tab }),
  });
  render(element);
}

describe("app/(admin)/admin/users/[id] — renders the target user's space", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAdminUser.mockResolvedValue(adminUser);
    mockLoadUserSpace.mockResolvedValue(spaceData);
  });

  it('loads the space for the routed user id, not the acting session', async () => {
    await renderPage();

    // The active tab is part of the call: the loader hydrates only that section, so passing it is
    // what keeps the Following tab's catalog read off the other three tabs.
    expect(mockLoadUserSpace).toHaveBeenCalledWith({ mode: 'admin', userId: 5 }, 'collections');
  });

  // Regression, and the load-bearing one. Every personal-action control in the collection stack
  // gates on the PRESENCE of a principal, not on ownership: SaveHeart returns null unless useMe()
  // is truthy, and its write goes to the session-bound POST /api/read/user/saves. Passing the
  // admin's principal here would let a click bookmark an image onto the ADMIN's own space.
  it('renders the space with me=null so personal-action controls stay disarmed', async () => {
    await renderPage();

    expect(mockUserSpace).toHaveBeenCalledTimes(1);
    expect(mockUserSpace.mock.calls[0][0].me).toBeNull();
  });

  it('points the section chips at this admin route, not at /user', async () => {
    await renderPage();

    expect(mockUserSpace.mock.calls[0][0].basePath).toBe('/admin/users/5');
  });

  it('passes the ?tab= section through', async () => {
    await renderPage('saved');

    expect(mockUserSpace.mock.calls[0][0].activeKey).toBe('saved');
  });

  it('falls back to Collections for an unknown ?tab=', async () => {
    await renderPage('nope');

    expect(mockUserSpace.mock.calls[0][0].activeKey).toBe('collections');
  });

  // The note rides in the header rail alongside the space's own metadata, not as a loose
  // paragraph above the grid — same placement contract as /user's Account and Admin cards.
  // Role membership rides the rail rather than a slab below the grid. It is the only rail extra
  // left: the "viewing X's space" note that used to sit beside it was removed as clutter.
  it('puts role membership in the rail', async () => {
    await renderPage();

    const { railExtras } = mockUserSpace.mock.calls[0][0];
    expect(railExtras).toBeTruthy();
    expect(railExtras.props.userId).toBe(5);
    expect(railExtras.props.compact).toBe(true);
  });

  // The space below renders this person's name as its own title, so a page <h1> repeating it put
  // two headings on one subject. The way back out is the breadcrumb and the card's bottom bar.
  it('does not repeat the user name as a page heading above the space', async () => {
    await renderPage();

    expect(screen.queryByRole('heading', { name: 'Cara' })).toBeNull();
    expect(screen.getByText('← Admin')).toBeTruthy();
  });

  it('shows an empty state and renders no space when the user has no galleries', async () => {
    mockLoadUserSpace.mockResolvedValue(null);

    await renderPage();

    expect(mockUserSpace).not.toHaveBeenCalled();
    // With the profile fields living in the space's rail, a user with no space has nowhere to be
    // edited here — so the empty state has to name the surface that can still edit them.
    expect(screen.getByText(/This user has no galleries yet/)).toBeTruthy();
    expect(screen.getByText(/Users panel on \/admin/)).toBeTruthy();
  });

  // The empty state above is only honest because `loadUserSpace` narrows its page read to a
  // genuine 404 and lets the rest reject. Re-adding a catch here — at either end — would put
  // "no galleries yet" back in front of an admin whose backend is simply down.
  it('lets a failed space read reach the error boundary rather than showing the empty state', async () => {
    mockLoadUserSpace.mockRejectedValue(new ApiError('Service Unavailable', 503));

    await expect(renderPage()).rejects.toThrow('Service Unavailable');
    expect(screen.queryByText(/This user has no galleries yet/)).toBeNull();
  });

  // `getAdminUser` throws ApiError for EVERY non-OK status. Catching them all conflated "no such
  // user" with "backend unreachable" / "session lapsed", so an outage rendered a confident 404.
  it('404s when the read genuinely reports the user does not exist', async () => {
    mockGetAdminUser.mockRejectedValue(new ApiError('Not Found', 404));

    await expect(renderPage()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockLoadUserSpace).not.toHaveBeenCalled();
  });

  it('404s on an empty body (null user)', async () => {
    mockGetAdminUser.mockResolvedValue(null);

    await expect(renderPage()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockLoadUserSpace).not.toHaveBeenCalled();
  });

  it('rethrows a backend outage to the error boundary rather than 404ing', async () => {
    mockGetAdminUser.mockRejectedValue(new ApiError('Service Unavailable', 503));

    await expect(renderPage()).rejects.toThrow('Service Unavailable');
    expect(mockNotFound).not.toHaveBeenCalled();
    expect(mockLoadUserSpace).not.toHaveBeenCalled();
  });

  it('rethrows an expired admin session (401) rather than 404ing', async () => {
    mockGetAdminUser.mockRejectedValue(new ApiError('Unauthorized', 401));

    await expect(renderPage()).rejects.toThrow('Unauthorized');
    expect(mockNotFound).not.toHaveBeenCalled();
  });

  it('404s on a non-integer id before any read runs', async () => {
    await expect(
      AdminUserDetailPage({
        params: Promise.resolve({ id: 'abc' }),
        searchParams: Promise.resolve({}),
      })
    ).rejects.toThrow('NEXT_NOT_FOUND');

    expect(mockGetAdminUser).not.toHaveBeenCalled();
    expect(mockLoadUserSpace).not.toHaveBeenCalled();
  });
});

// Tag-only PERSON rows have no account and no space. This branch also guards direct-URL access.
describe('app/(admin)/admin/users/[id] — tag-only PERSON identities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAdminUser.mockResolvedValue({
      id: 7,
      email: null,
      displayName: 'Dana',
      status: 'PERSON',
    });
    mockLoadUserSpace.mockResolvedValue(spaceData);
  });

  it('renders the minimal view and never loads a space', async () => {
    await renderPage();

    expect(mockUserSpace).not.toHaveBeenCalled();
    expect(mockLoadUserSpace).not.toHaveBeenCalled();
    expect(screen.getByText('tag-only · no account')).toBeTruthy();
  });

  // A PERSON has no space to name them, so the identity line still carries the name — but as the
  // card's own text, matching the account branch rather than reintroducing a page heading.
  it('names the identity without a page heading', async () => {
    await renderPage();

    expect(screen.getByText('Dana')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Dana' })).toBeNull();
  });
});
