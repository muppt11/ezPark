"use server";

import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { getCurrentUser } from "@/lib/current-user";
import { allow, clientIp } from "@/lib/rate-limit";
import { TERMS_VERSION } from "@/lib/terms";
import { loginSchema, resetPasswordSchema, ROLES_REQUIRED, signupSchema } from "@/lib/validation";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string | boolean>;
  done?: boolean;
};

const RESET_TTL_MS = 60 * 60 * 1000;
const MIN = 60_000;
const TOO_MANY = "Too many attempts. Please wait a few minutes and try again.";

/** Only allow same-site relative redirects. */
function safeNext(raw: FormDataEntryValue | null, fallback: string) {
  const v = typeof raw === "string" ? raw : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : fallback;
}

function firstErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const key = String(i.path[0] ?? "form");
    out[key] ??= i.message;
  }
  return out;
}

async function requestMeta() {
  const h = await headers();
  return {
    ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: h.get("user-agent"),
  };
}

export async function signup(_prev: FormState, formData: FormData): Promise<FormState> {
  const input = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    wantsDriver: formData.get("wantsDriver") === "on",
    wantsHost: formData.get("wantsHost") === "on",
    acceptTerms: formData.get("acceptTerms") === "on",
  };
  const values = { name: input.name, email: input.email, wantsDriver: input.wantsDriver, wantsHost: input.wantsHost };
  if (!allow(`signup:${await clientIp()}`, 50, 60 * MIN)) return { error: TOO_MANY, values };

  const parsed = signupSchema.safeParse(input);
  const fieldErrors = parsed.success ? {} : firstErrors(parsed.error.issues);
  if (!input.wantsDriver && !input.wantsHost) fieldErrors.roles = ROLES_REQUIRED;
  if (!parsed.success || fieldErrors.roles) return { fieldErrors, values };
  const data = parsed.data;

  if (await db.user.findUnique({ where: { email: data.email } })) {
    return { fieldErrors: { email: "An account with this email already exists. Log in instead." }, values };
  }

  const meta = await requestMeta();
  await db.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash: await bcrypt.hash(data.password, 12),
      isDriver: data.wantsDriver,
      isHost: data.wantsHost,
      lastRole: data.wantsDriver ? "DRIVER" : "HOST",
      termsAcceptances: { create: { version: TERMS_VERSION, ...meta } },
    },
  });

  await signIn("credentials", {
    email: data.email,
    password: data.password,
    redirectTo: safeNext(formData.get("next"), data.wantsHost && !data.wantsDriver ? "/host" : "/find"),
  });
  return {};
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "");
  const parsed = loginSchema.safeParse({ email, password: formData.get("password") ?? "" });
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error.issues), values: { email } };
  const ip = await clientIp();
  if (!allow(`login:${ip}`, 100, 15 * MIN) || !allow(`login:${parsed.data.email}`, 8, 15 * MIN)) {
    return { error: TOO_MANY, values: { email } };
  }

  try {
    await signIn("credentials", { ...parsed.data, redirect: false });
  } catch (err) {
    if (err instanceof AuthError) return { error: "That email and password don't match.", values: { email } };
    throw err;
  }

  redirect(safeNext(formData.get("next"), "/"));
}

export async function logout() {
  await signOut({ redirectTo: "/" });
}

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!allow(`reset:${await clientIp()}`, 10, 15 * MIN) || !allow(`reset:${email}`, 3, 15 * MIN)) {
    // Same response as success, so this can't be used to probe accounts either.
    return { done: true };
  }
  const user = email ? await db.user.findUnique({ where: { email } }) : null;

  if (user) {
    const token = randomBytes(32).toString("base64url");
    await db.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: createHash("sha256").update(token).digest("hex"),
        expiresAt: new Date(Date.now() + RESET_TTL_MS),
      },
    });
    const base = process.env.APP_URL ?? "http://localhost:3000";
    await sendEmail({
      to: user.email,
      subject: "Reset your ezPark password",
      text: `Hi ${user.name},\n\nReset your password here (link expires in 1 hour):\n${base}/reset-password?token=${token}\n\nIf you didn't ask for this, you can ignore this email.`,
    });
  }

  // Same response either way so the form can't be used to check which emails have accounts.
  return { done: true };
}

export async function resetPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token") ?? "",
    password: formData.get("password") ?? "",
  });
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error.issues) };

  const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
  const row = await db.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!row || row.usedAt || row.expiresAt < new Date()) {
    return { error: "This reset link has expired or was already used. Request a new one." };
  }

  await db.$transaction([
    db.user.update({ where: { id: row.userId }, data: { passwordHash: await bcrypt.hash(parsed.data.password, 12) } }),
    db.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
  ]);
  return { done: true };
}

export async function acceptCurrentTerms(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (formData.get("acceptTerms") !== "on") return { error: "You need to accept the terms to continue." };

  await db.termsAcceptance.create({ data: { userId: user.id, version: TERMS_VERSION, ...(await requestMeta()) } });
  redirect(safeNext(formData.get("next"), "/"));
}

