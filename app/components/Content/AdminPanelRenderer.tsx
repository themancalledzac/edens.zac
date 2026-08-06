'use client';

import { useState } from 'react';

import { MessagesPanel } from '@/app/components/MessagesPanel/MessagesPanel';
import UserManagementPanel from '@/app/components/UserManagementPanel/UserManagementPanel';
import type { ContentPanelModel } from '@/app/types/Content';

import styles from './AdminPanelRenderer.module.scss';

interface AdminPanelRendererProps {
  content: ContentPanelModel;
  width: number;
  height: number;
}

/**
 * Bridges a PANEL content block to its component, inside the box the layout packer sized.
 *
 * Collapsed state lives here rather than in {@link AdminPanel} because this is the component that
 * owns the footprint: the packer's `height` is applied as an inline style, so a panel collapsing
 * on its own would hide its body and leave the full 1100px box standing empty. Dropping the fixed
 * height here lets the box shrink to the header — which is the whole point of collapsing, and
 * matters most on mobile, where `mobileChunkSize={1}` gives each panel a row to itself.
 */
export function AdminPanelRenderer({ content, width, height }: AdminPanelRendererProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={styles.box} style={{ width, height: collapsed ? undefined : height }}>
      {content.panelType === 'users' ? (
        <UserManagementPanel collapsed={collapsed} onCollapsedChange={setCollapsed} />
      ) : (
        <MessagesPanel collapsed={collapsed} onCollapsedChange={setCollapsed} />
      )}
    </div>
  );
}
