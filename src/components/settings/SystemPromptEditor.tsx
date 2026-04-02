import { useEffect, useState } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';

const DEFAULT_PROMPT = `You are an expert content writer. Write comprehensive, engaging, and SEO-optimized WordPress blog posts. 
Follow these guidelines:
- Use clear headings and subheadings (H2, H3)
- Include practical examples and actionable advice
- Write in a conversational but authoritative tone
- Aim for thoroughness and depth
- Return clean HTML formatted content suitable for WordPress`;

export function SystemPromptEditor() {
  const { settings, saveSettings } = useSettingsStore();
  const [prompt, setPrompt] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (settings) {
      setPrompt(settings.system_prompt ?? DEFAULT_PROMPT);
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSettings({ system_prompt: prompt.trim() });
      toast('System prompt saved', 'success');
    } catch (e) {
      toast(`Save failed: ${e}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setPrompt(DEFAULT_PROMPT);
    try {
      await saveSettings({ system_prompt: DEFAULT_PROMPT });
      toast('Reset to default', 'success');
    } catch (e) {
      toast(`Failed: ${e}`, 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-neutral-300 mb-1">Default System Prompt</h3>
        <p className="text-xs text-neutral-500 mb-3">
          This is sent to the AI for every task unless overridden per-task. Instructs the model on tone, format, and style.
        </p>
      </div>

      <textarea
        className="w-full h-64 bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-neutral-200 placeholder-neutral-600 resize-y font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="You are a helpful content writer..."
      />

      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} loading={saving}>
          Save Prompt
        </Button>
        <Button size="sm" variant="secondary" onClick={handleReset}>
          Reset to Default
        </Button>
      </div>
    </div>
  );
}
