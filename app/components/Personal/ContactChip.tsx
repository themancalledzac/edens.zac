'use client';

import { useState } from 'react';

import { useMe } from '@/app/components/auth/MeProvider';
import { ContactForm } from '@/app/components/ContactForm/ContactForm';
import { CloseButton } from '@/app/components/ui/CloseButton/CloseButton';
import { FilterChip } from '@/app/components/ui/FilterChip/FilterChip';
import { Modal } from '@/app/components/ui/Modal/Modal';

import styles from './ContactChip.module.scss';

/**
 * Contact chip for the owner's own space: opens the shared {@link ContactForm} in a dialog with the
 * email field hidden and filled from the signed-in principal. The form shows its own confirmation,
 * so the dialog stays open until dismissed.
 */
export function ContactChip() {
  const me = useMe();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <FilterChip label="Contact" onToggle={() => setOpen(true)} ariaHasPopup="dialog" />
      <Modal open={open} onClose={close} variant="overlay" labelledBy="contact-title">
        <div className={styles.content}>
          <div className={styles.header}>
            <h2 id="contact-title" className={styles.title}>
              Contact the Photographer
            </h2>
            <CloseButton onClick={close} aria-label="Close" />
          </div>
          <ContactForm lockedEmail={me?.email} embedded />
        </div>
      </Modal>
    </>
  );
}
