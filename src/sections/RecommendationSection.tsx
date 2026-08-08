import type { ReactNode } from 'react';

import { useAssessment } from '../core/store/assessment';
import { Section } from '../shell/Section';
import { SECTIONS } from '../shell/sections';
import { ErrorState, Skeleton, panelClass } from '../ui/States';
import { GuidanceSummaryPanel } from './GuidanceSummaryPanel';
import { InputsSummary } from './InputsSummary';
import styles from './Recommendation.module.scss';
import { RiskResultPanel } from './RiskResultPanel';

interface RecommendationSectionProps {
  onGoToRisk: () => void;
  onRetry: () => void;
  /** Opens the clinic finder, which has its own screen. */
  onOpenFinder: () => void;
}

/**
 * Step 04. The loading state renders **no number at all** — a placeholder figure
 * here would belong to nobody.
 */
export function RecommendationSection({
  onGoToRisk,
  onRetry,
  onOpenFinder,
}: RecommendationSectionProps) {
  const profile = useAssessment((s) => s.profile);
  const inputs = useAssessment((s) => s.riskInputs);
  const result = useAssessment((s) => s.result);
  const status = useAssessment((s) => s.riskStatus);
  const error = useAssessment((s) => s.riskError);
  const guidance = useAssessment((s) => s.guidance);
  const guidanceStatus = useAssessment((s) => s.guidanceStatus);

  const heading = 'Your result';
  const lede = 'Your estimate, the answers behind it, and what to do next.';

  let body: ReactNode;

  if (status === 'loading') {
    body = (
      <div className={panelClass}>
        <Skeleton lines={5} label="Calculating your estimate" />
      </div>
    );
  } else if (status === 'error' && error && error.kind !== 'validation') {
    // Validation failures belong on the form fields; RiskSection renders those.
    body = (
      <div className={panelClass}>
        <ErrorState error={error} onRetry={onRetry} />
      </div>
    );
  } else if (!result || !profile || !inputs) {
    // Unreachable: the branches above cover every state before a result lands.
    return null;
  } else {
    body = (
      <div className={styles.grid}>
        {/* Child order is what the layout keys on — see Recommendation.module.scss. */}
        <RiskResultPanel result={result} onFindClinic={onOpenFinder} />
        <InputsSummary profile={profile} inputs={inputs} onEdit={onGoToRisk} />
        <GuidanceSummaryPanel guidance={guidance} status={guidanceStatus} />
      </div>
    );
  }

  return (
    <Section {...SECTIONS[3]} heading={heading} lede={lede}>
      {body}
    </Section>
  );
}
