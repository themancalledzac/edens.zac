/**
 * @jest-environment node
 *
 * Gates and clipping on POST /api/csp-report.
 *
 * This route cannot reuse the `Origin` gate the other write routes share: browsers post
 * `report-uri` violations without a usable `Origin`, so the check that protects
 * `/api/client-errors` would reject every real report. `Content-Type` is the gate instead, and
 * the cases below pin that substitution along with the two things that make a report useful in
 * a log — the envelope being unwrapped, and `original-policy` never reaching the line.
 */

import { NextRequest } from 'next/server';

import { POST } from '@/app/api/csp-report/route';

const VALID_REPORT = {
  'csp-report': {
    'document-uri': 'https://zacedens.com/photography',
    referrer: '',
    'violated-directive': "script-src 'self'",
    'effective-directive': 'script-src',
    'original-policy': "default-src 'self'; report-uri /api/csp-report",
    disposition: 'report',
    'blocked-uri': 'https://evil.example.com/x.js',
    'source-file': 'https://zacedens.com/photography',
    'line-number': 42,
    'column-number': 7,
    'status-code': 200,
  },
};

function makeRequest(
  body: unknown,
  {
    contentType = 'application/csp-report',
    contentLength,
  }: { contentType?: string | null; contentLength?: string } = {}
) {
  const raw = typeof body === 'string' ? body : JSON.stringify(body);

  return new NextRequest('http://localhost:3000/api/csp-report', {
    method: 'POST',
    headers: {
      ...(contentType ? { 'content-type': contentType } : {}),
      'user-agent': 'jest',
      ...(contentLength ? { 'content-length': contentLength } : {}),
    },
    body: raw,
  });
}

function loggedLine(spy: jest.SpyInstance): Record<string, unknown> {
  return JSON.parse(spy.mock.calls.at(-1)?.[0] as string) as Record<string, unknown>;
}

describe('POST /api/csp-report', () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('content-type gate', () => {
    it('should accept the type browsers send for report-uri', async () => {
      const res = await POST(makeRequest(VALID_REPORT));

      expect(res.status).toBe(204);
      expect(errorSpy).toHaveBeenCalledTimes(1);
    });

    it('should accept the Reporting API type as well', async () => {
      const res = await POST(
        makeRequest(VALID_REPORT, { contentType: 'application/reports+json' })
      );

      expect(res.status).toBe(204);
    });

    it('should ignore parameters after the media type', async () => {
      const res = await POST(
        makeRequest(VALID_REPORT, { contentType: 'application/csp-report; charset=utf-8' })
      );

      expect(res.status).toBe(204);
    });

    it('should reject application/json, which no browser sends here', async () => {
      const res = await POST(makeRequest(VALID_REPORT, { contentType: 'application/json' }));

      expect(res.status).toBe(415);
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('should reject a request with no content-type', async () => {
      const res = await POST(makeRequest(VALID_REPORT, { contentType: null }));

      expect(res.status).toBe(415);
    });

    it('should not require an Origin, because browsers do not send one', async () => {
      const res = await POST(makeRequest(VALID_REPORT));

      expect(res.status).toBe(204);
    });
  });

  describe('body bounds', () => {
    it('should reject a declared content-length over the cap without reading the body', async () => {
      const res = await POST(makeRequest(VALID_REPORT, { contentLength: String(9 * 1024) }));

      expect(res.status).toBe(413);
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('should reject an actual body over the cap when content-length lied', async () => {
      const oversized = {
        'csp-report': { ...VALID_REPORT['csp-report'], 'blocked-uri': 'x'.repeat(9 * 1024) },
      };

      const res = await POST(makeRequest(oversized));

      expect(res.status).toBe(413);
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('should clip a long field rather than logging it whole', async () => {
      const res = await POST(
        makeRequest({
          'csp-report': {
            'effective-directive': 'img-src',
            'blocked-uri': `https://x.example.com/${'a'.repeat(4_000)}`,
          },
        })
      );

      expect(res.status).toBe(204);
      const report = loggedLine(errorSpy).report as Record<string, unknown>;
      expect((report.blockedUri as string).length).toBe(1_001);
      expect(report.blockedUri).toMatch(/…$/);
    });

    it('should clip script-sample harder than the other fields', async () => {
      const res = await POST(
        makeRequest({
          'csp-report': {
            'effective-directive': 'script-src',
            'script-sample': 'b'.repeat(4_000),
          },
        })
      );

      expect(res.status).toBe(204);
      const report = loggedLine(errorSpy).report as Record<string, unknown>;
      expect((report.scriptSample as string).length).toBe(201);
    });
  });

  describe('malformed input', () => {
    it('should reject a body that is not JSON', async () => {
      const res = await POST(makeRequest('not json'));

      expect(res.status).toBe(400);
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('should reject a JSON array', async () => {
      const res = await POST(makeRequest([VALID_REPORT]));

      expect(res.status).toBe(400);
    });

    it('should reject an envelope with no csp-report member', async () => {
      const res = await POST(makeRequest({ report: { 'effective-directive': 'script-src' } }));

      expect(res.status).toBe(400);
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('should reject a report naming no directive', async () => {
      const res = await POST(makeRequest({ 'csp-report': { 'document-uri': 'https://x/' } }));

      expect(res.status).toBe(400);
    });

    it('should drop a line-number that is not a number', async () => {
      const res = await POST(
        makeRequest({
          'csp-report': { 'effective-directive': 'script-src', 'line-number': '42' },
        })
      );

      expect(res.status).toBe(204);
      const report = loggedLine(errorSpy).report as Record<string, unknown>;
      expect(report.lineNumber).toBeUndefined();
    });
  });

  describe('the logged line', () => {
    it('should carry the fields a reader needs to find the violation', async () => {
      await POST(makeRequest(VALID_REPORT));

      const line = loggedLine(errorSpy);
      expect(line.level).toBe('error');
      expect(line.source).toBe('csp');
      expect(line.message).toBe('CSP violation: script-src');

      const report = line.report as Record<string, unknown>;
      expect(report.documentUri).toBe('https://zacedens.com/photography');
      expect(report.blockedUri).toBe('https://evil.example.com/x.js');
      expect(report.violatedDirective).toBe('script-src');
      expect(report.lineNumber).toBe(42);
      expect(report.columnNumber).toBe(7);
      expect(line.userAgent).toBe('jest');
    });

    it('should never echo original-policy, which is our own header on every report', async () => {
      await POST(makeRequest(VALID_REPORT));

      expect(errorSpy.mock.calls.at(-1)?.[0]).not.toContain('original-policy');
      expect(errorSpy.mock.calls.at(-1)?.[0]).not.toContain('originalPolicy');
    });

    it('should fall back to violated-directive when effective-directive is absent', async () => {
      await POST(makeRequest({ 'csp-report': { 'violated-directive': "style-src 'self'" } }));

      const report = loggedLine(errorSpy).report as Record<string, unknown>;
      expect(report.violatedDirective).toBe("style-src 'self'");
    });
  });
});
