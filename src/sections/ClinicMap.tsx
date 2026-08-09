import L from 'leaflet';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CircleMarker, MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet';

import type { Clinic, ClinicCluster } from '../core/model';
import styles from './ClinicFinder.module.scss';

import 'leaflet/dist/leaflet.css';

interface ClinicMapProps {
  clusters: ClinicCluster[];
  /** The current page of results. Drawn individually once a state is chosen. */
  items: Clinic[];
  selectedId: string | null;
  /** Set when the list has been narrowed to one state — the drill-down view. */
  drilledDown: boolean;
  onSelectCluster: (state: string) => void;
  onSelectClinic: (id: string) => void;
}

/** Every clinic in the registry is Malaysian, so the map is framed and locked here. */
const MALAYSIA_BOUNDS: [[number, number], [number, number]] = [
  [0.6, 99.3],
  [7.6, 119.6],
];

/**
 * Margin around the country. Pixels rather than degrees: a degree-based margin
 * shrinks with the panel and clipped border states at phone width.
 */
const EDGE_PADDING: [number, number] = [24, 24];

/** Zoom for a single selected clinic — close enough to read the street it is on. */
const SELECTED_CLINIC_ZOOM = 15;

/**
 * Centre-to-centre gap the cluster badges are held to, in pixels: the badge's
 * own 36px and a hair more, so each keeps a surface of its own to be clicked on.
 */
const CLUSTER_SEPARATION = 38;

/**
 * The map.
 *
 * **Every marker is a real aggregate.** Clusters come from
 * `GET /api/clinics/clusters` with the active filters applied — no coordinates or
 * counts are hardcoded here — and clicking one filters the list to that cluster's
 * own clinics.
 *
 * Two levels of detail, and the filter rather than the zoom decides which: one
 * badge per state until a state is chosen, individual clinics after. Both are
 * driven by the same response the list is rendering, so the map and the list can
 * never disagree.
 */
export function ClinicMap({
  clusters,
  items,
  selectedId,
  drilledDown,
  onSelectCluster,
  onSelectClinic,
}: ClinicMapProps) {
  const selected = items.find((c) => c.id === selectedId) ?? null;
  const [wheelZoom, setWheelZoom] = useState(false);

  return (
    <MapContainer
      className={styles.map}
      bounds={MALAYSIA_BOUNDS}
      boundsOptions={{ padding: EDGE_PADDING }}
      // A wall, not a rubber band. Bounds are set in `LockZoomToCountry`.
      maxBoundsViscosity={1}
      // Whole-number zoom cannot frame a country this shape; the nearest fit
      // lands back on the region view.
      zoomSnap={0}
      // Enabled on engagement; see `WheelZoomOnEngage`.
      scrollWheelZoom={false}
      aria-label="Map of public clinic locations in Malaysia"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {drilledDown ? (
        items.map((clinic) => (
          <ClinicCircle
            key={clinic.id}
            clinic={clinic}
            selected={clinic.id === selectedId}
            onSelect={() => onSelectClinic(clinic.id)}
          />
        ))
      ) : (
        <ClusterMarkers clusters={clusters} onSelect={onSelectCluster} />
      )}

      {/* At country view a selected clinic still gets its own marker, so zooming
          to it never lands on an empty street with no pin. */}
      {!drilledDown && selected && (
        <ClinicCircle clinic={selected} selected onSelect={() => onSelectClinic(selected.id)} />
      )}

      <FitView selected={selected} items={items} drilledDown={drilledDown} />
      <LockZoomToCountry />
      <WheelZoomOnEngage onChange={setWheelZoom} />

      {!wheelZoom && !selected && (
        <div className={styles.zoomHint} aria-hidden="true">
          Click the map to zoom
        </div>
      )}
    </MapContainer>
  );
}

/** One clinic as a circle, enlarged and recoloured when it is the selection. */
function ClinicCircle({
  clinic,
  selected,
  onSelect,
}: {
  clinic: Clinic;
  selected: boolean;
  onSelect: () => void;
}) {
  const color = selected ? '#7d2636' : '#007c89';
  return (
    <CircleMarker
      center={[clinic.lat, clinic.lng]}
      radius={selected ? 11 : 7}
      pathOptions={{ color, fillColor: color, fillOpacity: 0.75, weight: 2 }}
      eventHandlers={{ click: onSelect }}
    >
      <Tooltip>{clinic.name}</Tooltip>
    </CircleMarker>
  );
}

