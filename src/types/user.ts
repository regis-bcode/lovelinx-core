export type UserType = 
  | 'cliente'
  | 'analista'
  | 'gerente_projetos'
  | 'gerente_portfolio'
  | 'coordenador_consultoria'
  | 'gerente_cliente'
  | 'arquiteto'
  | 'sponsor'
  | 'vendedor';

export type ProfileType = 'visualizador' | 'editor' | 'administrador';

export interface User {
  id: string;
  user_id: string;
  cpf: string;
  nome_completo: string;
  email: string;
  telefone: string;
  tipo_usuario: UserType;
  tipo_perfil: ProfileType;
  ativo: boolean;
  observacoes?: string;
  custo_hora?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateUserData {
  cpf: string;
  nome_completo: string;
  email: string;
  telefone: string;
  tipo_usuario: UserType;
  tipo_perfil: ProfileType;
  observacoes?: string;
}

export const userTypeLabels: Record<UserType, string> = {
  cliente: "Cliente",
  analista: "Analista",
  gerente_projetos: "Gerente de Projetos",
  gerente_portfolio: "Gerente de Portfólio", 
  coordenador_consultoria: "Coordenador do Projeto (Consultoria)",
  gerente_cliente: "Gerente do Projeto (Cliente)",
  arquiteto: "Arquiteto",
  sponsor: "Sponsor",
  vendedor: "Vendedor"
};

export const profileTypeLabels: Record<ProfileType, string> = {
  visualizador: "Visualizador",
  editor: "Editor", 
  administrador: "Administrador"
};