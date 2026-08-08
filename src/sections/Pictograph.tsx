import type { Awareness } from '../core/model';
import styles from './Pictograph.module.scss';

const TOTAL_MARKS = 100;

/**
 * 100 marks, of which `round(sharePercent)` are highlighted.
 *
 * **Every number here comes from the response.** This component computes nothing
 * except which marks to fill.
 */
export function Pictograph({ awareness }: { awareness: Awareness }) {
  const { context, referenceRows, sourceLabel } = awareness;
  const highlighted = Math.round(context.sharePercent);

  const alt =
    `Pictograph of 100 marks. ${highlighted} are highlighted, representing ` +
    `${context.sharePercent}% of deaths among Malaysian ${context.sexLabel} aged ${context.ageBand} ` +
    `from ${context.causeLabel} — about 1 in ${context.oneIn}.`;

  return (
    // The grid is decorative: a screen reader gets the sentence, not 100 items.
    <article className={styles.sheet} role="figure" aria-label={alt}>
      <div className={styles.stage}>
        <div className={styles.grid} aria-hidden="true">
          {Array.from({ length: TOTAL_MARKS }, (_, i) => (
            <i
              key={i}
              className={`${styles.mark} ${i < highlighted ? styles.highlighted : styles.rest}`}
            />
          ))}
        </div>

        <div className={styles.key}>
          <strong>About 1 in {context.oneIn} deaths</strong>
          <span>
            <i className={`${styles.swatch} ${styles.highlighted}`} aria-hidden="true" /> Heart
            disease
          </span>
          <span>
            <i className={`${styles.swatch} ${styles.rest}`} aria-hidden="true" /> Other causes
          </span>
        </div>
      </div>

      <p className={styles.callout}>
        For Malaysian {context.sexLabel} aged {context.ageBand}, {context.causeLabel} is the{' '}
        <strong>{context.rankLabel}</strong> cause of death, at{' '}
        <strong>{context.sharePercent}%</strong>.
      </p>

      <p className={styles.pivot}>
        <b>The good news:</b> much of this risk is preventable. Next, let’s look at yours.
      </p>

      <div className={styles.reference}>
        <table>
          {/* Hidden rather than dropped: a table with no caption reaches a screen
              reader as an unlabelled grid of numbers, with nothing to say what it
              tabulates. Sighted readers get the same context from the sentences
              above, so it does not need to be visible. */}
          <caption className="visually-hidden">
            Reference data: share of deaths from {context.causeLabel} by group
          </caption>
          <thead>
            <tr>
              <th scope="col">Group</th>
              <th scope="col">Share of deaths</th>
            </tr>
          </thead>
          <tbody>
            {referenceRows.map((row) => (
              <tr key={row.groupLabel}>
                <td>{row.groupLabel}</td>
                {/* Both notations in one cell: they are the same figure written
                    two ways, so the ratio stays subordinate to the precise one. */}
                <td className={styles.share}>
                  <span>{row.sharePercent}%</span> <span>(about 1 in {row.oneIn})</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className={styles.source}>Source: {sourceLabel}</p>
    </article>
  );
}
