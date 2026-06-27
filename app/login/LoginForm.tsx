'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { Button } from '@/app/components/ui/Button/Button';
import { Field } from '@/app/components/ui/Field/Field';
import { FormError } from '@/app/components/ui/Field/FormError';
import { Input } from '@/app/components/ui/Field/Input';
import { login, loginWithPasskey } from '@/app/lib/api/auth';
import { ApiError } from '@/app/lib/api/core';

import styles from './LoginForm.module.scss';

/**
 * Returning-user sign-in form. Email + password drives the break-glass `login()`;
 * the "Face / Touch ID" button drives `loginWithPasskey()` (email-keyed). On
 * success the backend sets the `ezac_session` cookie and we land on `/user`.
 */
export default function LoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const mapError = (err: unknown): string => {
    if (err instanceof ApiError) {
      if (err.status === 401) return 'Incorrect email or password.';
      if (err.status === 429) return 'Too many attempts. Please try again shortly.';
    }
    return 'Something went wrong. Please try again.';
  };

  const handlePasswordSignIn = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError('Email is required.');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }
    try {
      setSubmitting(true);
      await login(email.trim(), password);
      router.push('/user');
      router.refresh();
    } catch (error_) {
      setError(mapError(error_));
      setSubmitting(false);
    }
  };

  const handlePasskeySignIn = async () => {
    setError(null);
    if (!email.trim()) {
      setError('Enter your email to use Face / Touch ID.');
      return;
    }
    try {
      setSubmitting(true);
      await loginWithPasskey(email.trim());
      router.push('/user');
      router.refresh();
    } catch (error_) {
      setError(mapError(error_));
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handlePasswordSignIn} className={styles.form}>
      <Field label="Email" htmlFor="login-email">
        <Input
          id="login-email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          disabled={submitting}
        />
      </Field>

      <Field label="Password" htmlFor="login-password">
        <Input
          id="login-password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Your password"
          autoComplete="current-password"
          disabled={submitting}
        />
      </Field>

      {error && <FormError>{error}</FormError>}

      <Button type="submit" loading={submitting} className={styles.submitButton}>
        {submitting ? 'Signing in…' : 'Sign in'}
      </Button>

      <Button
        type="button"
        variant="outline"
        onClick={handlePasskeySignIn}
        disabled={submitting || !email.trim()}
        className={styles.passkeyButton}
      >
        Sign in with Face / Touch ID
      </Button>
    </form>
  );
}
