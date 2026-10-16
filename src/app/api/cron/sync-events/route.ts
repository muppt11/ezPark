import { db } from "@/lib/db";
import { syncTicketmaster } from "@/lib/sync/ticketmaster";

/**
 * Daily event sync for hosted deployments (e.g. Vercel Cron, see vercel.json).
 * Requires `Authorization: Bearer $CRON_SECRET` so it can't be triggered publicly.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return Response.json(await syncTicketmaster(db));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
