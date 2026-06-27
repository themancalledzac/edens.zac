'use client';

import { useState } from 'react';

import { Button } from '@/app/components/ui/Button/Button';

import styles from './InviteLinkResult.module.scss';

export interface InviteLinkResultProps {
  inviteUrl: string;
  /** Caption above the link. Lets the create vs regenerate flows phrase it differently. */
  label?: string;
}

/**
 * Presents a generated invite link with a copy-to-clipboard button. Shared by the create-user and
 * regenerate-invite admin flows so the copy UX stays identical in both.
 */
export function InviteLinkResult({
  inviteUrl,
  label = 'Share this invite link:',
}: InviteLinkResultProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
  };

  return (
    <div className={styles.result}>
      <p className={styles.label}>{label}</p>
      <p className={styles.url}>{inviteUrl}</p>
      <Button onClick={handleCopy} variant="secondary" className={styles.copyButton}>
        {copied ? 'Copied!' : 'Copy'}
      </Button>
    </div>
  );
}

export default InviteLinkResult;
