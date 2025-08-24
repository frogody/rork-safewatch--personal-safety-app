type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isProd = process.env.NODE_ENV === 'production';

function log(level: LogLevel, ...args: unknown[]) {
  if (isProd && (level === 'debug' || level === 'info')) return;
  // eslint-disable-next-line no-console
  (console as any)[level] ? (console as any)[level](...args) : console.log(`[${level}]`, ...args);
}

export const Logger = {
  debug: (...args: unknown[]) => log('debug', ...args),
  info: (...args: unknown[]) => log('info', ...args),
  warn: (...args: unknown[]) => log('warn', ...args),
  error: (...args: unknown[]) => log('error', ...args),
  critical: (...args: unknown[]) => log('error', '[CRITICAL]', ...args),
};

// Backwards/forwards compatible alias
export const logger = Logger;


