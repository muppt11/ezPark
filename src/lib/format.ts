/** Display helpers. Venue-local times are shown in the venue's time zone (Austin for now). */

export const VENUE_TZ = "America/Chicago";

export function formatCents(cents: number, { trim = true } = {}): string {
  const dollars = cents / 100;
  return trim && Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

export function formatEventDate(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: VENUE_TZ });
}

export function formatTime(d: Date): string {
  return d
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: VENUE_TZ })
    .replace(":00", "");
}

export function formatTimeRange(from: Date, until: Date): string {
  return `${formatTime(from)} – ${formatTime(until)}`;
}

/** Headline price for a listing card: flat price when offered, else the hourly rate. */
export function priceLabel(l: { pricingMode: string; flatPrice: number | null; hourlyRate: number | null }) {
  if (l.pricingMode !== "HOURLY" && l.flatPrice != null) return { amount: formatCents(l.flatPrice), unit: "per event" };
  if (l.hourlyRate != null) return { amount: formatCents(l.hourlyRate), unit: "per hour" };
  return { amount: "—", unit: "" };
}

/** Short pin label for the map. */
export function pinLabel(l: { pricingMode: string; flatPrice: number | null; hourlyRate: number | null }) {
  const p = priceLabel(l);
  return p.unit === "per hour" ? `${p.amount}/hr` : p.amount;
}
