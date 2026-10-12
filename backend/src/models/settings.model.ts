import { Schema, model, type Types } from 'mongoose';

/**
 * One document per owner. Only values the user changed are stored; everything else falls
 * back to env/defaults when read. `aiConfigured` is computed from env and never stored,
 * and no secret is ever stored here.
 */
export interface SettingsDoc {
  _id: Types.ObjectId;
  ownerId: string;
  model?: string;
  maxChunks?: number;
  maxTokens?: number;
  temperature?: number;
  createdAt: Date;
  updatedAt: Date;
}

const settingsSchema = new Schema<SettingsDoc>(
  {
    ownerId: { type: String, required: true },
    model: { type: String },
    maxChunks: { type: Number },
    maxTokens: { type: Number },
    temperature: { type: Number },
  },
  // `model` is also a Mongoose Document method name; reads here are lean, so the field is safe.
  { timestamps: true, suppressReservedKeysWarning: true },
);

settingsSchema.index({ ownerId: 1 }, { unique: true });

export const SettingsModel = model<SettingsDoc>('Settings', settingsSchema);
