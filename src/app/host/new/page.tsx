import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { ListingForm } from "./ListingForm";

export const metadata: Metadata = { title: "List your driveway · ezPark" };

export default function NewListingPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:py-12">
      <Link href="/host" className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
        <ChevronLeft size={16} /> Hosting
      </Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">List your driveway</h1>
      <p className="mt-1 text-muted">Takes about a minute.</p>
      <div className="mt-8">
        <Suspense fallback={<div className="h-64" />}>
          <Form />
        </Suspense>
      </div>
    </div>
  );
}

async function Form() {
  const user = await getCurrentUser();
  if (!user) redirect("/signup?role=host&next=/host/new");
  if (!user.acceptedCurrentTerms) redirect("/terms/accept?next=/host/new");
  const row = await db.user.findUnique({ where: { id: user.id }, select: { payoutsEnabled: true } });
  return <ListingForm payoutsEnabled={row?.payoutsEnabled ?? false} />;
}
