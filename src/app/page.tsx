import { Suspense } from "react";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { EventList } from "@/components/EventList";
import { SiteFooter } from "@/components/SiteFooter";
import { AUSTIN, upcomingEvents } from "@/lib/search";
import type { LatLng } from "@/lib/geo";
import { HomeSearch } from "./HomeSearch";
import { ListingPreview } from "./ListingPreview";
import { NEAR_COOKIE } from "@/lib/near";
import { UseMyLocation } from "./UseMyLocation";

export default function Home() {
  return (
    <>
      <section className="mx-auto grid max-w-[96rem] items-center gap-10 px-4 pt-8 pb-10 md:grid-cols-[1fr_minmax(0,30rem)] md:gap-12 md:pt-10 md:pb-12 lg:px-8 xl:grid-cols-[1fr_minmax(0,36rem)]">
        <div className="max-w-xl">
          <p className="text-sm font-medium text-muted">Austin, TX</p>
          <h1 className="mt-2 text-[34px] leading-[1.1] font-bold tracking-tight sm:text-5xl">
            Park in a driveway near the game
          </h1>
          {/* HomeSearch reads ?tab= from the URL, which is request-time data. */}
          <Suspense fallback={<div className="mt-8 h-64" />}>
            <HomeSearch />
          </Suspense>
        </div>
        <ListingPreview />
      </section>

      {/* Like the "Find Austin Parking Near You" band in ui_inspo */}
      <section className="border-t border-border bg-bg">
        <div className="mx-auto max-w-[96rem] px-4 py-10 md:py-12 lg:px-8">
          <Suspense fallback={<div className="h-80 rounded-card bg-surface" />}>
            <Upcoming />
          </Suspense>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}

/** Ranked from: the driver's saved area → browser location (cookie) → Austin. */
async function nearPoint(): Promise<{ point: LatLng; known: boolean }> {
  const user = await getCurrentUser();
  if (user) {
    const row = await db.user.findUnique({ where: { id: user.id }, select: { homeLat: true, homeLng: true } });
    if (row?.homeLat != null && row.homeLng != null) return { point: { lat: row.homeLat, lng: row.homeLng }, known: true };
  }
  const [lat, lng] = ((await cookies()).get(NEAR_COOKIE)?.value ?? "").split(",").map(Number);
  if (Number.isFinite(lat) && Number.isFinite(lng) && lat && lng) return { point: { lat, lng }, known: true };
  return { point: AUSTIN, known: false };
}

async function Upcoming() {
  await connection(); // "upcoming" depends on the current time
  const { point, known } = await nearPoint();
  const events = (await upcomingEvents({ near: point })).slice(0, 10);
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{known ? "Upcoming near you" : "Upcoming in Austin"}</h2>
          <p className="mt-1 text-muted">Soonest first. Pick an event to see driveways on the map.</p>
        </div>
        {!known && <UseMyLocation />}
      </div>
      <div className="mt-6">
        <EventList events={events} />
      </div>
    </>
  );
}
