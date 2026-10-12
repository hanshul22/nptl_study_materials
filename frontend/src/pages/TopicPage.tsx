import { ObjectIdStr } from '@study/shared';
import { Link, Navigate, NavLink, useParams } from 'react-router-dom';
import { useTopics } from '../api';
import { EmptyState, LoadingState } from '../components';
import { TopicCounts } from './TopicCounts';
import { TopicsLoadError } from './TopicsLoadError';
import { DEFAULT_TAB, TOPIC_TABS, type TopicTab } from './topicTabs';

const linkClass =
  'rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600';

const backLink = (
  <Link to="/" className={`${linkClass} text-indigo-700 hover:underline`}>
    Back to Topics
  </Link>
);

const tabLinkClass = ({ isActive }: { isActive: boolean }) =>
  `${linkClass} block border-b-2 px-3 py-2 text-sm font-medium ${
    isActive
      ? 'border-indigo-600 text-indigo-900'
      : 'border-transparent text-slate-700 hover:border-slate-300'
  }`;

/** Placeholder body; the phase named in TOPIC_TABS replaces it. */
function TabBody({ tab }: { tab: TopicTab }) {
  return (
    <section aria-labelledby="tab-heading" className="mt-6">
      <h2 id="tab-heading" className="text-xl font-semibold">
        {tab.label}
      </h2>
      <EmptyState
        title="Not built yet"
        description={`The ${tab.label} tab is built in phase ${tab.phase}.`}
      />
    </section>
  );
}

function TopicDetail({ topicId, tab }: { topicId: string; tab: TopicTab }) {
  // No GET /topics/:id, so the topic comes from the list (same query as the Topics page).
  const topics = useTopics();
  const topic = topics.data?.find((t) => t.id === topicId);

  if (!topics.data) {
    return topics.isError ? (
      <TopicsLoadError error={topics.error} onRetry={() => void topics.refetch()} />
    ) : (
      <LoadingState />
    );
  }
  if (!topic) return <NotFound />;

  return (
    <>
      <p>{backLink}</p>
      <h1 className="mt-2 text-2xl font-bold">{topic.name}</h1>
      {topic.description && <p className="mt-1 text-slate-600">{topic.description}</p>}
      <TopicCounts topic={topic} />
      <nav aria-label="Topic sections" className="mt-6 border-b border-slate-200">
        <ul className="flex flex-wrap gap-1">
          {TOPIC_TABS.map(({ id, label, segment }) => (
            <li key={id}>
              <NavLink to={`/topics/${topic.id}/${segment}`} className={tabLinkClass}>
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <TabBody tab={tab} />
    </>
  );
}

function NotFound() {
  return <EmptyState title="Topic not found" action={backLink} />;
}

export function TopicPage() {
  const { topicId = '', tab: segment } = useParams();
  // Checked before any request: an id that cannot exist never reaches the API.
  if (!ObjectIdStr.safeParse(topicId).success) return <NotFound />;

  const tab = TOPIC_TABS.find((t) => t.segment === segment);
  if (!tab) return <Navigate replace to={`/topics/${topicId}/${DEFAULT_TAB.segment}`} />;

  return <TopicDetail topicId={topicId} tab={tab} />;
}
