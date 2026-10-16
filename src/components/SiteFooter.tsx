import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="hidden border-t border-border md:block">
      <div className="flex w-full items-center justify-between px-4 py-6 text-sm text-muted lg:px-8">
        <p>ezPark · Event-day driveway parking in Austin</p>
        <nav className="flex gap-6">
          <Link href="/find" className="hover:text-text">
            Find parking
          </Link>
          <Link href="/host" className="hover:text-text">
            Rent out your driveway
          </Link>
          <Link href="/terms" className="hover:text-text">
            Terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}
