import React from 'react';
import { cn } from '../../lib/utils';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info';
}

export const Alert: React.FC<AlertProps> = ({ className, variant = 'default', children, ...props }) => {
  const styles = {
    default: 'bg-muted text-foreground border-border',
    destructive: 'bg-red-50 text-red-900 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
    success: 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    warning: 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    info: 'bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
  };

  const icons = {
    default: <Info className="h-4 w-4 shrink-0 text-muted-foreground" />,
    destructive: <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />,
    success: <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />,
    warning: <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />,
    info: <Info className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />,
  };

  return (
    <div
      role="alert"
      className={cn('relative w-full rounded-lg border p-4 text-sm flex items-start gap-3', styles[variant], className)}
      {...props}
    >
      {icons[variant]}
      <div className="flex-1">{children}</div>
    </div>
  );
};

export const AlertTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className, ...props }) => (
  <h5 className={cn('mb-1 font-semibold leading-none tracking-tight text-foreground', className)} {...props} />
);

export const AlertDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({ className, ...props }) => (
  <div className={cn('text-xs opacity-90', className)} {...props} />
);
