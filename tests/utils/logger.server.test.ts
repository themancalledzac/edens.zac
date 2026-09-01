/**
 * @jest-environment node
 *
 * Server-side output format.
 *
 * Amplify ships this app's stdout to CloudWatch, and Logs Insights can only filter on fields it
 * can parse — so on the production server every line has to be one JSON object, and the fields
 * a reader needs (`level`, `module`, and a real stack) have to survive `JSON.stringify`. An
 * `Error` does not survive it unassisted, which is the failure these cases exist to catch.
 *
 * Dev output is pinned too. It is the format a human reads in a terminal, and a change that
 * quietly made it JSON would be a regression nobody would file.
 */

import { logger } from '@/app/utils/logger';

type Env = 'production' | 'development' | 'test';

const ORIGINAL_ENV = process.env;

function setEnv(nodeEnv: Env) {
  process.env = { ...ORIGINAL_ENV, NODE_ENV: nodeEnv };
}

function lastLineAsJson(spy: jest.SpyInstance): Record<string, unknown> {
  const args = spy.mock.calls.at(-1);
  expect(args).toHaveLength(1);
  return JSON.parse(args?.[0] as string) as Record<string, unknown>;
}

describe('logger — production server output', () => {
  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    setEnv('production');
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env = ORIGINAL_ENV;
  });

  it('should emit one JSON object carrying level, module and message', () => {
    logger.error('proxy', 'Upstream refused the connection');

    expect(lastLineAsJson(errorSpy)).toEqual({
      level: 'error',
      module: 'proxy',
      message: 'Upstream refused the connection',
    });
  });

  it('should flatten an Error, whose fields do not survive JSON.stringify unassisted', () => {
    const error = new TypeError('width is not a number');

    logger.error('renderer', 'Bad props', error);

    const line = lastLineAsJson(errorSpy);
    expect(line.error).toMatchObject({ name: 'TypeError', message: 'width is not a number' });
    expect(typeof (line.error as { stack: unknown }).stack).toBe('string');
  });

  it('should carry error.digest, the only id shared with the error page a viewer saw', () => {
    const error = Object.assign(new Error('boom'), { digest: '1234567890' });

    logger.error('app', 'Unhandled error boundary', error);

    expect((lastLineAsJson(errorSpy).error as { digest: string }).digest).toBe('1234567890');
  });

  it('should stringify a thrown non-Error rather than dropping it', () => {
    logger.error('app', 'Rejected', 'a bare string');

    expect(lastLineAsJson(errorSpy).error).toEqual({ message: 'a bare string' });
  });

  it('should keep logging when context cannot be serialized', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;

    expect(() => logger.error('app', 'Still worth a line', undefined, cyclic)).not.toThrow();

    const line = lastLineAsJson(errorSpy);
    expect(line.message).toBe('Still worth a line');
    expect(line.context).toBe('unserializable');
  });

  it('should structure warn as well, so one query reads both channels', () => {
    logger.warn('users', 'Saved-images endpoint missing', { userId: 7 });

    expect(lastLineAsJson(warnSpy)).toEqual({
      level: 'warn',
      module: 'users',
      message: 'Saved-images endpoint missing',
      context: { userId: 7 },
    });
  });
});

describe('logger — development output', () => {
  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    setEnv('development');
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env = ORIGINAL_ENV;
  });

  it('should stay human-readable rather than JSON', () => {
    const error = new Error('nope');

    logger.error('proxy', 'Upstream refused', error, { path: '/api' });

    expect(errorSpy).toHaveBeenCalledWith('[proxy] Upstream refused', error, { path: '/api' });
  });

  it('should not pad warn with an empty error slot', () => {
    logger.warn('users', 'Missing endpoint', { userId: 7 });

    expect(warnSpy).toHaveBeenCalledWith('[users] Missing endpoint', { userId: 7 });
  });
});

describe('logger — test environment', () => {
  it('should stay silent so suites are not noisy', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    logger.error('app', 'should not print');

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
