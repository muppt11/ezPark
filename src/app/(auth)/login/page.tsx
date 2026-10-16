import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SignedInRedirect } from "@/components/SignedInRedirect";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Log in · ezPark" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <>
      <Suspense fallback={null}>
        <SignedInRedirect searchParams={searchParams} />
      </Suspense>
      <h1 className="text-3xl font-bold tracking-tight">Log in</h1>
      <p className="mt-2 text-muted">
        New to ezPark?{" "}
        <Link href="/signup" className="font-semibold text-primary underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
      {/* LoginForm reads ?next= from the URL, which is request-time data. */}
      <Suspense fallback={<div className="mt-8 h-72" />}>
        <LoginForm />
      </Suspense>
    </>
  );
}
