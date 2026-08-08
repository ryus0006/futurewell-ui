import styles from './HeroIntro.module.scss';

interface HeroIntroProps {
  onStart: () => void;
  onFindClinic: () => void;
}

const steps = [
  ['01', 'Profile', 'Age and sex decide which population context applies.'],
  ['02', 'Awareness', 'A short heart-risk note explains why checking early matters.'],
  ['03', 'Risk inputs', 'Clinical values are collected before the estimate is requested.'],
  ['04', 'Next steps', 'The result is paired with guidance and public-care access.'],
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
        <h2 id="hero-heading">Understand your heart risk before it becomes urgent.</h2>
        <p className={styles.lede}>
          FutureWell helps Malaysian adults move from awareness to action: understand why
          cardiovascular prevention matters, enter the health numbers used for a risk estimate, then
          review practical guidance and public clinic options.
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
          <span className={styles.panelLabel}>What the app does</span>
          <strong>Awareness, risk context, and next steps in one flow.</strong>
          <p>
            Designed around the same pattern used by heart-risk tools: collect only the needed
            inputs, show the estimate clearly, and make follow-up easier to act on.
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
