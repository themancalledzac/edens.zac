import { renderHook, waitFor } from '@testing-library/react';

import { useFetchMe } from '@/app/hooks/useFetchMe';
import * as authApi from '@/app/lib/api/auth';

jest.mock('@/app/lib/api/auth', () => ({
  me: jest.fn(),
}));

const mockMe = authApi.me as jest.MockedFunction<typeof authApi.me>;

describe('useFetchMe', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts loading, then resolves the principal', async () => {
    mockMe.mockResolvedValue({ email: 'a@b.com', mfaSatisfied: true, galleries: [] });

    const { result } = renderHook(() => useFetchMe());
    expect(result.current.loading).toBe(true);
    expect(result.current.me).toBeNull();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.me).toEqual({ email: 'a@b.com', mfaSatisfied: true, galleries: [] });
  });

  it('resolves to null when logged out (me() returns null)', async () => {
    mockMe.mockResolvedValue(null);

    const { result } = renderHook(() => useFetchMe());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.me).toBeNull();
  });

  it('resolves to null when me() throws', async () => {
    mockMe.mockRejectedValue(new Error('network'));

    const { result } = renderHook(() => useFetchMe());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.me).toBeNull();
  });
});
