import { render } from '@testing-library/react';

import { useBodyScrollLock } from '@/app/hooks/useBodyScrollLock';

/**
 * Regression coverage for the scroll-restore footgun exposed by the <Modal> migration.
 *
 * The hook ref-counts lockers at module level so multiple concurrent callers are safe, but it must
 * also capture/restore the scroll offset at module level. The pre-fix version stored the offset in a
 * per-instance useRef: with two concurrent lockers (Modal + a feature hook), only the first locker
 * captured the real offset and whichever cleanup drove the count to zero restored ITS ref — often 0,
 * scrolling the page to the top on close. These tests pin the correct behavior for one, two, and
 * nested lockers.
 */

function Locker() {
  useBodyScrollLock(true);
  return null;
}

/** Mount 0–2 independent lockers so each can be toggled on its own lifecycle. */
function Lockers({ a, b }: { a: boolean; b: boolean }) {
  return (
    <>
      {a && <Locker />}
      {b && <Locker />}
    </>
  );
}

function setScrollY(value: number) {
  Object.defineProperty(window, 'scrollY', { value, configurable: true, writable: true });
}

describe('useBodyScrollLock', () => {
  let scrollTo: jest.SpyInstance;

  beforeEach(() => {
    scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
    setScrollY(0);
    document.body.classList.remove('scroll-locked');
    document.body.style.top = '';
  });

  afterEach(() => {
    scrollTo.mockRestore();
  });

  it('locks the body and pins the captured offset while open, then restores on close', () => {
    setScrollY(420);

    const { rerender } = render(<Lockers a b={false} />);

    expect(document.body.classList.contains('scroll-locked')).toBe(true);
    expect(document.body.style.top).toBe('-420px');

    rerender(<Lockers a={false} b={false} />);

    expect(document.body.classList.contains('scroll-locked')).toBe(false);
    expect(document.body.style.top).toBe('');
    expect(scrollTo).toHaveBeenCalledWith(0, 420);
  });

  it('restores the original offset when a SECOND locker outlives the first (the migration bug)', () => {
    setScrollY(500);

    // First locker mounts and captures 500.
    const { rerender } = render(<Lockers a b={false} />);
    // The browser pins window.scrollY to 0 while the body is position:fixed.
    setScrollY(0);
    // Second locker mounts on top (this is Modal + useFullScreenImage in production).
    rerender(<Lockers a b />);
    // First locker unmounts — count is still > 0, nothing restored yet.
    rerender(<Lockers a={false} b />);
    // Second locker unmounts — count hits 0 and the offset must be the original 500, not 0.
    rerender(<Lockers a={false} b={false} />);

    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith(0, 500);
  });

  it('keeps the first locker’s offset across nested open/close (does not re-capture mid-lock)', () => {
    setScrollY(800);

    const { rerender } = render(<Lockers a b={false} />); // capture 800
    setScrollY(0);
    rerender(<Lockers a b />); // nested locker — must NOT overwrite the captured 800
    rerender(<Lockers a b={false} />); // nested locker closes first, still locked
    expect(document.body.classList.contains('scroll-locked')).toBe(true);

    rerender(<Lockers a={false} b={false} />); // last locker closes → restore 800
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith(0, 800);
  });
});
