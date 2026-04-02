import { useEffect, useState } from "react";
import { useSettingsStore } from "../../stores/settingsStore";
import { Select } from "../ui/Select";
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

  const modelOptions = models.map((m) => ({
    value: m.id,
    label: `${m.name} (${m.id})`,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-neutral-300 mb-1">
          Default AI Model
        </h3>
        <p className="text-xs text-neutral-500 mb-3">
          Used for all tasks unless overridden. Fetch models first if the list
          is empty.
        </p>
      </div>

      {models.length === 0 ? (
        <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 text-center">
          <p className="text-neutral-500 text-xs mb-2">
            No models loaded. Fetch them first in API Settings.
          </p>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => fetchModels(settings["openrouter_api_key"] ?? "")}
          >
            Load Models
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <Select
            label="Model"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            options={modelOptions}
          />

          {selected &&
            models.find((m) => m.id === selected) &&
            (() => {
              const m = models.find((m) => m.id === selected)!;
              return (
                <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Context</span>
                    <span className="text-neutral-300">
                      {m.context_length?.toLocaleString() ?? "N/A"} tokens
                    </span>
                  </div>
                  {m.pricing && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Input price</span>
                        <span className="text-neutral-300">
                          ${Number(m.pricing.prompt).toFixed(4)}/1k tokens
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Output price</span>
                        <span className="text-neutral-300">
                          ${Number(m.pricing.completion).toFixed(4)}/1k tokens
                        </span>
                      </div>
                    </>
                  )}
                </div>
              );
            })()}

          <Button
            size="sm"
            onClick={handleSave}
            loading={saving}
            disabled={!selected}
          >
            Save Default Model
          </Button>
        </div>
      )}
    </div>
  );
}
