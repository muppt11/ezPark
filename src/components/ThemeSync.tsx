"use client";

import { useLayoutEffect } from "react";
import { applyThemePref, THEME_COOKIE, type ThemePref } from "@/lib/theme";

/**
 * React's dev-mode remount resets <html> attributes set by the inline theme script.
 * Mounted once in the root layout to re-apply them. No-op in production.
 */
export function ThemeSync() {
  useLayoutEffect(() => {
    const m = document.cookie.match(new RegExp(`(?:^|; )${THEME_COOKIE}=([^;]*)`));
    const v = m?.[1];
    const pref: ThemePref = v === "light" || v === "dark" ? v : "system";
    applyThemePref(pref);
  }, []);
  return null;
}
