import type { UsageSummary } from '../../types';
import { formatCost } from '../../lib/utils';

interface StatsOverviewProps {
  totalTasks: number;
  runningTasks: number;
  postsToday: number;
  summary: UsageSummary | null;
}

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}

function StatCard({ label, value, sub, color = 'text-neutral-100' }: StatCardProps) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
      <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-neutral-600 mt-1">{sub}</p>}
    </div>
  );
}

export function StatsOverview({ totalTasks, runningTasks, postsToday, summary }: StatsOverviewProps) {
  const todayCost = summary?.daily_breakdown
    .filter((d) => d.date === new Date().toISOString().split('T')[0])
    .reduce((a, b) => a + b.estimated_cost, 0) ?? 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard label="Total Tasks" value={totalTasks} />
      <StatCard
        label="Running"
        value={runningTasks}
        color={runningTasks > 0 ? 'text-blue-400' : 'text-neutral-100'}
      />
      <StatCard label="Posts Published" value={postsToday} sub="all time" />
      <StatCard
        label="Today's Cost"
        value={formatCost(todayCost)}
        sub={summary ? `${formatCost(summary.total_cost)} total` : undefined}
        color="text-blue-400"
      />
    </div>
  );
}
