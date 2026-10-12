import { Router } from 'express';
import { ENDPOINTS, SettingsUpdate } from '@study/shared';
import { getSettings, patchSettings } from '../controllers/settings.controller.js';
import { validate } from '../middleware/validate.js';

// Paths are relative to /api/v1 (mounted in createApp).
export const settingsRouter = Router();

settingsRouter.get(ENDPOINTS.getSettings.path, getSettings);
settingsRouter.patch(
  ENDPOINTS.updateSettings.path,
  validate({ body: SettingsUpdate }),
  patchSettings,
);
