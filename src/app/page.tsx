import { Suspense } from "react";
import { connection } from "next/server";
import { EventList } from "@/components/EventList";
import { SiteFooter } from "@/components/SiteFooter";
import { upcomingEvents } from "@/lib/search";
import { HomeSearch } from "./HomeSearch";
import { ListingPreview } from "./ListingPreview";

export default function Home() {
  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-10 pb-14 md:grid-cols-[1fr_minmax(0,26rem)] md:gap-16 md:pt-16 md:pb-20">
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
        <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Upcoming in Austin</h2>
          <p className="mt-1 text-muted">Pick an event to see driveways on the map.</p>
          <div className="mt-6">
            <Suspense fallback={<div className="h-64 rounded-card bg-surface" />}>
              <Upcoming />
            </Suspense>
          </div>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}

async function Upcoming() {
  await connection(); // "upcoming" depends on the current time
  return <EventList events={(await upcomingEvents()).slice(0, 8)} />;
}
