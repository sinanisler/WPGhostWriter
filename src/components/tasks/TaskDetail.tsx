import { useEffect, useState, useRef } from "react";
import type { TaskWithPosts, TaskLog } from "../../types";
import { statusBadge } from "../ui/Badge";
import { ProgressBar } from "../ui/ProgressBar";
import { Button } from "../ui/Button";
import { formatCost, formatDate, stepLabel } from "../../lib/utils";
import * as api from "../../lib/tauri";
import { useToast } from "../ui/Toast";
import { useTaskStore } from "../../stores/taskStore";

interface TaskDetailProps {
  taskId: string;
}

export function TaskDetail({ taskId }: TaskDetailProps) {
  const [data, setData] = useState<TaskWithPosts | null>(null);
  const [logs, setLogs] = useState<TaskLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { fetchTasks } = useTaskStore();
  const logEndRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const [taskData, taskLogs] = await Promise.all([
        api.getTask(taskId),
        api.getTaskLogs(taskId, 100),
      ]);
      setData(taskData);
      setLogs(taskLogs);
    } catch (e) {
      toast(`Error loading task: ${e}`, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, [taskId]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleAction = async (action: string) => {
    try {
      if (action === "start") await api.startTask(taskId);
      else if (action === "pause") await api.pauseTask(taskId);
      else if (action === "resume") await api.resumeTask(taskId);
      else if (action === "cancel") await api.cancelTask(taskId);
      toast(`Task ${action}ed`, "success");
      fetchTasks();
      setTimeout(load, 500);
    } catch (e) {
      toast(`Failed to ${action}: ${e}`, "error");
    }
  };

  if (loading) {
    return (
      <div className="text-neutral-500 text-sm py-8 text-center">
        Loading...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-red-400 text-sm py-8 text-center">
        Failed to load task
      </div>
    );
  }

  const { task, posts } = data;
  const progress =
    task.post_count > 0 ? (task.posts_completed / task.post_count) * 100 : 0;

  const logLevelColor = (level: string) => {
    if (level === "error") return "text-red-400";
    if (level === "warn") return "text-yellow-400";
    if (level === "info") return "text-blue-400";
    return "text-neutral-500";
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-semibold text-neutral-100">
              {task.name}
            </h3>
            {statusBadge(task.status)}
          </div>
          <p className="text-xs text-neutral-500 max-w-md">{task.prompt}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {task.status === "pending" && (
            <Button size="sm" onClick={() => handleAction("start")}>
              Start
            </Button>
          )}
          {task.status === "running" && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleAction("pause")}
            >
              Pause
            </Button>
          )}
          {task.status === "paused" && (
            <Button size="sm" onClick={() => handleAction("resume")}>
              Resume
            </Button>
          )}
          {(task.status === "running" || task.status === "paused") && (
            <Button
              size="sm"
              variant="danger"
              onClick={() => handleAction("cancel")}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          {
            label: "Posts",
            value: `${task.posts_completed}/${task.post_count}`,
          },
          { label: "Step", value: stepLabel(task.current_step) },
          { label: "Cost", value: formatCost(task.total_estimated_cost) },
          {
            label: "Tokens",
            value: String(
              task.total_prompt_tokens + task.total_completion_tokens,
            ),
          },
        ].map((s) => (
          <div key={s.label} className="bg-neutral-950 rounded-lg p-3">
            <p className="text-xs text-neutral-600">{s.label}</p>
            <p className="text-sm font-medium text-neutral-200 mt-0.5">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <ProgressBar value={progress} label="Progress" />

      {/* Post table */}
      <div>
        <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
          Posts
        </h4>
        <div className="border border-neutral-800 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-neutral-950 text-neutral-500">
                <th className="text-left px-3 py-2 w-8">#</th>
                <th className="text-left px-3 py-2">Title</th>
                <th className="text-left px-3 py-2 w-28">Status</th>
                <th className="text-left px-3 py-2 w-20">Cost</th>
                <th className="text-left px-3 py-2 w-32">Published</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id} className="border-t border-neutral-800/50">
                  <td className="px-3 py-2 text-neutral-600">
                    {post.sequence_number}
                  </td>
                  <td className="px-3 py-2 text-neutral-300 max-w-xs">
                    <span className="truncate block">
                      {post.title ?? "..."}
                    </span>
                    {post.excerpt && (
                      <span className="text-neutral-600 text-xs truncate block">
                        {post.excerpt}
                      </span>
                    )}
                    {post.error_message && (
                      <span className="text-red-400 text-xs block">
                        {post.error_message}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">{statusBadge(post.status)}</td>
                  <td className="px-3 py-2 text-neutral-500">
                    {formatCost(post.estimated_cost)}
                  </td>
                  <td className="px-3 py-2 text-neutral-600">
                    {post.published_at ? formatDate(post.published_at) : "—"}
                  </td>
                </tr>
              ))}
              {posts.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-6 text-center text-neutral-600"
                  >
                    No posts yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log feed */}
      <div>
        <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
          Activity Log
        </h4>
        <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 h-48 overflow-y-auto font-mono text-xs space-y-0.5">
          {logs.length === 0 && (
            <div className="text-neutral-700 py-2 text-center">
              No log entries yet
            </div>
          )}
          {logs.map((log) => (
            <div key={log.id} className="flex gap-2">
              <span className="text-neutral-700 shrink-0">
                {log.created_at.split("T")[1]?.split(".")[0] ?? ""}
              </span>
              <span className={logLevelColor(log.level)}>
                [{log.level.toUpperCase()}]
              </span>
              <span className="text-neutral-400">{log.message}</span>
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
}
