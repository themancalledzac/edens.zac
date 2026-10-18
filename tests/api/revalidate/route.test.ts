/**
 * @jest-environment node
 *
 * Gates on POST /api/revalidate.
 *
 * `proxy.ts` does not match `/api/*`, so this handler is the only thing standing between a
 * hostile caller and an unbounded ISR cache purge. Two gates, pinned here:
 *
 * - Session (D1): local/dev stays open (the repo's standing "localhost admin needs no login"
 *   rule), every other environment requires an `ezac_session` cookie.
 * - Origin (D6): the request must carry an allowed `Origin` in EVERY environment, because the
 *   session cookie rides along on cross-site POSTs and so cannot stop CSRF on its own.
 *
 * Neither gate may let the revalidation itself run on a rejection.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest } from 'next/server';

import { POST } from '@/app/api/revalidate/route';
import { meServer } from '@/app/lib/api/auth';
import { isAllowedWriteOrigin } from '@/app/utils/originAllowlist';

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));

jest.mock('@/app/lib/api/auth', () => ({
  meServer: jest.fn(),
}));

jest.mock('@/app/utils/originAllowlist', () => {
  const actual = jest.requireActual('@/app/utils/originAllowlist');
  return { ...actual, isAllowedWriteOrigin: jest.fn(actual.isAllowedWriteOrigin) };
});

jest.mock('@/app/utils/environment', () => {
  const actual = jest.requireActual('@/app/utils/environment');
  return { ...actual, isLocalEnvironment: jest.fn(actual.isLocalEnvironment) };
});

const mockMeServer = meServer as jest.MockedFunction<typeof meServer>;
const mockRevalidateTag = revalidateTag as jest.MockedFunction<typeof revalidateTag>;
const mockRevalidatePath = revalidatePath as jest.MockedFunction<typeof revalidatePath>;

/** The deployed app origin, mirrored into `NEXT_PUBLIC_APP_URL` by every describe below. */
const APP_ORIGIN = 'https://example.com';

const adminPrincipal = { isAdmin: true } as Awaited<ReturnType<typeof meServer>>;
const nonAdminPrincipal = { isAdmin: false } as Awaited<ReturnType<typeof meServer>>;

beforeEach(() => {
  mockMeServer.mockReset();
  mockMeServer.mockResolvedValue(adminPrincipal);
});

afterEach(() => {
  const env = jest.requireActual('@/app/utils/environment');
  const origin = jest.requireActual('@/app/utils/originAllowlist');
  (jest.requireMock('@/app/utils/environment').isLocalEnvironment as jest.Mock).mockImplementation(
    env.isLocalEnvironment
  );
  (isAllowedWriteOrigin as jest.Mock).mockImplementation(origin.isAllowedWriteOrigin);
});

/**
 * Builds a request carrying an allowed Origin by default, so cases about the session gate are
 * not silently answered by the Origin gate. Pass `origin: null` to omit the header entirely.
 */
