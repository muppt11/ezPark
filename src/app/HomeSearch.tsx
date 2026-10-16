"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";

type Tab = "driver" | "host";

/** Two-tab search panel, modeled on the Hourly/Daily | Monthly panel in ui_inspo. */
export function HomeSearch() {
  const tab: Tab = useSearchParams().get("tab") === "host" ? "host" : "driver";
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="mt-8">
      <SegmentedControl<Tab>
        ariaLabel="What are you here to do?"
        className="w-full"
        value={tab}
        onChange={(t) => router.replace(t === "host" ? `${pathname}?tab=host` : pathname, { scroll: false })}
        options={[
          { value: "driver", label: "Find parking" },
          { value: "host", label: "Rent my driveway" },
        ]}
      />

      {tab === "driver" ? (
        <form action="/find" className="mt-4 space-y-4">
          <label className="flex h-16 items-center gap-3 rounded-control border border-border-strong bg-surface px-4 focus-within:outline-2 focus-within:outline-primary">
            <Search size={20} className="shrink-0 text-muted" />
            <span className="sr-only">Where are you going?</span>
            <input
              name="q"
              autoComplete="off"
              placeholder="Where are you going?"
              className="w-full bg-transparent text-[17px] outline-none placeholder:text-muted"
            />
          </label>
          <Button type="submit" size="lg" fullWidth>
            Find parking spots
          </Button>
          <p className="text-sm text-muted">Search a stadium, arena or event. Drivers see the exact address after booking.</p>
        </form>
      ) : (
        <div className="mt-4 space-y-4">
          <ul className="divide-y divide-border rounded-control border border-border-strong bg-surface text-[15px]">
            <li className="px-4 py-3.5">List your driveway for one event in about a minute.</li>
            <li className="px-4 py-3.5">You set the price, the hours and how many cars fit.</li>
            <li className="px-4 py-3.5">Get paid after each event. ezPark keeps a 10% fee.</li>
          </ul>
          <Link href="/host" className={buttonClasses({ size: "lg", fullWidth: true })}>
            List your driveway
          </Link>
        </div>
      )}
    </div>
  );
}
