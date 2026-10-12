import type { SettingsUpdate } from '@study/shared';
import { SettingsModel, type SettingsDoc } from '../models/settings.model.js';

// Every query filters by ownerId (trd.md section 4.2).
export const settingsRepository = {
  find(ownerId: string): Promise<SettingsDoc | null> {
    return SettingsModel.findOne({ ownerId }).lean().exec();
  },

  /**
   * Sets only the provided fields, creating the document on first use.
   * `patch` must not be empty.
   * ponytail: two first-ever PATCHes racing could hit the unique index (11000); one user, so unhandled.
   */
  upsert(ownerId: string, patch: SettingsUpdate): Promise<SettingsDoc> {
    return SettingsModel.findOneAndUpdate(
      { ownerId },
      { $set: patch },
      { upsert: true, returnDocument: 'after' },
    )
      .lean()
      .orFail()
      .exec();
  },
};
