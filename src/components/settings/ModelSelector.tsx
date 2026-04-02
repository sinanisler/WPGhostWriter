import { useEffect, useState } from "react";
import { useSettingsStore } from "../../stores/settingsStore";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";

export function ModelSelector() {
  const { settings, models, saveSettings, fetchModels } = useSettingsStore();
  const [selected, setSelected] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (settings) setSelected(settings.default_model ?? "");
    if (models.length === 0)
      fetchModels(settings["openrouter_api_key"] ?? "").catch(() => {});
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSettings({ default_model: selected });
      toast("Default model saved", "success");
    } catch (e) {
      toast(`Save failed: ${e}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const selectedModel = models.find((m) => m.id === selected);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-neutral-300 mb-1">
          Default AI Model
        </h3>
        <p className="text-xs text-neutral-500 mb-3">
          Type to search models. Fetch models first in API Settings if the list
          is empty.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-400">Model</label>
          <input
            list="model-datalist"
            className="bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder={
              models.length === 0
                ? "e.g. openai/gpt-4o-mini (load models first)"
                : "Search or type a model ID..."
            }
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          />
          <datalist id="model-datalist">
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </datalist>
          {models.length === 0 && (
            <p className="text-xs text-neutral-600">
              No models loaded.{" "}
              <button
                className="text-blue-400 hover:text-blue-300 underline"
                onClick={() =>
                  fetchModels(settings["openrouter_api_key"] ?? "")
                }
              >
                Load models
              </button>{" "}
              from API Settings first.
            </p>
          )}
        </div>

        {selectedModel && (
          <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-neutral-500">Name</span>
              <span className="text-neutral-300">{selectedModel.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Context</span>
              <span className="text-neutral-300">
                {selectedModel.context_length?.toLocaleString() ?? "N/A"} tokens
              </span>
            </div>
            {selectedModel.pricing && (
              <>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Input price</span>
                  <span className="text-neutral-300">
                    ${Number(selectedModel.pricing.prompt).toFixed(4)}/1k tokens
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Output price</span>
                  <span className="text-neutral-300">
                    ${Number(selectedModel.pricing.completion).toFixed(4)}/1k
                    tokens
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        <Button
          size="sm"
          onClick={handleSave}
          loading={saving}
          disabled={!selected.trim()}
        >
          Save Default Model
        </Button>
      </div>
    </div>
  );
}
