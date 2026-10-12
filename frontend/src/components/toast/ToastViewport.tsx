import type { ToastItem, ToastKind } from './context';

const STYLES: Record<ToastKind, { label: string; classes: string }> = {
  success: { label: 'Success', classes: 'border-green-600 bg-green-50 text-green-900' },
  error: { label: 'Error', classes: 'border-red-600 bg-red-50 text-red-900' },
  info: { label: 'Info', classes: 'border-sky-600 bg-sky-50 text-sky-900' },
};

interface ToastViewportProps {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}

/** The live region stays mounted so screen readers announce toasts added later. */
export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
    >
      {toasts.map(({ id, kind, message }) => (
        <div
          key={id}
          role={kind === 'error' ? 'alert' : undefined}
          className={`pointer-events-auto flex items-start gap-2 rounded-md border-l-4 p-3 text-sm shadow-lg ${STYLES[kind].classes}`}
        >
          {/* Label text so the kind is not conveyed by color alone. */}
          <p className="flex-1">
            <span className="font-semibold">{STYLES[kind].label}: </span>
            <span>{message}</span>
          </p>
          <button
            type="button"
            onClick={() => onDismiss(id)}
            aria-label="Dismiss notification"
            className="rounded px-1 leading-none hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      ))}
    </div>
  );
}
