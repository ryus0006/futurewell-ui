import { useEffect, useState } from 'react';

import type { RiskResult } from '../core/model';
import form from './Form.module.scss';
import styles from './Recommendation.module.scss';

/**
 * The risk estimate. **Derives nothing:** the level and the percentage both come
 * from the response. The model is not described to the reader, but its
 * `isValidated` flag still gates the illustrative-estimate warning below, so an
 * unvalidated number can never present itself as a clinical one.
 */
interface RiskResultPanelProps {
  result: RiskResult;
  /** Opens the clinic finder and fires its first `GET /api/clinics`. */
  onFindClinic?: () => void;
}

export function RiskResultPanel({ result, onFindClinic }: RiskResultPanelProps) {
  const { model } = result;
  const target = Math.min(100, Math.max(0, result.percent));

  /**
   * The bar is mounted empty and filled on the next frame, so the browser has a
   * painted `0%` to transition away from — a width set during the first render
   * has no previous value and arrives with no movement.
   *
   * The reader watches the estimate arrive at its number rather than finding it
   * already there. `aria-valuenow` below stays on the real figure throughout, so
   * nothing announces the intermediate widths.
   */
  const [fill, setFill] = useState(0);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setFill(target));
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return (
    <article
      className={`${styles.panel} ${styles[result.level]}`}
      aria-labelledby="risk-result-label"
    >
      <p className={styles.label} id="risk-result-label">
        Your {result.horizonYears}-year cardiovascular risk
      </p>

      <div className={styles.output}>
        <strong className={styles.percent}>{result.percent}%</strong>
        <span className={styles.band}>{result.levelLabel}</span>
      </div>
      <div
        className={styles.meter}
        role="meter"
        aria-valuenow={result.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${result.levelLabel} risk, ${result.percent} percent over ${result.horizonYears} years`}
      >
        <span className={styles.meterFill} style={{ width: `${fill}%` }} />
      </div>

      {/* Shown whenever the backend reports an unvalidated model. Without it,
          fixture or fallback output would read exactly like a clinical
          estimate. */}
      {!model.isValidated && (
        <p className={styles.illustrative}>
          Illustrative estimate only — this number was not produced by a validated clinical model.
        </p>
      )}

      <p className={styles.disclaimer}>
        This estimate is for general information only. It is not a medical diagnosis or a substitute
        for professional advice. Talk to a doctor or visit a Klinik Kesihatan about your heart health.
      </p>

      {onFindClinic && (
        <p>
          <button type="button" className={form.secondaryAction} onClick={onFindClinic}>
            Find a clinic
          </button>
        </p>
      )}
    </article>
  );
}
