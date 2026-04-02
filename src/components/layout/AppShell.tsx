import { Routes, Route } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Dashboard } from '../dashboard/Dashboard';
import { TaskList } from '../tasks/TaskList';
import { SiteManager } from '../sites/SiteManager';
import { UsageDashboard } from '../usage/UsageDashboard';
import { SettingsPanel } from '../settings/SettingsPanel';
import { useTaskEvents } from '../../hooks/useTaskEvents';

export function AppShell() {
  useTaskEvents();

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-950">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tasks" element={<TaskList />} />
          <Route path="/sites" element={<SiteManager />} />
          <Route path="/usage" element={<UsageDashboard />} />
          <Route path="/settings" element={<SettingsPanel />} />
        </Routes>
      </main>
    </div>
  );
}
