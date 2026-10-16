"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { cancelByHost } from "@/lib/bookings";
import { getCurrentUser } from "@/lib/current-user";
import { fuzzPoint, walkingRoute } from "@/lib/geo";
import { geocodeAddress } from "@/lib/geocode";
import { venuesNear, type VenueOption } from "@/lib/host";
import { DEMO_EVENTS_HIDDEN } from "@/lib/search";
import { createPayoutAccount } from "@/lib/payments";
import { savePhoto } from "@/lib/uploads";

async function requireHostUser(next: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (!user.isHost) await db.user.update({ where: { id: user.id }, data: { isHost: true, lastRole: "HOST" } });
  return user;
}

export async function enableHosting() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/host");
  await db.user.update({ where: { id: user.id }, data: { isHost: true, lastRole: "HOST" } });
  revalidatePath("/host");
}

export type LookupResult =
  | { ok: true; place: { lat: number; lng: number; label: string }; venues: VenueOption[] }
  | { ok: false; error: string };

/** Step 1 of the listing form: find the driveway and rank venues by distance. */
export async function lookupAddress(address: string): Promise<LookupResult> {
  await requireHostUser("/host/new");
  if (address.trim().length < 5) return { ok: false, error: "Enter your street address." };
  const place = await geocodeAddress(address);
  if (!place) return { ok: false, error: "We couldn't find that address in the Austin area. Check the street and number." };
  return { ok: true, place: { lat: place.lat, lng: place.lng, label: place.label }, venues: await venuesNear(place) };
}

export type ListingFormState = { error?: string; fieldErrors?: Record<string, string> };

const dollars = (min: number, max: number, label: string) =>
  z.coerce.number({ error: `Enter a ${label}.` }).min(min, `${label} must be at least $${min}.`).max(max, `${label} can't be over $${max}.`);

const listingSchema = z.object({
  address: z.string().trim().min(5, "Enter your street address.").max(200),
  eventIds: z.array(z.string()).max(30, "Pick up to 30 events at a time."),
  /** Only used when no events are picked: the venue to save a draft for. */
  draftVenueId: z.string().optional(),
  carCount: z.coerce.number().int().min(1).max(6),
  pricingMode: z.enum(["FLAT", "HOURLY", "BOTH"]),
  opensHoursBefore: z.coerce.number().int().min(1).max(8),
  closesHoursAfter: z.coerce.number().int().min(1).max(8),
  instructions: z.string().trim().max(500).optional(),
});

