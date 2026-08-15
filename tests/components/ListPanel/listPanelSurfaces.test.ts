/**
 * Contrast gate for the `--lp-*` ramp, read out of the shipping stylesheet rather than a copy of
 * the values, so the assertion cannot drift from what renders. That is also why the ramp is
 * declared as literal hex: a `var()` indirection resolves only in a browser, and a static check
 * would have nothing to measure.
 *
 * Both surfaces are checked. The light block is everything before the `[data-surface='dark']`
 * scope; the dark block is everything from it onward. A missing dark block therefore fails as a
 * missing declaration rather than silently re-measuring the light values.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

function srgb(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const n = hex.replace('#', '');
  const full =
    n.length === 3
      ? n
          .split('')
          .map(c => c + c)
          .join('')
      : n;
  const channel = (at: number) => srgb(Number.parseInt(full.slice(at, at + 2), 16));
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

const scss = readFileSync(
  path.join(process.cwd(), 'app/components/ListPanel/ListPanel.module.scss'),
  'utf8'
);

/**
 * Anchored to a rule OPENER rather than the first occurrence of the selector text: the stylesheet
 * discusses `[data-surface='dark']` in prose above the light declarations, and splitting on that
 * mention would hand the light scope an empty string and measure the dark values twice.
 */
const darkAt = scss.search(/^\s*\[data-surface='dark']\s*&?\s*{/m);
const SCOPES: Record<Surface, string> = {
  light: darkAt === -1 ? scss : scss.slice(0, darkAt),
  dark: darkAt === -1 ? '' : scss.slice(darkAt),
};

type Surface = 'light' | 'dark';

function declared(surface: Surface, name: string): string {
  const value = SCOPES[surface].match(new RegExp(`--lp-${name}:\\s*(#[0-9a-fA-F]{3,6})`))?.[1];
  if (value === undefined) {
    throw new Error(`--lp-${name} is not declared as a literal hex on the ${surface} surface`);
  }
  return value;
}

describe.each<Surface>(['light', 'dark'])('ListPanel surface ramp — %s', surface => {
  it('separates the list from the shell perceptibly', () => {
    expect(
      contrast(declared(surface, 'surface-shell'), declared(surface, 'surface-list'))
    ).toBeGreaterThan(1.12);
  });

  it('separates a row from the list it sits in', () => {
    expect(
      contrast(declared(surface, 'surface-list'), declared(surface, 'surface-row'))
    ).toBeGreaterThan(1.12);
  });

  it('makes hover distinguishable from rest', () => {
    expect(
      contrast(declared(surface, 'surface-row'), declared(surface, 'surface-row-hover'))
    ).toBeGreaterThan(1.08);
  });
});
