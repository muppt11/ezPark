"use client";

import { useActionState, useRef } from "react";
import { FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { setupPayouts, type PayoutState } from "../actions";

export function PayoutForm({ defaultName }: { defaultName: string }) {
  const [state, action, pending] = useActionState<PayoutState, FormData>(setupPayouts, {});
  const err = state.fieldErrors ?? {};
  const v = state.values;
  const holder = useRef<HTMLInputElement>(null);
  const routing = useRef<HTMLInputElement>(null);
  const account = useRef<HTMLInputElement>(null);

  return (
    <form action={action} className="space-y-4">
      <div className="flex items-start gap-2 rounded-control border border-border bg-neutral px-4 py-3 text-sm">
        <FlaskConical size={18} className="mt-px shrink-0" />
        <p>
          Test mode: no real bank account is connected and no money moves.{" "}
          <button
            type="button"
            className="font-semibold text-primary underline"
            onClick={() => {
              // Keep a real-looking name if there is one; otherwise use a test name.
              if (holder.current && holder.current.value.trim().length < 2) holder.current.value = "Test Host";
              if (routing.current) routing.current.value = "110000000";
              if (account.current) account.current.value = "000123456789";
            }}
          >
            Fill test details
          </button>
        </p>
      </div>
      <Field ref={holder} label="Account holder name" name="holderName" defaultValue={v?.holderName ?? defaultName} autoComplete="name" error={err.holderName} />
      <Field ref={routing} label="Routing number" name="routing" defaultValue={v?.routing} inputMode="numeric" autoComplete="off" error={err.routing} />
      <Field ref={account} label="Account number" name="account" defaultValue={v?.account} inputMode="numeric" autoComplete="off" error={err.account} />
      <Button type="submit" size="lg" fullWidth disabled={pending}>
        {pending ? "Saving…" : "Save and publish"}
      </Button>
      <p className="text-center text-sm text-muted">You&apos;re paid 90% of each booking after the event ends.</p>
    </form>
  );
}
