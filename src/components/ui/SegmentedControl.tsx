"use client";

import type { ReactNode } from "react";

export type SegmentOption<T extends string> = {
  value: T;
  label: ReactNode;
  /** Accessible name when `label` is icon-only. */
  ariaLabel?: string;
};

type Props<T extends string> = {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  size?: "sm" | "md";
  /** Tint the selected segment with the accent color (used for Host mode). */
  tone?: "default" | "accent";
  className?: string;
};

/** Pill-style toggle group, modeled on the Hourly/Daily | Monthly switch in ui_inspo. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  size = "md",
  tone = "default",
  className = "",
}: Props<T>) {
  const pad = size === "sm" ? "h-8 px-2.5 text-sm" : "h-10 px-4 text-[15px]";
  const selected =
    tone === "accent"
      ? "bg-accent text-accent-text shadow-card"
      : "bg-surface text-text shadow-card";

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`inline-flex rounded-control bg-surface-subtle p-1 ${className}`}
    >
      {options.map((opt) => {
        const isOn = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isOn}
            aria-label={opt.ariaLabel}
            title={opt.ariaLabel}
            onClick={() => onChange(opt.value)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-[0.375rem] font-medium transition-colors ${pad} ${
              isOn ? selected : "text-muted hover:text-text"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
