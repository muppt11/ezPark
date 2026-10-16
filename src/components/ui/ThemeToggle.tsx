"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { saveThemePref } from "@/app/(auth)/actions";
import { applyThemePref, type ThemePref } from "@/lib/theme";
import { useThemePref } from "@/lib/use-theme";
import { SegmentedControl } from "./SegmentedControl";

export function ThemeToggle({ className }: { className?: string }) {
  const pref = useThemePref();

  return (
    <SegmentedControl<ThemePref>
      ariaLabel="Color theme"
      size="sm"
      className={className}
      value={pref}
      onChange={(p) => {
        applyThemePref(p);
        void saveThemePref(p);
      }}
      options={[
        { value: "light", label: <><Sun size={15} /> Light</>, ariaLabel: "Light theme" },
        { value: "dark", label: <><Moon size={15} /> Dark</>, ariaLabel: "Dark theme" },
        { value: "system", label: <><Monitor size={15} /> Auto</>, ariaLabel: "Match system theme" },
      ]}
    />
  );
}
