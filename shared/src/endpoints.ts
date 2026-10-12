import { z } from 'zod';
import {
  AskRequest,
  AskResponse,
  ItemAskRequest,
  ItemAskResponse,
  ItemThreadQuery,
  ThreadResponse,
} from './schemas/ai.js';
import { DocumentDto } from './schemas/documents.js';
import { McqExportRequest, McqImportRequest, McqImportResponse, McqSet } from './schemas/mcq.js';
import { QuickNote, QuickNoteCreate, QuickNoteUpdate } from './schemas/notes.js';
import { Settings, SettingsUpdate } from './schemas/settings.js';
import { Topic, TopicCreate, TopicUpdate } from './schemas/topics.js';

export interface EndpointDef {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  /** Relative to the API base path `/api/v1`. */
  path: string;
  /** Success HTTP status. */
  status: number;
  /** JSON request body schema. Absent for no body and multipart uploads. */
  request?: z.ZodType;
  /** Query string schema, when the endpoint reads one. */
  query?: z.ZodType;
  /** JSON response schema. Absent for 204 and binary (PDF) responses. */
  response?: z.ZodType;
}

// dtos.md section 11. Not covered by a schema: the multipart `file` upload and the PDF streams
// (`/documents/:id/file`, `/mcq-sets/:id/export` responses).
export const ENDPOINTS = {
  health: {
    method: 'GET',
    path: '/health',
    status: 200,
    response: z.object({ status: z.literal('ok') }),
  },

  listTopics: { method: 'GET', path: '/topics', status: 200, response: z.array(Topic) },
  createTopic: {
    method: 'POST',
    path: '/topics',
    status: 201,
    request: TopicCreate,
    response: Topic,
  },
  updateTopic: {
    method: 'PATCH',
    path: '/topics/:topicId',
    status: 200,
    request: TopicUpdate,
    response: Topic,
  },
  deleteTopic: { method: 'DELETE', path: '/topics/:topicId', status: 204 },

  uploadDocument: {
    method: 'POST',
    path: '/topics/:topicId/documents',
    status: 202,
    response: DocumentDto,
  },
  listDocuments: {
    method: 'GET',
    path: '/topics/:topicId/documents',
    status: 200,
    response: z.array(DocumentDto),
  },
  getDocument: { method: 'GET', path: '/documents/:id', status: 200, response: DocumentDto },
  getDocumentFile: { method: 'GET', path: '/documents/:id/file', status: 200 },
  deleteDocument: { method: 'DELETE', path: '/documents/:id', status: 204 },

  listNotes: {
    method: 'GET',
    path: '/topics/:topicId/notes',
    status: 200,
    response: z.array(QuickNote),
  },
  createNote: {
    method: 'POST',
    path: '/topics/:topicId/notes',
    status: 201,
    request: QuickNoteCreate,
    response: QuickNote,
  },
  updateNote: {
    method: 'PATCH',
    path: '/notes/:id',
    status: 200,
    request: QuickNoteUpdate,
    response: QuickNote,
  },
  deleteNote: { method: 'DELETE', path: '/notes/:id', status: 204 },

  importMcqSet: {
    method: 'POST',
    path: '/topics/:topicId/mcq-sets/import',
    status: 201,
    request: McqImportRequest,
    response: McqImportResponse,
  },
  listMcqSets: {
    method: 'GET',
    path: '/topics/:topicId/mcq-sets',
    status: 200,
    response: z.array(McqSet),
  },
  getMcqSet: { method: 'GET', path: '/mcq-sets/:id', status: 200, response: McqSet },
  deleteMcqSet: { method: 'DELETE', path: '/mcq-sets/:id', status: 204 },
  exportMcqSet: {
    method: 'POST',
    path: '/mcq-sets/:id/export',
    status: 200,
    request: McqExportRequest,
  },

  ask: {
    method: 'POST',
    path: '/topics/:topicId/ask',
    status: 200,
    request: AskRequest,
    response: AskResponse,
  },
  askItem: {
    method: 'POST',
    path: '/topics/:topicId/items/ask',
    status: 200,
    request: ItemAskRequest,
    response: ItemAskResponse,
  },
  getItemThread: {
    method: 'GET',
    path: '/topics/:topicId/items/thread',
    status: 200,
    query: ItemThreadQuery,
    response: ThreadResponse,
  },

  getSettings: { method: 'GET', path: '/settings', status: 200, response: Settings },
  updateSettings: {
    method: 'PATCH',
    path: '/settings',
    status: 200,
    request: SettingsUpdate,
    response: Settings,
  },
} as const satisfies Record<string, EndpointDef>;

export type EndpointName = keyof typeof ENDPOINTS;
