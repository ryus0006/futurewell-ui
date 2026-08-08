import type { RiskResult } from '../core/model';
import form from './Form.module.scss';
import styles from './Recommendation.module.scss';

/**
 * The risk estimate. **Derives nothing:** the level, the percentage and the model
 * disclosure all come from the response, so the disclosure always describes
 * whatever actually computed the number.
 */
interface RiskResultPanelProps {
  result: RiskResult;
  /** Opens the clinic finder and fires its first `GET /api/clinics`. */
  onFindClinic?: () => void;
}

export function RiskResultPanel({ result, onFindClinic }: RiskResultPanelProps) {
  const { model } = result;
  // Rounding for display only — `percent` is still what the meter reports.
  const filled = Math.min(100, Math.max(0, Math.round(result.percent)));

  return (
    <article
      className={`${styles.panel} ${styles[result.level]}`}
      aria-labelledby="risk-result-label"
    >
      <p className={styles.label} id="risk-result-label">
        Your {result.horizonYears}-year risk
      </p>

      <div className={styles.output}>
        <strong className={styles.percent}>{result.percent}%</strong>
        <span className={styles.band}>{result.levelLabel}</span>
      </div>
      <p className={styles.horizon}>
        Estimated chance of a heart attack or stroke in the next {result.horizonYears} years.
      </p>

      {/* Still a meter: it reports one value in a fixed range. The marks are the
          presentation, so they stay hidden and the label carries the value. */}
      <div
        className={styles.array}
        role="meter"
        aria-valuenow={result.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${result.levelLabel} risk, ${result.percent} percent over ${result.horizonYears} years — about ${filled} people in 100`}
      >
        {Array.from({ length: 100 }, (_, i) => (
          <i key={i} aria-hidden="true" className={`${styles.tick} ${i < filled ? styles.on : styles.off}`} />
        ))}
      </div>
      <p className={styles.arrayNote}>
        About {filled} in 100 people with your answers.
      </p>

      {/* Shown whenever the backend reports an unvalidated model. Without it,
          fixture or fallback output would read exactly like a clinical
          estimate. */}
      {!model.isValidated && (
        <p className={styles.illustrative}>
          Illustrative estimate only — this number was not produced by a validated clinical model.
        </p>
      )}

      <details className={styles.model}>
        <summary>How this number was worked out</summary>
        <div className={styles.modelBody}>
          <p>
            <strong>Model:</strong> {model.name}
          </p>
          {model.citation && <p>{model.citation}</p>}
          {model.caveat && <p>{model.caveat}</p>}
        </div>
      </details>

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
