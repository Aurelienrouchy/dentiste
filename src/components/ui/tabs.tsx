import React, { createContext, useContext } from 'react';
import { cn } from '@/lib/utils';

interface TabsContextType {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

export function Tabs({ 
  value, 
  onValueChange, 
  className,
  children
}: { 
  value: string; 
  onValueChange: (value: string) => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={cn('space-y-2', className)}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('flex border-b', className)}>
      {children}
    </div>
  );
}

export function TabsItem({ 
  value, 
  className, 
  children 
}: { 
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const context = useContext(TabsContext);
  
  if (!context) {
    throw new Error('TabsItem must be used within a Tabs component');
  }
  
  const { value: selectedValue, onValueChange } = context;
  const isSelected = value === selectedValue;
  
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isSelected}
      className={cn(
        'px-4 py-2 text-sm font-medium transition-all',
        isSelected 
          ? 'border-b-2 border-primary text-primary' 
          : 'text-muted-foreground hover:text-foreground',
        className
      )}
      onClick={() => onValueChange(value)}
    >
      {children}
    </button>
  );
}

export function TabsContent({ 
  value, 
  className, 
  children 
}: { 
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const context = useContext(TabsContext);
  
  if (!context) {
    throw new Error('TabsContent must be used within a Tabs component');
  }
  
  const { value: selectedValue } = context;
  
  if (value !== selectedValue) {
    return null;
  }
  
  return (
    <div 
      role="tabpanel"
      className={cn('mt-2', className)}
    >
      {children}
    </div>
  );
} 