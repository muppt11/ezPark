import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { getCurrentUser } from "@/lib/current-user";
import { formatEventDate, formatTimeRange } from "@/lib/format";
import { driverBookings } from "@/lib/parking";

export const metadata: Metadata = { title: "My parking · ezPark" };

export default function MyParkingPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:py-12">
      <h1 className="text-3xl font-bold tracking-tight">My parking</h1>
      <Suspense fallback={<div className="mt-6 h-64" />}>
        <List />
      </Suspense>
    </div>
  );
}

async function List() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/parking");
  const bookings = await driverBookings(user.id);
  const now = new Date();
  const upcoming = bookings.filter((b) => b.status === "CONFIRMED" && b.endsAt >= now);
  const past = bookings.filter((b) => !(b.status === "CONFIRMED" && b.endsAt >= now)).reverse();

  if (bookings.length === 0) {
    return (
      <div className="mt-6 rounded-card border border-border bg-surface p-6">
        <p className="font-semibold">No reservations yet.</p>
        <p className="mt-1 text-muted">Find a driveway near your next game or concert.</p>
        <Link href="/find" className={`${buttonClasses()} mt-4`}>
          Find parking
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-8">
      <Group title="Upcoming" items={upcoming} empty="Nothing coming up." />
      {past.length > 0 && <Group title="Past and cancelled" items={past} />}
    </div>
  );
}

type Item = Awaited<ReturnType<typeof driverBookings>>[number];

function Group({ title, items, empty }: { title: string; items: Item[]; empty?: string }) {
  return (
    <section>
      <h2 className="text-lg font-semibold">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-2 text-muted">{empty}</p>
      ) : (
        <ul className="mt-3 divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
          {items.map((b) => (
            <li key={b.id}>
              <Link href={`/parking/${b.id}`} className="flex items-center gap-4 px-4 py-3.5 hover:bg-bg">
                {b.status === "CONFIRMED" && b.listing.photoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- host upload
                  <img src={b.listing.photoUrl} alt="" className="h-14 w-16 shrink-0 rounded-control object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{b.listing.event?.name ?? b.listing.venue.name}</p>
                  <p className="truncate text-sm text-muted">
                    {formatEventDate(b.startsAt)} · {formatTimeRange(b.startsAt, b.endsAt)}
                  </p>
                  <p className="truncate text-sm">
                    {b.status === "CONFIRMED" ? b.listing.address : <StatusText status={b.status} />}
                  </p>
                </div>
                <ChevronRight size={18} className="shrink-0 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function StatusText({ status }: { status: string }) {
  return <span className="text-muted">{status === "REFUNDED" ? "Refunded" : "Cancelled"}</span>;
}
