import { notFound } from 'next/navigation';

import { getInvitePreview } from '@/app/lib/api/users';

import InviteForm from './InviteForm';
import styles from './page.module.scss';

export const dynamic = 'force-dynamic';

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

/**
 * Public account-setup page delivered via an invite link.
 *
 * Fetches the invite preview server-side; calls `notFound()` if the token is
 * invalid, expired, or already used. Adds `Referrer-Policy: no-referrer` via
 * a `<meta>` tag to prevent the raw token from leaking to third-party resources.
 * The interactive portion is delegated to `InviteForm` (a Client Component).
 */
export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  const preview = await getInvitePreview(token);
  if (!preview) notFound();

  return (
    <main className={styles.page}>
      {/* Prevent the raw invite token (URL) from appearing in Referer headers */}
      <meta name="referrer" content="no-referrer" />

      <div className={styles.card}>
        <h1 className={styles.heading}>Set up your account</h1>
        <InviteForm token={token} email={preview.email} displayName={preview.displayName} />
      </div>
    </main>
  );
}
