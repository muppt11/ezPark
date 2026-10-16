"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { acceptCurrentTerms, type FormState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";

export function AcceptTermsForm() {
  const next = useSearchParams().get("next") ?? "/";
  const [state, action, pending] = useActionState<FormState, FormData>(acceptCurrentTerms, {});

  return (
    <form action={action} className="mt-8 space-y-6">
      <input type="hidden" name="next" value={next} />
      <Checkbox name="acceptTerms" error={state.error}>
        I agree to the updated{" "}
        <Link href="/terms" target="_blank" className="font-semibold text-primary underline underline-offset-4">
          ezPark Terms
        </Link>
        .
      </Checkbox>
      <Button type="submit" size="lg" fullWidth disabled={pending}>
        Continue
      </Button>
    </form>
  );
}
