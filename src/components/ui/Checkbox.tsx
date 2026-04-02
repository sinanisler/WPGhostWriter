import { clsx } from "../../lib/utils";

interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
  className?: string;
}

export function Checkbox({
  label,
  checked,
  onChange,
  hint,
  className,
}: CheckboxProps) {
  return (
    <label
      className={clsx("flex items-start gap-3 cursor-pointer group", className)}
    >
      <div className="relative mt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={clsx(
            "w-4 h-4 rounded border flex items-center justify-center transition-colors",
            checked
              ? "bg-blue-600 border-blue-600"
              : "bg-neutral-900 border-neutral-600 group-hover:border-neutral-500",
          )}
        >
          {checked && (
            <svg
              className="w-2.5 h-2.5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </div>
      </div>
      <div className="flex flex-col">
        <span className="text-sm text-neutral-200">{label}</span>
        {hint && <span className="text-xs text-neutral-500">{hint}</span>}
      </div>
    </label>
  );
}
