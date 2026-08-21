/**
 * The shape vocabulary a ListPanel row or header declares, and the height that falls out of it.
 *
 * Replaces the per-panel measured `PANEL_ROW_HEIGHT` constant. That constant was the one panel
 * registration step whose failure mode was silent: a wrong number does not fail to compile, it
 * desyncs the packer's reserved box from the rendered box and leaves a blank well. Deriving the
 * height from a declared shape makes a new panel's height a consequence of what it renders.
 *
 * The three existing panels are the calibration fixtures. If a change here stops reproducing
 * 71 / 58.5 / 40, the model is wrong -- do not adjust the fixtures to match.
 *
 * Height is `max(section stacks) + ROW_PADDING_Y`, never a sum across sections: a row's height
 * comes from whichever of its side-by-side sections is tallest. The Users row proves the max --
 * its two stacked `sm` buttons (58px) beat its two-line identity block (41px), so 58 + 13 = 71.
 *
 * Every panel renders through `ListPanel`, so every declared shape describes a row that exists.
 * The model reproduces the three calibration panels to the pixel, measured in Chrome against the
 * live Inter font at panel widths 400 / 430 / 520 / 610px: Users 71, Messages 58.5, Roles 40,
 * identical at every width. There is no per-shape residual left; the escape hatch that carried the
 * two un-migrated panels through the migration is gone with them.
 *
 * Collections came the other way round -- its shape was declared first and the panel built to it,
 * deriving 54. That is the point of the model, but it means that one shape rests on the vocabulary
 * being right rather than on its own browser measurement.
 */

/**
 * What a single slot holds. Determines its contribution to its section's stack height.
 *
 * The three text kinds are the type ramp's three steps, not free-form sizes -- `header` is
 * `--text-md`, `subheader` is `--text-sm`, `meta` is `--text-xs`. A row that wants a size outside
 * them is asking for a ramp step this codebase does not have.
 */
export type SlotKind = 'header' | 'subheader' | 'meta' | 'button';

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
}

/**
 * Rendered height of one slot, in CSS px, against the live Inter font.
 *
 * Every value below is a Chrome measurement of the real component, not a number fitted to a total:
 * - `header` 20 -- a `--text-md` (16px) line box, which measures 19.5. Held at 20 because that is
 *   what `PANEL_CHROME.headerTextOnly` reserved before this model existed, and it is the number the
 *   Messages panel's text-only header still reserves. The 0.5 is an over-reservation, and the only
 *   place it can be observed is that header: in all three ROWS the right section is taller, so the
 *   `max()` discards it. Dropping it to 19.5 would be more exact and would move
 *   `panelChromeHeight` and `COLLAPSED_PANEL_HEIGHT` for no visible gain.
 * - `subheader` 17 -- a `--text-sm` (14px) line box. Measured 17.0 exactly.
 * - `meta` 14.5 -- a `--text-xs` (12px) line box. Measured 14.5 exactly. This is the timestamp
 *   step: the Messages row stacks its relative `<time>` above its actions, and reading that line
 *   as a `subheader` is what made the row derive 2.5px more than it rendered.
 * - `button` 27 -- a `Button sm`: `--space-1` block padding (4 + 4), its 1px border top and bottom,
 *   and a 14px line box. Measured 27.0 exactly. Carried over from `PANEL_CHROME.headerControl`.
 *
 * A slot is a RESERVATION, so a section may hold something shorter without breaking the model --
 * the Messages reply chip is a 22.8px outline anchor sitting in a `button` slot beside a real 27px
 * `Button sm`, and the taller of the two governs. What the model cannot absorb is something
 * TALLER than its declared slot: that is exactly what the Roles `x` glyph was at 32px, and it is
 * why the glyph is now pinned to the button slot's height in CSS (`--lp-slot-button`).
 */
export const SLOT_HEIGHT: Record<SlotKind, number> = {
  header: 20,
  subheader: 17,
  meta: 14.5,
  button: 27,
};

/** Vertical gap between two stacked slots in the same section (`--space-1`). */
export const SLOT_GAP = 4;

/**
 * Block padding inside a row (`--space-2` top + `--space-1` bottom), plus its 1px separator.
 *
 * Asymmetric on purpose, and the asymmetry is the density pass: the separator already performs the
 * separation that a row's bottom padding was also performing, so the bottom half was paying twice
 * for one job. Top padding still has to hold the row off the line above it, which nothing else
 * does. 8 + 4 + 1 rather than the 8 + 8 + 1 this replaces -- 4px off every row in every panel.
 *
 * Must stay in step with `.row`'s `padding` in `ListPanel.module.scss`. This number is the
 * packer's contract: it is reserved before the panel renders, so a change on one side alone
 * reopens the blank-well/clipped-row class of bug the derivation exists to close.
 */
export const ROW_PADDING_Y = 13;

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
  return tallest + ROW_PADDING_Y;
}

/**
 * Fixed height a panel spends on chrome, given the shape of its header row.
 *
 * All three panels' header totals fall straight out of the shape -- Users and Roles at 86 (their
 * `+ New` / create button governs at 27) and Messages at 79 (text link only, so the title line
 * governs). Messages is the one place `header`'s 0.5px over-reservation shows: that header
 * measures 78.5 and reserves 79. Unchanged by the density pass, which touches rows only.
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
