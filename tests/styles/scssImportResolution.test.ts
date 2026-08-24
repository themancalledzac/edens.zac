/**
 * Guards E9's second bullet. `/login` and `/invite/[token]` owned byte-identical copies of
 * `page.module.scss`; both now import one shared `app/styles/auth-card.module.scss`.
 *
 * Moving a stylesheet out from under a route is not caught by the rest of the toolchain. Jest's
 * `moduleNameMapper` rewrites every `*.module.scss` specifier to an object proxy before resolution
 * runs, and TypeScript matches the ambient `declare module '*.module.scss'` wildcard against any
 * path at all. Both stay green while pointing at a file that does not exist, and only `next build`
 * fails. This test closes that gap: every SCSS specifier imported from `app/` must resolve to a real
 * file on disk.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const ROOT = process.cwd();

/** Every TS/TSX source file under `app/`, as paths relative to the repo root. */
function sourceFiles(): string[] {
  return readdirSync(join(ROOT, 'app'), { recursive: true, encoding: 'utf8' })
    .filter(entry => entry.endsWith('.ts') || entry.endsWith('.tsx'))
    .map(entry => join('app', entry));
}

const SCSS_IMPORT = /from\s+'([^']+\.scss)'/g;

interface ScssImport {
  /** The importing file, relative to the repo root. */
  source: string;
  /** The specifier exactly as written. */
  specifier: string;
  /** Absolute path the specifier points at. */
  target: string;
}

/** Resolve a specifier the way the `@/*` alias in tsconfig and jest.config.mjs both do. */
function resolveSpecifier(source: string, specifier: string): string {
  return specifier.startsWith('@/')
    ? join(ROOT, specifier.slice(2))
    : resolve(ROOT, dirname(source), specifier);
}

function scssImports(): ScssImport[] {
  return sourceFiles().flatMap(source => {
    const contents = readFileSync(join(ROOT, source), 'utf8');
    return [...contents.matchAll(SCSS_IMPORT)].map(match => {
      const specifier = match[1] as string;
      return { source, specifier, target: resolveSpecifier(source, specifier) };
    });
  });
}

describe('SCSS module imports', () => {
  const imports = scssImports();

  /** A regex that silently matched nothing would make the assertion below trivially true. */
  it('should find the imports it is meant to scan', () => {
    expect(imports.length).toBeGreaterThan(50);
  });

  it('should every one resolve to a file that exists', () => {
    const missing = imports
      .filter(({ target }) => !existsSync(target))
      .map(
        ({ source, specifier }) =>
          `${source} imports "${specifier}", which is not a file. Jest and tsc both stay green on ` +
          'a dangling SCSS specifier, so this only shows up as an unstyled page at runtime.'
      );

    expect(missing).toEqual([]);
  });

  it('should have /login and /invite/[token] share one auth-card stylesheet', () => {
    const authCard = imports.filter(({ specifier }) => specifier.includes('auth-card.module.scss'));

    expect(authCard.map(({ source }) => source).sort()).toEqual([
      join('app', 'invite', '[token]', 'page.tsx'),
      join('app', 'login', 'page.tsx'),
    ]);
    expect(new Set(authCard.map(({ target }) => target)).size).toBe(1);
    expect(existsSync(join(ROOT, 'app', 'styles', 'auth-card.module.scss'))).toBe(true);
  });

  it('should leave no per-route auth page.module.scss behind', () => {
    expect(existsSync(join(ROOT, 'app', 'login', 'page.module.scss'))).toBe(false);
    expect(existsSync(join(ROOT, 'app', 'invite', '[token]', 'page.module.scss'))).toBe(false);
  });
});
