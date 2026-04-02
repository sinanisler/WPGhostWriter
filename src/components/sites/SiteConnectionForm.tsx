import { useEffect, useState, type ChangeEvent } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useSiteStore } from '../../stores/siteStore';
import { useToast } from '../ui/Toast';
import * as api from '../../lib/tauri';

interface Props {
  siteId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormState {
  name: string;
  url: string;
  username: string;
  app_password: string;
}

const empty: FormState = { name: '', url: '', username: '', app_password: '' };

export function SiteConnectionForm({ siteId, onSuccess, onCancel }: Props) {
  const { sites, addSite, updateSite } = useSiteStore();
  const [form, setForm] = useState<FormState>(empty);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (siteId) {
      const site = sites.find((s) => s.id === siteId);
      if (site) {
        setForm({ name: site.name, url: site.url, username: site.username, app_password: '' });
      }
    }
  }, [siteId, sites]);

  const set = (key: keyof FormState) => (e: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setTestResult(null);
  };

  const isValid = form.name.trim() && form.url.trim() && form.username.trim() && form.app_password.trim();

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const ok = await api.testSiteConnection(
        form.url.trim().replace(/\/$/, ''),
        form.username,
        form.app_password,
      );
      setTestResult({ ok, msg: ok ? 'Connection successful' : 'Connection failed' });
    } catch (e) {
      setTestResult({ ok: false, msg: String(e) });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    try {
      if (siteId) {
        const updated = await api.updateSite(siteId, form.name.trim(), form.url.trim().replace(/\/$/, ''), form.username.trim(), form.app_password);
        updateSite(updated);
      } else {
        const newSite = await api.addSite(form.name.trim(), form.url.trim().replace(/\/$/, ''), form.username.trim(), form.app_password);
        addSite(newSite);
      }
      toast(siteId ? 'Site updated' : 'Site added', 'success');
      onSuccess();
    } catch (e) {
      toast(`Save failed: ${e}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Input
        label="Site Name"
        placeholder="My WordPress Site"
        value={form.name}
        onChange={set('name')}
      />
      <Input
        label="WordPress URL"
        placeholder="https://example.com"
        value={form.url}
        onChange={set('url')}
        hint="Include https://, no trailing slash"
      />
      <Input
        label="Username"
        placeholder="admin"
        value={form.username}
        onChange={set('username')}
      />
      <Input
        label="Application Password"
        placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
        value={form.app_password}
        onChange={set('app_password')}
        hint="Generate in WordPress: Users → Profile → Application Passwords"
      />

      {testResult && (
        <div className={`rounded-lg px-3 py-2 text-xs ${testResult.ok ? 'bg-green-950 text-green-400' : 'bg-red-950 text-red-400'}`}>
          {testResult.msg}
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <Button variant="secondary" size="sm" onClick={handleTest} loading={testing} disabled={!isValid}>
          Test Connection
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleSave} loading={saving} disabled={!isValid}>
            {siteId ? 'Update' : 'Add Site'}
          </Button>
        </div>
      </div>
    </div>
  );
}