/**
 * The state badges, held apart so every one of them can be clicked.
 *
 * A badge is drawn at its state's centroid, and several states are closer
 * together than one badge is wide — Kuala Lumpur sits inside Selangor, so at the
 * zoom that frames the whole country their badges land on the same pixel and the
 * one Leaflet stacks underneath cannot be reached at all. Nudging the pile apart
 * is what map labelling has always done with crowded names.
 *
 * Nothing marks the nudge, because a state's centroid is already an abstraction
 * rather than a place: the badge counts a whole state, and the tooltip names it.
 */
function ClusterMarkers({
  clusters,
  onSelect,
}: {
  clusters: ClinicCluster[];
  onSelect: (state: string) => void;
}) {
  const map = useMap();
  const [lifted, setLifted] = useState<string | null>(null);
  // Pixel gaps change with the zoom and with the panel's width, so the layout is
  // redone whenever either does.
  const [layoutKey, setLayoutKey] = useState(0);

  useEffect(() => {
    const redo = () => setLayoutKey((n) => n + 1);
    map.on('zoomend', redo);
    map.on('resize', redo);
    return () => {
      map.off('zoomend', redo);
      map.off('resize', redo);
    };
  }, [map]);

  // Compared by content: the prop is a new array on every response, and the
  // badges only actually change when a state's count does.
  const signature = clusters.map((c) => `${c.state}:${c.count}`).join('|');

  const placed = useMemo(
    () => spreadClusters(clusters, map),
    // `layoutKey` is the signal that the projection moved under us.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [signature, map, layoutKey],
  );

  /* Held still across renders, and not merely to save the work. Handing `Marker`
     a new icon makes it replace the badge's element; do that between a press and
     its release — which hovering alone would, now that it sets state — and the
     browser has no single element to report a click on, so the click is lost. */
  const icons = useMemo(
    () => new Map(clusters.map((c) => [c.state, clusterIcon(c.state, c.count)])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [signature],
  );

  return (
    <>
      {placed.map(({ cluster, position }) => (
        <Marker
          key={cluster.state}
          position={position}
          icon={icons.get(cluster.state)}
          /* Whichever badge is under the pointer comes to the front, so a pair
             that still touches after being spread stays separately reachable. */
          zIndexOffset={lifted === cluster.state ? 1000 : 0}
          eventHandlers={{
            click: () => onSelect(cluster.state),
            mouseover: () => setLifted(cluster.state),
            mouseout: () => setLifted((s) => (s === cluster.state ? null : s)),
          }}
        >
          <Tooltip>
            {cluster.state} — {cluster.count}
          </Tooltip>
        </Marker>
      ))}
    </>
  );
}

/**
 * Pushes overlapping badges apart until each has `CLUSTER_SEPARATION` to itself,
 * and hands back where they ended up.
 *
 * Each pass moves both members of a colliding pair half the shortfall, which
 * settles a cluster of three or more instead of shunting the problem along the
 * chain. Passes are capped: a dense enough set never fully resolves, and a
 * near-miss is worth far less than a frozen map.
 */
function spreadClusters(
  clusters: ClinicCluster[],
  map: L.Map,
): { cluster: ClinicCluster; position: L.LatLng }[] {
  const points = clusters.map((c) => map.latLngToLayerPoint([c.lat, c.lng]));

  for (let pass = 0; pass < 40; pass++) {
    let collided = false;

    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const a = points[i];
        const b = points[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let gap = Math.hypot(dx, dy);
        if (gap >= CLUSTER_SEPARATION) continue;

        // Centroids that coincide exactly offer no direction to separate along,
        // so one is chosen. North-south, which suits a country this shape.
        if (gap === 0) {
          dx = 0;
          dy = 1;
          gap = 1;
        }

        const shift = (CLUSTER_SEPARATION - gap) / 2;
        points[i] = L.point(a.x - (dx / gap) * shift, a.y - (dy / gap) * shift);
        points[j] = L.point(b.x + (dx / gap) * shift, b.y + (dy / gap) * shift);
        collided = true;
      }
    }

    if (!collided) break;
  }

  return clusters.map((cluster, i) => ({ cluster, position: map.layerPointToLatLng(points[i]) }));
}

/**
 * Leaflet puts every marker in the tab order, so each needs a name. The label
 * goes inside the icon because `Marker`'s `alt` only reaches an `<img>` icon and
 * a `divIcon` has none. `html` is innerHTML, so backend strings are escaped.
 */
