import { cn } from "@/lib/utils";

interface GoLiveHistoryProps {
  currentDate?: string;
  previousDate?: string;
  className?: string;
}

export function GoLiveHistory({ currentDate, previousDate, className }: GoLiveHistoryProps) {
  if (!currentDate && !previousDate) {
    return null;
  }

  return (
    <div className={cn("space-y-1", className)}>
      {currentDate && (
        <div className="text-sm font-medium">
          {new Date(currentDate).toLocaleDateString('pt-BR')}
        </div>
      )}
      {previousDate && previousDate !== currentDate && (
        <div className="text-sm text-destructive line-through opacity-75">
          Anterior: {new Date(previousDate).toLocaleDateString('pt-BR')}
        </div>
      )}
    </div>
  );
}