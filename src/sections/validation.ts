/**
 * Client-side range checks for the profile and risk forms.
 *
 * This exists for immediate feedback only — **the backend remains the
 * authority**. A 422 from `POST /api/risk` maps onto these same field names.
 */

export interface RangeRule {
  min: number;
  max: number;
  label: string;
  unit?: string;
  step?: number;
}

export const AGE_RULE: RangeRule = { min: 41, max: 59, label: 'Age' };

/**
 * What the age spinner may reach — not who the assessment is for. `AGE_RULE` is
 * still the gate, and `min`/`max` do not stop anyone typing a value outside
 * them, so someone aged 35 can still enter it and be told why it does not
 * apply. These bounds only keep the up/down arrows inside plausible ages: with
 * no `min` at all, one click below zero produced -1.
 *
 * 100 rather than something nearer the band: a tighter ceiling would read as a
 * clinical boundary, and the frontend owns none.
 */
export const AGE_INPUT_BOUNDS = { min: 18, max: 100 } as const;

export const RISK_RULES = {
  systolicBp: { min: 80, max: 240, label: 'Systolic blood pressure', unit: 'mmHg', step: 1 },
  totalCholesterol: { min: 2, max: 12, label: 'Total cholesterol', unit: 'mmol/L', step: 0.1 },
  hdlCholesterol: { min: 0.3, max: 4, label: 'HDL cholesterol', unit: 'mmol/L', step: 0.1 },
} satisfies Record<string, RangeRule>;

export type RiskNumericField = keyof typeof RISK_RULES;

/** Returns the message to show, or an empty string when the value is valid. */
export function validateAge(raw: string): string {
  if (raw.trim() === '') return 'Enter your age.';
  const age = Number(raw);
  if (!Number.isFinite(age)) return 'Enter your age as a number.';
  if (age < AGE_RULE.min || age > AGE_RULE.max) {
    return `FutureWell is built for ages ${AGE_RULE.min} to ${AGE_RULE.max}, so it cannot estimate risk for that age.`;
  }
  return '';
}

export function validateRange(raw: string, rule: RangeRule): string {
  if (raw.trim() === '') return `${rule.label} is needed to calculate your estimate.`;
  const value = Number(raw);
  if (!Number.isFinite(value)) return `${rule.label} needs a valid number.`;
  if (value < rule.min || value > rule.max) {
    return `${rule.label} should be between ${rule.min} and ${rule.max} for this assessment.`;
  }
  return '';
}

/**
 * Deliberately does not name the field. The message sits directly under the
 * control it belongs to, and the legends are questions — quoting one back
 * inside a sentence reads as a fragment ("Answer "Do you smoke?" to continue.").
 */
export function validateChoice(value: boolean | null): string {
  return value === null ? 'Choose Yes or No to continue.' : '';
}
