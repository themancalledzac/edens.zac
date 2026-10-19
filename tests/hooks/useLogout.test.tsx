import { act, renderHook, waitFor } from '@testing-library/react';

import { useLogout } from '@/app/hooks/useLogout';
import * as authApi from '@/app/lib/api/auth';

const mockPush = jest.fn();
const mockRefresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));
jest.mock('@/app/lib/api/auth', () => ({ logout: jest.fn() }));

const mockLogout = authApi.logout as jest.MockedFunction<typeof authApi.logout>;

describe('useLogout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.setItem('adminPanel:v1:messages', '{}');
  });

  it('logs out, clears cached panel data, goes home and calls onDone', async () => {
    mockLogout.mockResolvedValue();
    const onDone = jest.fn();
    const { result } = renderHook(() => useLogout(onDone));

    act(() => result.current());

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(mockPush).toHaveBeenCalledWith('/');
    expect(mockRefresh).toHaveBeenCalled();
    expect(window.localStorage.getItem('adminPanel:v1:messages')).toBeNull();
  });

  it('still clears and redirects when logout rejects', async () => {
    mockLogout.mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => useLogout());

    act(() => result.current());

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/'));
    expect(window.localStorage.getItem('adminPanel:v1:messages')).toBeNull();
  });
});
