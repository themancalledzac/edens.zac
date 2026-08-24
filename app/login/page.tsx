import { type Metadata } from 'next';
import { redirect } from 'next/navigation';

import { skipTargetProps } from '@/app/components/ui/SkipLink/SkipLink';
import { meServer } from '@/app/lib/api/auth';
import styles from '@/app/styles/auth-card.module.scss';

import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Sign in' };

/**
 * Returning-user sign-in page. If a valid session already resolves, redirect to
 * the personal `/user` page instead of showing the form.
 *
 * `<main>` carries the skip link's landing zone directly: the site-wide link is rendered
 * unconditionally from the root layout, and this page has no header inside `<main>` for a nested
 * target to exclude.
 */
export default async function LoginPage() {
  const principal = await meServer();
  if (principal) redirect('/user');

  return (
    <main className={styles.page} {...skipTargetProps}>
      <div className={styles.card}>
        <h1 className={styles.heading}>Sign in</h1>
        <LoginForm />
      </div>
    </main>
  );
}
