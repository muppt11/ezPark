import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "accent" | "secondary" | "ghost" | "danger";
type Size = "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-text hover:opacity-90",
  accent: "bg-accent text-accent-text hover:opacity-90",
  secondary: "border border-border-strong bg-surface text-text hover:bg-surface-subtle",
  ghost: "text-primary hover:bg-surface-subtle",
  danger: "bg-danger text-white hover:opacity-90",
};

const sizes: Record<Size, string> = {
  md: "h-10 px-4 text-[15px]",
  lg: "h-12 px-6 text-base",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  fullWidth = false,
}: Pick<ButtonProps, "variant" | "size" | "fullWidth"> = {}) {
  return `inline-flex items-center justify-center gap-2 rounded-control font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${fullWidth ? "w-full" : ""}`;
}

export function Button({ variant, size, fullWidth, className = "", type = "button", ...rest }: ButtonProps) {
  return <button type={type} className={`${buttonClasses({ variant, size, fullWidth })} ${className}`} {...rest} />;
}
