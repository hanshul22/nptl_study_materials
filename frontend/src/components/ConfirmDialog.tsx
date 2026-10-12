import { useId, type ReactNode } from 'react';
import { Dialog } from './Dialog';

interface ConfirmDialogProps {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** While true both buttons are disabled and Esc / backdrop clicks are ignored. */
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const buttonBase =
  'rounded-md px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-60';

/** Confirmation for destructive actions. Focus starts on Cancel; the confirm button is red. */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const messageId = useId();
  return (
    <Dialog title={title} onClose={onCancel} dismissible={!busy} describedBy={messageId}>
      <p id={messageId} className="mt-2 text-slate-700">
        {message}
      </p>
      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          autoFocus
          disabled={busy}
          onClick={onCancel}
          className={`${buttonBase} border border-slate-300 bg-white text-slate-800 hover:bg-slate-50`}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          disabled={busy}
          aria-busy={busy}
          onClick={onConfirm}
          className={`${buttonBase} bg-red-600 text-white hover:bg-red-700`}
        >
          {busy ? 'Working…' : confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
