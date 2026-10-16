import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { TERMS_VERSION } from "@/lib/terms";
import type { Role } from "@/generated/prisma/enums";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  isDriver: boolean;
  isHost: boolean;
  lastRole: Role;
  isAdmin: boolean;
  acceptedCurrentTerms: boolean;
};

/**
 * Data access layer for the signed-in user. Reads the session cookie, so call it only
 * from inside a <Suspense> boundary, a Server Action, or a Route Handler.
 * Returns null when signed out.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  // Mark this as request-time before Auth.js runs: it uses crypto.getRandomValues(),
  // which Cache Components rejects during prerendering.
  await connection();
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;

  const user = await db.user.findUnique({
    where: { id },
    include: { termsAcceptances: { where: { version: TERMS_VERSION }, take: 1 } },
  });
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isDriver: user.isDriver,
    isHost: user.isHost,
    lastRole: user.lastRole,
    isAdmin: adminEmails().includes(user.email),
    acceptedCurrentTerms: user.termsAcceptances.length > 0,
  };
});

/** Like getCurrentUser, but sends signed-out users to /login and users on old terms to re-accept. */
export async function requireUser(next = "/"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (!user.acceptedCurrentTerms) redirect(`/terms/accept?next=${encodeURIComponent(next)}`);
  return user;
}

function adminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}
