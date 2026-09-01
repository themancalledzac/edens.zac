const CLIENT_ERROR_INGEST_PATH = '/api/client-errors';

/**
 * Client error reports allowed per page load.
 *
 * A `logger.error` reached from inside a render fires once per component, per render, per
 * viewer, so an uncapped reporter turns one bad prop into unbounded writes. Call sites that can
 * fire from a render must dedupe themselves as well — this budget is the backstop, not the fix.
 */
const CLIENT_REPORT_BUDGET = 20;

let clientReportsRemaining = CLIENT_REPORT_BUDGET;

type LogLevel = 'debug' | 'warn' | 'error';

type SerializedError = {
  name?: string;
  message: string;
  stack?: string;
  digest?: string;
};

type LogPayload = {
  level: LogLevel;
  module: string;
  message: string;
  error?: SerializedError;
  context?: Record<string, unknown>;
};

/**
 * Flatten a thrown value into plain fields.
 *
 * An `Error` does not survive `JSON.stringify` — `name`, `message` and `stack` are all
 * non-enumerable — so a structured line built from the raw value logs `{}`. `digest` is carried
 * through because it is the only identifier shared between a user-visible error page and the
 * server line for the same failure.
 */
function serializeError(error: unknown): SerializedError | undefined {
  if (error === undefined || error === null) return undefined;

  if (error instanceof Error) {
    const { digest } = error as Error & { digest?: unknown };
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(typeof digest === 'string' ? { digest } : {}),
    };
  }

  return { message: String(error) };
}

function buildPayload(
  level: LogLevel,
  module: string,
  message: string,
  error?: unknown,
  context?: Record<string, unknown>
): LogPayload {
  const serialized = serializeError(error);

  return {
    level,
    module,
    message,
    ...(serialized ? { error: serialized } : {}),
    ...(context ? { context } : {}),
  };
}

/**
 * Serialize a payload, falling back to its scalar fields when `context` cannot be stringified.
 *
 * Callers pass whatever they have to hand, and a cyclic or getter-throwing value in `context`
 * would otherwise make the logger itself throw at the point something has already gone wrong.
 */
function toLine(payload: LogPayload): string {
  try {
    return JSON.stringify(payload);
  } catch {
    const { level, module, message, error } = payload;
    return JSON.stringify({ level, module, message, error, context: 'unserializable' });
  }
}

/**
 * Post an error to the same-origin ingest route.
 *
 * Browser `console.error` reaches nobody. The route is a server process whose stdout Amplify
 * ships to CloudWatch, so this is what puts a client-side failure in the same place as a
 * server one. Fire-and-forget on purpose: a failed report must never surface as a second error,
 * and nothing here may call back into {@link logger}.
 */
function reportToServer(payload: LogPayload): void {
  if (typeof window === 'undefined') return;
  if (clientReportsRemaining <= 0) return;
  clientReportsRemaining -= 1;

  const body = toLine({
    ...payload,
    context: { ...payload.context, url: window.location.href },
  });

  try {
    void fetch(CLIENT_ERROR_INGEST_PATH, {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body,
    }).catch(() => {});
  } catch {
    return;
  }
}

function write(
  level: LogLevel,
  module: string,
  message: string,
  error?: unknown,
  context?: Record<string, unknown>
): void {
  if (process.env.NODE_ENV === 'test') return;

  const payload = buildPayload(level, module, message, error, context);

  if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
    console[level](toLine(payload));
  } else {
    const detail = level === 'error' ? [error ?? '', context ?? ''] : [context ?? ''];
    console[level](`[${module}] ${message}`, ...detail);
  }

  if (level === 'error') reportToServer(payload);
}

/**
 * Application logger.
 *
 * On the production server each line is one JSON object, because Amplify Hosting ships this
 * app's stdout to CloudWatch and Logs Insights can only filter on fields it can parse.
 * Everywhere else the output stays `[module] message`, which is what reads well in a terminal.
 *
 * Deliberately no timestamp: CloudWatch stamps every event on ingest, and a `new Date()` here
 * would make any render that logs dynamic under Cache Components.
 */
export const logger = {
  debug(module: string, message: string, context?: Record<string, unknown>) {
    write('debug', module, message, undefined, context);
  },
  warn(module: string, message: string, context?: Record<string, unknown>) {
    write('warn', module, message, undefined, context);
  },
  error(module: string, message: string, error?: unknown, context?: Record<string, unknown>) {
    write('error', module, message, error, context);
  },
};
