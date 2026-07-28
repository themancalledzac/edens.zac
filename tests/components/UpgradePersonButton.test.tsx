/**
 * Tests the admin user-detail affordance for promoting a tag-only PERSON in place: the button
 * mounts {@link UpgradeUserModal} on demand, a successful upgrade calls {@link upgradeUser} and
 * refreshes the server-rendered page immediately (so the detail view stops claiming "no account")
 * while the one-time invite link stays visible until dismissed, and Cancel unmounts the modal.
 *
 * Auto-mocks the users API and stubs `next/navigation`'s router.
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { UpgradePersonButton } from '@/app/(admin)/admin/users/[id]/UpgradePersonButton';
import { ApiError } from '@/app/lib/api/core';
import { upgradeUser } from '@/app/lib/api/users';
import { type AdminUserSummary } from '@/app/types/User';

const mockRefresh = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mockRefresh }) }));
jest.mock('@/app/lib/api/users');

const person: AdminUserSummary = {
  id: 2,
  email: null,
  displayName: 'Danny Nieves',
  status: 'PERSON',
  description: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  (upgradeUser as jest.Mock).mockResolvedValue({
    userId: 2,
    inviteUrl: 'http://localhost:3000/invite/upgraded',
  });
});

it('opens the upgrade modal, upgrades, and refreshes the detail page', async () => {
  const user = userEvent.setup();
  render(<UpgradePersonButton person={person} />);

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /upgrade to account/i }));

  const dialog = within(await screen.findByRole('dialog'));
  await user.type(dialog.getByLabelText(/login email/i), 'danny@nieves.com');
  await user.click(dialog.getByRole('button', { name: /^upgrade$/i }));

  expect(upgradeUser).toHaveBeenCalledWith(2, 'danny@nieves.com');
  expect(await dialog.findByText('http://localhost:3000/invite/upgraded')).toBeInTheDocument();
  expect(mockRefresh).toHaveBeenCalledTimes(1);
});

it('does not refresh when the upgrade fails', async () => {
  (upgradeUser as jest.Mock).mockRejectedValue(new ApiError('Conflict', 409));
  const user = userEvent.setup();
  render(<UpgradePersonButton person={person} />);

  await user.click(screen.getByRole('button', { name: /upgrade to account/i }));
  const dialog = within(await screen.findByRole('dialog'));
  await user.type(dialog.getByLabelText(/login email/i), 'taken@nieves.com');
  await user.click(dialog.getByRole('button', { name: /^upgrade$/i }));

  expect(await dialog.findByText(/already taken/i)).toBeInTheDocument();
  expect(mockRefresh).not.toHaveBeenCalled();
});

it('unmounts the modal on cancel', async () => {
  const user = userEvent.setup();
  render(<UpgradePersonButton person={person} />);

  await user.click(screen.getByRole('button', { name: /upgrade to account/i }));
  const dialog = within(await screen.findByRole('dialog'));
  await user.click(dialog.getByRole('button', { name: /cancel/i }));

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(upgradeUser).not.toHaveBeenCalled();
});
