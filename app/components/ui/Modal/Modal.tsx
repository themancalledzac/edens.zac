'use client';

import { type ReactNode, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useDialogFocus } from '@/app/hooks/useDialogFocus';

import styles from './Modal.module.scss';

export type ModalVariant = 'overlay' | 'sheet' | 'fullscreen' | 'sheet-bottom';

/** Variant → CSS module class key, for variants whose name is not a valid class key. */
const VARIANT_CLASS: Record<ModalVariant, string> = {
  overlay: 'overlay',
  sheet: 'sheet',
  fullscreen: 'fullscreen',
  'sheet-bottom': 'sheetBottom',
};

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  variant?: ModalVariant;
  /** id of the heading inside `children` → wired to aria-labelledby. */
  labelledBy?: string;
  children: ReactNode;
}

/**
 * Canonical modal. Owns the portal, backdrop, Escape-to-close, focus trap, body scroll lock, and
 * dialog ARIA. Note: portaled to `document.body` (outside any `[data-surface]` scope) — a sentinel
 * rendered at the in-tree position bridges the surface token so dark-admin descendants adapt correctly.
 */
export function Modal({ open, onClose, variant = 'overlay', labelledBy, children }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLSpanElement>(null);
  const [surface, setSurface] = useState<string | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const scope = sentinelRef.current?.closest<HTMLElement>('[data-surface]');
    setSurface(scope?.dataset.surface ?? null);
  }, [open]);

  const { onKeyDown } = useDialogFocus(dialogRef, open, onClose);

  if (!open || typeof document === 'undefined') return null;

  return (
    <>
      <span ref={sentinelRef} hidden aria-hidden="true" />
      {createPortal(
        <div
          className={`${styles.backdrop} ${styles[VARIANT_CLASS[variant]]}`}
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
            onKeyDown={onKeyDown}
          >
            {children}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
