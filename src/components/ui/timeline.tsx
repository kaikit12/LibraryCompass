import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TimelineItemProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  time?: React.ReactNode;
  status?: 'success' | 'warning' | 'danger' | 'info';
  children?: React.ReactNode;
}

export function TimelineItem({ title, description, time, status = 'info', children }: TimelineItemProps) {
  const colorMap: Record<string, string> = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    info: 'bg-primary',
  };
  return (
    <li className="mb-8 ml-6 relative">
      <span className={cn('absolute w-3 h-3 rounded-full -left-[1.375rem] top-1 border-2 border-white', colorMap[status])} />
      <div className="flex flex-col gap-1">
        <span className="font-semibold text-primary">{title}</span>
        {description && <span className="text-sm text-muted-foreground">{description}</span>}
        {time && <span className="text-xs text-muted-foreground">{time}</span>}
        {children}
      </div>
    </li>
  );
}

export interface TimelineProps {
  children: React.ReactNode;
  className?: string;
}

export function Timeline({ children, className }: TimelineProps) {
  return (
    <ol className={cn('relative border-l border-primary/30 ml-2', className)}>
      {children}
    </ol>
  );
}
