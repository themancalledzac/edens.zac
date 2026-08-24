/**
 * Cache-tag drift guard (E11).
 *
 * A cache tag has two halves that live in different files: a `next: { tags: [...] }` on a fetch
 * registers it, and a POST to `/api/revalidate` invalidates it. Nothing pairs them. When they drift
 * apart the failure is completely silent — `revalidateTag` on a tag no fetch registered throws
 * nothing and logs nothing, and a registered tag nobody revalidates just serves stale data until
 * `TIMING.revalidateCache` expires. C4 found six such drifts by hand.
 *
 * This test reads both halves out of the source at run time and asserts they agree. It is a text
 * scan rather than a type, because three of the registered tags are template strings
 * (`collection-${slug}`), so no compile-time check can pair a registration with a revalidation.
 * The goal is detectable drift, not impossible drift.
 *
 * Templates are the whole difficulty, not an edge case. C4's own audit compared literals and
 * concluded `collection-home` was dead, when it is `collection-${slug}` resolved for the home
 * collection. A check that compares two sets of literal strings reproduces exactly that false
 * positive and fails the build over a working tag, so {@link isRegistered} matches a literal
 * against template prefixes too.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

/** Files whose `next: { tags: [...] }` options register cache tags. */
const REGISTRATION_SOURCES = ['app/lib/api/collections.ts', 'app/lib/api/content.ts'] as const;

/** The only file that names cache tags to revalidate. `/api/revalidate` takes its tags from the request. */
const REVALIDATION_SOURCE = 'app/components/ContentCollection/edit/collectionEditUtils.ts';

/** Functions inside {@link REVALIDATION_SOURCE} that POST tags. Scoped so unrelated `tags:` keys are not scanned. */
const REVALIDATION_FUNCTIONS = ['revalidateCollectionCache', 'revalidateMetadataCache'] as const;

/**
 * Tags that are deliberately one-sided. Every entry needs a reason and a route out — an allowlist
 * without either becomes a place to hide drift.
 */
const ONE_SIDED_BY_DESIGN: Record<string, string> = {
  'collections-location-${slug}':
    'Registered by getCollectionsByLocation, revalidated by nothing. Location pages serve stale ' +
    'lists for up to TIMING.revalidateCache after a collection edit. Wiring it up needs the ' +
    'previous-union-next location slugs at edit time; see the C4 report in ' +
    'docs/spikes/2026-summer-refactor.md.',
};

/** A cache tag exactly as it is written in source. */
interface SourceTag {
  /** The tag text, e.g. `content-tags` or `collection-${slug}`. */
  raw: string;
  /** Repo-relative file it was found in. */
  file: string;
  /** True when the tag interpolates a runtime value and cannot be compared as a literal. */
  isTemplate: boolean;
  /** Text before the first `${`. For a literal this is the whole tag. */
  prefix: string;
}

const TEMPLATE_HOLE = /\${[^}]*}/;

function toSourceTag(raw: string, file: string): SourceTag {
  const holeAt = raw.search(TEMPLATE_HOLE);
  return {
    raw,
    file,
    isTemplate: holeAt !== -1,
    prefix: holeAt === -1 ? raw : raw.slice(0, holeAt),
  };
}

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), 'utf8');
}

/** Pulls the quoted entries out of an array literal body, ignoring spreads and identifiers. */
function stringEntries(arrayBody: string): string[] {
  return [...arrayBody.matchAll(/'([^']*)'|`([^`]*)`|"([^"]*)"/g)].map(
    match => match[1] ?? match[2] ?? match[3] ?? ''
  );
}

/** Every tag registered by a `next: { tags: [...] }` fetch option. */
function collectRegistered(): SourceTag[] {
  const found: SourceTag[] = [];
  for (const file of REGISTRATION_SOURCES) {
    const source = read(file);
    for (const match of source.matchAll(/next:\s*{[^}]*?tags:\s*\[([^\]]*)]/g)) {
      for (const raw of stringEntries(match[1] ?? '')) found.push(toSourceTag(raw, file));
    }
  }
  return found;
}

/** Isolates one function body so unrelated `tags:` keys elsewhere in the file are not scanned. */
function functionBody(source: string, name: string): string {
  const start = source.indexOf(`export async function ${name}`);
  if (start === -1) {
    throw new Error(
      `[cache-tag drift] Could not find "export async function ${name}" in ${REVALIDATION_SOURCE}. ` +
        'The scanner is stale — update REVALIDATION_FUNCTIONS rather than deleting this test.'
    );
  }
  const end = source.indexOf('\n}\n', start);
  return source.slice(start, end === -1 ? source.length : end);
}

