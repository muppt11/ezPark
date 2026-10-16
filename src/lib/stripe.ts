import "server-only";
import Stripe from "stripe";
import { db } from "@/lib/db";

let client: Stripe | null = null;

/** Null when STRIPE_SECRET_KEY isn't set, so the app still runs without payments configured. */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  client ??= new Stripe(key);
  return client;
}

export function stripePublishableKey(): string | null {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || null;
}

/** Get or create the Stripe Customer that holds a driver's saved cards. */
export async function ensureCustomer(stripe: Stripe, user: { id: string; email: string; name: string }) {
  const row = await db.user.findUnique({ where: { id: user.id }, select: { stripeCustomerId: true } });
  if (row?.stripeCustomerId) return row.stripeCustomerId;
  const customer = await stripe.customers.create({ email: user.email, name: user.name, metadata: { userId: user.id } });
  await db.user.update({ where: { id: user.id }, data: { stripeCustomerId: customer.id } });
  return customer.id;
}

export type SavedCard = { id: string; brand: string; last4: string; expMonth: number; expYear: number };

export async function listCards(userId: string): Promise<SavedCard[]> {
  const stripe = getStripe();
  if (!stripe) return [];
  const row = await db.user.findUnique({ where: { id: userId }, select: { stripeCustomerId: true } });
  if (!row?.stripeCustomerId) return [];
  const methods = await stripe.paymentMethods.list({ customer: row.stripeCustomerId, type: "card" });
  return methods.data.flatMap((pm) =>
    pm.card
      ? [{ id: pm.id, brand: pm.card.brand, last4: pm.card.last4, expMonth: pm.card.exp_month, expYear: pm.card.exp_year }]
      : [],
  );
}
