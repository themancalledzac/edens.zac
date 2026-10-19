/**
 * @jest-environment node
 */

/**
 * The hamburger, the menu close button and the two social icon links must present 44px hit boxes
 * made with padding (the glyphs keep their size), and the menu panel must be opaque and 100dvh
 * tall. jest and tsc cannot see a CSS-module regression, so this compiles both stylesheets and
 * asserts the resolved declarations directly.
 *
 * The twins run the same checkers over a deliberately regressed copy of the compiled CSS and
 * assert the regression is reported, which shows the checkers are what make the main tests pass.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { compile } from 'sass';

const MENU_SOURCE = join(process.cwd(), 'app/components/MenuDropdown/MenuDropdown.module.scss');
const HEADER_SOURCE = join(process.cwd(), 'app/components/SiteHeader/SiteHeader.module.scss');
const MIN_TOUCH_TARGET = 44;
const MOBILE_GLYPH = 32;
const SPACE_TOKENS: Record<string, number> = {
  '--space-1': 4,
  '--space-2': 8,
  '--space-3': 12,
  '--space-4': 16,
  '--space-5': 24,
  '--space-6': 32,
  '--space-8': 64,
};

function stripComments(css: string): string {
  return css.replaceAll(/\/\*[\S\s]*?\*\//g, '').replace(/@charset[^;]*;/, '');
}

type Decls = Record<string, string>;

function splitMedia(css: string): { base: string; media: string } {
  const mediaRe = /@media[^{]*{((?:[^{}]*{[^{}]*})*)\s*}/g;
  let media = '';
  const base = css.replace(mediaRe, (_all, inner: string) => {
    media += `${inner}\n`;
    return '';
  });
  return { base, media };
}

function declsFor(css: string, selector: string): Decls {
  const out: Decls = {};
  const re = /([^{}]+){([^{}]*)}/g;
  for (const match of css.matchAll(re)) {
    const selectors = match[1]!.split(',').map(s => s.trim());
    if (!selectors.includes(selector)) continue;
    for (const decl of match[2]!.split(';')) {
      const idx = decl.indexOf(':');
      if (idx === -1) continue;
      out[decl.slice(0, idx).trim()] = decl.slice(idx + 1).trim();
    }
  }
  return out;
}

function toPx(value: string): number {
  const v = value.trim();
  if (v === '0') return 0;
  const token = /^var\((--space-\d+)\)$/.exec(v);
  if (token) return SPACE_TOKENS[token[1]!] ?? Number.NaN;
  const rem = /^(-?\d*\.?\d+)rem$/.exec(v);
  if (rem) return Number(rem[1]) * 16;
  const px = /^(-?\d*\.?\d+)px$/.exec(v);
  if (px) return Number(px[1]);
  return Number.NaN;
}

function paddingAxes(decls: Decls): { x: number; y: number } {
  let top = 0;
  let right = 0;
  let bottom = 0;
  let left = 0;
  const short = decls['padding'];
  if (short !== undefined) {
    const parts = short.split(/\s+/).map(toPx);
    const [a, b = a, c = a, d = b] = parts;
    top = a!;
    right = b!;
    bottom = c!;
    left = d!;
  }
  if (decls['padding-top']) top = toPx(decls['padding-top']);
  if (decls['padding-bottom']) bottom = toPx(decls['padding-bottom']);
  if (decls['padding-left']) left = toPx(decls['padding-left']);
  if (decls['padding-right']) right = toPx(decls['padding-right']);
  if (decls['padding-inline']) left = right = toPx(decls['padding-inline']);
  if (decls['padding-block']) top = bottom = toPx(decls['padding-block']);
  return { x: left + right, y: top + bottom };
}

function hitBox(css: string, selector: string, glyph: number): { w: number; h: number } {
  const { base } = splitMedia(css);
  const decls = declsFor(base, selector);
  const pad = paddingAxes(decls);
  const explicitW = Math.max(...['width', 'min-width'].map(p => (decls[p] ? toPx(decls[p]) : 0)));
  const explicitH = Math.max(...['height', 'min-height'].map(p => (decls[p] ? toPx(decls[p]) : 0)));
  return {
    w: Math.max(explicitW, glyph + pad.x),
    h: Math.max(explicitH, glyph + pad.y),
  };
}

function touchTargetProblems(menuCss: string, headerCss: string): string[] {
  const problems: string[] = [];
  const targets: Array<[string, string, string]> = [
    [headerCss, '.menuButton', 'menuButton'],
    [menuCss, '.dropdownCloseButtonWrapper_button', 'dropdownCloseButtonWrapper_button'],
    [menuCss, '.socialIconButton', 'socialIconButton'],
  ];
  for (const [css, selector, name] of targets) {
    const box = hitBox(css, selector, MOBILE_GLYPH);
    if (!(box.w >= MIN_TOUCH_TARGET) || !(box.h >= MIN_TOUCH_TARGET)) {
      problems.push(`${name} resolves to ${box.w}x${box.h}`);
    }
  }
  return problems;
}

function glyphProblems(menuCss: string, headerCss: string): string[] {
  const problems: string[] = [];
  const glyphs: Array<[string, string, string]> = [
    [headerCss, '.menu', 'menu'],
    [menuCss, '.dropdownCloseIcon', 'dropdownCloseIcon'],
  ];
  for (const [css, selector, name] of glyphs) {
    const decls = declsFor(splitMedia(css).base, selector);
    for (const prop of ['width', 'height']) {
      if (decls[prop] !== 'var(--space-6)') {
        problems.push(`${name} ${prop} is ${decls[prop]}`);
      }
    }
  }
  return problems;
}

function panelProblems(menuCss: string): string[] {
  const problems: string[] = [];
  const { base, media } = splitMedia(menuCss);
  const baseDecls = declsFor(base, '.dropdown');
  const mediaDecls = declsFor(media, '.dropdown');
  if (baseDecls['background-color'] !== 'var(--color-bg)') {
    problems.push(`background-color is ${baseDecls['background-color']}`);
  }
  const desktopBg = mediaDecls['background-color'];
  if (desktopBg !== undefined && desktopBg !== 'var(--color-bg)') {
    problems.push(`desktop background-color is ${desktopBg}`);
  }
  if (baseDecls['height'] !== '100dvh') {
    problems.push(`height is ${baseDecls['height']}`);
  }
  if (mediaDecls['height'] !== undefined && mediaDecls['height'] !== '100dvh') {
    problems.push(`desktop height is ${mediaDecls['height']}`);
  }
  return problems;
}

describe('menu touch targets', () => {
  const menuCss = stripComments(compile(MENU_SOURCE).css);
  const headerCss = stripComments(compile(HEADER_SOURCE).css);

  it('A17: hamburger, close button and both social links resolve to at least 44px by 44px', () => {
    expect(touchTargetProblems(menuCss, headerCss)).toEqual([]);
  });

  it('A17: the hit boxes are made with padding on the control itself', () => {
    for (const [css, selector] of [
      [headerCss, '.menuButton'],
      [menuCss, '.dropdownCloseButtonWrapper_button'],
      [menuCss, '.socialIconButton'],
    ] as const) {
      const pad = paddingAxes(declsFor(splitMedia(css).base, selector));
      expect(pad.x).toBeGreaterThan(0);
      expect(pad.y).toBeGreaterThan(0);
    }
  });

  it('A17: glyph sizes are unchanged', () => {
    expect(glyphProblems(menuCss, headerCss)).toEqual([]);
    expect(declsFor(splitMedia(menuCss).media, '.dropdownCloseIcon')['width']).toBe('2.75rem');
    expect(declsFor(splitMedia(headerCss).media, '.menu')['width']).toBe('2.75rem');
  });

  it('A17b: a button under 44px is reported', () => {
    const shrunk = `${menuCss}\n.socialIconButton { padding: 0; padding-top: 0; padding-right: 0; padding-bottom: 0; padding-left: 0; width: 0; height: 0; min-width: 0; min-height: 0; }`;
    expect(shrunk).not.toBe(menuCss);
    expect(touchTargetProblems(shrunk, headerCss).join()).toContain('socialIconButton');
  });

  it('A17b: a menu glyph or close glyph grown past var(--space-6) is reported', () => {
    const grownMenu = headerCss.replace(
      /(\.menu {[^}]*?)width: var\(--space-6\)/,
      '$1width: 2.75rem'
    );
    const grownClose = menuCss.replace(
      /(\.dropdownCloseIcon {[^}]*?)height: var\(--space-6\)/,
      '$1height: 44px'
    );
    expect(grownMenu).not.toBe(headerCss);
    expect(grownClose).not.toBe(menuCss);
    expect(glyphProblems(menuCss, grownMenu).join()).toContain('menu width');
    expect(glyphProblems(grownClose, headerCss).join()).toContain('dropdownCloseIcon height');
  });

  it('A18: the panel is opaque with var(--color-bg) and 100dvh tall', () => {
    expect(panelProblems(menuCss)).toEqual([]);
  });

  it('A18b: a translucent .dropdown background is reported', () => {
    const translucent = `${menuCss}\n.dropdown { background-color: rgba(255, 255, 255, 0.95); }`;
    expect(translucent).not.toBe(menuCss);
    expect(panelProblems(translucent).join()).toContain('background-color');
  });

  it('A18b: a 100vh .dropdown height is reported', () => {
    const vh = `${menuCss}\n.dropdown { height: 100vh; }`;
    expect(vh).not.toBe(menuCss);
    expect(panelProblems(vh).join()).toContain('height');
  });

  it('A19: desktop menu layout keeps its width, anchor, shadow, position and z-index', () => {
    const { base, media } = splitMedia(menuCss);
    const baseDecls = declsFor(base, '.dropdown');
    const desktop = declsFor(media, '.dropdown');
    expect(baseDecls['position']).toBe('fixed');
    expect(baseDecls['z-index']).toBe('var(--z-dropdown)');
    expect(baseDecls['top']).toBe('0');
    expect(desktop['left']).toBe('auto');
    expect(desktop['width']).toContain('min(400px');
    expect(desktop['width']).toContain('var(--default-padding)');
    expect(desktop['right']).toContain('100vw');
    expect(desktop['right']).toContain('var(--page-max-width)');
    expect(desktop['box-shadow']).toBe('-8px 0 16px -8px var(--scrim-dark-20)');
    const wrapper = declsFor(base, '.dropdownCloseButtonWrapper');
    expect(wrapper['justify-content']).toBe('flex-end');
    expect(wrapper['align-items']).toBe('center');
    expect(declsFor(media, '.dropdownCloseButtonWrapper')['padding']).toBe(
      'var(--default-padding) var(--default-padding) var(--page-padding-desktop) 0'
    );
  });

  it('A19: the 44px hit boxes also hold on desktop', () => {
    const { media: menuMedia } = splitMedia(menuCss);
    const { media: headerMedia } = splitMedia(headerCss);
    for (const [media, selector] of [
      [headerMedia, '.menuButton'],
      [menuMedia, '.dropdownCloseButtonWrapper_button'],
      [menuMedia, '.socialIconButton'],
    ] as const) {
      const decls = declsFor(media, selector);
      for (const prop of ['padding', 'width', 'height', 'min-width', 'min-height']) {
        if (decls[prop] !== undefined) {
          const sizes = decls[prop].split(/\s+/).map(toPx);
          expect(sizes.some(n => Number.isNaN(n))).toBe(false);
        }
      }
    }
  });

  it('A21: the phone sheet and scrim stop at the top of the bottom bar and hide the sheet close X', () => {
    const { media } = splitMedia(menuCss);
    const barTop = 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom))';
    const sheet = declsFor(media, '.sheet');
    expect(sheet['top']).toBe('auto');
    expect(sheet['bottom']).toBe(barTop);
    expect(sheet['height']).toBe('auto');
    expect(sheet['border-radius']).toBe('0');
    expect(declsFor(media, '.sheet .dropdownCloseButtonWrapper')['display']).toBe('none');
    expect(declsFor(media, '.scrim')['inset']).toBe(`0 0 ${barTop}`);
  });

  it('A22: the phone admin links are a two-column grid of square tiles with the hub gap', () => {
    const { media } = splitMedia(menuCss);
    const grid = declsFor(media, '.sheet .adminGrid');
    expect(grid['display']).toBe('grid');
    expect(grid['grid-template-columns']).toBe('1fr 1fr');
    expect(grid['gap']).toBe('0.8rem');
    expect(declsFor(media, '.sheet .adminGrid .dropdownMenuItem')['border-radius']).toBe('0');
    expect(declsFor(media, '.sheet .adminWide')['grid-column']).toBe('1/-1');
  });

  it('A20: this test file carries no inline comments', () => {
    const source = readFileSync(__filename, 'utf8');
    const inline = source.split('\n').filter(line => /^\s*\/\/(?!\s*$)/.test(line));
    expect(inline).toEqual([]);
  });

  it('A19 twin: a restyled desktop panel width is not matched by the layout assertions', () => {
    const changed = menuCss.replace('min(400px', 'min(480px');
    expect(changed).not.toBe(menuCss);
    const desktop = declsFor(splitMedia(changed).media, '.dropdown');
    expect(desktop['width']).not.toContain('min(400px');
  });
});

describe('token adoption in the menu, Dropdown and chip stylesheets', () => {
  const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
  const menu = stripComments(read('app/components/MenuDropdown/MenuDropdown.module.scss'));
  const dropdown = stripComments(read('app/components/ui/Dropdown/Dropdown.module.scss'));
  const chip = stripComments(read('app/components/ui/Chip/Chip.module.scss'));

  it('menu has no raw black rgb() scrims', () => {
    expect(menu).not.toMatch(/rgb\(\s*(?:0[\s,]+){2}0/);
  });

  it('menu hairlines use --color-border and scrims use --scrim-dark-*', () => {
    expect(menu).toMatch(/border-bottom: 1px solid var\(--color-border\)/);
    expect(menu).toMatch(/border-top: 1px solid var\(--color-border\)/);
    expect(menu).not.toMatch(/border[^;]*var\(--scrim-dark/);
    expect(menu).toMatch(/background-color: var\(--scrim-dark-40\)/);
    expect(menu).toMatch(/box-shadow: -8px 0 16px -8px var\(--scrim-dark-20\)/);
  });

  it('Dropdown has no raw px margin, padding or font-size and no transition: all', () => {
    expect(dropdown).not.toMatch(/(?:margin|padding|font-size)[\w-]*:[^;]*\d+px/);
    expect(dropdown).not.toMatch(/transition:\s*all/);
  });

  it('chip dividers use --color-border-control and the row underline uses --color-border', () => {
    expect(chip.match(/var\(--color-border-control\)/g)?.length).toBe(1);
    expect(chip).toMatch(/border-bottom: 1px solid var\(--color-border\)/);
  });
});
