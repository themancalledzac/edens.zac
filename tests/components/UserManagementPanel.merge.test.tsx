/**
 * Tests the identity-merge flow on UserManagementPanel: toggling the People chip reveals a
 * PERSON row whose detail sheet offers a Merge action; opening the modal, picking a survivor, and confirming calls
 * {@link mergeUser} with `(targetId, sourceId)`. Also covers the safety guards: a null preview keeps
 * the confirm disabled, and PERSON rows are non-navigable (no account detail page to reach).
 *
 * Auto-mocks the users API and stubs `revalidateMetadataCache` (the merge success path calls it).
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { UserManagementPanel } from '@/app/components/UserManagementPanel/UserManagementPanel';
import { clearCachedPanelData } from '@/app/hooks/useCachedPanelData';
import { getMergePreview, listUsers, mergeUser } from '@/app/lib/api/users';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/app/lib/api/users');
jest.mock('@/app/components/ContentCollection/edit/collectionEditUtils', () => ({
  revalidateMetadataCache: jest.fn(async () => {}),
}));

const account = {
  id: 1,
  email: 'danny@danny.com',
  displayName: 'Danny',
  status: 'ACTIVE' as const,
};
const person = { id: 2, email: null, displayName: 'Danny Nieves', status: 'PERSON' as const };

beforeEach(() => {
  jest.clearAllMocks();
  clearCachedPanelData();
  window.localStorage.clear();
  (listUsers as jest.Mock).mockImplementation(async (opts?: { includePeople?: boolean }) =>
    opts?.includePeople ? [account, person] : [account]
  );
  (getMergePreview as jest.Mock).mockResolvedValue({
    sourceId: 2,
    sourceName: 'Danny Nieves',
    targetId: 1,
    targetName: 'Danny',
    imageTagCount: 3,
    collectionCount: 1,
    duplicatesCollapsed: 0,
  });
  (mergeUser as jest.Mock).mockResolvedValue({
    movedImageTags: 3,
    movedCollections: 1,
    duplicatesCollapsed: 0,
  });
});

const openPersonSheet = async (user: ReturnType<typeof userEvent.setup>) => {
  const personRow = (await screen.findByText('Danny Nieves')).closest('li') as HTMLElement;
  await user.click(within(personRow).getByRole('button'));
};

it('merges a tag-only person into an account', async () => {
  const user = userEvent.setup();
  render(<UserManagementPanel />);

  await user.click(await screen.findByRole('button', { name: /people/i }));
  await openPersonSheet(user);
  await user.click(await screen.findByRole('button', { name: /merge/i }));

  await user.selectOptions(await screen.findByRole('combobox'), '1');
  expect(await screen.findByText(/permanently deletes/i)).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /^merge$/i }));

  expect(mergeUser).toHaveBeenCalledWith(1, 2);
});

it('keeps the confirm disabled (and never merges) when the preview is null', async () => {
  (getMergePreview as jest.Mock).mockResolvedValue(null);
  const user = userEvent.setup();
  render(<UserManagementPanel />);

  await user.click(await screen.findByRole('button', { name: /people/i }));
  await openPersonSheet(user);
  await user.click(await screen.findByRole('button', { name: /merge/i }));
  await user.selectOptions(await screen.findByRole('combobox'), '1');

  expect(await screen.findByText(/no longer exists/i)).toBeInTheDocument();
  expect(screen.queryByText(/permanently deletes/i)).not.toBeInTheDocument();
  const confirm = screen.getByRole('button', { name: /^merge$/i });
  expect(confirm).toBeDisabled();

  await user.click(confirm);
  expect(mergeUser).not.toHaveBeenCalled();
});

it('opens the sheet and does not navigate when a tag-only person row is clicked', async () => {
  const user = userEvent.setup();
  render(<UserManagementPanel />);

  await user.click(await screen.findByRole('button', { name: /people/i }));
  const personRow = (await screen.findByText('Danny Nieves')).closest('li') as HTMLElement;
  await user.click(within(personRow).getByText('Danny Nieves'));

  expect(await screen.findByRole('dialog')).toBeInTheDocument();
  expect(mockPush).not.toHaveBeenCalled();
});
