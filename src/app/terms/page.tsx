import type { Metadata } from "next";
import { TriangleAlert } from "lucide-react";
import { TERMS_VERSION } from "@/lib/terms";

export const metadata: Metadata = { title: "Terms · ezPark" };

// PLACEHOLDER v1 — drafted from the product spec, NOT reviewed by a lawyer.
// When this text changes, bump TERMS_VERSION in lib/terms.ts so users re-accept.
export default function TermsPage() {
  return (
    <article className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8 flex gap-2 rounded-control border border-accent bg-accent-subtle px-4 py-3 text-sm">
        <TriangleAlert size={18} className="mt-px shrink-0 text-accent" />
        <p>
          <strong>Draft for the MVP pilot.</strong> These terms have not been reviewed by a lawyer and will change before
          a public launch.
        </p>
      </div>

      <h1 className="text-3xl font-bold tracking-tight">ezPark Terms</h1>
      <p className="mt-2 text-sm text-muted">Version {TERMS_VERSION}</p>

      <div className="mt-8 space-y-8 leading-relaxed [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:mt-1.5 [&_ul]:list-disc [&_ul]:pl-5">
        <section>
          <h2>1. What ezPark is</h2>
          <p>
            ezPark connects Drivers looking for event-day parking with Hosts who rent out their driveways. ezPark is not
            a party to the parking arrangement itself, but it processes payments, holds deposits and helps resolve
            problems as described below.
          </p>
        </section>

        <section>
          <h2>2. Keep it on ezPark</h2>
          <ul>
            <li>
              If a booking or conversation started on ezPark, you agree not to arrange, negotiate or take payment for
              that parking outside ezPark.
            </li>
            <li>
              Contact details (phone numbers, emails, social and payment-app handles) are not shown before payment.
              Messages are in-app only, and contact details typed into messages are hidden and may be reviewed.
            </li>
            <li>The exact address and parking instructions are shared only after a booking is paid.</li>
          </ul>
        </section>

        <section>
          <h2>3. Host responsibilities</h2>
          <ul>
            <li>Honor every confirmed booking and keep the space open and clear for the booked time.</li>
            <li>Keep listings accurate: photo, number of cars, open times, location and instructions.</li>
            <li>
              Host cancellations add a strike to your account. Three cancellations within 90 days suspends your
              listings.
            </li>
          </ul>
        </section>

        <section>
          <h2>4. Driver responsibilities</h2>
          <ul>
            <li>Follow the Host&apos;s parking instructions.</li>
            <li>Park only in the booked space, with no more cars than you booked.</li>
            <li>You are responsible for damage you cause to the Host&apos;s property.</li>
          </ul>
        </section>

        <section>
          <h2>5. Payments and fees</h2>
          <p>
            Drivers pay the listed price when booking. ezPark keeps a 10% platform fee and pays the remaining 90% to the
            Host through Stripe.
          </p>
        </section>

        <section>
          <h2>6. Cancellations and refunds</h2>
          <ul>
            <li>Drivers who cancel at least 24 hours before the booking starts get a full refund. No refund after that.</li>
            <li>
              If a Host cancels, or the space is unavailable, blocked or inaccessible when you arrive, you get a full
              refund right away and ezPark shows you other available spaces for the same event. If you rebook, you pay
              the new space&apos;s price.
            </li>
          </ul>
        </section>

        <section>
          <h2>7. Damage deposit</h2>
          <ul>
            <li>
              A refundable hold (default $100) is placed on the Driver&apos;s card about 24 hours before the event. If
              the hold fails, the Driver has 12 hours to update their card, after which the booking is cancelled and
              refunded.
            </li>
            <li>The hold is released automatically after the booking ends unless the Host files a claim.</li>
            <li>
              Hosts may file a damage claim with photos within 48 hours of the booking ending. The Driver may respond.
              ezPark reviews the claim and may capture all or part of the deposit for the Host.
            </li>
            <li>Damage beyond the deposit amount is not covered by ezPark during this pilot.</li>
          </ul>
        </section>

        <section>
          <h2>8. Changes to these terms</h2>
          <p>When these terms change, you&apos;ll be asked to accept the new version before continuing to use ezPark.</p>
        </section>
      </div>
    </article>
  );
}
