import { create } from 'zustand';
import type { ModelInfo } from '../types';
import * as api from '../lib/tauri';

interface SettingsStore {
  settings: Record<string, string>;
  models: ModelInfo[];
  loading: boolean;
  fetchSettings: () => Promise<void>;
  saveSettings: (s: Record<string, string>) => Promise<void>;
  fetchModels: (apiKey: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: {},
  models: [],
  loading: false,

  fetchSettings: async () => {
    set({ loading: true });
    try {
      const settings = await api.getSettings();
      set({ settings, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  saveSettings: async (settings) => {
    await api.saveSettings(settings);
    set({ settings });
  },

  fetchModels: async (apiKey) => {
    set({ loading: true });
    try {
      const models = await api.fetchOpenrouterModels(apiKey);
      set({ models, loading: false });
    } catch {
      set({ loading: false });
    }
  },
}));
