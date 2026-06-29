'use client';

import { MessagesPanel } from '@/app/components/MessagesPanel/MessagesPanel';
import UserManagementPanel from '@/app/components/UserManagementPanel/UserManagementPanel';
import type { ContentPanelModel } from '@/app/types/Content';

import styles from './AdminPanelRenderer.module.scss';

interface AdminPanelRendererProps {
  content: ContentPanelModel;
  width: number;
  height: number;
}

export function AdminPanelRenderer({
  content,
  width,
  height,
}: AdminPanelRendererProps) {
  return (
    <div className={styles.box} style={{ width, height }}>
      {content.panelType === 'users' ? <UserManagementPanel /> : <MessagesPanel />}
    </div>
  );
}
