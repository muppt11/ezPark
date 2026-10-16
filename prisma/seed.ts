/**
 * Seeds Austin venues + upcoming events (fallback when no ticketing API key is set),
 * and, outside production, demo driveway listings so the map has something to show.
 * Safe to re-run: venues/events upsert by externalId, demo listings are replaced.
 *
 *   npm run db:seed
 */
import "dotenv/config";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient, type EventType, type PricingMode } from "../src/generated/prisma/client";
import { fuzzPoint, walkingRoute, type LatLng } from "../src/lib/geo";

const db = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./prisma/dev.db" }),
});
const TZ = "America/Chicago";

const VENUES = [
  {
    key: "dkr",
    name: "Darrell K Royal–Texas Memorial Stadium",
    aliases: "DKR, Royal-Memorial, UT stadium, Longhorns stadium",
    address: "2139 San Jacinto Blvd, Austin, TX 78712",
    lat: 30.2838412,
    lng: -97.7326229,
  },
  {
    key: "moody",
    name: "Moody Center",
    aliases: "Moody, UT arena",
    address: "2001 Robert Dedman Dr, Austin, TX 78712",
    lat: 30.2809367,
    lng: -97.7306522,
  },
  {
    key: "q2",
    name: "Q2 Stadium",
    aliases: "Q2, Austin FC stadium, McKalla",
    address: "10414 McKalla Pl, Austin, TX 78758",
    lat: 30.3853074,
    lng: -97.719227,
  },
] as const;
type VenueKey = (typeof VENUES)[number]["key"];

// Generic placeholder events, dated relative to today so they stay "upcoming".
// Replaced by real events once the ticketing sync is configured.
const EVENTS: { key: string; venue: VenueKey; name: string; type: EventType; week: number; weekday: number; hour: number; minute: number }[] = [
  { key: "dkr-football-1", venue: "dkr", name: "Texas Longhorns home football game", type: "SPORTS", week: 0, weekday: 6, hour: 14, minute: 30 },
  { key: "dkr-football-2", venue: "dkr", name: "Texas Longhorns home football game", type: "SPORTS", week: 2, weekday: 6, hour: 18, minute: 0 },
  { key: "dkr-football-3", venue: "dkr", name: "Texas Longhorns home football game", type: "SPORTS", week: 4, weekday: 6, hour: 11, minute: 0 },
  { key: "moody-concert-1", venue: "moody", name: "Concert at Moody Center", type: "CONCERT", week: 0, weekday: 5, hour: 20, minute: 0 },
  { key: "moody-hoops-1", venue: "moody", name: "Texas Longhorns basketball home game", type: "SPORTS", week: 3, weekday: 2, hour: 19, minute: 0 },
  { key: "q2-soccer-1", venue: "q2", name: "Austin FC home match", type: "SPORTS", week: 1, weekday: 6, hour: 19, minute: 30 },
];

/** Minutes Chicago is offset from UTC at a given instant (e.g. -300 in CDT). */
function tzOffsetMinutes(at: Date): number {
  const part = new Intl.DateTimeFormat("en-US", { timeZone: TZ, timeZoneName: "shortOffset" })
    .formatToParts(at)
    .find((p) => p.type === "timeZoneName")!.value; // "GMT-5"
  const m = part.match(/GMT([+-]\d+)(?::(\d+))?/);
  return m ? Number(m[1]) * 60 + Math.sign(Number(m[1])) * Number(m[2] ?? 0) : 0;
}

/** Date for a venue-local wall-clock time, `week` weeks out on the given weekday (0 = Sun). */
function localEventTime(week: number, weekday: number, hour: number, minute: number): Date {
  const now = new Date();
  const today = new Date(now.toLocaleString("en-US", { timeZone: TZ }));
  const daysAhead = ((weekday - today.getDay() + 7) % 7 || 7) + week * 7;
  const y = today.getFullYear(), mo = today.getMonth(), d = today.getDate() + daysAhead;
  const guess = new Date(Date.UTC(y, mo, d, hour, minute));
  return new Date(guess.getTime() - tzOffsetMinutes(guess) * 60_000);
}

