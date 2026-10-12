import { TopicModel, type TopicDoc } from '../models/topic.model.js';

/** Signal for a unique-index violation (Mongo error 11000); the service maps it to an AppError. */
export class DuplicateKeyError extends Error {
  constructor() {
    super('Duplicate key');
    this.name = 'DuplicateKeyError';
  }
}

export interface NewTopic {
  name: string;
  nameLower: string;
  description: string | null;
}

export type TopicPatch = Partial<NewTopic>;

function rethrowDuplicate(err: unknown): never {
  if (typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 11000) {
    throw new DuplicateKeyError();
  }
  throw err;
}

// Every query filters by ownerId (trd.md section 4.2). `id` must already be a valid ObjectId string.
export const topicsRepository = {
  list(ownerId: string): Promise<TopicDoc[]> {
    return TopicModel.find({ ownerId }).sort({ createdAt: 1, _id: 1 }).lean().exec();
  },

  findById(ownerId: string, id: string): Promise<TopicDoc | null> {
    return TopicModel.findOne({ _id: id, ownerId }).lean().exec();
  },

  async create(ownerId: string, data: NewTopic): Promise<TopicDoc> {
    try {
      const doc = await TopicModel.create({ ownerId, ...data });
      return doc.toObject();
    } catch (err) {
      return rethrowDuplicate(err);
    }
  },

  async update(ownerId: string, id: string, patch: TopicPatch): Promise<TopicDoc | null> {
    try {
      return await TopicModel.findOneAndUpdate({ _id: id, ownerId }, { $set: patch }, { new: true })
        .lean()
        .exec();
    } catch (err) {
      return rethrowDuplicate(err);
    }
  },

  /** Resolves to false when nothing matched. */
  async remove(ownerId: string, id: string): Promise<boolean> {
    const res = await TopicModel.deleteOne({ _id: id, ownerId }).exec();
    return res.deletedCount > 0;
  },
};
