import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Car, Plus, ShieldCheck } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button, buttonClasses } from "@/components/ui/Button";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { hostStrikes, STRIKE_LIMIT, STRIKE_WINDOW_DAYS } from "@/lib/bookings";
import { formatCents, formatEventDate, formatTime, formatTimeRange } from "@/lib/format";
import { hostDashboard } from "@/lib/host";
import { enableHosting, hostCancelBooking } from "./actions";

export const metadata: Metadata = { title: "Hosting · ezPark" };

export default function HostPage({ searchParams }: PageProps<"/host">) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:py-12">
      <Suspense fallback={<div className="h-64" />}>
        <HostHome searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function HostHome({ searchParams }: Pick<PageProps<"/host">, "searchParams">) {
  const user = await getCurrentUser();
  // Not signed in: sign up with Host pre-selected, then come straight back here.
  if (!user) redirect("/signup?role=host&next=/host");
  if (!user.acceptedCurrentTerms) redirect("/terms/accept?next=/host");

  if (!user.isHost) {
    return (
      <>
        <h1 className="text-3xl font-bold tracking-tight">Rent out your driveway</h1>
        <p className="mt-3 text-lg text-muted">
          Turn on hosting to list your driveway for game days and concerts. You keep 90% of every booking.
        </p>
        <form action={enableHosting} className="mt-8">
          <Button type="submit" size="lg">
            Turn on hosting
          </Button>
        </form>
      </>
    );
  }

  const sp = await searchParams;
  const [{ listings, upcoming, earnings }, me, strikes] = await Promise.all([
    hostDashboard(user.id),
    db.user.findUniqueOrThrow({ where: { id: user.id }, select: { payoutsEnabled: true, payoutLabel: true } }),
    hostStrikes(user.id),
  ]);
  const waitingOnPayouts = listings.filter((l) => l.status === "DRAFT" && l.eventId).length;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Hosting</h1>
        <Link href="/host/new" className={buttonClasses()}>
          <Plus size={18} /> List your driveway
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        {sp.published && (
          <Alert tone="success">
            {sp.published === "1" ? "Your listing is live." : `${sp.published} listings are live.`} Drivers can book it now.
          </Alert>
        )}
        {sp.draft && <Alert tone="success">Draft saved. Publish it once the venue announces events.</Alert>}
        {sp.payouts && <Alert tone="success">Payout details saved.</Alert>}
        {!me.payoutsEnabled && waitingOnPayouts > 0 && (
          <Alert tone="error">
            {waitingOnPayouts} {waitingOnPayouts === 1 ? "listing is" : "listings are"} waiting on payout setup.{" "}
            <Link href="/host/payouts?from=listing" className="font-semibold underline">
              Finish setup
            </Link>
          </Alert>
        )}
        {strikes > 0 && (
          <Alert tone="error">
            You&apos;ve cancelled {strikes} {strikes === 1 ? "booking" : "bookings"} in the last {STRIKE_WINDOW_DAYS} days.
            {strikes >= STRIKE_LIMIT
              ? " Your listings are paused. Contact support to reactivate them."
              : ` ${STRIKE_LIMIT} cancellations pauses your listings.`}
          </Alert>
        )}
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <Stat label="Upcoming bookings" value={String(upcoming.length)} />
        <Stat label="Earnings after events" value={formatCents(earnings.pending)} />
        <Stat label="Paid out" value={formatCents(earnings.paid)} />
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-bold">Upcoming bookings</h2>
        {upcoming.length === 0 ? (
          <p className="mt-2 text-muted">No bookings yet. They&apos;ll show up here with the driver&apos;s car details.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-card border border-border bg-surface">
            {upcoming.map((b) => {
              const car = [b.driver.vehicleColor, b.driver.vehicleMake, b.driver.vehicleModel].filter(Boolean).join(" ");
              return (
                <li key={b.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {b.driver.name.split(" ")[0]} · {formatEventDate(b.startsAt)}, {formatTimeRange(b.startsAt, b.endsAt)}
                    </p>
                    <p className="text-sm text-muted">
                      {b.listing.event?.name} · {b.listing.areaLabel}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm">
                      <Car size={15} className="text-muted" />
                      {car || "Car not added yet"}
                      {b.driver.licensePlate && <span className="font-mono">· {b.driver.licensePlate}</span>}
                    </p>
                  </div>
                  <p className="text-right">
                    <span className="block font-bold">{formatCents(b.hostPayout, { trim: false })}</span>
                    <span className="text-xs text-muted">you earn</span>
                  </p>
                  <form action={hostCancelBooking.bind(null, b.id)}>
                    <button type="submit" className="text-sm font-semibold text-danger hover:underline" title="The driver is refunded in full and you get a strike.">
                      Cancel
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold">Your listings</h2>
        {listings.length === 0 ? (
          <p className="mt-2 text-muted">
            You haven&apos;t listed a driveway yet.{" "}
            <Link href="/host/new" className="font-semibold text-primary underline-offset-4 hover:underline">
              List it in about a minute
            </Link>
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {listings.map((l) => (
              <li key={l.id} className="flex gap-4 rounded-card border border-border bg-surface p-3">
                {l.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- host upload
                  <img src={l.photoUrl} alt="" className="h-20 w-24 shrink-0 rounded-control object-cover" />
                ) : (
                  <div className="h-20 w-24 shrink-0 rounded-control bg-neutral" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate font-semibold">{l.event?.name ?? `Draft · ${l.venue.name}`}</p>
                    <StatusBadge status={l.status} />
                  </div>
                  <p className="text-sm text-muted">
                    {l.event ? `${formatEventDate(l.event.startsAt)} · ${formatTime(l.event.startsAt)} · ` : ""}
                    {l.areaLabel} · {l.walkMinutes} min walk
                  </p>
                  <p className="mt-1 text-sm">
                    {l._count.bookings} of {l.carCount} {l.carCount === 1 ? "spot" : "spots"} booked ·{" "}
                    {[l.flatPrice != null && l.pricingMode !== "HOURLY" && `${formatCents(l.flatPrice)} flat`, l.hourlyRate != null && l.pricingMode !== "FLAT" && `${formatCents(l.hourlyRate)}/hr`]
                      .filter(Boolean)
                      .join(" or ")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="rounded-card border border-border bg-surface p-5">
          <h2 className="font-semibold">Payouts</h2>
          <p className="mt-1 text-sm text-muted">
            {me.payoutsEnabled ? `Earnings go to ${me.payoutLabel}.` : "Not set up yet. Needed before your listings go live."}
          </p>
          <Link href="/host/payouts" className="mt-3 inline-block text-sm font-semibold text-primary">
            {me.payoutsEnabled ? "Update payout details" : "Set up payouts"}
          </Link>
        </div>
        <div className="rounded-card border border-border bg-surface p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <ShieldCheck size={18} className="text-accent" /> Host protection
          </h2>
          <p className="mt-1 text-sm text-muted">
            Drivers agree to follow your instructions and are responsible for damage they cause. A refundable damage
            deposit and insurance-backed protection are coming soon.
          </p>
        </div>
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-border bg-surface px-4 py-3">
      <p className="text-sm text-muted">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: "DRAFT" | "ACTIVE" | "PAUSED" }) {
  const styles = {
    ACTIVE: "border-success text-success",
    DRAFT: "border-border-strong text-muted",
    PAUSED: "border-danger text-danger",
  }[status];
  const label = { ACTIVE: "Live", DRAFT: "Draft", PAUSED: "Paused" }[status];
  return <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${styles}`}>{label}</span>;
}
