import type { Task } from "../../types";
import { statusBadge } from "../ui/Badge";
import { ProgressBar } from "../ui/ProgressBar";
import { formatCost, stepLabel } from "../../lib/utils";
import { useNavigate } from "react-router-dom";

interface TaskCardProps {
  task: Task;
}

export function TaskCard({ task }: TaskCardProps) {
  const navigate = useNavigate();
  const progress =
    task.post_count > 0 ? (task.posts_completed / task.post_count) * 100 : 0;

  return (
    <div
      className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 cursor-pointer hover:border-neutral-700 transition-colors"
      onClick={() => navigate(`/tasks?id=${task.id}`)}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-neutral-100 truncate">
            {task.name}
          </h3>
          <p className="text-xs text-neutral-500 truncate mt-0.5">
            {task.prompt}
          </p>
        </div>
        <div className="shrink-0">{statusBadge(task.status)}</div>
      </div>

      <ProgressBar
        value={progress}
        label={`${task.posts_completed}/${task.post_count} posts`}
        className="mb-3"
      />

      <div className="flex items-center justify-between text-xs text-neutral-500">
        <span>{stepLabel(task.current_step)}</span>
        <span className="text-blue-400">
          {formatCost(task.total_estimated_cost)}
        </span>
      </div>
    </div>
  );
}
