import Link from "next/link";
import { Car, Footprints } from "lucide-react";
import { formatMiles } from "@/lib/geo";
import { formatTimeRange, priceLabel } from "@/lib/format";
import type { PublicListing } from "@/lib/search";

type Props = {
  listing: PublicListing;
  active?: boolean;
  onHover?: (id: string | null) => void;
};

/** Search result row, modeled on the list cards in the ui_inspo results screen. */
export function ListingCard({ listing: l, active, onHover }: Props) {
  const price = priceLabel(l);
  const spots = `${l.carCount} ${l.carCount === 1 ? "car" : "cars"}`;

  return (
    <Link
      id={`listing-${l.id}`}
      href={`/spots/${l.id}`}
      onMouseEnter={() => onHover?.(l.id)}
      onMouseLeave={() => onHover?.(null)}
      className={`flex gap-4 rounded-card border bg-surface p-3 transition-colors hover:border-primary ${
        active ? "border-primary" : "border-border"
      }`}
    >
      <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-control bg-neutral text-muted">
        {l.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- host uploads, arbitrary sizes
          <img src={l.photoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <Car size={28} strokeWidth={1.5} />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <p className="truncate font-semibold">{l.areaLabel}</p>
          <p className="shrink-0 text-right">
            <span className="text-lg font-bold">{price.amount}</span>
            <span className="block text-xs text-muted">{price.unit}</span>
          </p>
        </div>
        <p className="flex items-center gap-1.5 text-[15px]">
          <Footprints size={15} className="text-accent" />
          {l.walkMinutes} min walk <span className="text-muted">({formatMiles(l.walkMeters)})</span>
        </p>
        <p className="mt-auto pt-1 text-sm text-muted">
          {spots} · Open {formatTimeRange(new Date(l.openFrom), new Date(l.openUntil))}
          {l.pricingMode === "BOTH" && " · Hourly or flat"}
        </p>
      </div>
    </Link>
  );
}
