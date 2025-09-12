import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type DashboardCounts = {
  projects: number;
  tasksCompleted: number;
  teamMembers: number;
  tasksDueToday: number;
};

export type RecentProjectItem = {
  id: string;
  name: string;
  progress: number; // 0-100
  status: 'Em progresso' | 'Revisão' | 'Planejamento';
  dueDate?: string; // ISO date string
  members: number;
};

function yyyyMmDd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function useDashboardStats() {
  const { user } = useAuth();
  const [counts, setCounts] = useState<DashboardCounts>({
    projects: 0,
    tasksCompleted: 0,
    teamMembers: 0,
    tasksDueToday: 0,
  });
  const [recentProjects, setRecentProjects] = useState<RecentProjectItem[]>([]);
  const [loading, setLoading] = useState(true);

  const today = useMemo(() => yyyyMmDd(new Date()), []);

  useEffect(() => {
    if (!user) return;
    loadAll();

    const channel = supabase
      .channel(`dashboard-realtime-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects', filter: `user_id=eq.${user.id}` }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${user.id}` }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams', filter: `user_id=eq.${user.id}` }, () => loadAll())
      .subscribe();

    const onVisibility = () => {
      if (document.visibilityState === 'visible') loadAll();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [user, today]);

  const loadAll = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [projectsCountRes, tasksCompletedCountRes, teamMembersCountRes, tasksDueTodayCountRes, recentProjectsRes] = await Promise.all([
        supabase.from('projects').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('percentual_conclusao', 100),
        supabase.from('teams').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('data_vencimento', today),
        supabase
          .from('projects')
          .select('id, nome_projeto, go_live_previsto, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(4),
      ]);

      setCounts({
        projects: projectsCountRes.count || 0,
        tasksCompleted: tasksCompletedCountRes.count || 0,
        teamMembers: teamMembersCountRes.count || 0,
        tasksDueToday: tasksDueTodayCountRes.count || 0,
      });

      const projects = (recentProjectsRes.data || []) as Array<{ id: string; nome_projeto: string; go_live_previsto: string | null; created_at: string }>;
      if (projects.length === 0) {
        setRecentProjects([]);
        setLoading(false);
        return;
      }

      const ids = projects.map(p => p.id);

      const [tasksForRecentRes, teamForRecentRes] = await Promise.all([
        supabase.from('tasks').select('project_id, percentual_conclusao').in('project_id', ids),
        supabase.from('teams').select('project_id').in('project_id', ids),
      ]);

      const tasksByProject = new Map<string, number[]>();
      (tasksForRecentRes.data || []).forEach((t: any) => {
        if (!tasksByProject.has(t.project_id)) tasksByProject.set(t.project_id, []);
        if (typeof t.percentual_conclusao === 'number') tasksByProject.get(t.project_id)!.push(t.percentual_conclusao);
      });
      const avgProgress = (arr: number[]) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0);

      const membersByProject = new Map<string, number>();
      (teamForRecentRes.data || []).forEach((m: any) => {
        membersByProject.set(m.project_id, (membersByProject.get(m.project_id) || 0) + 1);
      });

      const recents: RecentProjectItem[] = projects.map(p => ({
        id: p.id,
        name: p.nome_projeto,
        progress: avgProgress(tasksByProject.get(p.id) || []),
        status: 'Em progresso',
        dueDate: p.go_live_previsto || p.created_at,
        members: membersByProject.get(p.id) || 0,
      }));

      setRecentProjects(recents);
    } catch (e) {
      console.error('Erro ao carregar dados do dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  return { counts, recentProjects, loading, refresh: loadAll };
}
