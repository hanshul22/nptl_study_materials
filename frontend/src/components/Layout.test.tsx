import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Layout } from './Layout';

function Boom(): never {
  throw new Error('boom');
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<p>Topics content</p>} />
          <Route path="/settings" element={<p>Settings content</p>} />
          <Route path="/topics/:topicId/:tab?" element={<p>Topic content</p>} />
          <Route path="/broken" element={<Boom />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

// React dev mode re-dispatches render errors as window "error" events, which jsdom prints.
const mute = (e: Event) => e.preventDefault();

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  window.addEventListener('error', mute);
});
afterEach(() => {
  window.removeEventListener('error', mute);
  vi.restoreAllMocks();
});

it('renders the app name, a labelled nav with both links, and outlet content', () => {
  renderAt('/');
  expect(screen.getByRole('banner')).toHaveTextContent('Study System');
  const nav = screen.getByRole('navigation', { name: 'Main' });
  expect(nav).toContainElement(screen.getByRole('link', { name: 'Topics' }));
  expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');
  expect(screen.getByRole('main')).toHaveTextContent('Topics content');
});

it('marks only the current nav link as active', () => {
  renderAt('/settings');
  expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('link', { name: 'Topics' })).not.toHaveAttribute('aria-current');
});

it('marks Topics as the current page at "/"', () => {
  renderAt('/');
  expect(screen.getByRole('link', { name: 'Topics' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('link', { name: 'Settings' })).not.toHaveAttribute('aria-current');
});

it('keeps Topics active (as the section, not the page) on a topic page', () => {
  renderAt('/topics/65a1f0c2e4b0a1b2c3d4e5f1/pdfs');
  expect(screen.getByRole('main')).toHaveTextContent('Topic content');
  const topics = screen.getByRole('link', { name: 'Topics' });
  expect(topics).toHaveAttribute('aria-current', 'true');
  expect(topics).toHaveClass('bg-indigo-100');
  expect(screen.getByRole('link', { name: 'Settings' })).not.toHaveAttribute('aria-current');
});

it('has a skip link that targets the main landmark', () => {
  renderAt('/');
  const skip = screen.getByRole('link', { name: 'Skip to content' });
  expect(skip).toHaveAttribute('href', `#${screen.getByRole('main').id}`);
  expect(screen.getByRole('main').id).not.toBe('');
});

it('keeps the header usable when a route throws, and resets on navigation', () => {
  renderAt('/broken');
  expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');

  fireEvent.click(screen.getByRole('link', { name: 'Settings' }));
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.getByRole('main')).toHaveTextContent('Settings content');
});
