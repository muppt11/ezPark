"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleUserRound, House, Menu, Search, Ticket, X } from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import type { NavUser } from "./types";
import { useDismiss } from "./use-dismiss";

/** Phone navigation: a fixed bottom tab bar, as in the ui_inspo mobile screens. */
export function BottomNav({ user }: { user: NavUser }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setMoreOpen(false), []);
  useDismiss(sheetRef, moreOpen, close);

  const accountHref = user ? "/account" : "/login";
  const accountActive = ["/account", "/login", "/signup"].includes(pathname);

  return (
    <>
      {moreOpen && <div className="fixed inset-0 z-40 bg-black/30 md:hidden" aria-hidden />}
      {moreOpen && (
        <div
          ref={sheetRef}
          role="dialog"
          aria-label="More"
          className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-border bg-surface px-4 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-card md:hidden"
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="font-semibold">More</p>
            <button type="button" onClick={close} aria-label="Close" className="rounded-control p-2 hover:bg-surface-subtle">
              <X size={20} />
            </button>
          </div>
          <p className="mb-2 text-sm text-muted">Appearance</p>
          <ThemeToggle className="w-full" />
          <div className="mt-4 divide-y divide-border border-t border-border">
            <Link href="/terms" onClick={close} className="block py-3.5">
              Terms
            </Link>
            {user ? (
              <form action={logout}>
                <button type="submit" className="w-full py-3.5 text-left">
                  Log out
                </button>
              </form>
            ) : (
              <Link href="/signup" onClick={close} className="block py-3.5">
                Sign up
              </Link>
            )}
          </div>
        </div>
      )}

      <nav
        aria-label="Tabs"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <Tab
          href="/find"
          active={pathname === "/" || pathname.startsWith("/find") || pathname.startsWith("/spots")}
          icon={<Search size={22} />}
          label="Find parking"
        />
        <Tab href="/parking" active={pathname.startsWith("/parking") || pathname.startsWith("/book")} icon={<Ticket size={22} />} label="My parking" />
        <Tab href="/host" active={pathname.startsWith("/host")} icon={<House size={22} />} label="Rent out" />
        <Tab
          href={accountHref}
          active={accountActive}
          icon={<CircleUserRound size={22} />}
          label={user ? "Account" : "Log in"}
        />
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={`flex flex-col items-center gap-1 py-2 text-[10px] font-medium uppercase tracking-wide ${moreOpen ? "text-primary" : "text-muted"}`}
        >
          <Menu size={22} />
          More
        </button>
      </nav>
    </>
  );
}

function Tab({ href, active, icon, label }: { href: string; active: boolean; icon: ReactNode; label: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex flex-col items-center gap-1 py-2 text-[10px] font-medium uppercase tracking-wide ${active ? "text-primary" : "text-muted"}`}
    >
      {icon}
      {label}
    </Link>
  );
}
