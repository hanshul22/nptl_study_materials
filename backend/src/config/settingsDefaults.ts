/**
 * Settings used when nothing is stored (dtos.md section 8).
 * `model` is the last fallback after the stored value and env `OPENROUTER_MODEL` (D-024).
 */
export const SETTINGS_DEFAULTS = {
  model: 'openrouter/auto',
  maxChunks: 6,
  maxTokens: 1200,
  temperature: 0.2,
} as const;
