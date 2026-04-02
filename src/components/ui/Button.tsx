import React from "react";
import { clsx } from "../../lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-base",
  };
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-500 text-white",
    secondary:
      "bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700",
    danger: "bg-red-900/60 hover:bg-red-800 text-red-300 border border-red-800",
    ghost: "hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200",
  };

  return (
    <button
      className={clsx(base, sizes[size], variants[variant], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}
