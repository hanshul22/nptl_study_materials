import { z } from 'zod';

// Non-secret only. The OpenRouter API key never appears in a DTO.
export const Settings = z.object({
  model: z.string().min(1), // OpenRouter model id
  maxChunks: z.number().int().min(1).max(12), // chunks sent per AI call
  maxTokens: z.number().int().min(100).max(4000),
  temperature: z.number().min(0).max(1),
  aiConfigured: z.boolean(), // read-only: true when the key is set
});
export type Settings = z.infer<typeof Settings>;

export const SettingsUpdate = Settings.omit({ aiConfigured: true }).partial();
export type SettingsUpdate = z.infer<typeof SettingsUpdate>;
