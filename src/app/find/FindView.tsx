"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { List, Map as MapIcon, Search } from "lucide-react";
import { ListingCard } from "@/components/ListingCard";
import { ParkingMap, type MapPin } from "@/components/map/ParkingMap";
import { formatEventDate, formatTime, pinLabel } from "@/lib/format";
import type { PublicListing, SortKey } from "@/lib/search";

type Props = {
  event: { id: string; name: string; startsAt: string };
  venue: { name: string; lat: number; lng: number };
  otherEvents: { id: string; name: string; startsAt: string }[];
  listings: PublicListing[];
  hiddenByWalk: number;
  walk: number | null;
  sort: SortKey;
};

/** Zillow/Airbnb-style results: list on the left, map on the right; list/map toggle on phones. */
export function FindView({ event, venue, otherEvents, listings, hiddenByWalk, walk, sort }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"map" | "list">("list");

  const pins: MapPin[] = useMemo(
    () => listings.map((l) => ({ id: l.id, lat: l.approxLat, lng: l.approxLng, label: pinLabel(l) })),
    [listings],
  );

  function go(next: Record<string, string>) {
    const sp = new URLSearchParams(params);
    sp.delete("q");
    for (const [k, v] of Object.entries(next)) sp.set(k, v);
    router.push(`/find?${sp.toString()}`, { scroll: false });
  }

  function selectFromMap(id: string) {
    setActiveId(id);
    setMobileView("list");
    requestAnimationFrame(() =>
      document.getElementById(`listing-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }),
    );
  }

  const startsAt = new Date(event.startsAt);

  return (
    // Fills the screen under the header (and above the phone tab bar, which main pads by 5rem).
    <div className="flex h-[calc(100dvh-9rem)] flex-col md:h-[calc(100dvh-4rem)]">
      {/* Search bar, as in the ui_inspo results header */}
      <div className="border-b border-border bg-surface px-4 py-3 lg:px-8">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <form action="/find" className="flex h-12 shrink-0 items-center md:flex-1 gap-2 rounded-control border border-border-strong bg-surface px-3 md:max-w-sm">
            <Search size={18} className="shrink-0 text-muted" />
            <input
              name="q"
              defaultValue={venue.name}
              aria-label="Venue or event"
              className="w-full bg-transparent outline-none"
              onFocus={(e) => e.currentTarget.select()}
            />
          </form>
          <div className="flex flex-wrap gap-2 md:flex-nowrap">
            <label className="flex h-12 min-w-0 basis-full flex-col justify-center rounded-control border border-border-strong px-3 md:w-80 md:basis-auto">
              <span className="text-xs text-muted">Event</span>
              <select
                value={event.id}
                onChange={(e) => go({ event: e.target.value })}
                className="-ml-1 w-full truncate bg-transparent font-medium outline-none"
              >
                {otherEvents.map((e) => (
                  <option key={e.id} value={e.id}>
                    {formatEventDate(new Date(e.startsAt))} · {formatTime(new Date(e.startsAt))} · {e.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex h-12 flex-1 flex-col justify-center rounded-control border border-border-strong px-3 md:w-28 md:flex-none">
              <span className="text-xs text-muted">Walk</span>
              <select
                value={walk ? String(walk) : "any"}
                onChange={(e) => go({ walk: e.target.value })}
                className="-ml-1 bg-transparent font-medium outline-none"
              >
                <option value="any">Any</option>
                {[5, 10, 15, 20, 30].map((m) => (
                  <option key={m} value={m}>
                    ≤ {m} min
                  </option>
                ))}
              </select>
            </label>
            <label className="flex h-12 flex-1 flex-col justify-center rounded-control border border-border-strong px-3 md:w-36 md:flex-none">
              <span className="text-xs text-muted">Sort by</span>
              <select
                value={sort}
                onChange={(e) => go({ sort: e.target.value })}
                className="-ml-1 bg-transparent font-medium outline-none"
              >
                <option value="walk">Shortest walk</option>
                <option value="price">Lowest total</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      <div className="relative grid min-h-0 flex-1 md:grid-cols-[minmax(22rem,30rem)_1fr] xl:grid-cols-[34rem_1fr]">
        <section
          aria-label="Driveways"
          className={`min-h-0 overflow-y-auto bg-bg px-4 py-4 lg:pl-8 ${mobileView === "map" ? "hidden md:block" : ""}`}
        >
          <h1 className="text-lg font-bold">
            {listings.length} {listings.length === 1 ? "driveway" : "driveways"} near {venue.name}
          </h1>
          <p className="text-sm text-muted">
            {event.name} · {formatEventDate(startsAt)}, {formatTime(startsAt)}
          </p>
          <p className="mt-1 text-sm text-muted">Map pins show approximate locations. You get the exact address after you pay.</p>

          {hiddenByWalk > 0 && (
            <p className="mt-2 text-sm">
              {hiddenByWalk} more {hiddenByWalk === 1 ? "driveway is" : "driveways are"} a longer walk.{" "}
              <button type="button" onClick={() => go({ walk: "any" })} className="font-semibold text-primary underline">
                Show all
              </button>
            </p>
          )}
          {listings.length === 0 ? (
            <div className="mt-6 rounded-card border border-border bg-surface p-5">
              <p className="font-semibold">No driveways listed for this event yet.</p>
              <p className="mt-1 text-sm text-muted">Try another date, or check back closer to the event.</p>
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {listings.map((l) => (
                <li key={l.id}>
                  <ListingCard listing={l} active={l.id === activeId} onHover={setActiveId} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className={`min-h-0 ${mobileView === "list" ? "hidden md:block" : ""}`}>
          <ParkingMap venue={venue} pins={pins} activeId={activeId} onHover={setActiveId} onSelect={selectFromMap} />
        </div>

        {/* Phone toggle between list and map */}
        <button
          type="button"
          onClick={() => setMobileView((v) => (v === "list" ? "map" : "list"))}
          className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-5 py-3 font-semibold text-primary-text shadow-card md:hidden"
        >
          {mobileView === "list" ? <MapIcon size={18} /> : <List size={18} />}
          {mobileView === "list" ? "Map" : "List"}
        </button>
      </div>
    </div>
  );
}
