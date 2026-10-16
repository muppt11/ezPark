"use client";

import { useMemo } from "react";
import { ParkingMap } from "@/components/map/ParkingMap";

/** After payment: the real driveway location and the venue. */
export function ExactSpotMap({ venue, lat, lng }: { venue: { name: string; lat: number; lng: number }; lat: number; lng: number }) {
  const pins = useMemo(() => [{ id: "spot", lat, lng, label: "Your spot" }], [lat, lng]);
  return <ParkingMap venue={venue} pins={pins} activeId="spot" />;
}
