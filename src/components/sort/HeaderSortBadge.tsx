import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { SortDirection } from '@/hooks/useMultiSort';
import { cn } from '@/lib/utils';

interface HeaderSortBadgeProps {
  position: number;
  direction: SortDirection;
  className?: string;
}

const directionLabels: Record<SortDirection, string> = {
  asc: 'ASC',
  desc: 'DESC',
};

const directionIcons: Record<SortDirection, React.ReactNode> = {
  asc: <ChevronUp className="h-3 w-3" aria-hidden="true" />,
  desc: <ChevronDown className="h-3 w-3" aria-hidden="true" />,
};

export const HeaderSortBadge: React.FC<HeaderSortBadgeProps> = ({ position, direction, className }) => {
  const label = `Ordenado em ${position} • ${directionLabels[direction]}`;
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary',
              className,
            )}
          >
            <Badge
              variant="secondary"
              className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground"
            >
              {position}
            </Badge>
            <span className="text-primary">{directionIcons[direction]}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
