import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { ModelUsageSummary } from "../../types";
import { formatCost, formatTokens } from "../../lib/utils";

interface Props {
  models: ModelUsageSummary[];
}

const COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#06b6d4",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#f97316",
  "#84cc16",
];

export function TokenBreakdown({ models }: Props) {
  if (models.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-neutral-600 text-sm">
        No model usage data
      </div>
    );
  }

  const data = models.map((m) => ({
    name: m.model.split("/").pop() ?? m.model,
    value: m.total_tokens,
    cost: m.estimated_cost,
  }));

  return (
    <div className="flex items-start gap-4">
      <ResponsiveContainer width={160} height={160}>
        <PieChart>
          <Pie
            data={data}
            cx={70}
            cy={70}
            innerRadius={45}
            outerRadius={70}
            dataKey="value"
            paddingAngle={2}
          >
            {data.map((_, idx) => (
              <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) =>
              active && payload?.length ? (
                <div className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs">
                  <p className="text-neutral-300">{payload[0].name}</p>
                  <p className="text-blue-400">
                    {formatTokens(payload[0].value as number)}
                  </p>
                  <p className="text-neutral-500">
                    {formatCost((payload[0] as any).payload.cost)}
                  </p>
                </div>
              ) : null
            }
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="flex-1 space-y-1.5 pt-2">
        {data.map((d, idx) => (
          <div key={idx} className="flex items-center gap-2 text-xs">
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: COLORS[idx % COLORS.length] }}
            />
            <span className="text-neutral-400 truncate flex-1">{d.name}</span>
            <span className="text-neutral-500 shrink-0">
              {formatTokens(d.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
