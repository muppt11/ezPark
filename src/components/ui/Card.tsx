import type { HTMLAttributes } from "react";

/** White surface with soft shadow, as used for listing and checkout cards in ui_inspo. */
export function Card({ className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-card border border-border bg-surface shadow-card ${className}`}
      {...rest}
    />
  );
}
