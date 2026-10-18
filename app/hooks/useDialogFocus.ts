import { type KeyboardEvent, type RefObject, useEffect } from 'react';

import { useBodyScrollLock } from '@/app/hooks/useBodyScrollLock';

/** Elements the focus trap treats as tabbable. */
export const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface DialogFocusOptions {
  /**
   * Where Escape is handled. `'dialog'` (default) uses the returned `onKeyDown` and stops
   * propagation; `'document'` listens on `document` and ignores `isComposing` keydowns, so
   * dismissing an IME candidate list does not tear the dialog down.
   */
  escape?: 'dialog' | 'document';
  /**
   * When true (default), a child that already has focus on open (autoFocus) keeps it and focus is
   * not restored to it on close. When false, the container is always focused on open.
   */
  respectAutoFocus?: boolean;
}

/**
 * Hands focus back when the dialog closes.
 *
 * The element that opened the dialog is preferred, but `.focus()` on a node that has left the
 * document is a silent no-op that leaves focus on `<body>` — one Tab from there restarts the whole
 * page. So when the trigger unmounted while the dialog was open (a row that the dialog's own save
 * removed, a route change that remounts the surface), fall back to the first control in the page
 * header: the same corner of the page the trigger lived in, so the tab order resumes roughly where
 * the user left it.
 *
 * If the document has no header either, there is genuinely nothing to restore to and this does
 * nothing rather than inventing a target.
 */
function restoreFocus(previous: HTMLElement | null) {
  if (previous?.isConnected) {
    previous.focus();
    return;
  }
  document.querySelector('header')?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus();
}

/**
 * Shared dialog behaviour for `Modal` and `MenuDropdown`: focuses the container on open, restores
 * focus on close, traps Tab inside the container, closes on Escape, and locks body scroll through
 * `useBodyScrollLock`.
 *
 * Returns an `onKeyDown` for the dialog element, which owns the Tab trap and, with
 * `escape: 'dialog'`, Escape too.
 */
export function useDialogFocus(
  ref: RefObject<HTMLElement | null>,
  open: boolean,
  onClose: () => void,
  options: DialogFocusOptions = {}
): { onKeyDown: (event: KeyboardEvent<HTMLElement>) => void } {
  const { escape = 'dialog', respectAutoFocus = true } = options;

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open || escape !== 'document') return;

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape' && !event.isComposing) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, escape, onClose]);

  useEffect(() => {
    if (!open) return;

    const node = ref.current;
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const childHasFocus = respectAutoFocus && node?.contains(active);
    const previous = childHasFocus ? null : active;

    if (!childHasFocus) {
      node?.focus();
    }

    return () => {
      restoreFocus(previous);
    };
  }, [open, ref, respectAutoFocus]);

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (escape === 'dialog' && event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }

    if (event.key !== 'Tab') return;

    const node = ref.current;
    if (!node) return;

    const focusable = [...node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)];
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    const active = document.activeElement;

    if (event.shiftKey) {
      if (active === first || active === node || !node.contains(active)) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last || !node.contains(active)) {
      event.preventDefault();
      first.focus();
    }
  };

  return { onKeyDown };
}
