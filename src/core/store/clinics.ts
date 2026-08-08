import { create } from 'zustand';

import type { ApiError } from '../api/http';
import type { Clinic, ClinicCluster, ClinicPage, ClinicQuery, Status } from '../model';

/**
 * The clinic finder's state, **deliberately separate from `useAssessment`**:
 * `setProfile` invalidates everything age- and sex-specific, and a clinic search
 * is none of those. Changing your age must not discard the search you just ran.
 *
 * Like the assessment store it never performs HTTP.
 */
export interface ClinicFinderState {
  /** The gate: nothing is requested until a button opens the finder. */
  isOpen: boolean;
  /** The live filters. Written straight from the toolbar; the *request* is debounced. */
  query: ClinicQuery;
  page: ClinicPage | null;
  status: Status;
  error: ApiError | null;
  /** Map aggregates. Empty is a legitimate state — the map still draws its tiles. */
  clusters: ClinicCluster[];
  selectedId: string | null;

  open: () => void;
  setQuery: (query: ClinicQuery) => void;
  /** Starts a search. Leaves the current results up, so the panel does not blank. */
  searching: () => void;
  /**
   * One write, not three. The list, the map and the count all read from this —
   * writing them separately lets a render land in between, where the count has
   * updated but the list it describes has not.
   */
  showResults: (page: ClinicPage, clusters: ClinicCluster[]) => void;
  fail: (error: ApiError) => void;
  select: (id: string | null) => void;
  reset: () => void;
}

const EMPTY = {
  isOpen: false,
  query: {} as ClinicQuery,
  page: null,
  status: 'idle' as Status,
  error: null,
  clusters: [] as ClinicCluster[],
  selectedId: null,
};

export const useClinicFinder = create<ClinicFinderState>((set) => ({
  ...EMPTY,

  open: () => set({ isOpen: true }),
  setQuery: (query) =>
    set({
      query,
      // The selection may not survive the new filter, and a detail panel for a
      // clinic no longer in the list is worse than none.
      selectedId: null,
    }),
  searching: () => set({ status: 'loading', error: null }),
  showResults: (page, clusters) => set({ page, clusters, status: 'ready', error: null }),
  fail: (error) => set({ error, status: 'error' }),
  select: (selectedId) => set({ selectedId }),
  reset: () => set({ ...EMPTY, query: {} }),
}));

/** Resolved against the current page, so a stale id simply selects nothing. */
export const selectSelectedClinic = (s: ClinicFinderState): Clinic | null =>
  s.page?.items.find((c) => c.id === s.selectedId) ?? null;

export const selectHasFilters = (s: ClinicFinderState): boolean =>
  Boolean(s.query.q || s.query.state || s.query.type);
