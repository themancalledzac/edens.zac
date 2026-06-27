/** @jest-environment node */
/**
 * Route tests for app/invite/[token]/page.tsx.
 *
 * Verifies:
 *  - invalid / expired / used token (null preview) → notFound()
 *  - valid token → page renders without throwing
 */

import { notFound } from 'next/navigation';

jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

jest.mock('@/app/lib/api/users', () => ({
  getInvitePreview: jest.fn(),
}));

// InviteForm is a client component — stub it for the server-env test.
jest.mock('@/app/invite/[token]/InviteForm', () => ({
  __esModule: true,
  default: ({ token, email }: { token: string; email: string }) => `InviteForm:${token}:${email}`,
}));

import InvitePage from '@/app/invite/[token]/page';
import { getInvitePreview } from '@/app/lib/api/users';

describe('InvitePage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls notFound() when the preview is null (invalid / expired / used token)', async () => {
    (getInvitePreview as jest.Mock).mockResolvedValue(null);

    await expect(InvitePage({ params: Promise.resolve({ token: 'bad-token' }) })).rejects.toThrow(
      'NEXT_NOT_FOUND'
    );

    expect(notFound).toHaveBeenCalled();
  });

  it('renders without throwing when the preview is valid', async () => {
    (getInvitePreview as jest.Mock).mockResolvedValue({
      email: 'client@example.com',
      displayName: 'Jane',
    });

    const result = await InvitePage({ params: Promise.resolve({ token: 'good-token' }) });
    expect(result).toBeTruthy();
  });
});
