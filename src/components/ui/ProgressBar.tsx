import { clsx } from "../../lib/utils";

interface ProgressBarProps {
  value: number; // 0–100
  className?: string;
  color?: string;
  label?: string;
}

export function ProgressBar({
  value,
  className,
  color = "bg-blue-500",
  label,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className={clsx("flex flex-col gap-1", className)}>
      {label && (
        <div className="flex justify-between text-xs text-neutral-500">
          <span>{label}</span>
          <span>{pct.toFixed(0)}%</span>
        </div>
      )}
      <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
        <div
          className={clsx(
            "h-full rounded-full transition-all duration-300",
            color,
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
