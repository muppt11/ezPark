"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Car, House } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { ChoiceCard } from "@/components/ui/ChoiceCard";
import { Field } from "@/components/ui/Field";
import { signup, type FormState } from "../actions";

export function SignupForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(signup, {});
  // Arriving from "List your driveway" pre-selects the Host option.
  const search = useSearchParams();
  const role = search.get("role");
  const next = search.get("next") ?? "";
  const v = state.values ?? { wantsDriver: role === "driver", wantsHost: role === "host" };
  const err = state.fieldErrors ?? {};

  return (
    <form action={action} className="mt-8 space-y-8" noValidate>
      <input type="hidden" name="next" value={next} />
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <fieldset aria-describedby={err.roles ? "roles-error" : "roles-hint"}>
        <legend className="text-lg font-semibold">What do you want to use ezPark for?</legend>
        <p id="roles-hint" className="mt-1 text-sm text-muted">
          Pick one or both. You can add the other later.
        </p>
        <div className="mt-4 space-y-3">
          <ChoiceCard
            name="wantsDriver"
            title="Find parking"
            description="Reserve a driveway near the game or concert."
            icon={<Car size={22} />}
            defaultChecked={v.wantsDriver === true}
          />
          <ChoiceCard
            name="wantsHost"
            tone="accent"
            title="Rent out my driveway"
            description="List your driveway for event days and get paid."
            icon={<House size={22} />}
            defaultChecked={v.wantsHost === true}
          />
        </div>
        {err.roles && (
          <p id="roles-error" className="mt-2 text-sm text-danger">
            {err.roles}
          </p>
        )}
      </fieldset>

      <div className="space-y-4">
        <Field label="Name" name="name" autoComplete="name" defaultValue={str(v.name)} error={err.name} />
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={str(v.email)}
          error={err.email}
        />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters."
          error={err.password}
        />
      </div>

      <Checkbox name="acceptTerms" error={err.acceptTerms}>
        I agree to the{" "}
        <Link href="/terms" target="_blank" className="font-semibold text-primary underline underline-offset-4">
          ezPark Terms
        </Link>
        , including keeping bookings, messages and payments for ezPark parking on ezPark.
      </Checkbox>

      <Button type="submit" size="lg" fullWidth disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}

function str(x: string | boolean | undefined) {
  return typeof x === "string" ? x : undefined;
}
