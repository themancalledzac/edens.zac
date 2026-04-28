import { getAdminMessages } from '@/app/lib/api/messages';

import styles from './Comments.module.scss';
import { CommentsList } from './CommentsList';

export const dynamic = 'force-dynamic';

export default async function CommentsPage() {
  const data = await getAdminMessages(50, 0);
  const messages = data?.messages ?? [];
  const total = data?.total ?? 0;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Comments</h1>
        <span className={styles.total}>{total} total</span>
      </header>
      <CommentsList initialMessages={messages} initialTotal={total} />
    </div>
  );
}
