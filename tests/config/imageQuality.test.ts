/**
 * @jest-environment node
 *
 * Next 16 has no default quality: `next/image` sends 75 when the prop is absent, and the optimizer
 * 400s on anything outside `images.qualities`. So a call site that forgets the prop is a broken
 * image, not a heavier one — a regression no type-check or render test catches. Hence both halves
 * are asserted here: the config matches `IMAGE.quality`, and every optimized `<Image>` passes it.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { IMAGE } from '@/app/constants';

const config = readFileSync(join(process.cwd(), 'next.config.js'), 'utf8');

function readQualities(): number[] {
  const match = /\n\s*qualities:\s*\[([^\]]*)]/.exec(config);
  expect(match).not.toBeNull();
  return (match?.[1] ?? '')
    .split(',')
    .map(entry => Number(entry.trim()))
    .filter(entry => Number.isFinite(entry));
}

/** Every `.tsx` under `app/`, recursively. */
function collectTsxFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collectTsxFiles(full, found);
    else if (entry.name.endsWith('.tsx')) found.push(full);
  }
  return found;
}

/**
 * Blank out block comments, preserving line count. Docblocks here discuss `<Image>` in prose and
 * would otherwise scan as call sites. Line comments are left alone — stripping them would eat the
 * `//` in URL literals.
 */
function blankBlockComments(source: string): string {
  return source.replace(/\/\*[\S\s]*?\*\//g, match => match.replace(/[^\n]/g, ' '));
}

interface ImageTag {
  path: string;
  line: number;
  tag: string;
}

/**
 * Each `<Image ... />` opening tag with its location. Matches the tag name exactly so
 * `<ImageOverlays>` and friends are not mistaken for `next/image`.
 */
function findImageTags(source: string, path: string): ImageTag[] {
  const scannable = blankBlockComments(source);
  const tags: ImageTag[] = [];
  const opening = /<Image(?=[\s/>])/g;
  let match: RegExpExecArray | null;
  while ((match = opening.exec(scannable)) !== null) {
    const end = scannable.indexOf('>', match.index);
    if (end === -1) continue;
    tags.push({
      path,
      line: scannable.slice(0, match.index).split('\n').length,
      tag: scannable.slice(match.index, end + 1),
    });
  }
  return tags;
}

const imageTags = collectTsxFiles(join(process.cwd(), 'app')).flatMap(path =>
  findImageTags(readFileSync(path, 'utf8'), path.replace(`${process.cwd()}/`, ''))
);

/** Call sites spreading a props object; the scan cannot read their quality, so each is asserted
 * separately below. Pinned so a new one fails here instead of escaping the check. */
const SPREAD_CALL_SITES = ['app/components/Content/CollectionContentRenderer.tsx'];

const spreadTags = imageTags.filter(({ tag }) => tag.includes('{...'));
const literalTags = imageTags.filter(({ tag }) => !tag.includes('{...'));

describe('images.qualities', () => {
  it('is configured rather than left to the Next default of [75]', () => {
    expect(readQualities()).not.toEqual([75]);
  });

  it('allows exactly the one quality the call sites send', () => {
    expect(readQualities()).toEqual([IMAGE.quality]);
  });

  it('stays below the Next default, or there is no point to the setting', () => {
    expect(IMAGE.quality).toBeLessThan(75);
  });

  it('stays high enough not to be visibly lossy on a photography site', () => {
    expect(IMAGE.quality).toBeGreaterThanOrEqual(60);
  });
});

describe('every optimized <Image> passes a quality', () => {
  it('finds the call sites at all, so a silent zero-match cannot pass this suite', () => {
    expect(imageTags.length).toBeGreaterThanOrEqual(8);
  });

  it.each(literalTags.filter(({ tag }) => !/\bunoptimized\b/.test(tag)))(
    '$path:$line',
    ({ tag }) => {
      expect(tag).toMatch(/quality=/);
    }
  );
});

describe('spread call sites', () => {
  it('are only the ones with a dedicated assertion below', () => {
    expect([...new Set(spreadTags.map(({ path }) => path))].sort()).toEqual(SPREAD_CALL_SITES);
  });

  it('carry quality on the imageProps object', () => {
    const source = readFileSync(
      join(process.cwd(), 'app/components/Content/CollectionContentRenderer.tsx'),
      'utf8'
    );
    expect(source).toMatch(/const imageProps = {[\S\s]*?quality: IMAGE\.quality,/);
  });
});
