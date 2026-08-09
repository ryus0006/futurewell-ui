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
  /** Decimal places the field accepts. Zero means whole numbers only. */
  decimals: number;
}

export const AGE_RULE: RangeRule = { min: 30, max: 79, label: 'Age', decimals: 0 };

/**
 * Bounds for the field's own `min`/`max`, so the spinner arrows can only step
 * onto an accepted age. Without them the arrows walk past either end of the
 * band, including below zero.
 */
export const AGE_INPUT_BOUNDS = { min: AGE_RULE.min, max: AGE_RULE.max } as const;

const AGE_DIGITS = String(AGE_RULE.max).length;

/**
 * Whether `raw` may be *in* the age field — either an accepted age already, or a
 * prefix that can still be completed into one. Guards typing and pasting, which
 * `min`/`max` do not.
 *
 * A partial entry has to be allowed through or the field cannot be typed into:
 * reaching 35 means passing through "3". So "3" is accepted because 30-39 exist,
 * while "8" is refused outright because every 8x is past the ceiling.
 *
 * Refusing the keystroke rather than clamping is deliberate. Silently turning a
 * 25-year-old's entry into 31 would hand them an estimate calculated for someone
 * else, and they would have no way to tell.
 */
export function isAgeEntry(raw: string): boolean {
  if (raw === '') return true;
  if (!new RegExp(`^\\d{1,${AGE_DIGITS}}$`).test(raw)) return false;

  const value = Number(raw);
  const inBand = (n: number) => n >= AGE_RULE.min && n <= AGE_RULE.max;
  if (inBand(value)) return true;

  // Still short of full length, so check whether any completion lands in the band.
  const remaining = AGE_DIGITS - raw.length;
  if (remaining === 0) return false;
  const low = value * 10 ** remaining;
  const high = low + 10 ** remaining - 1;
  return high >= AGE_RULE.min && low <= AGE_RULE.max;
}

export const RISK_RULES = {
  systolicBp: { min: 80, max: 240, label: 'Systolic blood pressure', unit: 'mmHg', decimals: 0 },
  totalCholesterol: { min: 2, max: 12, label: 'Total cholesterol', unit: 'mmol/L', decimals: 2 },
  hdlCholesterol: { min: 0.3, max: 4, label: 'HDL cholesterol', unit: 'mmol/L', decimals: 2 },
} satisfies Record<string, RangeRule>;

export type RiskNumericField = keyof typeof RISK_RULES;

/**
 * Whether `raw` may be *in* a numeric risk field: digits, and no more decimal
 * places than the rule allows. A lone trailing '.' passes, because reaching 5.8
 * means passing through "5.".
 *
 * Range is deliberately not checked here. A value outside the band is a real
 * answer that this assessment cannot use, so it is explained by `validateRange`
 * rather than swallowed as the reader types it.
 */
export function isNumericEntry(raw: string, rule: RangeRule): boolean {
  const shape = rule.decimals === 0 ? /^\d*$/ : new RegExp(`^\\d*(\\.\\d{0,${rule.decimals}})?$`);
  return shape.test(raw);
}

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
  /* Backstop for a value the field's own guard never saw — autofill, or a
     restored entry. Checked after the range, which is the more useful thing to
     say when a value is both out of band and the wrong shape. */
  const places = raw.includes('.') ? raw.trim().split('.')[1].length : 0;
  if (places > rule.decimals) {
    return rule.decimals === 0
      ? `${rule.label} should be a whole number.`
      : `${rule.label} should have at most ${rule.decimals} decimal places.`;
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
