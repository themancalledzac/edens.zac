/**
 * Tests for RoleDetailView — the members + per-collection grants editor that RolesPanel swaps into
 * its body.
 *
 * The two pick-from-a-list dropdowns carry most of the weight here. Backend order is insertion
 * order, so every fixture below is seeded deliberately out of order: an already-sorted fixture
 * would pass whether or not the component sorts. People are labelled name-first, so the user
 * fixtures give `displayName` and `email` opposing sort orders — falling back to the email would
 * reverse the list rather than merely relabel it.
 */

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { RoleDetailView } from '@/app/components/RolesPanel/RoleDetailView';
import * as collectionsApi from '@/app/lib/api/collections';
import * as rolesApi from '@/app/lib/api/roles';
import * as usersApi from '@/app/lib/api/users';
import { type CollectionModel } from '@/app/types/Collection';
import { type RoleDetail, type RoleSummary } from '@/app/types/Role';
import { type AdminUserSummary } from '@/app/types/User';

jest.mock('@/app/lib/api/roles', () => ({
  getRole: jest.fn(),
  deleteRole: jest.fn(),
  // `jest.fn(() => Promise.resolve())` rather than `jest.fn().mockResolvedValue(undefined)`:
  // unicorn/no-useless-undefined strips the argument, and the resulting bare `mockResolvedValue()`
  // fails to type-check against `Promise<void>`.
  setRoleGrant: jest.fn(() => Promise.resolve()),
  removeRoleGrant: jest.fn(() => Promise.resolve()),
  addRoleMember: jest.fn(() => Promise.resolve()),
  removeRoleMember: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/app/lib/api/collections', () => ({
  getAllCollectionsAdmin: jest.fn(),
}));

jest.mock('@/app/lib/api/users', () => ({
  listUsers: jest.fn(),
}));

const mockGetRole = rolesApi.getRole as jest.MockedFunction<typeof rolesApi.getRole>;
const mockDeleteRole = rolesApi.deleteRole as jest.MockedFunction<typeof rolesApi.deleteRole>;
const mockGetCollections = collectionsApi.getAllCollectionsAdmin as jest.MockedFunction<
  typeof collectionsApi.getAllCollectionsAdmin
>;
const mockListUsers = usersApi.listUsers as jest.MockedFunction<typeof usersApi.listUsers>;

const ROLE: RoleSummary = { id: 7, name: 'power' };
const BASE_DETAIL: RoleDetail = { id: 7, name: 'power', members: [], collections: [] };

const makeCollection = (id: number, title: string): CollectionModel => ({
  id,
  title,
  slug: `collection-${id}`,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  isClient: false,
  isBlog: false,
  locations: [],
});

const makeUser = (
  id: number,
  email: string | null,
  displayName: string | null,
  status: AdminUserSummary['status'] = 'ACTIVE'
): AdminUserSummary => ({ id, email, displayName, status, description: null });

const onDeleted = jest.fn();

/** Renders and waits for the role read to land — the section headings only exist once it has. */
async function renderDetail() {
  render(<RoleDetailView role={ROLE} onDeleted={onDeleted} />);
  await screen.findByRole('heading', { name: 'Collections' });
}

