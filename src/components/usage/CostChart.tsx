import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { DailyUsage } from "../../types";
import { formatCost } from "../../lib/utils";

interface Props {
  data: DailyUsage[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs">
        <p className="text-neutral-400 mb-1">{label}</p>
        <p className="text-blue-400">{formatCost(payload[0]?.value ?? 0)}</p>
        <p className="text-neutral-500">
          {(payload[1]?.value ?? 0).toLocaleString()} tokens
        </p>
      </div>
    );
  }
  return null;
};

export function CostChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-neutral-600 text-sm">
        No usage data yet
      </div>
    );
  }

  const chartData = data.map((d) => ({
    date: d.date.slice(5), // MM-DD
    cost: d.estimated_cost,
    tokens: d.total_tokens,
  }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart
        data={chartData}
        margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
      >
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "#525252" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#525252" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${v.toFixed(2)}`}
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
        />
        <Bar dataKey="cost" radius={[3, 3, 0, 0]}>
          {chartData.map((_, idx) => (
            <Cell key={idx} fill="#3b82f6" opacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
