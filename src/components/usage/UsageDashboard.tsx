import { useEffect } from 'react';
import { useUsageStore } from '../../stores/usageStore';
import { CostChart } from './CostChart';
import { TokenBreakdown } from './TokenBreakdown';
import { formatCost, formatTokens, formatDate } from '../../lib/utils';

type Range = '7d' | '30d' | '90d' | 'all';
const RANGES: { label: string; value: Range }[] = [
  { label: '7 days', value: '7d' },
  { label: '30 days', value: '30d' },
  { label: '90 days', value: '90d' },
  { label: 'All time', value: 'all' },
];

export function UsageDashboard() {
  const { summary, taskCosts, range, setRange, fetchSummary, fetchTaskCosts } = useUsageStore();

  useEffect(() => {
    fetchSummary();
    fetchTaskCosts();
  }, [range]);

  return (
    <div className="space-y-5">
      {/* Range selector */}
      <div className="flex gap-1 bg-neutral-950 rounded-lg p-1 w-fit">
        {RANGES.map((r) => (
          <button
            key={r.value}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              range === r.value
                ? 'bg-neutral-800 text-neutral-100'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
            onClick={() => setRange(r.value)}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total Cost', value: formatCost(summary.total_cost) },
            { label: 'Total Tokens', value: formatTokens(summary.total_tokens) },
          { label: 'Requests', value: String(summary.total_requests) },
          { label: 'Models Used', value: String(summary.model_breakdown.length) },
          ].map((s) => (
            <div key={s.label} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
              <p className="text-xs text-neutral-600">{s.label}</p>
              <p className="text-xl font-semibold text-neutral-100 mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">Daily Cost</h3>
          <CostChart data={summary?.daily_breakdown ?? []} />
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">By Model</h3>
          <TokenBreakdown models={summary?.model_breakdown ?? []} />
        </div>
      </div>

      {/* Task cost table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-neutral-800">
          <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Task Costs</h3>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-neutral-950 text-neutral-500">
              <th className="text-left px-4 py-2">Task</th>
              <th className="text-left px-4 py-2 w-28">Model</th>
              <th className="text-right px-4 py-2 w-24">Tokens</th>
              <th className="text-right px-4 py-2 w-24">Cost</th>
              <th className="text-left px-4 py-2 w-32">Date</th>
            </tr>
          </thead>
          <tbody>
            {taskCosts.map((row) => (
              <tr key={row.task_id} className="border-t border-neutral-800/50">
                <td className="px-4 py-2 text-neutral-300 truncate max-w-xs">{row.task_name}</td>
                <td className="px-4 py-2 text-neutral-500 truncate">{row.model?.split('/').pop() ?? '—'}</td>
                <td className="px-4 py-2 text-right text-neutral-500">{formatTokens(row.prompt_tokens + row.completion_tokens)}</td>
                <td className="px-4 py-2 text-right text-blue-400">{formatCost(row.estimated_cost)}</td>
                <td className="px-4 py-2 text-neutral-600">{row.date ? formatDate(row.date) : '—'}</td>
              </tr>
            ))}
            {taskCosts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-neutral-600">No data for this period</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
