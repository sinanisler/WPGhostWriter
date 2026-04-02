import { useState } from "react";
import { useSettingsStore } from "../../stores/settingsStore";
import type { Task, UpdateTaskInput } from "../../types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import * as api from "../../lib/tauri";
import { formatInterval } from "../../lib/utils";

interface TaskEditorProps {
  task: Task;
  onSaved: () => void;
  onCancel: () => void;
}

export function TaskEditor({ task, onSaved, onCancel }: TaskEditorProps) {
  const { settings, models } = useSettingsStore();

  const [form, setForm] = useState<UpdateTaskInput>({
    name: task.name,
    prompt: task.prompt,
    system_prompt: task.system_prompt,
    post_count: task.post_count,
    interval_seconds: task.interval_seconds,
    model_override: task.model_override,
    generate_excerpt: task.generate_excerpt,
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof UpdateTaskInput>(
    key: K,
    value: UpdateTaskInput[K],
  ) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError("Task name is required");
      return;
    }
    if (!form.prompt.trim()) {
      setError("Prompt / topic is required");
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
      await api.updateTask(task.id, {
        ...form,
        system_prompt: form.system_prompt?.trim() || undefined,
        model_override: form.model_override?.trim() || undefined,
      });
      onSaved();
    } catch (e) {
      setError(String(e));
      setSubmitting(false);
    }
  };

  const isRunning = task.status === "running" || task.status === "paused";

  return (
    <div className="space-y-5">
      {isRunning && (
        <div className="bg-yellow-950 border border-yellow-800 text-yellow-300 rounded-lg px-4 py-3 text-sm">
          Task is currently {task.status}. Only name and interval can be changed
          while running — prompt and count changes take effect on next restart.
        </div>
      )}

      {error && (
        <div className="bg-red-950 border border-red-800 text-red-300 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <Input
        label="Task Name"
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
          value={form.prompt}
          onChange={(e) => set("prompt", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
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
          <p className="text-xs text-neutral-600">
            = {formatInterval(form.interval_seconds)}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-400">
          Model Override
        </label>
        <input
          list="editor-model-datalist"
          className="bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder={`Default: ${settings.default_model ?? "openai/gpt-4o-mini"}`}
          value={form.model_override ?? ""}
          onChange={(e) =>
            set("model_override", e.target.value || (undefined as any))
          }
        />
        <datalist id="editor-model-datalist">
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </datalist>
      </div>

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
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="generate_excerpt_edit"
          checked={form.generate_excerpt}
          onChange={(e) => set("generate_excerpt", e.target.checked)}
          className="accent-blue-500"
        />
        <label
          htmlFor="generate_excerpt_edit"
          className="text-sm text-neutral-300 cursor-pointer"
        >
          Generate Excerpt
        </label>
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-neutral-800">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} loading={submitting}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}
