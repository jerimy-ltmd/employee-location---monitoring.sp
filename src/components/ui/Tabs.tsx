import React, { createContext, useContext, useState } from 'react';
import { cn } from '../../lib/utils';

interface TabsContextType {
  value: string;
  onValueChange: (val: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

export const Tabs: React.FC<{
  defaultValue: string;
  value?: string;
  onValueChange?: (val: string) => void;
  children: React.ReactNode;
  className?: string;
}> = ({ defaultValue, value: controlledValue, onValueChange, children, className }) => {
  const [internalVal, setInternalVal] = useState(defaultValue);
  const activeValue = controlledValue !== undefined ? controlledValue : internalVal;

  const handleValChange = (val: string) => {
    if (controlledValue === undefined) {
      setInternalVal(val);
    }
    onValueChange?.(val);
  };

  return (
    <TabsContext.Provider value={{ value: activeValue, onValueChange: handleValChange }}>
      <div className={cn('w-full', className)}>{children}</div>
    </TabsContext.Provider>
  );
};

export const TabsList: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div
    className={cn(
      'inline-flex h-10 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground',
      className
    )}
    {...props}
  />
);

export const TabsTrigger: React.FC<{
  value: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}> = ({ value, children, className, disabled }) => {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('TabsTrigger must be used inside Tabs');
  const isSelected = ctx.value === value;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => ctx.onValueChange(value)}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-xs sm:text-sm font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
        isSelected
          ? 'bg-card text-foreground shadow-xs font-semibold'
          : 'text-muted-foreground hover:text-foreground',
        className
      )}
    >
      {children}
    </button>
  );
};

export const TabsContent: React.FC<{
  value: string;
  children: React.ReactNode;
  className?: string;
}> = ({ value, children, className }) => {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('TabsContent must be used inside Tabs');
  if (ctx.value !== value) return null;

  return <div className={cn('mt-3 ring-offset-background focus-visible:outline-none', className)}>{children}</div>;
};
