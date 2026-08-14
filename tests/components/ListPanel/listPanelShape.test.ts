import {
  panelChromeHeight,
  rowHeight,
  type RowShape,
} from '@/app/components/ListPanel/listPanelShape';

/**
 * The three live panels, as the shapes they declare. These are the calibration fixtures for
 * `listPanelShape` -- 75 / 86 / 36.5 are the packer's current contract, so a model that stops
 * reproducing them is wrong. Fix the model, never these numbers.
 *
 * Users needs no residual: its shape and its rendered row already agree. The other two carry one
 * because they have not been migrated onto `ListPanel` yet, so their declared shape describes the
 * row they are becoming while the pinned height is what they measure today. Both residuals are
 * retired in Task 8.
 */
const USERS_ROW: RowShape = {
  left: ['header', 'subheader'],
  right: ['button', 'button'],
};

/**
 * +21: the Messages row does not split into two sections yet. Its three blocks -- meta, body and
 * actions -- still stack in ONE column, so the row is the whole stack (17 + 17 + 27 plus two
 * `--space-1` gaps = 69) rather than the taller of two sections (48). 69 - 48 = 21.
 */
const MESSAGES_ROW: RowShape = {
  left: ['header', 'subheader'],
  right: ['subheader', 'button'],
  heightAdjustment: 21,
};

/**
 * -7.5: the Roles row inverts its padding. `.row` has none and `.rowMain` carries `--space-2`, so
 * the row's 16px of block padding wraps only the name. That makes its bare `x` delete glyph --
 * a `--space-6` (32px) square with `line-height: 1`, no padding and no border, not a `Button sm`
 * -- compete against the PADDED 35.5px name block and lose: max(35.5, 32) + 1px rule = 36.5. The
 * declared shape instead pads outside both sections and reads the glyph as a 27px `button`,
 * giving 44. `ListPanel.row` takes ownership of the padding in Task 7.
 */
const ROLES_ROW: RowShape = { left: ['header'], right: ['button'], heightAdjustment: -7.5 };

describe('rowHeight', () => {
  it('reproduces the measured Users row height', () => {
    expect(rowHeight(USERS_ROW)).toBeCloseTo(75, 1);
  });

  it('reproduces the measured Messages row height', () => {
    expect(rowHeight(MESSAGES_ROW)).toBeCloseTo(86, 1);
  });

  it('reproduces the measured Roles row height', () => {
    expect(rowHeight(ROLES_ROW)).toBeCloseTo(36.5, 1);
  });

  it('takes the tallest section, not the first', () => {
    expect(rowHeight({ left: ['header'], right: ['button', 'button'] })).toBeGreaterThan(
      rowHeight({ left: ['header'], right: ['button'] })
    );
  });

  // Spread rather than re-declared so the two sides differ ONLY by the empty middle -- otherwise
  // this passes or fails on whether the literal happens to carry the same residual.
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
