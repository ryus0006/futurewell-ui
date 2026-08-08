/**
 * The four steps, in order. Single source of truth for the progress nav, the
 * Back controls and the section anchors.
 *
 * The array index *is* the step number the app navigates by, so order here is
 * behaviour, not presentation.
 */
export interface SectionDef {
  id: string;
  step: string;
  title: string;
}

/**
 * `title` is the reader's name for the screen and matches the heading that
 * screen renders. `id` is the anchor the skip link and `aria-labelledby` point
 * at, so it is not a label and does not change with the wording.
 */
export const SECTIONS: readonly SectionDef[] = [
  { id: 'profile', step: '01', title: 'About you' },
  { id: 'awareness', step: '02', title: 'Why it matters' },
  { id: 'risk', step: '03', title: 'Your numbers' },
  { id: 'recommendation', step: '04', title: 'Your result' },
] as const;

