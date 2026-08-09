import { useState, type FormEvent } from 'react';

import type { RiskInputs } from '../core/model';
import { useAssessment } from '../core/store/assessment';
import { Section } from '../shell/Section';
import { SECTIONS } from '../shell/sections';
import { ErrorState } from '../ui/States';
import form from './Form.module.scss';
import styles from './RiskSection.module.scss';
import {
  isNumericEntry,
  RISK_RULES,
  validateChoice,
  validateRange,
  type RiskNumericField,
} from './validation';

interface RiskSectionProps {
  onSubmit: (inputs: RiskInputs) => void;
  /**
   * Opens the clinic finder from group 2, before any result exists — the reader
   * who cannot answer these three fields is the one who needs a clinic.
   */
  onFindClinic: () => void;
}

type NumericState = Record<RiskNumericField, string>;
type ChoiceField = 'smoking' | 'diabetes' | 'bpTreated';
type ChoiceState = Record<ChoiceField, boolean | null>;

const EMPTY_NUMERIC: NumericState = { systolicBp: '', totalCholesterol: '', hdlCholesterol: '' };
const EMPTY_CHOICES: ChoiceState = { smoking: null, diabetes: null, bpTreated: null };

/* Questions, not chart entries: the controls under them answer Yes or No. */
const CHOICES: { field: ChoiceField; legend: string }[] = [
  { field: 'smoking', legend: 'Do you smoke?' },
  { field: 'diabetes', legend: 'Do you have diabetes?' },
  { field: 'bpTreated', legend: 'Do you take blood-pressure medication?' },
];

const NUMERICS = Object.keys(RISK_RULES) as RiskNumericField[];

/**
 * Step 03 — the six clinical inputs, **grouped by answerability**. Leading with
 * systolic BP walls off anyone without a recent blood test at field one, before
 * they learn the rest is answerable from memory.
 *
 * Starts empty on a first visit, and Reset clears rather than restores:
 * prefilled clinical defaults let someone submit an estimate built from another
 * person's numbers without noticing.
 */
