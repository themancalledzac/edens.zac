'use client';

import { useId, useState } from 'react';

import { useMe } from '@/app/components/auth/MeProvider';
import { ContactForm } from '@/app/components/ContactForm/ContactForm';
import { CloseButton } from '@/app/components/ui/CloseButton/CloseButton';
import { FilterChip } from '@/app/components/ui/FilterChip/FilterChip';
import { Modal } from '@/app/components/ui/Modal/Modal';

import styles from './ContactChip.module.scss';

interface ContactModalProps {
  open: boolean;
  onClose: () => void;
  /** Email the form is locked to; the field is hidden while it is set. */
  lockedEmail?: string;
}

/**
 * The contact dialog: the shared {@link ContactForm} in an overlay `Modal` with the email field
 * hidden and filled from `lockedEmail`. The form shows its own confirmation, so the dialog stays
 * open until dismissed. Shared by {@link ContactChip} and the site menu's Contact row.
 */
export function ContactModal({ open, onClose, lockedEmail }: ContactModalProps) {
  const titleId = useId();

  return (
    <Modal open={open} onClose={onClose} variant="overlay" labelledBy={titleId}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            Contact the Photographer
          </h2>
          <CloseButton onClick={onClose} aria-label="Close" />
        </div>
        <ContactForm lockedEmail={lockedEmail} embedded />
      </div>
    </Modal>
  );
}

/**
 * Contact chip for the owner's own space: opens {@link ContactModal} with the email taken from the
 * signed-in principal.
 */
export function ContactChip() {
  const me = useMe();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <FilterChip
        label="Contact"
        onToggle={() => setOpen(true)}
        ariaHasPopup="dialog"
        ariaExpanded={open}
      />
      <ContactModal open={open} onClose={close} lockedEmail={me?.email} />
    </>
  );
}
