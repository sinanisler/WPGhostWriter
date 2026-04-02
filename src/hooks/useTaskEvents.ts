import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import type { TaskProgressPayload } from "../types";
import { useTaskStore } from "../stores/taskStore";

export function useTaskEvents() {
  const updateFromEvent = useTaskStore((s) => s.updateFromEvent);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen<TaskProgressPayload>("task-progress", (event) => {
      updateFromEvent(event.payload);
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      unlisten?.();
    };
  }, [updateFromEvent]);
}
