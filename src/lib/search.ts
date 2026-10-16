import "server-only";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { distanceMeters, type LatLng } from "@/lib/geo";
import type { Prisma } from "@/generated/prisma/client";

/** Events further out than this aren't shown to drivers yet. */
export const UPCOMING_DAYS = 60;
/** Default ranking origin when we don't know where the driver is. */
export const AUSTIN: LatLng = { lat: 30.2672, lng: -97.7431 };

/** Demo listings come from the dev seed and must never reach production users. */
const visibleListing: Prisma.ListingWhereInput = {
  status: "ACTIVE",
  ...(process.env.NODE_ENV === "production" ? { isDemo: false } : {}),
};

/** Reads the clock, so callers must be request-time: `await connection()` first. */
function upcomingWindow(now = new Date()) {
  // Keep events that started up to 3 hours ago: people still need parking mid-event.
  return { gte: new Date(now.getTime() - 3 * 3600_000), lte: new Date(now.getTime() + UPCOMING_DAYS * 86_400_000) };
}

export type UpcomingEvent = {
  id: string;
  name: string;
  type: string;
  startsAt: Date;
  venue: { id: string; name: string; lat: number; lng: number };
  driveways: number;
  distanceMeters: number;
};

/** Upcoming events, soonest first, then closest to `near`. Optional name filter matches event or venue. */
export async function upcomingEvents({ near = AUSTIN, q }: { near?: LatLng; q?: string } = {}): Promise<UpcomingEvent[]> {
  await connection();
  const text = q?.trim();
  const rows = await db.event.findMany({
    where: {
      startsAt: upcomingWindow(),
      ...(text ? { OR: [{ name: { contains: text } }, { venue: { name: { contains: text } } }] } : {}),
    },
    include: {
      venue: { select: { id: true, name: true, lat: true, lng: true } },
      _count: { select: { listings: { where: visibleListing } } },
    },
    orderBy: { startsAt: "asc" },
  });

  return rows
    .map((e) => ({
      id: e.id,
      name: e.name,
      type: e.type,
      startsAt: e.startsAt,
      venue: e.venue,
      driveways: e._count.listings,
      distanceMeters: Math.round(distanceMeters(near, e.venue)),
    }))
    .sort((a, b) => sameDay(a.startsAt, b.startsAt) ? a.distanceMeters - b.distanceMeters : a.startsAt.getTime() - b.startsAt.getTime());
}

function sameDay(a: Date, b: Date) {
  const f = (d: Date) => d.toLocaleDateString("en-US", { timeZone: "America/Chicago" });
  return f(a) === f(b);
}

export async function getEventWithVenue(id: string) {
  await connection();
  return db.event.findFirst({
    where: { id, startsAt: upcomingWindow() },
    include: { venue: { select: { id: true, name: true, address: true, lat: true, lng: true } } },
  });
}

/** Other upcoming events at the same venue, for the event switcher on the map page. */
export async function eventsAtVenue(venueId: string) {
  await connection();
  return db.event.findMany({
    where: { venueId, startsAt: upcomingWindow() },
    select: { id: true, name: true, startsAt: true },
    orderBy: { startsAt: "asc" },
  });
}

export type SortKey = "walk" | "price";

/** What a driver may see before paying: approximate location only, no address or instructions. */
export type PublicListing = {
  id: string;
  areaLabel: string;
  approxLat: number;
  approxLng: number;
  walkMinutes: number;
  walkMeters: number;
  carCount: number;
  pricingMode: "HOURLY" | "FLAT" | "BOTH";
  flatPrice: number | null;
  hourlyRate: number | null;
  openFrom: string;
  openUntil: string;
  photoUrl: string | null;
};

const publicSelect = {
  id: true,
  areaLabel: true,
  approxLat: true,
  approxLng: true,
  walkMinutes: true,
  walkMeters: true,
  carCount: true,
  pricingMode: true,
  flatPrice: true,
  hourlyRate: true,
  openFrom: true,
  openUntil: true,
  photoUrl: true,
} satisfies Prisma.ListingSelect;

function toPublic(l: Prisma.ListingGetPayload<{ select: typeof publicSelect }>): PublicListing {
  return { ...l, openFrom: l.openFrom.toISOString(), openUntil: l.openUntil.toISOString() };
}

/** Price used for sorting: flat price, or 3 hours at the hourly rate (a typical game). */
function comparablePrice(l: PublicListing) {
  return l.flatPrice ?? (l.hourlyRate ?? 0) * 3;
}

export async function listingsForEvent(eventId: string, sort: SortKey = "walk"): Promise<PublicListing[]> {
  const rows = await db.listing.findMany({ where: { eventId, ...visibleListing }, select: publicSelect });
  const list = rows.map(toPublic);
  return list.sort((a, b) =>
    sort === "price"
      ? comparablePrice(a) - comparablePrice(b) || a.walkMinutes - b.walkMinutes
      : a.walkMinutes - b.walkMinutes || comparablePrice(a) - comparablePrice(b),
  );
}

export async function getPublicListing(id: string) {
  const l = await db.listing.findFirst({
    where: { id, ...visibleListing },
    select: {
      ...publicSelect,
      event: { select: { id: true, name: true, startsAt: true } },
      venue: { select: { name: true, lat: true, lng: true } },
    },
  });
  if (!l) return null;
  const { event, venue, ...rest } = l;
  return { listing: toPublic(rest), event, venue };
}
