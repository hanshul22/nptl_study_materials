import { ENDPOINTS } from '@study/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { ToastProvider } from '../components';
import { apiErrorResponse, validationErrorResponse } from '../mocks/errors';
import { topicFixtures } from '../mocks/fixtures/topics';
import { mockUrl } from '../mocks/handlers/util';
import { server } from '../mocks/server';
import { setupMockServer } from '../mocks/setupMockServer';
import { TopicsPage } from './TopicsPage';

setupMockServer();

const listUrl = mockUrl(ENDPOINTS.listTopics);
const createUrl = mockUrl(ENDPOINTS.createTopic);
const deleteUrl = mockUrl(ENDPOINTS.deleteTopic);

function renderPage() {
  // Fresh client per test, no retries, so a failing request shows its error at once.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter>
          <TopicsPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

const cardOf = (name: string) => screen.getByRole('heading', { name }).closest('li')!;
const countIn = (card: HTMLElement, label: string) =>
  within(card).getByText(label).nextElementSibling;
const dialog = () => screen.getByRole('dialog');
const type = (label: string, value: string) =>
  fireEvent.change(within(dialog()).getByLabelText(label), { target: { value } });
const submit = (name: string) => fireEvent.click(within(dialog()).getByRole('button', { name }));

async function openCreateForm() {
  await screen.findByRole('heading', { name: 'Operating Systems' });
  fireEvent.click(screen.getByRole('button', { name: 'New topic' }));
}

it('shows the h1, a loading state, then the topic cards with counts and links', async () => {
  renderPage();
  expect(screen.getByRole('heading', { level: 1, name: 'Topics' })).toBeInTheDocument();
  expect(screen.getByRole('status')).toBeInTheDocument();

  await screen.findByRole('heading', { name: 'Operating Systems' });
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(screen.getAllByRole('listitem')).toHaveLength(3);

  const os = cardOf('Operating Systems');
  expect(os).toHaveTextContent('Processes, scheduling, memory management and file systems');
  expect(countIn(os, 'PDFs')).toHaveTextContent('2');
  expect(countIn(os, 'Quick notes')).toHaveTextContent('3');
  expect(countIn(os, 'MCQ sets')).toHaveTextContent('1');
  expect(within(os).getByRole('link', { name: 'Operating Systems' })).toHaveAttribute(
    'href',
    '/topics/65a1f0c2e4b0a1b2c3d4e5f1/pdfs',
  );
  expect(within(os).getByRole('button', { name: 'Rename Operating Systems' })).toBeInTheDocument();
  expect(within(os).getByRole('button', { name: 'Delete Operating Systems' })).toBeInTheDocument();

  // No description: no paragraph and no "null".
  const db = cardOf('Database Systems');
  expect(db.querySelector('p')).toBeNull();
  expect(countIn(db, 'MCQ sets')).toHaveTextContent('2');
});

it('shows an empty state with a create action', async () => {
  server.use(http.get(listUrl, () => HttpResponse.json([])));
  renderPage();
  await screen.findByRole('heading', { name: 'No topics yet' });

  fireEvent.click(screen.getByRole('button', { name: 'Create a topic' }));
  expect(screen.getByRole('dialog', { name: 'New topic' })).toBeInTheDocument();
});

it('shows an error state when the list fails and recovers on Retry', async () => {
  server.use(http.get(listUrl, () => apiErrorResponse('INTERNAL', 'Server exploded')));
  renderPage();
  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent('Could not load topics');
  expect(alert).toHaveTextContent('Server exploded');

  server.resetHandlers();
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  await screen.findByRole('heading', { name: 'Operating Systems' });
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('creates a topic, closes the dialog, shows the card and a toast', async () => {
  renderPage();
  await openCreateForm();
  expect(screen.getByRole('dialog', { name: 'New topic' })).toBeInTheDocument();
  expect(within(dialog()).getByLabelText('Name')).toHaveFocus();

  type('Name', '  Algorithms ');
  type('Description (optional)', 'Sorting and graphs');
  submit('Create topic');

  await screen.findByRole('heading', { name: 'Algorithms' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(cardOf('Algorithms')).toHaveTextContent('Sorting and graphs');
  expect(screen.getByText('Created "Algorithms"')).toBeInTheDocument();
});

it('omits an empty description from the create request', async () => {
  let body: unknown;
  server.use(
    http.post(createUrl, async ({ request }) => {
      body = await request.json();
      return HttpResponse.json({ ...topicFixtures()[0], name: 'Algorithms' }, { status: 201 });
    }),
  );
  renderPage();
  await openCreateForm();
  type('Name', 'Algorithms');
  type('Description (optional)', '   ');
  submit('Create topic');

  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(body).toEqual({ name: 'Algorithms' });
});

it('shows DUPLICATE_TOPIC on the name field and keeps the dialog open', async () => {
  renderPage();
  await openCreateForm();
  type('Name', 'operating systems');
  submit('Create topic');

  const error = await screen.findByText('A topic with this name already exists');
  const input = within(dialog()).getByLabelText('Name');
  expect(input).toHaveAttribute('aria-invalid', 'true');
  expect(input).toHaveAccessibleDescription('A topic with this name already exists');
  expect(dialog()).toContainElement(error);
  // Only the inline alert: nothing went to a toast.
  expect(screen.getAllByRole('alert')).toHaveLength(1);
  expect(within(dialog()).getByRole('button', { name: 'Create topic' })).toBeEnabled();
});

it('validates name and description limits in the browser without sending a request', async () => {
  const posted = vi.fn();
  server.use(
    http.post(createUrl, () => {
      posted();
      return HttpResponse.json(topicFixtures()[0], { status: 201 });
    }),
  );
  renderPage();
  await openCreateForm();

  submit('Create topic');
  expect(within(dialog()).getByText('Name is required')).toBeInTheDocument();

  type('Name', '   ');
  expect(within(dialog()).queryByText('Name is required')).not.toBeInTheDocument(); // editing clears it
  submit('Create topic');
  expect(within(dialog()).getByText('Name is required')).toBeInTheDocument();

  type('Name', 'a'.repeat(101));
  type('Description (optional)', 'd'.repeat(501));
  submit('Create topic');
  expect(within(dialog()).getByText('Name must be 100 characters or fewer')).toBeInTheDocument();
  expect(
    within(dialog()).getByText('Description must be 500 characters or fewer'),
  ).toBeInTheDocument();

  expect(posted).not.toHaveBeenCalled();
  expect(dialog()).toBeInTheDocument();
});

it('maps VALIDATION_ERROR paths to fields and shows a form-level message for the rest', async () => {
  server.use(
    http.post(createUrl, () =>
      validationErrorResponse([
        { path: ['description'], message: 'Bad description' },
        { path: ['somethingElse'], message: 'Unmapped' },
      ]),
    ),
  );
  renderPage();
  await openCreateForm();
  type('Name', 'Algorithms');
  submit('Create topic');

  await screen.findByText('Bad description');
  expect(within(dialog()).getByLabelText('Description (optional)')).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  expect(within(dialog()).getByLabelText('Name')).not.toHaveAttribute('aria-invalid');
  expect(dialog()).toHaveTextContent('Check the form and try again');
  expect(dialog()).not.toHaveTextContent('Unmapped');
});

it('toasts a failure that has no inline place and keeps the dialog open', async () => {
  server.use(http.post(createUrl, () => apiErrorResponse('INTERNAL', 'Database is down')));
  renderPage();
  await openCreateForm();
  type('Name', 'Algorithms');
  submit('Create topic');

  const toast = await screen.findByRole('alert');
  expect(toast).toHaveTextContent('Database is down');
  expect(dialog()).toBeInTheDocument();
});

it('renames a topic with a prefilled form and clears the description with an empty value', async () => {
  renderPage();
  await screen.findByRole('heading', { name: 'Operating Systems' });
  fireEvent.click(screen.getByRole('button', { name: 'Rename Operating Systems' }));

  expect(screen.getByRole('dialog', { name: 'Rename topic' })).toBeInTheDocument();
  expect(within(dialog()).getByLabelText('Name')).toHaveValue('Operating Systems');
  expect(within(dialog()).getByLabelText('Description (optional)')).toHaveValue(
    'Processes, scheduling, memory management and file systems',
  );

  type('Name', 'OS');
  type('Description (optional)', '');
  submit('Save changes');

  await screen.findByRole('heading', { name: 'OS' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(cardOf('OS')).not.toHaveTextContent('Processes');
  expect(screen.queryByRole('heading', { name: 'Operating Systems' })).not.toBeInTheDocument();
  expect(screen.getByText('Renamed "OS"')).toBeInTheDocument();
});

it('shows DUPLICATE_TOPIC inline on rename', async () => {
  renderPage();
  await screen.findByRole('heading', { name: 'Operating Systems' });
  fireEvent.click(screen.getByRole('button', { name: 'Rename Operating Systems' }));
  type('Name', 'Database Systems');
  submit('Save changes');

  await screen.findByText('A topic with this name already exists');
  expect(dialog()).toBeInTheDocument();
});

it('deletes after confirmation and says what else is deleted', async () => {
  renderPage();
  await screen.findByRole('heading', { name: 'Database Systems' });
  fireEvent.click(screen.getByRole('button', { name: 'Delete Database Systems' }));

  expect(dialog()).toHaveAccessibleName('Delete topic?');
  expect(dialog()).toHaveAccessibleDescription(
    /PDFs, quick notes, MCQ sets and AI threads are deleted too/,
  );
  fireEvent.click(within(dialog()).getByRole('button', { name: 'Delete topic' }));

  await waitFor(() =>
    expect(screen.queryByRole('heading', { name: 'Database Systems' })).not.toBeInTheDocument(),
  );
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByText('Deleted "Database Systems"')).toBeInTheDocument();
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
});

it('keeps the topic when the delete is cancelled and returns focus to the button', async () => {
  renderPage();
  await screen.findByRole('heading', { name: 'Database Systems' });
  const opener = screen.getByRole('button', { name: 'Delete Database Systems' });
  opener.focus();
  fireEvent.click(opener);

  fireEvent.click(within(dialog()).getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Database Systems' })).toBeInTheDocument();
  expect(opener).toHaveFocus();
});

it('refreshes the list when a delete reports NOT_FOUND', async () => {
  let lists = 0;
  server.use(
    http.get(listUrl, () => {
      lists += 1;
      return HttpResponse.json(lists === 1 ? topicFixtures() : topicFixtures().slice(1));
    }),
    http.delete(deleteUrl, () => apiErrorResponse('NOT_FOUND', 'Topic not found')),
  );
  renderPage();
  await screen.findByRole('heading', { name: 'Operating Systems' });
  fireEvent.click(screen.getByRole('button', { name: 'Delete Operating Systems' }));
  fireEvent.click(within(dialog()).getByRole('button', { name: 'Delete topic' }));

  await waitFor(() =>
    expect(screen.queryByRole('heading', { name: 'Operating Systems' })).not.toBeInTheDocument(),
  );
  expect(lists).toBe(2);
  expect(screen.getByText('Topic not found')).toBeInTheDocument();
});
