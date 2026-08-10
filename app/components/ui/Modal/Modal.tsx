'use client';

import { type ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useBodyScrollLock } from '@/app/hooks/useBodyScrollLock';

import styles from './Modal.module.scss';

export type ModalVariant = 'overlay' | 'sheet' | 'fullscreen';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  variant?: ModalVariant;
  /** id of the heading inside `children` → wired to aria-labelledby. */
  labelledBy?: string;
  children: ReactNode;
}

/** Elements the focus trap treats as tabbable. */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Hands focus back when the dialog closes.
 *
 * The element that opened the modal is preferred, but `.focus()` on a node that has left the
 * document is a silent no-op that leaves focus on `<body>` — one Tab from there restarts the whole
 * page. So when the trigger unmounted while the modal was open (a row that the modal's own save
 * removed, a route change that remounts the surface), fall back to the first control in the page
 * header: the same corner of the page the trigger lived in, so the tab order resumes roughly where
 * the user left it. Mirrors `MenuDropdown`, which hand-rolls the same dialog semantics.
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
 * Canonical modal. Owns the portal, backdrop, Escape-to-close, focus trap, body scroll lock, and
 * dialog ARIA. Note: portaled to `document.body` (outside any `[data-surface]` scope) — a sentinel
 * rendered at the in-tree position bridges the surface token so dark-admin descendants adapt correctly.
 */
export function Modal({ open, onClose, variant = 'overlay', labelledBy, children }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const sentinelRef = useRef<HTMLSpanElement>(null);
  const [surface, setSurface] = useState<string | null>(null);

  useBodyScrollLock(open);

  useLayoutEffect(() => {
    if (!open) return;
    const scope = sentinelRef.current?.closest<HTMLElement>('[data-surface]');
    setSurface(scope?.dataset.surface ?? null);
  }, [open]);

  const getFocusable = useCallback((): HTMLElement[] => {
    const node = dialogRef.current;
    if (!node) return [];
    return [...node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)];
  }, []);

  useEffect(() => {
    if (!open) return;

    // Store the pre-open trigger; skip if a child already has focus (autoFocus), so
    // we don't restore to an unmounted node on close.
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    previouslyFocusedRef.current = dialogRef.current?.contains(active) ? null : active;

    // Let child autoFocus win; only move focus to the container as a fallback.
    if (!dialogRef.current?.contains(document.activeElement)) {
      dialogRef.current?.focus();
    }

    return () => {
      restoreFocus(previouslyFocusedRef.current);
    };
  }, [open, getFocusable]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }

    if (event.key !== 'Tab') return;

    const focusable = getFocusable();
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    const active = document.activeElement;

    if (event.shiftKey) {
      if (
        active === first ||
        active === dialogRef.current ||
        !dialogRef.current?.contains(active)
      ) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  if (!open || typeof document === 'undefined') return null;

  return (
    <>
      <span ref={sentinelRef} hidden aria-hidden="true" />
      {createPortal(
        <div
          className={`${styles.backdrop} ${styles[variant]}`}
          data-surface={surface ?? undefined}
          onClick={event => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <div
            ref={dialogRef}
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            tabIndex={-1}
            onKeyDown={handleKeyDown}
          >
            {children}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
