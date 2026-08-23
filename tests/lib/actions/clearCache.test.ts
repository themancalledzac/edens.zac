/**
 * @jest-environment node
 *
 * Admin gate for `clearCacheAction` (D2), plus the cache-clear behavior it wraps —
 * the action had no tests at all before this file (a B8 coverage gap).
 *
 * The action ships its ID in the public client bundle, so anyone can invoke it with a
 * `Next-Action` POST. The backend leg 401s for an anonymous caller on its own, but
 * `revalidatePath('/', 'layout')` runs in a separate `try` regardless — so the assertion
 * that actually matters on every rejection path is that `revalidatePath` was NOT called.
 *
 * These set `NEXT_PUBLIC_ENV` rather than `NODE_ENV` because Jest fixes `NODE_ENV` to
 * `test` for the whole run; `isLocalEnvironment()` reads either, so the default state of
 * every test here is "not local", i.e. the gate is live.
 */

import { revalidatePath } from 'next/cache';

import { clearCacheAction } from '@/app/lib/actions/clearCache';
import { meServer } from '@/app/lib/api/auth';
import { fetchAdminPostJsonApi } from '@/app/lib/api/core';
import { type MeResponse } from '@/app/types/Auth';

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('@/app/lib/api/auth', () => ({
  meServer: jest.fn(),
}));

jest.mock('@/app/lib/api/core', () => ({
  fetchAdminPostJsonApi: jest.fn(() => Promise.resolve({})),
}));

const mockRevalidatePath = revalidatePath as jest.MockedFunction<typeof revalidatePath>;
const mockMeServer = meServer as jest.MockedFunction<typeof meServer>;
const mockBackendPost = fetchAdminPostJsonApi as jest.MockedFunction<typeof fetchAdminPostJsonApi>;

function principal(overrides: Partial<MeResponse> = {}): MeResponse {
  return {
    email: 'user@example.com',
    isAdmin: false,
    mfaSatisfied: true,
    galleries: [],
    ...overrides,
  };
}

describe('clearCacheAction', () => {
  const originalEnv = process.env.NEXT_PUBLIC_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    mockBackendPost.mockImplementation(() => Promise.resolve({}));
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_ENV = originalEnv;
  });

  describe('admin gate (non-local)', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_ENV = 'production';
    });

    it('rejects an anonymous caller', async () => {
      mockMeServer.mockResolvedValue(null);

      await expect(clearCacheAction()).resolves.toEqual({ ok: false, error: 'Unauthorized' });
    });

    it('does NOT purge the route cache for an anonymous caller', async () => {
      mockMeServer.mockResolvedValue(null);

      await clearCacheAction();

      expect(mockRevalidatePath).not.toHaveBeenCalled();
      expect(mockBackendPost).not.toHaveBeenCalled();
    });

    it('rejects a logged-in non-admin without purging', async () => {
      mockMeServer.mockResolvedValue(principal({ isAdmin: false }));

      await expect(clearCacheAction()).resolves.toEqual({ ok: false, error: 'Unauthorized' });
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it('fails closed without purging when the principal cannot be resolved', async () => {
      mockMeServer.mockRejectedValue(new Error('backend down'));

      await expect(clearCacheAction()).resolves.toEqual({ ok: false, error: 'Unauthorized' });
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it('allows an admin principal through', async () => {
      mockMeServer.mockResolvedValue(principal({ isAdmin: true }));

      await expect(clearCacheAction()).resolves.toEqual({ ok: true });
      expect(mockRevalidatePath).toHaveBeenCalledWith('/', 'layout');
      expect(mockBackendPost).toHaveBeenCalledWith('/cache/clear', {});
    });
  });

  describe('local environment', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_ENV = 'local';
    });

    it('clears the cache without consulting the session at all', async () => {
      await expect(clearCacheAction()).resolves.toEqual({ ok: true });

      expect(mockMeServer).not.toHaveBeenCalled();
      expect(mockRevalidatePath).toHaveBeenCalledWith('/', 'layout');
    });
  });

  describe('cache-clear behavior for an authorized caller', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_ENV = 'production';
      mockMeServer.mockResolvedValue(principal({ isAdmin: true }));
    });

    it('still revalidates when the backend leg fails, and reports the backend error', async () => {
      mockBackendPost.mockRejectedValue(new Error('500 from Spring'));

      await expect(clearCacheAction()).resolves.toEqual({
        ok: false,
        error: 'Backend cache clear failed: 500 from Spring',
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith('/', 'layout');
    });

    it('reports a non-Error backend rejection as Unknown error', async () => {
      mockBackendPost.mockRejectedValue('nope');

      await expect(clearCacheAction()).resolves.toEqual({
        ok: false,
        error: 'Backend cache clear failed: Unknown error',
      });
    });

    it('returns the revalidation error when revalidatePath throws', async () => {
      mockRevalidatePath.mockImplementation(() => {
        throw new Error('outside request scope');
      });

      await expect(clearCacheAction()).resolves.toEqual({
        ok: false,
        error: 'outside request scope',
      });
    });
  });
});
