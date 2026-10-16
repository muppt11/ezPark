"use client";

import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { reportBookingProblem, type ReportState } from "@/app/book/actions";

const TYPES = [
  { value: "SPOT_BLOCKED", label: "The spot is blocked or unavailable", hint: "You'll get a full refund right away." },
  { value: "CANT_FIND", label: "I can't find the driveway", hint: "We'll contact the host." },
  { value: "OTHER", label: "Something else", hint: "Tell us what happened." },
];

export function ReportProblem({ bookingId }: { bookingId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ReportState, FormData>(reportBookingProblem.bind(null, bookingId), {});

  if (state.done) {
    return (
      <section className="rounded-card border border-border bg-surface p-5">
        <Alert tone="success">
          {state.refunded ? "Sorry about that. You've been refunded in full. Pick another driveway below." : "Thanks. We've let the host and our team know."}
        </Alert>
      </section>
    );
  }

  return (
    <section className="rounded-card border border-border bg-surface p-5">
      <h2 className="font-semibold">Problem with the spot?</h2>
      {!open ? (
        <>
          <p className="mt-1 text-sm text-muted">If the driveway is blocked when you arrive, you get an instant full refund.</p>
          <Button variant="secondary" className="mt-3" onClick={() => setOpen(true)}>
            Report a problem
          </Button>
        </>
      ) : (
        <form action={action} className="mt-3 space-y-3">
          <fieldset className="space-y-2">
            <legend className="sr-only">What went wrong?</legend>
            {TYPES.map((t) => (
              <label key={t.value} className="flex cursor-pointer gap-3 rounded-control border border-border px-3 py-2.5 has-[:checked]:border-primary">
                <input type="radio" name="type" value={t.value} className="mt-1 accent-[var(--primary)]" required />
                <span>
                  <span className="block text-sm font-medium">{t.label}</span>
                  <span className="text-xs text-muted">{t.hint}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <textarea
            name="notes"
            rows={2}
            placeholder="Anything else? (optional)"
            className="w-full rounded-control border border-border-strong bg-surface px-3 py-2 text-[15px] placeholder:text-muted"
          />
          {state.error && <Alert tone="error">{state.error}</Alert>}
          <Button type="submit" disabled={pending}>
            {pending ? "Sending…" : "Send report"}
          </Button>
        </form>
      )}
    </section>
  );
}
