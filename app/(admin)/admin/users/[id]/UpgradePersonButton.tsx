'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/app/components/ui/Button/Button';
import { UpgradeUserModal } from '@/app/components/UpgradeUserModal/UpgradeUserModal';
import { type AdminUserSummary } from '@/app/types/User';

import styles from './UpgradePersonButton.module.scss';

export interface UpgradePersonButtonProps {
  /** The tag-only PERSON this detail page is showing. */
  person: AdminUserSummary;
}

/**
 * Detail-page affordance for promoting a tag-only PERSON in place into an `INVITED` account, so the
 * action is reachable without going back to the `/admin` users panel. Mounts
 * {@link UpgradeUserModal} on demand and refreshes the server-rendered page as soon as the upgrade
 * succeeds — the page re-renders as a full account view while the modal keeps showing the one-time
 * invite link until dismissed.
 */
export function UpgradePersonButton({ person }: UpgradePersonButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.actions}>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Upgrade to account
      </Button>
      {open && (
        <UpgradeUserModal
          source={person}
          onClose={() => setOpen(false)}
          onUpgraded={() => router.refresh()}
        />
      )}
    </div>
  );
}

export default UpgradePersonButton;
