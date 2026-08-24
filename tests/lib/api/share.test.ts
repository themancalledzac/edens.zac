/**
 * Unit tests for the user share-link API module (B8 coverage gap — `share.ts` had none).
 *
 * Mirrors the fetch-mock idiom of tests/lib/api/selects.test.ts and tests/lib/api/personal.test.ts:
 * a global fetch mock for the owner-side mutations, a mocked `fetchReadApi` for the server-side
 * reads, and assertions on the exact URL + RequestInit rather than a loose shape match. The
 * `expect.objectContaining` the siblings use would let an added `method` or a dropped
 * `credentials` slip through, so every request assertion here compares the full init object.
 *
 * Covers all nine function exports: getShareView, getCurrentShareView, readShareSettings,
 * plantShareCookie, rotateShareLink, emailShareLink, addShareCollection, removeShareCollection,
 * buildShareUrl. The four type exports (ShareView, ShareSettings, ShareEmailResult,
 * ShareSettingsRead) are exercised through the values those functions return.
 */

import { ApiError, fetchReadApi } from '@/app/lib/api/core';
import {
  addShareCollection,
  buildShareUrl,
  emailShareLink,
  getCurrentShareView,
  getShareView,
  plantShareCookie,
  readShareSettings,
  removeShareCollection,
  rotateShareLink,
  type ShareSettings,
  type ShareView,
} from '@/app/lib/api/share';
import { logger } from '@/app/utils/logger';
import { createCollectionModel } from '@/tests/fixtures/contentFixtures';

// Keep ApiError real — every error spec asserts on the real class — while making the server
// reader `fetchReadApi` a controllable mock for the read specs.
jest.mock('@/app/lib/api/core', () => ({
  ...jest.requireActual('@/app/lib/api/core'),
  fetchReadApi: jest.fn(),
}));

