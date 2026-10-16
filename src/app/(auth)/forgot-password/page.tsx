"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { requestPasswordReset, type FormState } from "../actions";

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState<FormState, FormData>(requestPasswordReset, {});

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Reset your password</h1>
      <p className="mt-2 text-muted">Enter your email and we&apos;ll send you a reset link.</p>
      <form action={action} className="mt-8 space-y-4">
        {state.done && (
          <Alert tone="success">If an account exists for that email, a reset link is on its way.</Alert>
        )}
        <Field label="Email" name="email" type="email" autoComplete="email" required />
        <Button type="submit" size="lg" fullWidth disabled={pending}>
          {pending ? "Sending…" : "Send reset link"}
        </Button>
        <p className="text-center text-sm">
          <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
            Back to log in
          </Link>
        </p>
      </form>
    </>
  );
}
