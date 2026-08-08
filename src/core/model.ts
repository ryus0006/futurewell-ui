/**
 * Domain models — camelCase, what components see.
 *
 * The API modules map these to and from the snake_case wire DTOs in
 * `core/api/wire.ts` at the boundary.
 */

export type Sex = 'male' | 'female';
export type RiskLevel = 'low' | 'medium' | 'high';
export type Status = 'idle' | 'loading' | 'error' | 'ready';

/** Step 01. */
export interface Profile {
  age: number;
  sex: Sex;
}

/**
 * Step 03 — the **six** clinical values only. Age and sex live in `Profile`;
 * storing them twice lets them drift, so the eight-field request is composed
 * from both at submit time.
 */
export interface RiskInputs {
  systolicBp: number;
  totalCholesterol: number;
  hdlCholesterol: number;
  smoking: boolean;
  diabetes: boolean;
  bpTreated: boolean;
}

export interface RiskModel {
  name: string;
  citation: string;
  caveat: string;
  isValidated: boolean;
}

export interface RiskResult {
  percent: number;
  level: RiskLevel;
  levelLabel: string;
  horizonYears: number;
  model: RiskModel;
}

/* ------------------------------------------------------------ awareness --- */

export interface AwarenessContext {
  sexLabel: string;
  ageBand: string;
  causeLabel: string;
  sharePercent: number;
  rankLabel: string;
  oneIn: number;
}

export interface AwarenessRow {
  groupLabel: string;
  sharePercent: number;
  oneIn: number;
}

export interface Awareness {
  context: AwarenessContext;
  referenceRows: AwarenessRow[];
  sourceLabel: string;
}

/* ------------------------------------------------------------- guidance --- */

/**
 * The whole of the advice shown in step 04. The backend selects the guidance
 * records and rewrites them; the frontend holds no copy of them.
 */
export interface Guidance {
  summary: string;
}

/* -------------------------------------------------------------- clinics --- */

export interface Clinic {
  id: string;
  name: string;
  type: string;
  state: string;
  district: string;
  address: string;
  phone: string;
  services: string;
  lat: number;
  lng: number;
}

export interface Facet {
  value: string;
  count: number;
}

export interface ClinicPage {
  total: number;
  filteredTotal: number;
  items: Clinic[];
  facets: { states: Facet[]; types: Facet[] };
}

export interface ClinicCluster {
  lat: number;
  lng: number;
  count: number;
  state: string;
}

export interface ClinicQuery {
  q?: string;
  state?: string;
  type?: string;
  limit?: number;
  offset?: number;
}
