import { useEffect, useState } from "react";
import { useSettingsStore } from "../../stores/settingsStore";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import * as api from "../../lib/tauri";

export function ApiSettings() {
  const { settings, saveSettings, fetchModels } = useSettingsStore();
  const [key, setKey] = useState("");
  const [testing, setTesting] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    msg: string;
  } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (settings) {
      setKey(settings.openrouter_api_key ?? "");
    }
  }, [settings]);

  const handleTest = async () => {
    if (!key.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const result = await api.testOpenrouterKey(key.trim());
      setTestResult({
        ok: result,
        msg: result ? "API key is valid" : "Invalid API key",
      });
    } catch (e) {
      setTestResult({ ok: false, msg: String(e) });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    try {
      await saveSettings({ openrouter_api_key: key.trim() });
      toast("API key saved", "success");
    } catch (e) {
      toast(`Save failed: ${e}`, "error");
    }
  };

  const handleFetchModels = async () => {
    setFetching(true);
    try {
      await fetchModels(settings["openrouter_api_key"] ?? key);
      toast("Models refreshed", "success");
    } catch (e) {
      toast(`Failed: ${e}`, "error");
    } finally {
      setFetching(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-neutral-300 mb-1">
          OpenRouter API Key
        </h3>
        <p className="text-xs text-neutral-500 mb-4">
          Get your key at{" "}
          <span className="text-blue-400">openrouter.ai/keys</span>. Keys start
          with <code className="bg-neutral-800 px-1 rounded">sk-or-</code>.
        </p>

        <Input
          label="API Key"
          placeholder="sk-or-..."
          value={key}
          onChange={(e) => {
            setKey(e.target.value);
            setTestResult(null);
          }}
        />

        {testResult && (
          <div
            className={`mt-2 rounded-lg px-3 py-2 text-xs ${testResult.ok ? "bg-green-950 text-green-400" : "bg-red-950 text-red-400"}`}
          >
            {testResult.msg}
          </div>
        )}

        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleTest}
            loading={testing}
            disabled={!key.trim()}
          >
            Test Key
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!key.trim()}>
            Save Key
          </Button>
        </div>
      </div>

      <hr className="border-neutral-800" />

      <div>
        <h3 className="text-sm font-semibold text-neutral-300 mb-1">
          Model List
        </h3>
        <p className="text-xs text-neutral-500 mb-3">
          Fetch the latest available models from OpenRouter to use in tasks.
        </p>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleFetchModels}
          loading={fetching}
        >
          Refresh Model List
        </Button>
      </div>
    </div>
  );
}
