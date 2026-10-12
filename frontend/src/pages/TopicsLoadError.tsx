import { EmptyState, toastMessageFromError } from '../components';

/** Shown when the topic list fails and there is no data to fall back on. Used by both topic pages. */
export function TopicsLoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <div role="alert">
      <EmptyState
        title="Could not load topics"
        description={toastMessageFromError(error)}
        action={
          <button
            type="button"
            onClick={onRetry}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Retry
          </button>
        }
      />
    </div>
  );
}
