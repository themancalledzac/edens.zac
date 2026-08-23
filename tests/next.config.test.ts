/**
 * @jest-environment node
 *
 * Tests for the site-wide security headers in `next.config.js` (D3).
 *
 * These do not restate the header list — they pin the parts that can silently rot:
 * the CloudFront host has to stay identical between the image optimizer allowlist and
 * the CSP, the two anti-framing mechanisms have to agree, the CSP has to stay clearly
 * report-only, and the dev-only relaxations must not reach a production build.
 */

const CSP_HEADER = 'Content-Security-Policy-Report-Only';

type NodeEnv = 'development' | 'production';

type HeaderEntry = { key: string; value: string };
type HeaderRule = { source: string; headers: HeaderEntry[] };
type LoadedConfig = {
  poweredByHeader?: boolean;
  images?: { remotePatterns?: { protocol?: string; hostname?: string }[] };
  headers?: () => Promise<HeaderRule[]>;
};

/**
 * Import `next.config.js` fresh under a given NODE_ENV.
 *
 * The config reads NODE_ENV at module scope to decide the dev relaxations, so the module
 * registry has to be reset between the two environments or the first import wins.
 */
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

async function headerRules(nodeEnv: NodeEnv): Promise<HeaderRule[]> {
  const config = await loadConfig(nodeEnv);
  if (!config.headers) throw new Error('next.config.js exposes no headers() block');
  return config.headers();
}

async function headerValue(nodeEnv: NodeEnv, key: string): Promise<string> {
  const [rule] = await headerRules(nodeEnv);
  const entry = rule?.headers.find(h => h.key === key);
  if (!entry) throw new Error(`no ${key} header`);
  return entry.value;
}

describe('next.config security headers', () => {
  afterAll(() => {
    jest.resetModules();
  });

  it('applies one header rule to every path', async () => {
    const rules = await headerRules('production');
    expect(rules).toHaveLength(1);
    expect(rules[0]?.source).toBe('/:path*');
  });

  it('emits the five headers production was missing', async () => {
    const [rule] = await headerRules('production');
    const keys = rule?.headers.map(h => h.key);
    expect(keys).toEqual([
      'X-Frame-Options',
      'X-Content-Type-Options',
      'Referrer-Policy',
      'Strict-Transport-Security',
      CSP_HEADER,
    ]);
  });

  it('drops the x-powered-by header', async () => {
    const config = await loadConfig('production');
    expect(config.poweredByHeader).toBe(false);
  });
});

describe('next.config CSP — consistency with the rest of the config', () => {
  // D4 pinned the optimizer to one distribution. If that host is ever repointed, the CSP
  // must move with it or every image silently becomes a violation report.
  it('names the same CloudFront host as the image optimizer allowlist', async () => {
    const config = await loadConfig('production');
    const optimizerHost = config.images?.remotePatterns?.find(p =>
      p.hostname?.endsWith('.cloudfront.net')
    )?.hostname;

    expect(optimizerHost).toBeTruthy();

    const csp = await headerValue('production', CSP_HEADER);
    expect(csp).toContain(`img-src 'self' blob: data: https://${optimizerHost}`);
    expect(csp).toContain(`media-src 'self' blob: https://${optimizerHost}`);
  });

  // X-Frame-Options is what enforces today; frame-ancestors takes over when the CSP flips
  // to enforcing. Loosening one without the other would leave the site framable by surprise.
  it('agrees with X-Frame-Options about framing', async () => {
    const xfo = await headerValue('production', 'X-Frame-Options');
    const csp = await headerValue('production', CSP_HEADER);
    expect(xfo).toBe('DENY');
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it('is still report-only, so nothing here is enforcing yet', async () => {
    const [rule] = await headerRules('production');
    const keys = rule?.headers.map(h => h.key) ?? [];
    expect(keys).toContain(CSP_HEADER);
    expect(keys).not.toContain('Content-Security-Policy');
  });

  it('omits the HSTS directives that are hard to walk back', async () => {
    const hsts = await headerValue('production', 'Strict-Transport-Security');
    expect(hsts).toBe('max-age=63072000');
    expect(hsts).not.toContain('preload');
    expect(hsts).not.toContain('includeSubDomains');
  });
});

describe('next.config CSP — dev relaxations stay in dev', () => {
  it.each(["'unsafe-eval'", 'ws:', 'wss:', 'http://localhost:*'])(
    'does not ship %s to production',
    async token => {
      const csp = await headerValue('production', CSP_HEADER);
      expect(csp).not.toContain(token);
    }
  );

  it('does grant them in development, where HMR and the local backend need them', async () => {
    const csp = await headerValue('development', CSP_HEADER);
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain('ws:');
    expect(csp).toContain('http://localhost:*');
  });

  it("keeps 'unsafe-inline' in both — Next inlines its hydration payload and styles", async () => {
    for (const env of ['production', 'development'] as NodeEnv[]) {
      const csp = await headerValue(env, CSP_HEADER);
      expect(csp).toContain("script-src 'self' 'unsafe-inline'");
      expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    }
  });
});
