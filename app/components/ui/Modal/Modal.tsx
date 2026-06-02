'use client';

import { type ReactNode, useCallback, useEffect, useRef } from 'react';
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
 * Canonical modal. Owns the portal, the backdrop scrim, Escape-to-close, a focus
 * trap with focus-return, body scroll lock, and dialog ARIA. Variants change layout
 * only — the dismissal + focus behavior is identical across all three.
 */
export function Modal({ open, onClose, variant = 'overlay', labelledBy, children }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useBodyScrollLock(open);

  const getFocusable = useCallback((): HTMLElement[] => {
    const node = dialogRef.current;
    if (!node) return [];
    return [...node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)];
  }, []);

  // On open: record the trigger and move focus to the first focusable child.
  // On close/unmount: return focus to the recorded trigger.
  useEffect(() => {
    if (!open) return;

    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusable = getFocusable();
    (focusable[0] ?? dialogRef.current)?.focus();

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
      if (active === first || !dialogRef.current?.contains(active)) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={`${styles.backdrop} ${styles[variant]}`}
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
  );
}
