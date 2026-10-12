import { afterAll, afterEach, beforeAll } from 'vitest';
import { resetSettings, resetTopics } from './handlers';
import { server } from './server';

/** Call at the top of a test file that needs the msw server. Opt-in, so other tests are unaffected. */
export function setupMockServer(): void {
  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  afterEach(() => {
    server.resetHandlers();
    resetTopics();
    resetSettings();
  });
  afterAll(() => server.close());
}
