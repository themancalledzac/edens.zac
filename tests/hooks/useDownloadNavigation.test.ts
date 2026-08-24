/**
 * Tests for useDownloadNavigation — the "navigate to a download URL, then reset the control after
 * 4s" flow shared by ClientGalleryDownload and FullScreenDownloadButton.
 *
 * The timer is the risky half of this hook, so the cases that matter are the ones the two old
 * hand-rolled copies each had to get right:
 *  - the pending timer is cleared on unmount, so a control that disappears mid-download never
 *    resets against a torn-down tree;
 *  - the reset invokes the LATEST onReset rather than the one captured when the download started,
 *    so a caller passing an inline arrow over changing props cannot reset stale state;
 *  - startDownload keeps a stable identity, so callers can list it in a dependency array;
 *  - a second download restarts the timer instead of being cut short by the first one's.
 */

import { act, renderHook } from '@testing-library/react';

import { useDownloadNavigation } from '@/app/hooks/useDownloadNavigation';

const RESET_DELAY_MS = 4000;

describe('useDownloadNavigation', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    jest.useFakeTimers();
    // jsdom's location.href is not assignable; swap in a plain object we can read back.
    delete (window as unknown as { location?: Location }).location;
    (window as unknown as { location: { href: string } }).location = { href: '' };
  });

  afterEach(() => {
    jest.useRealTimers();
    (window as unknown as { location: Location }).location = originalLocation;
  });

  it('is idle before anything is downloaded', () => {
    const { result } = renderHook(() => useDownloadNavigation(jest.fn()));

    expect(result.current.preparing).toBeNull();
    expect(window.location.href).toBe('');
  });

  it('navigates to the URL and marks the format in flight', () => {
    const { result } = renderHook(() => useDownloadNavigation(jest.fn()));

    act(() => result.current.startDownload('/api/download/42?format=web', 'web'));

    expect(window.location.href).toBe('/api/download/42?format=web');
    expect(result.current.preparing).toBe('web');
  });

  it('stays in flight until the delay elapses', () => {
    const onReset = jest.fn();
    const { result } = renderHook(() => useDownloadNavigation(onReset));

    act(() => result.current.startDownload('/dl', 'original'));
    act(() => {
      jest.advanceTimersByTime(RESET_DELAY_MS - 1);
    });

    expect(result.current.preparing).toBe('original');
    expect(onReset).not.toHaveBeenCalled();
  });

  it('clears the in-flight format and calls onReset once the delay elapses', () => {
    const onReset = jest.fn();
    const { result } = renderHook(() => useDownloadNavigation(onReset));

    act(() => result.current.startDownload('/dl', 'original'));
    act(() => {
      jest.advanceTimersByTime(RESET_DELAY_MS);
    });

    expect(result.current.preparing).toBeNull();
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('clears the pending timer on unmount, so a control torn down mid-download never resets', () => {
    const onReset = jest.fn();
    const { result, unmount } = renderHook(() => useDownloadNavigation(onReset));

    act(() => result.current.startDownload('/dl', 'web'));
    unmount();

    act(() => {
      jest.advanceTimersByTime(RESET_DELAY_MS * 2);
    });

    expect(onReset).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('invokes the latest onReset, not the one captured when the download started', () => {
    const firstReset = jest.fn();
    const laterReset = jest.fn();
    const { result, rerender } = renderHook(({ onReset }) => useDownloadNavigation(onReset), {
      initialProps: { onReset: firstReset },
    });

    act(() => result.current.startDownload('/dl', 'web'));
    rerender({ onReset: laterReset });
    act(() => {
      jest.advanceTimersByTime(RESET_DELAY_MS);
    });

    expect(firstReset).not.toHaveBeenCalled();
    expect(laterReset).toHaveBeenCalledTimes(1);
  });

  it('keeps startDownload referentially stable across renders', () => {
    const firstReset: () => void = jest.fn();
    const laterReset: () => void = jest.fn();
    const { result, rerender } = renderHook(({ onReset }) => useDownloadNavigation(onReset), {
      initialProps: { onReset: firstReset },
    });
    const first = result.current.startDownload;

    rerender({ onReset: laterReset });
    act(() => result.current.startDownload('/dl', 'web'));

    expect(result.current.startDownload).toBe(first);
  });

  it('restarts the timer on a second download instead of resetting on the first schedule', () => {
    const onReset = jest.fn();
    const { result } = renderHook(() => useDownloadNavigation(onReset));

    act(() => result.current.startDownload('/dl/web', 'web'));
    act(() => {
      jest.advanceTimersByTime(RESET_DELAY_MS - 500);
    });
    act(() => result.current.startDownload('/dl/original', 'original'));

    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(onReset).not.toHaveBeenCalled();
    expect(result.current.preparing).toBe('original');

    act(() => {
      jest.advanceTimersByTime(RESET_DELAY_MS - 500);
    });
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(result.current.preparing).toBeNull();
  });
});
