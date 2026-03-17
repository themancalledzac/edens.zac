type LogLevel = 'debug' | 'warn' | 'error';

 
const _logLevelCheck: LogLevel = 'debug';

export const logger = {
  debug(module: string, message: string, context?: Record<string, unknown>) {
    if (process.env.NODE_ENV === 'test') return;
    console.debug(`[${module}] ${message}`, context ?? '');
  },
  warn(module: string, message: string, context?: Record<string, unknown>) {
    if (process.env.NODE_ENV === 'test') return;
    console.warn(`[${module}] ${message}`, context ?? '');
  },
  error(module: string, message: string, error?: unknown, context?: Record<string, unknown>) {
    if (process.env.NODE_ENV === 'test') return;
    console.error(`[${module}] ${message}`, error ?? '', context ?? '');
  },
};
