import type { Settings, SettingsUpdate } from '@study/shared';
import type { Config } from '../config/env.js';
import { SETTINGS_DEFAULTS } from '../config/settingsDefaults.js';
import { settingsRepository } from '../repositories/settings.repository.js';

/**
 * Stored values, then env (`OPENROUTER_MODEL`, model only), then the defaults.
 * `aiConfigured` comes from env only. Exported so B3 and B6 read the same values.
 */
export async function getEffectiveSettings(ownerId: string, config: Config): Promise<Settings> {
  const stored = await settingsRepository.find(ownerId);
  return {
    model: stored?.model ?? config.OPENROUTER_MODEL ?? SETTINGS_DEFAULTS.model,
    maxChunks: stored?.maxChunks ?? SETTINGS_DEFAULTS.maxChunks,
    maxTokens: stored?.maxTokens ?? SETTINGS_DEFAULTS.maxTokens,
    temperature: stored?.temperature ?? SETTINGS_DEFAULTS.temperature,
    aiConfigured: Boolean(config.OPENROUTER_API_KEY),
  };
}

/** `body` is the output of SettingsUpdate. An empty PATCH writes nothing. */
export async function updateSettings(
  ownerId: string,
  config: Config,
  body: SettingsUpdate,
): Promise<Settings> {
  if (Object.keys(body).length > 0) await settingsRepository.upsert(ownerId, body);
  return getEffectiveSettings(ownerId, config);
}
