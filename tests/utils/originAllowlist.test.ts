/**
 * @jest-environment node
 *
 * Unit coverage for the shared write-Origin allowlist (D6).
 *
 * The route-level suites (`tests/api/proxy/route.test.ts`, `tests/api/revalidate/route.test.ts`)
 * pin how each caller uses this; these cases pin the rule itself, including the env-reading
 * behavior the callers depend on — the allowlist must be rebuilt per call, not captured at
 * module load, because both suites flip `NODE_ENV` and `NEXT_PUBLIC_APP_URL` between cases.
 *
 * The mixed-case localhost cases exist because D9 removed the two `http://localhost:PORT`
 * literals from the exact-match Set as redundant with `DEV_LAN_ORIGIN`. Nothing here could tell
 * the two mechanisms apart before, so the removal would have been invisible. A Set lookup is
 * case-sensitive and the regex is not, which makes those cases pass only while the regex is the
 * thing answering for the dev ports.
 */

import { isAllowedWriteOrigin } from '@/app/utils/originAllowlist';

const APP_ORIGIN = 'https://example.com';

describe('isAllowedWriteOrigin', () => {
  const ORIGINAL_ENV = process.env;

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  describe('production', () => {
    beforeEach(() => {
      process.env = {
        ...ORIGINAL_ENV,
        NODE_ENV: 'production',
        NEXT_PUBLIC_APP_URL: APP_ORIGIN,
      };
    });

    it('allows the configured app origin', () => {
      expect(isAllowedWriteOrigin(APP_ORIGIN)).toBe(true);
    });

    it('rejects a missing origin', () => {
      expect(isAllowedWriteOrigin(null)).toBe(false);
    });

    it('rejects an empty-string origin', () => {
      expect(isAllowedWriteOrigin('')).toBe(false);
    });

    it('rejects an arbitrary public origin', () => {
      expect(isAllowedWriteOrigin('https://evil.example')).toBe(false);
    });

    it('rejects a look-alike suffix of the app origin', () => {
      expect(isAllowedWriteOrigin('https://example.com.evil.example')).toBe(false);
    });

    it('rejects the app origin over the wrong scheme', () => {
      expect(isAllowedWriteOrigin('http://example.com')).toBe(false);
    });

    it('rejects the dev ports — the localhost allowance is development-only', () => {
      expect(isAllowedWriteOrigin('http://localhost:3000')).toBe(false);
      expect(isAllowedWriteOrigin('http://localhost:3001')).toBe(false);
    });

    it('rejects LAN origins', () => {
      expect(isAllowedWriteOrigin('http://192.168.68.60:3000')).toBe(false);
    });

    it('rejects a mixed-case localhost origin — the regex branch is development-only', () => {
      expect(isAllowedWriteOrigin('http://LOCALHOST:3000')).toBe(false);
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

    it('still allows the configured app origin', () => {
      expect(isAllowedWriteOrigin(APP_ORIGIN)).toBe(true);
    });

    it('allows both local dev ports', () => {
      expect(isAllowedWriteOrigin('http://localhost:3000')).toBe(true);
      expect(isAllowedWriteOrigin('http://localhost:3001')).toBe(true);
    });

    it('allows a mixed-case localhost origin — only DEV_LAN_ORIGIN can answer this', () => {
      expect(isAllowedWriteOrigin('http://LOCALHOST:3000')).toBe(true);
      expect(isAllowedWriteOrigin('http://LocalHost:3001')).toBe(true);
    });

    it('allows RFC1918 origins on a dev port', () => {
      expect(isAllowedWriteOrigin('http://192.168.68.60:3000')).toBe(true);
      expect(isAllowedWriteOrigin('http://10.0.0.4:3001')).toBe(true);
      expect(isAllowedWriteOrigin('http://172.16.0.9:3000')).toBe(true);
    });

    it('allows mDNS .local and .localhost hostnames on a dev port', () => {
      expect(isAllowedWriteOrigin('http://zacs-mbp.local:3000')).toBe(true);
      expect(isAllowedWriteOrigin('http://app.localhost:3001')).toBe(true);
    });

    it('rejects a public IPv4 origin', () => {
      expect(isAllowedWriteOrigin('http://203.0.113.7:3000')).toBe(false);
    });

    it('rejects 172.x outside the RFC1918 16–31 range', () => {
      expect(isAllowedWriteOrigin('http://172.15.0.1:3000')).toBe(false);
      expect(isAllowedWriteOrigin('http://172.32.0.1:3000')).toBe(false);
    });

    it('rejects https LAN origins — the dev allowance is http only', () => {
      expect(isAllowedWriteOrigin('https://192.168.68.60:3000')).toBe(false);
    });

    it('rejects LAN origins on a non-dev port', () => {
      expect(isAllowedWriteOrigin('http://192.168.68.60:8080')).toBe(false);
    });

    it('rejects a LAN host with a path appended — the match is anchored', () => {
      expect(isAllowedWriteOrigin('http://192.168.68.60:3000/evil')).toBe(false);
    });
  });

  describe('NEXT_PUBLIC_APP_URL normalization', () => {
    it('allows the bare origin when the env value carries a trailing slash', () => {
      process.env = {
        ...ORIGINAL_ENV,
        NODE_ENV: 'production',
        NEXT_PUBLIC_APP_URL: `${APP_ORIGIN}/`,
      };

      expect(isAllowedWriteOrigin(APP_ORIGIN)).toBe(true);
    });

    it('allows the bare origin when the env value carries a path', () => {
      process.env = {
        ...ORIGINAL_ENV,
        NODE_ENV: 'production',
        NEXT_PUBLIC_APP_URL: `${APP_ORIGIN}/admin`,
      };

      expect(isAllowedWriteOrigin(APP_ORIGIN)).toBe(true);
    });

    it('still rejects the env value as written once it is normalized away', () => {
      process.env = {
        ...ORIGINAL_ENV,
        NODE_ENV: 'production',
        NEXT_PUBLIC_APP_URL: `${APP_ORIGIN}/`,
      };

      expect(isAllowedWriteOrigin(`${APP_ORIGIN}/`)).toBe(false);
    });

    it('denies everything when the env value is unparseable', () => {
      process.env = {
        ...ORIGINAL_ENV,
        NODE_ENV: 'production',
        NEXT_PUBLIC_APP_URL: 'example.com',
      };

      expect(isAllowedWriteOrigin(APP_ORIGIN)).toBe(false);
      expect(isAllowedWriteOrigin('example.com')).toBe(false);
      expect(isAllowedWriteOrigin('http://localhost:3000')).toBe(false);
    });

    it('denies a null-origin caller when the env value has an opaque scheme', () => {
      process.env = {
        ...ORIGINAL_ENV,
        NODE_ENV: 'production',
        NEXT_PUBLIC_APP_URL: 'data:text/plain,hi',
      };

      expect(isAllowedWriteOrigin('null')).toBe(false);
    });
  });

  describe('env is read per call', () => {
    it('follows NEXT_PUBLIC_APP_URL when it changes between calls', () => {
      process.env = { ...ORIGINAL_ENV, NODE_ENV: 'production', NEXT_PUBLIC_APP_URL: APP_ORIGIN };
      expect(isAllowedWriteOrigin(APP_ORIGIN)).toBe(true);

      process.env = {
        ...ORIGINAL_ENV,
        NODE_ENV: 'production',
        NEXT_PUBLIC_APP_URL: 'https://other.example',
      };
      expect(isAllowedWriteOrigin(APP_ORIGIN)).toBe(false);
      expect(isAllowedWriteOrigin('https://other.example')).toBe(true);
    });

    it('rejects everything when NEXT_PUBLIC_APP_URL is unset outside development', () => {
      process.env = { ...ORIGINAL_ENV, NODE_ENV: 'production' };
      delete process.env.NEXT_PUBLIC_APP_URL;

      expect(isAllowedWriteOrigin(APP_ORIGIN)).toBe(false);
      expect(isAllowedWriteOrigin('http://localhost:3000')).toBe(false);
    });
  });
});
