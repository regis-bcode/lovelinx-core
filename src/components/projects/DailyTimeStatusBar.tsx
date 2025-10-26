import React from 'react';

type DailyTimeStatusBarProps = {
  dailyTotalMinutes: number;
  workedMinutes: number;
};

type TimeParts = {
  h: number;
  m: number;
};

const clampPercentage = (value: number) => Math.min(100, Math.max(0, value));

const toHM = (totalMinutes: number): TimeParts => {
  const safeMinutes = Number.isFinite(totalMinutes) ? Math.max(0, Math.floor(totalMinutes)) : 0;
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;

  return { h: hours, m: minutes };
};

const formatHM = ({ h, m }: TimeParts) => {
  const hoursLabel = `${h}h`;
  const minutesLabel = `${m.toString().padStart(2, '0')}min`;
  return `${hoursLabel} ${minutesLabel}`;
};

const DailyTimeStatusBar: React.FC<DailyTimeStatusBarProps> = ({ dailyTotalMinutes, workedMinutes }) => {
  const safeTotal = Number.isFinite(dailyTotalMinutes) ? Math.max(dailyTotalMinutes, 0) : 0;
  const safeWorked = Number.isFinite(workedMinutes) ? Math.max(workedMinutes, 0) : 0;
  const rawPercentage = safeTotal > 0 ? (safeWorked / safeTotal) * 100 : 0;
  const percentage = clampPercentage(rawPercentage);
  const remaining = Math.max(safeTotal - safeWorked, 0);

  const workedParts = toHM(safeWorked);
  const remainingParts = toHM(remaining);

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
          Consumido: <span className="font-semibold text-slate-900 dark:text-white">{formatHM(workedParts)}</span>
        </div>
        <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
          Falta: <span className="font-semibold text-slate-900 dark:text-white">{formatHM(remainingParts)}</span>
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
          <span>Consumido ({percentage.toFixed(1)}%)</span>
          <span>Falta ({(100 - percentage).toFixed(1)}%)</span>
        </div>
      </div>
    </div>
  );
};

export default DailyTimeStatusBar;

// Example usage:
// <DailyTimeStatusBar dailyTotalMinutes={480} workedMinutes={298} />
