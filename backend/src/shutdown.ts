export interface Closable {
  close(cb: (err?: Error) => void): unknown;
}

/**
 * Returns a signal handler: server.close -> disconnect -> exit(0).
 * A second call is ignored; if shutdown hangs, exit(1) is forced after `forceAfterMs`.
 * Any close/disconnect failure still finishes the sequence but exits 1.
 */
export function createShutdown(
  server: Closable,
  disconnect: () => Promise<void>,
  exit: (code: number) => void,
  forceAfterMs = 10_000,
): (signal: string) => void {
  let started = false;
  return (signal) => {
    if (started) return;
    started = true;
    console.log(`${signal} received, shutting down`);
    const timer = setTimeout(() => {
      console.error('Shutdown timed out, forcing exit');
      exit(1);
    }, forceAfterMs);

    let code = 0;
    server.close((err) => {
      if (err) code = 1;
      disconnect()
        .catch(() => {
          code = 1;
        })
        .finally(() => {
          clearTimeout(timer);
          exit(code);
        });
    });
  };
}
