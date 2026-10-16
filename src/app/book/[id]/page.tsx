import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Footprints } from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";
import { formatEventDate, formatTime } from "@/lib/format";
import { getPublicListing } from "@/lib/search";
import { CheckoutForm } from "./CheckoutForm";

export const metadata: Metadata = { title: "Reserve · ezPark" };

export default function BookPage({ params }: PageProps<"/book/[id]">) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:py-10">
      <Suspense fallback={<div className="h-96" />}>
        <Checkout params={params} />
      </Suspense>
    </div>
  );
}

async function Checkout({ params }: Pick<PageProps<"/book/[id]">, "params">) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/book/${id}`);
  if (!user.acceptedCurrentTerms) redirect(`/terms/accept?next=/book/${id}`);

  const data = await getPublicListing(id);
  if (!data) notFound();
  const { listing: l, event, venue } = data;

  return (
    <>
      <Link href={`/spots/${l.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
        <ChevronLeft size={16} /> Back to driveway
      </Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Reserve your spot</h1>

      <div className="mt-6 flex gap-4 rounded-card border border-border bg-surface p-4 shadow-card">
        <div className="min-w-0">
          <p className="font-bold">{l.areaLabel}</p>
          <p className="flex items-center gap-1.5 text-sm">
            <Footprints size={14} className="text-accent" /> {l.walkMinutes} min walk to {venue.name}
          </p>
          {event && (
            <p className="text-sm text-muted">
              {event.name} · {formatEventDate(event.startsAt)}, {formatTime(event.startsAt)}
            </p>
          )}
        </div>
      </div>

      {l.spotsLeft === 0 ? (
        <p className="mt-6 rounded-card border border-danger px-4 py-3 text-danger">This driveway is full for this event.</p>
      ) : (
        <CheckoutForm
          listingId={l.id}
          pricing={{
            pricingMode: l.pricingMode,
            flatPrice: l.flatPrice,
            hourlyRate: l.hourlyRate,
            openFrom: l.openFrom,
            openUntil: l.openUntil,
          }}
        />
      )}
    </>
  );
}
