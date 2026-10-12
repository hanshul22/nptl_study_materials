import { Route, Routes } from 'react-router-dom';
import { Layout } from './components';
import { TopicPage } from './pages/TopicPage';
import { TopicsPage } from './pages/TopicsPage';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<TopicsPage />} />
        <Route path="/topics/:topicId/:tab?" element={<TopicPage />} />
        <Route path="/settings" element={<p>Settings placeholder</p>} />
        <Route path="*" element={<p>Page not found</p>} />
      </Route>
    </Routes>
  );
}
