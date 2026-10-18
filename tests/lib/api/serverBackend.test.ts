/**
 * @jest-environment node
 *
 * Tests for the server-only backend target (`app/lib/api/serverBackend.ts`) and the static scan
 * that keeps `API_URL` / `INTERNAL_API_SECRET` out of every other module and out of client
 * bundles.
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

import { serverBackendTarget } from '@/app/lib/api/serverBackend';

const ROOT = join(__dirname, '..', '..', '..');
const ALLOWED_READERS = ['app/lib/api/serverBackend.ts', 'app/api/proxy/[...path]/route.ts'];
const ENV_READ = /process\.env(?:\.|\[\s*["'])(API_URL|INTERNAL_API_SECRET)\b/;

function stripComments(source: string): string {
  return source.replace(/\/\*[\S\s]*?\*\//g, '').replace(/(^|[^"':`])\/\/.*$/gm, '$1');
}

function listSources(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return listSources(full);
    return /\.(ts|tsx|js|jsx)$/.test(name) ? [full] : [];
  });
}

function findEnvReaders(read: (file: string) => string, allowed: string[]): string[] {
  const files = [...listSources(join(ROOT, 'app')), join(ROOT, 'proxy.ts')];
  return files
    .map(file => relative(ROOT, file))
    .filter(rel => !allowed.includes(rel))
    .filter(rel => ENV_READ.test(stripComments(read(rel))));
}

function hasStaticServerBackendImport(source: string): boolean {
  const code = stripComments(source);
  return (
    /^\s*import\s[^;]*from\s+["'][^"']*serverBackend["']/m.test(code) ||
    /^\s*import\s+["'][^"']*serverBackend["']/m.test(code)
  );
}

function isLazyImportGuarded(source: string): boolean {
  const code = stripComments(source);
  const start = code.search(/function getServerApiTarget\b/);
  if (start === -1) return false;
  const rest = code.slice(start);
  const end = rest.search(/\n}/);
  const body = end === -1 ? rest : rest.slice(0, end);
  const guard = body.search(/typeof window === 'undefined'/);
  const lazy = body.search(/import\(\s*["'][^"']*serverBackend["']\s*\)/);
  return guard !== -1 && lazy !== -1 && guard < lazy;
}

const readFromDisk = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

describe('serverBackendTarget', () => {
  const originalApiUrl = process.env.API_URL;
  const originalSecret = process.env.INTERNAL_API_SECRET;

  afterEach(() => {
    const restore = (key: string, value: string | undefined) => {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    };
    restore('API_URL', originalApiUrl);
    restore('INTERNAL_API_SECRET', originalSecret);
  });

  it('builds ${API_URL}/api/<channel> and the X-Internal-Secret header', () => {
    process.env.API_URL = 'https://backend.internal';
    process.env.INTERNAL_API_SECRET = 'sec-' + 'z'.repeat(8);

    expect(serverBackendTarget('admin')).toEqual({
      baseUrl: 'https://backend.internal/api/admin',
      headers: { 'X-Internal-Secret': 'sec-zzzzzzzz' },
    });
  });

  it('strips a trailing slash from API_URL', () => {
    process.env.API_URL = 'https://backend.internal/';
    process.env.INTERNAL_API_SECRET = 'abc';

    expect(serverBackendTarget('read').baseUrl).toBe('https://backend.internal/api/read');
  });

  it('A7: the admin channel base resolves cache/clear to ${API_URL}/api/admin/cache/clear', () => {
    process.env.API_URL = 'https://backend.internal';
    process.env.INTERNAL_API_SECRET = 'abc';

    expect(`${serverBackendTarget('admin').baseUrl}/cache/clear`).toBe(
      'https://backend.internal/api/admin/cache/clear'
    );
  });
});

describe('A5b: API_URL and INTERNAL_API_SECRET stay in server-only modules', () => {
  it('only serverBackend.ts and the proxy route read them from process.env', () => {
    expect(findEnvReaders(readFromDisk, ALLOWED_READERS)).toEqual([]);
  });

  it('serverBackend.ts itself reads both variables', () => {
    const source = stripComments(readFromDisk('app/lib/api/serverBackend.ts'));

    expect(source).toMatch(/process\.env\.API_URL/);
    expect(source).toMatch(/process\.env\.INTERNAL_API_SECRET/);
  });

  it('core.ts does not import serverBackend statically', () => {
    expect(hasStaticServerBackendImport(readFromDisk('app/lib/api/core.ts'))).toBe(false);
  });

  it("getServerApiTarget reaches serverBackend through a lazy import after its own typeof window === 'undefined' check", () => {
    expect(isLazyImportGuarded(readFromDisk('app/lib/api/core.ts'))).toBe(true);
  });

  it('twin A5b: a static serverBackend import in core.ts is detected', () => {
    const source = "import { serverBackendTarget } from '@/app/lib/api/serverBackend';\n";

    expect(hasStaticServerBackendImport(source + readFromDisk('app/lib/api/core.ts'))).toBe(true);
  });

  it('twin A5b: with the window guard removed from getServerApiTarget the lazy import is unguarded', () => {
    const unguarded = readFromDisk('app/lib/api/core.ts').replace(
      /if \(typeof window === 'undefined'\) {\s*(const { serverBackendTarget } = await import)/,
      '{ $1'
    );

    expect(unguarded).not.toBe(readFromDisk('app/lib/api/core.ts'));
    expect(isLazyImportGuarded(unguarded)).toBe(false);
  });

  it('twin A5b: a window guard elsewhere in core.ts does not satisfy the check', () => {
    const source = `
export async function getServerApiTarget(endpointType: string) {
  const { serverBackendTarget } = await import('@/app/lib/api/serverBackend');
  return serverBackendTarget(endpointType);
}
export function other() {
  if (typeof window === 'undefined') return 1;
}
`;

    expect(isLazyImportGuarded(source)).toBe(false);
  });

  it('twin A5b: with the allowlist letting everything through, the reader is no longer reported', () => {
    const everyone = [...listSources(join(ROOT, 'app')), join(ROOT, 'proxy.ts')].map(file =>
      relative(ROOT, file)
    );
    const leaky = (rel: string) =>
      rel === 'app/lib/api/core.ts'
        ? readFromDisk(rel) + '\nconst s = process.env.INTERNAL_API_SECRET;\n'
        : readFromDisk(rel);

    expect(findEnvReaders(leaky, ALLOWED_READERS)).toEqual(['app/lib/api/core.ts']);
    expect(findEnvReaders(leaky, everyone)).toEqual([]);
  });
});
