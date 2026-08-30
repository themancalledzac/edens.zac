'use client';

import { type ComponentType } from 'react';

import { CollectionsPanel } from '@/app/components/CollectionsPanel/CollectionsPanel';
import { useAdminPanelCollapse } from '@/app/components/ListPanel/AdminPanelCollapseContext';
import { MessagesPanel } from '@/app/components/MessagesPanel/MessagesPanel';
import { RolesPanel } from '@/app/components/RolesPanel/RolesPanel';
import UserManagementPanel from '@/app/components/UserManagementPanel/UserManagementPanel';
import type { ContentPanelModel } from '@/app/types/Content';

import styles from './AdminPanelRenderer.module.scss';

interface AdminPanelRendererProps {
  content: ContentPanelModel;
  width: number;
  height: number;
  /** The atomic position class a photo leaf gets at this slot — see the docblock below. */
  positionClassName?: string;
}

interface AdminPanelChildProps {
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

/**
 * A lookup rather than a ternary chain: an `else` branch silently renders the wrong panel for
 * anything it does not name, while a missing key here is a type error.
 */
const PANEL_COMPONENTS: Record<
  ContentPanelModel['panelType'],
  ComponentType<AdminPanelChildProps>
> = {
  users: UserManagementPanel,
  messages: MessagesPanel,
  roles: RolesPanel,
  collections: CollectionsPanel,
};

/**
 * Bridges a PANEL content block to its component, inside the box the layout packer sized.
 *
 * A panel is an ordinary leaf of the content layout, and this renders it as one — same
 * `positionClassName` a photograph gets at the same slot (`ContentComponent.module.scss`'s
 * `imageSingle`, since every BoxTree leaf is single-in-slot), same inline `width`/`height`, same
 * `box-sizing`/`position` contract. Reusing the atomic wrapper rather than a parallel one is the
 * point: a panel that styles its own box is a panel that drifts from the grid it sits in.
 *
 * `height` is applied as a HEIGHT, not a `max-height`. The packer's number is the panel's true
 * content height — `chrome + rowCount × rowHeight`, pinned in `adminHubContent` — so the box and
 * its reservation are the same box. A block may claim a slot or size to its own content; doing
 * both leaves a blank well wherever the claim exceeds the content.
 *
 * If a panel's real content exceeds the reservation — a chrome constant drifting a pixel or two, or
 * a list past the height cap — `.body`'s `overflow-y: auto` absorbs it. `.box` must stay a flex
 * column for that: as a block box it would clip at the height instead of handing the overflow to
 * the scrollable body, and no scrollbar would ever appear.
 *
 * The box must NOT feed its own rendered size back into the packer. Width allocation depends on
 * every panel's shape, so measuring width → re-packing → new width → new wrapped height → re-pack
 * oscillates and never converges, and because a re-pack remounts every panel (rows are keyed by
 * membership) each cycle re-fires every admin fetch until the browser runs out of sockets. The
 * height used here is COMPUTED from a row count on the server, never measured, which is what
 * severs that cycle: a count cannot change when the packer changes a panel's width.
 *
 * That severance rests on CSS, so these rules are layout correctness and not styling — a panel row
 * must never become width-dependent. `ListPanel`'s `.row` is a CSS GRID with fixed tracks
 * (`1fr auto auto`), and a grid row cannot wrap: its three sections sit in three columns whatever
 * the width, so the row is always exactly one line of sections tall.
 *
 * Within that frame three rules still carry weight, because a grid track cannot stop its own
 * CONTENTS from growing taller:
 * - Every text slot is `nowrap` + `text-overflow: ellipsis` (`.name`, `.email`, the message
 *   `.body`), so a long value ellipsises instead of becoming a second line. `white-space: nowrap`
 *   on `.rowRight` does the same for "Reset pw".
 * - `min-width: 0` on `.rowLeft` and `.rowActivate`. A grid item's automatic minimum is its
 *   min-content width, so without it the `1fr` track refuses to shrink and pushes the right rail
 *   out of the panel rather than letting its text ellipsise.
 * - No control may exceed the slot height its shape declares in `listPanelShape.ts`. Nothing
 *   enforces this at compile time, and an oversized control grows its row in silence. Controls
 *   read their slot as a custom property — `--lp-slot-button` for the button slot.
 *
 * No `@media` or `@container` may enter this subtree — a breakpoint reintroduces exactly the
 * width-dependence the grid removes. That rule and the rail definitions are pinned by
 * `tests/components/ListPanel/subtreeRules.test.ts` rather than left to this comment.
 *
 * Those rules bind the LIST view, which is the only view the height model describes. A panel that
 * is loading, errored, or showing a role's detail has no row count, reserves the model's floor, and
 * renders whatever it needs inside that box — its text is free to wrap. Because the reservation is
 * never derived from rendered text, text that reflows with width cannot feed back into layout, so
 * the error string stays readable instead of being ellipsised to protect a number that does not
 * depend on it.
 *
 * Collapsed state is READ here but OWNED upstream by `AdminHubClient`, because collapsing has to
 * change the panel's content model before layout runs: the packer sizes every row from those
 * models, so a flag held at this depth can shrink one panel's own box and nothing else. Owning it
 * above `Component` is what lets the rest of the hub re-pack.
 *
 * With no provider the collapse props are omitted entirely, and `ListPanel` renders its plain
 * non-collapsible header — the same opt-in gate it already applies to `onCollapsedChange`.
 */
export function AdminPanelRenderer({
  content,
  width,
  height,
  positionClassName = '',
}: AdminPanelRendererProps) {
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
      className={`${positionClassName} ${styles.box}`.trim()}
      style={{ width, height, boxSizing: 'border-box', position: 'relative' }}
    >
      <Panel {...collapseProps} />
    </div>
  );
}
