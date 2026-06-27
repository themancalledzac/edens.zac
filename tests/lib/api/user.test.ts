/**
 * Unit tests for user.ts
 * Mocks fetchReadApi from core (keeping the real ApiError) to verify getUserPage delegates
 * correctly and maps a 401 to null while propagating other errors.
 */

import * as core from '@/app/lib/api/core';
import { ApiError } from '@/app/lib/api/core';
import { getUserPage } from '@/app/lib/api/user';

jest.mock('@/app/lib/api/core', () => ({
  ...jest.requireActual('@/app/lib/api/core'),
  fetchReadApi: jest.fn(),
}));

describe('getUserPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the synthetic collection from user/me/page (no-store)', async () => {
    const fake = { id: 0, slug: 'user', type: 'PARENT', title: 'Yours', content: [] };
    (core.fetchReadApi as jest.Mock).mockResolvedValue(fake);

    const result = await getUserPage();

    expect(core.fetchReadApi).toHaveBeenCalledWith('user/me/page', { cache: 'no-store' });
    expect(result).toBe(fake);
  });

  it('returns null when the fetch throws ApiError(401) (no/revoked session)', async () => {
    (core.fetchReadApi as jest.Mock).mockRejectedValue(new ApiError('Unauthorized', 401));
    expect(await getUserPage()).toBeNull();
  });

  it('propagates non-401 errors', async () => {
    (core.fetchReadApi as jest.Mock).mockRejectedValue(new ApiError('Server error', 500));
    await expect(getUserPage()).rejects.toThrow(ApiError);
  });
});
