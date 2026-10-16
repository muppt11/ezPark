import "server-only";
import { db } from "@/lib/db";
import { chargeCard, PAYMENT_MODE, refund, type CardInput } from "@/lib/payments";
import { quote, splitFee } from "@/lib/pricing";
import type { IncidentType, Prisma } from "@/generated/prisma/client";

/** Drivers get a full refund if they cancel at least this long before the start. */
export const FREE_CANCEL_HOURS = 24;
/** Host cancellations within this window that suspend their listings. */
export const STRIKE_LIMIT = 3;
export const STRIKE_WINDOW_DAYS = 90;

const liveListing: Prisma.ListingWhereInput = {
  status: "ACTIVE",
  ...(process.env.NODE_ENV === "production" ? { isDemo: false } : {}),
};

type Tx = Prisma.TransactionClient;

/** Confirmed bookings on this listing that overlap [start, end). */
function overlapping(tx: Tx, listingId: string, start: Date, end: Date) {
  return tx.booking.count({
    where: { listingId, status: "CONFIRMED", startsAt: { lt: end }, endsAt: { gt: start } },
  });
}

export type BookingInput = {
  listingId: string;
  driverId: string;
  option: "FLAT" | "HOURLY";
  start?: Date;
  end?: Date;
  card: CardInput;
};

export async function createBooking(input: BookingInput): Promise<{ ok: true; bookingId: string } | { ok: false; error: string }> {
  // One transaction: SQLite serializes writers, so two drivers can't both take the last space.
  return db.$transaction(async (tx) => {
    const listing = await tx.listing.findFirst({ where: { id: input.listingId, ...liveListing } });
    if (!listing) return { ok: false as const, error: "This driveway is no longer available." };
    if (listing.hostId === input.driverId) return { ok: false as const, error: "You can't book your own driveway." };
    if (listing.openUntil < new Date()) return { ok: false as const, error: "This event's parking window has ended." };

    const q = quote(listing, input.option, input.start, input.end);
    if (!q.ok) return q;

    const taken = await overlapping(tx, listing.id, q.startsAt, q.endsAt);
    if (taken >= listing.carCount) {
      return { ok: false as const, error: "Sorry, this driveway just filled up for those times. Pick another driveway or time." };
    }

    const charge = chargeCard(input.card, q.total);
    if (!charge.ok) return charge;

    const booking = await tx.booking.create({
      data: {
        listingId: listing.id,
        driverId: input.driverId,
        pricingOption: q.option,
        startsAt: q.startsAt,
        endsAt: q.endsAt,
        total: q.total,
        ...splitFee(q.total),
        paymentMode: PAYMENT_MODE,
        paymentRef: charge.ref,
        cardLabel: charge.label,
      },
    });
    return { ok: true as const, bookingId: booking.id };
  });
}

/** How many more cars fit for the listing's whole window (used for search + detail page). */
export async function spotsLeft(listingIds: string[]): Promise<Map<string, number>> {
  const rows = await db.listing.findMany({
    where: { id: { in: listingIds } },
    select: { id: true, carCount: true, _count: { select: { bookings: { where: { status: "CONFIRMED" } } } } },
  });
  return new Map(rows.map((r) => [r.id, Math.max(0, r.carCount - r._count.bookings)]));
}

export async function cancelByDriver(bookingId: string, driverId: string) {
  const b = await db.booking.findFirst({ where: { id: bookingId, driverId, status: "CONFIRMED" } });
  if (!b) return { ok: false as const, error: "Booking not found." };
  const freeUntil = new Date(b.startsAt.getTime() - FREE_CANCEL_HOURS * 3600_000);
  const amount = new Date() <= freeUntil ? b.total : 0;
  if (amount > 0) refund(b.paymentRef, amount);
  await db.booking.update({ where: { id: b.id }, data: { status: "CANCELED", refundAmount: amount, canceledAt: new Date() } });
  return { ok: true as const, refunded: amount };
}

/**
 * Driver reports a problem. A blocked/unavailable spot is refunded in full immediately
 * (driver protection); other reports are logged for an admin to review.
 */
export async function reportProblem(bookingId: string, driverId: string, type: IncidentType, notes: string | null) {
  const b = await db.booking.findFirst({ where: { id: bookingId, driverId } });
  if (!b) return { ok: false as const, error: "Booking not found." };
  if (new Date() > b.endsAt) return { ok: false as const, error: "This booking has ended." };

  await db.incident.create({ data: { bookingId, reporterId: driverId, type, notes } });
  if (type === "SPOT_BLOCKED" && b.status === "CONFIRMED") {
    refund(b.paymentRef, b.total);
    await db.booking.update({ where: { id: b.id }, data: { status: "REFUNDED", refundAmount: b.total, canceledAt: new Date() } });
    return { ok: true as const, refunded: b.total };
  }
  return { ok: true as const, refunded: 0 };
}

/** Host cancels a confirmed booking: full refund to the driver, a strike for the host. */
export async function cancelByHost(bookingId: string, hostId: string) {
  const b = await db.booking.findFirst({
    where: { id: bookingId, status: "CONFIRMED", listing: { hostId } },
  });
  if (!b) return { ok: false as const, error: "Booking not found." };

  refund(b.paymentRef, b.total);
  await db.$transaction([
    db.booking.update({ where: { id: b.id }, data: { status: "REFUNDED", refundAmount: b.total, canceledAt: new Date() } }),
    db.incident.create({ data: { bookingId: b.id, reporterId: hostId, type: "HOST_CANCELED" } }),
  ]);

  const strikes = await hostStrikes(hostId);
  if (strikes >= STRIKE_LIMIT) {
    await db.listing.updateMany({ where: { hostId, status: "ACTIVE" }, data: { status: "PAUSED" } });
  }
  return { ok: true as const, strikes, suspended: strikes >= STRIKE_LIMIT };
}

export async function hostStrikes(hostId: string) {
  return db.incident.count({
    where: {
      type: "HOST_CANCELED",
      reporterId: hostId,
      createdAt: { gte: new Date(Date.now() - STRIKE_WINDOW_DAYS * 86_400_000) },
    },
  });
}

/** Comparable driveways for the same event, closest walk then price, for one-click rebooking. */
export async function rebookOptions(bookingId: string, limit = 3) {
  const b = await db.booking.findUnique({ where: { id: bookingId }, include: { listing: true } });
  if (!b?.listing.eventId) return [];
  const candidates = await db.listing.findMany({
    where: { eventId: b.listing.eventId, id: { not: b.listingId }, hostId: { not: b.listing.hostId }, ...liveListing },
    select: { id: true, areaLabel: true, walkMinutes: true, flatPrice: true, hourlyRate: true, pricingMode: true, carCount: true },
  });
  const left = await spotsLeft(candidates.map((c) => c.id));
  return candidates
    .filter((c) => (left.get(c.id) ?? 0) > 0)
    .sort((a, z) => a.walkMinutes - z.walkMinutes || (a.flatPrice ?? a.hourlyRate! * 3) - (z.flatPrice ?? z.hourlyRate! * 3))
    .slice(0, limit);
}
