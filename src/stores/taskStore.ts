import { create } from "zustand";
import type { Task, TaskProgressPayload } from "../types";
import * as api from "../lib/tauri";

interface TaskStore {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  fetchTasks: () => Promise<void>;
  addTask: (task: Task) => void;
  updateFromEvent: (payload: TaskProgressPayload) => void;
  removeTask: (id: string) => void;
}

export const useTaskStore = create<TaskStore>((set) => ({
  tasks: [],
  loading: false,
  error: null,

  fetchTasks: async () => {
    set({ loading: true, error: null });
    try {
      const tasks = await api.listTasks();
      set({ tasks, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  addTask: (task) => set((s) => ({ tasks: [task, ...s.tasks] })),

  updateFromEvent: (payload) => {
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === payload.task_id
          ? {
              ...t,
              status: payload.status,
              current_step: payload.current_step,
              posts_completed: payload.posts_completed,
              total_estimated_cost: payload.cost_so_far,
            }
          : t,
      ),
    }));
  },

  removeTask: (id) =>
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
}));
