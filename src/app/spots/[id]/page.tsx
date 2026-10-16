import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Camera, ChevronLeft, Footprints, LockKeyhole } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { formatMiles } from "@/lib/geo";
import { formatCents, formatEventDate, formatTime, formatTimeRange } from "@/lib/format";
import { getPublicListing } from "@/lib/search";
import { SpotMap } from "./SpotMap";

export const metadata: Metadata = { title: "Driveway · ezPark" };

export default function SpotPage({ params }: PageProps<"/spots/[id]">) {
  return (
    <Suspense fallback={<div className="mx-auto h-96 max-w-5xl" />}>
      <Spot params={params} />
    </Suspense>
  );
}

async function Spot({ params }: Pick<PageProps<"/spots/[id]">, "params">) {
  const { id } = await params;
  const data = await getPublicListing(id);
  if (!data) notFound();
  const { listing: l, event, venue, host } = data;
  const since = host.since.toLocaleDateString("en-US", { month: "short", year: "numeric" });

  return (
    <div className="mx-auto max-w-[96rem] px-4 py-6 md:py-8 lg:px-8">
      {event && (
        <Link href={`/find?event=${event.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
          <ChevronLeft size={16} /> All driveways for this event
        </Link>
      )}

      <div className="mt-4 grid gap-8 md:grid-cols-[1fr_22rem] xl:grid-cols-[1fr_26rem] xl:gap-12">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{l.areaLabel}</h1>
          <p className="mt-2 flex items-center gap-1.5 text-lg">
            <Footprints size={18} className="text-accent" />
            {l.walkMinutes} min walk to {venue.name} <span className="text-muted">({formatMiles(l.walkMeters)})</span>
          </p>
          {event && (
            <p className="mt-1 text-muted">
              {event.name} · {formatEventDate(event.startsAt)}, {formatTime(event.startsAt)}
            </p>
          )}

          {l.hasPhoto && (
            <p className="mt-6 flex items-center gap-2 rounded-card border border-border bg-neutral px-4 py-3 text-sm">
              <Camera size={16} className="shrink-0" /> The host added a photo of the driveway. You&apos;ll see it with the
              exact address after you book, so you can spot it on arrival.
            </p>
          )}

          <div className="mt-6 h-72 overflow-hidden rounded-card border border-border md:h-[28rem]">
            <SpotMap venue={venue} lat={l.approxLat} lng={l.approxLng} />
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
            <LockKeyhole size={14} /> The driveway is somewhere in the circle. The exact address and parking instructions
            appear after you pay.
          </p>

          <dl className="mt-6 divide-y divide-border border-y border-border">
            <Row label="Open">{formatTimeRange(new Date(l.openFrom), new Date(l.openUntil))}</Row>
            <Row label="Fits">
              {l.carCount} {l.carCount === 1 ? "car" : "cars"} · {l.spotsLeft} left
            </Row>
            <Row label="Host">
              {host.firstName} · hosting since {since}
              {host.completedBookings > 0 ? ` · ${host.completedBookings} completed bookings` : ""}
            </Row>
          </dl>
        </div>

        <aside className="h-fit rounded-card border border-border bg-surface p-5 shadow-card md:sticky md:top-6">
          <p className="text-sm font-semibold text-muted">Your rate</p>
          <div className="mt-2 space-y-2">
            {l.flatPrice != null && l.pricingMode !== "HOURLY" && (
              <Rate title="Whole event" detail={formatTimeRange(new Date(l.openFrom), new Date(l.openUntil))} price={formatCents(l.flatPrice)} />
            )}
            {l.hourlyRate != null && l.pricingMode !== "FLAT" && (
              <Rate title="By the hour" detail="Pick your arrival and leave times" price={`${formatCents(l.hourlyRate)}/hr`} />
            )}
          </div>
          {l.spotsLeft > 0 ? (
            <Link href={`/book/${l.id}`} className={`${buttonClasses({ size: "lg", fullWidth: true })} mt-4`}>
              Reserve
            </Link>
          ) : (
            <p className="mt-4 rounded-control border border-danger px-3 py-2 text-center text-danger">Full for this event</p>
          )}
          <p className="mt-2 text-center text-sm text-muted">Free cancellation up to 24 hours before</p>
        </aside>
      </div>
    </div>
  );
}

function Rate({ title, detail, price }: { title: string; detail: string; price: string }) {
  return (
    <div className="flex items-center justify-between rounded-control border-2 border-primary px-4 py-3">
      <div>
        <p className="font-bold">{title}</p>
        <p className="text-sm text-muted">{detail}</p>
      </div>
      <p className="text-lg font-bold text-primary">{price}</p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between py-3">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}
