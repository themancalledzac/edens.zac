/**
 * @jest-environment node
 *
 * Hardening of `next.config.js` (r-26.3): the localhost image origin is dev-only, every path
 * carries a Permissions-Policy header, and the docblock cites "#360".
 *
 * Each guard has a twin that turns it off and asserts the failure then happens: the `isDev`
 * switch is flipped by loading under development, and the header is removed from the loaded rules.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Linter } from 'eslint';
import tseslint from 'typescript-eslint';

import { noInlineCommentsInFunctions } from '@/eslint-rules/no-inline-comments-in-functions.js';

const CLOUDFRONT_HOST = 'd2qp8h5pbkohe6.cloudfront.net';
const PERMISSIONS_POLICY = 'camera=(), microphone=(), geolocation=(), payment=(), usb=()';

type NodeEnv = 'development' | 'production';
type Pattern = { protocol?: string; hostname?: string };
type HeaderEntry = { key: string; value: string };
type HeaderRule = { source: string; headers: HeaderEntry[] };
type LoadedConfig = {
  images?: { remotePatterns?: Pattern[] };
  headers?: () => Promise<HeaderRule[]>;
};

const source = readFileSync(join(process.cwd(), 'next.config.js'), 'utf8');

/** Import `next.config.js` fresh under a given NODE_ENV. */
async function loadConfig(nodeEnv: NodeEnv): Promise<LoadedConfig> {
  const original = process.env.NODE_ENV;
  process.env = { ...process.env, NODE_ENV: nodeEnv };
  jest.resetModules();
  try {
    const mod = await import('@/next.config.js');
    return (mod.default ?? mod) as LoadedConfig;
  } finally {
    process.env = { ...process.env, NODE_ENV: original };
  }
}

function hasLocalhost(patterns: Pattern[] | undefined): boolean {
  return (patterns ?? []).some(p => p.hostname === 'localhost');
}

function permissionsPolicyValues(rules: HeaderRule[]): string[] {
  return rules.flatMap(r =>
    r.headers.filter(h => h.key === 'Permissions-Policy').map(h => h.value)
  );
}

afterAll(() => {
  jest.resetModules();
});

/** The production A5 assertion, shared by the main test and its twin. */
function expectProductionPatterns(patterns: Pattern[]): void {
  expect(patterns).toHaveLength(1);
  expect(patterns[0]?.protocol).toBe('https');
  expect(patterns[0]?.hostname).toBe(CLOUDFRONT_HOST);
  expect(hasLocalhost(patterns)).toBe(false);
}

/** The A6 assertion, shared by the main test and its twin. */
function expectPermissionsPolicy(rules: HeaderRule[]): void {
  expect(rules).toHaveLength(1);
  expect(rules[0]?.source).toBe('/:path*');
  expect(permissionsPolicyValues(rules)).toEqual([PERMISSIONS_POLICY]);
}

describe('A5 — localhost remotePattern is dev-only', () => {
  it('production remotePatterns is exactly one https entry for the CloudFront host', async () => {
    const config = await loadConfig('production');
    expectProductionPatterns(config.images?.remotePatterns ?? []);
  });

  it('development still lists the http://localhost entry alongside CloudFront', async () => {
    const config = await loadConfig('development');
    const patterns = config.images?.remotePatterns ?? [];
    expect(patterns).toContainEqual(
      expect.objectContaining({ protocol: 'http', hostname: 'localhost' })
    );
    expect(patterns).toContainEqual(
      expect.objectContaining({ protocol: 'https', hostname: CLOUDFRONT_HOST })
    );
  });

  it('twin: the production assertion fails once localhost is put back into remotePatterns', async () => {
    const production = await loadConfig('production');
    const withLocalhost = [
      { protocol: 'http', hostname: 'localhost' },
      ...(production.images?.remotePatterns ?? []),
    ];
    expect(() => expectProductionPatterns(withLocalhost)).toThrow();
  });

  it('twin: the development config fails the production assertion, so isDev is what gates it', async () => {
    const development = await loadConfig('development');
    expect(() => expectProductionPatterns(development.images?.remotePatterns ?? [])).toThrow();
  });
});

describe('A6 — Permissions-Policy on every path', () => {
  it.each<NodeEnv>(['production', 'development'])(
    'applies the exact Permissions-Policy value to /:path* in %s',
    async env => {
      const config = await loadConfig(env);
      expectPermissionsPolicy((await config.headers?.()) ?? []);
    }
  );

  it('twin: the A6 assertion fails once Permissions-Policy is removed from the rules', async () => {
    const config = await loadConfig('production');
    const stripped = ((await config.headers?.()) ?? []).map(r => ({
      ...r,
      headers: r.headers.filter(h => h.key !== 'Permissions-Policy'),
    }));
    expect(() => expectPermissionsPolicy(stripped)).toThrow();
  });

  it('twin: the A6 assertion fails when the value is loosened', async () => {
    const config = await loadConfig('production');
    const loosened = ((await config.headers?.()) ?? []).map(r => ({
      ...r,
      headers: r.headers.map(h =>
        h.key === 'Permissions-Policy' ? { ...h, value: 'camera=()' } : h
      ),
    }));
    expect(() => expectPermissionsPolicy(loosened)).toThrow();
  });
});

describe('A7 — docblock citation', () => {
  it('cites "#360" and no longer names pf-performance-platform.md', () => {
    expect(source).toContain('#360');
    expect(source).not.toContain('pf-performance-platform.md');
  });
});

describe('M5 — no inline comments inside function bodies', () => {
  it('next.config.js passes the no-inline-comments-in-functions rule', () => {
    const linter = new Linter();
    const messages = linter.verify(
      source,
      {
        files: ['**/*.js'],
        languageOptions: {
          parser: tseslint.parser as never,
          parserOptions: { sourceType: 'module' },
        },
        plugins: {
          local: {
            rules: { 'no-inline-comments-in-functions': noInlineCommentsInFunctions as never },
          },
        },
        rules: { 'local/no-inline-comments-in-functions': 'error' },
      },
      'next.config.js'
    );
    const ruleMessages = messages.filter(m => m.ruleId === 'local/no-inline-comments-in-functions');
    expect(ruleMessages).toEqual([]);
  });
});