function clusterIcon(state: string, count: number): L.DivIcon {
  const label = `${state}, ${count} ${count === 1 ? 'clinic' : 'clinics'}`;
  return L.divIcon({
    className: styles.cluster,
    // The digits are decorative once the label spells them out.
    html:
      `<span aria-hidden="true">${escapeHtml(String(count))}</span>` +
      `<span class="${styles.srOnly}">${escapeHtml(label)}</span>`,
    iconSize: [36, 36],
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Keeps the viewport on whatever the list is showing — the selected clinic, the
 * drill-down, or the whole country. The map has to follow the filter or it is
 * decoration.
 *
 * An effect by necessity: imperative Leaflet state needs synchronising, and it
 * performs no HTTP, which is what the app's request rule is about.
 */
function FitView({
  selected,
  items,
  drilledDown,
}: {
  selected: Clinic | null;
  items: Clinic[];
  drilledDown: boolean;
}) {
  const map = useMap();
  // Keyed on identity rather than the array, which is a new reference each render.
  const key = items.map((c) => c.id).join(',');
  const wasDrilledDown = useRef(false);

  useEffect(() => {
    if (selected) {
      map.setView([selected.lat, selected.lng], Math.max(map.getZoom(), SELECTED_CLINIC_ZOOM));
    } else if (drilledDown && items.length > 0) {
      map.fitBounds(
        items.map((c) => [c.lat, c.lng] as [number, number]),
        { padding: [48, 48], maxZoom: 12 },
      );
    } else if (wasDrilledDown.current) {
      // Only on the way back out; resetting on every result change would yank
      // the viewport on each keystroke.
      map.fitBounds(MALAYSIA_BOUNDS, { padding: EDGE_PADDING });
    }
    wasDrilledDown.current = drilledDown;
    // `key` stands in for `items`; `selected` is compared by id for the same reason.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, drilledDown, key, selected?.id]);

  return null;
}

/**
 * Pins the map to Malaysia: a zoom floor that frames the country, and a pan limit
 * matching what that framing shows.
 *
 * Both derive from the panel's current size. Malaysia is ~3:1 and no panel is, so
 * the framed view is always taller than the country — a fixed `maxBounds` ends up
 * smaller than the viewport at some widths, and Leaflet resolves that by shoving
 * the centre to an edge.
 */
function LockZoomToCountry() {
  const map = useMap();

  useEffect(() => {
    const apply = () => {
      const zoom = map.getBoundsZoom(MALAYSIA_BOUNDS, false, L.point(...EDGE_PADDING));
      map.setMinZoom(zoom);

      // Computed without moving the view, so a resize mid-drill-down does not
      // yank the reader back out to the country.
      const centre = L.latLngBounds(MALAYSIA_BOUNDS).getCenter();
      const half = map.getSize().divideBy(2);
      const origin = map.project(centre, zoom);
      map.setMaxBounds(
        L.latLngBounds(
          map.unproject(origin.add(L.point(-half.x, half.y)), zoom),
          map.unproject(origin.add(L.point(half.x, -half.y)), zoom),
        ),
      );
    };

    apply();
    map.on('resize', apply);
    return () => {
      map.off('resize', apply);
    };
  }, [map]);

  return null;
}

/**
 * Wheel zoom only once the reader engages with the map.
 *
 * Always-on makes a tall map a scroll trap; always-off means the wheel does
 * nothing where every web map says it should. Click or tab in to zoom, move away
 * to give the page its scroll back. The visible hint says so.
 */
function WheelZoomOnEngage({ onChange }: { onChange: (active: boolean) => void }) {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();

    const engage = () => {
      map.scrollWheelZoom.enable();
      onChange(true);
    };
    const release = () => {
      map.scrollWheelZoom.disable();
      onChange(false);
    };

    // Tabbing in is the keyboard equivalent of the click.
    container.addEventListener('click', engage);
    container.addEventListener('focusin', engage);
    container.addEventListener('mouseleave', release);
    container.addEventListener('focusout', release);

    return () => {
      container.removeEventListener('click', engage);
      container.removeEventListener('focusin', engage);
      container.removeEventListener('mouseleave', release);
      container.removeEventListener('focusout', release);
      map.scrollWheelZoom.disable();
    };
  }, [map, onChange]);

  return null;
}
