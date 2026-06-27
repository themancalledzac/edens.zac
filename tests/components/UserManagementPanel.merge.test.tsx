/**
 * Tests the identity-merge flow on UserManagementPanel: toggling "Show tag-only people" reveals a
 * PERSON row with a Merge action; opening the modal, picking a survivor, and confirming calls
 * {@link mergeUser} with `(targetId, sourceId)`. Also covers the safety guards: a null preview keeps
 * the confirm disabled, and PERSON rows are non-navigable (no account detail page to reach).
 *
 * Auto-mocks the users API and stubs `revalidateMetadataCache` (the merge success path calls it).
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { UserManagementPanel } from '@/app/components/UserManagementPanel/UserManagementPanel';
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

it('merges a tag-only person into an account', async () => {
  const user = userEvent.setup();
  render(<UserManagementPanel />);

  // toggle on -> person row appears with a Merge button
  await user.click(await screen.findByLabelText(/show tag-only people/i));
  await user.click(await screen.findByRole('button', { name: /merge/i }));

  // pick the survivor + confirm
  await user.selectOptions(await screen.findByRole('combobox'), '1');
  expect(await screen.findByText(/permanently deletes/i)).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /^merge$/i }));

  expect(mergeUser).toHaveBeenCalledWith(1, 2);
});

it('keeps the confirm disabled (and never merges) when the preview is null', async () => {
  (getMergePreview as jest.Mock).mockResolvedValue(null);
  const user = userEvent.setup();
  render(<UserManagementPanel />);

  await user.click(await screen.findByLabelText(/show tag-only people/i));
  await user.click(await screen.findByRole('button', { name: /merge/i }));
  await user.selectOptions(await screen.findByRole('combobox'), '1');

  // null preview surfaces an error, no preview text, and a disabled confirm
  expect(await screen.findByText(/no longer exists/i)).toBeInTheDocument();
  expect(screen.queryByText(/permanently deletes/i)).not.toBeInTheDocument();
  const confirm = screen.getByRole('button', { name: /^merge$/i });
  expect(confirm).toBeDisabled();

  await user.click(confirm);
  expect(mergeUser).not.toHaveBeenCalled();
});

it('does not navigate to a detail page when a tag-only person row is clicked', async () => {
  const user = userEvent.setup();
  render(<UserManagementPanel />);

  await user.click(await screen.findByLabelText(/show tag-only people/i));
  // The PERSON row identity is a static element, not a navigating button.
  const personRow = (await screen.findByText('Danny Nieves')).closest('li') as HTMLElement;
  await user.click(within(personRow).getByText('Danny Nieves'));

  expect(mockPush).not.toHaveBeenCalled();
});
