import "server-only";
import { connection } from "next/server";
import { db } from "@/lib/db";

export async function driverBookings(driverId: string) {
  await connection();
  return db.booking.findMany({
    where: { driverId },
    include: {
      listing: {
        select: {
          areaLabel: true,
          photoUrl: true,
          address: true,
          event: { select: { name: true, startsAt: true } },
          venue: { select: { name: true } },
        },
      },
    },
    orderBy: { startsAt: "asc" },
  });
}

/**
 * A driver's own booking. The exact address, coordinates and instructions are only
 * included while the booking is paid and active: this is the post-payment reveal.
 */
export async function driverBooking(bookingId: string, driverId: string) {
  await connection();
  const b = await db.booking.findFirst({
    where: { id: bookingId, driverId },
    include: {
      listing: {
        select: {
          id: true,
          areaLabel: true,
          photoUrl: true,
          walkMinutes: true,
          approxLat: true,
          approxLng: true,
          address: true,
          instructions: true,
          lat: true,
          lng: true,
          event: { select: { id: true, name: true, startsAt: true } },
          venue: { select: { name: true, lat: true, lng: true } },
          host: { select: { name: true } },
        },
      },
      incidents: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!b) return null;

  const { address, instructions, lat, lng, photoUrl, host, ...listing } = b.listing;
  const revealed = b.status === "CONFIRMED";
  return {
    ...b,
    listing,
    hostFirstName: host.name.split(" ")[0],
    exact: revealed ? { address, instructions, lat, lng, photoUrl } : null,
  };
}
