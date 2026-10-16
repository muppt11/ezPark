import "server-only";

export type GeocodeResult = { lat: number; lng: number; label: string; road: string | null };

/** Rough box around greater Austin; we only launch there for now. */
const AUSTIN_VIEWBOX = "-98.05,30.62,-97.45,30.05";

// Nominatim's usage policy: max 1 request/second, identify the app, cache results.
let queue: Promise<unknown> = Promise.resolve();
const cache = new Map<string, GeocodeResult | null>();

function throttled<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => new Promise((r) => setTimeout(r, 1100)),
    () => new Promise((r) => setTimeout(r, 1100)),
  );
  return run;
}

/** Street address → coordinates, limited to the Austin area. Null when not found. */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const key = address.trim().toLowerCase();
  if (!key) return null;
  if (cache.has(key)) return cache.get(key)!;

  const result = await throttled(async () => {
    const url =
      "https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&countrycodes=us&bounded=1" +
      `&viewbox=${AUSTIN_VIEWBOX}&q=${encodeURIComponent(address)}`;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "ezPark/0.1 (event parking MVP)" },
        signal: AbortSignal.timeout(6000),
      });
      const rows = (await res.json()) as {
        lat: string;
        lon: string;
        display_name: string;
        address?: { house_number?: string; road?: string; city?: string; town?: string; postcode?: string };
      }[];
      const r = rows[0];
      if (!r) return null;
      const a = r.address ?? {};
      // "2100 San Antonio St, Austin, TX 78705" rather than OSM's building-first display name.
      const street = [a.house_number, a.road].filter(Boolean).join(" ");
      const label = street
        ? `${street}, ${a.city ?? a.town ?? "Austin"}, TX${a.postcode ? ` ${a.postcode}` : ""}`
        : r.display_name.split(",").slice(0, 3).join(",");
      return { lat: Number(r.lat), lng: Number(r.lon), label, road: a.road ?? null };
    } catch {
      return null;
    }
  });
  cache.set(key, result);
  return result;
}
