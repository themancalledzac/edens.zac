import { redirect } from 'next/navigation';

import { meServer } from '@/app/lib/api/auth';
import { type MeResponse } from '@/app/types/Auth';
import { requireAdmin } from '@/app/utils/admin';

jest.mock('next/navigation', () => ({
  // `redirect` throws a NEXT_REDIRECT sentinel in real Next so control never
  // falls through; mimic that so tests can assert the throw AND that no code
  // after the redirect runs.
  redirect: jest.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

jest.mock('@/app/lib/api/auth', () => ({
  meServer: jest.fn(),
}));

const mockMeServer = meServer as jest.MockedFunction<typeof meServer>;
const mockRedirect = redirect as jest.MockedFunction<typeof redirect>;

function principal(overrides: Partial<MeResponse> = {}): MeResponse {
  return {
    email: 'user@example.com',
    isAdmin: false,
    mfaSatisfied: true,
    galleries: [],
    ...overrides,
  };
}

describe('requireAdmin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves without redirecting for an admin principal', async () => {
    mockMeServer.mockResolvedValue(principal({ isAdmin: true }));

    await expect(requireAdmin()).resolves.toBeUndefined();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('redirects to /login for a logged-in non-admin', async () => {
    mockMeServer.mockResolvedValue(principal({ isAdmin: false }));

    await expect(requireAdmin()).rejects.toThrow('NEXT_REDIRECT:/login');
    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });

  it('redirects to /login when anonymous (meServer returns null)', async () => {
    mockMeServer.mockResolvedValue(null);

    await expect(requireAdmin()).rejects.toThrow('NEXT_REDIRECT:/login');
    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });
});
