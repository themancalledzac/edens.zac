'use client';

import { type FormEvent, useState } from 'react';

import { type ContactResult, submitContactMessage } from '@/app/utils/contactApi';

import styles from './ContactForm.module.scss';

type Status = 'idle' | 'submitting' | 'success' | 'error';

interface ContactFormProps {
  onBack: () => void;
  onSubmit: () => void;
}

export function ContactForm({ onBack: _onBack, onSubmit }: ContactFormProps) {
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
        <form aria-label="contact form" className={styles.contactForm} onSubmit={handleSubmit}>
          <input
            type="email"
            name="email"
            placeholder="Your email"
            className={styles.emailInput}
            value={email}
            onChange={e => setEmail(e.target.value)}
            maxLength={320}
            required
          />
          <textarea
            name="message"
            placeholder="Your message"
            className={styles.messageTextarea}
            value={message}
            onChange={e => setMessage(e.target.value)}
            maxLength={5000}
            required
          />
          <small
            className={`${styles.charCounter} ${message.length > 4500 ? styles.charCounterWarn : ''}`}
          >
            {message.length} / 5000
          </small>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={status === 'submitting' || message.length === 0 || message.length > 5000}
          >
            {status === 'submitting' ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}
