import type { Topic, TopicCreate, TopicUpdate } from '@study/shared';
import type { TopicDoc } from '../models/topic.model.js';
import {
  DuplicateKeyError,
  topicsRepository,
  type TopicPatch,
} from '../repositories/topics.repository.js';
import { AppError } from '../utils/AppError.js';

type TopicCounts = Pick<Topic, 'documentCount' | 'noteCount' | 'mcqSetCount'>;

/**
 * The one place that knows where the counts come from.
 * TODO: B2 (documents), B4 (quick notes) and B5 (MCQ sets) fill their count in here.
 * ponytail: one lookup per topic (N+1) once the collections exist; switch to one
 * aggregation per collection keyed by topicId if the topic list gets large.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- the id is used once real counts exist
function countsFor(_topicId: string): Promise<TopicCounts> {
  return Promise.resolve({ documentCount: 0, noteCount: 0, mcqSetCount: 0 });
}

async function toTopic(doc: TopicDoc): Promise<Topic> {
  const id = doc._id.toString();
  return {
    id,
    name: doc.name,
    description: doc.description ?? null,
    ...(await countsFor(id)),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

const duplicate = () => new AppError('DUPLICATE_TOPIC', 'A topic with this name already exists');
const notFound = () => new AppError('NOT_FOUND', 'Topic not found');

export const topicsService = {
  async list(ownerId: string): Promise<Topic[]> {
    return Promise.all((await topicsRepository.list(ownerId)).map(toTopic));
  },

  /** `input` is the output of TopicCreate (already trimmed). */
  async create(ownerId: string, input: TopicCreate): Promise<Topic> {
    try {
      const doc = await topicsRepository.create(ownerId, {
        name: input.name,
        nameLower: input.name.toLowerCase(),
        description: input.description || null,
      });
      return await toTopic(doc);
    } catch (err) {
      throw err instanceof DuplicateKeyError ? duplicate() : err;
    }
  },

  /** `input` is the output of TopicUpdate. `description: ''` clears it (D-025). */
  async update(ownerId: string, id: string, input: TopicUpdate): Promise<Topic> {
    const patch: TopicPatch = {};
    if (input.name !== undefined) {
      patch.name = input.name;
      patch.nameLower = input.name.toLowerCase();
    }
    if (input.description !== undefined) patch.description = input.description || null;

    let doc: TopicDoc | null;
    try {
      doc =
        Object.keys(patch).length > 0
          ? await topicsRepository.update(ownerId, id, patch)
          : await topicsRepository.findById(ownerId, id); // empty PATCH: nothing to change
    } catch (err) {
      throw err instanceof DuplicateKeyError ? duplicate() : err;
    }
    if (!doc) throw notFound();
    return toTopic(doc);
  },

  async remove(ownerId: string, id: string): Promise<void> {
    // TODO: cascade before/with the topic delete (trd.md section 5.3, ordered steps with logging):
    //   B2.8 documents (files + chunks), B4.2 quick notes, B5.5 MCQ sets, B6.6 threads + messages.
    if (!(await topicsRepository.remove(ownerId, id))) throw notFound();
  },
};
