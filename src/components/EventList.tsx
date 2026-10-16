import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatEventDate, formatTime } from "@/lib/format";
import type { UpcomingEvent } from "@/lib/search";

/** Upcoming events as tappable rows: date block, name, venue, driveway count. */
export function EventList({ events }: { events: UpcomingEvent[] }) {
  if (events.length === 0) return <p className="text-muted">No upcoming events in the next 60 days.</p>;

  return (
    // One column on phones; two columns of cards on wide screens so more events fit on screen.
    <ul className="grid gap-3 lg:grid-cols-2">
      {events.map((e) => {
        const [weekday, month, day] = formatEventDate(e.startsAt).replace(",", "").split(" ");
        return (
          <li key={e.id}>
            <Link
              href={`/find?event=${e.id}`}
              className="flex h-full items-center gap-4 rounded-card border border-border bg-surface px-4 py-3.5 hover:border-primary"
            >
              <div className="w-14 shrink-0 text-center">
                <p className="text-xs font-semibold uppercase text-accent">{month}</p>
                <p className="text-2xl leading-none font-bold">{day}</p>
                <p className="text-xs text-muted">{weekday}</p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{e.name}</p>
                <p className="truncate text-sm text-muted">
                  {e.venue.name} · {formatTime(e.startsAt)}
                </p>
              </div>
              <p className="shrink-0 text-right text-sm">
                <span className="font-semibold">{e.driveways}</span>{" "}
                <span className="text-muted">{e.driveways === 1 ? "driveway" : "driveways"}</span>
              </p>
              <ChevronRight size={18} className="shrink-0 text-muted" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
