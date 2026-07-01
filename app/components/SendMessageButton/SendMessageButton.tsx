'use client';

import { useState } from 'react';

import { useMe } from '@/app/components/auth/MeProvider';
import { ContactForm } from '@/app/components/ContactForm/ContactForm';
import { Button } from '@/app/components/ui/Button/Button';
import { CloseButton } from '@/app/components/ui/CloseButton/CloseButton';
import { Modal } from '@/app/components/ui/Modal/Modal';

import styles from './SendMessageButton.module.scss';

/**
 * "Send a message" affordance for the user's own page: a compact button that sits in
 * the collection header's filter-bar area and opens the shared {@link ContactForm} in a
 * modal. The email field is hidden and autofilled from the signed-in principal
 * ({@link useMe}); on success the form shows its own confirmation banner, so the modal
 * stays open until the user dismisses it.
 */
export function SendMessageButton() {
  const me = useMe();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Send a message
      </Button>
      <Modal open={open} onClose={close} variant="overlay" labelledBy="send-message-title">
        <div className={styles.content}>
          <div className={styles.header}>
            <h2 id="send-message-title" className={styles.title}>
              Send a message
            </h2>
            <CloseButton onClick={close} aria-label="Close" />
          </div>
          <ContactForm lockedEmail={me?.email} embedded />
        </div>
      </Modal>
    </>
  );
}
