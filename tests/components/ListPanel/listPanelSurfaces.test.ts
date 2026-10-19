/**
 * Stylesheet gate for the re-skinned ListPanel, read out of the shipping SCSS rather than a copy
 * of it. The grey `--lp-*` surface ramp, the dead `[data-surface='dark']` block and the
 * `.isCollapsed::after` sliver are gone; this fails when any of them is put back. Each detector
 * is also run over a stylesheet with the offender injected, so the gate is shown to bite.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { COLLAPSED_PANEL_HEIGHT } from '@/app/(site)/(admin)/admin/adminHubContent';
import {
  panelChromeHeight,
  ROW_PADDING_Y,
  rowHeight,
} from '@/app/components/ListPanel/listPanelShape';

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), 'utf8');

const scss = read('app/components/ListPanel/ListPanel.module.scss');

function stripComments(source: string): string {
  return source.replaceAll(/\/\*[\S\s]*?\*\//g, '').replaceAll(/^\s*\/\/.*$/gm, '');
}

const hasSurfaceVariable = (source: string) => /--lp-surface-[\w-]+/.test(stripComments(source));
const hasDarkBlock = (source: string) => /\[data-surface=["']dark["']]/.test(stripComments(source));
const hasCollapsedSliver = (source: string) =>
  /\.isCollapsed\s*::after/.test(stripComments(source)) ||
  /\.isCollapsed\s*{[^}]*&\s*::after/.test(stripComments(source));
const hasBorderRowRamp = (source: string) => /--lp-border-row/.test(stripComments(source));

function rule(source: string, selector: string): string {
  const clean = stripComments(source);
  const start = clean.search(new RegExp(`^${selector.replaceAll('.', '\\.')}\\s*{`, 'm'));
  if (start === -1) return '';
  const open = clean.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < clean.length; i++) {
    if (clean[i] === '{') depth++;
    if (clean[i] === '}') depth--;
    if (depth === 0) return clean.slice(open, i + 1);
  }
  return clean.slice(open);
}

describe('ListPanel stylesheet — re-skin (A1)', () => {
  it('has no --lp-surface-* variable', () => {
    expect(hasSurfaceVariable(scss)).toBe(false);
  });

  it("has no [data-surface='dark'] block", () => {
    expect(hasDarkBlock(scss)).toBe(false);
  });

  it('has no .isCollapsed::after sliver', () => {
    expect(hasCollapsedSliver(scss)).toBe(false);
  });

  it('keeps the --lp-slot-button height variable', () => {
    expect(scss).toMatch(/--lp-slot-button:\s*27px/);
  });

  it('separates rows with one --color-border hairline', () => {
    const row = rule(scss, '.row');
    expect(row).toMatch(/border-bottom:\s*1px solid var\(--color-border\)/);
    expect(hasBorderRowRamp(scss)).toBe(false);
  });

  it('paints no grey ramp background on the panel, list or row', () => {
    for (const selector of ['.panel', '.list', '.row']) {
      expect(rule(scss, selector)).not.toMatch(/--lp-surface/);
    }
  });

  it('pads the row 8/8 and hovers with --color-overlay-soft', () => {
    const row = rule(scss, '.row');
    expect(row).toMatch(/padding:\s*var\(--space-2\)\s+0(\s+var\(--space-2\))?\s*;/);
    expect(row).not.toMatch(/var\(--space-1\)/);
    expect(stripComments(scss)).toMatch(/:hover[^{]*{[^}]*--color-overlay-soft/);
  });

  it('has a zero-padding body and a header padded --space-2 --space-3', () => {
    expect(rule(scss, '.body')).toMatch(/padding:\s*0\s*;/);
    expect(rule(scss, '.header')).toMatch(/padding:\s*var\(--space-2\)\s+var\(--space-3\)/);
  });
});

describe('ListPanel stylesheet — gate bites (A2)', () => {
  it('flags a put-back --lp-surface-* variable', () => {
    expect(hasSurfaceVariable(`${scss}\n.panel { --lp-surface-list: #d5dae0; }`)).toBe(true);
  });

  it("flags a put-back [data-surface='dark'] block", () => {
    expect(hasDarkBlock(`${scss}\n[data-surface='dark'] & { color: red; }`)).toBe(true);
  });

  it('flags a put-back .isCollapsed::after rule', () => {
    expect(hasCollapsedSliver(`${scss}\n.isCollapsed::after { content: ''; }`)).toBe(true);
  });

  it('does not flag the same names mentioned only in comments', () => {
    expect(hasSurfaceVariable('/* --lp-surface-list */\n.a { color: red; }')).toBe(false);
  });
});

describe('ListPanel shape matches the stylesheet (A3)', () => {
  it('reserves 17px of row padding and rule', () => {
    expect(ROW_PADDING_Y).toBe(17);
  });

  it('derives a one-line row from the header slot', () => {
    expect(rowHeight({ left: ['header'], right: ['meta'] })).toBe(17 + 17);
  });

  it('collapses to exactly the chrome height with no body sliver', () => {
    const header = { left: ['header'], right: ['button'] } as const;
    expect(COLLAPSED_PANEL_HEIGHT).toBe(
      panelChromeHeight({ left: [...header.left], right: [...header.right] })
    );
  });

  it('chrome carries no body padding', () => {
    expect(panelChromeHeight({ left: ['button'] }) - panelChromeHeight({ left: [] })).toBe(27);
    expect(panelChromeHeight({ left: [] })).toBe(2 + 16 + 1);
  });
});

describe('No inline comments in function bodies (M7)', () => {
  const inlineComment = (source: string) =>
    source.split('\n').some(line => /^\s{4,}(\/\/|\/\*(?!\*))/.test(line) || /{\s*\/\*/.test(line));

  it.each(['ListPanel.tsx', 'ListDetailSheet.tsx'])('%s has none', file => {
    expect(inlineComment(read(`app/components/ListPanel/${file}`))).toBe(false);
  });

  it('detector flags an injected inline comment', () => {
    expect(inlineComment('function f() {\n    // why\n  return 1;\n}')).toBe(true);
  });
});
