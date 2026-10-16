import Link from "next/link";
import { Suspense } from "react";
import { DesktopNavSlot } from "@/components/nav/NavSlots";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="flex h-16 w-full items-center justify-between gap-4 px-4 lg:px-8">
        <Link href="/" className="text-[26px] font-extrabold tracking-tight text-primary">
          ezPark
        </Link>
        <Suspense fallback={<div className="hidden h-10 w-96 md:block" />}>
          <DesktopNavSlot />
        </Suspense>
      </div>
    </header>
  );
}
