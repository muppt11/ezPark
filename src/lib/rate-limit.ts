import "server-only";
import { headers } from "next/headers";

/**
 * Fixed-window limiter kept in memory. Fine for one server process (the MVP);
 * with several instances, move it to Redis/Upstash — see the README checklist.
 */
const hits = new Map<string, { count: number; resetAt: number }>();

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

/**
 * Returns true if the action is allowed; false once `limit` is reached within `windowMs`.
 * Off in local development (repeated test runs from one machine would trip it);
 * set RATE_LIMIT=on to try it locally.
 */
export function allow(key: string, limit: number, windowMs: number): boolean {
  if (process.env.NODE_ENV === "development" && process.env.RATE_LIMIT !== "on") return true;
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    if (hits.size > 10_000) for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
    return true;
  }
  entry.count++;
  return entry.count <= limit;
}
