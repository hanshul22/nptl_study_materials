import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { ConfigError, parseConfig, type Config } from './env.js';

// Resolved from this file (not cwd) so it works from the repo root, backend/, and dist/.
// Real environment variables win over the file (dotenv does not override).
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });

function load(): Config {
  try {
    return parseConfig(process.env);
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(err.message);
      process.exit(1);
    }
    throw err;
  }
}

export const config = load();
