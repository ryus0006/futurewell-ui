import L from 'leaflet';
import { useEffect, useRef, useState } from 'react';
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

/**
 * The map.
 *
 * **Every marker is a real aggregate.** Clusters come from
 * `GET /api/clinics/clusters` with the active filters applied — no coordinates or
 * counts are hardcoded here — and clicking one filters the list to that cluster's
 * own clinics.
 *
 * Two zoom levels of detail: clusters while the whole country is in view, and
 * individual clinics once a state is selected. Both are driven by the same
 * response the list is rendering, so the map and the list can never disagree.
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

      {drilledDown
        ? items.map((clinic) => (
            <CircleMarker
              key={clinic.id}
              center={[clinic.lat, clinic.lng]}
              radius={clinic.id === selectedId ? 11 : 7}
              pathOptions={{
                color: clinic.id === selectedId ? '#7d2636' : '#007c89',
                fillColor: clinic.id === selectedId ? '#7d2636' : '#007c89',
                fillOpacity: 0.75,
                weight: 2,
              }}
              eventHandlers={{ click: () => onSelectClinic(clinic.id) }}
            >
              <Tooltip>{clinic.name}</Tooltip>
            </CircleMarker>
          ))
        : clusters.map((cluster) => (
            <Marker
              key={cluster.state}
              position={[cluster.lat, cluster.lng]}
              icon={clusterIcon(cluster.state, cluster.count)}
              eventHandlers={{ click: () => onSelectCluster(cluster.state) }}
            >
              <Tooltip>
                {cluster.state} — {cluster.count}
              </Tooltip>
            </Marker>
          ))}

      <FitView selected={selected} items={items} drilledDown={drilledDown} />
      <LockZoomToCountry />
      <WheelZoomOnEngage onChange={setWheelZoom} />

      {!wheelZoom && (
        <div className={styles.zoomHint} aria-hidden="true">
          Zoom in to see individual clinics
        </div>
      )}
    </MapContainer>
  );
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
      map.setView([selected.lat, selected.lng], Math.max(map.getZoom(), 12));
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
