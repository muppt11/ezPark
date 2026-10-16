"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cancelByDriver, createBooking, reportProblem } from "@/lib/bookings";
import { getCurrentUser } from "@/lib/current-user";
import type { IncidentType } from "@/generated/prisma/enums";

export type CheckoutState = { error?: string };

export async function bookSpot(listingId: string, _prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/book/${listingId}`);

  const option = formData.get("option") === "HOURLY" ? "HOURLY" : "FLAT";
  const start = formData.get("start") ? new Date(String(formData.get("start"))) : undefined;
  const end = formData.get("end") ? new Date(String(formData.get("end"))) : undefined;

  const result = await createBooking({
    listingId,
    driverId: user.id,
    option,
    start,
    end,
    card: {
      number: String(formData.get("cardNumber") ?? ""),
      exp: String(formData.get("cardExp") ?? ""),
      cvc: String(formData.get("cardCvc") ?? ""),
      zip: String(formData.get("cardZip") ?? ""),
    },
  });
  if (!result.ok) return { error: result.error };

  revalidatePath("/parking");
  redirect(`/parking/${result.bookingId}?new=1`);
}

export async function cancelBooking(bookingId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/parking");
  const r = await cancelByDriver(bookingId, user.id);
  revalidatePath(`/parking/${bookingId}`);
  redirect(`/parking/${bookingId}?${r.ok && r.refunded > 0 ? "refunded=1" : "canceled=1"}`);
}

export type ReportState = { error?: string; done?: boolean; refunded?: number };

const TYPES: IncidentType[] = ["SPOT_BLOCKED", "CANT_FIND", "OTHER"];

export async function reportBookingProblem(bookingId: string, _prev: ReportState, formData: FormData): Promise<ReportState> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/parking/${bookingId}`);
  const type = String(formData.get("type") ?? "") as IncidentType;
  if (!TYPES.includes(type)) return { error: "Pick what went wrong." };
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 1000) || null;

  const r = await reportProblem(bookingId, user.id, type, notes);
  if (!r.ok) return { error: r.error };
  revalidatePath(`/parking/${bookingId}`);
  return { done: true, refunded: r.refunded };
}
