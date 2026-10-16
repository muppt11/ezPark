"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loadStripe, type Appearance } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { CreditCard, Plus } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { useResolvedTheme } from "@/lib/use-theme";
import type { SavedCard } from "@/lib/stripe";
import { createCardSetup, removeCard } from "./actions";

type Props = { cards: SavedCard[]; publishableKey: string | null };

export function PaymentMethods({ cards, publishableKey }: Props) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const stripePromise = useMemo(() => (publishableKey ? loadStripe(publishableKey) : null), [publishableKey]);
  const appearance = useStripeAppearance();

  if (!publishableKey) {
    return (
      <p className="text-muted">
        Card payments aren&apos;t switched on yet. Once Stripe is connected you&apos;ll be able to save a card here.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {cards.length > 0 && (
        <ul className="divide-y divide-border rounded-card border border-border bg-surface">
          {cards.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-4 py-3">
              <CreditCard size={20} className="text-muted" />
              <span className="flex-1">
                <span className="font-medium capitalize">{c.brand}</span> ending in {c.last4}
                <span className="ml-2 text-sm text-muted">
                  Expires {String(c.expMonth).padStart(2, "0")}/{String(c.expYear).slice(-2)}
                </span>
              </span>
              <button
                type="button"
                className="text-sm font-semibold text-danger hover:underline"
                onClick={() => start(async () => {
                  await removeCard(c.id);
                  router.refresh();
                })}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <Alert tone="error">{error}</Alert>}

      {clientSecret && stripePromise ? (
        <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
          <CardForm
            onDone={() => {
              setClientSecret(null);
              router.refresh();
            }}
            onCancel={() => setClientSecret(null)}
          />
        </Elements>
      ) : (
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setError(null);
              const res = await createCardSetup();
              if (res.error) setError(res.error);
              else setClientSecret(res.clientSecret ?? null);
            })
          }
        >
          <Plus size={18} /> {cards.length ? "Add another card" : "Add a card"}
        </Button>
      )}
    </div>
  );
}

function CardForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);
    const { error } = await stripe.confirmSetup({ elements, redirect: "if_required" });
    setBusy(false);
    if (error) setError(error.message ?? "That card couldn't be saved.");
    else onDone();
  }

  return (
    <div className="space-y-4 rounded-card border border-border bg-surface p-4">
      <PaymentElement />
      {error && <Alert tone="error">{error}</Alert>}
      <div className="flex gap-2">
        <Button onClick={save} disabled={!stripe || busy}>
          {busy ? "Saving…" : "Save card"}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

/** Match Stripe's form to the current theme tokens. */
function useStripeAppearance(): Appearance {
  const theme = useResolvedTheme();
  const css = typeof window === "undefined" ? null : getComputedStyle(document.documentElement);
  const v = (name: string) => css?.getPropertyValue(name).trim() || undefined;
  return {
    theme: theme === "dark" ? "night" : "stripe",
    variables: {
      colorPrimary: v("--primary"),
      colorBackground: v("--surface"),
      colorText: v("--text"),
      colorDanger: v("--danger"),
      borderRadius: "8px",
      fontFamily: "Plus Jakarta Sans, system-ui, sans-serif",
    },
  };
}
