/**
 * Browser-side error reporting.
 *
 * A `console.error` in a browser reaches nobody. `logger.error` therefore posts to
 * `/api/client-errors`, whose stdout Amplify ships to CloudWatch. Two properties matter enough
 * to pin: only `error` reports (warn and debug are per-render in several places and would bill
 * every viewer), and the reporter is capped, because a `logger.error` reached from inside a
 * render otherwise fires once per component, per render, per viewer.
 */

import type { logger as LoggerValue } from '@/app/utils/logger';

const ORIGINAL_ENV = process.env;

type Logger = typeof LoggerValue;

/**
 * Re-import the module so the per-page-load budget starts full. The budget is module state on
 * purpose, so a test that shares it with the previous one is testing the previous one.
 */
async function freshLogger(): Promise<Logger> {
  jest.resetModules();
  return (await import('@/app/utils/logger')).logger;
}

function bodyOf(call: unknown[]): Record<string, unknown> {
  const init = call[1] as RequestInit;
  return JSON.parse(init.body as string) as Record<string, unknown>;
}

describe('logger — client error reporting', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, NODE_ENV: 'development' };
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'debug').mockImplementation(() => {});

    fetchMock = jest.fn(() => Promise.resolve(new Response(null, { status: 204 })));
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env = ORIGINAL_ENV;
  });

  it('should POST an error to the same-origin ingest route', async () => {
    const logger = await freshLogger();

    logger.error('renderer', 'NaN detected in props', undefined, { contentId: 42 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/client-errors');
    expect((init as RequestInit).method).toBe('POST');
    expect((init as RequestInit).keepalive).toBe(true);
  });

  it('should carry the page URL, since a client stack alone does not say where', async () => {
    const logger = await freshLogger();

    logger.error('renderer', 'NaN detected in props');

    const context = bodyOf(fetchMock.mock.calls[0]).context as Record<string, unknown>;
    expect(typeof context.url).toBe('string');
  });

  it('should report the flattened error, not an empty object', async () => {
    const logger = await freshLogger();

    logger.error('app', 'Unhandled error boundary', new Error('kaboom'));

    expect(bodyOf(fetchMock.mock.calls[0]).error).toMatchObject({
      name: 'Error',
      message: 'kaboom',
    });
  });

  it('should not report warn or debug', async () => {
    const logger = await freshLogger();

    logger.warn('users', 'Missing endpoint');
    logger.debug('layout', 'Measured');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('should stop reporting once the per-page budget is spent', async () => {
    const logger = await freshLogger();

    for (let i = 0; i < 25; i += 1) {
      logger.error('renderer', `failure ${i}`);
    }

    expect(fetchMock).toHaveBeenCalledTimes(20);
  });

  it('should keep writing to the console after the budget is spent', async () => {
    const logger = await freshLogger();
    const consoleError = console.error as jest.Mock;

    for (let i = 0; i < 25; i += 1) {
      logger.error('renderer', `failure ${i}`);
    }

    expect(consoleError).toHaveBeenCalledTimes(25);
  });

  it('should swallow a failed report rather than raise a second error', async () => {
    const logger = await freshLogger();
    fetchMock.mockRejectedValue(new Error('offline'));

    expect(() => logger.error('app', 'original failure')).not.toThrow();
  });

  it('should survive fetch throwing synchronously', async () => {
    const logger = await freshLogger();
    fetchMock.mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(() => logger.error('app', 'original failure')).not.toThrow();
  });
});
