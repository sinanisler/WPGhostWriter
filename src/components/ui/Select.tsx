import React from "react";
import { clsx } from "../../lib/utils";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({
  label,
  error,
  options,
  className,
  id,
  ...props
}: SelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-medium text-neutral-400"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={clsx(
          "bg-neutral-900 border rounded-md px-3 py-2 text-sm text-neutral-100",
          "focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500",
          error ? "border-red-500" : "border-neutral-700",
          className,
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
