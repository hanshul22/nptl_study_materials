import { Route, Routes, useParams } from 'react-router-dom';
import { Layout } from './components';
import { TopicsPage } from './pages/TopicsPage';

// Placeholders only. F1.6 replaces the topic page with the real one.
function Topic() {
  const { topicId, tab } = useParams();
  return (
    <p>
      Topic placeholder: topicId={topicId} tab={tab ?? '(none)'}
    </p>
  );
}

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<TopicsPage />} />
        <Route path="/topics/:topicId/:tab?" element={<Topic />} />
        <Route path="/settings" element={<p>Settings placeholder</p>} />
        <Route path="*" element={<p>Page not found</p>} />
      </Route>
    </Routes>
  );
}
