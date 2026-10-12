import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface DialogProps {
  title: string;
  /** Called on Esc and backdrop click (unless `dismissible` is false). */
  onClose: () => void;
  /** Set false while a request is running: Esc and backdrop clicks then do nothing. Default true. */
  dismissible?: boolean;
  /** Id of an element inside `children` that describes the dialog (aria-describedby). */
  describedBy?: string;
  children: ReactNode;
}

/**
 * Modal dialog. Mount it to open it and unmount it to close it (`{open && <Dialog .../>}`), so
 * state inside `children` resets on every open. On mount focus moves into the dialog (to a child
 * with `autoFocus`, else the first focusable element) and Tab is trapped; on unmount focus
 * returns to the element that was focused when it opened.
 */
export function Dialog({ title, onClose, dismissible = true, describedBy, children }: DialogProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  // Read during the first render, before an autoFocus child moves focus.
  const [opener] = useState(() => document.activeElement);

  useEffect(() => {
    const panel = panelRef.current;
    if (panel && !panel.contains(document.activeElement)) {
      (panel.querySelector<HTMLElement>(FOCUSABLE) ?? panel).focus();
    }
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, [opener]);

  // Listens on the document so Esc and the Tab trap still work if focus was lost (for example
  // when the focused button became disabled).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (dismissible) onClose();
        return;
      }
      const panel = panelRef.current;
      if (e.key !== 'Tab' || !panel) return;

      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const active = document.activeElement;
      const outside = !panel.contains(active);
      if (e.shiftKey && (outside || active === first || active === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (outside || active === last)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [dismissible, onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4"
      // mousedown, not click: a text selection that ends over the backdrop must not close it.
      onMouseDown={(e) => {
        if (dismissible && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedBy}
        tabIndex={-1}
        className="max-h-full w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-xl focus:outline-none"
      >
        <h2 id={titleId} className="text-lg font-semibold text-slate-900">
          {title}
        </h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}