describe('RoleDetailView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.confirm = jest.fn(() => true);
    mockGetRole.mockResolvedValue(BASE_DETAIL);
    mockDeleteRole.mockResolvedValue();
    mockGetCollections.mockResolvedValue([]);
    mockListUsers.mockResolvedValue([]);
  });

  it('lists "Add a collection" options alphabetically by title, case-insensitively', async () => {
    mockGetCollections.mockResolvedValue([
      makeCollection(3, 'zebra crossing'),
      makeCollection(1, 'apple orchard'),
      makeCollection(2, 'Banff'),
    ]);
    await renderDetail();

    const select = await screen.findByLabelText('Add a collection');
    // Drop the leading "Add a collection..." placeholder.
    const options = within(select).getAllByRole('option').slice(1);
    expect(options.map(option => option.textContent)).toEqual([
      'apple orchard',
      'Banff',
      'zebra crossing',
    ]);
  });

  // Sorting by email would yield Zoe, Mallory, Alice — the exact reverse — so this fails loudly if
  // the component ever falls back to the address instead of the name.
  it('labels "Add a member" options by name, not email, and sorts by that name', async () => {
    mockListUsers.mockResolvedValue([
      makeUser(1, 'zed@example.com', 'Alice'),
      makeUser(2, 'aaa@example.com', 'Zoe'),
      makeUser(3, 'mmm@example.com', 'Mallory'),
    ]);
    await renderDetail();

    const select = await screen.findByLabelText('Add a member');
    const options = within(select).getAllByRole('option').slice(1);
    expect(options.map(option => option.textContent)).toEqual(['Alice', 'Mallory', 'Zoe']);
  });

  it('falls back to the email for a null displayName, and drops PERSON rows and current members', async () => {
    mockGetRole.mockResolvedValue({
      ...BASE_DETAIL,
      members: [{ userId: 4, email: 'member@example.com', name: 'Member Mo' }],
    });
    mockListUsers.mockResolvedValue([
      makeUser(1, 'nameless@example.com', null),
      makeUser(2, 'tagonly@example.com', 'Tag Only', 'PERSON'),
      makeUser(4, 'member@example.com', 'Member Mo'),
    ]);
    await renderDetail();

    const select = await screen.findByLabelText('Add a member');
    const options = within(select).getAllByRole('option').slice(1);
    expect(options.map(option => option.textContent)).toEqual(['nameless@example.com']);
  });

  // The email is the database's idea of who someone is, not the admin's. Bob's address sorts first
  // and Ada's last, so an email-first row would both mislabel and misorder the list.
  it('renders member rows name-first and sorts them by that name', async () => {
    mockGetRole.mockResolvedValue({
      ...BASE_DETAIL,
      members: [
        { userId: 1, email: 'aaa@example.com', name: 'Bob' },
        { userId: 2, email: 'zzz@example.com', name: 'Ada' },
      ],
    });
    await renderDetail();

    expect(await screen.findByText('Bob')).toBeInTheDocument();
    expect(screen.queryByText('aaa@example.com')).not.toBeInTheDocument();

    // Scope to the Members section so the Collections section's Remove buttons cannot interfere.
    const membersSection = screen
      .getByRole('heading', { name: 'Members' })
      .closest('section') as HTMLElement;
    const removeButtons = within(membersSection).getAllByRole('button', { name: /^Remove / });
    expect(removeButtons.map(button => button.getAttribute('aria-label'))).toEqual([
      'Remove Ada',
      'Remove Bob',
    ]);
  });

  it('excludes already-granted collections from the "Add a collection" picker', async () => {
    mockGetRole.mockResolvedValue({
      ...BASE_DETAIL,
      collections: [{ collectionId: 1, title: 'apple orchard', level: 'GENERAL' }],
    });
    mockGetCollections.mockResolvedValue([
      makeCollection(1, 'apple orchard'),
      makeCollection(2, 'Banff'),
    ]);
    await renderDetail();

    const select = await screen.findByLabelText('Add a collection');
    expect(within(select).getByRole('option', { name: 'Banff' })).toBeInTheDocument();
    expect(within(select).queryByRole('option', { name: 'apple orchard' })).not.toBeInTheDocument();
  });

  it('offers COLLABORATOR as a level option on both the per-grant and add-grant selects', async () => {
    mockGetRole.mockResolvedValue({
      ...BASE_DETAIL,
      collections: [{ collectionId: 1, title: 'apple orchard', level: 'GENERAL' }],
    });
    mockGetCollections.mockResolvedValue([
      makeCollection(1, 'apple orchard'),
      makeCollection(2, 'Banff'),
    ]);
    await renderDetail();

    const grantSelect = await screen.findByLabelText('Access level for apple orchard');
    expect(within(grantSelect).getByRole('option', { name: 'Collaborator (edit collection)' }))
      .toBeInTheDocument();

    const addLevelSelect = screen.getByLabelText('Access level for the collection being added');
    expect(within(addLevelSelect).getByRole('option', { name: 'Collaborator' })).toBeInTheDocument();
  });

  it('confirms "Delete role", then calls onDeleted once the delete resolves', async () => {
    await renderDetail();

    fireEvent.click(screen.getByRole('button', { name: 'Delete role' }));

    await waitFor(() => expect(mockDeleteRole).toHaveBeenCalledWith(ROLE.id));
    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
    expect(window.confirm).toHaveBeenCalled();
  });

  it('deletes nothing when the confirm is declined', async () => {
    window.confirm = jest.fn(() => false);
    await renderDetail();

    fireEvent.click(screen.getByRole('button', { name: 'Delete role' }));

    expect(mockDeleteRole).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
  });

  // `getRole` throws out of fetchAdminGetApi on any non-OK response. Without its own branch the
  // view would sit on an empty editor and read as a role that grants nothing.
  it('shows a load failure with a Retry that refetches the role', async () => {
    mockGetRole.mockRejectedValueOnce(new Error('Backend unreachable'));
    render(<RoleDetailView role={ROLE} onDeleted={onDeleted} />);

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/could not load this role/i)
    );
    expect(mockGetRole).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => expect(mockGetRole).toHaveBeenCalledTimes(2));
    await screen.findByRole('heading', { name: 'Collections' });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
