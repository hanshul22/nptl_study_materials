import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it } from 'vitest';
import { App } from './App';
import { ToastProvider } from './components';
import { setupMockServer } from './mocks/setupMockServer';

setupMockServer();

it('renders the Topics page at "/"', async () => {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ToastProvider>
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
  expect(screen.getByRole('heading', { level: 1, name: 'Topics' })).toBeInTheDocument();
  // Wait for the list so no request is still running when the test ends.
  expect(await screen.findByText('Operating Systems')).toBeInTheDocument();
});
