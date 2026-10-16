import { Footprints } from "lucide-react";

/** Hero photo, as in the ui_inspo landing page, with a small listing chip on top. */
export function ListingPreview() {
  return (
    <figure className="relative hidden md:block">
      {/* eslint-disable-next-line @next/next/no-img-element -- static demo photo */}
      <img
        src="/demo/driveway-gravel.jpg"
        alt="A wide gravel driveway in front of a house"
        className="aspect-[4/3] w-full rounded-[1.25rem] object-cover shadow-card"
      />
      <figcaption className="absolute bottom-4 left-4 flex items-center gap-3 rounded-card bg-surface px-4 py-3 shadow-card">
        <span className="flex items-center gap-1.5 text-[15px] font-medium">
          <Footprints size={16} className="text-accent" /> 6 min walk
        </span>
        <span className="h-5 w-px bg-border" />
        <span className="text-[15px]">
          <span className="font-bold">$25</span> <span className="text-muted">game day</span>
        </span>
      </figcaption>
    </figure>
  );
}
