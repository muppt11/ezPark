import "server-only";

export type Email = {
  to: string;
  subject: string;
  text: string;
};

/**
 * Single entry point for outgoing email. MVP: logs to the server console.
 * To go live, swap the body for a provider call (e.g. Resend) — callers don't change.
 * See the pre-launch checklist in README.md.
 */
export async function sendEmail(email: Email): Promise<void> {
  console.log(
    [
      "",
      "──────── ezPark email (dev: not sent) ────────",
      `To:      ${email.to}`,
      `Subject: ${email.subject}`,
      "",
      email.text,
      "──────────────────────────────────────────────",
      "",
    ].join("\n"),
  );
}
