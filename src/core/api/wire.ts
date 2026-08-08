/**
 * Wire DTOs — the exact snake_case shapes the FastAPI backend returns.
 *
 * They are the contract boundary:
 * API modules map these to camelCase domain models so components never see
 * snake_case. Nothing outside `core/api` should import from this file.
 */

export type SexWire = 'male' | 'female';
export type RiskLevelWire = 'low' | 'medium' | 'high';

/* ------------------------------------------------- GET /api/awareness */

export interface AwarenessContextWire {
  sex_label: string;
  age_band: string;
  cause_label: string;
  share_percent: number;
  rank_label: string;
  one_in: number;
}

export interface AwarenessReferenceRowWire {
  group_label: string;
  share_percent: number;
  one_in: number;
}

export interface AwarenessResponseWire {
  context: AwarenessContextWire;
  reference_rows: AwarenessReferenceRowWire[];
  source_label: string;
}

/* ----------------------------------------------------- POST /api/risk */

export interface RiskRequestWire {
  age: number;
  sex: SexWire;
  systolic_bp: number;
  total_cholesterol: number;
  hdl_cholesterol: number;
  smoking: boolean;
  diabetes: boolean;
  bp_treated: boolean;
}

export interface RiskModelWire {
  name: string;
  citation: string;
  caveat: string;
  is_validated: boolean;
}

export interface RiskResponseWire {
  risk: {
    percent: number;
    level: RiskLevelWire;
    level_label: string;
    horizon_years: number;
  };
  model: RiskModelWire;
}

/* ------------------------------------------------- POST /api/guidance */

/**
 * No record ids: which guidance records apply is a rule in the backend's
 * database, and the frontend never sees the records.
 */
export interface GuidanceRequestWire {
  risk_inputs: RiskRequestWire;
  level: RiskLevelWire;
}

export interface GuidanceResponseWire {
  summary: string;
}

/* --------------------------------------- GET /api/clinics + /clusters */

export interface ClinicWire {
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

export interface FacetWire {
  value: string;
  count: number;
}

export interface ClinicsResponseWire {
  total: number;
  filtered_total: number;
  items: ClinicWire[];
  facets: {
    states: FacetWire[];
    types: FacetWire[];
  };
}

export interface ClusterWire {
  lat: number;
  lng: number;
  count: number;
  state: string;
}

export interface ClustersResponseWire {
  clusters: ClusterWire[];
}

/** FastAPI's standard 422 body; `loc` maps each message onto a form field. */
export interface ValidationErrorWire {
  detail: { loc: (string | number)[]; msg: string; type: string }[];
}
