import { useState, useEffect } from "react";
import { useSiteStore } from "../../stores/siteStore";
import { useSettingsStore } from "../../stores/settingsStore";
import type { CreateTaskInput, WPTerm, PostType } from "../../types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Checkbox } from "../ui/Checkbox";
import * as api from "../../lib/tauri";
import { formatInterval } from "../../lib/utils";

interface TaskCreatorProps {
  onCreated: () => void;
  onCancel: () => void;
}

export function TaskCreator({ onCreated, onCancel }: TaskCreatorProps) {
  const { sites } = useSiteStore();
  const { settings } = useSettingsStore();

  const [form, setForm] = useState<CreateTaskInput>({
    site_id: sites[0]?.id ?? "",
    name: "",
    prompt: "",
    system_prompt: undefined,
    post_type: "post",
    post_status: "draft",
    post_count: 5,
    interval_seconds: 3600,
    model_override: undefined,
    generate_excerpt: false,
    category_ids: [],
    tag_ids: [],
  });

  const [postTypes, setPostTypes] = useState<PostType[]>([]);
  const [categories, setCategories] = useState<WPTerm[]>([]);
  const [tags, setTags] = useState<WPTerm[]>([]);
  const [loadingWP, setLoadingWP] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (form.site_id) loadWPData(form.site_id);
  }, [form.site_id]);

  async function loadWPData(siteId: string) {
    setLoadingWP(true);
    try {
      const [types, cats, tagList] = await Promise.all([
        api.getPostTypes(siteId),
        api.getCategories(siteId),
        api.getTags(siteId),
      ]);
      setPostTypes(types);
      setCategories(cats);
      setTags(tagList);
    } catch (e) {
      // Site might not be connected, silently fail
    } finally {
      setLoadingWP(false);
    }
  }

  const set = <K extends keyof CreateTaskInput>(
    key: K,
    value: CreateTaskInput[K],
  ) => setForm((f) => ({ ...f, [key]: value }));

  const toggleTerm = (id: number, list: "category_ids" | "tag_ids") => {
    const current = form[list];
    if (current.includes(id)) {
      setForm((f) => ({
        ...f,
        [list]: (f[list] as number[]).filter((x) => x !== id),
      }));
    } else {
      setForm((f) => ({ ...f, [list]: [...(f[list] as number[]), id] }));
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError("Task name is required");
      return;
    }
    if (!form.prompt.trim()) {
      setError("Prompt / topic is required");
      return;
    }
    if (!form.site_id) {
      setError("Please select a site");
      return;
    }
    if (form.post_count < 1 || form.post_count > 100) {
      setError("Post count must be 1–100");
      return;
    }
    if (form.interval_seconds < 1) {
      setError("Interval must be at least 1 second");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await api.createTask({
        ...form,
        system_prompt: form.system_prompt?.trim() || undefined,
        model_override: form.model_override?.trim() || undefined,
      });
      onCreated();
    } catch (e) {
      setError(String(e));
      setSubmitting(false);
    }
  };

  const postStatusOptions = [
    { value: "draft", label: "Draft" },
    { value: "publish", label: "Publish" },
    { value: "future", label: "Scheduled" },
    { value: "private", label: "Private" },
  ];

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-red-950 border border-red-800 text-red-300 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <Input
        label="Task Name"
        placeholder="e.g. Tech Blog - September Content"
        value={form.name}
        onChange={(e) => set("name", e.target.value)}
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-400">
          Prompt / Topic
        </label>
        <textarea
          className="bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
          rows={3}
          placeholder="Describe the topic, audience, and writing style you want..."
          value={form.prompt}
          onChange={(e) => set("prompt", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-400">
            WordPress Site
          </label>
          <select
            className="bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={form.site_id}
            onChange={(e) => set("site_id", e.target.value)}
          >
            {sites.length === 0 && (
              <option value="">No sites configured</option>
            )}
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-400">
            Post Type
          </label>
          <select
            className="bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={form.post_type}
            onChange={(e) => set("post_type", e.target.value)}
            disabled={loadingWP}
          >
            {postTypes.length === 0 ? (
              <option value="post">Post</option>
            ) : (
              postTypes.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.name}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Select
          label="Post Status"
          options={postStatusOptions}
          value={form.post_status}
          onChange={(e) => set("post_status", e.target.value)}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-400">
            Number of Posts
          </label>
          <input
            type="number"
            min={1}
            max={100}
            className="bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={form.post_count}
            onChange={(e) => set("post_count", parseInt(e.target.value) || 1)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-400">
            Interval Between Posts (seconds)
          </label>
          <input
            type="number"
            min={1}
            className="bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={form.interval_seconds}
            onChange={(e) =>
              set("interval_seconds", parseInt(e.target.value) || 3600)
            }
          />
          <p className="text-xs text-neutral-600">= {formatInterval(form.interval_seconds)}</p>
        </div>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-neutral-400">
            Categories
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => toggleTerm(c.id, "category_ids")}
                className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                  form.category_ids.includes(c.id)
                    ? "bg-blue-600 border-blue-500 text-white"
                    : "bg-neutral-900 border-neutral-700 text-neutral-400 hover:border-neutral-600"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-neutral-400">Tags</label>
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <button
                key={t.id}
                onClick={() => toggleTerm(t.id, "tag_ids")}
                className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                  form.tag_ids.includes(t.id)
                    ? "bg-blue-600 border-blue-500 text-white"
                    : "bg-neutral-900 border-neutral-700 text-neutral-400 hover:border-neutral-600"
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <Checkbox
        label="Generate Excerpt"
        hint="AI generates a short 1-2 sentence summary for each post"
        checked={form.generate_excerpt}
        onChange={(v) => set("generate_excerpt", v)}
      />

      {/* Advanced */}
      <div className="border border-neutral-800 rounded-lg overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-4 py-3 text-sm text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50 transition-colors"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <span>▸ Advanced Options</span>
          <span className="text-xs">{showAdvanced ? "▲" : "▼"}</span>
        </button>
        {showAdvanced && (
          <div className="px-4 pb-4 pt-2 space-y-4 border-t border-neutral-800">
            <Input
              label="Model Override"
              placeholder={`Default: ${settings.default_model ?? "openai/gpt-4o-mini"}`}
              value={form.model_override ?? ""}
              onChange={(e) =>
                set("model_override", e.target.value || (undefined as any))
              }
              hint="Override the default AI model for this task"
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-neutral-400">
                System Prompt Override
              </label>
              <textarea
                className="bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                rows={4}
                placeholder="Leave empty to use default from Settings..."
                value={form.system_prompt ?? ""}
                onChange={(e) =>
                  set("system_prompt", e.target.value || (undefined as any))
                }
              />
              <p className="text-xs text-neutral-600">
                Overrides the global system prompt for this task only
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-neutral-800">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} loading={submitting}>
          Create Task
        </Button>
      </div>
    </div>
  );
}
