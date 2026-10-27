import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Loading, empty, error, and confirm states, adapted from the crud-ui kit to
 * the app's design tokens. Loading holds layout, empty explains, and error is
 * actionable.
 */

export function LoadingState({
  rows = 3,
  label = 'Loading',
}: {
  readonly rows?: number;
  readonly label?: string;
}) {
  return (
    <div className="space-y-200" role="status" aria-busy="true" aria-label={label}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />
      ))}
    </div>
  );
}

export interface EmptyStateProps {
  readonly title: string;
  readonly hint?: ReactNode;
  readonly action?: ReactNode;
}

export function EmptyState({ title, hint, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-200 rounded-xl border border-dashed border-input px-600 py-800 text-center">
      <p className="font-heading text-400 font-semibold text-foreground">{title}</p>
      {hint ? <div className="max-w-md text-300 text-muted-foreground">{hint}</div> : null}
      {action ? <div className="mt-200">{action}</div> : null}
    </div>
  );
}

export interface ErrorStateProps {
  readonly message: string;
  readonly title?: string;
  readonly onRetry?: () => void;
}

export function ErrorState({ message, title = "That didn't work", onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex items-start gap-300 rounded-lg border border-destructive/35 bg-destructive/[0.06] px-400 py-300 text-foreground"
    >
      <AlertTriangle aria-hidden="true" className="mt-100 icon-size-200 shrink-0 text-destructive" />
      <div className="min-w-0 flex-1 text-300">
        <p className="font-semibold">{title}</p>
        <p className="mt-100 break-words text-muted-foreground">{message}</p>
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 rounded-md px-200 py-100 text-200 font-medium text-primary underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

export interface ConfirmActionProps {
  readonly message: ReactNode;
  readonly confirmLabel: string;
  readonly pendingLabel: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly pending?: boolean;
}

/** Confirmation for an irreversible action. The message must name what changes. */
export function ConfirmAction({
  message,
  confirmLabel,
  pendingLabel,
  onConfirm,
  onCancel,
  pending,
}: ConfirmActionProps) {
  return (
    <div
      role="alertdialog"
      aria-modal="false"
      aria-label={confirmLabel}
      className="flex flex-wrap items-center gap-300 rounded-lg border border-destructive/35 bg-destructive/[0.06] px-400 py-300 text-300"
    >
      <span className="min-w-0 flex-1">{message}</span>
      <button
        type="button"
        onClick={onCancel}
        disabled={pending}
        className="h-8 rounded-md px-300 font-medium text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={pending}
        className="h-8 rounded-md bg-destructive px-300 font-medium text-destructive-foreground hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
      >
        {pending ? pendingLabel : confirmLabel}
      </button>
    </div>
  );
}
