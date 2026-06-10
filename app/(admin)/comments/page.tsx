// Admin = perimeter today (BFF INTERNAL_API_SECRET) → authenticated admin principal later (see docs 009). Gating centralized in app/(admin)/layout.tsx.
import { PageShell } from '@/app/components/ui/PageShell/PageShell';
import { getAdminMessages } from '@/app/lib/api/messages';

import styles from './Comments.module.scss';
import { CommentsList } from './CommentsList';

export const dynamic = 'force-dynamic';

export default async function CommentsPage() {
  const data = await getAdminMessages(50, 0);
  const messages = data?.messages ?? [];
  const total = data?.total ?? 0;

  return (
    <PageShell>
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
