import type { Guidance, Profile, RiskInputs, RiskResult } from '../model';
import { request } from './http';
import type { GuidanceResponseWire } from './wire';
import { toRiskRequest } from './risk';

/**
 * `POST /api/guidance`. Separate from `/api/risk` because a model call takes
 * seconds and the result must not wait on it — same click, independent
 * lifecycles. The longer timeout is right for a model, wrong for a query.
 */
export async function fetchGuidance(
  profile: Profile,
  inputs: RiskInputs,
  result: RiskResult,
  signal?: AbortSignal,
): Promise<Guidance> {
  const wire = await request<GuidanceResponseWire>('/api/guidance', {
    method: 'POST',
    body: {
      risk_inputs: toRiskRequest(profile, inputs),
      level: result.level,
    },
    timeoutMs: 45_000,
    signal,
  });

  return { summary: wire.summary };
}
