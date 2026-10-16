import "server-only";
import { randomBytes } from "node:crypto";

/**
 * Payments run in TEST MODE: no money moves. Card details are checked like a real form
 * (Luhn, expiry, CVC) and Stripe's public test numbers behave as they do on Stripe:
 *   4242 4242 4242 4242  → succeeds
 *   4000 0000 0000 0002  → declined
 * To go live, replace chargeCard/refund/createPayoutAccount with Stripe PaymentIntents
 * (destination charges, application_fee_amount = platformFee) and Connect Express onboarding.
 * Nothing here stores the card number — only brand + last 4.
 */
export const PAYMENT_MODE = "test" as const;

export type CardInput = { number: string; exp: string; cvc: string; zip: string };
export type ChargeResult = { ok: true; ref: string; label: string } | { ok: false; error: string };

export function chargeCard(card: CardInput, amountCents: number): ChargeResult {
  const number = card.number.replace(/\D/g, "");
  if (number.length < 13 || number.length > 19 || !luhn(number)) return { ok: false, error: "Check your card number." };

  const m = card.exp.replace(/\s/g, "").match(/^(\d{2})\/?(\d{2})$/);
  if (!m) return { ok: false, error: "Enter the expiry as MM/YY." };
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  const now = new Date();
  if (month < 1 || month > 12 || year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) {
    return { ok: false, error: "That card has expired." };
  }
  if (!/^\d{3,4}$/.test(card.cvc.trim())) return { ok: false, error: "Enter the 3 or 4 digit security code." };
  if (!/^\d{5}$/.test(card.zip.trim())) return { ok: false, error: "Enter a 5-digit ZIP code." };
  if (amountCents <= 0) return { ok: false, error: "Nothing to charge." };

  if (number === "4000000000000002") return { ok: false, error: "Your card was declined. Try another card." };

  return { ok: true, ref: `test_pay_${randomBytes(8).toString("hex")}`, label: `${brand(number)} •••• ${number.slice(-4)}` };
}

/** Test mode: always succeeds. Live mode will refund `amountCents` against the original charge `ref`. */
export function refund(ref: string, amountCents: number): { ok: true; ref: string } {
  void ref;
  void amountCents;
  return { ok: true, ref: `test_refund_${randomBytes(8).toString("hex")}` };
}

export function createPayoutAccount(holderName: string, accountLast4: string) {
  return { ref: `test_acct_${randomBytes(6).toString("hex")}`, label: `${holderName} · bank •••• ${accountLast4}` };
}

function luhn(n: string) {
  let sum = 0;
  for (let i = 0; i < n.length; i++) {
    let d = Number(n[n.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

function brand(n: string) {
  if (n.startsWith("4")) return "Visa";
  if (/^5[1-5]|^2[2-7]/.test(n)) return "Mastercard";
  if (/^3[47]/.test(n)) return "Amex";
  if (/^6(011|5)/.test(n)) return "Discover";
  return "Card";
}
