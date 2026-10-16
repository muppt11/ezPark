/**
 * Pull upcoming events into the database. Run daily (cron) or by hand:
 *   npm run sync:events
 * Without TICKETMASTER_API_KEY it does nothing and the seeded Austin events stay in place.
 */
import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { syncTicketmaster } from "../src/lib/sync/ticketmaster";

const db = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./prisma/dev.db" }),
});

syncTicketmaster(db)
  .then((r) => console.log(r.skipped ?? `✓ Synced ${r.events} events at ${r.venues} venues`))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
