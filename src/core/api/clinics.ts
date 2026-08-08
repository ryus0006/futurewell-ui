import type { ClinicCluster, ClinicPage, ClinicQuery } from '../model';
import { request } from './http';
import type { ClinicsResponseWire, ClustersResponseWire } from './wire';

/**
 * `GET /api/clinics` and `GET /api/clinics/clusters`. Filtering is server-side —
 * the real registry is ~2,900 rows — so counts come from `filtered_total`, never
 * `items.length`.
 *
 * **Order is the backend's:** re-sorting a paginated response would only reorder
 * the current page.
 */
export async function fetchClinics(query: ClinicQuery = {}, signal?: AbortSignal): Promise<ClinicPage> {
  const wire = await request<ClinicsResponseWire>('/api/clinics', {
    query: {
      q: query.q,
      state: query.state,
      type: query.type,
      limit: query.limit,
      offset: query.offset,
    },
    signal,
  });

  return {
    total: wire.total,
    filteredTotal: wire.filtered_total,
    items: wire.items,
    facets: wire.facets,
  };
}

export async function fetchClinicClusters(
  query: ClinicQuery = {},
  signal?: AbortSignal,
): Promise<ClinicCluster[]> {
  const wire = await request<ClustersResponseWire>('/api/clinics/clusters', {
    query: { q: query.q, state: query.state, type: query.type },
    signal,
  });
  return wire.clusters;
}
