/**
 * Daily sync of upcoming Austin-area events from the Ticketmaster Discovery API into our
 * Venue/Event tables (source="ticketmaster", externalId = Ticketmaster id). Never called on page load.
 *
 * Limits (developer.ticketmaster.com, checked Oct 2026): 5,000 calls/day, 5 requests/second.
 * One sync uses ~1–5 calls. TERMS RISK: the Ticketmaster API terms restrict deriving revenue
 * from the API and only allow storing event content for "reasonable periods". Get legal sign-off
 * (or a partner agreement) before enabling this in production. See README.
 */
import type { PrismaClient } from "@/generated/prisma/client";

const BASE = "https://app.ticketmaster.com/discovery/v2/events.json";
const DAYS_AHEAD = 60;
const PAGE_SIZE = 100;
const MAX_PAGES = 5;

type TmVenue = {
  id: string;
  name: string;
  address?: { line1?: string };
  city?: { name?: string };
  state?: { stateCode?: string };
  location?: { latitude?: string; longitude?: string };
};
type TmEvent = {
  id: string;
  name: string;
  dates?: { start?: { dateTime?: string } };
  classifications?: { segment?: { name?: string } }[];
  _embedded?: { venues?: TmVenue[] };
};
type TmPage = { _embedded?: { events?: TmEvent[] }; page?: { totalPages?: number } };

export type SyncResult = { skipped?: string; venues: number; events: number };

export async function syncTicketmaster(
  db: PrismaClient,
  { apiKey = process.env.TICKETMASTER_API_KEY, center = { lat: 30.2672, lng: -97.7431 }, radiusMiles = 25 } = {},
): Promise<SyncResult> {
  if (!apiKey) return { skipped: "TICKETMASTER_API_KEY not set; using seeded events.", venues: 0, events: 0 };

  const start = new Date();
  const end = new Date(start.getTime() + DAYS_AHEAD * 86_400_000);
  const iso = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, "Z");
  const venueIds = new Map<string, string>();
  let events = 0;

  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL(BASE);
    url.search = new URLSearchParams({
      apikey: apiKey,
      latlong: `${center.lat},${center.lng}`,
      radius: String(radiusMiles),
      unit: "miles",
      startDateTime: iso(start),
      endDateTime: iso(end),
      size: String(PAGE_SIZE),
      page: String(page),
      sort: "date,asc",
    }).toString();

    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (res.status === 429) throw new Error("Ticketmaster rate limit reached (429). Try again later.");
    if (!res.ok) throw new Error(`Ticketmaster API error ${res.status}`);
    const data = (await res.json()) as TmPage;

    for (const e of data._embedded?.events ?? []) {
      const v = e._embedded?.venues?.[0];
      const startsAt = e.dates?.start?.dateTime ? new Date(e.dates.start.dateTime) : null;
      const lat = Number(v?.location?.latitude);
      const lng = Number(v?.location?.longitude);
      if (!v || !startsAt || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      let venueId = venueIds.get(v.id);
      if (!venueId) {
        const address = [v.address?.line1, v.city?.name, v.state?.stateCode].filter(Boolean).join(", ");
        const row = await db.venue.upsert({
          where: { source_externalId: { source: "ticketmaster", externalId: v.id } },
          update: { name: v.name, address, lat, lng },
          create: { source: "ticketmaster", externalId: v.id, name: v.name, address, city: v.city?.name ?? "Austin, TX", lat, lng },
        });
        venueId = row.id;
        venueIds.set(v.id, venueId);
      }

      const segment = e.classifications?.[0]?.segment?.name;
      const type = segment === "Music" ? "CONCERT" : segment === "Sports" ? "SPORTS" : "OTHER";
      await db.event.upsert({
        where: { source_externalId: { source: "ticketmaster", externalId: e.id } },
        update: { name: e.name, startsAt, type, venueId },
        create: { source: "ticketmaster", externalId: e.id, name: e.name, startsAt, type, venueId },
      });
      events++;
    }

    if (page + 1 >= (data.page?.totalPages ?? 0)) break;
    await new Promise((r) => setTimeout(r, 250)); // stay well under 5 req/s
  }

  return { venues: venueIds.size, events };
}
