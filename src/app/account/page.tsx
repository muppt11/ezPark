import type { Metadata } from "next";
import { Suspense } from "react";
import { logout } from "@/app/(auth)/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/current-user";
import { listCards, stripePublishableKey } from "@/lib/stripe";
import { PaymentMethods } from "./PaymentMethods";
import { Section, SettingsForm } from "./SettingsForm";

export const metadata: Metadata = { title: "Account · ezPark" };

export default function AccountPage({ searchParams }: PageProps<"/account">) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:py-12">
      <h1 className="text-3xl font-bold tracking-tight">Account</h1>
      <Suspense fallback={<div className="mt-8 h-96" />}>
        <AccountBody searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function AccountBody({ searchParams }: Pick<PageProps<"/account">, "searchParams">) {
  const user = await requireUser("/account");
  const { welcome } = await searchParams;
  const [row, acceptance, cards] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: user.id } }),
    db.termsAcceptance.findFirst({ where: { userId: user.id }, orderBy: { acceptedAt: "desc" } }),
    listCards(user.id).catch(() => []),
  ]);

  return (
    <>
      {welcome && (
        <div className="mt-6">
          <Alert tone="success">Welcome to ezPark, {row.name.split(" ")[0]}. Your account is ready.</Alert>
        </div>
      )}

      <SettingsForm
        initial={{
          name: row.name,
          email: row.email,
          isDriver: row.isDriver,
          isHost: row.isHost,
          homeArea: row.homeArea,
          homeLat: row.homeLat,
          homeLng: row.homeLng,
          maxWalkMinutes: row.maxWalkMinutes,
          vehicleMake: row.vehicleMake,
          vehicleModel: row.vehicleModel,
          vehicleColor: row.vehicleColor,
          licensePlate: row.licensePlate,
        }}
      />

      <div className="divide-y divide-border border-t border-border">
        <Section title="Payment methods" description="Saved cards for reserving driveways. Card details are stored by Stripe, not ezPark.">
          <PaymentMethods cards={cards} publishableKey={stripePublishableKey()} />
        </Section>

        <Section title="Terms">
          <p className="text-muted">
            {acceptance
              ? `Accepted ${acceptance.acceptedAt.toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "UTC" })} (version ${acceptance.version}).`
              : "Not accepted yet."}
          </p>
        </Section>

        <Section title="Log out">
          <form action={logout}>
            <Button type="submit" variant="secondary">
              Log out
            </Button>
          </form>
        </Section>
      </div>
    </>
  );
}
