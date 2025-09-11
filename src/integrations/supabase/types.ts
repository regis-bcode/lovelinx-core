export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      communication_plan: {
        Row: {
          aprovadores: string | null
          canal_envio: string | null
          codigo: string
          comunicacao: string | null
          conteudo: string | null
          created_at: string
          envolvidos: string | null
          formato_arquivo: string | null
          frequencia: string | null
          id: string
          idioma: string | null
          link_documento: string | null
          midia: string | null
          objetivo: string | null
          project_id: string
          project_id_new: string | null
          responsavel: string | null
          updated_at: string
        }
        Insert: {
          aprovadores?: string | null
          canal_envio?: string | null
          codigo: string
          comunicacao?: string | null
          conteudo?: string | null
          created_at?: string
          envolvidos?: string | null
          formato_arquivo?: string | null
          frequencia?: string | null
          id?: string
          idioma?: string | null
          link_documento?: string | null
          midia?: string | null
          objetivo?: string | null
          project_id: string
          project_id_new?: string | null
          responsavel?: string | null
          updated_at?: string
        }
        Update: {
          aprovadores?: string | null
          canal_envio?: string | null
          codigo?: string
          comunicacao?: string | null
          conteudo?: string | null
          created_at?: string
          envolvidos?: string | null
          formato_arquivo?: string | null
          frequencia?: string | null
          id?: string
          idioma?: string | null
          link_documento?: string | null
          midia?: string | null
          objetivo?: string | null
          project_id?: string
          project_id_new?: string | null
          responsavel?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_plan_project_id_new_fkey"
            columns: ["project_id_new"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      folders: {
        Row: {
          cor: string
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          cor?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          cor?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "folders_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          arquiteto: string
          cliente: string
          cod_cliente: string
          coordenador: string
          created_at: string
          criticidade: string
          data: string
          data_inicio: string | null
          diferenca_psa_projeto: number | null
          drive: string | null
          duracao_pos_producao: number | null
          encerramento: string | null
          escopo: string | null
          esn: string
          folder_id: string | null
          go_live_previsto: string | null
          gpp: string
          id: string
          investimento_comercial: number | null
          investimento_erro_produto: number | null
          investimento_perdas: number | null
          margem_atual_percent: number | null
          margem_atual_reais: number | null
          margem_venda_percent: number | null
          margem_venda_reais: number | null
          mrr: number | null
          mrr_total: number | null
          nome_projeto: string
          objetivo: string | null
          observacao: string | null
          produto: string
          projeto_em_perda: boolean | null
          psa_planejado: number | null
          receita_atual: number | null
          updated_at: string
          user_id: string
          valor_projeto: number | null
        }
        Insert: {
          arquiteto: string
          cliente: string
          cod_cliente: string
          coordenador: string
          created_at?: string
          criticidade: string
          data: string
          data_inicio?: string | null
          diferenca_psa_projeto?: number | null
          drive?: string | null
          duracao_pos_producao?: number | null
          encerramento?: string | null
          escopo?: string | null
          esn: string
          folder_id?: string | null
          go_live_previsto?: string | null
          gpp: string
          id?: string
          investimento_comercial?: number | null
          investimento_erro_produto?: number | null
          investimento_perdas?: number | null
          margem_atual_percent?: number | null
          margem_atual_reais?: number | null
          margem_venda_percent?: number | null
          margem_venda_reais?: number | null
          mrr?: number | null
          mrr_total?: number | null
          nome_projeto: string
          objetivo?: string | null
          observacao?: string | null
          produto: string
          projeto_em_perda?: boolean | null
          psa_planejado?: number | null
          receita_atual?: number | null
          updated_at?: string
          user_id: string
          valor_projeto?: number | null
        }
        Update: {
          arquiteto?: string
          cliente?: string
          cod_cliente?: string
          coordenador?: string
          created_at?: string
          criticidade?: string
          data?: string
          data_inicio?: string | null
          diferenca_psa_projeto?: number | null
          drive?: string | null
          duracao_pos_producao?: number | null
          encerramento?: string | null
          escopo?: string | null
          esn?: string
          folder_id?: string | null
          go_live_previsto?: string | null
          gpp?: string
          id?: string
          investimento_comercial?: number | null
          investimento_erro_produto?: number | null
          investimento_perdas?: number | null
          margem_atual_percent?: number | null
          margem_atual_reais?: number | null
          margem_venda_percent?: number | null
          margem_venda_reais?: number | null
          mrr?: number | null
          mrr_total?: number | null
          nome_projeto?: string
          objetivo?: string | null
          observacao?: string | null
          produto?: string
          projeto_em_perda?: boolean | null
          psa_planejado?: number | null
          receita_atual?: number | null
          updated_at?: string
          user_id?: string
          valor_projeto?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      stakeholders: {
        Row: {
          cargo: string
          created_at: string
          departamento: string
          email: string
          id: string
          interesses: string | null
          nivel: string
          nome: string
          project_id: string
          project_id_new: string | null
          telefone: string | null
          tipo_influencia: string
          updated_at: string
        }
        Insert: {
          cargo: string
          created_at?: string
          departamento: string
          email: string
          id?: string
          interesses?: string | null
          nivel: string
          nome: string
          project_id: string
          project_id_new?: string | null
          telefone?: string | null
          tipo_influencia: string
          updated_at?: string
        }
        Update: {
          cargo?: string
          created_at?: string
          departamento?: string
          email?: string
          id?: string
          interesses?: string | null
          nivel?: string
          nome?: string
          project_id?: string
          project_id_new?: string | null
          telefone?: string | null
          tipo_influencia?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stakeholders_project_id_new_fkey"
            columns: ["project_id_new"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          ativo: boolean
          cor: string
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          cor?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          cor?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
