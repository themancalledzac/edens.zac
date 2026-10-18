import { act, renderHook } from '@testing-library/react';

import { useThrottle } from '@/app/hooks/useThrottle';

describe('useThrottle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(1_000_000);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('fires immediately on the first call', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useThrottle(callback, 100));

    result.current('a');

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('a');
  });

  it('throttles calls inside the window and fires one trailing call with the last args', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useThrottle(callback, 100));

    result.current('a');
    jest.advanceTimersByTime(20);
    result.current('b');
    jest.advanceTimersByTime(20);
    result.current('c');

    expect(callback).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(59);
    expect(callback).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenLastCalledWith('c');
  });

  it('fires leading again once the interval has elapsed', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useThrottle(callback, 100));

    result.current('a');
    jest.advanceTimersByTime(100);
    result.current('b');

    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenLastCalledWith('b');
  });

  it('does not fire a trailing call after a leading call with no further calls', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useThrottle(callback, 100));

    result.current('a');
    jest.advanceTimersByTime(500);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('measures the window from the trailing call, not the original leading call', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useThrottle(callback, 100));

    result.current('a');
    jest.advanceTimersByTime(50);
    result.current('b');
    jest.advanceTimersByTime(60);
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenLastCalledWith('b');

    result.current('c');
    expect(callback).toHaveBeenCalledTimes(2);

    jest.advanceTimersByTime(90);
    expect(callback).toHaveBeenCalledTimes(3);
    expect(callback).toHaveBeenLastCalledWith('c');
  });

  it('keeps a stable reference across rerenders with the same interval', () => {
    const { result, rerender } = renderHook(({ cb }: { cb: () => void }) => useThrottle(cb, 100), {
      initialProps: { cb: jest.fn() },
    });
    const first = result.current;

    rerender({ cb: jest.fn() });

    expect(result.current).toBe(first);
  });

  it('returns a new reference when the interval changes', () => {
    const callback = jest.fn();
    const { result, rerender } = renderHook(({ ms }) => useThrottle(callback, ms), {
      initialProps: { ms: 100 },
    });
    const first = result.current;

    rerender({ ms: 200 });

    expect(result.current).not.toBe(first);
  });

  it('invokes the latest callback after a rerender', () => {
    const first = jest.fn();
    const second = jest.fn();
    const { result, rerender } = renderHook(({ cb }: { cb: () => void }) => useThrottle(cb, 100), {
      initialProps: { cb: first },
    });

    rerender({ cb: second });
    result.current();

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('clears the pending trailing call on unmount', () => {
    const callback = jest.fn();
    const { result, unmount } = renderHook(() => useThrottle(callback, 100));

    result.current('a');
    result.current('b');
    unmount();
    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });
});
