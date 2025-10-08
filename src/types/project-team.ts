export type TeamType = 'projeto' | 'suporte';
export type MemberRoleType = 'interno' | 'cliente' | 'parceiro';

export interface ProjectTeam {
  id: string;
  user_id: string;
  tipo_equipe: TeamType;
  tap_id?: string;
  project_id?: string;
  nome: string;
  descricao?: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role_type: MemberRoleType;
  custo_hora_override?: number;
  created_at: string;
  updated_at: string;
}

export interface TeamMemberWithUser extends TeamMember {
  user: {
    id: string;
    nome_completo: string;
    email: string;
    custo_hora: number;
  };
}

export type ProjectTeamFormData = Omit<ProjectTeam, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type TeamMemberFormData = Omit<TeamMember, 'id' | 'created_at' | 'updated_at'>;
