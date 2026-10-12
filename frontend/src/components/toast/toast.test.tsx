import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../../api';
import { ToastProvider } from './ToastProvider';
import { toastMessageFromError } from './toastMessageFromError';
import { useToast } from './useToast';
import type { ToastInput } from './context';

function Trigger({ input }: { input: ToastInput }) {
  const { toast } = useToast();
  return (
    <button type="button" onClick={() => toast(input)}>
      fire
    </button>
  );
}

function setup(input: ToastInput) {
  const view = render(
    <ToastProvider>
      <Trigger input={input} />
    </ToastProvider>,
  );
  const fire = () => fireEvent.click(screen.getByRole('button', { name: 'fire' }));
  return { ...view, fire };
}

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('toasts', () => {
  it('shows a message and auto-dismisses after 4000 ms by default', () => {
    const { fire } = setup({ kind: 'success', message: 'Saved' });
    fire();
    expect(screen.getByText('Saved')).toBeInTheDocument();

    advance(3999);
    expect(screen.getByText('Saved')).toBeInTheDocument();
    advance(1);
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  });

  it('keeps error toasts for 6000 ms and uses role="alert"', () => {
    const { fire } = setup({ kind: 'error', message: 'Failed' });
    fire();
    expect(screen.getByRole('alert')).toHaveTextContent('Failed');

    advance(5999);
    expect(screen.getByText('Failed')).toBeInTheDocument();
    advance(1);
    expect(screen.queryByText('Failed')).not.toBeInTheDocument();
  });

  it('does not use role="alert" for non-error toasts and honours durationMs', () => {
    const { fire } = setup({ kind: 'info', message: 'FYI', durationMs: 100 });
    fire();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    advance(100);
    expect(screen.queryByText('FYI')).not.toBeInTheDocument();
  });

  it('stacks several toasts', () => {
    const { fire } = setup({ kind: 'info', message: 'Again' });
    fire();
    fire();
    expect(screen.getAllByText('Again')).toHaveLength(2);
  });

  it('dismisses manually and clears that toast timer', () => {
    const { fire } = setup({ kind: 'success', message: 'Saved' });
    fire();
    expect(vi.getTimerCount()).toBe(1);

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('clears pending timers on unmount', () => {
    const { fire, unmount } = setup({ kind: 'success', message: 'Saved' });
    fire();
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('renders the viewport as a polite live region', () => {
    const { container } = setup({ kind: 'info', message: 'x' });
    expect(container.ownerDocument.querySelector('[aria-live="polite"]')).toBeInTheDocument();
  });

  it('useToast throws outside a provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    // jsdom reports render errors as window "error" events and prints them; mute that too.
    const mute = (e: Event) => e.preventDefault();
    window.addEventListener('error', mute);
    expect(() => render(<Trigger input={{ kind: 'info', message: 'x' }} />)).toThrow(
      /ToastProvider/,
    );
    window.removeEventListener('error', mute);
    vi.restoreAllMocks();
  });
});

describe('toastMessageFromError', () => {
  it('uses the message of an ApiClientError', () => {
    const err = new ApiClientError({
      status: 409,
      code: 'DUPLICATE_TOPIC',
      message: 'Topic exists',
    });
    expect(toastMessageFromError(err)).toBe('Topic exists');
  });

  it('returns a generic message for other errors and non-errors', () => {
    expect(toastMessageFromError(new Error('SELECT * leaked <html>'))).toBe('Something went wrong');
    expect(toastMessageFromError('nope')).toBe('Something went wrong');
  });
});
