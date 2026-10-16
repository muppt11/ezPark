import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";

export default function Home() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
        Park in a driveway, steps from the game.
      </h1>
      <p className="mt-4 max-w-xl text-lg text-muted">
        Event-day driveway parking from neighbors near the venue. Venue search arrives in a later step.
      </p>
      <Link href="/styleguide" className={`${buttonClasses({ size: "lg" })} mt-8`}>
        View the style guide
      </Link>
    </section>
  );
}
