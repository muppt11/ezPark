import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, CircleCheck, Clock, Footprints, MapPin, Navigation, StickyNote } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { buttonClasses } from "@/components/ui/Button";
import { cancelBooking } from "@/app/book/actions";
import { FREE_CANCEL_HOURS, rebookOptions } from "@/lib/bookings";
import { getCurrentUser } from "@/lib/current-user";
import { formatCents, formatEventDate, formatTime, formatTimeRange, priceLabel } from "@/lib/format";
import { driverBooking } from "@/lib/parking";
import { ReportProblem } from "./ReportProblem";
import { ExactSpotMap } from "./ExactSpotMap";

export const metadata: Metadata = { title: "Your reservation · ezPark" };

export default function ReservationPage({ params, searchParams }: PageProps<"/parking/[id]">) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:py-10">
      <Link href="/parking" className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
        <ChevronLeft size={16} /> My parking
      </Link>
      <Suspense fallback={<div className="h-96" />}>
        <Reservation params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Reservation({ params, searchParams }: Pick<PageProps<"/parking/[id]">, "params" | "searchParams">) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/parking/${id}`);
  const b = await driverBooking(id, user.id);
  if (!b) notFound();
  const sp = await searchParams;

  const now = new Date();
  const active = b.status === "CONFIRMED" && b.endsAt >= now;
  const freeCancel = now.getTime() <= b.startsAt.getTime() - FREE_CANCEL_HOURS * 3600_000;
  const options = b.status === "REFUNDED" ? await rebookOptions(b.id) : [];

  return (
    <div className="mt-4 space-y-6">
      {sp.new && (
        <div className="rounded-card border-2 border-success bg-surface p-5">
          <p className="flex items-center gap-2 text-xl font-bold text-success">
            <CircleCheck size={24} /> You&apos;re booked
          </p>
          <p className="mt-1">
            Your spot is held for {formatTimeRange(b.startsAt, b.endsAt)}. Here&apos;s the exact address and how to park.
          </p>
        </div>
      )}
      {sp.refunded && <Alert tone="success">Booking cancelled. {formatCents(b.refundAmount, { trim: false })} refunded to {b.cardLabel}.</Alert>}
      {sp.canceled && <Alert tone="success">Booking cancelled. It was within {FREE_CANCEL_HOURS} hours of the start, so it wasn&apos;t refunded.</Alert>}

      <div>
        <h1 className="text-3xl font-bold tracking-tight">{b.listing.event?.name ?? b.listing.venue.name}</h1>
        <p className="mt-1 text-muted">
          {formatEventDate(b.startsAt)} · {b.listing.venue.name}
        </p>
      </div>

      {b.exact ? (
        <section className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
          <div className="h-56 md:h-72">
            <ExactSpotMap venue={b.listing.venue} lat={b.exact.lat} lng={b.exact.lng} />
          </div>
          <div className="space-y-4 p-5">
            {b.exact.photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- host upload, shown only after payment
              <img src={b.exact.photoUrl} alt="The driveway you booked" className="aspect-[16/9] w-full rounded-control object-cover" />
            )}
            <Row icon={<MapPin size={18} className="text-accent" />} label="Address">
              <p className="text-lg font-semibold">{b.exact.address}</p>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${b.exact.lat},${b.exact.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-primary"
              >
                <Navigation size={14} /> Open in Maps
              </a>
            </Row>
            <Row icon={<Clock size={18} className="text-accent" />} label="Your time">
              <p>{formatTimeRange(b.startsAt, b.endsAt)}</p>
            </Row>
            <Row icon={<StickyNote size={18} className="text-accent" />} label={`Instructions from ${b.hostFirstName}`}>
              <p>{b.exact.instructions || "No special instructions. Park in the driveway and don't block the garage."}</p>
            </Row>
            <Row icon={<Footprints size={18} className="text-accent" />} label="Walk">
              <p>
                {b.listing.walkMinutes} min to {b.listing.venue.name}
              </p>
            </Row>
          </div>
        </section>
      ) : (
        <section className="rounded-card border border-border bg-surface p-5">
          <p className="font-semibold">{b.status === "REFUNDED" ? "This booking was refunded." : "This booking was cancelled."}</p>
          <p className="mt-1 text-sm text-muted">The address is only shown for active bookings.</p>
        </section>
      )}

      {options.length > 0 && (
        <section>
          <h2 className="text-lg font-bold">Rebook nearby for the same event</h2>
          <ul className="mt-3 space-y-2">
            {options.map((o) => {
              const p = priceLabel(o);
              return (
                <li key={o.id}>
                  <Link href={`/book/${o.id}`} className="flex items-center justify-between rounded-card border border-border bg-surface px-4 py-3 hover:border-primary">
                    <span>
                      <span className="block font-semibold">{o.areaLabel}</span>
                      <span className="text-sm text-muted">{o.walkMinutes} min walk</span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="font-bold">
                        {p.amount}
                        <span className="text-xs font-normal text-muted"> {p.unit}</span>
                      </span>
                      <span className={buttonClasses({ size: "md" })}>Rebook</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="rounded-card border border-border bg-surface p-5">
        <h2 className="font-semibold">Receipt</h2>
        <dl className="mt-3 space-y-1.5 text-sm">
          <Line label={b.pricingOption === "FLAT" ? "Whole event" : `By the hour (${formatTime(b.startsAt)} – ${formatTime(b.endsAt)})`} value={formatCents(b.total, { trim: false })} />
          <Line label="Paid with" value={b.cardLabel} />
          {b.refundAmount > 0 && <Line label="Refunded" value={`−${formatCents(b.refundAmount, { trim: false })}`} />}
          {b.paymentMode === "test" && <p className="pt-1 text-muted">Test mode payment. No real money was charged.</p>}
        </dl>
      </section>

      {active && (
        <div className="grid gap-4 md:grid-cols-2">
          <ReportProblem bookingId={b.id} />
          <section className="rounded-card border border-border bg-surface p-5">
            <h2 className="font-semibold">Cancel booking</h2>
            <p className="mt-1 text-sm text-muted">
              {freeCancel
                ? `Full refund if you cancel before ${formatEventDate(new Date(b.startsAt.getTime() - FREE_CANCEL_HOURS * 3600_000))}, ${formatTime(new Date(b.startsAt.getTime() - FREE_CANCEL_HOURS * 3600_000))}.`
                : `It's within ${FREE_CANCEL_HOURS} hours of your start time, so cancelling now isn't refunded.`}
            </p>
            <form action={cancelBooking.bind(null, b.id)} className="mt-3">
              <button type="submit" className="text-sm font-semibold text-danger hover:underline">
                Cancel booking
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5">{icon}</span>
      <div>
        <p className="text-sm text-muted">{label}</p>
        {children}
      </div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
