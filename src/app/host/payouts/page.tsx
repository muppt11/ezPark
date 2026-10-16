import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { PayoutForm } from "./PayoutForm";

export const metadata: Metadata = { title: "Payouts · ezPark" };

export default function PayoutsPage({ searchParams }: PageProps<"/host/payouts">) {
  return (
    <div className="mx-auto max-w-xl px-4 py-8 md:py-12">
      <Suspense fallback={<div className="h-64" />}>
        <Body searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Body({ searchParams }: Pick<PageProps<"/host/payouts">, "searchParams">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/host/payouts");
  const { from } = await searchParams;
  const row = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { payoutsEnabled: true, payoutLabel: true } });
  const drafts = await db.listing.count({ where: { hostId: user.id, status: "DRAFT", eventId: { not: null } } });

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">{from === "listing" ? "Last step: get paid" : "Payouts"}</h1>
      {from === "listing" && (
        <p className="mt-2 text-muted">
          Your listing is saved. Add where we should send your earnings and it goes live
          {drafts > 1 ? ` (${drafts} listings)` : ""}.
        </p>
      )}
      {row.payoutsEnabled && (
        <p className="mt-4 rounded-control border border-border bg-surface px-4 py-3">
          Payouts go to <span className="font-semibold">{row.payoutLabel}</span>. You can update it below.
        </p>
      )}
      <div className="mt-8">
        <PayoutForm defaultName={user.name} />
      </div>
    </>
  );
}
