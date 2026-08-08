import { lazy, Suspense, useEffect, useRef } from 'react';

import type { ClinicQuery, Facet } from '../core/model';
import { useClinicFinder, selectHasFilters } from '../core/store/clinics';
import { EmptyState, ErrorState, Skeleton } from '../ui/States';
import styles from './ClinicFinder.module.scss';
import form from './Form.module.scss';
import panel from './Recommendation.module.scss';

/**
 * Leaflet is ~163 kB and nothing needs it until the finder opens. `ClinicMap`
 * imports the stylesheet itself, so that travels in the same async chunk.
 */
const ClinicMap = lazy(() =>
  import('./ClinicMap').then((module) => ({ default: module.ClinicMap })),
);

interface ClinicFinderProps {
  /** Runs a search with the given filters. Debounced by the caller below, not here. */
  onSearch: (query: ClinicQuery) => void;
  onRetry: () => void;
}

/** Long enough that a typed word is one request, short enough to feel immediate. */
const TYPING_DEBOUNCE_MS = 300;

/**
 * The public clinic finder. Its screen carries the heading and id, so this panel
 * has neither, and it arrives already searched.
 *
 * **The one place the "a call needs a deliberate submit" rule bends:** the
 * toolbar's controls fire requests as they change. The gate is on *opening* the
 * finder, and the debounce lives in the change handler rather than an effect —
 * so this stays about which user event fires a call, not a hole in the rule.
 *
 * Nothing here derives from a risk result: the reader most likely to need a
 * clinic is the one who could not supply lab values.
 */
