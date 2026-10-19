import { type PointerEvent, type RefObject, useRef } from 'react';

export const SWIPE_CLOSE_DISTANCE = 80;
export const SWIPE_CLOSE_FLICK_DISTANCE = 24;
export const SWIPE_CLOSE_FLICK_VELOCITY = 0.6;
const DRAG_START_DISTANCE = 8;

interface DragState {
  pointerId: number;
  startY: number;
  startTime: number;
  dragging: boolean;
}

function isScrolledDown(target: EventTarget, boundary: Element): boolean {
  let node = target instanceof Element ? target : null;
  while (node) {
    if (node.scrollTop > 0) return true;
    if (node === boundary) return false;
    node = node.parentElement;
  }
  return false;
}

/**
 * Swipe-down-to-close for a bottom sheet, driven by pointer events on the sheet element.
 *
 * Touch and pen only. A drag starts only when no element between the touch target and the sheet
 * is scrolled down, so a scrolled list keeps scrolling. The sheet follows the finger through an
 * inline `transform`. Releasing past `SWIPE_CLOSE_DISTANCE`, or after a quick flick, calls
 * `onClose`; anything shorter clears the transform so the CSS transition snaps it back. Pointer
 * capture is taken only once the drag begins, so plain taps still reach links and buttons.
 *
 * Spread the returned handlers onto the sheet element. The sheet needs `touch-action: none`
 * (or `pan-y` on its scroller) or the browser cancels the pointer when it starts to pan.
 */
export function useSwipeToClose(
  ref: RefObject<HTMLElement | null>,
  { enabled, onClose }: { enabled: boolean; onClose: () => void }
) {
  const drag = useRef<DragState | null>(null);

  const reset = () => {
    const el = ref.current;
    if (el) {
      el.style.transition = '';
      el.style.transform = '';
    }
    drag.current = null;
  };

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (!enabled || event.pointerType === 'mouse' || drag.current) return;
    if (isScrolledDown(event.target, event.currentTarget)) return;
    drag.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startTime: Date.now(),
      dragging: false,
    };
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    const delta = event.clientY - state.startY;
    if (!state.dragging) {
      if (delta < -DRAG_START_DISTANCE) {
        drag.current = null;
        return;
      }
      if (delta < DRAG_START_DISTANCE) return;
      state.dragging = true;
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
    const el = ref.current;
    if (el) {
      el.style.transition = 'none';
      el.style.transform = `translateY(${Math.max(0, delta)}px)`;
    }
  };

  const onPointerUp = (event: PointerEvent<HTMLElement>) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    if (!state.dragging) {
      drag.current = null;
      return;
    }
    const delta = event.clientY - state.startY;
    const elapsed = Math.max(1, Date.now() - state.startTime);
    const isFlick =
      delta >= SWIPE_CLOSE_FLICK_DISTANCE && delta / elapsed >= SWIPE_CLOSE_FLICK_VELOCITY;
    if (delta >= SWIPE_CLOSE_DISTANCE || isFlick) {
      drag.current = null;
      onClose();
      return;
    }
    reset();
  };

  const onPointerCancel = () => {
    if (drag.current) reset();
  };

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel };
}
