/**
 * The reported page URL must never carry a credential.
 *
 * On `/s/<token>` and `/invite/<token>` the URL is the access token, and `logger.error` posts that
 * URL to `/api/client-errors`, whose stdout Amplify ships to CloudWatch. Every assertion here runs
 * against the serialized request body rather than one field, so a token that escapes through some
 * other part of the payload fails the test too.
 */

import type { logger as LoggerValue } from '@/app/utils/logger';

const ORIGINAL_ENV = process.env;

type Logger = typeof LoggerValue;

async function freshLogger(): Promise<Logger> {
  jest.resetModules();
  return (await import('@/app/utils/logger')).logger;
}

function goTo(url: string): void {
  window.history.replaceState({}, '', url);
}

describe('logger — page URL redaction', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, NODE_ENV: 'development' };
    jest.spyOn(console, 'error').mockImplementation(() => {});

    fetchMock = jest.fn(() => Promise.resolve(new Response(null, { status: 204 })));
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env = ORIGINAL_ENV;
    goTo('/');
  });

  function reportedBody(): string {
    expect(fetchMock).toHaveBeenCalledTimes(1);
    return (fetchMock.mock.calls[0][1] as RequestInit).body as string;
  }

  function reportedUrl(): unknown {
    const payload = JSON.parse(reportedBody()) as { context?: Record<string, unknown> };
    return payload.context?.url;
  }

  it('should not put a share token anywhere in the posted body', async () => {
    const token = 'k9Xq2LmT7pR4vBzN';
    goTo(`/s/${token}`);
    const logger = await freshLogger();

    logger.error('share', 'Failed to load shared space');

    expect(reportedBody()).not.toContain(token);
    expect(reportedUrl()).toBe('/s/[token]');
  });

  it('should not put an invite token anywhere in the posted body', async () => {
    const token = 'Wq3Zt8Nr1Ka6Ly0P';
    goTo(`/invite/${token}`);
    const logger = await freshLogger();

    logger.error('invite', 'Accept failed');

    expect(reportedBody()).not.toContain(token);
    expect(reportedUrl()).toBe('/invite/[token]');
  });

  it('should drop the query string, which can carry a token of its own', async () => {
    const secret = 'Hv5Bd2Qs9Mj7Tc4X';
    goTo(`/user?token=${secret}&manage=1`);
    const logger = await freshLogger();

    logger.error('user', 'Space read failed');

    expect(reportedBody()).not.toContain(secret);
    expect(reportedUrl()).toBe('/user');
  });

  it('should drop the hash fragment', async () => {
    const secret = 'Ff1Gg2Hh3Jj4Kk5L';
    goTo(`/collection/portfolio#${secret}`);
    const logger = await freshLogger();

    logger.error('collection', 'Render failed');

    expect(reportedBody()).not.toContain(secret);
    expect(reportedUrl()).toBe('/collection/portfolio');
  });

  it('should report an ordinary route by its full pathname', async () => {
    goTo('/collection/portfolio-work');
    const logger = await freshLogger();

    logger.error('collection', 'Render failed');

    expect(reportedUrl()).toBe('/collection/portfolio-work');
  });

  it('should leave a path that merely starts with the same letters alone', async () => {
    goTo('/search/film');
    const logger = await freshLogger();

    logger.error('search', 'Query failed');

    expect(reportedUrl()).toBe('/search/film');
  });
});