/** Every tag named for revalidation, from both `{ tag: 'x' }` and `{ tags: ['x', 'y'] }` shapes. */
function collectRevalidated(): SourceTag[] {
  const source = read(REVALIDATION_SOURCE);
  const found: SourceTag[] = [];
  for (const name of REVALIDATION_FUNCTIONS) {
    const body = functionBody(source, name);
    for (const match of body.matchAll(/\btag:\s*(?:'([^']*)'|`([^`]*)`|"([^"]*)")/g)) {
      found.push(toSourceTag(match[1] ?? match[2] ?? match[3] ?? '', REVALIDATION_SOURCE));
    }
    for (const match of body.matchAll(/\btags:\s*\[([^\]]*)]/g)) {
      for (const raw of stringEntries(match[1] ?? '')) {
        found.push(toSourceTag(raw, REVALIDATION_SOURCE));
      }
    }
  }
  return found;
}

/**
 * True when `tag` is covered by some registration.
 *
 * The template branch is what keeps `collection-home` from being reported as dead: it is a literal
 * on the revalidate side and a template, `collection-${slug}`, on the register side. Matching by
 * prefix pairs them. Delete this branch and the test fails on a working tag.
 */
function isRegistered(tag: SourceTag, registered: SourceTag[]): boolean {
  return registered.some(candidate => {
    if (!candidate.isTemplate && !tag.isTemplate) return candidate.raw === tag.raw;
    if (candidate.prefix === '') return false;
    return tag.raw.startsWith(candidate.prefix) || candidate.raw.startsWith(tag.prefix);
  });
}

function isRevalidated(tag: SourceTag, revalidated: SourceTag[]): boolean {
  return revalidated.some(candidate => {
    if (!candidate.isTemplate && !tag.isTemplate) return candidate.raw === tag.raw;
    if (tag.prefix === '') return false;
    return candidate.raw.startsWith(tag.prefix) || tag.raw.startsWith(candidate.prefix);
  });
}

describe('cache tag drift', () => {
  const registered = collectRegistered();
  const revalidated = collectRevalidated();

  /**
   * A scanner that silently matches nothing would make every assertion below pass vacuously, which
   * is worse than having no test. These floors fail the moment the source shape changes under it.
   */
  it('should actually find both halves, so the assertions below are not vacuous', () => {
    expect(registered.length).toBeGreaterThanOrEqual(6);
    expect(revalidated.length).toBeGreaterThanOrEqual(4);
    expect(registered.some(tag => tag.isTemplate)).toBe(true);
  });

  it('should revalidate no tag that nothing registers', () => {
    const orphans = revalidated.filter(tag => !isRegistered(tag, registered));

    expect(
      orphans.map(
        tag =>
          `${tag.raw} is revalidated in ${tag.file} but no next:{tags} registers it. ` +
          'revalidateTag on an unknown tag fails silently, so this line does nothing. ' +
          'Either delete it, or register the tag on the fetch whose data it should invalidate.'
      )
    ).toEqual([]);
  });

  it('should revalidate every registered tag, or list it as one-sided on purpose', () => {
    const unrevalidated = registered
      .filter(tag => !isRevalidated(tag, revalidated))
      .filter(tag => !(tag.raw in ONE_SIDED_BY_DESIGN));

    expect(
      unrevalidated.map(
        tag =>
          `${tag.raw} is registered in ${tag.file} but nothing revalidates it, so its data stays ` +
          'stale until TIMING.revalidateCache expires. Revalidate it on edit, or add it to ' +
          'ONE_SIDED_BY_DESIGN with the reason and what wiring it up would take.'
      )
    ).toEqual([]);
  });

  it('should keep no stale entry in the one-sided allowlist', () => {
    const stale = Object.keys(ONE_SIDED_BY_DESIGN).filter(raw => {
      const entry = registered.find(tag => tag.raw === raw);
      if (!entry) return true;
      return isRevalidated(entry, revalidated);
    });

    expect(
      stale.map(
        raw =>
          `${raw} is in ONE_SIDED_BY_DESIGN but is no longer one-sided — it is either revalidated ` +
          'now or no longer registered. Remove the entry so the allowlist keeps meaning something.'
      )
    ).toEqual([]);
  });

  /**
   * Pins the exact false positive C4 hit. `collection-home` is revalidated as a literal and
   * registered only as `collection-${slug}`, so a literal-to-literal comparison calls it dead and
   * deletes a working tag.
   */
  it('should pair collection-home with the collection-${slug} template', () => {
    const homeTag = revalidated.find(tag => tag.raw === 'collection-home');
    expect(homeTag).toBeDefined();
    expect(isRegistered(homeTag as SourceTag, registered)).toBe(true);

    const literalOnly = registered.some(tag => tag.raw === 'collection-home');
    expect(literalOnly).toBe(false);
  });
});
