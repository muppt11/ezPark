import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SignedInRedirect } from "@/components/SignedInRedirect";
import { SignupForm } from "./SignupForm";

export const metadata: Metadata = { title: "Sign up · ezPark" };

export default function SignupPage({ searchParams }: PageProps<"/signup">) {
  return (
    <>
      <Suspense fallback={null}>
        <SignedInRedirect searchParams={searchParams} />
      </Suspense>
      <h1 className="text-3xl font-bold tracking-tight">Create your account</h1>
      <p className="mt-2 text-muted">
        Already have one?{" "}
        <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
      {/* SignupForm reads ?role= and ?next= from the URL, which is request-time data. */}
      <Suspense fallback={<div className="mt-8 h-[40rem]" />}>
        <SignupForm />
      </Suspense>
    </>
  );
}