function makeRequest(
  body: unknown,
  { cookie, origin = APP_ORIGIN }: { cookie?: string; origin?: string | null } = {}
) {
  return new NextRequest('http://localhost:3000/api/revalidate', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(cookie ? { cookie } : {}),
      ...(origin ? { origin } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/revalidate — auth gate', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...ORIGINAL_ENV, NEXT_PUBLIC_APP_URL: APP_ORIGIN };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  describe('non-local environments', () => {
    beforeEach(() => {
      process.env = {
        ...ORIGINAL_ENV,
        NODE_ENV: 'production',
        NEXT_PUBLIC_ENV: 'production',
        NEXT_PUBLIC_APP_URL: APP_ORIGIN,
      };
    });

    it('rejects an anonymous caller with 401', async () => {
      const res = await POST(makeRequest({ path: '/' }));

      expect(res.status).toBe(401);
      await expect(res.json()).resolves.toEqual({ error: 'Unauthorized' });
    });

    it('does NOT revalidate anything on a rejection', async () => {
      await POST(makeRequest({ path: '/', tags: ['collections-index'] }));

      expect(mockRevalidatePath).not.toHaveBeenCalled();
      expect(mockRevalidateTag).not.toHaveBeenCalled();
    });

    it('rejects when an unrelated cookie is present but ezac_session is not', async () => {
      const res = await POST(makeRequest({ path: '/' }, { cookie: 'admin_token=abc; other=1' }));

      expect(res.status).toBe(401);
    });

    it('rejects when ezac_session is present but empty', async () => {
      const res = await POST(makeRequest({ path: '/' }, { cookie: 'ezac_session=' }));

      expect(res.status).toBe(401);
    });

    it('reports a missing session as 401, not 403, even when the Origin is also missing', async () => {
      const res = await POST(makeRequest({ path: '/' }, { origin: null }));

      expect(res.status).toBe(401);
    });

    it('allows a caller carrying an ezac_session cookie', async () => {
      const res = await POST(
        makeRequest({ path: '/smith-wedding' }, { cookie: 'ezac_session=abc123' })
      );

      expect(res.status).toBe(200);
      expect(mockRevalidatePath).toHaveBeenCalledWith('/smith-wedding');
    });
  });

  describe('local/dev', () => {
    it('allows an anonymous caller in development', async () => {
      process.env = {
        ...ORIGINAL_ENV,
        NODE_ENV: 'development',
        NEXT_PUBLIC_APP_URL: APP_ORIGIN,
      };

      const res = await POST(makeRequest({ tag: 'collections-index' }));

      expect(res.status).toBe(200);
      expect(mockRevalidateTag).toHaveBeenCalledWith('collections-index', 'max');
    });

    it('allows an anonymous caller when NEXT_PUBLIC_ENV is local', async () => {
      process.env = {
        ...ORIGINAL_ENV,
        NODE_ENV: 'production',
        NEXT_PUBLIC_ENV: 'local',
        NEXT_PUBLIC_APP_URL: APP_ORIGIN,
      };

      const res = await POST(makeRequest({ tag: 'collections-index' }));

      expect(res.status).toBe(200);
    });
  });
});

describe('POST /api/revalidate — Origin allowlist', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  describe('production', () => {
    beforeEach(() => {
      process.env = {
        ...ORIGINAL_ENV,
        NODE_ENV: 'production',
        NEXT_PUBLIC_ENV: 'production',
        NEXT_PUBLIC_APP_URL: APP_ORIGIN,
      };
    });

    const session = { cookie: 'ezac_session=abc123' };

    it('allows the configured app origin', async () => {
      const res = await POST(makeRequest({ tag: 'collections-index' }, session));

      expect(res.status).toBe(200);
    });

    it('rejects a hostile cross-site origin with 403 despite a valid session', async () => {
      const res = await POST(
        makeRequest({ path: '/' }, { ...session, origin: 'https://evil.example' })
      );

      expect(res.status).toBe(403);
      await expect(res.json()).resolves.toEqual({ error: 'Forbidden' });
    });

    it('does NOT revalidate anything when the origin is rejected', async () => {
      await POST(
        makeRequest(
          { path: '/', tags: ['collections-index'] },
          { ...session, origin: 'https://evil.example' }
        )
      );

      expect(mockRevalidatePath).not.toHaveBeenCalled();
      expect(mockRevalidateTag).not.toHaveBeenCalled();
    });

    it('rejects a request with no Origin header at all', async () => {
      const res = await POST(makeRequest({ path: '/' }, { ...session, origin: null }));

      expect(res.status).toBe(403);
    });

    it('rejects the dev ports in production — the localhost allowance is development-only', async () => {
      const res = await POST(
        makeRequest({ path: '/' }, { ...session, origin: 'http://localhost:3000' })
      );

      expect(res.status).toBe(403);
    });

    it('rejects a LAN origin in production', async () => {
      const res = await POST(
        makeRequest({ path: '/' }, { ...session, origin: 'http://192.168.68.60:3000' })
      );

      expect(res.status).toBe(403);
    });
  });

  describe('development', () => {
    beforeEach(() => {
      process.env = {
        ...ORIGINAL_ENV,
        NODE_ENV: 'development',
        NEXT_PUBLIC_APP_URL: APP_ORIGIN,
      };
    });

    it('allows the local dev port', async () => {
      const res = await POST(
        makeRequest({ tag: 'collections-index' }, { origin: 'http://localhost:3000' })
      );

      expect(res.status).toBe(200);
    });

    it('allows a LAN origin on a dev port, for phone testing', async () => {
      const res = await POST(
        makeRequest({ tag: 'collections-index' }, { origin: 'http://192.168.68.60:3000' })
      );

      expect(res.status).toBe(200);
    });

    it('still rejects a hostile origin — local is exempt from login, not from CSRF', async () => {
      const res = await POST(makeRequest({ path: '/' }, { origin: 'https://evil.example' }));

      expect(res.status).toBe(403);
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });
  });
});

