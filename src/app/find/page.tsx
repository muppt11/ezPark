import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EventList } from "@/components/EventList";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { eventsAtVenue, getEventWithVenue, listingsForEvent, upcomingEvents, type SortKey } from "@/lib/search";
import { FindView } from "./FindView";

export const metadata: Metadata = { title: "Find parking · ezPark" };

export default function FindPage({ searchParams }: PageProps<"/find">) {
  return (
    <Suspense fallback={<div className="h-[calc(100dvh-4rem)] animate-pulse bg-bg" />}>
      <Results searchParams={searchParams} />
    </Suspense>
  );
}

async function Results({ searchParams }: Pick<PageProps<"/find">, "searchParams">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const sort: SortKey = sp.sort === "price" ? "price" : "walk";
  const eventId = typeof sp.event === "string" ? sp.event : null;

  let event = eventId ? await getEventWithVenue(eventId) : null;
  if (!event) {
    const matches = await upcomingEvents({ q: q || undefined });
    const pick = matches.find((m) => m.driveways > 0) ?? matches[0];
    if (!pick) return <NoMatch q={q} />;
    event = await getEventWithVenue(pick.id);
    if (!event) return <NoMatch q={q} />;
  }

  // Walk filter: ?walk= wins; otherwise the signed-in driver's saved preference; "any" shows everything.
  const user = await getCurrentUser();
  const pref = user ? (await db.user.findUnique({ where: { id: user.id }, select: { maxWalkMinutes: true } }))?.maxWalkMinutes : undefined;
  const walk = sp.walk === "any" ? undefined : Number(sp.walk) || pref || undefined;

  const [{ listings, hiddenByWalk }, others] = await Promise.all([
    listingsForEvent(event.id, sort, walk),
    eventsAtVenue(event.venueId),
  ]);

  return (
    <FindView
      event={{ id: event.id, name: event.name, startsAt: event.startsAt.toISOString() }}
      venue={{ name: event.venue.name, lat: event.venue.lat, lng: event.venue.lng }}
      otherEvents={others.map((e) => ({ ...e, startsAt: e.startsAt.toISOString() }))}
      listings={listings}
      hiddenByWalk={hiddenByWalk}
      walk={walk ?? null}
      sort={sort}
    />
  );
}

async function NoMatch({ q }: { q: string }) {
  const all = await upcomingEvents();
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">
        {q ? `No upcoming events match “${q}”` : "No upcoming events yet"}
      </h1>
      <p className="mt-2 text-muted">We&apos;re starting with Austin. Pick an event below.</p>
      <div className="mt-6">
        <EventList events={all} />
      </div>
      <Link href="/" className="mt-6 inline-block font-semibold text-primary underline-offset-4 hover:underline">
        Back to home
      </Link>
    </div>
  );
}
