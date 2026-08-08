import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchAwareness } from './core/api/awareness';
import { fetchClinicClusters, fetchClinics } from './core/api/clinics';
import { fetchGuidance } from './core/api/guidance';
import { isApiError, type ApiError } from './core/api/http';
import { fetchRisk } from './core/api/risk';
import type { ClinicQuery, Profile, RiskInputs } from './core/model';
import { useAssessment } from './core/store/assessment';
import { useClinicFinder } from './core/store/clinics';
import { AwarenessSection } from './sections/AwarenessSection';
import { ProfileSection } from './sections/ProfileSection';
import { RecommendationSection } from './sections/RecommendationSection';
import { RiskSection } from './sections/RiskSection';
import { Section, stageClass } from './shell/Section';
import { SECTIONS } from './shell/sections';
import { StepNav } from './shell/StepNav';
import { Topbar } from './shell/Topbar';
import { ClinicFinder } from './sections/ClinicFinder';

/**
 * The clinic finder's own screen. Not in `SECTIONS`: it is reached from the risk
 * form and from the result, so numbering it would claim an order that is not real.
 */
const CLINICS_ID = 'clinics';

const UNEXPECTED: ApiError = {
  kind: 'server',
  message: 'Something went wrong on our side. Try again in a moment.',
};

/**
 * Four steps shown one at a time, plus the clinic finder. No router: the step
 * index is component state, so nothing is addressable and Back leaves the site —
 * hence the per-screen Back control.
 *
 * **Every API call starts in a handler here**, never in a `useEffect` or a
 * section component: one call site per endpoint, and Retry reuses it.
 */
