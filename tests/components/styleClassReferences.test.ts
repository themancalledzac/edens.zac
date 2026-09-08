/**
 * Every `<binding>.x` a file under `app/` reads must exist in the stylesheet it imports.
 *
 * Read out of the shipping `.module.scss` files rather than a copy of their class lists — a test
 * that restates the rules cannot catch one being deleted.
 *
 * This exists because deleting a rule is exactly the edit that breaks it, and nothing else
 * notices. CSS modules resolve a missing key to `undefined`, React drops the attribute, and the
 * element renders unstyled; jsdom cannot see it either, because class names in a test are an
 * identity proxy and never touch the real stylesheet. The panels-only version of this guard was
 * filed after `.loadError` moved out of `RolesPanel.module.scss` and left `RoleDetailView.tsx`
 * pointing at nothing. Widening it to the whole tree immediately found a second instance that
 * had been live for a month: `ff3a3e9c` deleted `.checkboxRow` and `.checkboxLabel` from
 * `InfoTab.module.scss` while `InfoTab.tsx` kept using them.
 *
 * Cases are keyed on the import specifier, not on the binding name. Ten import statements across
 * nine files bind a module to something other than `styles` (`cbStyles`, `modalStyles`,
 * `variantStyles`), and `CollectionContentRenderer.tsx` carries two of them — a guard written
 * against a bare `styles.` regex would skip all of them silently.
 *
 * One blind spot, and it is structural: a dynamic `styles[key]` lookup is invisible here, because
 * the key is not in the source. Nothing short of running the app can see those.
 *
 * The definition side is deliberately over-collected — every `.name` token outside a comment, not
 * a parsed selector list — so this can only fail on a class that is genuinely absent, never on
 * one this file's SCSS parsing failed to understand.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const APP_ROOT = path.join(ROOT, 'app');

const IMPORT_PATTERN = /^import\s+([A-Za-z]\w*)\s+from\s+'([^']+\.module\.scss)'/gm;

/**
 * Expected number of importing files, as a floor rather than an exact count.
 *
 * An exact number would go red on every new component; zero would let a broken glob pass as a
 * clean run, which is the failure this guard cannot afford. 100 was 106 when written.
 */
const MINIMUM_FILES = 100;

/** Drops block and line comments so a class merely NAMED in prose is not read as a definition. */
function stripComments(scss: string): string {
  return scss.replace(/\/\*[\S\s]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ');
}

function definedClasses(scssPath: string): Set<string> {
  const source = stripComments(readFileSync(scssPath, 'utf8'));
  return new Set([...source.matchAll(/\.([A-Za-z][\w-]*)/g)].flatMap(m => (m[1] ? [m[1]] : [])));
}

/** `@/`-rooted specifiers resolve from the repo root, everything else from the importer. */
function resolveSpecifier(specifier: string, importerDir: string): string {
  return specifier.startsWith('@/')
    ? path.join(ROOT, specifier.slice(2))
    : path.join(importerDir, specifier);
}

function referencedClasses(source: string, binding: string): string[] {
  const pattern = new RegExp(String.raw`\b${binding}\.([A-Za-z]\w*)`, 'g');
  return [...source.matchAll(pattern)].flatMap(m => (m[1] ? [m[1]] : []));
}

type Case = readonly [label: string, file: string, binding: string, stylesheet: string];

const cases: Case[] = readdirSync(APP_ROOT, { recursive: true, encoding: 'utf8' })
  .filter(entry => entry.endsWith('.ts') || entry.endsWith('.tsx'))
  .map(entry => path.join(APP_ROOT, entry))
  .sort()
  .flatMap(file => {
    const source = readFileSync(file, 'utf8');
    return [...source.matchAll(IMPORT_PATTERN)].flatMap(match => {
      const [, binding, specifier] = match;
      if (!binding || !specifier) return [];
      const relative = path.relative(ROOT, file);
      const label = binding === 'styles' ? relative : `${relative} [${binding}]`;
      return [[label, file, binding, resolveSpecifier(specifier, path.dirname(file))] as Case];
    });
  });

describe('components only reference classes their stylesheet defines', () => {
  it('collects a case for every importing file in the tree', () => {
    const files = new Set(cases.map(([, file]) => file));
    expect(files.size).toBeGreaterThanOrEqual(MINIMUM_FILES);
  });

  it('covers the imports that bind a module to something other than styles', () => {
    const renamed = cases.filter(([, , binding]) => binding !== 'styles');
    expect(renamed.length).toBeGreaterThanOrEqual(10);
    expect(new Set(renamed.map(([, , binding]) => binding))).toEqual(
      new Set(['cbStyles', 'modalStyles', 'variantStyles'])
    );
  });

  it.each(cases)('%s', (_label, file, binding, stylesheet) => {
    const referenced = referencedClasses(readFileSync(file, 'utf8'), binding);
    if (referenced.length === 0) return;

    const defined = definedClasses(stylesheet);
    const missing = [...new Set(referenced)].filter(name => !defined.has(name)).sort();
    expect(missing).toEqual([]);
  });
});
