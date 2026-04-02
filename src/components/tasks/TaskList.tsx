import { useEffect, useState } from "react";
import { useTaskStore } from "../../stores/taskStore";
import { useSiteStore } from "../../stores/siteStore";
import { TopBar } from "../layout/TopBar";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { TaskCreator } from "./TaskCreator";
import { TaskDetail } from "./TaskDetail";
import { statusBadge } from "../ui/Badge";
import { ProgressBar } from "../ui/ProgressBar";
import { formatCost, stepLabel } from "../../lib/utils";
import * as api from "../../lib/tauri";
import { useToast } from "../ui/Toast";
import { useSearchParams } from "react-router-dom";

export function TaskList() {
  const { tasks, fetchTasks, removeTask } = useTaskStore();
  const { fetchSites } = useSiteStore();
  const { toast } = useToast();
  const [showCreator, setShowCreator] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    fetchTasks();
    fetchSites();
  }, []);

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) setSelectedId(id);
  }, [searchParams]);

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

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this task and all its posts?")) return;
    try {
      await api.deleteTask(id);
      removeTask(id);
      toast("Task deleted", "success");
    } catch (e) {
      toast(`Failed to delete: ${e}`, "error");
    }
  };

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

      <div className="flex-1 p-6 overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-12 text-center">
            <p className="text-neutral-500 mb-4">
              No tasks yet. Create your first content automation task.
            </p>
            <Button onClick={() => setShowCreator(true)}>Create Task</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const progress =
                task.post_count > 0
                  ? (task.posts_completed / task.post_count) * 100
                  : 0;
              return (
                <div
                  key={task.id}
                  className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 hover:border-neutral-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
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
                          {task.post_count} posts · {task.posts_completed} done
                        </span>
                        <span>{stepLabel(task.current_step)}</span>
                        <span className="text-blue-400">
                          {formatCost(task.total_estimated_cost)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {task.status === "pending" && (
                        <Button size="sm" onClick={() => handleStart(task.id)}>
                          Start
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
                        <Button size="sm" onClick={() => handleResume(task.id)}>
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
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedId(task.id)}
                      >
                        View
                      </Button>
                      {(task.status === "completed" ||
                        task.status === "failed" ||
                        task.status === "cancelled" ||
                        task.status === "pending") && (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDelete(task.id)}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>

                  {(task.status === "running" || task.status === "paused") && (
                    <ProgressBar value={progress} className="mt-3" />
                  )}
                </div>
              );
            })}
          </div>
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
