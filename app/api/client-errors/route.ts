import { type NextRequest, NextResponse } from 'next/server';

import { isAllowedWriteOrigin } from '@/app/utils/originAllowlist';

const MAX_BODY_BYTES = 8 * 1024;
const MAX_FIELD_LENGTH = 2_000;
const MAX_STACK_LENGTH = 4_000;

/** Truncate to `limit`, or drop the value entirely when it is not a string. */
function clip(value: unknown, limit: number): string | undefined {
  if (typeof value !== 'string' || value.length === 0) return undefined;
  return value.length > limit ? `${value.slice(0, limit)}…` : value;
}

/**
 * Re-serialize whatever the browser sent as a bounded string.
 *
 * `context` is caller-shaped, so it is carried as one clipped string rather than spread into
 * the log line — an attacker-chosen key would otherwise be able to overwrite `level` or
 * `module` and make a report unfindable.
 */
function clipContext(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  try {
    return clip(JSON.stringify(value), MAX_FIELD_LENGTH);
  } catch {
    return 'unserializable';
  }
}

/**
 * Ingest a browser error so it reaches CloudWatch.
 *
 * Amplify Hosting ships this app's server stdout to a CloudWatch log group; a browser
 * `console.error` reaches nothing. Writing the report to stdout here is the whole mechanism —
 * there is no AWS SDK call, no log group to create and no execution-role permission.
 *
 * Anonymous by design: the viewers whose errors matter most are the ones who never sign in, so
 * a session gate would discard the reports worth having. `Origin` is checked with the same
 * helper `/api/revalidate` and the BFF proxy use, which stops a hostile page from firing this
 * from a real browser. A non-browser client can forge the header, so this bounds cost rather
 * than preventing abuse — volume control belongs at the edge, with the rest of PF7.
 *
 * Everything is clipped and re-serialized rather than echoed: the body is untrusted input that
 * ends up in a log a human will read.
 */
export async function POST(req: NextRequest) {
  if (!isAllowedWriteOrigin(req.headers.get('origin'))) {
    return new NextResponse(null, { status: 403 });
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

  if (raw.length > MAX_BODY_BYTES) {
    return new NextResponse(null, { status: 413 });
  }

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return new NextResponse(null, { status: 400 });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const message = clip(body.message, MAX_FIELD_LENGTH);
  if (!message) {
    return new NextResponse(null, { status: 400 });
  }

  const reported = (
    typeof body.error === 'object' && body.error !== null ? body.error : {}
  ) as Record<string, unknown>;

  console.error(
    JSON.stringify({
      level: 'error',
      source: 'client',
      module: clip(body.module, 200) ?? 'unknown',
      message,
      error: {
        name: clip(reported.name, 200),
        message: clip(reported.message, MAX_FIELD_LENGTH),
        stack: clip(reported.stack, MAX_STACK_LENGTH),
        digest: clip(reported.digest, 200),
      },
      context: clipContext(body.context),
      userAgent: clip(req.headers.get('user-agent'), 500),
    })
  );

  return new NextResponse(null, { status: 204 });
}
