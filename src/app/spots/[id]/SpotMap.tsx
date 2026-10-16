"use client";

import { useMemo } from "react";
import { ParkingMap } from "@/components/map/ParkingMap";

/** Venue pin plus a 200 m circle around the fuzzed point (the real spot is within ~180 m of it). */
export function SpotMap({ venue, lat, lng }: { venue: { name: string; lat: number; lng: number }; lat: number; lng: number }) {
  const circle = useMemo(() => ({ lat, lng, radiusMeters: 200 }), [lat, lng]);
  return <ParkingMap venue={venue} pins={[]} approxCircle={circle} />;
}
