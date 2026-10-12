import { z } from 'zod';

const requiredString = z.string({ error: 'is required' });
const positiveInt = (def: number) => z.coerce.number().int().positive().default(def);

// Keys are the env var names, so issue paths double as variable names in error messages.
const ConfigSchema = z.object({
  PORT: positiveInt(4000),
  MONGODB_URI: requiredString,
  // Normalised to a bare origin so a trailing slash cannot silently break CORS matching later.
  // (z.httpUrl is avoided: it demands a dotted hostname, which rejects http://localhost.)
  FRONTEND_ORIGIN: requiredString
    .refine((v) => URL.canParse(v) && /^https?:$/.test(new URL(v).protocol), 'must be an http(s) URL')
    .transform((v) => new URL(v).origin),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().optional(),
  STORAGE_DRIVER: z.enum(['local']).default('local'),
  STORAGE_LOCAL_DIR: z.string().default('./data/pdf'),
  TMP_DIR: z.string().default('./data/tmp'),
  MAX_PDF_MB: positiveInt(25),
  MAX_PDF_PAGES: positiveInt(300),
  AI_RATE_LIMIT_PER_MIN: positiveInt(20),
});

export type Config = z.infer<typeof ConfigSchema>;

export class ConfigError extends Error {
  constructor(readonly issues: { name: string; reason: string }[]) {
    super(
      `Invalid environment configuration:\n${issues.map((i) => `  - ${i.name}: ${i.reason}`).join('\n')}`,
    );
    this.name = 'ConfigError';
  }
}

/**
 * Pure: validates an env map and returns a typed Config.
 * Empty or whitespace-only values count as missing. On failure the ConfigError lists
 * variable names and reasons only; zod's messages here never echo the received value.
 */
export function parseConfig(env: Record<string, string | undefined>): Config {
  const cleaned = Object.fromEntries(
    Object.entries(ConfigSchema.shape).map(([name]) => {
      const v = env[name];
      return [name, v === undefined || v.trim() === '' ? undefined : v];
    }),
  );
  const result = ConfigSchema.safeParse(cleaned);
  if (!result.success) {
    throw new ConfigError(
      result.error.issues.map((i) => ({ name: String(i.path[0] ?? '(env)'), reason: i.message })),
    );
  }
  return result.data;
}
