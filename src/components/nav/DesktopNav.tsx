"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, CircleUserRound } from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import type { NavUser } from "./types";
import { useDismiss } from "./use-dismiss";

const linkClass = "rounded-control px-3 py-2 text-[15px] font-medium text-text hover:text-primary";
const itemClass = "block w-full rounded-control px-3 py-2.5 text-left text-[15px] hover:bg-surface-subtle";

/** Header links + account dropdown, modeled on the ui_inspo landing header. Hidden on phones (see BottomNav). */
export function DesktopNav({ user }: { user: NavUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  return (
    <nav aria-label="Main" className="hidden items-center gap-2 md:flex">
      <Link href="/find" className={linkClass}>
        Find parking
      </Link>
      {user && (
        <Link href="/parking" className={linkClass}>
          My parking
        </Link>
      )}
      <Link href="/host" className={linkClass}>
        Rent out your driveway
      </Link>

      <div ref={ref} className="relative ml-2">
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 rounded-control px-3 py-2 text-[15px] font-medium hover:text-primary"
        >
          <CircleUserRound size={22} strokeWidth={1.75} />
          {user ? user.firstName : "Log in or Sign up"}
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {open && (
          <div
            role="menu"
            onClick={(e) => (e.target as HTMLElement).closest("a") && close()}
            className="absolute right-0 top-full z-50 mt-2 w-64 rounded-card border border-border bg-surface p-2 shadow-card"
          >
            {user ? (
              <>
                <Link role="menuitem" href="/account" className={itemClass}>
                  Account
                </Link>
                <Link role="menuitem" href="/parking" className={itemClass}>
                  My parking
                </Link>
                <Link role="menuitem" href="/host" className={itemClass}>
                  Hosting
                </Link>
                <form action={logout}>
                  <button role="menuitem" type="submit" className={itemClass}>
                    Log out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link role="menuitem" href="/login" className={itemClass}>
                  Log in
                </Link>
                <Link role="menuitem" href="/signup" className={itemClass}>
                  Sign up
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
