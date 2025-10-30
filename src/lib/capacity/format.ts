export const toHours = (min: number) => (min / 60).toFixed(1);

export const pct = (n: number) => `${Math.round(n)}%`;

export const flagColor = (flag: string) => {
  switch (flag) {
    case 'overallocated':
      return 'bg-red-500';
    case 'underallocated':
      return 'bg-yellow-500';
    case 'unallocated':
      return 'bg-slate-400';
    case 'no_capacity':
      return 'bg-zinc-400';
    default:
      return 'bg-emerald-500';
  }
};
