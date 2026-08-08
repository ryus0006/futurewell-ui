import type { ApiError } from '../core/api/http';
import styles from './States.module.scss';

/**
 * The three states every data surface owes — loading, error, empty — as shared
 * primitives so each panel does not reinvent them.
 */

interface SkeletonProps {
  /** Number of shimmer lines. */
  lines?: number;
  label?: string;
}

export function Skeleton({ lines = 3, label = 'Loading' }: SkeletonProps) {
  return (
    // Announces the wait once, rather than leaving the page silent.
    <div role="status" aria-busy="true" aria-label={label} style={{ display: 'grid', gap: '0.6rem' }}>
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className={styles.skeleton}
          // Ragged widths read as text; identical bars read as a table.
          style={{ width: `${100 - i * 12}%` }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

interface ErrorStateProps {
  error: ApiError;
  onRetry?: () => void;
  /** Overrides the normalized copy where a panel needs something more specific. */
  message?: string;
}

export function ErrorState({ error, onRetry, message }: ErrorStateProps) {
  return (
    // `role="alert"` so the failure is announced without moving focus.
    <div className={styles.error} role="alert">
      <p>{message ?? error.message}</p>
      {onRetry && (
        // The same handler as the original action — no second code path.
        <button type="button" className={styles.retry} onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className={styles.empty}>{children}</p>;
}

export const panelClass = styles.panel;
