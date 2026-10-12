import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import { ToastProvider } from './components';
import { env } from './lib/env';
import './index.css';

const queryClient = new QueryClient();

async function bootstrap() {
  if (env.useMocks) {
    // Dynamic import: mock code is a separate chunk, never loaded when mocks are off.
    const { startMocks } = await import('./mocks/browser');
    await startMocks();
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ToastProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
}

void bootstrap();
