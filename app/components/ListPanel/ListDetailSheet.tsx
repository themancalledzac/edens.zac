'use client';

import { type ReactNode, useId } from 'react';

import { Modal } from '@/app/components/ui/Modal/Modal';

import styles from './ListDetailSheet.module.scss';

interface ListDetailSheetProps {
  open: boolean;
  onClose: () => void;
  /** Names the dialog and heads the sheet. */
  title: string;
  children: ReactNode;
  /** Pinned under the body: the sheet's primary and secondary actions. */
  footer?: ReactNode;
}

/**
 * The detail sheet every admin tab opens from a {@link ListRow}: a bottom-anchored Modal with a
 * title, a close button, the tab's own content and an optional footer. The Modal owns the portal,
 * Escape, focus trap and scroll lock, so a tab supplies only what the sheet shows.
 */
export function ListDetailSheet({ open, onClose, title, children, footer }: ListDetailSheetProps) {
  const titleId = useId();

  return (
    <Modal open={open} onClose={onClose} variant="sheet-bottom" labelledBy={titleId}>
      <div className={styles.sheet}>
        <header className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className={styles.content}>{children}</div>
        {footer && <footer className={styles.footer}>{footer}</footer>}
      </div>
    </Modal>
  );
}
