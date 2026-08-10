'use client';

import { type ComponentType, useState } from 'react';

import { MessagesPanel } from '@/app/components/MessagesPanel/MessagesPanel';
import { RolesPanel } from '@/app/components/RolesPanel/RolesPanel';
import UserManagementPanel from '@/app/components/UserManagementPanel/UserManagementPanel';
import type { ContentPanelModel } from '@/app/types/Content';

import styles from './AdminPanelRenderer.module.scss';

interface AdminPanelRendererProps {
  content: ContentPanelModel;
  width: number;
  height: number;
}

interface AdminPanelChildProps {
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

/**
 * A lookup rather than a ternary chain: with three panel types an `else` branch silently renders
 * the wrong panel for anything it does not name, while a missing key here is a type error.
 */
const PANEL_COMPONENTS: Record<
  ContentPanelModel['panelType'],
  ComponentType<AdminPanelChildProps>
> = {
  users: UserManagementPanel,
  messages: MessagesPanel,
  roles: RolesPanel,
};

/**
 * Bridges a PANEL content block to its component, inside the box the layout packer sized.
 *
 * The packer's `height` is applied as `max-height`, not `height`: a panel is as tall as its
 * contents, up to the aspect ratio declared in `adminHubContent`, past which its body scrolls. So
 * a roles panel holding three rows is three rows tall, while a user list of fifty stops at the cap
 * — the two used to reserve the same 1100px well regardless.
 *
 * `.box` must stay a flex column for that to work. A capped block box would clip its panel at the
 * cap instead of handing the overflow to the scrollable body, and the scroll would never appear.
 *
 * Collapsed state lives here rather than in {@link AdminPanel} because this is the component that
 * owns the footprint. It no longer has to unset a fixed height — a collapsed panel unmounts its
 * body and shrinks under the cap on its own — but it does drop the `min-height` that otherwise
 * holds a stable footprint while each panel's client fetch is in flight.
 */
export function AdminPanelRenderer({ content, width, height }: AdminPanelRendererProps) {
  const [collapsed, setCollapsed] = useState(false);
  const Panel = PANEL_COMPONENTS[content.panelType];

  return (
    <div
      className={`${styles.box} ${collapsed ? styles.collapsed : ''}`}
      style={{ width, maxHeight: height }}
    >
      <Panel collapsed={collapsed} onCollapsedChange={setCollapsed} />
    </div>
  );
}
