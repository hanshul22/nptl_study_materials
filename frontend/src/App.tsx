import { Route, Routes, useParams } from 'react-router-dom';

// Placeholders only. F1.4 to F1.6 replace these with the layout and real pages.
function Topics() {
  return <h1 className="text-2xl font-bold text-indigo-600">Topics</h1>;
}

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
      <Route path="/" element={<Topics />} />
      <Route path="/topics/:topicId/:tab?" element={<Topic />} />
      <Route path="/settings" element={<p>Settings placeholder</p>} />
      <Route path="*" element={<p>Page not found</p>} />
    </Routes>
  );
}
