export function formatCost(cost: number): string {
  if (cost === 0) return "$0.00";
  if (cost < 0.001) return `$${cost.toFixed(6)}`;
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(3)}`;
}

export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
  return tokens.toString();
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleString();
}

export function formatDateShort(dateStr?: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString();
}

export function stepLabel(step: string): string {
  const labels: Record<string, string> = {
    idle: "Idle",
    generating_titles: "Generating Titles",
    generating_content: "Generating Content",
    publishing: "Publishing",
    waiting: "Waiting",
  };
  return labels[step] ?? step;
}

export function statusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: "text-neutral-400",
    running: "text-blue-400",
    paused: "text-yellow-400",
    completed: "text-green-400",
    failed: "text-red-400",
    cancelled: "text-neutral-500",
    published: "text-green-400",
    title_generated: "text-blue-300",
    content_generated: "text-purple-400",
  };
  return colors[status] ?? "text-neutral-400";
}

export function clsx(
  ...classes: (string | undefined | null | false)[]
): string {
  return classes.filter(Boolean).join(" ");
}