export async function createListing(_prev: ListingFormState, formData: FormData): Promise<ListingFormState> {
  const user = await requireHostUser("/host/new");
  const parsed = listingSchema.safeParse({
    address: formData.get("address") ?? "",
    eventIds: [...new Set(formData.getAll("eventIds").map(String))],
    draftVenueId: formData.get("draftVenueId") ? String(formData.get("draftVenueId")) : undefined,
    carCount: formData.get("carCount") ?? 1,
    pricingMode: formData.get("pricingMode") ?? "FLAT",
    opensHoursBefore: formData.get("opensHoursBefore") ?? 3,
    closesHoursAfter: formData.get("closesHoursAfter") ?? 3,
    instructions: formData.get("instructions") ?? "",
  });
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error.issues) };
  const d = parsed.data;

  // Prices depend on the pricing mode.
  const fieldErrors: Record<string, string> = {};
  let flatPrice: number | null = null;
  let hourlyRate: number | null = null;
  if (d.pricingMode !== "HOURLY") {
    const r = dollars(5, 200, "flat price").safeParse(formData.get("flatPrice") || undefined);
    if (r.success) flatPrice = Math.round(r.data * 100);
    else fieldErrors.flatPrice = r.error.issues[0].message;
  }
  if (d.pricingMode !== "FLAT") {
    const r = dollars(1, 50, "hourly rate").safeParse(formData.get("hourlyRate") || undefined);
    if (r.success) hourlyRate = Math.round(r.data * 100);
    else fieldErrors.hourlyRate = r.error.issues[0].message;
  }

  // Photo is optional; when given it's shown to drivers after they book.
  const photo = formData.get("photo");
  const hasPhoto = photo instanceof File && photo.size > 0;
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  // Re-geocode on the server rather than trusting coordinates from the browser.
  const place = await geocodeAddress(d.address);
  if (!place) return { fieldErrors: { address: "We couldn't find that address in the Austin area." } };

  // Picked events can be at different venues (e.g. a football game and an arena concert).
  const events = d.eventIds.length
    ? await db.event.findMany({
        where: { id: { in: d.eventIds }, startsAt: { gte: new Date() }, ...DEMO_EVENTS_HIDDEN },
        include: { venue: true },
      })
    : [];
  if (d.eventIds.length && events.length === 0) return { error: "Those events are no longer available. Pick again." };
  const draftVenue =
    events.length === 0 && d.draftVenueId ? await db.venue.findUnique({ where: { id: d.draftVenueId } }) : null;
  if (events.length === 0 && !draftVenue) return { fieldErrors: { eventIds: "Pick at least one event, or a venue for your draft." } };

  let photoUrl: string | null = null;
  if (hasPhoto) {
    const saved = await savePhoto(photo);
    if ("error" in saved) return { fieldErrors: { photo: saved.error } };
    photoUrl = saved.url;
  }

  // One fuzzed point for the driveway, shared by all its listings: separate random points
  // per listing could be averaged to find the house.
  const approx = fuzzPoint(place);
  const venues = new Map<string, { name: string; lat: number; lng: number }>();
  for (const e of events) venues.set(e.venueId, e.venue);
  if (draftVenue) venues.set(draftVenue.id, draftVenue);
  const walks = new Map<string, Awaited<ReturnType<typeof walkingRoute>>>();
  for (const [id, v] of venues) walks.set(id, await walkingRoute(place, v));

  // Listings go live only once payouts are set up (introduced at the first listing).
  const live = (await db.user.findUnique({ where: { id: user.id }, select: { payoutsEnabled: true } }))?.payoutsEnabled ?? false;

  const common = (venueId: string) => {
    const walk = walks.get(venueId)!;
    return {
      hostId: user.id,
      venueId,
      photoUrl,
      carCount: d.carCount,
      pricingMode: d.pricingMode,
      flatPrice,
      hourlyRate,
      opensHoursBefore: d.opensHoursBefore,
      closesHoursAfter: d.closesHoursAfter,
      address: place.label,
      instructions: d.instructions || null,
      lat: place.lat,
      lng: place.lng,
      approxLat: approx.lat,
      approxLng: approx.lng,
      areaLabel: place.road ? `Near ${place.road}` : `Near ${venues.get(venueId)!.name}`,
      walkMeters: walk.meters,
      walkMinutes: walk.minutes,
      walkSource: walk.source,
    };
  };

  if (events.length === 0) {
    // No events announced or picked: save a draft for the chosen venue.
    const now = new Date();
    await db.listing.create({ data: { ...common(draftVenue!.id), status: "DRAFT", openFrom: now, openUntil: now } });
  } else {
    await db.listing.createMany({
      data: events.map((e) => ({
        ...common(e.venueId),
        eventId: e.id,
        status: live ? ("ACTIVE" as const) : ("DRAFT" as const),
        openFrom: new Date(e.startsAt.getTime() - d.opensHoursBefore * 3600_000),
        openUntil: new Date(e.startsAt.getTime() + d.closesHoursAfter * 3600_000),
      })),
    });
  }

  revalidatePath("/host");
  if (events.length > 0 && !live) redirect("/host/payouts?from=listing");
  redirect(`/host?${events.length ? `published=${events.length}` : "draft=1"}`);
}

export type PayoutState = { fieldErrors?: Record<string, string>; values?: Record<string, string> };

const payoutSchema = z.object({
  holderName: z.string().trim().min(2, "Enter the account holder's name.").max(80),
  routing: z.string().regex(/^\d{9}$/, "Routing numbers are 9 digits."),
  account: z.string().regex(/^\d{4,17}$/, "Enter your account number (digits only)."),
});

/** Test-mode payout onboarding. Publishes any drafts that are waiting on it. */
export async function setupPayouts(_prev: PayoutState, formData: FormData): Promise<PayoutState> {
  const user = await requireHostUser("/host/payouts");
  const input = {
    holderName: String(formData.get("holderName") ?? ""),
    routing: String(formData.get("routing") ?? "").replace(/\D/g, ""),
    account: String(formData.get("account") ?? "").replace(/\D/g, ""),
  };
  const parsed = payoutSchema.safeParse(input);
  // Echo the input back so a validation error doesn't wipe what the host typed.
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error.issues), values: input };

  const acct = createPayoutAccount(parsed.data.holderName, parsed.data.account.slice(-4));
  await db.user.update({
    where: { id: user.id },
    data: { payoutsEnabled: true, payoutAccountRef: acct.ref, payoutLabel: acct.label },
  });
  const published = await db.listing.updateMany({
    where: { hostId: user.id, status: "DRAFT", eventId: { not: null }, openUntil: { gt: new Date() } },
    data: { status: "ACTIVE" },
  });
  revalidatePath("/host");
  redirect(published.count ? `/host?published=${published.count}` : "/host?payouts=1");
}

export async function hostCancelBooking(bookingId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/host");
  await cancelByHost(bookingId, user.id);
  revalidatePath("/host");
}

function firstErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const i of issues) out[String(i.path[0] ?? "form")] ??= i.message;
  return out;
}
