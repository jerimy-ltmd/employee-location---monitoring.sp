import React from 'react';
import { cn } from '../../lib/utils';
import { LocationStatus } from '../../types';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'gold';
  status?: LocationStatus;
}

export const Badge: React.FC<BadgeProps> = ({ className, variant = 'default', status, children, ...props }) => {
  if (status) {
    if (status === 'INSIDE') {
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/40 dark:border-emerald-800',
            className
          )}
          {...props}
        >
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          {children || 'INSIDE'}
        </span>
      );
    }
    if (status === 'OUTSIDE') {
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300/40 dark:border-rose-800',
            className
          )}
          {...props}
        >
          <span className="h-2 w-2 rounded-full bg-rose-500" />
          {children || 'OUTSIDE'}
        </span>
      );
    }
    if (status === 'LOCATION_UNCERTAIN') {
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/40 dark:border-amber-800',
            className
          )}
          {...props}
        >
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          {children || 'UNCERTAIN'}
        </span>
      );
    }
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-300 dark:border-slate-700',
          className
        )}
        {...props}
      >
        <span className="h-2 w-2 rounded-full bg-slate-400" />
        {children || 'OFFLINE'}
      </span>
    );
  }

  const variants = {
    default: 'bg-[#091D3C] text-white dark:bg-slate-800 dark:text-slate-100',
    gold: 'bg-amber-100 text-amber-900 border border-amber-300/60 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
    secondary: 'bg-secondary text-secondary-foreground',
    destructive: 'bg-destructive/10 text-destructive border border-destructive/20',
    outline: 'border border-border text-foreground',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
