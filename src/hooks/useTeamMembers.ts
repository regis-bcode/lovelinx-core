import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TeamMember, TeamMemberFormData, TeamMemberWithUser } from '@/types/project-team';

export function useTeamMembers(teamId?: string) {
  const [members, setMembers] = useState<TeamMemberWithUser[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!teamId) return;
    loadMembers();

    const channel = supabase
      .channel(`team-members-${teamId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'team_members', filter: `team_id=eq.${teamId}` }, () => {
        loadMembers();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'team_members', filter: `team_id=eq.${teamId}` }, () => {
        loadMembers();
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'team_members', filter: `team_id=eq.${teamId}` }, () => {
        loadMembers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId]);

  const loadMembers = async () => {
    if (!teamId) return;
    
    setLoading(true);
    try {
      // Buscar membros
      const { data: membersData, error: membersError } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', teamId);

      if (membersError) {
        console.error('Erro ao carregar membros:', membersError);
        toast({
          title: "Erro",
          description: "Erro ao carregar membros da equipe",
          variant: "destructive",
        });
        return;
      }

      // Buscar dados dos usuários
      if (membersData && membersData.length > 0) {
        const userIds = membersData.map(m => m.user_id);
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, user_id, nome_completo, email, custo_hora')
          .in('user_id', userIds);

        if (usersError) {
          console.error('Erro ao carregar usuários:', usersError);
        }

        const membersWithUsers = membersData.map(member => {
          const userData = usersData?.find(u => u.user_id === member.user_id);
          return {
            ...member,
            user: userData ? {
              id: userData.user_id,
              nome_completo: userData.nome_completo,
              email: userData.email,
              custo_hora: userData.custo_hora || 0,
            } : {
              id: member.user_id,
              nome_completo: 'Usuário não encontrado',
              email: '',
              custo_hora: 0,
            }
          } as TeamMemberWithUser;
        });

        setMembers(membersWithUsers);
      } else {
        setMembers([]);
      }
    } catch (error) {
      console.error('Erro ao carregar membros:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar membros da equipe",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addMember = async (memberData: TeamMemberFormData): Promise<TeamMember | null> => {
    if (!teamId) return null;

    try {
      const { data, error } = await supabase
        .from('team_members')
        .insert({
          ...memberData,
          team_id: teamId,
        } as any)
        .select()
        .single();

      if (error) {
        console.error('Erro ao adicionar membro:', error);
        toast({
          title: "Erro",
          description: "Erro ao adicionar membro à equipe",
          variant: "destructive",
        });
        return null;
      }

      toast({
        title: "Sucesso",
        description: "Membro adicionado com sucesso",
      });

      loadMembers();
      return data;
    } catch (error) {
      console.error('Erro ao adicionar membro:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar membro à equipe",
        variant: "destructive",
      });
      return null;
    }
  };

  const removeMember = async (memberId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);

      if (error) {
        console.error('Erro ao remover membro:', error);
        toast({
          title: "Erro",
          description: "Erro ao remover membro da equipe",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Sucesso",
        description: "Membro removido com sucesso",
      });

      return true;
    } catch (error) {
      console.error('Erro ao remover membro:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover membro da equipe",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateMember = async (memberId: string, memberData: Partial<TeamMemberFormData>): Promise<TeamMember | null> => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .update(memberData as any)
        .eq('id', memberId)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar membro:', error);
        toast({
          title: "Erro",
          description: "Erro ao atualizar membro",
          variant: "destructive",
        });
        return null;
      }

      toast({
        title: "Sucesso",
        description: "Membro atualizado com sucesso",
      });

      loadMembers();
      return data;
    } catch (error) {
      console.error('Erro ao atualizar membro:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar membro",
        variant: "destructive",
      });
      return null;
    }
  };

  return {
    members,
    loading,
    addMember,
    removeMember,
    updateMember,
    refreshMembers: loadMembers,
  };
}
