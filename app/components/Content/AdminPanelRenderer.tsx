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
  /** The atomic position class a photo leaf gets at this slot — see the docblock below. */
  positionClassName?: string;
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
 * A panel is an ordinary leaf of the content layout, and this renders it as one — same
 * `positionClassName` a photograph gets at the same slot (`ContentComponent.module.scss`'s
 * `imageSingle`, since every BoxTree leaf is single-in-slot), same inline `width`/`height`, same
 * `box-sizing`/`position` contract. Reusing the atomic wrapper rather than a parallel one is the
 * point: a panel that styles its own box is a panel that drifts from the grid it sits in.
 *
 * `height` is applied as a HEIGHT, not a `max-height`. The packer's number is now the panel's true
 * content height — `chrome + rowCount × rowHeight`, pinned in `adminHubContent` — so the box and
 * its reservation are the same box. The old `max-height` + `align-self: flex-start` pair is gone
 * with it: together they made a panel CLAIM a 1100-ratio column and then OCCUPY only its content,
 * which is where the blank well in Zac's 2026-08-10 screenshots came from (763px reserved, 249px
 * rendered). A block may do one or the other; doing both is what broke the layout.
 *
 * If a panel's real content exceeds the reservation — a chrome constant drifting a pixel or two, or
 * a list past the height cap — `.body`'s `overflow-y: auto` absorbs it. `.box` must stay a flex
 * column for that: as a block box it would clip at the height instead of handing the overflow to
 * the scrollable body, and no scrollbar would ever appear.
 *
 * The box must NOT feed its own rendered size back into the packer. A measured-height path was
 * tried (2026-08-10, Phase C of the shape-model spec) and reverted the same day: the packer's
 * width allocation depends on every panel's shape, so measuring width → re-packing → new width →
 * new wrapped height → re-pack oscillates and never converges, and because a re-pack remounts
 * every panel (rows are keyed by membership) each cycle re-fired all three admin fetches until the
 * browser ran out of sockets (`ERR_INSUFFICIENT_RESOURCES`). The height used here is COMPUTED from
 * a row count on the server, never measured, which is what severs that cycle: a count cannot change
 * when the packer changes a panel's width.
 *
 * That severance rests on CSS, so these rules are layout correctness and not styling — a panel row
 * must never become width-dependent. What guarantees it is now structural: `ListPanel`'s `.row` is
 * a CSS GRID with fixed tracks (`1fr auto auto`), and a grid row cannot wrap. Its three sections
 * are placed in three columns whatever the width, so the row is always exactly one line of
 * sections tall. That replaced a wrapping flex row whose safety depended on the ABSENCE of a
 * `flex-wrap` declaration and on a `flex: 1 1 220px` basis acting as the wrap threshold — a
 * guarantee made of two things nobody had written down, either of which a plausible edit restores.
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
 *   enforces this at compile time: the Roles `x` glyph was a 32px square in a 27px `button` slot
 *   and rendered a 49px row against a 36.5px reservation, in silence. It reads `--lp-slot-button`
 *   now, which is that slot published as a custom property.
 *
 * No `@media` or `@container` may enter this subtree — a breakpoint reintroduces exactly the
 * width-dependence the grid removes. That rule and the rail definitions are pinned by
 * `tests/components/ListPanel/subtreeRules.test.ts` rather than left to this comment.
 *
 * Those rules bind the LIST view, which is the only view the height model describes. A panel that
 * is loading, errored, or showing a role's detail has no row count, reserves the model's floor, and
 * renders whatever it needs inside that box — its text is free to wrap. That is deliberate rather
 * than an oversight: because the reservation is never derived from rendered text, text that reflows
 * with width cannot feed back into layout, so the error string is left readable instead of being
 * ellipsised to protect a number that does not depend on it.
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
