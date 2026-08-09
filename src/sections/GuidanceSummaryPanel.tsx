import type { Guidance, Status } from '../core/model';
import { Skeleton } from '../ui/States';
import styles from './Recommendation.module.scss';

interface GuidanceSummaryPanelProps {
  guidance: Guidance | null;
  status: Status;
}

/**
 * The advice for step 04, on its own lifecycle so the risk result never waits
 * on it.
 *
 * The backend selects the guidance records that apply and rewrites them into
 * this prose, so this panel is the whole of the advice rather than a summary of
 * anything else on the page. The note under the text says so, because the
 * selection is deterministic but the wording is not.
 */
export function GuidanceSummaryPanel({ guidance, status }: GuidanceSummaryPanelProps) {
  return (
    <article className={styles.panel} aria-labelledby="guidance-label">
      <p className={styles.label} id="guidance-label">
        Personalised guidance
      </p>

      {status === 'loading' && (
        <>
          <p className={styles.horizon}>Generating…</p>
          <Skeleton lines={3} label="Generating your guidance" />
        </>
      )}

      {/* A failed rewrite is not an error state: the estimate above it is
          complete and useful on its own, so this says what is missing and
          stops. */}
      {status === 'error' && (
        <p className={styles.summaryNote}>
          Guidance unavailable right now. Your estimate is unaffected.
        </p>
      )}

      {status === 'ready' && guidance && (
        <>
          <p className={styles.summary}>{guidance.summary}</p>
          {/* Named only where there is text to attribute it to. */}
          <p className={styles.provenance}>
            Disclaimer: Guidance is selected using predefined rules and rewritten by AI for
            clarity.
          </p>
        </>
      )}
    </article>
  );
}
