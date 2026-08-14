import { panelContentHeight } from '@/app/(admin)/admin/adminHubContent';
import {
  panelChromeHeight,
  ROW_PADDING_Y,
  rowHeight,
  type RowShape,
  SLOT_HEIGHT,
} from '@/app/components/ListPanel/listPanelShape';

/**
 * The three live panels, as the shapes they declare. These are the calibration fixtures for
 * `listPanelShape`: 71 / 58.5 / 40 is what each row MEASURES in Chrome against the live Inter
 * font, so a model that stops reproducing them is wrong. Fix the model, never these numbers.
 *
 * All three are now exact -- derived and rendered agree to the pixel, at panel widths 400, 430,
 * 520 and 610. No shape carries a residual any more: `RowShape.heightAdjustment` existed only to
 * carry the two un-migrated panels through the migration and was deleted with the last of them.
 *
 * What retired each one:
 * - Messages (+21) -- the row stacked meta, body and actions in ONE column, which no `max()` of
 *   two sections can produce. It is two sections now, and the taller (`meta` over `button`, 45.5)
 *   governs. Its left slots also read `--text-sm`, not a `header`: the sender is a link, not a
 *   title.
 * - Roles (-7.5) -- the row had no padding of its own and pushed it into `.rowMain`, so the 32px
 *   `x` glyph competed against a PADDED name block. `ListPanel.row` owns the padding now, and the
 *   glyph is sized to the `button` slot it sits in (`--lp-slot-button`) instead of --space-6.
 */
const USERS_ROW: RowShape = {
  left: ['header', 'subheader'],
  right: ['button', 'button'],
};

const MESSAGES_ROW: RowShape = {
  left: ['subheader', 'subheader'],
  right: ['meta', 'button'],
};

const ROLES_ROW: RowShape = { left: ['header'], right: ['button'] };

describe('rowHeight', () => {
  it('reproduces the measured Users row height', () => {
    expect(rowHeight(USERS_ROW)).toBeCloseTo(71, 1);
  });

  it('reproduces the measured Messages row height', () => {
    expect(rowHeight(MESSAGES_ROW)).toBeCloseTo(58.5, 1);
  });

  it('reproduces the measured Roles row height', () => {
    expect(rowHeight(ROLES_ROW)).toBeCloseTo(40, 1);
  });

  // The density pass is only honest if the row actually got shorter. Pinning the direction as
  // well as the values means a later "tidy-up" that restores symmetric padding fails here rather
  // than silently handing the packer back the 4px it just reclaimed.
  it('derives a shorter row than the symmetric padding it replaced', () => {
    const SYMMETRIC_ROW_PADDING_Y = 17;
    expect(rowHeight(USERS_ROW)).toBe(58 + ROW_PADDING_Y);
    expect(ROW_PADDING_Y).toBeLessThan(SYMMETRIC_ROW_PADDING_Y);
  });

  // `meta` is the slot the Messages timestamp needed and the vocabulary lacked. Reading that
  // `--text-xs` line as a `subheader` is what made the row derive 2.5px more than it rendered.
  it('gives a meta slot less height than a subheader', () => {
    expect(SLOT_HEIGHT.meta).toBeLessThan(SLOT_HEIGHT.subheader);
    expect(rowHeight({ left: ['meta'] })).toBeLessThan(rowHeight({ left: ['subheader'] }));
  });

  it('takes the tallest section, not the first', () => {
    expect(rowHeight({ left: ['header'], right: ['button', 'button'] })).toBeGreaterThan(
      rowHeight({ left: ['header'], right: ['button'] })
    );
  });

  // Spread rather than re-declared so the two sides differ ONLY by the empty middle.
  it('ignores an absent middle section', () => {
    expect(rowHeight({ ...ROLES_ROW, middle: [] })).toBe(rowHeight(ROLES_ROW));
  });
});

describe('panelChromeHeight', () => {
  it('is taller for a header carrying a button than a text-only one', () => {
    expect(panelChromeHeight({ left: ['header'], right: ['button'] })).toBeGreaterThan(
      panelChromeHeight({ left: ['header'] })
    );
  });
});

describe('panelContentHeight viewport cap', () => {
  it('caps at 90% of a phone viewport', () => {
    expect(panelContentHeight('users', 40, 812)).toBeCloseTo(730.8, 1);
  });

  it('does not cap below the floor', () => {
    expect(panelContentHeight('users', 0, 812)).toBe(192);
  });

  it('falls back to the absolute ceiling on a tall viewport', () => {
    expect(panelContentHeight('users', 400, 4000)).toBe(1000);
  });

  // The explicit `undefined` is the assertion, not noise: omitting the argument and passing it
  // undefined must agree, which is what lets every existing hub fixture keep calling the two-arg
  // form. Autofixing it away would leave `x === x`.
  it('is unchanged when no viewport is supplied', () => {
    // eslint-disable-next-line unicorn/no-useless-undefined
    expect(panelContentHeight('users', 40)).toBe(panelContentHeight('users', 40, undefined));
  });

  // The floor outranks the viewport cap, not the other way round. Without this the ceiling on a
  // very short viewport lands under PANEL_HEIGHT_BOUNDS.min and a panel reserves less than its
  // own chrome -- the blank-well bug inverted.
  it('keeps the floor on a viewport too short to hold it', () => {
    expect(panelContentHeight('users', 40, 100)).toBe(192);
  });
});
