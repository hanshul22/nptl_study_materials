import type { Topic } from '@study/shared';

const TOPICS: readonly Topic[] = [
  {
    id: '65a1f0c2e4b0a1b2c3d4e5f1',
    name: 'Operating Systems',
    description: 'Processes, scheduling, memory management and file systems',
    documentCount: 2,
    noteCount: 3,
    mcqSetCount: 1,
    createdAt: '2026-09-01T09:00:00.000Z',
    updatedAt: '2026-09-20T14:30:00.000Z',
  },
  {
    id: '65a1f0c2e4b0a1b2c3d4e5f2',
    name: 'Database Systems',
    description: null,
    documentCount: 1,
    noteCount: 0,
    mcqSetCount: 2,
    createdAt: '2026-09-05T10:15:00.000Z',
    updatedAt: '2026-09-05T10:15:00.000Z',
  },
  {
    id: '65a1f0c2e4b0a1b2c3d4e5f3',
    name: 'Computer Networks',
    description: 'OSI model, TCP/IP, routing',
    documentCount: 0,
    noteCount: 1,
    mcqSetCount: 0,
    createdAt: '2026-09-10T16:45:00.000Z',
    updatedAt: '2026-09-12T08:00:00.000Z',
  },
];

/** Fresh copies on every call so tests and handlers cannot mutate the fixture. Topic is flat, so a shallow copy per item is a deep copy. */
export const topicFixtures = (): Topic[] => TOPICS.map((t) => ({ ...t }));
