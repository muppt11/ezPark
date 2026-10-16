"use client";

import { useSyncExternalStore } from "react";
import { readThemePref, type ResolvedTheme, type ThemePref } from "./theme";

function subscribe(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme", "data-theme-pref"],
  });
  window.addEventListener("ezpark:theme", cb);
  return () => {
    obs.disconnect();
    window.removeEventListener("ezpark:theme", cb);
  };
}

/** The user's saved preference: light, dark, or system. */
export function useThemePref(): ThemePref {
  return useSyncExternalStore(subscribe, readThemePref, () => "system");
}

/** The theme actually on screen. Use this for things CSS can't reach, like map tile styles. */
export function useResolvedTheme(): ResolvedTheme {
  return useSyncExternalStore(
    subscribe,
    () => (document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light"),
    () => "light",
  );
}
