import { useId, type ReactNode } from "react";

/** Native checkbox tinted with the primary token, with an optional inline error. */
export function Checkbox({ name, children, error }: { name: string; children: ReactNode; error?: string }) {
  const id = useId();
  return (
    <div>
      <div className="flex items-start gap-2.5">
        <input
          id={id}
          type="checkbox"
          name={name}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--primary)]"
        />
        <label htmlFor={id} className="text-sm leading-relaxed">
          {children}
        </label>
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