describe('POST /api/revalidate — payload handling', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...ORIGINAL_ENV, NODE_ENV: 'development', NEXT_PUBLIC_APP_URL: APP_ORIGIN };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('rejects a body carrying none of tag, tags, or path with 400', async () => {
    const res = await POST(makeRequest({}));

    expect(res.status).toBe(400);
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });

  it('revalidates every string in tags and ignores non-string entries', async () => {
    const res = await POST(makeRequest({ tags: ['content-tags', 42, 'content-people'] }));

    expect(res.status).toBe(200);
    expect(mockRevalidateTag).toHaveBeenCalledTimes(2);
    expect(mockRevalidateTag).toHaveBeenCalledWith('content-tags', 'max');
    expect(mockRevalidateTag).toHaveBeenCalledWith('content-people', 'max');
  });

  it('revalidates tag and path together', async () => {
    const res = await POST(
      makeRequest({ tag: 'collection-smith-wedding', path: '/smith-wedding' })
    );

    expect(res.status).toBe(200);
    expect(mockRevalidateTag).toHaveBeenCalledWith('collection-smith-wedding', 'max');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/smith-wedding');
  });

  it('returns 500 when the body is not valid JSON', async () => {
    const req = new NextRequest('http://localhost:3000/api/revalidate', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: APP_ORIGIN },
      body: 'not json',
    });

    const res = await POST(req);

    expect(res.status).toBe(500);
  });
});

