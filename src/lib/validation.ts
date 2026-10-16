import { z } from "zod";

const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address."));
const password = z.string().min(8, "Use at least 8 characters.").max(200);

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
});

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(80),
  email,
  password,
  wantsDriver: z.boolean(),
  wantsHost: z.boolean(),
  acceptTerms: z.literal(true, { error: "You need to accept the terms to continue." }),
});

/** Checked separately so it shows alongside other field errors (object refinements only run once fields pass). */
export const ROLES_REQUIRED = "Pick at least one: find parking, rent out your driveway, or both.";

export const resetPasswordSchema = z.object({ token: z.string().min(1), password });
