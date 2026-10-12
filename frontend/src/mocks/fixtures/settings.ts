import type { Settings } from '@study/shared';

/** Fresh object on every call. */
export const settingsFixture = (): Settings => ({
  model: 'openrouter/auto',
  maxChunks: 6,
  maxTokens: 1200,
  temperature: 0.2,
  aiConfigured: false,
});
