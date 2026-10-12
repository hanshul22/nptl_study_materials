/**
 * The topic page tabs, in display order. `segment` is the URL part (`/topics/:topicId/:segment`).
 * `phase` is the roadmap phase that builds the tab body; later phases replace only the bodies.
 */
export const TOPIC_TABS = [
  { id: 'pdfs', label: 'PDFs', segment: 'pdfs', phase: 'F2' },
  { id: 'notes', label: 'Quick notes', segment: 'notes', phase: 'F4' },
  { id: 'mcqs', label: 'MCQs', segment: 'mcqs', phase: 'F5' },
  { id: 'ask', label: 'Ask AI', segment: 'ask', phase: 'F3' },
] as const;

export type TopicTab = (typeof TOPIC_TABS)[number];

/** Where a missing or unknown tab segment redirects to. */
export const DEFAULT_TAB: TopicTab = TOPIC_TABS[0];
