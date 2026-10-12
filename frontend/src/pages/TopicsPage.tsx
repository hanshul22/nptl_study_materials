import { useRef, useState } from 'react';
import type { Topic } from '@study/shared';
import { useDeleteTopic, useTopics } from '../api';
import {
  ConfirmDialog,
  EmptyState,
  LoadingState,
  toastMessageFromError,
  useToast,
} from '../components';
import { TopicCard } from './TopicCard';
import { TopicForm } from './TopicForm';

const buttonClass =
  'rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600';

export function TopicsPage() {
  const topics = useTopics();
  const deleteTopic = useDeleteTopic();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<Topic | null>(null);
  const [deleting, setDeleting] = useState<Topic | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  async function confirmDelete(topic: Topic) {
    try {
      await deleteTopic.mutateAsync(topic.id);
      toast({ kind: 'success', message: `Deleted "${topic.name}"` });
      // The card that opened the dialog is gone, so focus would be lost.
      headingRef.current?.focus();
      setDeleting(null);
    } catch (err) {
      toast({ kind: 'error', message: toastMessageFromError(err) });
    }
  }

  const newTopicButton = (label: string) => (
    <button type="button" onClick={() => setCreating(true)} className={buttonClass}>
      {label}
    </button>
  );

  let content;
  if (topics.data) {
    content =
      topics.data.length === 0 ? (
        <EmptyState
          title="No topics yet"
          description="Create a topic to start collecting PDFs, quick notes and MCQ sets."
          action={newTopicButton('Create a topic')}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {topics.data.map((topic) => (
            <TopicCard key={topic.id} topic={topic} onRename={setRenaming} onDelete={setDeleting} />
          ))}
        </ul>
      );
  } else if (topics.isError) {
    content = (
      <div role="alert">
        <EmptyState
          title="Could not load topics"
          description={toastMessageFromError(topics.error)}
          action={
            <button type="button" onClick={() => void topics.refetch()} className={buttonClass}>
              Retry
            </button>
          }
        />
      </div>
    );
  } else {
    content = <LoadingState />;
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold focus:outline-none">
          Topics
        </h1>
        {newTopicButton('New topic')}
      </div>
      {content}

      {creating && <TopicForm onClose={() => setCreating(false)} />}
      {renaming && <TopicForm topic={renaming} onClose={() => setRenaming(null)} />}
      {deleting && (
        <ConfirmDialog
          title="Delete topic?"
          message={`Delete "${deleting.name}"? Its PDFs, quick notes, MCQ sets and AI threads are deleted too. This cannot be undone.`}
          confirmLabel="Delete topic"
          busy={deleteTopic.isPending}
          onConfirm={() => void confirmDelete(deleting)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  );
}
