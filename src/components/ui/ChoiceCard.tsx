import type { ReactNode } from "react";
import { Check } from "lucide-react";

type Props = {
  name: string;
  title: string;
  description: string;
  icon: ReactNode;
  defaultChecked?: boolean;
  tone?: "primary" | "accent";
};

/**
 * Large checkbox card for multi-select choices (e.g. Driver / Host at sign-up).
 * A native checkbox drives the state, so it works without JavaScript.
 */
export function ChoiceCard({ name, title, description, icon, defaultChecked, tone = "primary" }: Props) {
  const on =
    tone === "accent"
      ? "has-[:checked]:border-accent has-[:checked]:bg-accent-subtle"
      : "has-[:checked]:border-primary has-[:checked]:bg-surface-subtle";
  const box =
    tone === "accent"
      ? "peer-checked:border-accent peer-checked:bg-accent peer-checked:text-accent-text"
      : "peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-text";

  return (
    <label
      className={`relative flex cursor-pointer gap-3 rounded-card border-2 border-border bg-surface p-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary ${on}`}
    >
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="peer sr-only" />
      <span className={`mt-0.5 shrink-0 ${tone === "accent" ? "text-accent" : "text-primary"}`}>{icon}</span>
      <span className="flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="mt-0.5 block text-sm text-muted">{description}</span>
      </span>
      <span
        aria-hidden
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 border-border-strong text-transparent ${box}`}
      >
        <Check size={16} strokeWidth={3} />
      </span>
    </label>
  );
}
