import { SECTIONS } from './sections';
import styles from './StepNav.module.scss';

interface StepNavProps {
  /** Index of the step on screen. */
  current: number;
  /** Highest index unlocked so far. Anything past it is not reachable yet. */
  furthest: number;
  onNavigate: (index: number) => void;
}

/**
 * Progress through the assessment: which steps are done, which you are on, and
 * which are not open yet.
 *
 * An ordered list, because the order is real. Completed steps link back to their
 * own answers; upcoming ones are disabled rather than hidden, so the length of
 * the assessment is visible from the first screen.
 */
export function StepNav({ current, furthest, onNavigate }: StepNavProps) {
  return (
    <div className={styles.hero}>
      <nav aria-label="Assessment progress">
        <ol className={styles.track}>
          {SECTIONS.map((section, index) => {
            const state = index < current ? 'done' : index === current ? 'current' : 'upcoming';
            return (
              <li key={section.id} className={`${styles.item} ${styles[state]}`}>
                <button
                  type="button"
                  className={styles.link}
                  disabled={index > furthest}
                  // "step" rather than "true" — a position in a sequence.
                  aria-current={state === 'current' ? 'step' : undefined}
                  onClick={() => onNavigate(index)}
                >
                  <span className={styles.marker} aria-hidden="true" />
                  <span className={styles.label}>
                    <span className={styles.step}>{section.step}</span>
                    <strong>{section.title}</strong>
                  </span>
                  <span className="visually-hidden">
                    {state === 'done'
                      ? ', completed'
                      : state === 'current'
                        ? ', current step'
                        : ', not available yet'}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
