import { create } from 'zustand';

import type { ApiError } from '../api/http';
import type { Awareness, Guidance, Profile, RiskInputs, RiskResult, Status } from '../model';

/**
 * The assessment store. Two rules make the request gating work:
 *
 * 1. **Never performs HTTP.** Handlers call an API module and write the outcome
 *    here, so writing to the store is always safe — which is what lets a test
 *    seed state and assert no request was made.
 * 2. **In-memory only.** No `persist`, no `sessionStorage`: these are blood
 *    pressure, cholesterol, diabetes and smoking values, and they must not
 *    survive on a shared machine.
 */
export interface AssessmentState {
  profile: Profile | null;
  riskInputs: RiskInputs | null;
  result: RiskResult | null;
  riskStatus: Status;

  riskError: ApiError | null;

  awareness: Awareness | null;
  awarenessStatus: Status;
  awarenessError: ApiError | null;

  /** Own lifecycle: the risk result must never wait on the model call. */
  guidance: Guidance | null;
  guidanceStatus: Status;

  setProfile: (profile: Profile) => void;
  setRiskInputs: (inputs: RiskInputs) => void;
  setResult: (result: RiskResult | null) => void;
  setRiskStatus: (status: Status) => void;
  setRiskError: (error: ApiError | null) => void;
  setAwareness: (awareness: Awareness) => void;
  setAwarenessStatus: (status: Status) => void;
  setAwarenessError: (error: ApiError | null) => void;
  setGuidance: (guidance: Guidance | null) => void;
  setGuidanceStatus: (status: Status) => void;
  reset: () => void;
}

const EMPTY = {
  profile: null,
  riskInputs: null,
  result: null,
  riskStatus: 'idle' as Status,
  riskError: null,
  awareness: null,
  awarenessStatus: 'idle' as Status,
  awarenessError: null,
  guidance: null,
  guidanceStatus: 'idle' as Status,
};

export const useAssessment = create<AssessmentState>((set) => ({
  ...EMPTY,

  setProfile: (profile) =>
    set({
      profile,
      // A result computed from a different age or sex is wrong, not just stale.
      result: null,
      riskStatus: 'idle',
      riskError: null,
      // The guidance describes a result that no longer exists.
      guidance: null,
      guidanceStatus: 'idle',
      // Awareness figures are sex- and age-specific, so these are wrong too.
      awareness: null,
      awarenessStatus: 'idle',
      awarenessError: null,
    }),

  setRiskInputs: (riskInputs) => set({ riskInputs }),
  setResult: (result) => set({ result }),
  setRiskStatus: (riskStatus) => set({ riskStatus }),
  setRiskError: (riskError) => set({ riskError }),
  setAwareness: (awareness) => set({ awareness }),
  setAwarenessStatus: (awarenessStatus) => set({ awarenessStatus }),
  setAwarenessError: (awarenessError) => set({ awarenessError }),
  setGuidance: (guidance) => set({ guidance }),
  setGuidanceStatus: (guidanceStatus) => set({ guidanceStatus }),
  reset: () => set({ ...EMPTY }),
}));

/* --------------------------------------------------------------- selectors ---
 * Gating is derived at read time rather than stored as flags, so there is no
 * second copy of the truth to keep in sync.
 */

export const selectHasProfile = (s: AssessmentState) => s.profile !== null;
export const selectHasResult = (s: AssessmentState) => s.result !== null;
