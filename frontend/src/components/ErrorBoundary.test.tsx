import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ApiClientError } from '../api';
import { ErrorBoundary } from './ErrorBoundary';

let toThrow: unknown = null;

function Child() {
  if (toThrow) throw toThrow;
  return <p>All good</p>;
}

function renderBoundary() {
  return render(
    <MemoryRouter>
      <ErrorBoundary>
        <Child />
      </ErrorBoundary>
    </MemoryRouter>,
  );
}

let errorSpy: ReturnType<typeof vi.spyOn>;

// React dev mode re-dispatches render errors as window "error" events, which jsdom prints.
const mute = (e: Event) => e.preventDefault();

beforeEach(() => {
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  window.addEventListener('error', mute);
});
afterEach(() => {
  window.removeEventListener('error', mute);
  toThrow = null;
  vi.restoreAllMocks();
});

it('renders children when nothing throws', () => {
  renderBoundary();
  expect(screen.getByText('All good')).toBeInTheDocument();
});

it('shows a generic fallback, logs the error, and hides message and stack', () => {
  const error = new Error('secret internal detail');
  error.stack = 'Error: secret internal detail\n    at Child (Child.tsx:1:1)';
  toThrow = error;
  renderBoundary();

  expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Go to Topics' })).toHaveAttribute('href', '/');
  const text = document.body.textContent ?? '';
  expect(text).not.toContain('secret internal detail');
  expect(text).not.toMatch(/\bat Child\b|Child\.tsx/);
  expect(errorSpy).toHaveBeenCalledWith(expect.any(String), error, expect.anything());
});

it('"Try again" resets the boundary and re-renders the child', () => {
  toThrow = new Error('boom');
  renderBoundary();
  expect(screen.queryByText('All good')).not.toBeInTheDocument();

  toThrow = null;
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(screen.getByText('All good')).toBeInTheDocument();
});

it('shows the message and code of an ApiClientError', () => {
  toThrow = new ApiClientError({ status: 404, code: 'NOT_FOUND', message: 'Topic not found' });
  renderBoundary();

  expect(screen.getByText(/Topic not found/)).toBeInTheDocument();
  expect(screen.getByText(/NOT_FOUND/)).toBeInTheDocument();
});
