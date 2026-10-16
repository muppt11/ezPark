"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { login, type FormState } from "../actions";

export function LoginForm() {
  const next = useSearchParams().get("next") ?? "/";
  const [state, action, pending] = useActionState<FormState, FormData>(login, {});
  const err = state.fieldErrors ?? {};

  return (
    <form action={action} className="mt-8 space-y-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="next" value={next} />
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={typeof state.values?.email === "string" ? state.values.email : undefined}
        error={err.email}
      />
      <Field label="Password" name="password" type="password" autoComplete="current-password" error={err.password} />
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
          Forgot password?
        </Link>
      </div>
      <Button type="submit" size="lg" fullWidth disabled={pending}>
        {pending ? "Logging in…" : "Log in"}
      </Button>
    </form>
  );
}
