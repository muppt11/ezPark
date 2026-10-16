"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LocateFixed } from "lucide-react";
import { NEAR_COOKIE } from "@/lib/near";

/** Asks the browser for location once, stores a rounded point in a cookie, and re-ranks events. */
export function UseMyLocation() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "busy" | "denied">("idle");

  return (
    <button
      type="button"
      disabled={status === "busy"}
      onClick={() => {
        if (!navigator.geolocation) return setStatus("denied");
        setStatus("busy");
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            // ~1 km precision is plenty for ranking venues.
            const v = `${pos.coords.latitude.toFixed(2)},${pos.coords.longitude.toFixed(2)}`;
            document.cookie = `${NEAR_COOKIE}=${v}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
            setStatus("idle");
            router.refresh();
          },
          () => setStatus("denied"),
          { timeout: 10_000 },
        );
      }}
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary disabled:opacity-60"
    >
      <LocateFixed size={15} />
      {status === "busy" ? "Locating…" : status === "denied" ? "Location unavailable" : "Use my location"}
    </button>
  );
}
