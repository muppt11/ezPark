"use client";

import { useLayoutEffect } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { applyThemePref, readThemePref, type ThemePref } from "@/lib/theme";
import { useThemePref } from "@/lib/use-theme";
import { SegmentedControl } from "./SegmentedControl";

export function ThemeToggle() {
  const pref = useThemePref();

  // React's dev-mode remount resets <html> attributes set by the inline script; re-apply them.
  useLayoutEffect(() => {
    applyThemePref(readThemePrefFromCookie() ?? readThemePref());
  }, []);

  return (
    <SegmentedControl<ThemePref>
      ariaLabel="Color theme"
      size="sm"
      value={pref}
      onChange={applyThemePref}
      options={[
        { value: "light", label: <Sun size={16} />, ariaLabel: "Light theme" },
        { value: "dark", label: <Moon size={16} />, ariaLabel: "Dark theme" },
        { value: "system", label: <Monitor size={16} />, ariaLabel: "Match system theme" },
      ]}
    />
  );
}

function readThemePrefFromCookie(): ThemePref | null {
  const m = document.cookie.match(/(?:^|; )theme=([^;]*)/);
  const v = m?.[1];
  return v === "light" || v === "dark" || v === "system" ? v : null;
}
