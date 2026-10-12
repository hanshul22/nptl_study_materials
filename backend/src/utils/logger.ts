import pino, { type DestinationStream, type Logger } from 'pino';

export interface LoggerOptions {
  /** Where to write; defaults to stdout. Tests pass a capturing stream. */
  destination?: DestinationStream;
  /** Overrides the default level ('silent' when NODE_ENV is 'test', otherwise 'info'). */
  level?: string;
}

// Defense in depth: the request logger never logs headers or bodies, but anything that does
// log a request object or the API key by mistake gets it masked.
const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'OPENROUTER_API_KEY',
  '*.OPENROUTER_API_KEY',
];

export function createLogger(options: LoggerOptions = {}): Logger {
  const level = options.level ?? (process.env.NODE_ENV === 'test' ? 'silent' : 'info');
  return pino(
    { level, redact: { paths: REDACT_PATHS, censor: '[Redacted]' } },
    options.destination,
  );
}
