import { render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';

import AdminUserDetailPage from '@/app/(admin)/admin/users/[id]/page';
import CollectionPage from '@/app/components/ContentCollection/CollectionPage';
import { getAdminUser, getUserPageById } from '@/app/lib/api/users';

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

// UserDetailEditor is a Client Component (useRouter + UserForm → listUserCollections); this test
// exercises the page's read-only CollectionPage render, not the editor, so stub it like the
// other child components above.
jest.mock('@/app/(admin)/admin/users/[id]/UserDetailEditor', () => ({
  UserDetailEditor: () => null,
}));

jest.mock('@/app/components/ContentCollection/CollectionPage', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

jest.mock('@/app/lib/api/users', () => ({
  getAdminUser: jest.fn(),
  getUserPageById: jest.fn(),
}));

const mockCollectionPage = CollectionPage as unknown as jest.Mock;
const mockGetAdminUser = getAdminUser as jest.Mock;
const mockGetUserPageById = getUserPageById as jest.Mock;

const adminUser = { id: 5, email: 'c@x.com', displayName: 'Cara', status: 'ACTIVE' };

async function renderPage() {
  const element = await AdminUserDetailPage({ params: Promise.resolve({ id: '5' }) });
  render(element);
}

describe('app/(admin)/admin/users/[id] — user page is rendered read-only', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAdminUser.mockResolvedValue(adminUser);
  });

  // Regression: the user page is a synthetic aggregation (slug "user", no backing collection
  // row). editMode would mount the edit layer, which loads /api/admin/collections/user/update
  // and 404s ("Collection not found with slug: user"). It must render read-only.
  it('renders the synthetic user page WITHOUT editMode', async () => {
    mockGetUserPageById.mockResolvedValue({ slug: 'user', type: 'PARENT', content: [] });

    await renderPage();

    expect(mockCollectionPage).toHaveBeenCalledTimes(1);
    const props = mockCollectionPage.mock.calls[0][0];
    expect(props.collection).toMatchObject({ slug: 'user' });
    expect(props.editMode).toBeFalsy();
  });

  it('shows an empty state and renders no CollectionPage when the user has no galleries', async () => {
    mockGetUserPageById.mockResolvedValue(null);

    await renderPage();

    expect(mockCollectionPage).not.toHaveBeenCalled();
    expect(screen.getByText('This user has no galleries yet.')).toBeTruthy();
  });
});
