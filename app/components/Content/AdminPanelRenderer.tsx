'use client';

import { type ComponentType } from 'react';

import { useAdminPanelCollapse } from '@/app/components/AdminPanel/AdminPanelCollapseContext';
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
 * That cap is dropped entirely while collapsed. `COLLAPSED_PANEL_SIZE` is a deliberately bar-shaped
 * footprint that the packer resolves to a height BELOW the header's own natural height at every
 * viewport, down to a sliver on a phone. Applying it as `max-height` would bind — a cap under the
 * content's height clips it — so collapsed reports no `max-height` and the bar sizes to its header.
 *
 * Collapsed state is READ here but OWNED upstream by `AdminHubClient`, because collapsing has to
 * change the panel's content model before layout runs: the packer sizes every row from those
 * models, so a flag held at this depth can shrink one panel's own box and nothing else. The row
 * stays as tall as its tallest sibling and every tile keeps its width. Owning it above `Component`
 * is what lets the rest of the hub re-pack. What stays this component's business is the `.collapsed`
 * class, which drops the `min-height` that otherwise holds a stable footprint during each panel's
 * client fetch.
 *
 * With no provider the collapse props are omitted entirely, and `AdminPanel` renders its plain
 * non-collapsible header — the same opt-in gate it already applies to `onCollapsedChange`.
 */
export function AdminPanelRenderer({ content, width, height }: AdminPanelRendererProps) {
  const collapse = useAdminPanelCollapse();
  const collapsed = collapse?.isCollapsed(content.panelType) ?? false;
  const Panel = PANEL_COMPONENTS[content.panelType];
  const collapseProps = collapse
    ? {
        collapsed,
        onCollapsedChange: (next: boolean) => collapse.setCollapsed(content.panelType, next),
      }
    : {};

  return (
    <div
      className={`${styles.box} ${collapsed ? styles.collapsed : ''}`}
      style={{ width, maxHeight: collapsed ? undefined : height }}
    >
      <Panel {...collapseProps} />
    </div>
  );
}
