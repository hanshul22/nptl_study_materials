import { Schema, model, type Types } from 'mongoose';

/** Persistence shape of a topic (dtos.md section 10). Never returned to clients directly. */
export interface TopicDoc {
  _id: Types.ObjectId;
  ownerId: string;
  name: string;
  nameLower: string;
  /** `null` once cleared (dtos.md section 3); absent on documents that never had one. */
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const topicSchema = new Schema<TopicDoc>(
  {
    ownerId: { type: String, required: true },
    name: { type: String, required: true },
    nameLower: { type: String, required: true },
    description: { type: String },
  },
  { timestamps: true },
);

// Names are unique per owner, case-insensitively (trd.md section 5.1).
topicSchema.index({ ownerId: 1, nameLower: 1 }, { unique: true });

export const TopicModel = model<TopicDoc>('Topic', topicSchema);