// The real logger no-ops under NODE_ENV=test, so mock it to assert the fail-soft read reports.
jest.mock('@/app/utils/logger', () => ({
  logger: { debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const fetchReadApiMock = fetchReadApi as jest.Mock;
const loggerErrorMock = logger.error as jest.Mock;

global.fetch = jest.fn();

const page = createCollectionModel(7, { slug: 'zac' });

const view: ShareView = { ownerName: 'Zac', page };

const settings: ShareSettings = {
  exists: true,
  token: 'tok-123',
  createdAt: '2026-01-01T00:00:00Z',
  rotatedAt: null,
  lastUsedAt: null,
  optedInCollectionIds: [3, 5],
  candidateCollections: [page],
};

/** A non-OK Response stub whose JSON body carries a backend `message`. */
function jsonFailure(status: number, body: unknown) {
  return {
    ok: false,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  (global.fetch as jest.Mock).mockReset();
});

describe('getShareView', () => {
  it('reads the token-scoped recipient view with no-store', async () => {
    fetchReadApiMock.mockResolvedValueOnce(view);

    await expect(getShareView('tok-123')).resolves.toEqual(view);
    expect(fetchReadApiMock).toHaveBeenCalledWith('share/tok-123', { cache: 'no-store' });
  });

  it('percent-encodes the token so a slash cannot forge a different path', async () => {
    fetchReadApiMock.mockResolvedValueOnce(view);

    await getShareView('a/b c');

    expect(fetchReadApiMock).toHaveBeenCalledWith('share/a%2Fb%20c', { cache: 'no-store' });
  });

  it('returns null on 404, which covers an unknown and a reset token alike', async () => {
    fetchReadApiMock.mockRejectedValueOnce(new ApiError('not found', 404));

    await expect(getShareView('tok-123')).resolves.toBeNull();
  });

  it('does NOT swallow a 401 — only 404 means "no such link"', async () => {
    fetchReadApiMock.mockRejectedValueOnce(new ApiError('unauth', 401));

    await expect(getShareView('tok-123')).rejects.toMatchObject({ name: 'ApiError', status: 401 });
  });

  it('rethrows a 500 rather than reporting the link as missing', async () => {
    fetchReadApiMock.mockRejectedValueOnce(new ApiError('boom', 500));

    await expect(getShareView('tok-123')).rejects.toMatchObject({ status: 500 });
  });

  it('rethrows a failure that is not an ApiError at all', async () => {
    fetchReadApiMock.mockRejectedValueOnce(new TypeError('fetch failed'));

    await expect(getShareView('tok-123')).rejects.toBeInstanceOf(TypeError);
  });

  it('passes a null body (204) straight through', async () => {
    fetchReadApiMock.mockResolvedValueOnce(null);

    await expect(getShareView('tok-123')).resolves.toBeNull();
  });
});

describe('getCurrentShareView', () => {
  it('reads the cookie-scoped view with no-store', async () => {
    fetchReadApiMock.mockResolvedValueOnce(view);

    await expect(getCurrentShareView()).resolves.toEqual(view);
    expect(fetchReadApiMock).toHaveBeenCalledWith('share/view', { cache: 'no-store' });
  });

  it('returns null on 401 — the cookie is absent', async () => {
    fetchReadApiMock.mockRejectedValueOnce(new ApiError('unauth', 401));

    await expect(getCurrentShareView()).resolves.toBeNull();
  });

  it('returns null on 404 — the link behind the cookie was reset', async () => {
    fetchReadApiMock.mockRejectedValueOnce(new ApiError('gone', 404));

    await expect(getCurrentShareView()).resolves.toBeNull();
  });

  it('rethrows a 500', async () => {
    fetchReadApiMock.mockRejectedValueOnce(new ApiError('boom', 500));

    await expect(getCurrentShareView()).rejects.toMatchObject({ status: 500 });
  });

  it('rethrows a failure that is not an ApiError', async () => {
    fetchReadApiMock.mockRejectedValueOnce(new TypeError('fetch failed'));

    await expect(getCurrentShareView()).rejects.toBeInstanceOf(TypeError);
  });
});

/**
 * The fail-soft owner read. `{ ok: true, settings: null }` is "you have no link yet";
 * `{ ok: false }` is "the read failed, so nothing is known". Collapsing the two would have the
 * Share card offer "Create a link" to someone whose link is already in circulation.
 */
describe('readShareSettings', () => {
  it('reads the owner endpoint with no-store and reports the settings as loaded', async () => {
    fetchReadApiMock.mockResolvedValueOnce(settings);

    await expect(readShareSettings()).resolves.toEqual({ ok: true, settings });
    expect(fetchReadApiMock).toHaveBeenCalledWith('user/share', { cache: 'no-store' });
  });

  it('reports a genuine empty as loaded when fetchReadApi returns null (204)', async () => {
    fetchReadApiMock.mockResolvedValueOnce(null);

    await expect(readShareSettings()).resolves.toEqual({ ok: true, settings: null });
  });

  it('reports a 401 as loaded-with-no-link, matching getUserPage', async () => {
    fetchReadApiMock.mockRejectedValueOnce(new ApiError('unauth', 401));

    await expect(readShareSettings()).resolves.toEqual({ ok: true, settings: null });
  });

  it('stays quiet on the 401, which is expected rather than broken', async () => {
    fetchReadApiMock.mockRejectedValueOnce(new ApiError('unauth', 401));

    await readShareSettings();

    expect(loggerErrorMock).not.toHaveBeenCalled();
  });

  it('reports unavailable on a 500 instead of claiming there is no link', async () => {
    fetchReadApiMock.mockRejectedValueOnce(new ApiError('boom', 500));

    await expect(readShareSettings()).resolves.toEqual({ ok: false });
  });

  it('logs the non-401 failure rather than swallowing it', async () => {
    const boom = new ApiError('boom', 500);
    fetchReadApiMock.mockRejectedValueOnce(boom);

    await readShareSettings();

    expect(loggerErrorMock).toHaveBeenCalledWith('share', 'Could not load share settings', boom);
  });

  it('reports unavailable and logs when the failure is not an ApiError at all', async () => {
    fetchReadApiMock.mockRejectedValueOnce(new TypeError('fetch failed'));

    await expect(readShareSettings()).resolves.toEqual({ ok: false });
    expect(loggerErrorMock).toHaveBeenCalledWith(
      'share',
      'Could not load share settings',
      expect.any(TypeError)
    );
  });

  it('carries no settings key on the failure arm, so a caller cannot read it as "no link"', async () => {
    fetchReadApiMock.mockRejectedValueOnce(new ApiError('boom', 500));

    await expect(readShareSettings()).resolves.not.toHaveProperty('settings');
  });
});

describe('plantShareCookie', () => {
  it('GETs the token-scoped read route with same-origin credentials and no-store', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 204,
      headers: new Headers(),
    });

    await expect(plantShareCookie('tok-123')).resolves.toBeUndefined();

    expect(global.fetch).toHaveBeenCalledWith('/api/proxy/api/read/share/tok-123', {
      credentials: 'same-origin',
      cache: 'no-store',
    });
  });

  it('percent-encodes the token', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 204,
      headers: new Headers(),
    });

    await plantShareCookie('a/b c');

    expect(global.fetch).toHaveBeenCalledWith('/api/proxy/api/read/share/a%2Fb%20c', {
      credentials: 'same-origin',
      cache: 'no-store',
    });
  });

  it('throws ApiError on a non-OK response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(jsonFailure(410, { message: 'link reset' }));

    await expect(plantShareCookie('tok-123')).rejects.toMatchObject({
      name: 'ApiError',
      status: 410,
      message: 'link reset',
    });
  });
});

