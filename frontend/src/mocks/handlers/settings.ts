import { ENDPOINTS, SettingsUpdate, type Settings } from '@study/shared';
import { http, HttpResponse } from 'msw';
import { settingsFixture } from '../fixtures/settings';
import { validationErrorResponse } from '../errors';
import { mockUrl, readJson } from './util';

let settings: Settings = settingsFixture();

/** Restores the seed data. Call in `afterEach` of tests. */
export const resetSettings = (): void => {
  settings = settingsFixture();
};

export const settingsHandlers = [
  http.get(mockUrl(ENDPOINTS.getSettings), () =>
    HttpResponse.json(settings, { status: ENDPOINTS.getSettings.status }),
  ),

  http.patch(mockUrl(ENDPOINTS.updateSettings), async ({ request }) => {
    const parsed = SettingsUpdate.safeParse(await readJson(request));
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);
    // SettingsUpdate has no aiConfigured key, so zod strips it: it stays read-only.
    settings = { ...settings, ...parsed.data };
    return HttpResponse.json(settings, { status: ENDPOINTS.updateSettings.status });
  }),
];
