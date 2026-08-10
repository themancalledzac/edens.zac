import { type Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { skipTargetProps } from '@/app/components/ui/SkipLink/SkipLink';
import { meServer } from '@/app/lib/api/auth';
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
 * An invite link is a one-shot onboarding step, so a visitor who is past that step is sent home
 * rather than shown an error. Two ways to be past it, both redirecting to `/`:
 *
 * - Already signed in — checked before the token is even looked up, mirroring `/login`, which
 *   bounces authenticated visitors the same way.
 * - The token has been redeemed (backend 410) — the account exists, so whoever holds the stale
 *   link (its owner, or a forwarded copy) belongs on the site, not on a 404.
 *
 * A token that never existed or has expired (404) still calls `notFound()`: that is a genuine dead
 * end, and silently redirecting a mistyped link would tell the visitor nothing.
 *
 * The interactive portion is delegated to `InviteForm` (a Client Component). The token-in-URL
 * referrer mitigation is handled by the exported `metadata` above.
 *
 * `<main>` carries the skip link's landing zone directly: the site-wide link is rendered
 * unconditionally from the root layout, and this page has no header inside `<main>` for a nested
 * target to exclude.
 */
export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;

  const principal = await meServer();
  if (principal) redirect('/');

  const result = await getInvitePreview(token);
  if (result.status === 'used') redirect('/');
  if (result.status === 'invalid') notFound();

  return (
    <main className={styles.page} {...skipTargetProps}>
      <div className={styles.card}>
        <h1 className={styles.heading}>Set up your account</h1>
        <InviteForm
          token={token}
          email={result.preview.email}
          displayName={result.preview.displayName}
        />
      </div>
    </main>
  );
}
