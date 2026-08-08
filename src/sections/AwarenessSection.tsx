import { useAssessment } from '../core/store/assessment';
import { Section } from '../shell/Section';
import { SECTIONS } from '../shell/sections';
import { ErrorState, Skeleton, panelClass } from '../ui/States';
import form from './Form.module.scss';
import { Pictograph } from './Pictograph';

interface AwarenessSectionProps {
  onContinue: () => void;
  onRetry: () => void;
}

/**
 * Step 02 — population context from `GET /api/awareness`. Fires nothing itself:
 * the request comes from `ProfileSection`'s Continue handler.
 */
export function AwarenessSection({ onContinue, onRetry }: AwarenessSectionProps) {
  const profile = useAssessment((s) => s.profile);
  const awareness = useAssessment((s) => s.awareness);
  const status = useAssessment((s) => s.awarenessStatus);
  const error = useAssessment((s) => s.awarenessError);

  const heading = 'Why it matters';
  const lede = 'What heart disease means for 100 Malaysians of your age and sex.';

  // Unreachable: App clamps the step index, so this mounts only with a profile.
  if (!profile) return null;

  return (
    <Section {...SECTIONS[1]} heading={heading} lede={lede}>
      {status === 'loading' && (
        <div className={panelClass}>
          <Skeleton lines={6} label="Loading population figures" />
        </div>
      )}

      {status === 'error' && error && (
        <div className={panelClass}>
          <ErrorState
            error={error}
            onRetry={onRetry}
            message={`${error.message} These are population statistics — you can continue without them.`}
          />
        </div>
      )}

      {/* Unwrapped: the pictograph brings its own sheet, because its figures run
          to the edges and a padded panel around them would inset the one
          full-bleed surface in the product. */}
      {status === 'ready' && awareness && <Pictograph awareness={awareness} />}

      {/* Outside the panel and never disabled: the figures are motivation, not
          a prerequisite, so a failed lookup must not block progress. */}
      <p style={{ marginTop: '1.2rem' }}>
        <button type="button" className={form.primaryAction} onClick={onContinue}>
          Continue to your numbers
        </button>
      </p>
    </Section>
  );
}
