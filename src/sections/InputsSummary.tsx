import type { Profile, RiskInputs } from '../core/model';
import { RISK_RULES } from './validation';
import styles from './Recommendation.module.scss';

interface InputsSummaryProps {
  profile: Profile;
  inputs: RiskInputs;
  onEdit: () => void;
}

/** The values behind the number, so the form need not be revisited to re-read them. */
export function InputsSummary({ profile, inputs, onEdit }: InputsSummaryProps) {
  const rows: [string, string][] = [
    ['Age', String(profile.age)],
    ['Sex', profile.sex === 'male' ? 'Male' : 'Female'],
    ['Current smoker', inputs.smoking ? 'Yes' : 'No'],
    ['Has diabetes', inputs.diabetes ? 'Yes' : 'No'],
    ['Taking BP medication', inputs.bpTreated ? 'Yes' : 'No'],
    ['Systolic blood pressure', `${inputs.systolicBp} ${RISK_RULES.systolicBp.unit}`],
    ['Total cholesterol', `${inputs.totalCholesterol} ${RISK_RULES.totalCholesterol.unit}`],
    ['HDL cholesterol', `${inputs.hdlCholesterol} ${RISK_RULES.hdlCholesterol.unit}`],
  ];

  return (
    <article className={styles.panel} aria-labelledby="inputs-summary-label">
      <p className={styles.label} id="inputs-summary-label">
        Your answers
      </p>

      <dl className={styles.inputs}>
        {rows.map(([term, value]) => (
          <div key={term}>
            <dt>{term}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      <button type="button" className={styles.editLink} onClick={onEdit}>
        Edit these answers
      </button>
    </article>
  );
}
