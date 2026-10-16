"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { resetPassword, type FormState } from "../actions";

export function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";
  const [state, action, pending] = useActionState<FormState, FormData>(resetPassword, {});

  if (state.done) {
    return (
      <div className="mt-8 space-y-4">
        <Alert tone="success">Your password was updated.</Alert>
        <Link href="/login" className={buttonClasses({ size: "lg", fullWidth: true })}>
          Log in
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="mt-8 space-y-4">
      {(state.error || !token) && (
        <Alert tone="error">
          {state.error ?? "This link is missing its reset code."}{" "}
          <Link href="/forgot-password" className="font-semibold underline">
            Request a new link
          </Link>
        </Alert>
      )}
      <input type="hidden" name="token" value={token} />
      <Field
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        hint="At least 8 characters."
        error={state.fieldErrors?.password}
      />
      <Button type="submit" size="lg" fullWidth disabled={pending || !token}>
        {pending ? "Saving…" : "Save password"}
      </Button>
    </form>
  );
}
