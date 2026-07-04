import { act, renderHook, waitFor } from '@testing-library/react';

import { useFetchMe } from '@/app/hooks/useFetchMe';
import * as authApi from '@/app/lib/api/auth';
import { type MeResponse } from '@/app/types/Auth';

// The real AUTH_CHANGED_EVENT constant is passed through so the hook listens on the
// exact event name production dispatches (also pinned in tests/lib/api/auth.test.ts).
jest.mock('@/app/lib/api/auth', () => ({
  AUTH_CHANGED_EVENT: (jest.requireActual('@/app/lib/api/auth') as { AUTH_CHANGED_EVENT: string })
    .AUTH_CHANGED_EVENT,
  me: jest.fn(),
}));

const mockMe = authApi.me as jest.MockedFunction<typeof authApi.me>;

const principal: MeResponse = { email: 'a@b.com', mfaSatisfied: true, galleries: [] };

function dispatchAuthChanged() {
  act(() => {
    window.dispatchEvent(new Event(authApi.AUTH_CHANGED_EVENT));
  });
}

describe('useFetchMe', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts loading, then resolves the principal', async () => {
    mockMe.mockResolvedValue(principal);

    const { result } = renderHook(() => useFetchMe());
    expect(result.current.loading).toBe(true);
    expect(result.current.me).toBeNull();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.me).toEqual(principal);
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

  it('refetches on auth-changed without flipping loading back to true', async () => {
    let resolveRefetch!: (value: MeResponse | null) => void;
    mockMe.mockResolvedValueOnce(principal).mockImplementationOnce(
      () =>
        new Promise<MeResponse | null>(resolve => {
          resolveRefetch = resolve;
        })
    );

    const { result } = renderHook(() => useFetchMe());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.me).toEqual(principal);

    dispatchAuthChanged();

    // Refetch in flight: the previous principal stays visible, no loading flash.
    expect(mockMe).toHaveBeenCalledTimes(2);
    expect(result.current.loading).toBe(false);
    expect(result.current.me).toEqual(principal);

    await act(async () => {
      resolveRefetch(null);
    });
    expect(result.current.me).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('never lets a stale refetch response overwrite a newer one', async () => {
    let resolveFirstRefetch!: (value: MeResponse | null) => void;
    let resolveSecondRefetch!: (value: MeResponse | null) => void;
    mockMe
      .mockResolvedValueOnce(principal)
      .mockImplementationOnce(
        () =>
          new Promise<MeResponse | null>(resolve => {
            resolveFirstRefetch = resolve;
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise<MeResponse | null>(resolve => {
            resolveSecondRefetch = resolve;
          })
      );

    const { result } = renderHook(() => useFetchMe());
    await waitFor(() => expect(result.current.me).toEqual(principal));

    dispatchAuthChanged(); // e.g. logout
    dispatchAuthChanged(); // e.g. immediate re-login

    // The newer request resolves first; the stale one lands late and must lose.
    await act(async () => {
      resolveSecondRefetch(principal);
    });
    await act(async () => {
      resolveFirstRefetch(null);
    });
    expect(result.current.me).toEqual(principal);
  });

  it('lets a refetch supersede a still-pending mount fetch', async () => {
    let resolveMount!: (value: MeResponse | null) => void;
    let resolveRefetch!: (value: MeResponse | null) => void;
    mockMe
      .mockImplementationOnce(
        () =>
          new Promise<MeResponse | null>(resolve => {
            resolveMount = resolve;
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise<MeResponse | null>(resolve => {
            resolveRefetch = resolve;
          })
      );

    const { result } = renderHook(() => useFetchMe());
    expect(result.current.loading).toBe(true);

    dispatchAuthChanged(); // mount fetch still in flight

    // Nothing has settled as the newest request yet — still the initial load.
    expect(mockMe).toHaveBeenCalledTimes(2);
    expect(result.current.loading).toBe(true);

    // The refetch (newest) settles: loading converges exactly here.
    await act(async () => {
      resolveRefetch(principal);
    });
    expect(result.current.me).toEqual(principal);
    expect(result.current.loading).toBe(false);

    // The stale mount response lands late and must not apply.
    await act(async () => {
      resolveMount(null);
    });
    expect(result.current.me).toEqual(principal);
    expect(result.current.loading).toBe(false);
  });

  it('removes the auth-changed listener on unmount', async () => {
    mockMe.mockResolvedValue(null);

    const { result, unmount } = renderHook(() => useFetchMe());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockMe).toHaveBeenCalledTimes(1);

    unmount();
    window.dispatchEvent(new Event(authApi.AUTH_CHANGED_EVENT));

    expect(mockMe).toHaveBeenCalledTimes(1);
  });
});
