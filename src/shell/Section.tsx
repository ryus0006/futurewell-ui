import type { ReactNode } from 'react';

import styles from './Section.module.scss';

interface SectionProps {
  id: string;
  heading: string;
  lede: string;
  /** Both omitted for a section that is not one of the numbered steps. */
  step?: string;
  title?: string;
  children?: ReactNode;
}

/**
 * One screen's worth of content: a labelled landmark with a heading, which is
 * what a screen-reader user navigates to — there are no routes, so nothing else
 * announces that the screen changed.
 *
 * `step` marks it as a numbered stage. A numbered screen carries the larger
 * heading; without it the heading steps down a size.
 *
 * The step number is not repeated here — `StepNav`, directly above, already
 * names the current step and marks it as current.
 */
export function Section({ id, step, title, heading, lede, children }: SectionProps) {
  const headingId = `${id}-heading`;
  const numbered = step !== undefined && title !== undefined;

  return (
    <section
      id={id}
      className={numbered ? styles.section : `${styles.section} ${styles.standalone}`}
      aria-labelledby={headingId}
      tabIndex={-1}
    >
      <div className={styles.head}>
        <h2 id={headingId}>{heading}</h2>
        <p className={styles.lede}>{lede}</p>
      </div>
      {children}
    </section>
  );
}

/** Placeholder body for a section with no content yet. */
export function SectionPlaceholder({ children }: { children: ReactNode }) {
  return <div className={styles.placeholder}>{children}</div>;
}

export const stageClass = styles.stage;
