import { type Metadata } from 'next';
import { redirect } from 'next/navigation';

import { PageShell } from '@/app/components/ui/PageShell/PageShell';
import { meServer } from '@/app/lib/api/auth';
import styles from '@/app/styles/auth-card.module.scss';

import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Sign in' };

/**
 * Returning-user sign-in page. If a valid session already resolves, redirect to
 * the personal `/user` page instead of showing the form.
 *
 * Rendered through `PageShell` with `me={null}`: a signed-in visitor was redirected above, so the
 * header never needs the principal resolved. The shell supplies the header, the footer's anchor and
 * the skip target.
 */
export default async function LoginPage() {
  const principal = await meServer();
  if (principal) redirect('/user');

  return (
    <PageShell className={styles.shell} me={null}>
      <div className={styles.page}>
        <div className={styles.card}>
          <h1 className={styles.heading}>Sign in</h1>
          <LoginForm />
        </div>
      </div>
    </PageShell>
  );
}
