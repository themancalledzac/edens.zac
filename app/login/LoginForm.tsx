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

/** Which sign-in path produced a failure; 401 copy differs per flow. */
type LoginFlow = 'password' | 'passkey';

/**
 * Map a sign-in failure to user-facing copy, disambiguating by flow and cause.
 * Passkey ceremonies fail client-side as `DOMException`s (`NotAllowedError` =
 * sheet dismissed / no usable passkey; `SecurityError` = WebAuthn misconfig, e.g.
 * RP id not matching the page domain) and server-side as `ApiError`s. A passkey
 * 401 is a finish-level rejection, so its copy never mentions passwords; the
 * password-flow 401 keeps the classic safe wording. 429 is the shared (IP, email)
 * rate limiter with a 15-minute window, so both flows name the wait. No message
 * reveals whether an account or credential exists.
 */
function mapError(err: unknown, flow: LoginFlow): string {
  if (err instanceof ApiError) {
    if (err.status === 401) {
      return flow === 'password'
        ? 'Incorrect email or password.'
        : "Passkey sign-in didn't complete. Please try again.";
    }
    if (err.status === 429) {
      return 'Too many attempts. Please wait about 15 minutes before trying again.';
    }
  }
  if (err instanceof DOMException) {
    if (err.name === 'NotAllowedError') {
      return 'No passkey was used — sign in with your password, then add Face / Touch ID from your account page.';
    }
    if (err.name === 'SecurityError') {
      return "Passkey sign-in isn't available right now. Please use your password.";
    }
  }
  return 'Something went wrong. Please try again.';
}

/**
 * Returning-user sign-in form. Email + password drives the break-glass `login()`;
 * the "Face / Touch ID" button drives `loginWithPasskey()` (email-keyed). On
 * success the backend sets the `ezac_session` cookie and we land on `/user`.
 * Failures render through {@link mapError}, keyed by which flow was attempted.
 */
export default function LoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      setError(mapError(error_, 'password'));
      setSubmitting(false);
    }
  };

  const handlePasskeySignIn = async () => {
    setError(null);
    try {
      setSubmitting(true);
      await loginWithPasskey(email.trim());
      router.push('/user');
      router.refresh();
    } catch (error_) {
      setError(mapError(error_, 'passkey'));
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
