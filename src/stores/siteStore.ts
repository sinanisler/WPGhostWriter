import { create } from 'zustand';
import type { Site } from '../types';
import * as api from '../lib/tauri';

interface SiteStore {
  sites: Site[];
  loading: boolean;
  fetchSites: () => Promise<void>;
  addSite: (site: Site) => void;
  updateSite: (site: Site) => void;
  removeSite: (id: string) => void;
}

export const useSiteStore = create<SiteStore>((set) => ({
  sites: [],
  loading: false,

  fetchSites: async () => {
    set({ loading: true });
    try {
      const sites = await api.listSites();
      set({ sites, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  addSite: (site) => set((s) => ({ sites: [...s.sites, site] })),

  updateSite: (site) =>
    set((s) => ({ sites: s.sites.map((s2) => (s2.id === site.id ? site : s2)) })),

  removeSite: (id) => set((s) => ({ sites: s.sites.filter((s2) => s2.id !== id) })),
}));
