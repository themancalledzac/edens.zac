/**
 * Guards MA3 §5.1. The image editor's sheet used to key its stacked-vs-side-by-side layout on
 * width alone, with the photo strip a flat 160px. A landscape phone is under 768px wide but only
 * ~360px tall, so it took the stacked branch and the photo ate 44% of the viewport — measured at
 * 740x360, the scrollable form was left 49.5px, about one and a half rows.
 *
 * jsdom evaluates no media queries and computes no layout, so this asserts against the stylesheet.
 * The regression it exists to catch is someone tidying the condition back to width-only.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const CSS = readFileSync(
  join(process.cwd(), 'app/components/Metadata/MetadataModal.module.scss'),
  'utf8'
);

describe('MetadataModal sheet layout', () => {
  it('should go side-by-side on a short viewport, not only a wide one', () => {
    expect(CSS).toMatch(/@media\s*\(width >= 768px\),\s*\(height <= 480px\)/);
  });

  it('should give the photo its own column on a landscape phone', () => {
    expect(CSS).toMatch(/@media\s*\(width < 768px\) and \(height <= 480px\)/);
  });

  it('should size the stacked photo strip as a fraction of the sheet, not a fixed height', () => {
    const stacked = CSS.slice(CSS.indexOf('.imageSection'));
    expect(stacked).toMatch(/height:\s*clamp\(/);
    expect(stacked).not.toMatch(/height:\s*160px/);
  });
});
