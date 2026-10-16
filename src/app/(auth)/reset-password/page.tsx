import { Suspense } from "react";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Choose a new password</h1>
      <Suspense fallback={<div className="mt-8 h-40" />}>
        <ResetPasswordForm />
      </Suspense>
    </>
  );
}
