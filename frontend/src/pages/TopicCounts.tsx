import type { Topic } from '@study/shared';

/** PDFs, quick notes and MCQ sets counts as a description list. Used by the card and the topic page. */
export function TopicCounts({
  topic,
}: {
  topic: Pick<Topic, 'documentCount' | 'noteCount' | 'mcqSetCount'>;
}) {
  const counts = [
    ['PDFs', topic.documentCount],
    ['Quick notes', topic.noteCount],
    ['MCQ sets', topic.mcqSetCount],
  ] as const;

  return (
    <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
      {counts.map(([label, count]) => (
        <div key={label}>
          <dt className="text-slate-600">{label}</dt>
          <dd className="font-medium text-slate-900">{count}</dd>
        </div>
      ))}
    </dl>
  );
}
