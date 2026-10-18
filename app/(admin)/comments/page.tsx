// Admin = authenticated admin principal: the backend enforces hasRole('ADMIN') on
// /api/admin/** (see docs 009). Gating centralized in app/(admin)/layout.tsx via requireAdmin().
import { PageShell } from '@/app/components/ui/PageShell/PageShell';
import { meServer } from '@/app/lib/api/auth';
import { getAdminMessages } from '@/app/lib/api/messages';

import styles from './Comments.module.scss';
import { CommentsList } from './CommentsList';

export const dynamic = 'force-dynamic';

export default async function CommentsPage() {
  const [data, me] = await Promise.all([getAdminMessages(50, 0), meServer().catch(() => null)]);
  const messages = data?.messages ?? [];
  const total = data?.total ?? 0;

  return (
    <PageShell backHref="/admin" me={me}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Comments</h1>
        <span className={styles.total}>{total} total</span>
      </div>
      <div className={styles.contentArea}>
        <CommentsList initialMessages={messages} initialTotal={total} />
      </div>
    </PageShell>
  );
}
