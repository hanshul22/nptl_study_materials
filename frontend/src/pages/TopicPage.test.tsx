import { ENDPOINTS } from '@study/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { http } from 'msw';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { expect, it } from 'vitest';
import { ToastProvider } from '../components';
import { apiErrorResponse } from '../mocks/errors';
import { mockUrl } from '../mocks/handlers/util';
import { server } from '../mocks/server';
import { setupMockServer } from '../mocks/setupMockServer';
import { TopicPage } from './TopicPage';

setupMockServer();

const OS_ID = '65a1f0c2e4b0a1b2c3d4e5f1';
const UNKNOWN_ID = '65a1f0c2e4b0a1b2c3d4e5ff';

// Shows the router location so tests can assert redirects and link navigation.
function CurrentPath() {
  return <p data-testid="path">{useLocation().pathname}</p>;
}

function renderAt(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/" element={<h1>Home</h1>} />
            <Route
              path="/topics/:topicId/:tab?"
              element={
                <>
                  <TopicPage />
                  <CurrentPath />
                </>
              }
            />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

const sections = () => within(screen.getByRole('navigation', { name: 'Topic sections' }));
const path = () => screen.getByTestId('path');

it.each([
  ['pdfs', 'PDFs', 'F2'],
  ['notes', 'Quick notes', 'F4'],
  ['mcqs', 'MCQs', 'F5'],
  ['ask', 'Ask AI', 'F3'],
])('shows the %s tab as active with its placeholder body', async (segment, label, phase) => {
  renderAt(`/topics/${OS_ID}/${segment}`);
  await screen.findByRole('heading', { level: 1, name: 'Operating Systems' });

  const links = sections().getAllByRole('link');
  expect(links.map((l) => l.textContent)).toEqual(['PDFs', 'Quick notes', 'MCQs', 'Ask AI']);
  for (const link of links) {
    if (link.textContent === label) expect(link).toHaveAttribute('aria-current', 'page');
    else expect(link).not.toHaveAttribute('aria-current');
  }
  expect(sections().getByRole('link', { name: label })).toHaveAttribute(
    'href',
    `/topics/${OS_ID}/${segment}`,
  );
  expect(screen.getByRole('heading', { level: 2, name: label })).toBeInTheDocument();
  expect(screen.getByText(`The ${label} tab is built in phase ${phase}.`)).toBeInTheDocument();
  expect(path()).toHaveTextContent(`/topics/${OS_ID}/${segment}`);
});

it('shows the back link, name, description and counts', async () => {
  renderAt(`/topics/${OS_ID}/pdfs`);
  await screen.findByRole('heading', { level: 1, name: 'Operating Systems' });

  expect(screen.getByRole('link', { name: 'Back to Topics' })).toHaveAttribute('href', '/');
  expect(
    screen.getByText('Processes, scheduling, memory management and file systems'),
  ).toBeInTheDocument();
  expect(screen.getByText('PDFs', { selector: 'dt' }).nextElementSibling).toHaveTextContent('2');
  expect(screen.getByText('Quick notes', { selector: 'dt' }).nextElementSibling).toHaveTextContent(
    '3',
  );
  expect(screen.getByText('MCQ sets', { selector: 'dt' }).nextElementSibling).toHaveTextContent(
    '1',
  );
});

it('redirects a missing tab to pdfs', async () => {
  renderAt(`/topics/${OS_ID}`);
  await screen.findByRole('heading', { level: 1, name: 'Operating Systems' });
  expect(path()).toHaveTextContent(`/topics/${OS_ID}/pdfs`);
  expect(sections().getByRole('link', { name: 'PDFs' })).toHaveAttribute('aria-current', 'page');
});

it('redirects an unknown tab to pdfs', async () => {
  renderAt(`/topics/${OS_ID}/nonsense`);
  await screen.findByRole('heading', { level: 1, name: 'Operating Systems' });
  expect(path()).toHaveTextContent(`/topics/${OS_ID}/pdfs`);
});

it('shows "Topic not found" for an id that is valid but unknown', async () => {
  renderAt(`/topics/${UNKNOWN_ID}/pdfs`);
  await screen.findByRole('heading', { name: 'Topic not found' });
  expect(screen.getByRole('link', { name: 'Back to Topics' })).toHaveAttribute('href', '/');
  expect(screen.queryByRole('navigation', { name: 'Topic sections' })).not.toBeInTheDocument();
});

it('shows "Topic not found" at once for an invalid id, without redirecting', () => {
  renderAt('/topics/not-an-id');
  expect(screen.getByRole('heading', { name: 'Topic not found' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Back to Topics' })).toHaveAttribute('href', '/');
  expect(path()).toHaveTextContent('/topics/not-an-id');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

it('shows a loading state until the list arrives', async () => {
  renderAt(`/topics/${OS_ID}/pdfs`);
  expect(screen.getByRole('status')).toBeInTheDocument();
  await screen.findByRole('heading', { level: 1, name: 'Operating Systems' });
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

it('shows an error state when the list fails and recovers on Retry', async () => {
  server.use(
    http.get(mockUrl(ENDPOINTS.listTopics), () => apiErrorResponse('INTERNAL', 'Server exploded')),
  );
  renderAt(`/topics/${OS_ID}/pdfs`);
  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent('Could not load topics');
  expect(alert).toHaveTextContent('Server exploded');

  server.resetHandlers();
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  await screen.findByRole('heading', { level: 1, name: 'Operating Systems' });
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('changes the URL and the current tab when a tab link is clicked', async () => {
  renderAt(`/topics/${OS_ID}/pdfs`);
  await screen.findByRole('heading', { level: 1, name: 'Operating Systems' });

  fireEvent.click(sections().getByRole('link', { name: 'Quick notes' }));

  expect(path()).toHaveTextContent(`/topics/${OS_ID}/notes`);
  expect(sections().getByRole('link', { name: 'Quick notes' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  expect(sections().getByRole('link', { name: 'PDFs' })).not.toHaveAttribute('aria-current');
  expect(screen.getByRole('heading', { level: 2, name: 'Quick notes' })).toBeInTheDocument();
  // Same topic, same cache: no loading state on a tab change.
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

it('goes back to the Topics route from the back link', async () => {
  renderAt(`/topics/${OS_ID}/pdfs`);
  await screen.findByRole('heading', { level: 1, name: 'Operating Systems' });
  fireEvent.click(screen.getByRole('link', { name: 'Back to Topics' }));
  expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument();
});
