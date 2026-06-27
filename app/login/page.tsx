import { type Metadata } from 'next';
import { redirect } from 'next/navigation';

import { meServer } from '@/app/lib/api/auth';

import LoginForm from './LoginForm';
import styles from './page.module.scss';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Sign in' };

/**
 * Returning-user sign-in page. If a valid session already resolves, redirect to
 * the personal `/user` page instead of showing the form.
 */
export default async function LoginPage() {
  const principal = await meServer();
  if (principal) redirect('/user');

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.heading}>Sign in</h1>
        <LoginForm />
      </div>
    </main>
  );
}
