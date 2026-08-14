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
 * The backend selects and ranks the guidance records that apply and returns
 * them as a checklist of short actions, under a single gain-framed intro line.
 * The actions are shown verbatim (so they stay traceable to their clinical
 * source); only the intro is written by the model. The note under the list says
 * so, because the selection is deterministic but the intro wording is not.
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
          <p className={styles.intro}>{guidance.intro}</p>
          <ul className={styles.tips}>
            {guidance.tips.map((tip, i) => (
              <li className={styles.tip} key={`${tip.title}-${i}`}>
                <p className={styles.tipTag}>{tip.category}</p>
                <p className={styles.tipTitle}>{tip.title}</p>
                <p className={styles.tipText}>{tip.text}</p>
              </li>
            ))}
          </ul>
          {/* Named only where there is content to attribute it to. */}
          <p className={styles.provenance}>
            Disclaimer: Actions are selected from clinical guidelines using predefined rules;
            the introduction is written by AI for clarity.
          </p>
        </>
      )}
    </article>
  );
}