/** Deterministic PRNG so demo data looks the same on every seed. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pointNear(c: LatLng, minM: number, maxM: number, rand: () => number): LatLng {
  const dist = minM + rand() * (maxM - minM);
  const bearing = rand() * 2 * Math.PI;
  return {
    lat: c.lat + (dist * Math.cos(bearing)) / 111_320,
    lng: c.lng + (dist * Math.sin(bearing)) / (111_320 * Math.cos((c.lat * Math.PI) / 180)),
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Nearest street name from OpenStreetMap (1 req/s policy), for public "Near X St" labels. */
async function streetName(p: LatLng): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&zoom=17&lat=${p.lat}&lon=${p.lng}`,
      { headers: { "User-Agent": "ezPark/0.1 (dev seed)" }, signal: AbortSignal.timeout(5000) },
    );
    const data = (await res.json()) as { address?: { road?: string } };
    return data.address?.road ?? null;
  } catch {
    return null;
  } finally {
    await sleep(1100);
  }
}

async function seedVenuesAndEvents() {
  const venueIds = {} as Record<VenueKey, string>;
  for (const v of VENUES) {
    const row = await db.venue.upsert({
      where: { source_externalId: { source: "seed", externalId: v.key } },
      update: { name: v.name, aliases: v.aliases, address: v.address, lat: v.lat, lng: v.lng },
      create: { source: "seed", externalId: v.key, name: v.name, aliases: v.aliases, address: v.address, city: "Austin, TX", lat: v.lat, lng: v.lng },
    });
    venueIds[v.key] = row.id;
  }

  const events: { id: string; venue: VenueKey; startsAt: Date; type: EventType }[] = [];
  for (const e of EVENTS) {
    const startsAt = localEventTime(e.week, e.weekday, e.hour, e.minute);
    const row = await db.event.upsert({
      where: { source_externalId: { source: "seed", externalId: e.key } },
      update: { name: e.name, type: e.type, startsAt, venueId: venueIds[e.venue] },
      create: { source: "seed", externalId: e.key, name: e.name, type: e.type, startsAt, venueId: venueIds[e.venue] },
    });
    events.push({ id: row.id, venue: e.venue, startsAt, type: e.type });
  }
  console.log(`✓ ${VENUES.length} venues, ${events.length} events`);
  return { venueIds, events };
}

async function seedDemoListings(venueIds: Record<VenueKey, string>, events: { id: string; venue: VenueKey; startsAt: Date; type: EventType }[]) {
  // Bookings reference listings, so clear demo bookings first.
  await db.booking.deleteMany({ where: { listing: { isDemo: true } } });
  await db.listing.deleteMany({ where: { isDemo: true } });

  // Demo hosts have random passwords nobody knows, so they can't be logged into.
  const hostNames = ["Maria Gonzalez", "James Porter", "Linda Kim", "Devon Ross"];
  const hosts = [];
  for (const [i, name] of hostNames.entries()) {
    const email = `demo-host-${i + 1}@ezpark.local`;
    hosts.push(
      await db.user.upsert({
        where: { email },
        update: { name, payoutsEnabled: true },
        create: {
          email,
          name,
          passwordHash: await bcrypt.hash(randomBytes(24).toString("hex"), 10),
          isHost: true,
          lastRole: "HOST",
          payoutsEnabled: true,
          payoutAccountRef: `test_acct_demo${i + 1}`,
          payoutLabel: `${name} · bank •••• 6789`,
          createdAt: new Date(Date.UTC(2025, 2 + i * 2, 10)),
        },
      }),
    );
  }
  // Earlier seeds used a single demo host; retire it.
  await db.user.deleteMany({ where: { email: "demo-host@ezpark.local", listings: { none: {} } } });

  const photos = ["/demo/driveway-gravel.jpg", "/demo/driveway-stone.jpg"];
  const instructions = [
    "Pull all the way up the left side of the driveway. Please don't block the garage.",
    "Park nose-in behind the silver SUV. Gate code is on the confirmation text from the host.",
    "Use the right half of the driveway. Street parking in front is not included.",
    "Back in so you can leave quickly after the game. Text the host when you arrive.",
  ];

  const rand = mulberry32(2026);
  // Campus-area spots serve both DKR and Moody Center; a smaller cluster serves Q2.
  const clusters: { center: VenueKey; venues: VenueKey[]; count: number }[] = [
    { center: "dkr", venues: ["dkr", "moody"], count: 12 },
    { center: "q2", venues: ["q2"], count: 6 },
  ];

  let created = 0;
  for (const cluster of clusters) {
    const c = VENUES.find((v) => v.key === cluster.center)!;
    for (let i = 0; i < cluster.count; i++) {
      const spot = pointNear(c, 350, 1400, rand);
      const approx = fuzzPoint(spot, rand);
      const road = await streetName(spot);
      const host = hosts[i % hosts.length];
      const photoUrl = photos[i % photos.length];
      const note = instructions[i % instructions.length];
      const address = `${100 + Math.floor(rand() * 3800)} ${road ?? "Demo St"}, Austin, TX (demo address)`;
      const carCount = 1 + Math.floor(rand() * 3);
      const mode: PricingMode = (["FLAT", "FLAT", "HOURLY", "BOTH"] as const)[Math.floor(rand() * 4)];
      const flat = 1500 + Math.round(rand() * 5) * 500; // $15–$40
      const hourly = 400 + Math.round(rand() * 4) * 100; // $4–$8/hr

      for (const vKey of cluster.venues) {
        const venue = VENUES.find((v) => v.key === vKey)!;
        const walk = await walkingRoute(spot, venue);
        await sleep(150);
        for (const ev of events.filter((e) => e.venue === vKey)) {
          await db.listing.create({
            data: {
              isDemo: true,
              status: "ACTIVE",
              hostId: host.id,
              photoUrl,
              venueId: venueIds[vKey],
              eventId: ev.id,
              carCount,
              pricingMode: mode,
              flatPrice: mode === "HOURLY" ? null : flat,
              hourlyRate: mode === "FLAT" ? null : hourly,
              openFrom: new Date(ev.startsAt.getTime() - 4 * 3600_000),
              openUntil: new Date(ev.startsAt.getTime() + 4 * 3600_000),
              address,
              instructions: note,
              lat: spot.lat,
              lng: spot.lng,
              approxLat: approx.lat,
              approxLng: approx.lng,
              areaLabel: road ? `Near ${road}` : `Near ${venue.name}`,
              walkMeters: walk.meters,
              walkMinutes: walk.minutes,
              walkSource: walk.source,
            },
          });
          created++;
        }
      }
      process.stdout.write(".");
    }
  }
  console.log(`\n✓ ${created} demo listings (dev only)`);
}

async function main() {
  const { venueIds, events } = await seedVenuesAndEvents();
  if (process.env.NODE_ENV === "production") {
    console.log("Production: skipping demo listings.");
    return;
  }
  await seedDemoListings(venueIds, events);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
