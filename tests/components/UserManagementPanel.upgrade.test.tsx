/**
 * Tests the in-place upgrade flow on UserManagementPanel: toggling "Show tag-only people" reveals a
 * PERSON row with an Upgrade action alongside Merge; opening the modal, entering a required email,
 * and submitting calls {@link upgradeUser} with `(id, email)` and then shows the returned invite
 * link. Also covers the required-email guard (no request fired when the email is blank), the fact
 * that a successful upgrade refreshes the list and revalidates caches immediately rather than
 * waiting for the admin to close the modal, and every backend error branch (404 / 409 / unknown).
 *
 * Auto-mocks the users API and stubs `revalidateMetadataCache` (the upgrade success path calls it).
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { revalidateMetadataCache } from '@/app/components/ContentCollection/edit/collectionEditUtils';
import { UserManagementPanel } from '@/app/components/UserManagementPanel/UserManagementPanel';
import { ApiError } from '@/app/lib/api/core';
import { listUsers, upgradeUser } from '@/app/lib/api/users';

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
  (upgradeUser as jest.Mock).mockResolvedValue({
    userId: 2,
    inviteUrl: 'http://localhost:3000/invite/upgraded',
  });
});

const openUpgradeModal = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(await screen.findByLabelText(/show tag-only people/i));
  const personRow = (await screen.findByText('Danny Nieves')).closest('li') as HTMLElement;
  await user.click(within(personRow).getByRole('button', { name: /upgrade/i }));
};

const submitUpgrade = async (
  user: ReturnType<typeof userEvent.setup>,
  email = 'danny@nieves.com'
) => {
  const dialog = within(await screen.findByRole('dialog'));
  if (email) {
    await user.type(dialog.getByLabelText(/login email/i), email);
  }
  await user.click(dialog.getByRole('button', { name: /^upgrade$/i }));
  return dialog;
};

it('upgrades a tag-only person in place and shows the invite link', async () => {
  const user = userEvent.setup();
  render(<UserManagementPanel />);

  await openUpgradeModal(user);
  const dialog = await submitUpgrade(user);

  expect(upgradeUser).toHaveBeenCalledWith(2, 'danny@nieves.com');
  expect(await dialog.findByText('http://localhost:3000/invite/upgraded')).toBeInTheDocument();
  expect(dialog.getByRole('button', { name: /copy/i })).toBeInTheDocument();
});

it('refreshes the list and revalidates caches on success, without waiting for a close', async () => {
  const user = userEvent.setup();
  render(<UserManagementPanel />);

  await openUpgradeModal(user);
  const listCallsBeforeUpgrade = (listUsers as jest.Mock).mock.calls.length;
  const dialog = await submitUpgrade(user);

  expect(await dialog.findByText('http://localhost:3000/invite/upgraded')).toBeInTheDocument();
  expect(revalidateMetadataCache).toHaveBeenCalledTimes(1);
  expect((listUsers as jest.Mock).mock.calls.length).toBeGreaterThan(listCallsBeforeUpgrade);
  expect(screen.getByRole('dialog')).toBeInTheDocument();

  await user.click(dialog.getByRole('button', { name: /close/i }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('does not call upgradeUser when the email is blank', async () => {
  const user = userEvent.setup();
  render(<UserManagementPanel />);

  await openUpgradeModal(user);
  const dialog = await submitUpgrade(user, '');

  expect(upgradeUser).not.toHaveBeenCalled();
  expect(await dialog.findByText(/email is required/i)).toBeInTheDocument();
  expect(revalidateMetadataCache).not.toHaveBeenCalled();
});

it('surfaces a 404 as a stale-list message and keeps the form open', async () => {
  (upgradeUser as jest.Mock).mockRejectedValue(new ApiError('Not Found', 404));
  const user = userEvent.setup();
  render(<UserManagementPanel />);

  await openUpgradeModal(user);
  const dialog = await submitUpgrade(user);

  expect(await dialog.findByText(/no longer exists/i)).toBeInTheDocument();
  expect(dialog.getByRole('button', { name: /^upgrade$/i })).toBeEnabled();
  expect(dialog.queryByText(/invite\/upgraded/)).not.toBeInTheDocument();
  expect(revalidateMetadataCache).not.toHaveBeenCalled();
});

it('surfaces a 409 as a taken-email / not-upgradable message', async () => {
  (upgradeUser as jest.Mock).mockRejectedValue(new ApiError('Conflict', 409));
  const user = userEvent.setup();
  render(<UserManagementPanel />);

  await openUpgradeModal(user);
  const dialog = await submitUpgrade(user);

  expect(await dialog.findByText(/already taken/i)).toBeInTheDocument();
  expect(revalidateMetadataCache).not.toHaveBeenCalled();
});

it('falls back to a generic message for a non-ApiError failure', async () => {
  (upgradeUser as jest.Mock).mockRejectedValue(new Error('network down'));
  const user = userEvent.setup();
  render(<UserManagementPanel />);

  await openUpgradeModal(user);
  const dialog = await submitUpgrade(user);

  expect(await dialog.findByText(/could not upgrade this person/i)).toBeInTheDocument();
  expect(revalidateMetadataCache).not.toHaveBeenCalled();
});

it('clears a prior error when the upgrade is retried successfully', async () => {
  (upgradeUser as jest.Mock).mockRejectedValueOnce(new ApiError('Conflict', 409));
  const user = userEvent.setup();
  render(<UserManagementPanel />);

  await openUpgradeModal(user);
  const dialog = await submitUpgrade(user);
  expect(await dialog.findByText(/already taken/i)).toBeInTheDocument();

  await user.click(dialog.getByRole('button', { name: /^upgrade$/i }));

  expect(await dialog.findByText('http://localhost:3000/invite/upgraded')).toBeInTheDocument();
  expect(dialog.queryByText(/already taken/i)).not.toBeInTheDocument();
});