/**
 * The shared non-OK error mapper. It is not exported, so it is driven through plantShareCookie —
 * every mutation that reaches a fetch in this module funnels into the same helper.
 */
describe('error mapping for a non-OK response', () => {
  it('uses the backend message field from a JSON body', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(jsonFailure(403, { message: 'forbidden' }));

    await expect(plantShareCookie('t')).rejects.toMatchObject({
      status: 403,
      message: 'forbidden',
    });
  });

  it('stringifies a JSON body that has no message field', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(jsonFailure(422, { errors: ['bad token'] }));

    await expect(plantShareCookie('t')).rejects.toMatchObject({
      status: 422,
      message: '{"errors":["bad token"]}',
    });
  });

  it('uses a JSON string body verbatim', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(jsonFailure(400, 'plain string body'));

    await expect(plantShareCookie('t')).rejects.toMatchObject({
      status: 400,
      message: 'plain string body',
    });
  });

  it('reads a non-JSON body as text', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 502,
      headers: new Headers({ 'content-type': 'text/plain' }),
      text: async () => 'upstream is down',
    });

    await expect(plantShareCookie('t')).rejects.toMatchObject({
      status: 502,
      message: 'upstream is down',
    });
  });

  it('reads the body as text when the response carries no content-type at all', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 503,
      headers: new Headers(),
      text: async () => 'no content type here',
    });

    await expect(plantShareCookie('t')).rejects.toMatchObject({
      status: 503,
      message: 'no content type here',
    });
  });

  it('falls back to the status when the body is empty', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers({ 'content-type': 'text/plain' }),
      text: async () => '',
    });

    await expect(plantShareCookie('t')).rejects.toMatchObject({
      status: 500,
      message: 'API error: 500',
    });
  });

  it('falls back to the status when parsing the body throws', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 504,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => {
        throw new SyntaxError('Unexpected end of JSON input');
      },
    });

    await expect(plantShareCookie('t')).rejects.toMatchObject({
      status: 504,
      message: 'API error: 504',
    });
  });
});

