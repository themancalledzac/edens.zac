import { type NextRequest, NextResponse } from 'next/server';

const MAX_BODY_BYTES = 8 * 1024;
const MAX_FIELD_LENGTH = 1_000;
const MAX_SAMPLE_LENGTH = 200;

const CSP_REPORT_CONTENT_TYPES = ['application/csp-report', 'application/reports+json'];

/** Truncate to `limit`, or drop the value entirely when it is not a non-empty string. */
function clip(value: unknown, limit: number): string | undefined {
  if (typeof value !== 'string' || value.length === 0) return undefined;
  return value.length > limit ? `${value.slice(0, limit)}…` : value;
}

/** Keep a finite number, drop anything else. Line and column arrive as numbers or not at all. */
function clipNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/**
 * Ingest a CSP violation report so it reaches CloudWatch.
 *
 * The policy in `next.config.js` is `Content-Security-Policy-Report-Only`, and until this route
 * existed its violations went to visitors' devtools consoles and nowhere else — which made the
 * policy's own graduation condition ("rename it once a pass over the real pages leaves it quiet")
 * impossible to satisfy from production traffic. Writing one clipped JSON line to stdout is the
 * whole mechanism; Amplify ships server stdout to a log group already.
 *
 * There is no `Origin` gate, and that is the difference from `/api/client-errors`. Browsers send
 * `report-uri` posts without a usable `Origin`, so `isAllowedWriteOrigin` would reject every real
 * report. `Content-Type` is checked instead — it is what a browser reliably does send — which
 * bounds accidents rather than abuse. Volume control belongs at the edge with the rest of PF7.
 *
 * `original-policy` is deliberately not logged. It is our own header echoed back on every single
 * report, so it multiplies log volume by a constant and tells us nothing we cannot read here.
 */
export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
  if (!contentType || !CSP_REPORT_CONTENT_TYPES.includes(contentType)) {
    return new NextResponse(null, { status: 415 });
  }

  const declaredLength = Number(req.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return new NextResponse(null, { status: 413 });
  }

  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  if (Buffer.byteLength(raw) > MAX_BODY_BYTES) {
    return new NextResponse(null, { status: 413 });
  }

  let envelope: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return new NextResponse(null, { status: 400 });
    }
    envelope = parsed as Record<string, unknown>;
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const inner = envelope['csp-report'];
  if (typeof inner !== 'object' || inner === null || Array.isArray(inner)) {
    return new NextResponse(null, { status: 400 });
  }
  const report = inner as Record<string, unknown>;

  const violatedDirective =
    clip(report['effective-directive'], 200) ?? clip(report['violated-directive'], 200);
  if (!violatedDirective) {
    return new NextResponse(null, { status: 400 });
  }

  console.error(
    JSON.stringify({
      level: 'error',
      source: 'csp',
      module: 'csp-report',
      message: `CSP violation: ${violatedDirective}`,
      report: {
        documentUri: clip(report['document-uri'], MAX_FIELD_LENGTH),
        referrer: clip(report.referrer, MAX_FIELD_LENGTH),
        violatedDirective,
        blockedUri: clip(report['blocked-uri'], MAX_FIELD_LENGTH),
        disposition: clip(report.disposition, 50),
        sourceFile: clip(report['source-file'], MAX_FIELD_LENGTH),
        lineNumber: clipNumber(report['line-number']),
        columnNumber: clipNumber(report['column-number']),
        scriptSample: clip(report['script-sample'], MAX_SAMPLE_LENGTH),
      },
      userAgent: clip(req.headers.get('user-agent'), 500),
    })
  );

  return new NextResponse(null, { status: 204 });
}
