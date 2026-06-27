import { type Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getInvitePreview } from '@/app/lib/api/users';

import InviteForm from './InviteForm';
import styles from './page.module.scss';

export const dynamic = 'force-dynamic';

/**
 * Emit `<meta name="referrer" content="no-referrer">` into `<head>` so the raw
 * invite token in the URL is never sent in a `Referer` header to third-party
 * resources. Set via Next's metadata API — a bare `<meta>` in the JSX body is
 * inert, because browsers only honor the referrer directive inside `<head>`.
 */
export const metadata: Metadata = { referrer: 'no-referrer' };

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

/**
 * Public account-setup page delivered via an invite link.
 *
 * Fetches the invite preview server-side; calls `notFound()` if the token is
 * invalid, expired, or already used. The interactive portion is delegated to
 * `InviteForm` (a Client Component). The token-in-URL referrer mitigation is
 * handled by the exported `metadata` above.
 */
export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  const preview = await getInvitePreview(token);
  if (!preview) notFound();

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.heading}>Set up your account</h1>
        <InviteForm token={token} email={preview.email} displayName={preview.displayName} />
      </div>
    </main>
  );
}
