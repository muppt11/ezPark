"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { ensureCustomer, getStripe } from "@/lib/stripe";

export type SettingsState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string> };

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);

const settingsSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(80),
  wantsDriver: z.boolean(),
  wantsHost: z.boolean(),
  homeArea: optionalText(120),
  homeLat: z.coerce.number().min(-90).max(90).nullable(),
  homeLng: z.coerce.number().min(-180).max(180).nullable(),
  maxWalkMinutes: z.coerce.number().int().min(5).max(60),
  vehicleMake: optionalText(40),
  vehicleModel: optionalText(40),
  vehicleColor: optionalText(30),
  licensePlate: optionalText(12),
});

export async function updateSettings(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");

  const num = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v === "" ? null : v;
  };
  const parsed = settingsSchema.safeParse({
    name: formData.get("name") ?? "",
    wantsDriver: formData.get("wantsDriver") === "on",
    wantsHost: formData.get("wantsHost") === "on",
    homeArea: formData.get("homeArea") ?? "",
    homeLat: num("homeLat"),
    homeLng: num("homeLng"),
    maxWalkMinutes: formData.get("maxWalkMinutes") ?? 15,
    vehicleMake: formData.get("vehicleMake") ?? "",
    vehicleModel: formData.get("vehicleModel") ?? "",
    vehicleColor: formData.get("vehicleColor") ?? "",
    licensePlate: String(formData.get("licensePlate") ?? "").toUpperCase(),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { fieldErrors };
  }
  const d = parsed.data;
  if (!d.wantsDriver && !d.wantsHost) {
    return { fieldErrors: { roles: "Keep at least one: find parking or rent out your driveway." } };
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      name: d.name,
      isDriver: d.wantsDriver,
      isHost: d.wantsHost,
      homeArea: d.homeArea,
      // Clearing the area text also forgets the saved coordinates.
      homeLat: d.homeArea ? d.homeLat : null,
      homeLng: d.homeArea ? d.homeLng : null,
      maxWalkMinutes: d.maxWalkMinutes,
      vehicleMake: d.vehicleMake,
      vehicleModel: d.vehicleModel,
      vehicleColor: d.vehicleColor,
      licensePlate: d.licensePlate,
    },
  });
  revalidatePath("/account");
  return { ok: true };
}

/** Starts saving a card: returns a SetupIntent client secret for the Payment Element. */
export async function createCardSetup(): Promise<{ clientSecret?: string; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please log in again." };
  const stripe = getStripe();
  if (!stripe) return { error: "Card payments aren't set up on this server yet." };

  const customer = await ensureCustomer(stripe, user);
  const intent = await stripe.setupIntents.create({
    customer,
    usage: "off_session", // so the card can also hold the damage deposit later
    automatic_payment_methods: { enabled: true, allow_redirects: "never" },
  });
  return { clientSecret: intent.client_secret ?? undefined };
}

export async function removeCard(paymentMethodId: string) {
  const user = await getCurrentUser();
  const stripe = getStripe();
  if (!user || !stripe) return;
  const row = await db.user.findUnique({ where: { id: user.id }, select: { stripeCustomerId: true } });
  const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
  // Only detach cards that belong to this user's customer.
  if (row?.stripeCustomerId && pm.customer === row.stripeCustomerId) {
    await stripe.paymentMethods.detach(paymentMethodId);
  }
  revalidatePath("/account");
}
