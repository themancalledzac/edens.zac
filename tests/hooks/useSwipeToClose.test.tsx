import { renderHook } from '@testing-library/react';
import { type PointerEvent } from 'react';

import { SWIPE_CLOSE_DISTANCE, useSwipeToClose } from '@/app/hooks/useSwipeToClose';

function setup(enabled = true) {
  const sheet = document.createElement('div');
  const scroller = document.createElement('div');
  sheet.append(scroller);
  const onClose = jest.fn();
  const { result } = renderHook(() => useSwipeToClose({ current: sheet }, { enabled, onClose }));

  const event = (
    target: Element,
    clientY: number,
    pointerType = 'touch'
  ): PointerEvent<HTMLElement> =>
    ({
      target,
      currentTarget: sheet,
      clientY,
      pointerId: 1,
      pointerType,
    }) as unknown as PointerEvent<HTMLElement>;

  const swipe = (target: Element, to: number, elapsedMs: number) => {
    jest.setSystemTime(0);
    result.current.onPointerDown(event(target, 0));
    result.current.onPointerMove(event(target, to));
    jest.setSystemTime(elapsedMs);
    result.current.onPointerUp(event(target, to));
  };

  return { sheet, scroller, onClose, result, swipe, event };
}

describe('useSwipeToClose', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('closes when released past the distance threshold', () => {
    const { sheet, scroller, onClose, swipe } = setup();

    swipe(scroller, SWIPE_CLOSE_DISTANCE + 20, 1000);

    expect(sheet.style.transform).toBe(`translateY(${SWIPE_CLOSE_DISTANCE + 20}px)`);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('snaps back when a slow drag stops short of the threshold', () => {
    const { sheet, scroller, onClose, swipe } = setup();

    swipe(scroller, SWIPE_CLOSE_DISTANCE - 30, 1000);

    expect(onClose).not.toHaveBeenCalled();
    expect(sheet.style.transform).toBe('');
    expect(sheet.style.transition).toBe('');
  });

  it('closes on a short fast flick', () => {
    const { scroller, onClose, swipe } = setup();

    swipe(scroller, 40, 50);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('follows the finger while dragging with no transition', () => {
    const { sheet, scroller, result, event } = setup();

    result.current.onPointerDown(event(scroller, 0));
    result.current.onPointerMove(event(scroller, 30));

    expect(sheet.style.transform).toBe('translateY(30px)');
    expect(sheet.style.transition).toBe('none');
  });

  it('ignores a drag that starts inside a scrolled-down element', () => {
    const { sheet, scroller, onClose, swipe } = setup();
    scroller.scrollTop = 40;

    swipe(scroller, 200, 100);

    expect(onClose).not.toHaveBeenCalled();
    expect(sheet.style.transform).toBe('');
  });

  it('ignores mouse pointers', () => {
    const { scroller, onClose, result, event } = setup();

    result.current.onPointerDown(event(scroller, 0, 'mouse'));
    result.current.onPointerMove(event(scroller, 200, 'mouse'));
    result.current.onPointerUp(event(scroller, 200, 'mouse'));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('ignores everything while disabled', () => {
    const { scroller, onClose, swipe } = setup(false);

    swipe(scroller, 200, 100);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not close on a tap with no movement', () => {
    const { scroller, onClose, result, event } = setup();

    result.current.onPointerDown(event(scroller, 0));
    result.current.onPointerUp(event(scroller, 0));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('snaps back when the browser cancels the pointer', () => {
    const { sheet, scroller, onClose, result, event } = setup();

    result.current.onPointerDown(event(scroller, 0));
    result.current.onPointerMove(event(scroller, 60));
    result.current.onPointerCancel();

    expect(sheet.style.transform).toBe('');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('never moves the sheet upward', () => {
    const { sheet, scroller, result, event } = setup();

    result.current.onPointerDown(event(scroller, 100));
    result.current.onPointerMove(event(scroller, 120));
    result.current.onPointerMove(event(scroller, 90));

    expect(sheet.style.transform).toBe('translateY(0px)');
  });
});
