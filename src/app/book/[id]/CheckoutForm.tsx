"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { CircleCheck, FlaskConical, LockKeyhole } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { formatCents, formatTime, formatTimeRange } from "@/lib/format";
import { offersFlat, offersHourly, quote, timeSlots } from "@/lib/pricing";
import { bookSpot, type CheckoutState } from "../actions";

type Props = {
  listingId: string;
  pricing: { pricingMode: "HOURLY" | "FLAT" | "BOTH"; flatPrice: number | null; hourlyRate: number | null; openFrom: string; openUntil: string };
};

/** Checkout modeled on the ui_inspo mobile checkout: rate card, order total, card, sticky pay button. */
export function CheckoutForm({ listingId, pricing }: Props) {
  const [state, action, pending] = useActionState<CheckoutState, FormData>(bookSpot.bind(null, listingId), {});
  const info = useMemo(
    () => ({ ...pricing, openFrom: new Date(pricing.openFrom), openUntil: new Date(pricing.openUntil) }),
    [pricing],
  );
  const slots = useMemo(() => timeSlots(info.openFrom, info.openUntil), [info]);

  const [option, setOption] = useState<"FLAT" | "HOURLY">(offersFlat(info) ? "FLAT" : "HOURLY");
  const [start, setStart] = useState(slots[0]?.toISOString() ?? "");
  const [end, setEnd] = useState(slots[Math.min(6, slots.length - 1)]?.toISOString() ?? "");
  const q = quote(info, option, new Date(start), new Date(end));

  const number = useRef<HTMLInputElement>(null);
  const exp = useRef<HTMLInputElement>(null);
  const cvc = useRef<HTMLInputElement>(null);
  const zip = useRef<HTMLInputElement>(null);
  function fillTestCard() {
    if (number.current) number.current.value = "4242 4242 4242 4242";
    if (exp.current) exp.current.value = "12/30";
    if (cvc.current) cvc.current.value = "123";
    if (zip.current) zip.current.value = "78705";
  }

  return (
    <form action={action} className="mt-8 space-y-8 pb-24 md:pb-0">
      <input type="hidden" name="option" value={option} />
      {option === "HOURLY" && (
        <>
          <input type="hidden" name="start" value={start} />
          <input type="hidden" name="end" value={end} />
        </>
      )}

      <section>
        <h2 className="text-sm font-semibold text-muted">Your rate</h2>
        <div className="mt-2 space-y-2" role="radiogroup" aria-label="Rate">
          {offersFlat(info) && (
            <RateOption
              selected={option === "FLAT"}
              onSelect={() => setOption("FLAT")}
              title="Whole event"
              detail={formatTimeRange(info.openFrom, info.openUntil)}
              price={formatCents(info.flatPrice!)}
            />
          )}
          {offersHourly(info) && (
            <RateOption
              selected={option === "HOURLY"}
              onSelect={() => setOption("HOURLY")}
              title="By the hour"
              detail={`${formatCents(info.hourlyRate!)}/hr · pick your times`}
              price={option === "HOURLY" && q.ok ? formatCents(q.total, { trim: false }) : `${formatCents(info.hourlyRate!)}/hr`}
            />
          )}
        </div>

        {option === "HOURLY" && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Select
              label="Arrive"
              value={start}
              onChange={(e) => {
                const s = new Date(e.target.value).getTime();
                setStart(e.target.value);
                // Keep "leave" at least an hour after "arrive", defaulting to a 3-hour stay.
                if (new Date(end).getTime() < s + 3600_000) {
                  const fallback = slots.find((x) => x.getTime() >= s + 3 * 3600_000) ?? slots[slots.length - 1];
                  setEnd(fallback.toISOString());
                }
              }}
            >
              {slots.slice(0, -2).map((s) => (
                <option key={s.toISOString()} value={s.toISOString()}>
                  {formatTime(s)}
                </option>
              ))}
            </Select>
            <Select label="Leave" value={end} onChange={(e) => setEnd(e.target.value)}>
              {slots.filter((s) => s.getTime() >= new Date(start).getTime() + 3600_000).map((s) => (
                <option key={s.toISOString()} value={s.toISOString()}>
                  {formatTime(s)}
                </option>
              ))}
            </Select>
          </div>
        )}
        {!q.ok && <p className="mt-2 text-sm text-danger">{q.error}</p>}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between border-t border-border pt-4">
          <span className="text-muted">Service fee</span>
          <span>None</span>
        </div>
        <div className="flex items-center justify-between text-lg font-bold">
          <span>Order total</span>
          <span>{q.ok ? formatCents(q.total, { trim: false }) : "—"}</span>
        </div>
        <ul className="space-y-1.5 pt-1 text-sm text-muted">
          <li className="flex items-center gap-2">
            <CircleCheck size={15} /> Free cancellation until 24 hours before your start time
          </li>
          <li className="flex items-center gap-2">
            <CircleCheck size={15} /> Spot blocked when you arrive? Instant full refund
          </li>
          <li className="flex items-center gap-2">
            <LockKeyhole size={15} /> Exact address and instructions unlock after payment
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold">Payment</h2>
        <div className="flex items-start gap-2 rounded-control border border-border bg-neutral px-4 py-3 text-sm">
          <FlaskConical size={18} className="mt-px shrink-0" />
          <p>
            Test mode: no real charge.{" "}
            <button type="button" onClick={fillTestCard} className="font-semibold text-primary underline">
              Use test card 4242…
            </button>{" "}
            (4000 0000 0000 0002 shows a decline.)
          </p>
        </div>
        <Field ref={number} label="Card number" name="cardNumber" inputMode="numeric" autoComplete="cc-number" placeholder="1234 1234 1234 1234" />
        <div className="grid grid-cols-3 gap-3">
          <Field ref={exp} label="Expiry" name="cardExp" autoComplete="cc-exp" placeholder="MM/YY" />
          <Field ref={cvc} label="CVC" name="cardCvc" inputMode="numeric" autoComplete="cc-csc" placeholder="123" />
          <Field ref={zip} label="ZIP" name="cardZip" inputMode="numeric" autoComplete="postal-code" placeholder="78705" />
        </div>
        {state.error && <Alert tone="error">{state.error}</Alert>}
      </section>

      {/* Sticky pay bar on phones (like the inspo PURCHASE bar), inline on desktop */}
      <div className="fixed inset-x-0 bottom-[4.25rem] z-20 border-t border-border bg-surface p-3 md:static md:border-0 md:bg-transparent md:p-0">
        <Button type="submit" size="lg" fullWidth disabled={pending || !q.ok}>
          {pending ? "Paying…" : q.ok ? `Pay ${formatCents(q.total, { trim: false })}` : "Pay"}
        </Button>
      </div>
    </form>
  );
}

function RateOption(props: { selected: boolean; onSelect: () => void; title: string; detail: string; price: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={props.selected}
      onClick={props.onSelect}
      className={`flex w-full items-center justify-between rounded-control border-2 px-4 py-3 text-left ${
        props.selected ? "border-primary bg-surface" : "border-border bg-surface hover:border-border-strong"
      }`}
    >
      <span>
        <span className="block font-bold">{props.title}</span>
        <span className="text-sm text-muted">{props.detail}</span>
      </span>
      <span className={`text-lg font-bold ${props.selected ? "text-primary" : ""}`}>{props.price}</span>
    </button>
  );
}
