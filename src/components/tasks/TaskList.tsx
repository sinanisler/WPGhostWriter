import { useEffect, useState } from "react";
import { useTaskStore } from "../../stores/taskStore";
import { useSiteStore } from "../../stores/siteStore";
import { TopBar } from "../layout/TopBar";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { TaskCreator } from "./TaskCreator";
import { TaskEditor } from "./TaskEditor";
import { TaskDetail } from "./TaskDetail";
import { statusBadge } from "../ui/Badge";
import { ProgressBar } from "../ui/ProgressBar";
import { formatCost, stepLabel } from "../../lib/utils";
import * as api from "../../lib/tauri";
import { useToast } from "../ui/Toast";
import { useSearchParams } from "react-router-dom";
import type { Task } from "../../types";

export function TaskList() {
  const { tasks, fetchTasks, removeTask } = useTaskStore();
  const { fetchSites } = useSiteStore();
  const { toast } = useToast();
  const [showCreator, setShowCreator] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchParams] = useSearchParams();

  // Bulk selection
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    fetchTasks();
    fetchSites();
  }, []);

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) setSelectedId(id);
  }, [searchParams]);

  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (checkedIds.size === tasks.length) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(tasks.map((t) => t.id)));
    }
  };

  const handleStart = async (id: string) => {
    try {
      await api.startTask(id);
      toast("Task started", "success");
      fetchTasks();
    } catch (e) {
      toast(`Failed to start: ${e}`, "error");
    }
  };

  const handlePause = async (id: string) => {
    try {
      await api.pauseTask(id);
      toast("Task paused", "info");
    } catch (e) {
      toast(`Failed to pause: ${e}`, "error");
    }
  };

  const handleResume = async (id: string) => {
    try {
      await api.resumeTask(id);
      toast("Task resumed", "success");
    } catch (e) {
      toast(`Failed to resume: ${e}`, "error");
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await api.cancelTask(id);
      toast("Task cancelled", "warning");
      fetchTasks();
    } catch (e) {
      toast(`Failed to cancel: ${e}`, "error");
    }
  };

  const handleRestart = async (id: string) => {
    try {
      await api.restartTask(id);
      toast("Task restarted", "success");
      fetchTasks();
    } catch (e) {
      toast(`Failed to restart: ${e}`, "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this task and all its posts?")) return;
    try {
      await api.deleteTask(id);
      removeTask(id);
      setCheckedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast("Task deleted", "success");
    } catch (e) {
      toast(`Failed to delete: ${e}`, "error");
    }
  };

  const bulkCancel = async () => {
    if (!checkedIds.size) return;
    setBulkLoading(true);
    let failed = 0;
    for (const id of checkedIds) {
      const task = tasks.find((t) => t.id === id);
      if (task && (task.status === "running" || task.status === "paused")) {
        try {
          await api.cancelTask(id);
        } catch {
          failed++;
        }
      }
    }
    setBulkLoading(false);
    toast(
      failed ? `Cancelled with ${failed} error(s)` : "Selected tasks cancelled",
      failed ? "error" : "warning",
    );
    fetchTasks();
  };

  const bulkDelete = async () => {
    if (!checkedIds.size) return;
    if (
      !confirm(
        `Delete ${checkedIds.size} task(s) and all their posts? This cannot be undone.`,
      )
    )
      return;
    setBulkLoading(true);
    let failed = 0;
    const deleted: string[] = [];
    for (const id of checkedIds) {
      try {
        await api.deleteTask(id);
        deleted.push(id);
      } catch {
        failed++;
      }
    }
    deleted.forEach((id) => removeTask(id));
    setCheckedIds(new Set());
    setBulkLoading(false);
    toast(
      failed
        ? `Deleted ${deleted.length}, failed ${failed}`
        : `Deleted ${deleted.length} task(s)`,
      failed ? "error" : "success",
    );
  };

  const bulkStart = async () => {
    if (!checkedIds.size) return;
    setBulkLoading(true);
    let failed = 0;
    for (const id of checkedIds) {
      const task = tasks.find((t) => t.id === id);
      if (task && task.status === "pending") {
        try {
          await api.startTask(id);
        } catch {
          failed++;
        }
      }
    }
    setBulkLoading(false);
    toast(
      failed ? `Started with ${failed} error(s)` : "Selected tasks started",
      failed ? "error" : "success",
    );
    fetchTasks();
  };

  const anyRunningSelected = [...checkedIds].some((id) => {
    const t = tasks.find((x) => x.id === id);
    return t && (t.status === "running" || t.status === "paused");
  });
  const anyPendingSelected = [...checkedIds].some((id) => {
    const t = tasks.find((x) => x.id === id);
    return t && t.status === "pending";
  });

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Tasks"
        action={
          <Button size="sm" onClick={() => setShowCreator(true)}>
            + New Task
          </Button>
        }
      />

      {/* Bulk action bar */}
      {checkedIds.size > 0 && (
        <div className="flex items-center gap-3 px-6 py-2 bg-neutral-900 border-b border-neutral-800">
          <span className="text-sm text-neutral-400">
            {checkedIds.size} selected
          </span>
          <div className="flex gap-2 ml-auto">
            {anyPendingSelected && (
              <Button
                size="sm"
                onClick={bulkStart}
                loading={bulkLoading}
              >
                Start Selected
              </Button>
            )}
            {anyRunningSelected && (
              <Button
                size="sm"
                variant="secondary"
                onClick={bulkCancel}
                loading={bulkLoading}
              >
                Cancel Selected
              </Button>
            )}
            <Button
              size="sm"
              variant="danger"
              onClick={bulkDelete}
              loading={bulkLoading}
            >
              Delete Selected
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCheckedIds(new Set())}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 p-6 overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-12 text-center">
            <p className="text-neutral-500 mb-4">
              No tasks yet. Create your first content automation task.
            </p>
            <Button onClick={() => setShowCreator(true)}>Create Task</Button>
          </div>
        ) : (
          <>
            {/* Select-all row */}
            <div className="flex items-center gap-3 mb-3 px-1">
              <input
                type="checkbox"
                className="accent-blue-500 w-4 h-4 cursor-pointer"
                checked={checkedIds.size === tasks.length && tasks.length > 0}
                onChange={toggleAll}
              />
              <span className="text-xs text-neutral-600">Select all</span>
            </div>

            <div className="space-y-3">
              {tasks.map((task) => {
                const progress =
                  task.post_count > 0
                    ? (task.posts_completed / task.post_count) * 100
                    : 0;
                const isChecked = checkedIds.has(task.id);
                return (
                  <div
                    key={task.id}
                    className={`bg-neutral-900 border rounded-xl p-4 transition-colors ${
                      isChecked
                        ? "border-blue-600"
                        : "border-neutral-800 hover:border-neutral-700"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <div className="pt-0.5">
                        <input
                          type="checkbox"
                          className="accent-blue-500 w-4 h-4 cursor-pointer"
                          checked={isChecked}
                          onChange={() => toggleCheck(task.id)}
                        />
                      </div>

                      {/* Task info */}
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => setSelectedId(task.id)}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-medium text-neutral-100 truncate">
                            {task.name}
                          </h3>
                          {statusBadge(task.status)}
                        </div>
                        <p className="text-xs text-neutral-500 truncate">
                          {task.prompt}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-neutral-600">
                          <span>
                            {task.post_count} posts · {task.posts_completed}{" "}
                            done
                          </span>
                          <span>{stepLabel(task.current_step)}</span>
                          <span className="text-blue-400">
                            {formatCost(task.total_estimated_cost)}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                        {task.status === "pending" && task.posts_completed === 0 && (
                          <Button
                            size="sm"
                            onClick={() => handleStart(task.id)}
                          >
                            Start
                          </Button>
                        )}
                        {task.status === "pending" && task.posts_completed > 0 && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleRestart(task.id)}
                          >
                            Restart
                          </Button>
                        )}
                        {task.status === "running" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handlePause(task.id)}
                          >
                            Pause
                          </Button>
                        )}
                        {task.status === "paused" && (
                          <Button
                            size="sm"
                            onClick={() => handleResume(task.id)}
                          >
                            Resume
                          </Button>
                        )}
                        {(task.status === "running" ||
                          task.status === "paused") && (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleCancel(task.id)}
                          >
                            Cancel
                          </Button>
                        )}
                        {(task.status === "completed" ||
                          task.status === "failed" ||
                          task.status === "cancelled") && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleRestart(task.id)}
                          >
                            Restart
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingTask(task)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedId(task.id)}
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDelete(task.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>

                    {(task.status === "running" ||
                      task.status === "paused") && (
                      <ProgressBar value={progress} className="mt-3" />
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Task Creator Modal */}
      <Modal
        open={showCreator}
        onClose={() => setShowCreator(false)}
        title="Create New Task"
        maxWidth="max-w-3xl"
      >
        <TaskCreator
          onCreated={() => {
            setShowCreator(false);
            fetchTasks();
            toast("Task created successfully", "success");
          }}
          onCancel={() => setShowCreator(false)}
        />
      </Modal>

      {/* Task Editor Modal */}
      <Modal
        open={!!editingTask}
        onClose={() => setEditingTask(null)}
        title="Edit Task"
        maxWidth="max-w-2xl"
      >
        {editingTask && (
          <TaskEditor
            task={editingTask}
            onSaved={() => {
              setEditingTask(null);
              fetchTasks();
              toast("Task updated", "success");
            }}
            onCancel={() => setEditingTask(null)}
          />
        )}
      </Modal>

      {/* Task Detail Modal */}
      <Modal
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        title="Task Details"
        maxWidth="max-w-4xl"
      >
        {selectedId && <TaskDetail taskId={selectedId} />}
      </Modal>
    </div>
  );
}
