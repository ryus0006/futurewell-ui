import type { Profile, RiskInputs, RiskResult } from '../model';
import { request } from './http';
import type { RiskRequestWire, RiskResponseWire } from './wire';

/**
 * `POST /api/risk`. The eight-field request is composed from `profile` +
 * `riskInputs`, which is why the store holds only the six clinical values.
 *
 * `level` and `levelLabel` come from the backend and are never re-derived here:
 * cutoffs belong with the model that produced the number.
 */
export function toRiskRequest(profile: Profile, inputs: RiskInputs): RiskRequestWire {
  return {
    age: profile.age,
    sex: profile.sex,
    systolic_bp: inputs.systolicBp,
    total_cholesterol: inputs.totalCholesterol,
    hdl_cholesterol: inputs.hdlCholesterol,
    smoking: inputs.smoking,
    diabetes: inputs.diabetes,
    bp_treated: inputs.bpTreated,
  };
}

export async function fetchRisk(
  profile: Profile,
  inputs: RiskInputs,
  signal?: AbortSignal,
): Promise<RiskResult> {
  const wire = await request<RiskResponseWire>('/api/risk', {
    method: 'POST',
    body: toRiskRequest(profile, inputs),
    signal,
  });

  return {
    percent: wire.risk.percent,
    level: wire.risk.level,
    levelLabel: wire.risk.level_label,
    horizonYears: wire.risk.horizon_years,
    model: {
      name: wire.model.name,
      citation: wire.model.citation,
      caveat: wire.model.caveat,
      isValidated: wire.model.is_validated,
    },
  };
}
