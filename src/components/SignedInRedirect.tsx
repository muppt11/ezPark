import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";

/** On /login and /signup: already-signed-in users skip straight to where they were going. */
export async function SignedInRedirect({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { next } = await searchParams;
  const dest = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  redirect(dest);
}
