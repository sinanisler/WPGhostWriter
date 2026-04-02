import { create } from 'zustand';
import type { UsageSummary, TaskCostRow } from '../types';
import * as api from '../lib/tauri';

type Range = '7d' | '30d' | '90d' | 'all';

interface UsageStore {
  summary: UsageSummary | null;
  taskCosts: TaskCostRow[];
  range: Range;
  loading: boolean;
  setRange: (r: Range) => void;
  fetchSummary: () => Promise<void>;
  fetchTaskCosts: () => Promise<void>;
}

export const useUsageStore = create<UsageStore>((set, get) => ({
  summary: null,
  taskCosts: [],
  range: '30d',
  loading: false,

  setRange: (range) => {
    set({ range });
    get().fetchSummary();
  },

  fetchSummary: async () => {
    set({ loading: true });
    try {
      const summary = await api.getUsageSummary(get().range);
      set({ summary, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchTaskCosts: async () => {
    try {
      const taskCosts = await api.getTaskCosts();
      set({ taskCosts });
    } catch {}
  },
}));
