import { Footprints } from "lucide-react";

/**
 * Static example of a driveway listing, in the style of the ui_inspo mobile booking card.
 * Shows visitors what they'll get. Replace with a real photo or live data later.
 */
export function ListingPreview() {
  return (
    <figure aria-label="Example listing" className="hidden md:block">
      <div className="rounded-card border border-border bg-surface p-5 shadow-card">
        <div className="flex items-baseline justify-between">
          <p className="text-lg font-bold">Driveway on E 23rd St</p>
          <p className="text-sm text-muted">Hosted by a neighbor</p>
        </div>
        <p className="mt-1 flex items-center gap-1.5 text-[15px]">
          <Footprints size={16} className="text-accent" />6 min walk to the stadium
          <span className="text-muted">(0.3 mi)</span>
        </p>
        <div className="mt-3 flex gap-2 text-sm">
          <span className="rounded-md border border-border-strong px-2 py-0.5">2 cars</span>
          <span className="rounded-md border border-border-strong px-2 py-0.5">Open 3–11 PM</span>
        </div>

        <p className="mt-5 text-sm font-semibold text-muted">Your rate</p>
        <div className="mt-2 flex items-center justify-between rounded-control border-2 border-primary px-4 py-3">
          <div>
            <p className="font-bold">Game day</p>
            <p className="text-sm text-muted">Sat 3:00 PM → 11:00 PM</p>
          </div>
          <p className="text-xl font-bold text-primary">$25.00</p>
        </div>
        <div className="mt-4 flex h-12 items-center justify-center rounded-control bg-primary font-semibold text-primary-text">
          Reserve
        </div>
        <p className="mt-3 text-center text-sm text-muted">Exact address shared after payment</p>
      </div>
      <figcaption className="mt-3 text-center text-sm text-muted">Example listing</figcaption>
    </figure>
  );
}
