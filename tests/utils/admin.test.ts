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

  /**
   * The local bypass and the production gate, pinned as a pair — the bypass is only defensible
   * while the second test below keeps passing.
   *
   * These set `NEXT_PUBLIC_ENV` rather than `NODE_ENV` because Jest fixes `NODE_ENV` to `test`
   * for the whole run; `isLocalEnvironment()` reads either, so this exercises the same branch.
   * That `NODE_ENV=test` default is also why every assertion above still describes the real gate.
   */
  describe('local environment', () => {
    const originalEnv = process.env.NEXT_PUBLIC_ENV;

    afterEach(() => {
      process.env.NEXT_PUBLIC_ENV = originalEnv;
    });

    it('resolves without consulting the session at all when local', async () => {
      process.env.NEXT_PUBLIC_ENV = 'local';

      await expect(requireAdmin()).resolves.toBeUndefined();
      expect(mockRedirect).not.toHaveBeenCalled();
      // The point is reachability without a login, so it must not even ask.
      expect(mockMeServer).not.toHaveBeenCalled();
    });

    it('still redirects an anonymous request when NOT local', async () => {
      process.env.NEXT_PUBLIC_ENV = 'production';
      mockMeServer.mockResolvedValue(null);

      await expect(requireAdmin()).rejects.toThrow('NEXT_REDIRECT:/login');
      expect(mockMeServer).toHaveBeenCalled();
    });

    it('still redirects a logged-in non-admin when NOT local', async () => {
      process.env.NEXT_PUBLIC_ENV = 'production';
      mockMeServer.mockResolvedValue(principal({ isAdmin: false }));

      await expect(requireAdmin()).rejects.toThrow('NEXT_REDIRECT:/login');
    });
  });
});
