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

    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    dialogRef.current?.focus();

    return () => {
      previouslyFocusedRef.current?.focus();
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
