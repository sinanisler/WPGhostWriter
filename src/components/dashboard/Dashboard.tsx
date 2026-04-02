import { useEffect } from 'react';
import { useTaskStore } from '../../stores/taskStore';
import { useUsageStore } from '../../stores/usageStore';
import { TaskCard } from './TaskCard';
import { StatsOverview } from './StatsOverview';
import { TopBar } from '../layout/TopBar';
import { Button } from '../ui/Button';
import { useNavigate } from 'react-router-dom';

export function Dashboard() {
  const { tasks, fetchTasks } = useTaskStore();
  const { summary, fetchSummary } = useUsageStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTasks();
    fetchSummary();
  }, []);

  const activeTasks = tasks.filter((t) => t.status === 'running' || t.status === 'paused');
  const recentTasks = tasks.slice(0, 10);

  const postsToday = tasks.reduce((sum, t) => sum + t.posts_completed, 0);

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Dashboard"
        action={
          <Button size="sm" onClick={() => navigate('/tasks')}>
            + New Task
          </Button>
        }
      />
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <StatsOverview
          totalTasks={tasks.length}
          runningTasks={activeTasks.length}
          postsToday={postsToday}
          summary={summary}
        />

        {activeTasks.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-neutral-400 mb-3 uppercase tracking-wide">
              Active Tasks
            </h2>
            <div className="grid gap-3">
              {activeTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-sm font-semibold text-neutral-400 mb-3 uppercase tracking-wide">
            Recent Tasks
          </h2>
          {recentTasks.length === 0 ? (
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 text-center">
              <p className="text-neutral-500 text-sm mb-3">No tasks yet</p>
              <Button size="sm" onClick={() => navigate('/tasks')}>
                Create your first task
              </Button>
            </div>
          ) : (
            <div className="grid gap-3">
              {recentTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
