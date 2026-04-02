import { useState } from "react";
import { ApiSettings } from "./ApiSettings";
import { ModelSelector } from "./ModelSelector";
import { SystemPromptEditor } from "./SystemPromptEditor";

const TABS = ["API", "Default Model", "System Prompt"] as const;
type Tab = (typeof TABS)[number];

export function SettingsPanel() {
  const [tab, setTab] = useState<Tab>("API");

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-1 bg-neutral-950 rounded-lg p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t
                ? "bg-neutral-800 text-neutral-100"
                : "text-neutral-500 hover:text-neutral-300"
            }`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Panel */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
        {tab === "API" && <ApiSettings />}
        {tab === "Default Model" && <ModelSelector />}
        {tab === "System Prompt" && <SystemPromptEditor />}
      </div>
    </div>
  );
}
