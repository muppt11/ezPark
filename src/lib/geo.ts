/** Geography helpers shared by the seed, the listing flow and search. No server-only imports. */

export type LatLng = { lat: number; lng: number };

const EARTH_M = 6_371_000;
/** Average walking pace used for estimates (≈ 4.8 km/h). */
const WALK_M_PER_MIN = 80;
/** Straight-line distance undercounts real walking routes; spec'd fallback factor. */
const DETOUR_FACTOR = 1.3;

export function distanceMeters(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_M * Math.asin(Math.sqrt(h));
}

export type Walk = { meters: number; minutes: number; source: "osrm" | "estimate" };

export function estimateWalk(from: LatLng, to: LatLng): Walk {
  const meters = Math.round(distanceMeters(from, to) * DETOUR_FACTOR);
  return { meters, minutes: Math.max(1, Math.round(meters / WALK_M_PER_MIN)), source: "estimate" };
}

/**
 * Walking route length via the public OSRM foot profile (FOSSGIS), with the
 * straight-line x 1.3 estimate as fallback. Call once when a listing is saved, never per page view.
 */
export async function walkingRoute(from: LatLng, to: LatLng): Promise<Walk> {
  const url = `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(4000),
      headers: { "User-Agent": "ezPark/0.1 (event parking MVP)" },
    });
    const data = (await res.json()) as { code: string; routes?: { distance: number }[] };
    const meters = data.code === "Ok" ? data.routes?.[0]?.distance : undefined;
    if (!meters) return estimateWalk(from, to);
    const m = Math.round(meters);
    return { meters: m, minutes: Math.max(1, Math.round(m / WALK_M_PER_MIN)), source: "osrm" };
  } catch {
    return estimateWalk(from, to);
  }
}

/**
 * A random point 80–180 m from the real one, shown before payment.
 * Generate once and store it; re-randomizing per request would let someone average it out.
 */
export function fuzzPoint(p: LatLng, rand: () => number = Math.random): LatLng {
  const dist = 80 + rand() * 100;
  const bearing = rand() * 2 * Math.PI;
  const dLat = (dist * Math.cos(bearing)) / 111_320;
  const dLng = (dist * Math.sin(bearing)) / (111_320 * Math.cos((p.lat * Math.PI) / 180));
  return { lat: p.lat + dLat, lng: p.lng + dLng };
}

export function formatMiles(meters: number): string {
  return `${(meters / 1609.34).toFixed(1)} mi`;
}
