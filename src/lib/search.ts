import "server-only";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { distanceMeters, type LatLng } from "@/lib/geo";
import type { Prisma } from "@/generated/prisma/client";
import { estimatedTotal } from "@/lib/pricing";

/** Events further out than this aren't shown to drivers yet. */
export const UPCOMING_DAYS = 60;
/** Default ranking origin when we don't know where the driver is. */
export const AUSTIN: LatLng = { lat: 30.2672, lng: -97.7431 };

/** Demo events (real artists, made-up dates) come from the dev seed and must never reach production users. */
export const DEMO_EVENTS_HIDDEN = process.env.NODE_ENV === "production" ? { isDemo: false } : {};

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
      ...DEMO_EVENTS_HIDDEN,
      // Every word must match the event or venue name, in any order ("longhorns football", "moody concert").
      ...(text
        ? {
            AND: text
              .split(/\s+/)
              .filter(Boolean)
              .map((w) => ({
                OR: [{ name: { contains: w } }, { venue: { name: { contains: w } } }, { venue: { aliases: { contains: w } } }],
              })),
          }
        : {}),
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
    where: { id, startsAt: upcomingWindow(), ...DEMO_EVENTS_HIDDEN },
    include: { venue: { select: { id: true, name: true, address: true, lat: true, lng: true } } },
  });
}

/** Other upcoming events at the same venue, for the event switcher on the map page. */
export async function eventsAtVenue(venueId: string) {
  await connection();
  return db.event.findMany({
    where: { venueId, startsAt: upcomingWindow(), ...DEMO_EVENTS_HIDDEN },
    select: { id: true, name: true, startsAt: true },
    orderBy: { startsAt: "asc" },
  });
}

export type SortKey = "walk" | "price";

/** What a driver may see before paying: approximate location only, no address, instructions or photo. */
export type PublicListing = {
  id: string;
  areaLabel: string;
  approxLat: number;
  approxLng: number;
  walkMinutes: number;
  walkMeters: number;
  carCount: number;
  spotsLeft: number;
  pricingMode: "HOURLY" | "FLAT" | "BOTH";
  flatPrice: number | null;
  hourlyRate: number | null;
  openFrom: string;
  openUntil: string;
  /** The photo itself is only shown after payment (it would reveal the house); search just knows one exists. */
  hasPhoto: boolean;
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
  _count: { select: { bookings: { where: { status: "CONFIRMED" } } } },
} satisfies Prisma.ListingSelect;

function toPublic(l: Prisma.ListingGetPayload<{ select: typeof publicSelect }>): PublicListing {
  const { _count, photoUrl, ...rest } = l;
  return {
    ...rest,
    hasPhoto: photoUrl != null,
    spotsLeft: Math.max(0, l.carCount - _count.bookings),
    openFrom: l.openFrom.toISOString(),
    openUntil: l.openUntil.toISOString(),
  };
}

export type EventListings = { listings: PublicListing[]; hiddenByWalk: number };

/** Driveways with room left for an event. `maxWalk` (minutes) hides longer walks but reports how many. */
export async function listingsForEvent(eventId: string, sort: SortKey = "walk", maxWalk?: number): Promise<EventListings> {
  const rows = await db.listing.findMany({ where: { eventId, ...visibleListing }, select: publicSelect });
  const open = rows.map(toPublic).filter((l) => l.spotsLeft > 0);
  const listings = maxWalk ? open.filter((l) => l.walkMinutes <= maxWalk) : open;
  listings.sort((a, b) =>
    sort === "price"
      ? estimatedTotal(a) - estimatedTotal(b) || a.walkMinutes - b.walkMinutes
      : a.walkMinutes - b.walkMinutes || estimatedTotal(a) - estimatedTotal(b),
  );
  return { listings, hiddenByWalk: open.length - listings.length };
}

export type HostSummary = { firstName: string; since: Date; completedBookings: number };

export async function getPublicListing(id: string) {
  await connection(); // completed-booking count below depends on the current time
  const l = await db.listing.findFirst({
    where: { id, ...visibleListing },
    select: {
      ...publicSelect,
      event: { select: { id: true, name: true, startsAt: true } },
      venue: { select: { name: true, lat: true, lng: true } },
      host: { select: { id: true, name: true, createdAt: true } },
    },
  });
  if (!l) return null;
  const { event, venue, host, ...rest } = l;
  const completedBookings = await db.booking.count({
    where: { status: "CONFIRMED", endsAt: { lt: new Date() }, listing: { hostId: host.id } },
  });
  const summary: HostSummary = { firstName: host.name.split(" ")[0], since: host.createdAt, completedBookings };
  return { listing: toPublic(rest), event, venue, host: summary };
}
