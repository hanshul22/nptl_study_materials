import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createShutdown } from '../src/shutdown.js';

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('createShutdown', () => {
  it('closes, then disconnects, then exits 0', async () => {
    const calls: string[] = [];
    const server = {
      close: (cb: (err?: Error) => void) => {
        calls.push('close');
        cb();
      },
    };
    const disconnect = async () => {
      calls.push('disconnect');
    };
    const exit = vi.fn((code: number) => calls.push(`exit:${code}`));

    createShutdown(server, disconnect, exit)('SIGTERM');
    await vi.advanceTimersByTimeAsync(0);

    expect(calls).toEqual(['close', 'disconnect', 'exit:0']);
  });

  it('ignores a second call', async () => {
    const close = vi.fn((cb: (err?: Error) => void) => cb());
    const disconnect = vi.fn(async () => {});
    const exit = vi.fn();
    const shutdown = createShutdown({ close }, disconnect, exit);

    shutdown('SIGINT');
    shutdown('SIGTERM');
    await vi.advanceTimersByTimeAsync(0);

    expect(close).toHaveBeenCalledTimes(1);
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledTimes(1);
  });

  it('forces exit 1 after 10s when close hangs', async () => {
    const server = { close: vi.fn() }; // never calls back
    const disconnect = vi.fn(async () => {});
    const exit = vi.fn();

    createShutdown(server, disconnect, exit)('SIGTERM');
    await vi.advanceTimersByTimeAsync(9_999);
    expect(exit).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);

    expect(exit).toHaveBeenCalledExactlyOnceWith(1);
    expect(disconnect).not.toHaveBeenCalled();
  });

  it('exits 1 when disconnect fails', async () => {
    const server = { close: (cb: (err?: Error) => void) => cb() };
    const exit = vi.fn();

    createShutdown(server, () => Promise.reject(new Error('boom')), exit)('SIGINT');
    await vi.advanceTimersByTimeAsync(0);

    expect(exit).toHaveBeenCalledExactlyOnceWith(1);
  });
});
