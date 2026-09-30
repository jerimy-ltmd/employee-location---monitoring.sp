import React from 'react';
import { cn } from '../../lib/utils';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export const Label: React.FC<LabelProps> = ({ className, ...props }) => {
  return (
    <label
      className={cn(
        'text-xs font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 select-none text-foreground block mb-1',
        className
      )}
      {...props}
    />
  );
};
