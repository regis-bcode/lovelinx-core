import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UserRole, AppRole } from '@/types/time-log';

export function useUserRoles() {
  const [userRoles, setUserRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserRoles();
  }, []);

  const loadUserRoles = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('Usuário não autenticado');
        return;
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) throw error;

      setUserRoles(data?.map(r => r.role as AppRole) || []);
    } catch (error) {
      console.error('Erro ao carregar roles do usuário:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasRole = (role: AppRole): boolean => {
    return userRoles.includes(role);
  };

  const isGestor = (): boolean => {
    return hasRole('gestor') || hasRole('admin');
  };

  const isAdmin = (): boolean => {
    return hasRole('admin');
  };

  return {
    userRoles,
    loading,
    hasRole,
    isGestor,
    isAdmin,
    refreshRoles: loadUserRoles,
  };
}
