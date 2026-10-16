import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { enableHosting } from "./actions";

export const metadata: Metadata = { title: "Host · ezPark" };

export default function HostPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Suspense fallback={<div className="h-64" />}>
        <HostHome />
      </Suspense>
    </div>
  );
}

async function HostHome() {
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

  const count = await db.listing.count({ where: { hostId: user.id } });
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Your driveway listings</h1>
      <p className="mt-3 text-muted">
        {count === 0 ? "You haven't listed a driveway yet." : `You have ${count} ${count === 1 ? "listing" : "listings"}.`}
      </p>
      <div className="mt-8 rounded-card border border-border bg-surface p-5">
        <p className="font-semibold">Create a listing</p>
        <p className="mt-1 text-muted">
          The one-minute listing form (photo, cars, price, open times) is the next thing being built.
        </p>
      </div>
    </>
  );
}
