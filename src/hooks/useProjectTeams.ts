import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ProjectTeam, ProjectTeamFormData, TeamMember, TeamMemberFormData, TeamMemberWithUser } from '@/types/project-team';

export function useProjectTeams() {
  const [teams, setTeams] = useState<ProjectTeam[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    loadTeams();

    const channel = supabase
      .channel('project-teams-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'project_teams' }, (payload) => {
        const team = payload.new as ProjectTeam;
        if (team.user_id === user.id) {
          setTeams((prev) => [team, ...prev]);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'project_teams' }, (payload) => {
        const team = payload.new as ProjectTeam;
        if (team.user_id === user.id) {
          setTeams((prev) => prev.map((t) => (t.id === team.id ? team : t)));
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'project_teams' }, (payload) => {
        const teamId = payload.old.id;
        setTeams((prev) => prev.filter((t) => t.id !== teamId));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadTeams = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('project_teams')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar equipes:', error);
        toast({
          title: "Erro",
          description: "Erro ao carregar equipes",
          variant: "destructive",
        });
        return;
      }

      setTeams(data || []);
    } catch (error) {
      console.error('Erro ao carregar equipes:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar equipes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createTeam = async (teamData: ProjectTeamFormData): Promise<ProjectTeam | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('project_teams')
        .insert({
          ...teamData,
          user_id: user.id,
        } as any)
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar equipe:', error);
        toast({
          title: "Erro",
          description: "Erro ao criar equipe",
          variant: "destructive",
        });
        return null;
      }

      toast({
        title: "Sucesso",
        description: "Equipe criada com sucesso",
      });

      return data;
    } catch (error) {
      console.error('Erro ao criar equipe:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar equipe",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateTeam = async (id: string, teamData: Partial<ProjectTeamFormData>): Promise<ProjectTeam | null> => {
    try {
      const { data, error } = await supabase
        .from('project_teams')
        .update(teamData as any)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar equipe:', error);
        toast({
          title: "Erro",
          description: "Erro ao atualizar equipe",
          variant: "destructive",
        });
        return null;
      }

      toast({
        title: "Sucesso",
        description: "Equipe atualizada com sucesso",
      });

      return data;
    } catch (error) {
      console.error('Erro ao atualizar equipe:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar equipe",
        variant: "destructive",
      });
      return null;
    }
  };

  const deleteTeam = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('project_teams')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao deletar equipe:', error);
        toast({
          title: "Erro",
          description: "Erro ao deletar equipe",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Sucesso",
        description: "Equipe deletada com sucesso",
      });

      return true;
    } catch (error) {
      console.error('Erro ao deletar equipe:', error);
      toast({
        title: "Erro",
        description: "Erro ao deletar equipe",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    teams,
    loading,
    createTeam,
    updateTeam,
    deleteTeam,
    refreshTeams: loadTeams,
  };
}