describe('POST /api/revalidate — admin principal gate', () => {
  const ORIGINAL_ENV = process.env;
  const session = { cookie: 'ezac_session=abc123' };

  beforeEach(() => {
    jest.clearAllMocks();
    mockMeServer.mockResolvedValue(adminPrincipal);
    process.env = {
      ...ORIGINAL_ENV,
      NODE_ENV: 'production',
      NEXT_PUBLIC_ENV: 'production',
      NEXT_PUBLIC_APP_URL: APP_ORIGIN,
    };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('A2: rejects a non-admin principal with 401 and revalidates nothing', async () => {
    mockMeServer.mockResolvedValue(nonAdminPrincipal);

    const res = await POST(makeRequest({ path: '/', tags: ['collections-index'] }, session));

    expect(res.status).toBe(401);
    expect(mockRevalidatePath).not.toHaveBeenCalled();
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });

  it('A2: lets an admin principal through with 200', async () => {
    const res = await POST(makeRequest({ path: '/smith-wedding' }, session));

    expect(res.status).toBe(200);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/smith-wedding');
  });

  it('A2: rejects a principal whose isAdmin is truthy but not true', async () => {
    mockMeServer.mockResolvedValue({ isAdmin: 'yes' } as unknown as Awaited<
      ReturnType<typeof meServer>
    >);

    const res = await POST(makeRequest({ path: '/' }, session));

    expect(res.status).toBe(401);
  });

  it('A3: rejects with 401 when meServer resolves null', async () => {
    mockMeServer.mockResolvedValue(null);

    const res = await POST(makeRequest({ path: '/', tag: 'collections-index' }, session));

    expect(res.status).toBe(401);
    expect(mockRevalidatePath).not.toHaveBeenCalled();
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });

  it('A3: rejects with 401 when meServer throws', async () => {
    mockMeServer.mockRejectedValue(new Error('backend down'));

    const res = await POST(makeRequest({ path: '/', tag: 'collections-index' }, session));

    expect(res.status).toBe(401);
    expect(mockRevalidatePath).not.toHaveBeenCalled();
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });

  it('answers 401 before the body is read for a non-admin', async () => {
    mockMeServer.mockResolvedValue(nonAdminPrincipal);
    const req = new NextRequest('http://localhost:3000/api/revalidate', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: APP_ORIGIN, ...session },
      body: 'not json',
    });

    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it('does not look up a principal when the session cookie is missing', async () => {
    const res = await POST(makeRequest({ path: '/' }));

    expect(res.status).toBe(401);
    expect(mockMeServer).not.toHaveBeenCalled();
  });

  it('checks the origin before the principal: a non-admin from a hostile origin gets 403', async () => {
    mockMeServer.mockResolvedValue(nonAdminPrincipal);

    const res = await POST(
      makeRequest({ path: '/' }, { ...session, origin: 'https://evil.example' })
    );

    expect(res.status).toBe(403);
  });

  it('A2-guard twin: a non-admin gets 200 when the principal lookup is skipped', async () => {
    const { isLocalEnvironment } = jest.requireMock('@/app/utils/environment') as {
      isLocalEnvironment: jest.Mock;
    };
    isLocalEnvironment.mockReturnValue(true);
    mockMeServer.mockResolvedValue(nonAdminPrincipal);

    const res = await POST(makeRequest({ path: '/' }, { origin: APP_ORIGIN }));

    expect(res.status).toBe(200);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/');
  });

  it('M7: local/dev never calls meServer, even for a null or throwing principal', async () => {
    process.env = {
      ...ORIGINAL_ENV,
      NODE_ENV: 'development',
      NEXT_PUBLIC_APP_URL: APP_ORIGIN,
    };
    mockMeServer.mockRejectedValue(new Error('backend down'));

    const res = await POST(makeRequest({ tag: 'collections-index' }));

    expect(res.status).toBe(200);
    expect(mockMeServer).not.toHaveBeenCalled();
  });

  it('M7 twin: the same request is refused once the environment is not local', async () => {
    mockMeServer.mockRejectedValue(new Error('backend down'));

    const res = await POST(makeRequest({ tag: 'collections-index' }, session));

    expect(res.status).toBe(401);
  });
});

describe('POST /api/revalidate — origin stays exact-match (M3)', () => {
  const ORIGINAL_ENV = process.env;
  const session = { cookie: 'ezac_session=abc123' };

  beforeEach(() => {
    jest.clearAllMocks();
    mockMeServer.mockResolvedValue(adminPrincipal);
    process.env = {
      ...ORIGINAL_ENV,
      NODE_ENV: 'production',
      NEXT_PUBLIC_ENV: 'production',
      NEXT_PUBLIC_APP_URL: APP_ORIGIN,
    };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it.each([
    `${APP_ORIGIN}/`,
    'HTTPS://EXAMPLE.COM',
    `${APP_ORIGIN}:443`,
    `${APP_ORIGIN}.evil.example`,
  ])('M3: rejects the near-miss origin %j with 403 for an admin', async origin => {
    const res = await POST(makeRequest({ path: '/' }, { ...session, origin }));

    expect(res.status).toBe(403);
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('M3 twin: a hostile origin gets 200 when the origin check lets everything through', async () => {
    (isAllowedWriteOrigin as jest.Mock).mockReturnValue(true);

    const res = await POST(
      makeRequest({ path: '/' }, { ...session, origin: 'https://evil.example' })
    );

    expect(res.status).toBe(200);
  });
});

/**
 * Strips string, template and regex-free literals crudely, then reports any `//` comment that
 * sits inside a function body (indented lines), ignoring docblocks.
 */
function inlineCommentsIn(source: string): string[] {
  return source.split('\n').filter(line => /^\s+\/\/(?!\/)/.test(line) || /;\s+\/\/\s/.test(line));
}

describe('route.ts source rules', () => {
  const source = readFileSync(path.join(process.cwd(), 'app/api/revalidate/route.ts'), 'utf8');

  it('M5: has no inline comments inside function bodies', () => {
    expect(inlineCommentsIn(source)).toEqual([]);
  });

  it('M5 twin: the scanner flags an inline comment when one is present', () => {
    const dirty = 'export async function POST() {\n  // note\n  return 1;\n}\n';

    expect(inlineCommentsIn(dirty)).toHaveLength(1);
  });

  it('A4: the docblock no longer says every caller is an admin and describes the gate', () => {
    const docblock = source.slice(0, source.indexOf('export async function POST'));

    expect(docblock).not.toMatch(/already behind that cookie/i);
    expect(docblock).not.toMatch(/every caller is (an )?admin/i);
    expect(docblock).toMatch(/meServer|isAdmin|admin principal/);
    expect(docblock).toMatch(/local/i);
  });

  it('A4 twin: the docblock check rejects the old wording', () => {
    const old = 'The only callers are the admin edit UI, which is already behind that cookie';

    expect(old).toMatch(/already behind that cookie/i);
  });
});
