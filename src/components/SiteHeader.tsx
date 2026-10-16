import Link from "next/link";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="text-2xl font-extrabold tracking-tight text-primary">
          ez<span className="text-accent">Park</span>
        </Link>
        <nav className="flex items-center gap-3">
          {/* Driver / Host role switcher goes here in the auth step. */}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
