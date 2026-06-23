/**
 * Unit tests for user.ts
 * Mocks fetchReadApi from core to verify getUserPage delegates correctly.
 */

import * as core from '@/app/lib/api/core';
import { getUserPage } from '@/app/lib/api/user';

jest.mock('@/app/lib/api/core', () => ({
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

  it('returns null when the endpoint yields null (401/anonymous)', async () => {
    (core.fetchReadApi as jest.Mock).mockResolvedValue(null);
    expect(await getUserPage()).toBeNull();
  });
});
