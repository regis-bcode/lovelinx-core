import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Team, TeamFormData } from '@/types/team';

export function useTeams(projectId?: string) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!projectId || !user) return;
    loadTeams();

    const channel = supabase
      .channel(`teams-realtime-${projectId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'teams', filter: `project_id=eq.${projectId}` }, (payload) => {
        const team = payload.new as Team;
        setTeams((prev) => [team, ...prev.filter((t) => t.id !== team.id)]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'teams', filter: `project_id=eq.${projectId}` }, (payload) => {
        const team = payload.new as Team;
        setTeams((prev) => prev.map((t) => (t.id === team.id ? team : t)));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'teams', filter: `project_id=eq.${projectId}` }, (payload) => {
        const teamId = payload.old.id;
        setTeams((prev) => prev.filter((t) => t.id !== teamId));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, user]);

  const loadTeams = async () => {
    if (!projectId || !user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .order('nome');

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

  const createTeam = async (teamData: Partial<TeamFormData>): Promise<Team | null> => {
    if (!projectId || !user || !teamData.nome) return null;

    try {
      const { data, error } = await supabase
        .from('teams')
        .insert({
          ...teamData,
          project_id: projectId,
          user_id: user.id,
          nome: teamData.nome, // Garante que nome está presente
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar membro da equipe:', error);
        toast({
          title: "Erro",
          description: "Erro ao criar membro da equipe",
          variant: "destructive",
        });
        return null;
      }

      setTeams(prev => [...prev, data]);
      toast({
        title: "Sucesso",
        description: "Membro da equipe criado com sucesso",
      });

      return data;
    } catch (error) {
      console.error('Erro ao criar membro da equipe:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar membro da equipe",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateTeam = async (id: string, teamData: Partial<TeamFormData>): Promise<Team | null> => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .update(teamData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar membro da equipe:', error);
        toast({
          title: "Erro",
          description: "Erro ao atualizar membro da equipe",
          variant: "destructive",
        });
        return null;
      }

      setTeams(prev => prev.map(team => team.id === id ? data : team));
      toast({
        title: "Sucesso",
        description: "Membro da equipe atualizado com sucesso",
      });

      return data;
    } catch (error) {
      console.error('Erro ao atualizar membro da equipe:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar membro da equipe",
        variant: "destructive",
      });
      return null;
    }
  };

  const deleteTeam = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao deletar membro da equipe:', error);
        toast({
          title: "Erro",
          description: "Erro ao deletar membro da equipe",
          variant: "destructive",
        });
        return false;
      }

      setTeams(prev => prev.filter(team => team.id !== id));
      toast({
        title: "Sucesso",
        description: "Membro da equipe deletado com sucesso",
      });

      return true;
    } catch (error) {
      console.error('Erro ao deletar membro da equipe:', error);
      toast({
        title: "Erro",
        description: "Erro ao deletar membro da equipe",
        variant: "destructive",
      });
      return false;
    }
  };

  const refreshTeams = () => {
    loadTeams();
  };

  return {
    teams,
    loading,
    createTeam,
    updateTeam,
    deleteTeam,
    refreshTeams,
  };
}