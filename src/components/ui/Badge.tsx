import React from 'react';
import { clsx } from '../../lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'muted';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: 'bg-neutral-800 text-neutral-300',
    success: 'bg-green-900/50 text-green-400',
    warning: 'bg-yellow-900/50 text-yellow-400',
    error: 'bg-red-900/50 text-red-400',
    info: 'bg-blue-900/50 text-blue-400',
    muted: 'bg-neutral-900 text-neutral-500',
  };
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function statusBadge(status: string) {
  const map: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
    pending: { label: 'Pending', variant: 'muted' },
    running: { label: 'Running', variant: 'info' },
    paused: { label: 'Paused', variant: 'warning' },
    completed: { label: 'Completed', variant: 'success' },
    failed: { label: 'Failed', variant: 'error' },
    cancelled: { label: 'Cancelled', variant: 'muted' },
    published: { label: 'Published', variant: 'success' },
    title_generated: { label: 'Title Ready', variant: 'info' },
    content_generated: { label: 'Content Ready', variant: 'info' },
  };
  const cfg = map[status] ?? { label: status, variant: 'default' as BadgeProps['variant'] };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}
