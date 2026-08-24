/**
 * Every `styles.x` a component reads must exist in the stylesheet that component imports.
 *
 * Read out of the shipping `.module.scss` files rather than a copy of their class lists, the same
 * discipline `listPanelSurfaces.test.ts` uses — a test that restates the rules cannot catch one
 * being deleted.
 *
 * This exists because hoisting a shared rule is exactly the edit that breaks it. Moving `.loadError`
 * out of `RolesPanel.module.scss` into the StatusText module left `RoleDetailView.tsx` — a second
 * file importing the same stylesheet — pointing at a class that no longer existed. Nothing failed:
 * CSS modules resolve a missing key to `undefined`, React drops the attribute, and the element
 * renders unstyled. jsdom cannot see it either, because the class names in a test are an identity
 * proxy and never touch the real stylesheet.
 *
 * Scoped to the admin panels and the shared UI they pull from, which is where rules get hoisted
 * between modules. The definition side is deliberately over-collected — every `.name` token outside
 * a comment, not a parsed selector list — so this can only fail on a class that is genuinely absent,
 * never on one this file's SCSS parsing failed to understand.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const COMPONENT_ROOT = path.join(process.cwd(), 'app', 'components');

const DIRS = [
  'CollectionsPanel',
  'MessagesPanel',
  'RolesPanel',
  'UserManagementPanel',
  'ListPanel',
  path.join('ui', 'StatusText'),
];

/** Drops block and line comments so a class merely NAMED in prose is not read as a definition. */
function stripComments(scss: string): string {
  return scss.replace(/\/\*[\S\s]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ');
}

function definedClasses(scssPath: string): Set<string> {
  const source = stripComments(readFileSync(scssPath, 'utf8'));
  return new Set([...source.matchAll(/\.([A-Za-z][\w-]*)/g)].flatMap(m => (m[1] ? [m[1]] : [])));
}

function referencedClasses(tsx: string): string[] {
  return [...tsx.matchAll(/\bstyles\.([A-Za-z]\w*)/g)].flatMap(m => (m[1] ? [m[1]] : []));
}

/** The `.module.scss` a component imports, resolved relative to the component's own directory. */
function importedStylesheet(tsx: string, dir: string): string | null {
  const match = tsx.match(/import\s+styles\s+from\s+'([^']+\.module\.scss)'/);
  return match?.[1] ? path.join(dir, match[1]) : null;
}

const cases = DIRS.flatMap(relativeDir => {
  const dir = path.join(COMPONENT_ROOT, relativeDir);
  return readdirSync(dir)
    .filter(f => f.endsWith('.tsx'))
    .map(file => [path.join(relativeDir, file), path.join(dir, file)] as const);
});

describe('panel components only reference classes their stylesheet defines', () => {
  it('finds a component in every directory it claims to cover', () => {
    for (const relativeDir of DIRS) {
      expect(cases.some(([label]) => label.startsWith(relativeDir))).toBe(true);
    }
  });

  it.each(cases)('%s', (_label, file) => {
    const tsx = readFileSync(file, 'utf8');
    const referenced = referencedClasses(tsx);
    if (referenced.length === 0) return;

    const stylesheet = importedStylesheet(tsx, path.dirname(file));
    expect(stylesheet).not.toBeNull();

    const defined = definedClasses(stylesheet as string);
    const missing = [...new Set(referenced)].filter(name => !defined.has(name)).sort();
    expect(missing).toEqual([]);
  });
});
