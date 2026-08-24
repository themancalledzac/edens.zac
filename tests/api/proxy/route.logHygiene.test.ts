/**
 * @jest-environment node
 *
 * Guards C5's fifth bullet. The proxy's 502 path used to pass the raw thrown error straight to
 * `logger.error`, which serialises the whole object including its `cause` chain.
 *
 * The token-leak premise for this was disproven on 2026-08-22 and it is deliberately NOT a Group D
 * security item: share and invite tokens ride the URL path, the handler never logs `targetUrl`, and
 * a Node fetch-failure `cause` carries only `host:port`. This is defence in depth against a future
 * error shape carrying more than today's does — so the assertion is about the log call's shape, not
 * about any specific secret.
 */

import { NextRequest } from 'next/server';

import { GET } from '@/app/api/proxy/[...path]/route';
import { logger } from '@/app/utils/logger';

describe('Vercel BFF proxy — 502 log hygiene', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = {
      ...ORIGINAL_ENV,
      INTERNAL_API_SECRET: 'test-secret',
      API_URL: 'http://backend.test',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      NODE_ENV: 'development',
    };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    jest.restoreAllMocks();
  });

  /** A fetch failure shaped like Node's, carrying a nested cause the old call would have logged. */
  function rejectingFetch(): jest.SpyInstance {
    const cause = Object.assign(new Error('connect ECONNREFUSED 10.0.0.5:8080'), {
      code: 'ECONNREFUSED',
      address: '10.0.0.5',
      port: 8080,
    });
    const failure = Object.assign(new TypeError('fetch failed'), { cause, code: 'ECONNREFUSED' });
    return jest.spyOn(global, 'fetch').mockRejectedValue(failure);
  }

  function proxyRequest() {
    const req = new NextRequest('http://localhost:3000/api/proxy/api/read/collections/foo', {
      method: 'GET',
      headers: { origin: 'http://localhost:3000' },
    });
    return GET(req, {
      params: Promise.resolve({ path: ['api', 'read', 'collections', 'foo'] }),
    } as never);
  }

  it('should still answer 502 when the upstream fetch throws', async () => {
    rejectingFetch();
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});

    const res = await proxyRequest();

    expect(res.status).toBe(502);
    expect(errorSpy).toHaveBeenCalled();
  });

  it('should not hand the raw error object to the logger', async () => {
    rejectingFetch();
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});

    await proxyRequest();

    const [, message, error, context] = errorSpy.mock.calls[0] as [
      string,
      string,
      unknown,
      Record<string, unknown> | undefined,
    ];

    expect(error).toBeUndefined();
    expect(message).toBe('fetch failed');
    expect(context).toEqual({ code: 'ECONNREFUSED' });
  });

  /**
   * The point of the change, stated as a property rather than a field list: nothing the logger
   * receives should serialise to something containing the upstream address. A future error shape
   * that smuggles more into `cause` fails here.
   */
  it('should log nothing that carries the upstream address', async () => {
    rejectingFetch();
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});

    await proxyRequest();

    const serialised = JSON.stringify(errorSpy.mock.calls[0], (_key, value: unknown) =>
      value instanceof Error ? { ...value, message: value.message } : value
    );

    expect(serialised).not.toContain('10.0.0.5');
    expect(serialised).not.toContain('8080');
  });
});
