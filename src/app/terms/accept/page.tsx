import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { AcceptTermsForm } from "./AcceptTermsForm";

export default function AcceptTermsPage() {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-10 sm:py-14">
      <h1 className="text-3xl font-bold tracking-tight">Our terms have changed</h1>
      <p className="mt-2 text-muted">Please review and accept the updated terms to keep using ezPark.</p>
      <Suspense fallback={<div className="mt-8 h-40" />}>
        <Gate />
      </Suspense>
    </div>
  );
}

async function Gate() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/terms/accept");
  return <AcceptTermsForm />;
}
