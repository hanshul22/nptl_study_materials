import { createContext } from 'react';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastInput {
  kind: ToastKind;
  message: string;
  /** Defaults to 4000 ms, or 6000 ms for errors. */
  durationMs?: number;
}

export interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

export interface ToastContextValue {
  toast: (input: ToastInput) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);
