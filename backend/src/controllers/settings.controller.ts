import type { Request, RequestHandler } from 'express';
import { ENDPOINTS, type SettingsUpdate } from '@study/shared';
import type { Config } from '../config/env.js';
import { getEffectiveSettings, updateSettings } from '../services/settings.service.js';

// createApp stores the parsed config on app.locals.config.
const configOf = (req: Request) => req.app.locals.config as Config;

export const getSettings: RequestHandler = async (req, res) => {
  const settings = await getEffectiveSettings(req.ownerId, configOf(req));
  res.status(ENDPOINTS.getSettings.status).json(settings);
};

export const patchSettings: RequestHandler = async (req, res) => {
  const settings = await updateSettings(req.ownerId, configOf(req), req.body as SettingsUpdate);
  res.status(ENDPOINTS.updateSettings.status).json(settings);
};