export function ClinicFinder({ onSearch, onRetry }: ClinicFinderProps) {
  const query = useClinicFinder((s) => s.query);
  const page = useClinicFinder((s) => s.page);
  const status = useClinicFinder((s) => s.status);
  const error = useClinicFinder((s) => s.error);
  const clusters = useClinicFinder((s) => s.clusters);
  const selectedId = useClinicFinder((s) => s.selectedId);
  const hasFilters = useClinicFinder(selectHasFilters);
  const setQuery = useClinicFinder((s) => s.setQuery);
  const select = useClinicFinder((s) => s.select);

  const timer = useRef<number | null>(null);

  // Cleanup only; without it a pending search fires after the panel has gone.
  useEffect(() => () => window.clearTimeout(timer.current ?? undefined), []);

  /**
   * Writes the filter immediately, then schedules the request. `delayMs` of 0 is
   * for controls where each change is already deliberate; only typing waits.
   */
  function changeFilter(next: ClinicQuery, delayMs: number) {
    setQuery(next);
    window.clearTimeout(timer.current ?? undefined);
    if (delayMs === 0) {
      onSearch(next);
      return;
    }
    timer.current = window.setTimeout(() => onSearch(next), delayMs);
  }

  const selected = page?.items.find((c) => c.id === selectedId) ?? null;
  const items = page?.items ?? [];
  const drilledDown = Boolean(query.state);

  return (
    <article className={`${panel.panel} ${styles.panel}`}>
      <div className={styles.toolbar} aria-label="Clinic search controls">
        {/* `filtered_total`, never `items.length` — the page is one slice. */}
        <strong role="status" aria-live="polite">
          {countLabel(page?.filteredTotal, page?.total, status)}
        </strong>

        <label>
          Search
          <input
            type="search"
            value={query.q ?? ''}
            placeholder="Clinic, town or district"
            onChange={(e) => changeFilter({ ...query, q: e.target.value }, TYPING_DEBOUNCE_MS)}
          />
        </label>

        <label>
          State
          <select
            value={query.state ?? ''}
            onChange={(e) => changeFilter({ ...query, state: e.target.value }, 0)}
          >
            <option value="">All states</option>
            {withActive(page?.facets.states, query.state).map((facet) => (
              <option key={facet.value} value={facet.value}>
                {facet.value} ({facet.count})
              </option>
            ))}
          </select>
        </label>

        <label>
          Clinic type
          <select
            value={query.type ?? ''}
            onChange={(e) => changeFilter({ ...query, type: e.target.value }, 0)}
          >
            <option value="">All clinic types</option>
            {withActive(page?.facets.types, query.type).map((facet) => (
              <option key={facet.value} value={facet.value}>
                {facet.value} ({facet.count})
              </option>
            ))}
          </select>
        </label>

        <button type="button" onClick={() => changeFilter({}, 0)} disabled={!hasFilters}>
          Reset
        </button>
      </div>

      <div className={styles.finder}>
        {/* Rendered in every state, including error, so the map keeps its base
            tiles. The fallback holds its exact footprint to avoid a resize. */}
        <Suspense fallback={<div className={styles.map} aria-hidden="true" />}>
          <ClinicMap
            clusters={clusters}
            items={items}
            selectedId={selectedId}
            drilledDown={drilledDown}
            onSelectCluster={(state) => changeFilter({ ...query, state }, 0)}
            onSelectClinic={select}
          />
        </Suspense>

        <div className={styles.detail}>
          {status === 'loading' && <Skeleton lines={6} label="Loading clinics" />}

          {status === 'error' && error && (
            <ErrorState
              error={error}
              onRetry={onRetry}
              message={`${error.message} The map is still showing, but the clinic list could not be loaded.`}
            />
          )}

          {status === 'ready' && page && page.filteredTotal === 0 && (
            <>
              <EmptyState>No clinics match these filters.</EmptyState>
              <p>
                <button
                  type="button"
                  className={form.secondaryAction}
                  onClick={() => changeFilter({}, 0)}
                >
                  Clear filters
                </button>
              </p>
            </>
          )}

          {status === 'ready' && page && page.filteredTotal > 0 && (
            <>
              <span className={styles.kicker}>
                {selected ? 'Selected clinic' : 'Select a clinic'}
              </span>
              <h3>{selected ? selected.name : 'Select a clinic to see its details'}</h3>
              {selected ? (
                <dl className={styles.selected}>
                  <div>
                    <dt>Address</dt>
                    <dd>{selected.address}</dd>
                  </div>
                  <div>
                    <dt>Phone</dt>
                    <dd>
                      <a href={`tel:${selected.phone.replace(/\s/g, '')}`}>{selected.phone}</a>
                    </dd>
                  </div>
                  <div>
                    <dt>Type</dt>
                    <dd>{selected.type}</dd>
                  </div>
                </dl>
              ) : (
                <p className={styles.prompt}>
                  {drilledDown
                    ? 'Each marker is one clinic in this state.'
                    : 'Each marker groups the clinics in one state. Select a marker to narrow the list.'}
                </p>
              )}

              {/* Response order: re-sorting a page would only reorder that page. */}
              <ul className={styles.list} aria-label="Clinic results">
                {items.map((clinic) => (
                  <li key={clinic.id}>
                    <button
                      type="button"
                      onClick={() => select(clinic.id)}
                      aria-current={clinic.id === selectedId ? 'true' : undefined}
                      className={clinic.id === selectedId ? styles.itemSelected : undefined}
                    >
                      <strong>{clinic.name}</strong>
                      <span>
                        {clinic.district}, {clinic.state}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>

              {page.filteredTotal > items.length && (
                <p className={styles.more}>
                  Showing the first {items.length} of {page.filteredTotal}. Narrow the search to see
                  the rest.
                </p>
              )}
            </>
          )}

          <p className={styles.source}>
            Active public clinics in the Ministry of Health registry. Private clinics are not
            included; confirm available services before visiting. No location is requested — results
            come from your search, not from where you are.
          </p>
        </div>
      </div>
    </article>
  );
}

/**
 * Keeps the active filter selectable when the facets stop listing it. Facets are
 * counted against the *other* filters, and a `<select>` whose value matches no
 * option silently shows the first — a hidden filter plus a visible lie about it.
 */
function withActive(facets: Facet[] | undefined, active: string | undefined): Facet[] {
  const list = facets ?? [];
  if (!active || list.some((f) => f.value === active)) return list;
  return [...list, { value: active, count: 0 }];
}

function countLabel(filtered: number | undefined, total: number | undefined, status: string) {
  if (status === 'loading' && filtered === undefined) return 'Searching…';
  if (filtered === undefined || total === undefined) return 'No clinics loaded';
  if (filtered === total) return `Showing ${total} clinics`;
  return `Showing ${filtered} of ${total} clinics`;
}
