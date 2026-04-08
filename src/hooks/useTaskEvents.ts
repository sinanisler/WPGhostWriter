import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import type { TaskProgressPayload } from "../types";
import { useTaskStore } from "../stores/taskStore";

export function useTaskEvents() {
  const updateFromEvent = useTaskStore((s) => s.updateFromEvent);
  const fetchTasks = useTaskStore((s) => s.fetchTasks);

  useEffect(() => {
    let unlistenProgress: (() => void) | undefined;
    let unlistenTick: (() => void) | undefined;

    listen<TaskProgressPayload>("task-progress", (event) => {
      updateFromEvent(event.payload);
    }).then((fn) => {
      unlistenProgress = fn;
    });

    // Backend ticker fires every 30 s – use it to refresh task list so
    // status changes (waiting intervals, completions) surface in the UI.
    listen("app-tick", () => {
      fetchTasks();
    }).then((fn) => {
      unlistenTick = fn;
    });

    return () => {
      unlistenProgress?.();
      unlistenTick?.();
    };
  }, [updateFromEvent, fetchTasks]);
}
