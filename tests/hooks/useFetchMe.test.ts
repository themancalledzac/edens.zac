import { act, renderHook, waitFor } from '@testing-library/react';

import { useFetchMe } from '@/app/hooks/useFetchMe';
import * as authApi from '@/app/lib/api/auth';
import { type MeResponse } from '@/app/types/Auth';

jest.mock('@/app/lib/api/auth', () => ({
  AUTH_CHANGED_EVENT: (jest.requireActual('@/app/lib/api/auth') as { AUTH_CHANGED_EVENT: string })
    .AUTH_CHANGED_EVENT,
  me: jest.fn(),
}));

const mockMe = authApi.me as jest.MockedFunction<typeof authApi.me>;

const principal: MeResponse = {
  email: 'a@b.com',
  isAdmin: false,
  mfaSatisfied: true,
  passkeyCount: 0,
  galleries: [],
};

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

    const { result } = renderHook(() => useFetchMe({ enabled: true }));
    expect(result.current.loading).toBe(true);
    expect(result.current.me).toBeNull();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.me).toEqual(principal);
  });

  it('resolves to null when logged out (me() returns null)', async () => {
    mockMe.mockResolvedValue(null);

    const { result } = renderHook(() => useFetchMe({ enabled: true }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.me).toBeNull();
  });

  it('resolves to null when me() throws', async () => {
    mockMe.mockRejectedValue(new Error('network'));

    const { result } = renderHook(() => useFetchMe({ enabled: true }));
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

    const { result } = renderHook(() => useFetchMe({ enabled: true }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.me).toEqual(principal);

    dispatchAuthChanged();

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

    const { result } = renderHook(() => useFetchMe({ enabled: true }));
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

    const { result } = renderHook(() => useFetchMe({ enabled: true }));
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

    const { result, unmount } = renderHook(() => useFetchMe({ enabled: true }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockMe).toHaveBeenCalledTimes(1);

    unmount();
    window.dispatchEvent(new Event(authApi.AUTH_CHANGED_EVENT));

    expect(mockMe).toHaveBeenCalledTimes(1);
  });

  it('makes no request while enabled is false and stays loading', () => {
    const { result } = renderHook(() => useFetchMe({ enabled: false }));

    expect(mockMe).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(true);
    expect(result.current.me).toBeNull();
  });

  it('makes no request with no options at all', () => {
    renderHook(() => useFetchMe());

    expect(mockMe).not.toHaveBeenCalled();
  });

  it('makes exactly one request once enabled flips to true, however often it rerenders', async () => {
    mockMe.mockResolvedValue(principal);

    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useFetchMe({ enabled }),
      { initialProps: { enabled: false } }
    );
    expect(mockMe).not.toHaveBeenCalled();

    rerender({ enabled: true });
    await waitFor(() => expect(result.current.loading).toBe(false));
    rerender({ enabled: true });
    rerender({ enabled: true });

    expect(mockMe).toHaveBeenCalledTimes(1);
    expect(result.current.me).toEqual(principal);
  });

  it('starts from initialMe with loading false and no request on mount', () => {
    const { result } = renderHook(() => useFetchMe({ initialMe: principal, enabled: true }));

    expect(result.current.me).toEqual(principal);
    expect(result.current.loading).toBe(false);
    expect(mockMe).not.toHaveBeenCalled();
  });

  it('treats initialMe null as a resolved anonymous viewer, not as unresolved', () => {
    const { result } = renderHook(() => useFetchMe({ initialMe: null, enabled: true }));

    expect(result.current.me).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(mockMe).not.toHaveBeenCalled();
  });

  it('follows initialMe when it changes', () => {
    const { result, rerender } = renderHook(
      ({ initialMe }: { initialMe: MeResponse | null }) => useFetchMe({ initialMe }),
      { initialProps: { initialMe: null as MeResponse | null } }
    );
    expect(result.current.me).toBeNull();

    rerender({ initialMe: principal });
    expect(result.current.me).toEqual(principal);

    rerender({ initialMe: null });
    expect(result.current.me).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(mockMe).not.toHaveBeenCalled();
  });

  it('refetches on auth-changed even when seeded with initialMe', async () => {
    mockMe.mockResolvedValue(null);

    const { result } = renderHook(() => useFetchMe({ initialMe: principal }));
    expect(mockMe).not.toHaveBeenCalled();

    dispatchAuthChanged();
    expect(mockMe).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current.me).toBeNull());
    expect(result.current.loading).toBe(false);
  });

  it('applies only the newest response when seeded with initialMe', async () => {
    let resolveFirst!: (value: MeResponse | null) => void;
    let resolveSecond!: (value: MeResponse | null) => void;
    mockMe
      .mockImplementationOnce(
        () =>
          new Promise<MeResponse | null>(resolve => {
            resolveFirst = resolve;
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise<MeResponse | null>(resolve => {
            resolveSecond = resolve;
          })
      );

    const { result } = renderHook(() => useFetchMe({ initialMe: null }));
    dispatchAuthChanged();
    dispatchAuthChanged();

    await act(async () => {
      resolveSecond(principal);
    });
    await act(async () => {
      resolveFirst(null);
    });
    expect(result.current.me).toEqual(principal);
  });

  it('refetches on auth-changed while lazy and not yet enabled', async () => {
    mockMe.mockResolvedValue(principal);

    const { result } = renderHook(() => useFetchMe({ enabled: false }));
    dispatchAuthChanged();

    await waitFor(() => expect(result.current.me).toEqual(principal));
    expect(mockMe).toHaveBeenCalledTimes(1);
  });

  it('twin: the auth-changed refetch does not happen when the event name no longer matches', () => {
    mockMe.mockResolvedValue(principal);
    const realName = authApi.AUTH_CHANGED_EVENT;
    jest.replaceProperty(
      jest.requireMock<{ AUTH_CHANGED_EVENT: string }>('@/app/lib/api/auth'),
      'AUTH_CHANGED_EVENT',
      'something-else'
    );
    const { result } = renderHook(() => useFetchMe({ initialMe: null }));

    act(() => {
      window.dispatchEvent(new Event(realName));
    });

    expect(mockMe).not.toHaveBeenCalled();
    expect(result.current.me).toBeNull();
    jest.restoreAllMocks();
  });
});
