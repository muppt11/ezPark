"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { LngLatBounds, Map as MapLibre, Marker, NavigationControl, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useResolvedTheme } from "@/lib/use-theme";

/** OpenFreeMap (OpenStreetMap data), no API key. */
const STYLES = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
} as const;

// Copied into public/ by scripts/copy-maplibre-worker.mjs (runs on npm install).
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

export type MapPin = { id: string; lat: number; lng: number; label: string };

type Props = {
  venue: { name: string; lat: number; lng: number };
  pins: MapPin[];
  activeId?: string | null;
  onHover?: (id: string | null) => void;
  onSelect?: (id: string) => void;
  /** Draw a soft circle around a single approximate location (listing detail page). */
  approxCircle?: { lat: number; lng: number; radiusMeters: number };
  interactive?: boolean;
  className?: string;
};

export function ParkingMap({ venue, pins, activeId, onHover, onSelect, approxCircle, interactive = true, className = "" }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibre | null>(null);
  const theme = useResolvedTheme();
  // Latest callbacks for DOM marker listeners, without re-creating markers.
  const handlers = useRef({ onHover, onSelect });
  useLayoutEffect(() => {
    handlers.current = { onHover, onSelect };
  });

  // Create the map once.
  useEffect(() => {
    if (!container.current) return;
    const m = new MapLibre({
      container: container.current,
      style: STYLES[document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light"],
      center: [venue.lng, venue.lat],
      zoom: 14,
      attributionControl: { compact: true },
      interactive,
    });
    if (interactive) m.addControl(new NavigationControl({ showCompass: false }), "top-right");

    const el = document.createElement("div");
    el.className = "ez-venue-pin";
    el.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;
    el.append(document.createTextNode(venue.name));
    new Marker({ element: el, anchor: "bottom" }).setLngLat([venue.lng, venue.lat]).addTo(m);

    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
  }, [venue.lat, venue.lng, venue.name, interactive]);

  // Swap tile style with the theme. DOM markers survive setStyle.
  useEffect(() => {
    map.current?.setStyle(STYLES[theme]);
  }, [theme]);

  // Price pins.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const created: Marker[] = [];
    for (const p of pins) {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "ez-pin";
      el.textContent = p.label;
      el.dataset.id = p.id;
      el.setAttribute("aria-label", `${p.label} driveway`);
      el.addEventListener("mouseenter", () => handlers.current.onHover?.(p.id));
      el.addEventListener("mouseleave", () => handlers.current.onHover?.(null));
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        handlers.current.onSelect?.(p.id);
      });
      created.push(new Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(m));
    }

    const bounds = new LngLatBounds([venue.lng, venue.lat], [venue.lng, venue.lat]);
    pins.forEach((p) => bounds.extend([p.lng, p.lat]));
    if (approxCircle) bounds.extend([approxCircle.lng, approxCircle.lat]);
    const fit = () => {
      const { width, height } = m.getContainer().getBoundingClientRect();
      if (width > 0 && height > 0) m.fitBounds(bounds, { padding: 64, maxZoom: 16, duration: 0 });
    };
    fit();

    // The map may start hidden (phone list view) or change size; resize and re-fit
    // until the driver moves the map themselves.
    let userMoved = false;
    const onMove = (e: { originalEvent?: unknown }) => {
      if (e.originalEvent) userMoved = true;
    };
    m.on("movestart", onMove);
    const ro = new ResizeObserver(() => {
      m.resize();
      if (!userMoved) fit();
    });
    ro.observe(m.getContainer());

    return () => {
      ro.disconnect();
      m.off("movestart", onMove);
      created.forEach((mk) => mk.remove());
    };
  }, [pins, venue.lat, venue.lng, approxCircle]);

  // Highlight the pin for the hovered/selected card.
  useEffect(() => {
    container.current?.querySelectorAll<HTMLElement>(".ez-pin").forEach((el) => {
      const on = el.dataset.id === activeId;
      el.dataset.active = String(on);
      el.style.zIndex = on ? "10" : "";
    });
  }, [activeId, pins]);

  // Approximate-location circle, re-added after every style load (setStyle drops layers).
  useEffect(() => {
    const m = map.current;
    if (!m || !approxCircle) return;
    const add = () => {
      if (m.getSource("approx")) return;
      m.addSource("approx", { type: "geojson", data: circle(approxCircle.lat, approxCircle.lng, approxCircle.radiusMeters) });
      const color = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() || "#1d2953";
      m.addLayer({ id: "approx-fill", type: "fill", source: "approx", paint: { "fill-color": color, "fill-opacity": 0.15 } });
      m.addLayer({ id: "approx-line", type: "line", source: "approx", paint: { "line-color": color, "line-width": 2 } });
    };
    m.on("style.load", add);
    if (m.isStyleLoaded()) add();
    return () => {
      m.off("style.load", add);
    };
  }, [approxCircle, theme]);

  return <div ref={container} className={`h-full w-full ${className}`} />;
}

function circle(lat: number, lng: number, r: number): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: [number, number][] = [];
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * 2 * Math.PI;
    coords.push([
      lng + (r * Math.sin(a)) / (111_320 * Math.cos((lat * Math.PI) / 180)),
      lat + (r * Math.cos(a)) / 111_320,
    ]);
  }
  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [coords] } };
}
