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

type ReadSource = (file: string) => string;

const STYLES_PROP_PATTERN = /<([A-Z]\w*)\b(?:=>|[^<>])*?\bstyles={(\w+)}/g;

const IMPORT_STATEMENT = /^import\s+([^"';]+?)\s+from\s+'([^']+)'/gm;

/**
 * Maps every local binding an import statement introduces, default or named, to its specifier.
 * `type` modifiers are skipped and `a as b` binds `b`.
 */
function importedBindings(source: string): Map<string, string> {
  const bindings = new Map<string, string>();
  for (const m of source.matchAll(IMPORT_STATEMENT)) {
    const [, clause, specifier] = m;
    if (!clause || !specifier) continue;
    const named = /{([^}]*)}/.exec(clause);
    const defaultPart = clause
      .replace(/{[^}]*}/, '')
      .replace(/,/g, ' ')
      .trim();
    const names = [
      ...(defaultPart && !defaultPart.startsWith('*') && defaultPart !== 'type'
        ? [defaultPart.replace(/^type\s+/, '')]
        : []),
      ...(named?.[1] ?? '')
        .split(',')
        .map(part => part.trim().replace(/^type\s+/, ''))
        .filter(Boolean)
        .map(part => part.split(/\s+as\s+/).pop() ?? part),
    ];
    for (const name of names) bindings.set(name, specifier);
  }
  return bindings;
}

/**
 * Classes `callerSource` hands to a component through `styles={<binding>}` that the component reads
 * off its styles prop but the passed stylesheet does not define.
 *
 * `defined` is the lookup from a stylesheet path to its class names; the twin swaps it for one that
 * accepts everything.
 */
function propPassedMissing(
  callerSource: string,
  callerDir: string,
  readSource: ReadSource,
  defined: (stylesheet: string) => Set<string> | null
): string[] {
  const imports = importedBindings(callerSource);
  const missing: string[] = [];
  for (const m of callerSource.matchAll(STYLES_PROP_PATTERN)) {
    const [, component, binding] = m;
    if (!component || !binding) continue;
    const componentSpecifier = imports.get(component);
    const stylesheetSpecifier = imports.get(binding);
    if (!componentSpecifier || !stylesheetSpecifier) continue;
    const componentFile = resolveSpecifier(componentSpecifier, callerDir);
    const read = referencedClasses(readSource(componentFile), 'styles');
    const names = defined(resolveSpecifier(stylesheetSpecifier, callerDir));
    if (!names) continue;
    missing.push(...read.filter(name => !names.has(name)));
  }
  return [...new Set(missing)].sort();
}

const PRE_FIX_CALLER = [
  "import Row from './Row';",
  "import styles from './Comments.module.scss';",
  'export const X = () => <Row styles={styles} />;',
].join('\n');

const PRE_FIX_COMPONENT = 'export const Row = ({ styles }) => <a className={styles.email} />;';

const virtualFiles: Record<string, string> = {
  '/virtual/Row': PRE_FIX_COMPONENT,
  '/virtual/Row.tsx': PRE_FIX_COMPONENT,
};

const readVirtual: ReadSource = file => virtualFiles[file] ?? virtualFiles[`${file}.tsx`] ?? '';

const virtualDefined = (stylesheet: string): Set<string> | null =>
  stylesheet.endsWith('Comments.module.scss') ? new Set(['row', 'list']) : null;

describe('classes read off a styles prop are checked against the passing file stylesheet', () => {
  it('A12: the pre-fix shape (stylesheet without .email, component reads styles.email) reports email', () => {
    const missing = propPassedMissing(PRE_FIX_CALLER, '/virtual', readVirtual, virtualDefined);
    expect(missing).toContain('email');
  });

  it('A12: a stylesheet that defines the class is clean', () => {
    const missing = propPassedMissing(
      PRE_FIX_CALLER,
      '/virtual',
      readVirtual,
      () => new Set(['email'])
    );
    expect(missing).toEqual([]);
  });

  it('A12 twin: with the stylesheet check let everything through the pre-fix shape goes unreported', () => {
    const letEverythingThrough = () => new Set(['email', 'row', 'list']);
    const missing = propPassedMissing(
      PRE_FIX_CALLER,
      '/virtual',
      readVirtual,
      letEverythingThrough
    );
    expect(missing).not.toContain('email');
  });

  it('A12: the styles-prop detector matches a rendered component passing a binding', () => {
    const matches = [...PRE_FIX_CALLER.matchAll(STYLES_PROP_PATTERN)];
    expect(matches.map(m => [m[1], m[2]])).toEqual([['Row', 'styles']]);
  });

  it('A12: every real file passing styles={binding} supplies the classes its component reads', () => {
    const failures: string[] = [];
    for (const [label, file] of cases.map(([l, f]) => [l, f] as const)) {
      const source = readFileSync(file, 'utf8');
      if (!/\bstyles={\w+}/.test(source)) continue;
      const read: ReadSource = f => {
        for (const candidate of [f, `${f}.tsx`, `${f}.ts`, path.join(f, 'index.tsx')]) {
          try {
            return readFileSync(candidate, 'utf8');
          } catch {
            continue;
          }
        }
        return '';
      };
      const missing = propPassedMissing(source, path.dirname(file), read, stylesheet => {
        try {
          return definedClasses(stylesheet);
        } catch {
          return null;
        }
      });
      if (missing.length > 0) failures.push(`${label}: ${missing.join(', ')}`);
    }
    expect(failures).toEqual([]);
  });
});

