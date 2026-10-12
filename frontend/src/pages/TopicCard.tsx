import { Link } from 'react-router-dom';
import type { Topic } from '@study/shared';
import { TopicCounts } from './TopicCounts';

interface TopicCardProps {
  topic: Topic;
  onRename: (topic: Topic) => void;
  onDelete: (topic: Topic) => void;
}

const buttonClass =
  'rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600';

export function TopicCard({ topic, onRename, onDelete }: TopicCardProps) {
  return (
    <li className="flex flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold">
        <Link
          to={`/topics/${topic.id}/pdfs`}
          className="text-indigo-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          {topic.name}
        </Link>
      </h2>
      {topic.description && <p className="mt-1 text-slate-600">{topic.description}</p>}
      <TopicCounts topic={topic} />
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          aria-label={`Rename ${topic.name}`}
          onClick={() => onRename(topic)}
          className={buttonClass}
        >
          Rename
        </button>
        <button
          type="button"
          aria-label={`Delete ${topic.name}`}
          onClick={() => onDelete(topic)}
          className={buttonClass}
        >
          Delete
        </button>
      </div>
    </li>
  );
}
