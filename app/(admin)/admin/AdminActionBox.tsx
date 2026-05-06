'use client';

import { useState, useTransition } from 'react';

import { collectionStorage } from '@/app/lib/storage/collectionStorage';

import { clearCacheAction } from './actions';
import styles from './AdminActionBox.module.scss';

type ActionStatus =
  | { kind: 'idle' }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string };

export default function AdminActionBox() {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<ActionStatus>({ kind: 'idle' });

  const handleClearCache = () => {
    setStatus({ kind: 'idle' });
    startTransition(async () => {
      const result = await clearCacheAction();
      if (result.ok) {
        collectionStorage.clearAll();
        setStatus({ kind: 'success', message: 'Cache cleared.' });
      } else {
        setStatus({ kind: 'error', message: result.error });
      }
    });
  };

  return (
    <div className={styles.box}>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.button}
          onClick={handleClearCache}
          disabled={isPending}
        >
          {isPending ? 'Clearing…' : 'Clear Cache'}
        </button>
      </div>
      {status.kind === 'success' && <p className={styles.success}>{status.message}</p>}
      {status.kind === 'error' && <p className={styles.error}>{status.message}</p>}
    </div>
  );
}
