export type CapacityRow = {
  user_id: string;
  date: string;
  capacity_minutes: number;
  planned_minutes: number;
  actual_minutes: number;
  allocation_flag: 'no_capacity' | 'overallocated' | 'unallocated' | 'underallocated' | 'ok';
  planned_util_pct: number;
  actual_util_pct: number;
};

export type SuggestionRow = {
  date: string;
  free_minutes: number;
};

export type Analyst = {
  id: string;
  name: string;
  email: string;
};

export type CapacityGranularity = 'daily' | 'weekly' | 'monthly';
