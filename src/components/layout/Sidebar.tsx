import { NavLink } from "react-router-dom";
import { clsx } from "../../lib/utils";
import { useTaskStore } from "../../stores/taskStore";
import { useUsageStore } from "../../stores/usageStore";
import { formatCost } from "../../lib/utils";

const navItems = [
  { to: "/", label: "Dashboard", icon: "◈" },
  { to: "/tasks", label: "Tasks", icon: "✦" },
  { to: "/sites", label: "Sites", icon: "◎" },
  { to: "/usage", label: "Usage", icon: "◉" },
  { to: "/settings", label: "Settings", icon: "⚙" },
];

export function Sidebar() {
  const tasks = useTaskStore((s) => s.tasks);
  const summary = useUsageStore((s) => s.summary);

  const runningCount = tasks.filter((t) => t.status === "running").length;

  return (
    <aside className="flex flex-col w-[200px] min-w-[200px] bg-neutral-950 border-r border-neutral-800 h-screen">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-neutral-800">
        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
          WG
        </div>
        <span className="font-semibold text-sm text-neutral-100">
          WPGhostWriter
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-0.5 transition-colors",
                isActive
                  ? "bg-blue-600/20 text-blue-400"
                  : "text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800",
              )
            }
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Status bar */}
      <div className="px-4 py-3 border-t border-neutral-800 text-xs text-neutral-600">
        {runningCount > 0 && (
          <div className="flex items-center gap-1.5 text-blue-500 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            {runningCount} task{runningCount > 1 ? "s" : ""} running
          </div>
        )}
        {summary && (
          <div className="text-neutral-600">
            Today:{" "}
            {formatCost(
              summary.daily_breakdown
                .filter(
                  (d) => d.date === new Date().toISOString().split("T")[0],
                )
                .reduce((a, b) => a + b.estimated_cost, 0),
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