export default function App() {
  const [requestedStep, setRequestedStep] = useState(0);
  const [showFinder, setShowFinder] = useState(false);

  const hasProfile = useAssessment((s) => s.profile !== null);
  const riskStatus = useAssessment((s) => s.riskStatus);

  /**
   * How far the store's contents allow the reader to be. A profile opens both
   * awareness and the risk form; the result screen opens when the request
   * *starts*, so the estimate is watched arriving rather than awaited on the form.
   */
  const furthest = riskStatus !== 'idle' ? 3 : hasProfile ? 2 : 0;

  // Clamped, so a store reset under a later step lands the reader on the last
  // step that still has its inputs rather than an empty screen.
  const step = Math.min(requestedStep, furthest);

  const screenRef = useRef<HTMLDivElement>(null);
  const navigated = useRef(false);

  /**
   * A screen change does what a page load would: scroll to the top and move
   * focus, or a keyboard user stays where the button used to be. Skipped on
   * first render.
   */
  useEffect(() => {
    if (!navigated.current) {
      navigated.current = true;
      return;
    }
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    screenRef.current?.focus({ preventScroll: true });
  }, [step, showFinder]);

  const goToStep = useCallback((index: number) => {
    setShowFinder(false);
    setRequestedStep(index);
  }, []);

  // Drops superseded requests: a slow first response must not overwrite a
  // faster second one.
  const awarenessRun = useRef(0);
  const riskRun = useRef(0);
  const clinicRun = useRef(0);
  const clinicAbort = useRef<AbortController | null>(null);

  // The stores outlive this component, so a late response would write into the
  // *next* mount. The run counters are per-instance and cannot catch that; this
  // is the cross-instance half of the guard.
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      clinicAbort.current?.abort();
    };
  }, []);

  const loadAwareness = useCallback(async (profile: Profile) => {
    const run = ++awarenessRun.current;
    const store = useAssessment.getState();

    store.setAwarenessStatus('loading');
    store.setAwarenessError(null);

    try {
      const awareness = await fetchAwareness(profile);
      if (!alive.current || run !== awarenessRun.current) return;
      store.setAwareness(awareness);
      store.setAwarenessStatus('ready');
    } catch (error) {
      if (!alive.current || run !== awarenessRun.current) return;
      store.setAwarenessError(isApiError(error) ? error : UNEXPECTED);
      store.setAwarenessStatus('error');
    }
  }, []);

  const handleProfileContinue = useCallback(
    (profile: Profile) => {
      goToStep(1);
      void loadAwareness(profile);
    },
    [goToStep, loadAwareness],
  );

  const retryAwareness = useCallback(() => {
    const profile = useAssessment.getState().profile;
    if (profile) void loadAwareness(profile);
  }, [loadAwareness]);

  /**
   * One click, two calls. Guidance is chained from this handler once the risk
   * response supplies the level, but is not awaited — the result renders without
   * waiting on a model call.
   */
  const loadRisk = useCallback(
    async (profile: Profile, inputs: RiskInputs) => {
      const run = ++riskRun.current;
      const store = useAssessment.getState();

      store.setRiskStatus('loading');
      store.setRiskError(null);
      store.setGuidance(null);
      store.setGuidanceStatus('idle');

      let result;
      try {
        result = await fetchRisk(profile, inputs);
        if (!alive.current || run !== riskRun.current) return;
        store.setResult(result);
        store.setRiskStatus('ready');
      } catch (error) {
        if (!alive.current || run !== riskRun.current) return;
        const failure = isApiError(error) ? error : UNEXPECTED;
        store.setRiskError(failure);
        store.setRiskStatus('error');

        // A 422 names a field, and the field is on the previous screen.
        if (failure.kind === 'validation') goToStep(2);
        return;
      }

      store.setGuidanceStatus('loading');
      try {
        const guidance = await fetchGuidance(profile, inputs, result);
        if (!alive.current || run !== riskRun.current) return;
        store.setGuidance(guidance);
        store.setGuidanceStatus('ready');
      } catch {
        if (!alive.current || run !== riskRun.current) return;
        // Not a failure of the assessment; the result above it still stands.
        store.setGuidanceStatus('error');
      }
    },
    [goToStep],
  );

  const handleRiskSubmit = useCallback(
    (inputs: RiskInputs) => {
      const profile = useAssessment.getState().profile;
      if (!profile) return;
      // Move first, so the estimate is watched arriving on its own screen.
      goToStep(3);
      void loadRisk(profile, inputs);
    },
    [goToStep, loadRisk],
  );

  const retryRisk = useCallback(() => {
    const { profile, riskInputs } = useAssessment.getState();
    if (profile && riskInputs) void loadRisk(profile, riskInputs);
  }, [loadRisk]);

  /**
   * The finder's only call site — both openers and every toolbar control.
   *
   * Alone among the four, this *aborts* what it supersedes rather than ignoring
   * it: typing queues a search every few hundred ms. The run counter still guards
   * the write, so a losing abort cannot post an error over a newer result.
   */
  const loadClinics = useCallback(async (query: ClinicQuery) => {
    const run = ++clinicRun.current;
    clinicAbort.current?.abort();
    const controller = new AbortController();
    clinicAbort.current = controller;

    const store = useClinicFinder.getState();
    store.searching();

    /** Superseded by a newer search, aborted, or the component is gone. */
    const isStale = () => !alive.current || run !== clinicRun.current || controller.signal.aborted;

    try {
      // Fetched together: one without the other shows a map that disagrees with
      // the list beside it.
      const [page, clusters] = await Promise.all([
        fetchClinics({ ...query, limit: 20 }, controller.signal),
        fetchClinicClusters(query, controller.signal),
      ]);
      if (isStale()) return;
      store.showResults(page, clusters);
    } catch (error) {
      if (isStale()) return;
      store.fail(isApiError(error) ? error : UNEXPECTED);
    }
  }, []);

  /**
   * The finder's screen, with the first search already run. Both entry points are
   * pressed by someone who has just been told they need a clinic, so the click
   * *is* the request.
   */
  const openFinder = useCallback(() => {
    const store = useClinicFinder.getState();

    // Re-opening only switches screens; searching again would discard filters.
    if (!store.isOpen) {
      store.open();
      void loadClinics(store.query);
    }
    setShowFinder(true);
  }, [loadClinics]);

  const retryClinics = useCallback(() => {
    void loadClinics(useClinicFinder.getState().query);
  }, [loadClinics]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#profile">
        Skip to the assessment
      </a>

      <Topbar onHome={() => goToStep(0)} />

      <main className="workspace">
        {/* Sections are h2 and the brand is a control, so without this the
            outline starts at level 2. Hidden, because the design's first visible
            words belong to step 01. */}
        <h1 className="visually-hidden">
          FutureWell — preventive heart health assessment for adults aged 41 to 59
        </h1>

        {!showFinder && <StepNav current={step} furthest={furthest} onNavigate={goToStep} />}

        {/* Focus target on every move: reachable programmatically, not tabbable. */}
        <div className={stageClass} ref={screenRef} tabIndex={-1}>
          {showFinder ? (
            <>
              <p className="screen-back">
                <button type="button" onClick={() => goToStep(step)}>
                  Back to {SECTIONS[step].title}
                </button>
              </p>
              <Section
                id={CLINICS_ID}
                heading="Find a clinic."
                lede="Public clinics across Malaysia, searchable by name, state or type. You do not need a risk result to use this."
              >
                <ClinicFinder onSearch={loadClinics} onRetry={retryClinics} />
              </Section>
            </>
          ) : (
            <>
              {step > 0 && (
                <p className="screen-back">
                  <button type="button" onClick={() => goToStep(step - 1)}>
                    Back to {SECTIONS[step - 1].title}
                  </button>
                </p>
              )}

              {step === 0 && <ProfileSection onContinue={handleProfileContinue} />}
              {step === 1 && (
                <AwarenessSection onContinue={() => goToStep(2)} onRetry={retryAwareness} />
              )}
              {step === 2 && (
                <RiskSection onSubmit={handleRiskSubmit} onFindClinic={openFinder} />
              )}
              {step === 3 && (
                <RecommendationSection
                  onGoToRisk={() => goToStep(2)}
                  onRetry={retryRisk}
                  onOpenFinder={openFinder}
                />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
