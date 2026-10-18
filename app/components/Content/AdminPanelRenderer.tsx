'use client';

import { AdminLists } from '@/app/components/AdminLists/AdminLists';
import { useAdminPanelCollapse } from '@/app/components/ListPanel/AdminPanelCollapseContext';
import type { ContentPanelModel } from '@/app/types/Content';

import styles from './AdminPanelRenderer.module.scss';

interface AdminPanelRendererProps {
  /** The PANEL block. Only its size matters here; the packer already read the rest. */
  content: ContentPanelModel;
  width: number;
  height: number;
  /** The atomic position class a photo leaf gets at this slot — see the docblock below. */
  positionClassName?: string;
}

/**
 * Bridges the PANEL content block to the hub's tabbed list panel ({@link AdminLists}), inside the
 * box the layout packer sized.
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
 * must never become width-dependent. Every `ListRow` is one line:
 * - Its text runs are `nowrap` + `text-overflow: ellipsis`, and `.rowLine` carries `min-width: 0`
 *   so it can shrink, so a long value ellipsises instead of becoming a second line.
 * - No control may exceed the slot height its shape declares in `listPanelShape.ts`. Nothing
 *   enforces this at compile time, and an oversized control grows its row in silence.
 *
 * No `@media` or `@container` may enter this subtree — a breakpoint reintroduces exactly the
 * width-dependence the one-line row removes. That rule and the rail definitions are pinned by
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
 * models, so a flag held at this depth could shrink the panel's own box and nothing else. Owning it
 * above `Component` is what lets the rest of the hub re-pack.
 *
 * With no provider the collapse props are omitted entirely, and `ListPanel` renders its plain
 * non-collapsible header — the same opt-in gate it already applies to `onCollapsedChange`.
 */
export function AdminPanelRenderer({
  width,
  height,
  positionClassName = '',
}: AdminPanelRendererProps) {
  const collapse = useAdminPanelCollapse();
  const collapseProps = collapse
    ? { collapsed: collapse.collapsed, onCollapsedChange: collapse.setCollapsed }
    : {};

  return (
    <div
      className={`${positionClassName} ${styles.box}`.trim()}
      style={{ width, height, boxSizing: 'border-box', position: 'relative' }}
    >
      <AdminLists {...collapseProps} />
    </div>
  );
}
