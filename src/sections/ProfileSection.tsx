import { useState, type FormEvent } from 'react';

import type { Profile, Sex } from '../core/model';
import { useAssessment } from '../core/store/assessment';
import { Section } from '../shell/Section';
import { SECTIONS } from '../shell/sections';
import form from './Form.module.scss';
import { AGE_INPUT_BOUNDS, validateAge } from './validation';

interface ProfileSectionProps {
  /** Passed explicitly, so the caller need not re-read the store. */
  onContinue: (profile: Profile) => void;
}

/**
 * Step 01 — age and sex, deliberately separate from the clinical form: awareness
 * renders sex-specific copy, so it needs sex *before* it renders. Merging them
 * loses the motivational ordering the product depends on.
 *
 * Submitting writes to the store and hands back to the caller, which owns the
 * request.
 */
export function ProfileSection({ onContinue }: ProfileSectionProps) {
  const profile = useAssessment((s) => s.profile);
  const setProfile = useAssessment((s) => s.setProfile);

  const [age, setAge] = useState(profile ? String(profile.age) : '');
  const [sex, setSex] = useState<Sex | null>(profile?.sex ?? null);
  const [ageError, setAgeError] = useState('');
  const [sexError, setSexError] = useState('');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const nextAgeError = validateAge(age);
    const nextSexError = sex === null ? 'Select your sex to continue.' : '';
    setAgeError(nextAgeError);
    setSexError(nextSexError);
    if (nextAgeError || nextSexError) return;

    const profile: Profile = { age: Number(age), sex: sex! };
    setProfile(profile);
    onContinue(profile);
  }

  return (
    <Section
      {...SECTIONS[0]}
      heading="Tell us about you"
      lede="Your age and sex decide which population figures apply to you, and they go into the estimate at the end."
    >
      <form className={form.panel} onSubmit={handleSubmit} noValidate>
        <div className={form.fieldGrid}>
          <label htmlFor="profile-age">
            Age
            <small className={form.hint}>For adults aged 41 to 59</small>
            <input
              id="profile-age"
              name="age"
              type="number"
              inputMode="numeric"
              min={AGE_INPUT_BOUNDS.min}
              max={AGE_INPUT_BOUNDS.max}
              step={1}
              placeholder="e.g. 53"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              onBlur={() => setAgeError(validateAge(age))}
              className={ageError ? form.invalid : undefined}
              aria-invalid={ageError ? true : undefined}
              aria-describedby={ageError ? 'profile-age-error' : undefined}
            />
            {ageError && (
              <span className={form.fieldError} id="profile-age-error">
                {ageError}
              </span>
            )}
          </label>

          <fieldset aria-describedby={sexError ? 'profile-sex-error' : undefined}>
            <legend>Sex</legend>
            {/* Both fields carry a note, which is what keeps the two controls on
                the same line — and this one earns its place by answering the
                question a health form asking for sex ought to answer. */}
            <small className={form.hint}>Sets which population figures apply</small>
            <div className={form.segmented}>
              {(['male', 'female'] as const).map((value) => (
                <label key={value}>
                  <input
                    type="radio"
                    name="sex"
                    value={value}
                    checked={sex === value}
                    onChange={() => {
                      setSex(value);
                      setSexError('');
                    }}
                  />
                  {value === 'male' ? 'Male' : 'Female'}
                </label>
              ))}
            </div>
            {sexError && (
              <span className={form.fieldError} id="profile-sex-error">
                {sexError}
              </span>
            )}
          </fieldset>
        </div>

        {/* aria-live so a screen reader hears the failure without moving focus. */}
        <p className={form.formError} role="status" aria-live="polite">
          {ageError || sexError ? 'Check the highlighted answers above.' : ''}
        </p>

        <div style={{ margin: '0 1rem 1rem' }}>
          <button className={form.primaryAction} type="submit">
            See why it matters
          </button>
        </div>
      </form>
    </Section>
  );
}
