/**
 * @jest-environment node
 *
 * Gates and clipping on POST /api/client-errors.
 *
 * The route is deliberately anonymous — the viewers whose errors matter most never sign in — so
 * `Origin` is the only gate, and everything past it is untrusted input that ends up in a log a
 * human reads. Two failure modes are worth a test each: an unbounded body turning one report
 * into a large CloudWatch write, and a caller-chosen key in `context` overwriting `level` or
 * `module` so the report cannot be found again.
 */

import { NextRequest } from 'next/server';

import { POST } from '@/app/api/client-errors/route';

const APP_ORIGIN = 'https://example.com';
const ORIGINAL_ENV = process.env;

function makeRequest(
  body: unknown,
  { origin = APP_ORIGIN, contentLength }: { origin?: string | null; contentLength?: string } = {}
) {
  const raw = typeof body === 'string' ? body : JSON.stringify(body);

  return new NextRequest('http://localhost:3000/api/client-errors', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'user-agent': 'jest',
      ...(origin ? { origin } : {}),
      ...(contentLength ? { 'content-length': contentLength } : {}),
    },
    body: raw,
  });
}

function loggedLine(spy: jest.SpyInstance): Record<string, unknown> {
  return JSON.parse(spy.mock.calls.at(-1)?.[0] as string) as Record<string, unknown>;
}

describe('POST /api/client-errors', () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, NEXT_PUBLIC_APP_URL: APP_ORIGIN };
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env = ORIGINAL_ENV;
  });

  describe('origin gate', () => {
    it('should reject a request with no Origin', async () => {
      const res = await POST(makeRequest({ message: 'x' }, { origin: null }));

      expect(res.status).toBe(403);
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('should reject a foreign Origin', async () => {
      const res = await POST(makeRequest({ message: 'x' }, { origin: 'https://evil.test' }));

      expect(res.status).toBe(403);
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('should accept the configured app Origin', async () => {
      const res = await POST(makeRequest({ module: 'app', message: 'boom' }));

      expect(res.status).toBe(204);
    });
  });

  describe('body validation', () => {
    it('should reject a body that is not JSON', async () => {
      expect((await POST(makeRequest('not json at all'))).status).toBe(400);
    });

    it('should reject a JSON array, which has no fields to read', async () => {
      expect((await POST(makeRequest([{ message: 'x' }]))).status).toBe(400);
    });

    it('should reject a report with no message', async () => {
      expect((await POST(makeRequest({ module: 'app' }))).status).toBe(400);
    });

    it('should reject a declared content-length over the cap without reading the body', async () => {
      const res = await POST(makeRequest({ message: 'x' }, { contentLength: '900000' }));

      expect(res.status).toBe(413);
    });

    it('should reject an oversized body that under-declared its length', async () => {
      const res = await POST(makeRequest({ message: 'x'.repeat(20_000) }));

      expect(res.status).toBe(413);
    });
  });

  describe('what reaches the log', () => {
    it('should mark the line as a client report so one query can separate the two sources', async () => {
      await POST(makeRequest({ module: 'renderer', message: 'NaN detected in props' }));

      expect(loggedLine(errorSpy)).toMatchObject({
        level: 'error',
        source: 'client',
        module: 'renderer',
        message: 'NaN detected in props',
      });
    });

    it('should carry the error fields the browser flattened', async () => {
      await POST(
        makeRequest({
          module: 'app',
          message: 'Unhandled error boundary',
          error: { name: 'TypeError', message: 'x is not a function', digest: '99' },
        })
      );

      expect(loggedLine(errorSpy).error).toMatchObject({
        name: 'TypeError',
        message: 'x is not a function',
        digest: '99',
      });
    });

    it('should clip a long stack rather than writing it whole', async () => {
      await POST(
        makeRequest({ message: 'boom', error: { message: 'boom', stack: 'a'.repeat(6_000) } })
      );

      const stack = (loggedLine(errorSpy).error as { stack: string }).stack;
      expect(stack.length).toBeLessThanOrEqual(4_001);
    });

    it('should carry context as one string, so a caller key cannot overwrite level or module', async () => {
      await POST(
        makeRequest({
          module: 'renderer',
          message: 'boom',
          context: { level: 'debug', module: 'somewhere-else', contentId: 42 },
        })
      );

      const line = loggedLine(errorSpy);
      expect(line.level).toBe('error');
      expect(line.module).toBe('renderer');
      expect(typeof line.context).toBe('string');
      expect(line.context).toContain('42');
    });

    it('should fall back to a known module name when the caller sends a non-string', async () => {
      await POST(makeRequest({ module: { nested: true }, message: 'boom' }));

      expect(loggedLine(errorSpy).module).toBe('unknown');
    });
  });
});
