/** @jest-environment node */
/**
 * Route tests for app/invite/[token]/page.tsx.
 *
 * Verifies the three-way branch on who is opening the link:
 *  - already signed in           → redirect('/'), token never looked up
 *  - token already redeemed (410) → redirect('/')
 *  - token invalid / expired (404) → notFound()
 *  - valid token + anonymous      → page renders without throwing
 */

import { notFound, redirect } from 'next/navigation';

// Both helpers work by throwing a sentinel; mirror that so the page's control flow is exercised
// rather than falling through to the render path.
jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  redirect: jest.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));

jest.mock('@/app/lib/api/users', () => ({
  getInvitePreview: jest.fn(),
}));

jest.mock('@/app/lib/api/auth', () => ({
  meServer: jest.fn(),
}));

// InviteForm is a client component — stub it for the server-env test.
jest.mock('@/app/invite/[token]/InviteForm', () => ({
  __esModule: true,
  default: ({ token, email }: { token: string; email: string }) => `InviteForm:${token}:${email}`,
}));

import InvitePage from '@/app/invite/[token]/page';
import { meServer } from '@/app/lib/api/auth';
import { getInvitePreview } from '@/app/lib/api/users';

describe('InvitePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (meServer as jest.Mock).mockResolvedValue(null);
  });

  it('redirects an already-signed-in visitor home without looking up the token', async () => {
    (meServer as jest.Mock).mockResolvedValue({ email: 'me@example.com', isAdmin: false });

    await expect(InvitePage({ params: Promise.resolve({ token: 'any-token' }) })).rejects.toThrow(
      'NEXT_REDIRECT'
    );

    expect(redirect).toHaveBeenCalledWith('/');
    // The session gate runs first, so a signed-in visitor costs no backend round-trip.
    expect(getInvitePreview).not.toHaveBeenCalled();
    expect(notFound).not.toHaveBeenCalled();
  });

  it('redirects home when the invite has already been redeemed', async () => {
    (getInvitePreview as jest.Mock).mockResolvedValue({ status: 'used' });

    await expect(InvitePage({ params: Promise.resolve({ token: 'used-token' }) })).rejects.toThrow(
      'NEXT_REDIRECT'
    );

    expect(redirect).toHaveBeenCalledWith('/');
    expect(notFound).not.toHaveBeenCalled();
  });

  it('calls notFound() when the token is invalid or expired', async () => {
    (getInvitePreview as jest.Mock).mockResolvedValue({ status: 'invalid' });

    await expect(InvitePage({ params: Promise.resolve({ token: 'bad-token' }) })).rejects.toThrow(
      'NEXT_NOT_FOUND'
    );

    expect(notFound).toHaveBeenCalled();
    // A dead link must not be silently swept to the home page.
    expect(redirect).not.toHaveBeenCalled();
  });

  it('renders without throwing when the preview is valid and the visitor is anonymous', async () => {
    (getInvitePreview as jest.Mock).mockResolvedValue({
      status: 'ok',
      preview: { email: 'client@example.com', displayName: 'Jane' },
    });

    const result = await InvitePage({ params: Promise.resolve({ token: 'good-token' }) });

    expect(result).toBeTruthy();
    expect(redirect).not.toHaveBeenCalled();
    expect(notFound).not.toHaveBeenCalled();
  });
});