describe('rotateShareLink', () => {
  it('POSTs to the rotate route and returns the newly minted settings', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => settings,
    });

    await expect(rotateShareLink()).resolves.toEqual(settings);

    expect(global.fetch).toHaveBeenCalledWith('/api/proxy/api/read/user/share/rotate', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
    });
  });

  it('throws ApiError on a non-OK response instead of returning a half-built settings object', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(jsonFailure(401, { message: 'unauthorized' }));

    await expect(rotateShareLink()).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
      message: 'unauthorized',
    });
  });
});

/**
 * The client half of C7: the backend has no `/api/read/user/share/email` route, so this POST 404s
 * in the real app. These specs pin the request the frontend sends today — they are not a claim that
 * the call succeeds. When C7 lands (route built, or the Send button removed) this describe changes
 * with it.
 */
describe('emailShareLink', () => {
  it('POSTs the recipient address as JSON to the email route', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ sent: true, reason: null }),
    });

    await expect(emailShareLink('friend@example.com')).resolves.toEqual({
      sent: true,
      reason: null,
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/proxy/api/read/user/share/email', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toEmail: 'friend@example.com' }),
      cache: 'no-store',
    });
  });

  it('returns a not-sent result with a reason when the backend declines', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ sent: false, reason: 'daily limit reached' }),
    });

    await expect(emailShareLink('friend@example.com')).resolves.toEqual({
      sent: false,
      reason: 'daily limit reached',
    });
  });

  it('throws ApiError on the 404 the missing backend route actually returns', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      headers: new Headers({ 'content-type': 'text/html' }),
      text: async () => 'Not Found',
    });

    await expect(emailShareLink('friend@example.com')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
    });
  });
});

describe('addShareCollection', () => {
  it('PUTs the collection into the shared view', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 204,
      headers: new Headers(),
    });

    await expect(addShareCollection(7)).resolves.toBeUndefined();

    expect(global.fetch).toHaveBeenCalledWith('/api/proxy/api/read/user/share/collections/7', {
      method: 'PUT',
      credentials: 'same-origin',
      cache: 'no-store',
    });
  });

  it('throws ApiError on a non-OK response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(jsonFailure(403, { message: 'not yours' }));

    await expect(addShareCollection(7)).rejects.toMatchObject({
      status: 403,
      message: 'not yours',
    });
  });
});

describe('removeShareCollection', () => {
  it('DELETEs the collection out of the shared view', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 204,
      headers: new Headers(),
    });

    await expect(removeShareCollection(7)).resolves.toBeUndefined();

    expect(global.fetch).toHaveBeenCalledWith('/api/proxy/api/read/user/share/collections/7', {
      method: 'DELETE',
      credentials: 'same-origin',
      cache: 'no-store',
    });
  });

  it('throws ApiError on a non-OK response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(jsonFailure(404, { message: 'not opted in' }));

    await expect(removeShareCollection(7)).rejects.toMatchObject({ status: 404 });
  });
});

describe('buildShareUrl', () => {
  it('joins the origin and the token under /s/', () => {
    expect(buildShareUrl('tok-123', 'https://edens.zac')).toBe('https://edens.zac/s/tok-123');
  });

  it('strips a trailing slash from the origin so the path has no double slash', () => {
    expect(buildShareUrl('tok-123', 'https://edens.zac/')).toBe('https://edens.zac/s/tok-123');
  });

  it('strips repeated trailing slashes', () => {
    expect(buildShareUrl('tok-123', 'https://edens.zac///')).toBe('https://edens.zac/s/tok-123');
  });

  it('leaves slashes inside the origin alone', () => {
    expect(buildShareUrl('tok-123', 'http://localhost:3000')).toBe(
      'http://localhost:3000/s/tok-123'
    );
  });

  it('does not encode the token — the reads that consume it do the encoding', () => {
    expect(buildShareUrl('a/b', 'https://edens.zac')).toBe('https://edens.zac/s/a/b');
  });
});
