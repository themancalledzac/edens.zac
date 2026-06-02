'use client';

import { type FormEvent, useState } from 'react';

import { Button } from '@/app/components/ui/Button/Button';
import { Field } from '@/app/components/ui/Field/Field';
import { Input } from '@/app/components/ui/Field/Input';
import { Textarea } from '@/app/components/ui/Field/Textarea';
import { type ContactResult, submitContactMessage } from '@/app/utils/contactApi';

import styles from './ContactForm.module.scss';

type Status = 'idle' | 'submitting' | 'success' | 'error';

interface ContactFormProps {
  onSubmit: () => void;
}

export function ContactForm({ onSubmit }: ContactFormProps) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorResult, setErrorResult] = useState<Extract<ContactResult, { ok: false }> | null>(
    null
  );

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorResult(null);

    const result = await submitContactMessage({ email, message });

    if (result.ok) {
      setEmail('');
      setMessage('');
      setStatus('success');
      onSubmit();
    } else {
      setStatus('error');
      setErrorResult(result);
    }
  };

  return (
    <div className={styles.contactFormContainer}>
      <div className={styles.formWrapper}>
        <div className={styles.statusRegion} role="status" aria-live="polite">
          {status === 'success' && (
            <div className={`${styles.statusBanner} ${styles.statusBannerSuccess}`}>
              Message sent!
            </div>
          )}
          {status === 'error' && errorResult && (
            <div className={`${styles.statusBanner} ${styles.statusBannerError}`}>
              {errorResult.message}
            </div>
          )}
        </div>
        <form aria-label="contact form" className={styles.contactForm} onSubmit={handleSubmit}>
          <Field label="Email" htmlFor="contact-email">
            <Input
              id="contact-email"
              type="email"
              name="email"
              placeholder="Your email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              maxLength={320}
              required
            />
          </Field>
          <Field label="Message" htmlFor="contact-message" className={styles.messageField}>
            <Textarea
              id="contact-message"
              name="message"
              placeholder="Your message"
              className={styles.messageTextarea}
              value={message}
              onChange={e => setMessage(e.target.value)}
              maxLength={5000}
              required
            />
          </Field>
          <small
            className={`${styles.charCounter} ${message.length > 4500 ? styles.charCounterWarn : ''}`}
          >
            {message.length} / 5000
          </small>
          <Button
            type="submit"
            variant="primary"
            loading={status === 'submitting'}
            disabled={message.length === 0 || message.length > 5000}
          >
            {status === 'submitting' ? 'Sending...' : 'Send'}
          </Button>
        </form>
      </div>
    </div>
  );
}