export function RiskSection({ onSubmit, onFindClinic }: RiskSectionProps) {
  const profile = useAssessment((s) => s.profile);
  const riskStatus = useAssessment((s) => s.riskStatus);
  const riskError = useAssessment((s) => s.riskError);
  const setRiskInputs = useAssessment((s) => s.setRiskInputs);

  // Restored, not defaulted. The screen unmounts when the reader moves on, so
  // without this, coming back to change one answer hands them an empty form.
  // Only their own submitted values return; `EMPTY_*` covers a first visit.
  const submitted = useAssessment.getState().riskInputs;
  const [numeric, setNumeric] = useState<NumericState>(() =>
    submitted
      ? {
          systolicBp: String(submitted.systolicBp),
          totalCholesterol: String(submitted.totalCholesterol),
          hdlCholesterol: String(submitted.hdlCholesterol),
        }
      : EMPTY_NUMERIC,
  );
  const [choices, setChoices] = useState<ChoiceState>(() =>
    submitted
      ? {
          smoking: submitted.smoking,
          diabetes: submitted.diabetes,
          bpTreated: submitted.bpTreated,
        }
      : EMPTY_CHOICES,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const busy = riskStatus === 'loading';

  // `snakeToCamel` in the API layer already matched `systolic_bp` to
  // `systolicBp`, so server and client errors merge without translation.
  const serverFieldErrors = riskError?.kind === 'validation' ? (riskError.fieldErrors ?? {}) : {};
  const shown: Record<string, string> = { ...serverFieldErrors, ...errors };

  // Anything not field-level is a failure of the request as a whole.
  const submitError = riskError && riskError.kind !== 'validation' ? riskError : null;

  function handleReset() {
    setNumeric(EMPTY_NUMERIC);
    setChoices(EMPTY_CHOICES);
    setErrors({});
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!profile) return;

    const next: Record<string, string> = {};
    for (const field of NUMERICS) {
      const message = validateRange(numeric[field], RISK_RULES[field]);
      if (message) next[field] = message;
    }
    for (const { field } of CHOICES) {
      const message = validateChoice(choices[field]);
      if (message) next[field] = message;
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const inputs: RiskInputs = {
      systolicBp: Number(numeric.systolicBp),
      totalCholesterol: Number(numeric.totalCholesterol),
      hdlCholesterol: Number(numeric.hdlCholesterol),
      smoking: choices.smoking!,
      diabetes: choices.diabetes!,
      bpTreated: choices.bpTreated!,
    };
    setRiskInputs(inputs);
    onSubmit(inputs);
  }

  const heading = 'Your numbers';
  const lede =
    'Six more answers and we can estimate your risk. Nothing you enter here is saved — close this page and it is gone.';

  // Unreachable: App clamps the step index, so this mounts only with a profile.
  if (!profile) return null;

  return (
    <Section {...SECTIONS[2]} heading={heading} lede={lede}>
      <form className={form.panel} onSubmit={handleSubmit} noValidate>
        <div className={styles.carried} aria-label="Profile values carried into risk analysis">
          <div>
            <span>Carried from step 01</span>
            <strong>Age {profile.age}</strong>
          </div>
          <div>
            <span>Carried from step 01</span>
            <strong>{profile.sex === 'male' ? 'Male' : 'Female'}</strong>
          </div>
        </div>

        <div className={styles.groupHead}>
          <h3>What you know</h3>
          <p>Three you can answer now, without looking anything up.</p>
        </div>

        <div className={styles.cards}>
          {CHOICES.map(({ field, legend }) => {
            const error = shown[field];
            return (
              <div className={form.inputCard} key={field}>
                <fieldset aria-describedby={error ? `${field}-error` : undefined}>
                  <legend>{legend}</legend>
                  <div className={form.segmented}>
                    {[true, false].map((value) => (
                      <label key={String(value)}>
                        <input
                          type="radio"
                          name={field}
                          value={String(value)}
                          checked={choices[field] === value}
                          onChange={() => {
                            setChoices((c) => ({ ...c, [field]: value }));
                            setErrors((e) => ({ ...e, [field]: '' }));
                          }}
                        />
                        {value ? 'Yes' : 'No'}
                      </label>
                    ))}
                  </div>
                  {error && (
                    <span className={form.fieldError} id={`${field}-error`}>
                      {error}
                    </span>
                  )}
                </fieldset>
              </div>
            );
          })}
        </div>

        <div className={styles.groupHead}>
          <h3>Numbers from your last check-up</h3>
          <p>
            These come from a blood test or a clinic slip. Any Klinik Kesihatan can measure them
            without an appointment.
          </p>
          {/* The exit for someone who cannot go further: all eight fields are
              required, so without lab values there is no submit to make. */}
          <p className={styles.exit}>
            Don&apos;t have these numbers?{' '}
            <button type="button" className={form.linkAction} onClick={onFindClinic}>
              Find a clinic
            </button>
          </p>
        </div>

        <div className={styles.cards}>
          {NUMERICS.map((field) => {
            const rule = RISK_RULES[field];
            const error = shown[field];
            return (
              <div className={form.inputCard} key={field}>
                <label htmlFor={field}>
                  {rule.label}
                  <span className={form.inputWithUnit}>
                    <input
                      id={field}
                      name={field}
                      /* Text rather than a number field, which reports its value
                         as empty whenever the content is not yet a complete
                         number — "5." on the way to 5.8 arrives indistinguishable
                         from pasted junk. Plain text hands over what was actually
                         entered, so one shape check below covers typing, pasting
                         and dropping alike. The spinner these fields would gain
                         is hidden anyway, since it sits where the unit label is. */
                      type="text"
                      inputMode={rule.decimals === 0 ? 'numeric' : 'decimal'}
                      placeholder={`${rule.min}–${rule.max}`}
                      value={numeric[field]}
                      onChange={(e) => {
                        const value = e.target.value;
                        /* Out-of-range values are let through and answered on
                           blur; only the wrong shape is refused outright. */
                        if (!isNumericEntry(value, rule)) return;
                        setNumeric((n) => ({ ...n, [field]: value }));
                      }}
                      onBlur={() =>
                        setErrors((e) => ({ ...e, [field]: validateRange(numeric[field], rule) }))
                      }
                      className={error ? form.invalid : undefined}
                      aria-invalid={error ? true : undefined}
                      aria-describedby={error ? `${field}-error` : undefined}
                    />
                    <b>{rule.unit}</b>
                  </span>
                  {error && (
                    <span className={form.fieldError} id={`${field}-error`}>
                      {error}
                    </span>
                  )}
                </label>
              </div>
            );
          })}
        </div>

        <p className={form.formError} role="status" aria-live="polite">
          {Object.values(shown).some(Boolean) ? 'Check the highlighted answers above.' : ''}
        </p>

        {/* No Retry button: the form keeps its values, so re-submitting is the
            retry. The result screen carries the Retry for its own failures. */}
        {submitError && (
          <div style={{ padding: '0 1.2rem' }}>
            <ErrorState error={submitError} />
          </div>
        )}

        <div className={styles.actions}>
          <button type="button" className={form.secondaryAction} onClick={handleReset}>
            Clear form
          </button>
          <button type="submit" className={form.primaryAction} disabled={busy}>
            {busy ? 'Calculating…' : 'Calculate my risk'}
          </button>
        </div>
      </form>
    </Section>
  );
}
