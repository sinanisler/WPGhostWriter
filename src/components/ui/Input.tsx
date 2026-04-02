import React from 'react';
import { clsx } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-neutral-400">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={clsx(
          'bg-neutral-900 border rounded-md px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600',
          'focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500',
          error ? 'border-red-500' : 'border-neutral-700',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs text-neutral-500">{hint}</p>}
    </div>
  );
}
