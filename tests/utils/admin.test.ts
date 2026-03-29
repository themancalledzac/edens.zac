import { isAdminRoutesEnabled, hasValidAdminAuth } from '@/app/utils/admin';

function createMockRequest(options: { headerToken?: string; cookieToken?: string }) {
  return {
    headers: {
      get: (name: string) =>
        name === 'x-admin-token' ? (options.headerToken ?? null) : null,
    },
    cookies: {
      get: (name: string) =>
        name === 'admin_token' && options.cookieToken
          ? { value: options.cookieToken }
          : undefined,
    },
  } as unknown as Parameters<typeof hasValidAdminAuth>[0];
}

const originalEnv = process.env;

beforeEach(() => {
  process.env = { ...originalEnv };
});

afterAll(() => {
  process.env = originalEnv;
});

describe('isAdminRoutesEnabled', () => {
  it('returns true when ADMIN_ROUTES_ENABLED is "true"', () => {
    process.env.ADMIN_ROUTES_ENABLED = 'true';
    expect(isAdminRoutesEnabled()).toBe(true);
  });

  it('returns false when ADMIN_ROUTES_ENABLED is "false"', () => {
    process.env.ADMIN_ROUTES_ENABLED = 'false';
    expect(isAdminRoutesEnabled()).toBe(false);
  });

  it('returns false when ADMIN_ROUTES_ENABLED is undefined', () => {
    delete process.env.ADMIN_ROUTES_ENABLED;
    expect(isAdminRoutesEnabled()).toBe(false);
  });

  it('returns false when ADMIN_ROUTES_ENABLED is an empty string', () => {
    process.env.ADMIN_ROUTES_ENABLED = '';
    expect(isAdminRoutesEnabled()).toBe(false);
  });
});

describe('hasValidAdminAuth', () => {
  it('returns true when no ADMIN_TOKEN is configured (feature-flag only)', () => {
    delete process.env.ADMIN_TOKEN;
    const request = createMockRequest({});
    expect(hasValidAdminAuth(request)).toBe(true);
  });

  it('returns true when header token matches ADMIN_TOKEN', () => {
    process.env.ADMIN_TOKEN = 'secret123';
    const request = createMockRequest({ headerToken: 'secret123' });
    expect(hasValidAdminAuth(request)).toBe(true);
  });

  it('returns false when header token does not match ADMIN_TOKEN', () => {
    process.env.ADMIN_TOKEN = 'secret123';
    const request = createMockRequest({ headerToken: 'wrong-token' });
    expect(hasValidAdminAuth(request)).toBe(false);
  });

  it('returns true when cookie token matches ADMIN_TOKEN', () => {
    process.env.ADMIN_TOKEN = 'secret123';
    const request = createMockRequest({ cookieToken: 'secret123' });
    expect(hasValidAdminAuth(request)).toBe(true);
  });

  it('returns false when cookie token does not match ADMIN_TOKEN', () => {
    process.env.ADMIN_TOKEN = 'secret123';
    const request = createMockRequest({ cookieToken: 'wrong-cookie' });
    expect(hasValidAdminAuth(request)).toBe(false);
  });

  it('returns false when no token is provided but ADMIN_TOKEN is set', () => {
    process.env.ADMIN_TOKEN = 'secret123';
    const request = createMockRequest({});
    expect(hasValidAdminAuth(request)).toBe(false);
  });

  it('returns true when header is valid even if cookie is wrong (header takes priority)', () => {
    process.env.ADMIN_TOKEN = 'secret123';
    const request = createMockRequest({
      headerToken: 'secret123',
      cookieToken: 'wrong-cookie',
    });
    expect(hasValidAdminAuth(request)).toBe(true);
  });
});
