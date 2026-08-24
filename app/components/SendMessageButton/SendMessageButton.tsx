'use client';

import { useState } from 'react';

import { useMe } from '@/app/components/auth/MeProvider';
import { ContactForm } from '@/app/components/ContactForm/ContactForm';
import { Button } from '@/app/components/ui/Button/Button';
import { CloseButton } from '@/app/components/ui/CloseButton/CloseButton';
import { Modal } from '@/app/components/ui/Modal/Modal';

import styles from './SendMessageButton.module.scss';

/**
 * "Contact the photographer" affordance for the user's own page: a button in the collection header
 * rail, alongside the Account, Share and Admin cards, that opens the shared {@link ContactForm} in
 * a modal. The email field is hidden and autofilled from the signed-in principal ({@link useMe});
 * on success the form shows its own confirmation banner, so the modal stays open until the user
 * dismisses it.
 *
 * The label names the recipient. "Send a message" did not, and on the viewer's own page that left
 * the destination genuinely ambiguous — the page is full of the viewer's own things, so a message
 * could plausibly have been to themselves.
 *
 * `outline`, matching the Share and Account cards' buttons, rather than the `ghost` this used to
 * be. It is an ordinary action offered at ordinary weight; the rail is where it belongs and the
 * label is what carries it, not a filled box.
 */
export function SendMessageButton() {
  const me = useMe();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={styles.trigger}
        onClick={() => setOpen(true)}
      >
        Contact the photographer
      </Button>
      <Modal open={open} onClose={close} variant="overlay" labelledBy="send-message-title">
        <div className={styles.content}>
          <div className={styles.header}>
            <h2 id="send-message-title" className={styles.title}>
              Contact the photographer
            </h2>
            <CloseButton onClick={close} aria-label="Close" />
          </div>
          <ContactForm lockedEmail={me?.email} embedded />
        </div>
      </Modal>
    </>
  );
}
