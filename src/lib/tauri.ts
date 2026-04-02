import { invoke } from "@tauri-apps/api/core";
import type {
  Site,
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  TaskWithPosts,
  TaskLog,
  ModelInfo,
  WPTerm,
  PostType,
  DailyUsage,
  UsageSummary,
  TaskCostRow,
} from "../types";

// ── Sites ──────────────────────────────────────────────────────────────────
export const addSite = (
  name: string,
  url: string,
  username: string,
  app_password: string,
) =>
  invoke<Site>("add_site", { name, url, username, appPassword: app_password });

export const testSiteConnection = (
  url: string,
  username: string,
  app_password: string,
) =>
  invoke<boolean>("test_site_connection", {
    url,
    username,
    appPassword: app_password,
  });

export const listSites = () => invoke<Site[]>("list_sites");

export const updateSite = (
  id: string,
  name: string,
  url: string,
  username: string,
  app_password: string,
) =>
  invoke<Site>("update_site", {
    id,
    name,
    url,
    username,
    appPassword: app_password,
  });

export const deleteSite = (id: string) => invoke<void>("delete_site", { id });

export const getPostTypes = (siteId: string) =>
  invoke<PostType[]>("get_post_types", { siteId });

export const getCategories = (siteId: string) =>
  invoke<WPTerm[]>("get_categories", { siteId });

export const getTags = (siteId: string) =>
  invoke<WPTerm[]>("get_tags", { siteId });

// ── Settings ──────────────────────────────────────────────────────────────
export const getSettings = () => invoke<Record<string, string>>("get_settings");

export const saveSettings = (settings: Record<string, string>) =>
  invoke<void>("save_settings", { settings });

export const testOpenrouterKey = (apiKey: string) =>
  invoke<boolean>("test_openrouter_key", { apiKey });

// ── Models ────────────────────────────────────────────────────────────────
export const fetchOpenrouterModels = (apiKey: string) =>
  invoke<ModelInfo[]>("fetch_openrouter_models", { apiKey });

// ── Tasks ─────────────────────────────────────────────────────────────────
export const createTask = (input: CreateTaskInput) =>
  invoke<Task>("create_task", { input });

export const listTasks = () => invoke<Task[]>("list_tasks");

export const getTask = (id: string) =>
  invoke<TaskWithPosts>("get_task", { id });

export const startTask = (id: string) => invoke<void>("start_task", { id });

export const pauseTask = (id: string) => invoke<void>("pause_task", { id });

export const resumeTask = (id: string) => invoke<void>("resume_task", { id });

export const cancelTask = (id: string) => invoke<void>("cancel_task", { id });

export const deleteTask = (id: string) => invoke<void>("delete_task", { id });

export const updateTask = (id: string, input: UpdateTaskInput) =>
  invoke<void>("update_task", { id, input });

export const restartTask = (id: string) => invoke<void>("restart_task", { id });

export const getTaskLogs = (taskId: string, limit?: number) =>
  invoke<TaskLog[]>("get_task_logs", { taskId, limit });

// ── Usage ─────────────────────────────────────────────────────────────────
export const getUsageSummary = (range: "7d" | "30d" | "90d" | "all") =>
  invoke<UsageSummary>("get_usage_summary", { range });

export const getDailyUsage = (start: string, end: string) =>
  invoke<DailyUsage[]>("get_daily_usage", { start, end });

export const getTaskCosts = () => invoke<TaskCostRow[]>("get_task_costs");
