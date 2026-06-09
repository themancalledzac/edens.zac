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
 * Canonical modal. Owns the portal, the backdrop scrim, Escape-to-close, a focus
 * trap with focus-return, body scroll lock, and dialog ARIA. Variants change layout
 * only — the dismissal + focus behavior is identical across all three.
 *
 * Surface propagation: the dialog is portaled to `document.body`, which sits OUTSIDE
 * any `[data-surface]` scope wrapper (e.g. the dark admin layout). Custom properties
 * cascade by DOM position, so without help a modal opened from the dark admin surface
 * would render with the light `:root` tokens. We bridge that by reading the nearest
 * `data-surface` from a sentinel rendered at the Modal's *in-tree* position and
 * re-applying it to the portaled backdrop — so every descendant (Button, Field,
 * Dropdown…) adapts via the normal token cascade with zero per-component overrides.
 * Public-site modals have no surface ancestor, so the attribute stays unset and they
 * remain light.
 */
export function Modal({ open, onClose, variant = 'overlay', labelledBy, children }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const sentinelRef = useRef<HTMLSpanElement>(null);
  const [surface, setSurface] = useState<string | null>(null);

  useBodyScrollLock(open);

  // Read the surface from the in-tree mount point (the sentinel inherits the scope
  // the Modal was rendered into) so we can mirror it onto the portaled backdrop.
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

  // On open: record the trigger and move focus to the first focusable child.
  // On close/unmount: return focus to the recorded trigger.
  useEffect(() => {
    if (!open) return;

    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // Focus the dialog container itself, not the first field — auto-focusing an
    // input pops the on-screen keyboard on mobile. Tab still moves into the trap.
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

  return (
    <>
      {/* Sits in the in-tree position so it inherits the surface scope; carries no
          layout or paint. The effect reads its nearest [data-surface] ancestor. */}
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
