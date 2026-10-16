import { useId, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

type Props = SelectHTMLAttributes<HTMLSelectElement> & { label: string; hint?: string };

/** Native select styled to match Field. */
export function Select({ label, hint, className = "", id, children, ...rest }: Props) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <div className={className}>
      <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <select
          id={selectId}
          aria-describedby={hint ? `${selectId}-hint` : undefined}
          className="h-12 w-full appearance-none rounded-control border border-border-strong bg-surface pr-10 pl-3.5 text-[16px] text-text focus-visible:outline-2 focus-visible:outline-primary"
          {...rest}
        >
          {children}
        </select>
        <ChevronDown size={18} className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-muted" />
      </div>
      {hint && (
        <p id={`${selectId}-hint`} className="mt-1.5 text-sm text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
