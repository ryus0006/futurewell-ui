import styles from './HeroIntro.module.scss';

interface HeroIntroProps {
  onStart: () => void;
  onFindClinic: () => void;
}

const steps = [
  ['01', 'About you', 'Enter age and sex.'],
  ['02', 'Why it matters', 'See the heart-health context.'],
  ['03', 'Your numbers', 'Add the clinical inputs.'],
  ['04', 'Your result', 'Review guidance and care options.'],
] as const;

/**
 * The landing explanation before the assessment flow. It tells a new visitor
 * what FutureWell does without front-loading the clinical form.
 */
export function HeroIntro({ onStart, onFindClinic }: HeroIntroProps) {
  return (
    <section className={styles.hero} aria-labelledby="hero-heading">
      <div className={styles.copy}>
        <p className={styles.kicker}>Preventive heart-health assessment</p>
        <h2 id="hero-heading">Check your heart risk.</h2>
        <p className={styles.lede}>
          FutureWell helps Malaysian adults understand cardiovascular risk, receive practical
          guidance, and find public clinic options for follow-up.
        </p>

        <div className={styles.actions} id="hero-actions">
          <button className={styles.primary} type="button" onClick={onStart}>
            Start heart-risk check
          </button>
          <button className={styles.secondary} type="button" onClick={onFindClinic}>
            Find public clinics
          </button>
        </div>

        <p className={styles.note}>
          FutureWell is an educational prototype. It supports prevention conversations, not
          emergency care or a medical diagnosis.
        </p>
      </div>

      <div className={styles.preview} aria-label="FutureWell product overview">
        <div className={styles.measurePanel}>
          <span className={styles.panelLabel}>What you can do here</span>
          <strong>From quick profile to clear next steps.</strong>
          <p>
            Start with simple details, complete the risk inputs, then review the result and support
            options.
          </p>
        </div>

        <ol className={styles.flow}>
          {steps.map(([number, title, description]) => (
            <li key={number}>
              <span>{number}</span>
              <div>
                <strong>{title}</strong>
                <p>{description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
