import type { ReactNode } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";

/** Inline status message for forms and confirmations. */
export function Alert({ tone, children }: { tone: "error" | "success"; children: ReactNode }) {
  const Icon = tone === "error" ? CircleAlert : CircleCheck;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-2 rounded-control border bg-surface px-3.5 py-3 text-sm ${
        tone === "error" ? "border-danger text-danger" : "border-success text-success"
      }`}
    >
      <Icon size={18} className="mt-px shrink-0" />
      <div>{children}</div>
    </div>
  );
}
