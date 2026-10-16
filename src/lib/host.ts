import "server-only";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { distanceMeters, type LatLng } from "@/lib/geo";
import { DEMO_EVENTS_HIDDEN, UPCOMING_DAYS } from "@/lib/search";

/** Beyond this, drivers rarely walk; the form warns the host. */
export const FAR_FROM_VENUE_M = 1609;

export type VenueOption = {
  id: string;
  name: string;
  distanceMeters: number;
  events: { id: string; name: string; startsAt: string }[];
};

/** Venues ranked by distance from the host's driveway, with their upcoming events. */
export async function venuesNear(point: LatLng): Promise<VenueOption[]> {
  await connection();
  const now = Date.now();
  const venues = await db.venue.findMany({
    include: {
      events: {
        where: { startsAt: { gte: new Date(now), lte: new Date(now + UPCOMING_DAYS * 86_400_000) }, ...DEMO_EVENTS_HIDDEN },
        orderBy: { startsAt: "asc" },
        select: { id: true, name: true, startsAt: true },
      },
    },
  });
  return venues
    .map((v) => ({
      id: v.id,
      name: v.name,
      distanceMeters: Math.round(distanceMeters(point, v)),
      events: v.events.map((e) => ({ ...e, startsAt: e.startsAt.toISOString() })),
    }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
}

export async function hostDashboard(hostId: string) {
  await connection();
  const now = new Date();
  const [listings, bookings] = await Promise.all([
    db.listing.findMany({
      where: { hostId },
      include: {
        event: { select: { name: true, startsAt: true } },
        venue: { select: { name: true } },
        _count: { select: { bookings: { where: { status: "CONFIRMED" } } } },
      },
      orderBy: [{ openFrom: "asc" }],
    }),
    db.booking.findMany({
      where: { listing: { hostId } },
      include: {
        listing: { select: { areaLabel: true, event: { select: { name: true } } } },
        driver: { select: { name: true, vehicleMake: true, vehicleModel: true, vehicleColor: true, licensePlate: true } },
      },
      orderBy: { startsAt: "asc" },
    }),
  ]);

  const confirmed = bookings.filter((b) => b.status === "CONFIRMED");
  return {
    listings,
    upcoming: confirmed.filter((b) => b.endsAt >= now),
    earnings: {
      paid: confirmed.filter((b) => b.endsAt < now).reduce((s, b) => s + b.hostPayout, 0),
      pending: confirmed.filter((b) => b.endsAt >= now).reduce((s, b) => s + b.hostPayout, 0),
    },
  };
}
