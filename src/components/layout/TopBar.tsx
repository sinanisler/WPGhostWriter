import React from 'react';

interface TopBarProps {
  title: string;
  action?: React.ReactNode;
}

export function TopBar({ title, action }: TopBarProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/50">
      <h1 className="text-base font-semibold text-neutral-100">{title}</h1>
      {action && <div>{action}</div>}
    </div>
  );
}
