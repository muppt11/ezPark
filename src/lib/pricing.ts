/** Booking price math, shared by the checkout UI and the server. All amounts in cents. */

export const PLATFORM_FEE_RATE = 0.1;
/** Hourly bookings use 30-minute steps and must be at least 1 hour. */
export const STEP_MIN = 30;
export const MIN_HOURLY_MIN = 60;
/** Typical stay used to compare hourly and flat prices in search. */
export const TYPICAL_HOURS = 3;

export type PriceInfo = {
  pricingMode: "HOURLY" | "FLAT" | "BOTH";
  flatPrice: number | null;
  hourlyRate: number | null;
  openFrom: Date;
  openUntil: Date;
};

export function splitFee(total: number) {
  const platformFee = Math.round(total * PLATFORM_FEE_RATE);
  return { platformFee, hostPayout: total - platformFee };
}

export function offersFlat(l: Pick<PriceInfo, "pricingMode" | "flatPrice">) {
  return l.pricingMode !== "HOURLY" && l.flatPrice != null;
}

export function offersHourly(l: Pick<PriceInfo, "pricingMode" | "hourlyRate">) {
  return l.pricingMode !== "FLAT" && l.hourlyRate != null;
}

export type Quote =
  | { ok: true; option: "FLAT" | "HOURLY"; startsAt: Date; endsAt: Date; minutes: number; total: number }
  | { ok: false; error: string };

export function quote(l: PriceInfo, option: "FLAT" | "HOURLY", start?: Date, end?: Date): Quote {
  if (option === "FLAT") {
    if (!offersFlat(l)) return { ok: false, error: "This driveway isn't offered at a flat price." };
    const minutes = (l.openUntil.getTime() - l.openFrom.getTime()) / 60_000;
    return { ok: true, option, startsAt: l.openFrom, endsAt: l.openUntil, minutes, total: l.flatPrice! };
  }

  if (!offersHourly(l)) return { ok: false, error: "This driveway isn't offered by the hour." };
  if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) return { ok: false, error: "Pick your arrival and leave times." };
  if (start < l.openFrom || end > l.openUntil) return { ok: false, error: "Pick times inside the driveway's open hours." };
  const minutes = (end.getTime() - start.getTime()) / 60_000;
  if (minutes < MIN_HOURLY_MIN) return { ok: false, error: "Book at least 1 hour." };
  if (minutes % STEP_MIN !== 0) return { ok: false, error: "Times must be in 30-minute steps." };
  return { ok: true, option, startsAt: start, endsAt: end, minutes, total: Math.round((l.hourlyRate! * minutes) / 60) };
}

/** Comparable price for search sorting and the "≈ total" label: flat price, or a typical stay at the hourly rate. */
export function estimatedTotal(l: Pick<PriceInfo, "pricingMode" | "flatPrice" | "hourlyRate">) {
  if (offersFlat(l)) return l.flatPrice!;
  return (l.hourlyRate ?? 0) * TYPICAL_HOURS;
}

/** 30-minute slots from open to close, for the hourly time pickers. */
export function timeSlots(from: Date, until: Date): Date[] {
  const out: Date[] = [];
  for (let t = from.getTime(); t <= until.getTime(); t += STEP_MIN * 60_000) out.push(new Date(t));
  return out;
}