const HUB_CALLER = [
  "import { ListPanel, ListRow, ListRows } from './ListPanel';",
  "import { MessageRowLeft, MessageRowRight } from './MessageRow';",
  "import styles from './MessagesPanel.module.scss';",
  'export const Hub = () => (',
  '  <ListRows>',
  '    <ListRow',
  '      key={m.id}',
  '      left={<MessageRowLeft message={m} styles={styles} excerptWords={10} />}',
  '      right={',
  '        <MessageRowRight',
  '          message={m}',
  '          styles={styles}',
  '        />',
  '      }',
  '    />',
  '  </ListRows>',
  ');',
].join('\n');

const HUB_SOURCES: Record<string, string> = {
  '/virtual/ListPanel': 'export const ListRow = ({ left }) => left;',
  '/virtual/MessageRow':
    'export const MessageRowLeft = ({ styles }) => <a className={styles.email} />;\n' +
    'export const MessageRowRight = ({ styles }) => <p className={styles.body} />;',
};

const readHub: ReadSource = file => HUB_SOURCES[file] ?? '';

const hubDefined = (stylesheet: string): Set<string> | null =>
  stylesheet.endsWith('MessagesPanel.module.scss') ? new Set(['error', 'body']) : null;

describe('A12: the b1164134 MessagesPanel shape (nested left, two named imports)', () => {
  it('maps every specifier of a named import, not only the first', () => {
    const bindings = importedBindings(HUB_CALLER);
    expect(bindings.get('MessageRowLeft')).toBe('./MessageRow');
    expect(bindings.get('MessageRowRight')).toBe('./MessageRow');
    expect(bindings.get('ListRow')).toBe('./ListPanel');
    expect(bindings.get('styles')).toBe('./MessagesPanel.module.scss');
  });

  it('attributes a nested styles prop to the inner component, not the outer ListRow', () => {
    const matches = [...HUB_CALLER.matchAll(STYLES_PROP_PATTERN)].map(m => m[1]);
    expect(matches).toEqual(['MessageRowLeft', 'MessageRowRight']);
  });

  it('reports email missing from a stylesheet without it', () => {
    const missing = propPassedMissing(HUB_CALLER, '/virtual', readHub, hubDefined);
    expect(missing).toEqual(['email']);
  });

  it('skips type modifiers and aliases in named imports', () => {
    const bindings = importedBindings("import { type A, B as C } from './x';");
    expect([...bindings.keys()].sort()).toEqual(['A', 'C']);
  });

  it('twin: with the stylesheet check let everything through the hub shape goes unreported', () => {
    const missing = propPassedMissing(
      HUB_CALLER,
      '/virtual',
      readHub,
      () => new Set(['email', 'body', 'error'])
    );
    expect(missing).toEqual([]);
  });
});

describe('A14: Comments.module.scss keeps only rules a file still reads', () => {
  const commentsDir = path.join(APP_ROOT, '(admin)', 'comments');
  const stylesheet = path.join(commentsDir, 'Comments.module.scss');

  it('drops the row rules MessageRow now owns', () => {
    const defined = definedClasses(stylesheet);
    for (const name of ['meta', 'time', 'unread']) {
      expect(defined.has(name)).toBe(false);
    }
  });

  it('keeps the rules the comments files still read', () => {
    const defined = definedClasses(stylesheet);
    for (const name of [
      'pageHeader',
      'pageTitle',
      'contentArea',
      'total',
      'searchRow',
      'controls',
    ]) {
      expect(defined.has(name)).toBe(true);
    }
    for (const name of ['list', 'row', 'rowUnread', 'error', 'loadMore', 'search', 'readFilter']) {
      expect(defined.has(name)).toBe(true);
    }
  });

  it('defines no class that no comments file reads', () => {
    const sources = ['page.tsx', 'CommentsList.tsx']
      .map(f => readFileSync(path.join(commentsDir, f), 'utf8'))
      .join('\n');
    const read = new Set(referencedClasses(sources, 'styles'));
    const unused = [...definedClasses(stylesheet)].filter(name => !read.has(name)).sort();
    expect(unused).toEqual([]);
  });
});
