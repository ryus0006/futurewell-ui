import type { Awareness, Profile } from '../model';
import { request } from './http';
import type { AwarenessResponseWire } from './wire';

/**
 * `GET /api/awareness`.
 *
 * Called from `App`'s profile-continue handler. Nothing here subscribes to the
 * store, and there is no hook — a module that cannot use hooks cannot fetch on
 * mount.
 */
export async function fetchAwareness(profile: Profile, signal?: AbortSignal): Promise<Awareness> {
  const wire = await request<AwarenessResponseWire>('/api/awareness', {
    query: { sex: profile.sex, age: profile.age },
    signal,
  });

  return {
    context: {
      sexLabel: wire.context.sex_label,
      ageBand: wire.context.age_band,
      causeLabel: wire.context.cause_label,
      sharePercent: wire.context.share_percent,
      rankLabel: wire.context.rank_label,
      oneIn: wire.context.one_in,
    },
    referenceRows: wire.reference_rows.map((row) => ({
      groupLabel: row.group_label,
      sharePercent: row.share_percent,
      oneIn: row.one_in,
    })),
    sourceLabel: wire.source_label,
  };
}
