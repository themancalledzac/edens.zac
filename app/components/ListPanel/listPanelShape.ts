/**
 * The shape vocabulary a ListPanel row or header declares, and the height that falls out of it.
 *
 * Replaces the per-panel measured `PANEL_ROW_HEIGHT` constant. That constant was the one panel
 * registration step whose failure mode was silent: a wrong number does not fail to compile, it
 * desyncs the packer's reserved box from the rendered box and leaves a blank well. Deriving the
 * height from a declared shape makes a new panel's height a consequence of what it renders.
 *
 * The three existing panels are the calibration fixtures. If a change here stops reproducing
 * 75 / 86 / 36.5, the model is wrong -- do not adjust the fixtures to match.
 *
 * Height is `max(section stacks) + ROW_PADDING_Y`, never a sum across sections: a row's height
 * comes from whichever of its side-by-side sections is tallest. The Users row proves the max --
 * its two stacked `sm` buttons (58px) beat its two-line identity block (41px), so 58 + 17 = 75.
 */

/** What a single slot holds. Determines its contribution to its section's stack height. */
export type SlotKind = 'header' | 'subheader' | 'button';

/** A section holds zero, one or two stacked slots, top first. */
export type SectionShape = SlotKind[];

/**
 * A row or header: up to three sections. Only `left` is required -- a row always has something to
 * say, but need not carry a control or a trailing stat. `middle` and `right` being optional keeps
 * this in step with `ListRow`'s prop contract, where both are likewise optional.
 */
export interface RowShape {
  left: SectionShape;
  middle?: SectionShape;
  right?: SectionShape;
  /**
   * Residual, in CSS px, between the height this shape derives and the height the panel actually
   * reserves today. Non-zero only where a panel has not yet been migrated onto `ListPanel`, so
   * the shape describes the row it is BECOMING while the pinned height is what it measures NOW.
   *
   * This exists because the two cannot be reconciled by tuning {@link SLOT_HEIGHT}. With five
   * unknowns (header, subheader, button, gap, padding) and the three pinned heights as equations,
   * every solution that satisfies all three forces degenerate values -- an 8.5px header line with
   * a 19px gap, or a subheader 13px TALLER than a header. The obstruction is structural, not a
   * search failure: 86 is nearly double the ~48px a two-section `max()` can yield, because the
   * Messages row today stacks three blocks in ONE column. No `max()` model reproduces a 3-high
   * stack. Rather than corrupt the vocabulary to fit one un-migrated panel, the shape stays honest
   * and the gap is carried here, named, and retired when the panel migrates.
   *
   * Each use MUST name what it accounts for. Both current uses go to zero in Task 8.
   */
  heightAdjustment?: number;
}

/**
 * Rendered height of one slot, in CSS px, against the live Inter font.
 *
 * Each is grounded in the stylesheet rather than fitted to the pinned totals:
 * - `header` 20 -- the 16px title line box. Carried over from `PANEL_CHROME.headerTextOnly`,
 *   which is the number the Messages panel's text-only header already reserved.
 * - `subheader` 17 -- a 14px (`--text-sm`) line box.
 * - `button` 27 -- a `Button sm`: `--space-1` block padding (4 + 4), its 1px border top and
 *   bottom, and a 14px line box (16.94), so 26.94. Carried over from `PANEL_CHROME.headerControl`.
 *
 * Corroboration that `subheader` and `button` are measurements and not fudge factors: they
 * reconstruct the live Messages row exactly. That row stacks meta (17) over body (17) over its
 * actions (27) with two `--space-1` gaps (8) inside {@link ROW_PADDING_Y} (17) -- 86.0, the pinned
 * value to the tenth. A third action button on a Users row would likewise change that panel's
 * height, which is the property this model exists to make visible instead of silent.
 */
export const SLOT_HEIGHT: Record<SlotKind, number> = {
  header: 20,
  subheader: 17,
  button: 27,
};

/** Vertical gap between two stacked slots in the same section (`--space-1`). */
export const SLOT_GAP = 4;

/** Block padding inside a row (`--space-2` top + bottom), plus its 1px separator. */
export const ROW_PADDING_Y = 17;

/**
 * Fixed height around a panel's list, mirroring `AdminPanel.module.scss`. Written as its parts
 * rather than one measured total so a token change is traceable: `.panel` border (1px x 2),
 * `.header` block padding (`--space-3` x 2) plus its bottom rule, and `.body` padding
 * (`--space-4` x 2).
 *
 * The header's own content height is no longer a constant here. It used to be a pair --
 * `headerControl` 27 for a header carrying a `Button sm`, `headerTextOnly` 20 for one carrying
 * only a text link -- selected by a hand-maintained `PANEL_HAS_HEADER_BUTTON` map. Both numbers
 * now live in {@link SLOT_HEIGHT} and the choice between them falls out of the header's declared
 * shape, so a header that gains a button cannot forget to grow.
 */
const PANEL_CHROME = {
  border: 2,
  headerPadding: 24,
  headerRule: 1,
  bodyPadding: 32,
} as const;

function stackHeight(section: SectionShape | undefined): number {
  if (!section || section.length === 0) return 0;
  const slots = section.reduce((total, kind) => total + SLOT_HEIGHT[kind], 0);
  return slots + (section.length - 1) * SLOT_GAP;
}

/** Height of the tallest section in a row, plus the row's own vertical padding. */
export function rowHeight(shape: RowShape): number {
  const tallest = Math.max(
    stackHeight(shape.left),
    stackHeight(shape.middle),
    stackHeight(shape.right)
  );
  return tallest + ROW_PADDING_Y + (shape.heightAdjustment ?? 0);
}

/**
 * Fixed height a panel spends on chrome, given the shape of its header row.
 *
 * Needs no {@link RowShape.heightAdjustment}: all three panels' header totals come out exact --
 * Users and Roles at 86 (their `+ New` / create button governs at 27) and Messages at 79 (text
 * link only, so the 20px title line governs).
 */
export function panelChromeHeight(header: RowShape): number {
  const headerContent = Math.max(
    stackHeight(header.left),
    stackHeight(header.middle),
    stackHeight(header.right)
  );
  return (
    PANEL_CHROME.border +
    PANEL_CHROME.headerPadding +
    PANEL_CHROME.headerRule +
    PANEL_CHROME.bodyPadding +
    headerContent
  );
}
