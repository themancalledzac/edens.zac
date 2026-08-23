import { readFileSync } from 'node:fs';
import path from 'node:path';

import { ROW_PADDING_Y } from '@/app/components/ListPanel/listPanelShape';

/**
 * Source-level invariants for the panel subtree.
 *
 * These read the stylesheets as text on purpose. Every rule here is about something the panel's
 * height model assumes, and none of it can be caught in jsdom: `next/jest` stubs CSS modules, so a
 * component test sees class names and no declarations at all. A test that asked jsdom whether a
 * row is 40px tall would pass against any stylesheet whatsoever.
 *
 * What binds them together is that the layout packer reserves a panel's height BEFORE the panel
 * renders, from `listPanelShape.ts`. Every rule below is a way that reservation could silently
 * stop matching what renders -- silently because a desync produces no error, no warning and no
 * failing assertion, just a blank well under a panel or a row clipped off the bottom of one.
 */
const PANEL_SCSS = [
  'app/components/ListPanel/ListPanel.module.scss',
  'app/components/UserManagementPanel/UserManagementPanel.module.scss',
  'app/components/MessagesPanel/MessagesPanel.module.scss',
  'app/components/RolesPanel/RolesPanel.module.scss',
  'app/components/CollectionsPanel/CollectionsPanel.module.scss',
];

const read = (file: string) => readFileSync(path.join(process.cwd(), file), 'utf8');

describe('panel subtree rules', () => {
  // A row's height must not depend on the panel's width, and a breakpoint is the most direct way
  // to make it depend on one. The packer hands every panel a width of its own choosing, so a rule
  // that fires at some viewport is a rule that fires for one panel and not its neighbour.
  it.each(PANEL_SCSS)('%s contains no media or container query', file => {
    expect(read(file)).not.toMatch(/@media|@container/);
  });

  // This one stops a specific plausible "fix": capping a panel with `max-height: 90vh` in CSS.
  // The viewport cap is real, but it lives in `panelContentHeight` where the packer can see it --
  // expressed in CSS instead, the reserved box and the rendered box disagree by whatever the cap
  // removed.
  it.each(PANEL_SCSS)('%s uses no viewport units', file => {
    expect(read(file)).not.toMatch(/\d\s*(vh|vw|dvh|svh)\b/);
  });
});

describe('ListPanel rails', () => {
  const css = read('app/components/ListPanel/ListPanel.module.scss');

  /**
   * Reads one declaration out of one top-level rule. `[^}]` already spans newlines, so no `s` flag
   * is needed -- and the same class is what bounds the match to the rule's own body rather than
   * letting it run into a nested `&:hover` further down the file.
   */
  const declarationOf = (selector: string, property: string) =>
    css.match(new RegExp(`\\n\\${selector} \\{[^}]*?${property}:([^;]+);`))?.[1]?.trim();

  const rowPadding = () => declarationOf('.row', 'padding');

  /**
   * The header and the row must declare the SAME column tracks. This is the component's entire
   * reason for existing: header controls used to sit at a 17px inset and row controls at 33px, and
   * one shared rail is what makes that misalignment unavailable rather than fixed-for-now.
   *
   * Compared as declarations because there is nowhere else to compare them. jsdom has no cascade,
   * and the two rules are what the browser resolves against each other.
   */
  it('resolves the header and the row against the same columns', () => {
    const header = declarationOf('.header', 'grid-template-columns');
    const row = declarationOf('.row', 'grid-template-columns');
    expect(header).toBe('1fr auto auto');
    expect(row).toBe(header);
  });

  /**
   * `.row`'s block padding and `ROW_PADDING_Y` are one number written in two languages, and this
   * is the seam where they can drift. The packer reserves the TypeScript one; the browser renders
   * the SCSS one; nothing but this test connects them.
   *
   * The `+ 1` is the row separator, which is part of the reserved height for the same reason the
   * padding is: it occupies space the packer has to have accounted for.
   */
  it('keeps ROW_PADDING_Y in step with the row padding it stands for', () => {
    const SPACE = { '--space-1': 4, '--space-2': 8, '--space-3': 12, '--space-4': 16 };
    const padding = rowPadding();
    expect(padding).toBeDefined();

    const parts = padding!.split(/\s+/).map(p => {
      const token = p.match(/var\((--space-\d)\)/)?.[1] as keyof typeof SPACE | undefined;
      return token ? SPACE[token] : Number(p);
    });
    // `padding: <top> <inline> <bottom>` -- the row insets nothing horizontally, .list does.
    const [top, inline, bottom] = parts;
    expect(parts).toHaveLength(3);
    expect(inline).toBe(0);

    const SEPARATOR = 1;
    expect(top! + bottom! + SEPARATOR).toBe(ROW_PADDING_Y);
  });

  /**
   * The density pass, pinned as a direction rather than a pair of numbers. The bottom padding is
   * smaller because the separator underneath already performs that separation; the top padding has
   * no such partner. Restoring symmetry would silently give back the 4px per row this reclaimed.
   */
  it('pads a row less below than above', () => {
    expect(rowPadding()).toBe('var(--space-2) 0 var(--space-1)');
  });
});
